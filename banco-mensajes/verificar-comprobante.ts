// verificar-comprobante — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se llama sola desde el navegador justo
// después de subir un comprobante, sin sesión de admin)
//
// Lee el comprobante de pago con un modelo de visión (Groq) y, SOLO si todo
// cuadra perfecto -- es claramente un comprobante bancario, el monto es
// exactamente el esperado, la llave destino coincide con la del Club, la
// fecha es reciente, no hay señales visuales de edición, el modelo reporta
// confianza alta, Y el monto está por debajo de un tope de seguridad --
// aprueba la membresía automáticamente (mismo procedimiento que
// aprobar-membresia.ts). Si falta cualquiera de esas condiciones, o el
// análisis falla por cualquier razón, NO HACE NADA: la solicitud queda
// pendiente para revisión manual del admin, exactamente igual que hoy.
//
// Esto es una capa de ayuda, no un reemplazo de la revisión humana: un
// comprobante bien falsificado puede engañar a la IA igual que podría
// engañar a una persona mirándolo rápido. Por eso el tope de monto y por
// eso cualquier duda cae a revisión manual en vez de aprobarse.
//
// POST { solicitud_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

// Plantilla "membresia_activada", ya aprobada por Meta -- {{1}}=plan, {{2}}=primer nombre.
const CONTENT_SID_MEMBRESIA_ACTIVADA = "HX0f87d7d38c71f42bed631194018e9bbd";

// Nunca auto-aprobar por encima de esto, así todo lo demás cuadre perfecto
// -- cualquier monto mayor siempre pasa por un humano. Ajusta este número
// si el precio real de los planes cambia.
const TOPE_AUTO_APROBAR = 200000;

// Margen de tolerancia hacia ABAJO del precio exacto (comisiones de
// transferencia interbancaria, redondeos) -- nunca hacia arriba, eso no
// tendría sentido permitirlo.
const TOLERANCIA_MONTO = 500;

