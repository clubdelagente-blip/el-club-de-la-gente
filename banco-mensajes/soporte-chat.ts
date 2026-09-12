// soporte-chat — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se verifica el token del miembro a mano)
// Groq API — asistente de autoservicio para el dashboard del miembro.
// Autoservicio para dudas comunes; si detecta un problema real de cuenta/pago
// que no puede resolver con lo que sabe, escala por WhatsApp al equipo
// reutilizando el mismo mecanismo [ESCALAR] del Agente de WhatsApp.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MIN = 5;
const MAX_MESSAGE_LENGTH = 800;

const INJECTION_PATTERNS = [
  /ignora\s+(las\s+)?instrucciones/i,
  /olvida\s+(todo|las\s+instrucciones)/i,
  /nuevo\s+rol/i,
  /ahora\s+eres/i,
  /actúa\s+como\s+(si\s+)?fueras/i,
  /actua\s+como\s+(si\s+)?fueras/i,
  /system\s*:/i,
  /\[system\]/i,
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /forget\s+(everything|all)/i,
  /you\s+are\s+now/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /jailbreak/i,
  /override\s+(your\s+)?instructions/i,
];

function sanitizar(mensaje: string): { texto: string; esAtaque: boolean } {
  const texto = mensaje.slice(0, MAX_MESSAGE_LENGTH);
  const esAtaque = INJECTION_PATTERNS.some((p) => p.test(texto));
  return { texto, esAtaque };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

async function excedeLimite(supabase: ReturnType<typeof createClient>, miembroId: string): Promise<boolean> {
  const desde = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("soporte_mensajes")
    .select("id", { count: "exact", head: true })
    .eq("miembro_id", miembroId)
    .eq("rol", "usuario")
    .gte("created_at", desde);
  return (count ?? 0) >= RATE_LIMIT_MAX;
}

function buildSystemPrompt(perfil: Record<string, unknown>): string {
  return `Eres el asistente de soporte técnico del dashboard de El Club de la Gente, una comunidad de membresía local en Fusagasugá, Colombia. Tu trabajo es ayudar a miembros que ya iniciaron sesión a resolver dudas y problemas con su cuenta.

CONOCIMIENTO DE LA PLATAFORMA:
- Plan Básica ($10.000/mes): 2 descuentos por mes por cada aliado. Plan Premium ($20.000/mes): descuentos ilimitados, ClubCard personalizada, sorteos, acceso a "Profesionales". Plan Vitalicia ($0): se obtiene con 5 referidos activos, equivale a Premium para siempre.
- El dashboard tiene estas secciones: Mi perfil, Mi ClubCard (código QR que se muestra al aliado para registrar el descuento), Tienda del Club (compras con envío), Profesionales (solo Premium/Vitalicia), Mis descuentos (historial), Mi Agente (el asistente de WhatsApp), Configuración.
- Activación de pagos: se paga por la plataforma con Wompi, Nequi o Daviplata. La activación es automática y normalmente tarda unos minutos, hasta un máximo de 2 horas si fue por transferencia con comprobante.
- Referidos: cada miembro tiene un link único de referido (visible en su perfil); 5 referidos activos = membresía vitalicia gratis.

PROBLEMAS COMUNES Y CÓMO RESOLVERLOS:
- "Mi ClubCard aparece bloqueada / no tengo plan activo" → casi siempre es que el pago todavía no se ha confirmado. Si pagó hace menos de 2 horas, dile que espere ese tiempo. Si ya pasaron más de 2 horas y sigue bloqueada, o si no está seguro de si el pago se procesó, ESO SÍ hay que escalarlo — puede ser un problema real que solo el equipo puede revisar y corregir a mano.
- "No veo mis descuentos / mi historial no aparece" → confirma que está usando la cuenta con la que se registró (mismo WhatsApp o correo). Si ya confirmó que es la cuenta correcta y aun así falta información, escala.
- "El Agente de WhatsApp no me responde" → puede ser que le esté escribiendo a un número distinto al oficial del Club, o que haya superado el límite de mensajes seguidos (se libera solo en unos minutos).
- Preguntas de "cómo hago X" dentro del dashboard → respóndelas directo con lo que sabes de las secciones de arriba.
- Cualquier cosa que implique que algo en su cuenta está mal, incompleto, duplicado, o que un pago no se refleja correctamente → esto requiere revisar la base de datos del Club, tú no puedes hacerlo. Escala.

LO QUE NUNCA DEBES HACER:
- No puedes cambiar datos de la cuenta, activar planes, procesar reembolsos ni prometer una solución técnica — solo el equipo humano hace eso.
- Nunca inventes una causa o solución que no esté en este prompt. Si no sabes qué está pasando, dilo y escala — no adivines.

PERFIL DEL MIEMBRO:
- Nombre: ${perfil.nombre || "miembro"}
- Plan actual: ${perfil.plan || "sin plan"}
- Fecha de vencimiento: ${perfil.fecha_vencimiento || "no registrada"}

CÓMO RESPONDER:
- Español, tono cercano y claro, mensajes cortos (esto es un chat, no un correo).
- Si el miembro adjuntó una captura de pantalla, ya se la avisamos al equipo junto con su mensaje si escalas — no le pidas que la reenvíe por otro canal.
- Para escalar: agrega la etiqueta [ESCALAR] al principio de tu respuesta, antes de cualquier otra cosa. Es una señal interna, el miembro nunca la ve, se quita automáticamente antes de enviarse. Ejemplo: "[ESCALAR]Esto lo reviso directo con el equipo, te contactan por WhatsApp en las próximas horas."
- No escales saludos ni preguntas generales que sí puedes resolver con la información de arriba.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: jsonHeaders });

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: jsonHeaders });
    }
    const miembroId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const mensajeRaw = String(body?.mensaje || "").trim();
    const imagenUrl = body?.imagen_url ? String(body.imagen_url) : null;
    if (!mensajeRaw && !imagenUrl) {
      return new Response(JSON.stringify({ error: "Mensaje vacío" }), { status: 400, headers: jsonHeaders });
    }

    const { texto: mensaje, esAtaque } = sanitizar(mensajeRaw || "Adjunté una captura de pantalla.");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (await excedeLimite(supabase, miembroId)) {
      return new Response(JSON.stringify({
        respuesta: "Estás enviando muchos mensajes seguidos. Espera unos minutos e intenta de nuevo.",
        escalado: false,
      }), { headers: jsonHeaders });
    }

    if (esAtaque) {
      return new Response(JSON.stringify({
        respuesta: "Solo puedo ayudarte con temas de la plataforma del Club.",
        escalado: false,
      }), { headers: jsonHeaders });
    }

    const { data: perfilData } = await supabase
      .from("perfiles")
      .select("id, nombre, plan, whatsapp, fecha_vencimiento")
      .eq("id", miembroId)
      .maybeSingle();
    const perfil = perfilData || {};

    const { data: historial } = await supabase
      .from("soporte_mensajes")
      .select("rol, mensaje")
      .eq("miembro_id", miembroId)
      .order("created_at", { ascending: false })
      .limit(10);
    const mensajesHistorial = (historial || []).reverse().map((m: { rol: string; mensaje: string }) => ({
      role: m.rol === "usuario" ? "user" : "assistant",
      content: m.mensaje,
    }));

    await supabase.from("soporte_mensajes").insert({ miembro_id: miembroId, rol: "usuario", mensaje, imagen_url: imagenUrl });

    const contenidoUsuario = imagenUrl ? `${mensaje}\n\n[Adjuntó una captura de pantalla: ${imagenUrl}]` : mensaje;
    const systemPrompt = buildSystemPrompt(perfil);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          ...mensajesHistorial,
          { role: "user", content: contenidoUsuario },
        ],
        max_tokens: 350,
        temperature: 0.5,
      }),
    });
    const groqData = await groqRes.json();
    let raw = groqData?.choices?.[0]?.message?.content?.trim() ||
      "Un momento, tuve un problema para responder. Intenta de nuevo.";

    let escalado = false;
    if (/^\[ESCALAR\]/i.test(raw)) {
      escalado = true;
      raw = raw.replace(/^\[ESCALAR\]\s*/i, "");
      const { data: configData } = await supabase
        .from("configuracion")
        .select("valor")
        .eq("clave", "numero_admin_notificaciones")
        .maybeSingle();
      const numAdmin = configData?.valor as string | undefined;
      if (numAdmin) {
        const nombreMiembro = (perfil as Record<string, unknown>).nombre || "Un miembro";
        const whatsappMiembro = (perfil as Record<string, unknown>).whatsapp || "no registrado";
        fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: numAdmin,
            body: `🔔 Soporte técnico del dashboard escaló una conversación.\n\nMiembro: ${nombreMiembro}\nWhatsApp: ${whatsappMiembro}\nMensaje: "${mensaje}"${imagenUrl ? `\nCaptura: ${imagenUrl}` : ""}\n\nRevísalo en Admin → Miembros.`,
          }),
        }).catch(() => {});
      }
    }

    const respuesta = raw.replace(/¿([a-záéíóúüñ])/g, (_: string, l: string) => "¿" + l.toUpperCase());

    await supabase.from("soporte_mensajes").insert({ miembro_id: miembroId, rol: "asistente", mensaje: respuesta, escalado });

    return new Response(JSON.stringify({ respuesta, escalado }), { headers: jsonHeaders });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({
      respuesta: "Tuvimos un problema técnico. Intenta de nuevo en un momento.",
      escalado: false,
    }), { status: 200, headers: jsonHeaders });
  }
});
