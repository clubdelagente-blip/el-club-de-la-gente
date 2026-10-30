// avisar-cumpleanos — El Club de la Gente
// Supabase Edge Function · JWT: OFF (la llama pg_cron internamente, 1 vez al día)
//
// Cada día busca a TODOS los miembros (cualquier plan) cuyo cumpleaños es
// hoy y les manda un WhatsApp de felicitación. Respeta la preferencia
// "descuentos" de Mi Agente (mismo criterio que usan las alertas de
// descuentos por categoría) -- sin fila en preferencias_notificacion se
// asume que sí quiere, solo se excluye a quien la desactivó explícitamente.
//
// MIGRACIÓN A PLANTILLAS (2026-10-29): fuera del Sandbox, Meta exige que un
// mensaje de negocio-a-usuario fuera de la ventana de 24h use una plantilla
// aprobada -- ya no se puede mandar el párrafo libre de 6 líneas que
// redactaba la IA antes. Las cortesías de cumpleaños (exclusivas de
// Premium/Vitalicia) tampoco se listan ya en este mensaje -- eso quedó para
// cuando el miembro responda "sí" dentro de la ventana de 24h, que ahí sí
// puede ser texto libre (ver whatsapp-receive-v2.ts).
//
// Dos plantillas, según el plan:
// - Premium/Vitalicia (sí tienen cortesías): feliz_cumpleanos_v2, termina
//   preguntando si quiere acceder a sus cortesías.
// - Gratis/Básica (no tienen cortesías): feliz_cumpleanos_basico, mismo
//   saludo + frase personalizada, sin la pregunta (no hay nada que ofrecer).
// Ambas comparten {{1}}=primer nombre, {{2}}=frase corta según el número de
// misión de la persona -- la IA la redacta en el momento (solo esa frase,
// no el mensaje completo); si falla, cae a una de las 12 frases fijas de
// respaldo, nunca se queda sin mandar nada.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

const CONTENT_SID_CUMPLE_PREMIUM = "HXff073eb3a93c3735d92b8a7dea3be4fa"; // feliz_cumpleanos_v2
const CONTENT_SID_CUMPLE_BASICO = "HX3f6892fbda13a2f0c9725bc696c60c26"; // feliz_cumpleanos_basico

function calcularNumerologia(fechaNacimiento: string): number {
  const digits = fechaNacimiento.replace(/\D/g, "");
  let suma = digits.split("").reduce((acc, d) => acc + parseInt(d), 0);
  while (suma > 9 && suma !== 11 && suma !== 22 && suma !== 33) {
    suma = suma.toString().split("").reduce((acc, d) => acc + parseInt(d), 0);
  }
  return suma;
}

// Resumen de rasgos por número (el párrafo descriptivo de cada perfil
// numerológico completo vive en whatsapp-receive-v2.ts, sin las reglas de
// estilo conversacional que no aplican a un mensaje de una sola vía) --
// se usa como guía de tono para la IA, no se manda tal cual.
const RASGOS_NUMEROLOGIA: Record<number, string> = {
  1: "independiente, orientada a resultados y acción. Valora el reconocimiento directo, sin rodeos.",
  2: "sensible, empática y valora profundamente sentirse escuchada y comprendida.",
  3: "creativa, sociable y expresiva. Le encanta la energía positiva y sentir que pertenece a algo especial.",
  4: "práctica, organizada y confiable. Valora la exactitud y que las cosas cumplan lo que prometen.",
  5: "libre, aventurera y espontánea. Le gustan las novedades, la variedad y sentir que tiene opciones.",
  6: "protectora, responsable y orientada a su familia y comunidad.",
  7: "analítica, reflexiva e independiente intelectualmente. Valora la transparencia y la profundidad.",
  8: "ambiciosa, orientada al éxito y valora el tiempo y los resultados concretos.",
  9: "humanitaria, compasiva y motivada por un propósito mayor que el suyo propio.",
  11: "altamente intuitiva, sensible e inspiradora. Se conecta con la autenticidad y el significado profundo.",
  22: "visionaria, constructora y pragmática a la vez. Piensa en grande pero actúa con precisión.",
  33: "encarna la compasión, el servicio y el amor incondicional hacia los demás.",
};

// Respaldo fijo si la IA falla o no responde -- una frase por número, mismo
// tono/estilo que se le pide a la IA ("Que este nuevo año...").
const FRASES_RESPALDO_NUMEROLOGIA: Record<number, string> = {
  1: "Que este nuevo año te siga impulsando a ir tras lo que quieres, con la fuerza y la claridad que ya te caracterizan. 🚀",
  2: "Que este nuevo año te siga rodeando de las personas que de verdad te escuchan y te valoran tal como eres. 💙",
  3: "Que este nuevo año te traiga muchos motivos para crear, compartir y contagiar esa energía tan tuya. ✨",
  4: "Que este nuevo año siga premiando tu constancia y tu palabra, que siempre vale lo que promete. 🌿",
  5: "Que este nuevo año venga cargado de planes nuevos, caminos distintos y la libertad de elegir los tuyos. 🌎",
  6: "Que este nuevo año te devuelva, multiplicado, todo el cuidado que le regalas a quienes más quieres. 🏡",
  7: "Que este nuevo año te siga regalando espacio para pensar, entender y llegar al fondo de lo que de verdad te importa. 🌌",
  8: "Que este nuevo año te acerque un paso más a esas metas que te has propuesto, con el mismo empuje de siempre. 💪",
  9: "Que este nuevo año te siga conectando con esas causas que le dan sentido a todo lo que haces por los demás. 🌱",
  11: "Que este nuevo año siga despertando esa intuición que inspira a quienes te rodean. ✨",
  22: "Que este nuevo año te siga dando la claridad para soñar en grande y la mano firme para construirlo. 🏗️",
  33: "Que este nuevo año te devuelva en amor todo lo que entregas con tanta generosidad a los demás. 💛",
};

