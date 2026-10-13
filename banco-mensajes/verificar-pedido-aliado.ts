// verificar-pedido-aliado — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se llama sola desde el navegador justo
// después de que un miembro confirma un pedido a un aliado de la tienda,
// sin sesión de admin)
//
// Mismo criterio que verificar-comprobante.ts (membresías): lee el
// comprobante con un modelo de visión (Groq) y SOLO si es claramente un
// comprobante bancario, el monto coincide (con hasta $500 de tolerancia
// hacia abajo), la llave destino es la del ALIADO dueño del producto, la
// fecha es reciente, no hay señales de edición y la confianza es alta,
// confirma el pedido solo. Cualquier duda deja el pedido "pendiente" para
// que el aliado lo revise a mano, exactamente igual que hoy.
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

// Misma lógica que verificar-comprobante.ts: un alias ("@negocio") se
// compara tal cual en minúscula; un número se compara solo por dígitos sin
// el indicativo 57. Si queda vacía después de normalizar, NUNCA debe dar
// por buena la comparación.
function normalizarLlave(s: string | null | undefined): string {
  let v = (s || "").trim().toLowerCase();
  if (!v) return "";
  if (v.startsWith("@")) return v;
  v = v.replace(/\D/g, "");
  if (v.length > 10 && v.startsWith("57")) v = v.slice(2);
  return v;
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
    .from("pedidos")
    .select("id, monto, comprobante_url, estado, productos_aliado(nombre), aliados(tienda_llave_pago, nombre)")
    .eq("id", pedido_id)
    .maybeSingle();

  if (!pedido || pedido.estado !== "pendiente" || !pedido.comprobante_url) {
    return new Response("Nada que verificar", { status: 200, headers: corsHeaders });
  }

  if (pedido.monto > TOPE_AUTO_APROBAR) {
    await supabase.from("pedidos")
      .update({ verificacion_ia: { motivo: "monto_sobre_tope", monto: pedido.monto, tope: TOPE_AUTO_APROBAR } })
      .eq("id", pedido.id);
    return new Response("Monto sobre el tope, queda para revisión manual", { status: 200, headers: corsHeaders });
  }

  const llaveAliado = (pedido as unknown as { aliados?: { tienda_llave_pago?: string } }).aliados?.tienda_llave_pago || "";

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
    console.error("Error analizando comprobante de pedido con IA:", e);
    await supabase.from("pedidos")
      .update({ verificacion_ia: { motivo: "error_analisis", error: String(e) } })
      .eq("id", pedido.id);
    return new Response("No se pudo analizar, queda para revisión manual", { status: 200, headers: corsHeaders });
  }

  await supabase.from("pedidos").update({ verificacion_ia: analisis }).eq("id", pedido.id);

  const hoy = Date.now();
  const fechaDetectada = analisis.fecha ? new Date(analisis.fecha + "T00:00:00").getTime() : null;
  const fechaOk = fechaDetectada != null
    && (hoy - fechaDetectada) <= 2 * 24 * 60 * 60 * 1000
    && (hoy - fechaDetectada) >= -24 * 60 * 60 * 1000;

  const montoOk = analisis.monto != null
    && analisis.monto <= pedido.monto
    && analisis.monto >= pedido.monto - TOLERANCIA_MONTO;
  const llaveAliadoNorm = normalizarLlave(llaveAliado);
  const llaveDetectadaNorm = normalizarLlave(analisis.llave_destino);
  const llaveOk = llaveAliadoNorm.length >= 3 && llaveAliadoNorm === llaveDetectadaNorm;

  const aprobarSolo = analisis.es_comprobante === true
    && montoOk
    && llaveOk
    && fechaOk
    && analisis.senales_edicion === false
    && analisis.confianza === "alta";

  if (!aprobarSolo) {
    console.log(`Pedido ${pedido_id} NO se auto-confirma:`, JSON.stringify(analisis));
    return new Response(JSON.stringify({ ok: true, aprobado: false, analisis }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { error: estadoErr } = await supabase
    .from("pedidos")
    .update({ estado: "confirmado", aprobado_por: "ia_automatica" })
    .eq("id", pedido.id);
  if (estadoErr) {
    console.error("Error confirmando pedido (auto-IA):", estadoErr);
    return new Response(JSON.stringify({ error: estadoErr.message }), { status: 500, headers: corsHeaders });
  }

  console.log(`Pedido ${pedido_id} auto-confirmado por IA`);
  return new Response(JSON.stringify({ ok: true, aprobado: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