// Modelo de visión de Groq. Groq ha cambiado su catálogo de modelos de
// visión varias veces (ver whatsapp-receive-v2.ts para otro ejemplo de esto
// en este mismo proyecto) -- si este deja de funcionar, hay que revisar
// console.groq.com/docs/vision para ver qué modelo está disponible y
// reemplazar este nombre.
const MODELO_VISION = "qwen/qwen3.8-27b";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// La llave Bre-B del Club puede ser un alias tipo "@clubdelagente" (se
// compara tal cual, en minúscula) o un número de teléfono/cuenta (se
// comparan solo los dígitos, sin el indicativo 57). Si llegara a quedar
// vacía después de normalizar, NUNCA debe dar por buena la comparación --
// antes un alias sin dígitos volvía este chequeo siempre verdadero sin
// importar qué llave detectara la IA, anulando la protección.
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

  const { solicitud_id } = await req.json().catch(() => ({}));
  if (!solicitud_id) {
    return new Response(JSON.stringify({ error: "solicitud_id requerido" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: solicitud } = await supabase
    .from("solicitudes_membresia")
    .select("id, miembro_id, plan, monto, comprobante_url, estado")
    .eq("id", solicitud_id)
    .maybeSingle();

  if (!solicitud || solicitud.estado !== "pendiente" || !solicitud.comprobante_url) {
    return new Response("Nada que verificar", { status: 200, headers: corsHeaders });
  }

  if (solicitud.monto > TOPE_AUTO_APROBAR) {
    await supabase.from("solicitudes_membresia")
      .update({ verificacion_ia: { motivo: "monto_sobre_tope", monto: solicitud.monto, tope: TOPE_AUTO_APROBAR } })
      .eq("id", solicitud.id);
    return new Response("Monto sobre el tope, queda para revisión manual", { status: 200, headers: corsHeaders });
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
            { type: "image_url", image_url: { url: solicitud.comprobante_url } },
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
    console.error("Error analizando comprobante con IA:", e);
    await supabase.from("solicitudes_membresia")
      .update({ verificacion_ia: { motivo: "error_analisis", error: String(e) } })
      .eq("id", solicitud.id);
    return new Response("No se pudo analizar, queda para revisión manual", { status: 200, headers: corsHeaders });
  }

  // Se guarda siempre el análisis, haya quedado aprobado o no -- transparencia
  // para el admin de por qué la IA decidió lo que decidió.
  await supabase.from("solicitudes_membresia").update({ verificacion_ia: analisis }).eq("id", solicitud.id);

  const hoy = Date.now();
  const fechaDetectada = analisis.fecha ? new Date(analisis.fecha + "T00:00:00").getTime() : null;
  const fechaOk = fechaDetectada != null
    && (hoy - fechaDetectada) <= 2 * 24 * 60 * 60 * 1000
    && (hoy - fechaDetectada) >= -24 * 60 * 60 * 1000;

  const montoOk = analisis.monto != null
    && analisis.monto <= solicitud.monto
    && analisis.monto >= solicitud.monto - TOLERANCIA_MONTO;
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
    console.log(`Comprobante de solicitud ${solicitud_id} NO se auto-aprueba:`, JSON.stringify(analisis));
    return new Response(JSON.stringify({ ok: true, aprobado: false, analisis }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // SEGURIDAD/CONCURRENCIA (2026-10-29): reclama la solicitud de forma atómica
  // antes de tocar nada más -- si el admin la aprobó manualmente justo
  // mientras la IA analizaba (el análisis puede tardar varios segundos), esta
  // UPDATE no encuentra la fila en "pendiente" y se corta acá, sin duplicar
  // el pago ni el WhatsApp de confirmación. Mismo mecanismo que
  // aprobar-membresia.ts.
  const { data: reclamada, error: claimErr } = await supabase
    .from("solicitudes_membresia")
    .update({ estado: "aprobado", aprobado_por: "ia_automatica" })
    .eq("id", solicitud.id)
    .eq("estado", "pendiente")
    .select("id")
    .maybeSingle();

  if (claimErr) {
    console.error("Error reclamando la solicitud (auto-IA):", claimErr);
    return new Response(JSON.stringify({ error: claimErr.message }), { status: 500, headers: corsHeaders });
  }
  if (!reclamada) {
    console.log(`Solicitud ${solicitud_id} ya fue procesada (probablemente por el admin) -- la IA no hace nada más.`);
    return new Response(JSON.stringify({ ok: true, aprobado: false, motivo: "ya_procesada" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ---- A partir de aquí, el mismo procedimiento que aprobar-membresia.ts ----
  // Si renueva ANTES de vencer, los días que le quedaban se suman en vez de
  // perderse -- el nuevo mes se cuenta desde su fecha de vencimiento actual
  // (si todavía no pasó), no desde hoy.
  const { data: perfilActual } = await supabase
    .from("perfiles")
    .select("fecha_vencimiento")
    .eq("id", solicitud.miembro_id)
    .maybeSingle();
  const hoyFecha = new Date();
  const vencimientoActual = perfilActual?.fecha_vencimiento ? new Date(perfilActual.fecha_vencimiento + "T00:00:00") : null;
  const fechaBase = vencimientoActual && vencimientoActual > hoyFecha ? vencimientoActual : hoyFecha;
  const fechaVencimiento = new Date(fechaBase);
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);

  const { data: updated, error: updateErr } = await supabase
    .from("perfiles")
    .update({ plan: solicitud.plan, fecha_vencimiento: fechaVencimiento.toISOString().split("T")[0] })
    .eq("id", solicitud.miembro_id)
    .select("nombre, whatsapp")
    .maybeSingle();

  if (updateErr) {
    console.error("Error activando membresía (auto-IA):", updateErr);
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
  }

  const { error: pagoError } = await supabase.from("pagos").insert({
    miembro_id: solicitud.miembro_id,
    monto: solicitud.monto,
    plan: solicitud.plan,
    referencia: `AUTO-IA-${solicitud.id}`,
  });
  if (pagoError) console.error("Error registrando pago (auto-IA):", pagoError);

  const planLabelNotif = solicitud.plan === "premium" ? "Premium" : "Básica";
  const { error: notifErr } = await supabase.from("notificaciones_miembro").insert({
    miembro_id: solicitud.miembro_id,
    titulo: "Tu membresía ya está activa",
    cuerpo: `Tu membresía ${planLabelNotif} quedó activa. Ya puedes mostrar tu ClubCard en cualquier aliado del Club para empezar a ahorrar.`,
  });
  if (notifErr) console.error("Error creando notificación (auto-IA):", notifErr);

  if (updated?.whatsapp) {
    const primerNombre = (updated.nombre || "").split(" ")[0] || "";
    const planLabel = solicitud.plan === "premium" ? "Premium" : "Básica";
    try {
      const rEnvio = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: updated.whatsapp,
          contentSid: CONTENT_SID_MEMBRESIA_ACTIVADA,
          contentVariables: { "1": planLabel, "2": primerNombre },
        }),
      });
      if (!rEnvio.ok) {
        console.error("whatsapp-send-3 rechazó la confirmación (auto-IA):", rEnvio.status, await rEnvio.text().catch(() => ""));
      }
    } catch (e) {
      console.error("Error enviando confirmación (auto-IA):", e);
    }
  }

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/validar-referidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ miembro_id: solicitud.miembro_id }),
    });
  } catch (e) {
    console.error("Error llamando validar-referidos (auto-IA):", e);
  }

  console.log(`Membresía ${solicitud.plan} auto-aprobada por IA para ${solicitud.miembro_id} (solicitud ${solicitud_id})`);
  return new Response(JSON.stringify({ ok: true, aprobado: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