// Genera SOLO la frase corta de {{2}} -- la plantilla ya trae su propio
// saludo y su propio cierre fijos, así que la IA no debe repetir "feliz
// cumpleaños", ni firmar, ni mencionar cortesías/beneficios (eso ya está
// cubierto por el texto fijo antes y después de esta variable).
async function redactarFraseCumpleIA(rasgos: string): Promise<string | null> {
  const systemPrompt = `Eres parte del equipo de El Club de la Gente (Fusagasugá, Colombia). Vas a escribir UNA sola frase corta (máximo 160 caracteres) para la mitad de un mensaje de cumpleaños por WhatsApp.

Rasgos de personalidad de esta persona (úsalos solo como guía de TONO, nunca los menciones explícitamente ni expliques que vienen de un "perfil" o "número"): es ${rasgos}

Instrucciones:
- Empieza con "Que este nuevo año..." (mismo estilo siempre).
- Máximo 160 caracteres, una sola frase, cálida y natural.
- NO saludes ("feliz cumpleaños" ya está en otra parte del mensaje), NO firmes, NO menciones cortesías, descuentos ni beneficios.
- Un emoji al final está bien.
- Responde ÚNICAMENTE con la frase final, sin comillas ni explicaciones.`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Escribe la frase." }],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });
    const data = await groqRes.json();
    const texto = data?.choices?.[0]?.message?.content?.trim();
    // Si por algo la IA se extiende de más, mejor usar el respaldo fijo que
    // mandar algo que se corte a mitad de frase o rompa el límite de WhatsApp.
    if (texto && texto.length <= 300) return texto;
    return null;
  } catch (e) {
    console.error("Error generando frase de cumpleaños con IA:", e);
    return null;
  }
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fecha en hora Colombia (UTC-5), no UTC -- si no, cerca de medianoche
  // se corre el día de cumpleaños de todos.
  const hoyCo = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const mesDia = `${String(hoyCo.getUTCMonth() + 1).padStart(2, "0")}-${String(hoyCo.getUTCDate()).padStart(2, "0")}`;

  const { data: candidatos, error: errCandidatos } = await supabase
    .from("perfiles")
    .select("id, nombre, whatsapp, plan, fecha_nacimiento")
    .in("plan", ["gratis", "basica", "premium", "vitalicia"])
    .not("fecha_nacimiento", "is", null)
    .not("whatsapp", "is", null);

  if (errCandidatos) {
    console.error("Error buscando candidatos:", errCandidatos);
    return new Response(JSON.stringify({ ok: false, error: errCandidatos.message }), { status: 500 });
  }

  const cumpleanerosHoy = (candidatos || []).filter((p) => (p.fecha_nacimiento || "").slice(5, 10) === mesDia);

  if (!cumpleanerosHoy.length) {
    return new Response(JSON.stringify({ ok: true, cumpleanos_hoy: 0, mensajes_enviados: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Respeta la preferencia real de "Alertas de descuentos" de Mi Agente
  const ids = cumpleanerosHoy.map((p) => p.id);
  const { data: prefs } = await supabase
    .from("preferencias_notificacion")
    .select("miembro_id")
    .in("miembro_id", ids)
    .eq("descuentos", false);
  const noQuierenDescuentos = new Set((prefs || []).map((r) => r.miembro_id));

  let mensajesEnviados = 0;
  for (const p of cumpleanerosHoy) {
    if (noQuierenDescuentos.has(p.id)) continue;
    const primerNombre = (p.nombre || "").trim().split(" ")[0] || "";
    const elegibleCortesias = p.plan === "premium" || p.plan === "vitalicia";

    const numerologia = p.fecha_nacimiento ? calcularNumerologia(p.fecha_nacimiento) : 0;
    const rasgos = RASGOS_NUMEROLOGIA[numerologia];
    const frase = (rasgos ? await redactarFraseCumpleIA(rasgos) : null) || FRASES_RESPALDO_NUMEROLOGIA[numerologia] || FRASES_RESPALDO_NUMEROLOGIA[1];

    const contentSid = elegibleCortesias ? CONTENT_SID_CUMPLE_PREMIUM : CONTENT_SID_CUMPLE_BASICO;
    // Se guarda el texto ya armado (no la plantilla cruda) en "conversaciones"
    // -- es lo que el Agente necesita ver en su historial para entender un
    // "sí" que llegue como respuesta a esto (ver whatsapp-receive-v2.ts).
    const textoRenderizado = elegibleCortesias
      ? `¡Feliz cumpleaños, ${primerNombre}! 🎉\n\n${frase}\n\n¿Te gustaría acceder a tus cortesías de parte del Club? Respóndeme que sí y te las envió 💙`
      : `¡Feliz cumpleaños, ${primerNombre}! 🎉\n\n${frase}\n\nEl Club de la Gente`;

    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: p.whatsapp,
          contentSid,
          contentVariables: { "1": primerNombre, "2": frase },
        }),
      });
      if (r.ok) {
        mensajesEnviados++;
        const whatsappLocal = (p.whatsapp || "").replace(/\D/g, "");
        await supabase.from("conversaciones").insert({ whatsapp: whatsappLocal, rol: "assistant", contenido: textoRenderizado });
      } else {
        console.error("whatsapp-send-3 rechazó la felicitación a", p.whatsapp, r.status, await r.text().catch(() => ""));
      }
    } catch (e) {
      console.error("Error enviando felicitación a", p.whatsapp, e);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, cumpleanos_hoy: cumpleanerosHoy.length, mensajes_enviados: mensajesEnviados }),
    { headers: { "Content-Type": "application/json" } },
  );
});
