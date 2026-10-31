// verificar-pedido-club — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se llama sola desde el navegador justo
// después de que un miembro confirma un pedido de un producto que vende el
// Club directamente, sin sesión de admin)
//
// Mismo criterio que verificar-comprobante.ts (membresías) y
// verificar-pedido-aliado.ts (pedidos a aliados): lee el comprobante con un
// modelo de visión (Groq) y SOLO si es claramente un comprobante bancario,
// el monto coincide (con hasta $500 de tolerancia hacia abajo), la llave
// destino es la del Club, la fecha es reciente, no hay señales de edición y
// la confianza es alta, marca el pedido como pagado solo. Cualquier duda
// deja el pedido "pendiente_pago" para que el admin lo revise a mano,
// exactamente igual que hoy.
//
// POST { pedido_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

const TOPE_AUTO_APROBAR = 200000;
const TOLERANCIA_MONTO = 500;
const MODELO_VISION = "qwen/qwen3.8-27b";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function normalizarLlave(s: string | null | undefined): string {
  let v = (s || "").trim().toLowerCase();
  if (!v) return "";
  if (v.startsWith("@")) return v;
  v = v.replace(/\D/g, "");
  if (v.length > 10 && v.startsWith("57")) v = v.slice(2);
  return v;
}

// Hash del CONTENIDO real de la imagen del comprobante (no de la URL -- cada
// subida tiene una URL distinta aunque sea la misma foto reusada). Se usa
// para que una misma foto no pueda aprobar dos cosas distintas (dos pedidos,
// o un pedido y una renovación de membresía).
async function hashComprobante(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (_) {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const { pedido_id } = await req.json().catch(() => ({}));
  if (!pedido_id) {
    return new Response(JSON.stringify({ error: "pedido_id requerido" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: pedido } = await supabase
    .from("pedidos_club")
    .select("id, monto, comprobante_url, estado, productos(precio_normal, precio_descuento)")
    .eq("id", pedido_id)
    .maybeSingle();

  if (!pedido || pedido.estado !== "pendiente_pago" || !pedido.comprobante_url) {
    return new Response("Nada que verificar", { status: 200, headers: corsHeaders });
  }

  // El monto a cobrar NUNCA se confía del valor guardado por el navegador --
  // se recalcula siempre del precio actual del producto real en la base de
  // datos. Sin esto, alguien podía insertar su propio pedido desde la consola
  // del navegador con un "monto" inventado (ej. $100) y la IA lo auto-aprobaba
  // por transferir justo ese valor inventado.
  const producto = (pedido as unknown as { productos?: { precio_normal: number | null; precio_descuento: number | null } }).productos;
  const montoReal = producto ? (producto.precio_descuento ?? producto.precio_normal ?? null) : null;

  if (montoReal == null) {
    await supabase.from("pedidos_club")
      .update({ verificacion_ia: { motivo: "producto_no_verificable" } })
      .eq("id", pedido.id);
    return new Response("No se pudo verificar el precio del producto, queda para revisión manual", { status: 200, headers: corsHeaders });
  }

  if (pedido.monto !== montoReal) {
    // El monto declarado no coincide con el precio real -- se corrige para
    // que Admin vea el valor correcto, y SIEMPRE queda para revisión manual
    // (nunca se auto-aprueba un pedido que llegó con el monto manipulado).
    await supabase.from("pedidos_club")
      .update({ monto: montoReal, verificacion_ia: { motivo: "monto_no_coincide_con_producto", monto_declarado: pedido.monto, monto_real: montoReal } })
      .eq("id", pedido.id);
    return new Response("Monto no coincide con el producto, queda para revisión manual", { status: 200, headers: corsHeaders });
  }

  if (montoReal > TOPE_AUTO_APROBAR) {
    await supabase.from("pedidos_club")
      .update({ verificacion_ia: { motivo: "monto_sobre_tope", monto: montoReal, tope: TOPE_AUTO_APROBAR } })
      .eq("id", pedido.id);
    return new Response("Monto sobre el tope, queda para revisión manual", { status: 200, headers: corsHeaders });
  }

  // Protección anti-reuso: si esta misma foto ya se usó para aprobar otra
  // solicitud o pedido antes, nunca se auto-aprueba -- queda para que un
  // humano la revise.
  const hashComp = await hashComprobante(pedido.comprobante_url);
  if (hashComp) {
    const { data: usoPrevio } = await supabase
      .from("comprobantes_usados")
      .select("tipo, referencia_id")
      .eq("hash", hashComp)
      .maybeSingle();
    if (usoPrevio) {
      await supabase.from("pedidos_club")
        .update({ verificacion_ia: { motivo: "comprobante_reusado", uso_previo: usoPrevio } })
        .eq("id", pedido.id);
      return new Response("Comprobante ya usado antes, queda para revisión manual", { status: 200, headers: corsHeaders });
    }
  }

  const { data: cfg } = await supabase.from("configuracion").select("valor").eq("clave", "club_llave_pago").maybeSingle();
  const llaveClub = cfg?.valor || "";

  let analisis: {
    es_comprobante: boolean;
    monto: number | null;
    fecha: string | null;
    llave_destino: string | null;
    senales_edicion: boolean;
    confianza: "alta" | "media" | "baja";
  };

  try {
    const prompt = `Eres un verificador de comprobantes de pago bancarios (Bre-B, Colombia). Analiza la imagen y responde SOLO un JSON con esta forma exacta, sin texto adicional ni explicaciones:
{"es_comprobante": boolean, "monto": number|null, "fecha": "YYYY-MM-DD"|null, "llave_destino": string|null, "senales_edicion": boolean, "confianza": "alta"|"media"|"baja"}

"es_comprobante": true solo si es claramente una captura de pantalla de una transferencia o pago bancario exitoso.
"monto": el valor transferido, solo el número, sin símbolos ni puntos de miles.
"fecha": la fecha de la transacción tal como aparece en la imagen.
"llave_destino": el número de cuenta, teléfono o llave Bre-B a la que se envió el dinero, tal como aparece en la imagen.
"senales_edicion": true si notas CUALQUIER inconsistencia visual que sugiera que la imagen fue editada o manipulada (fuentes distintas entre números, pixeles desalineados, bordes raros, texto superpuesto, colores que no calzan).
"confianza": "alta" solo si puedes leer todos los datos con claridad y no tienes ninguna duda. Si algo no es legible o tienes la más mínima duda, usa "baja" o "media" y pon null en lo que no puedas confirmar.`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODELO_VISION,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: pedido.comprobante_url } },
          ],
        }],
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) throw new Error(`Groq respondió ${groqRes.status}: ${await groqRes.text()}`);
    const groqJson = await groqRes.json();
    analisis = JSON.parse(groqJson.choices[0].message.content);
  } catch (e) {
    console.error("Error analizando comprobante de pedido del Club con IA:", e);
    await supabase.from("pedidos_club")
      .update({ verificacion_ia: { motivo: "error_analisis", error: String(e) } })
      .eq("id", pedido.id);
    return new Response("No se pudo analizar, queda para revisión manual", { status: 200, headers: corsHeaders });
  }

  await supabase.from("pedidos_club").update({ verificacion_ia: analisis }).eq("id", pedido.id);

  const hoy = Date.now();
  const fechaDetectada = analisis.fecha ? new Date(analisis.fecha + "T00:00:00").getTime() : null;
  const fechaOk = fechaDetectada != null
    && (hoy - fechaDetectada) <= 2 * 24 * 60 * 60 * 1000
    && (hoy - fechaDetectada) >= -24 * 60 * 60 * 1000;

  const montoOk = analisis.monto != null
    && analisis.monto <= montoReal
    && analisis.monto >= montoReal - TOLERANCIA_MONTO;
  const llaveClubNorm = normalizarLlave(llaveClub);
  const llaveDetectadaNorm = normalizarLlave(analisis.llave_destino);
  const llaveOk = llaveClubNorm.length >= 3 && llaveClubNorm === llaveDetectadaNorm;

  const aprobarSolo = analisis.es_comprobante === true
    && montoOk
    && llaveOk
    && fechaOk
    && analisis.senales_edicion === false
    && analisis.confianza === "alta";

  if (!aprobarSolo) {
    console.log(`Pedido Club ${pedido_id} NO se auto-aprueba:`, JSON.stringify(analisis));
    return new Response(JSON.stringify({ ok: true, aprobado: false, analisis }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { error: estadoErr } = await supabase
    .from("pedidos_club")
    .update({ estado: "pagado", aprobado_por: "ia_automatica" })
    .eq("id", pedido.id);
  if (estadoErr) {
    console.error("Error marcando pedido del Club como pagado (auto-IA):", estadoErr);
    return new Response(JSON.stringify({ error: estadoErr.message }), { status: 500, headers: corsHeaders });
  }

  if (hashComp) {
    const { error: hashErr } = await supabase.from("comprobantes_usados").insert({ hash: hashComp, tipo: "pedido_club", referencia_id: pedido.id });
    if (hashErr) console.error("Error registrando hash de comprobante (no bloquea la aprobación):", hashErr);
  }

  console.log(`Pedido Club ${pedido_id} auto-aprobado por IA`);
  return new Response(JSON.stringify({ ok: true, aprobado: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
