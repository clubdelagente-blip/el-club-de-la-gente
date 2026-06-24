// whatsapp-receive — El Club de la Gente
// Supabase Edge Function · JWT: OFF
// Groq API (llama-3.3-70b-versatile) + perfiles numerológicos

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-twilio-signature",
  "Access-Control-Max-Age": "86400",
};

// ─── Numerología ────────────────────────────────────────────────────────────

function calcularNumerologia(fechaNacimiento: string): number {
  const digits = fechaNacimiento.replace(/\D/g, "");
  let suma = digits.split("").reduce((acc, d) => acc + parseInt(d), 0);
  while (suma > 9 && suma !== 11 && suma !== 22 && suma !== 33) {
    suma = suma.toString().split("").reduce((acc, d) => acc + parseInt(d), 0);
  }
  return suma;
}

// ─── Perfiles numerológicos ──────────────────────────────────────────────────

function getPerfilNumerologico(numero: number): string {
  const perfiles: Record<number, string> = {
    1: `PERFIL DE COMUNICACIÓN — NÚMERO 1

Esta persona es independiente, orientada a resultados y acción. Se mueve cuando ve valor claro y siente que controla la decisión. La cierran: la presión, la adulación vacía, los saludos efusivos y las excusas.

REGLAS ABSOLUTAS:
- Mensajes cortos y directos. Sin relleno ni introducción.
- Cerrar siempre con una pregunta que le da control o una acción clara.
- NUNCA escribir: "¡Qué emocionante!", "Lamentamos los inconvenientes", "Gracias por tu confianza", "Estamos a tu disposición", "Entendemos tu frustración".
- SIEMPRE preferir: "Entendido.", "Te explico directo.", "Tú decides.", "Lo resuelvo ahora."

GUÍA POR SITUACIÓN:
- Bienvenida: presentar 3 puntos concretos de valor, cerrar con pregunta de acción.
- Descuentos: dar lista limpia sin adjetivos, cerrar con oferta de detalle.
- Límite plan básico: informar sin drama, mostrar upgrade como solución lógica, no como presión.
- Fallo de aliado: pedir datos (¿qué aliado? ¿qué pasó?) y comprometerse a resolver.
- Pago/renovación: enviar directamente el link de pago del plan correspondiente sin pasos extra.
- Cancelación: confirmar sin drama, preguntar qué falló (opcional, no obligatorio).
- Queja: "Si el Club falló, lo reconocemos y lo resolvemos." Sin disculpas vacías.
- Escalamiento: conectar con equipo real, dar tiempo concreto (máximo 4 horas).
- Fuera de tema: "Eso está fuera de lo que manejo aquí." Sin rodeos.
- Saludo simple ("hola", "buenos días", "qué más"): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,
  };

  return perfiles[numero] || "";
}

// ─── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(perfil: Record<string, unknown>, numerologia: number, aliados: Record<string, unknown>[] = [], promos: Record<string, unknown>[] = []): string {
  const perfilNumerologico = getPerfilNumerologico(numerologia);

  const categorias = Array.isArray(perfil.categorias_interes)
    ? (perfil.categorias_interes as string[]).join(", ")
    : perfil.categorias_interes || "no especificadas";

  const miembroId = perfil.id || "";
  // Reemplazar MIEMBRO_ID con el ID real del miembro en los links de pago
  const buildBase = (text: string) => text.replace(/MIEMBRO_ID/g, miembroId as string);

  let base = buildBase(`Eres el asistente virtual de El Club de la Gente, una comunidad de membresía local en Fusagasugá, Colombia.

CONOCIMIENTO DEL CLUB:
- Plan Básica: $10.000/mes · 2 descuentos por mes por cada establecimiento aliado · acceso a comunidad y programas educativos · Link de pago: https://elclubdelagente.com/Planes.html?id=MIEMBRO_ID
- Plan Premium: $20.000/mes · descuentos ilimitados · ClubCard personalizada · sorteos exclusivos · Link de pago: https://elclubdelagente.com/Planes.html?id=MIEMBRO_ID
- Plan Vitalicia: $0 · se obtiene con 5 referidos activos · descuentos ilimitados para siempre
- Aliados en Fusagasugá: bienestar/salud, barbería, odontología, turismo, veterinaria, ropa personalizada, publicidad, comida rápida, fruver, regalos, heladería
- QR: el miembro lo muestra al aliado para registrar el descuento, queda guardado en el historial
- Renovación: por plataforma, Wompi, Nequi o Daviplata · activación en menos de 2 horas con comprobante
- Referidos: enlace único por miembro · 5 referidos activos = membresía vitalicia gratis · Link de referido del miembro actual: https://elclubdelagente.com/Registro.html?ref=MIEMBRO_ID
- Impacto social: parte de cada membresía apoya fundaciones de rescate animal, mercados comunitarios y emprendedores locales
- Para escalar a humano: el equipo responde en máximo 4 horas en el mismo chat

PERFIL DEL MIEMBRO:
- Nombre: ${perfil.nombre || "miembro"}
- Plan actual: ${perfil.plan || "básica"}
- Fecha de vencimiento: ${perfil.fecha_vencimiento || "no registrada"}
- Rol: ${perfil.rol || "miembro"}
- Número numerológico: ${numerologia}
- Género: ${perfil.genero || "no especificado"}
- Ocupación: ${perfil.ocupacion || "no especificada"}
- Barrio: ${perfil.barrio || "no especificado"}
- Intereses: ${categorias}
- Tiene mascotas: ${perfil.tiene_mascotas ? "sí" : "no"}
- Tiene hijos: ${perfil.tiene_hijos ? "sí" : "no"}
- Canal preferido: ${perfil.canal_preferido || "whatsapp"}
- Contenido preferido: ${perfil.contenido_preferido || "no especificado"}
- Impacto social le importa: ${perfil.impacto_social ? "sí" : "no"}`);

  if (aliados.length > 0) {
    const aliadosList = aliados.map((a) => {
      const wa = a.whatsapp ? `wa.me/57${String(a.whatsapp).replace(/\D/g,"")}` : null;
      return `- ${a.nombre} (${a.categoria}): ${a.descuento} de descuento · ${a.direccion}${wa ? ` · WhatsApp: ${wa}` : ""}`;
    }).join("\n");
    base += `\n\nALIADOS DISPONIBLES:\n${aliadosList}\n\nCuando el miembro quiera contactar un aliado específico, comparte el link de WhatsApp así: "Te conecto directo con [nombre]: https://wa.me/57XXXXXXXXXX"`;
  }

  if (perfilNumerologico) {
    base += `\n\n${perfilNumerologico}`;
  }

  base += `\n\nUSO DE PREFERENCIAS DEL MIEMBRO:
Usa el perfil del miembro para personalizar respuestas de forma natural, sin mencionarlo explícitamente:
- Si tiene mascotas → destaca la veterinaria cuando hable de aliados o descuentos.
- Si tiene hijos → menciona aliados familiares (heladería, fruver, regalos) como primera opción.
- Si impacto social le importa → cuando sea relevante menciona cómo su membresía apoya causas locales.
- Si sus intereses incluyen salud → destaca aliados de bienestar, odontología, barbería.
- Si sus intereses incluyen turismo → destaca el aliado de turismo.
- Si sus intereses incluyen comida → destaca comida rápida, fruver, heladería.
- Cuando pregunte por aliados disponibles → ordena la lista priorizando los que más se alinean con sus intereses y perfil.
- No menciones que estás usando su perfil — simplemente personaliza la respuesta de forma natural.

Responde siempre en español. Nunca inventes datos del sistema (saldos, fechas, aliados específicos) si no los tienes — di que los verificas. Si el usuario pide hablar con una persona real, indícale que el equipo responde en máximo 4 horas.`;

  return base;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const twimlEmpty = new Response("<Response></Response>", {
    headers: { "Content-Type": "text/xml", ...corsHeaders },
  });

  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const from = params.get("From") || "";
    const messageBody = (params.get("Body") || "").trim();

    if (!from || !messageBody) return twimlEmpty;

    // Normalizar número de WhatsApp
    const whatsappFull = from.replace("whatsapp:", "").replace(/\D/g, "");
    const whatsappLocal = whatsappFull.startsWith("57") ? whatsappFull.slice(2) : whatsappFull;

    console.log("FROM:", from);
    console.log("WHATSAPP_FULL:", whatsappFull);
    console.log("WHATSAPP_LOCAL:", whatsappLocal);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: perfilData, error: perfilError } = await supabase
      .from("perfiles")
      .select(
        "id, nombre, plan, rol, whatsapp, fecha_nacimiento, fecha_vencimiento, estilo_comunicacion, genero, ocupacion, barrio, categorias_interes, tiene_mascotas, tiene_hijos, impacto_social, canal_preferido, contenido_preferido"
      )
      .or(`whatsapp.eq.${whatsappFull},whatsapp.eq.${whatsappLocal},whatsapp.ilike.%${whatsappLocal}`)
      .maybeSingle();

    console.log("PERFIL_DATA:", JSON.stringify(perfilData));
    console.log("PERFIL_ERROR:", JSON.stringify(perfilError));

    const perfil = perfilData || {};

    // Cargar aliados
    const { data: aliadosData } = await supabase
      .from("aliados")
      .select("nombre, categoria, descuento, whatsapp, direccion");
    const aliados = aliadosData || [];

    // Calcular numerología
    let numerologia = 0;
    if (perfil.fecha_nacimiento) {
      numerologia = calcularNumerologia(perfil.fecha_nacimiento);
    }

    const systemPrompt = buildSystemPrompt(perfil, numerologia, aliados);

    // Cargar historial de conversación (últimos 10 mensajes)
    const { data: historial } = await supabase
      .from("conversaciones")
      .select("rol, contenido")
      .eq("whatsapp", whatsappLocal)
      .order("created_at", { ascending: false })
      .limit(10);

    const mensajesHistorial = (historial || []).reverse().map((m: { rol: string; contenido: string }) => ({
      role: m.rol as "user" | "assistant",
      content: m.contenido,
    }));

    // Guardar mensaje del usuario
    await supabase.from("conversaciones").insert({
      whatsapp: whatsappLocal,
      rol: "user",
      contenido: messageBody,
    });

    // Llamar a Groq con historial
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...mensajesHistorial,
          { role: "user", content: messageBody },
        ],
        max_tokens: 400,
        temperature: 0.6,
      }),
    });

    const groqData = await groqRes.json();
    const raw = groqData?.choices?.[0]?.message?.content?.trim() ||
      "Un momento, estoy teniendo problemas para responder. Intenta de nuevo.";
    // Capitalizar letra después de ¿
    const respuesta = raw.replace(/¿([a-záéíóúüñ])/g, (_: string, l: string) => "¿" + l.toUpperCase());

    // Guardar respuesta del agente
    await supabase.from("conversaciones").insert({
      whatsapp: whatsappLocal,
      rol: "assistant",
      contenido: respuesta,
    });

    // Devolver TwiML
    const twiml = `<Response><Message>${respuesta}</Message></Response>`;
    return new Response(twiml, {
      headers: { "Content-Type": "text/xml", ...corsHeaders },
    });
  } catch (err) {
    console.error("Error:", err);
    return twimlEmpty;
  }
});
