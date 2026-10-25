// avisar-cumpleanos — El Club de la Gente
// Supabase Edge Function · JWT: OFF (la llama pg_cron internamente, 1 vez al día)
//
// Cada día busca a los miembros Premium o Vitalicia cuyo cumpleaños es hoy,
// cruza sus categorías de interés (perfiles.categorias_interes) con los
// aliados que tengan una promoción activa marcada "es_cumpleanos", y les
// manda un WhatsApp de felicitación contándoles qué beneficios tienen ese
// día. Respeta la preferencia "descuentos" de Mi Agente (mismo criterio que
// usan las alertas de descuentos por categoría) -- sin fila en
// preferencias_notificacion se asume que sí quiere, solo se excluye a quien
// la desactivó explícitamente.
//
// El texto del mensaje lo redacta la IA (Groq, mismo proveedor que usa el
// Agente de WhatsApp en whatsapp-receive-v2.ts) para que suene personal,
// usando como guía de tono los rasgos del perfil numerológico de cada
// persona (mismo sistema "número de misión" que ya usa el Agente -- los
// RASGOS de abajo son un resumen propio de este archivo, duplicado a
// propósito, no la guía completa de estilo conversacional del Agente, que
// no aplica aquí porque esto no es una conversación). Si la IA falla o no
// responde, cae a un mensaje fijo de respaldo para que nunca se quede sin
// avisar a nadie.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

function calcularNumerologia(fechaNacimiento: string): number {
  const digits = fechaNacimiento.replace(/\D/g, "");
  let suma = digits.split("").reduce((acc, d) => acc + parseInt(d), 0);
  while (suma > 9 && suma !== 11 && suma !== 22 && suma !== 33) {
    suma = suma.toString().split("").reduce((acc, d) => acc + parseInt(d), 0);
  }
  return suma;
}

// Resumen de rasgos por número (el párrafo descriptivo de cada perfil
// numerológico completo en whatsapp-receive-v2.ts, sin las reglas de estilo
// conversacional que no aplican a un mensaje de cumpleaños de una sola vía).
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

// El mensaje completo (saludo + beneficios + link) podía pasarse del límite
// de caracteres que soporta un solo WhatsApp -- y como el link va al final
// de todo, era justo lo que se cortaba. Acortarlo con TinyURL (gratis, sin
// llave) baja tanto el peso del mensaje completo que ya no se corta, y de
// paso el link se ve corto. Si el acortador falla, se manda el link largo
// sin mensaje precargado (igual que el respaldo anterior) para no quedarse
// sin link.
async function acortarUrl(urlLarga: string): Promise<string> {
  try {
    const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(urlLarga)}`);
    const corta = (await r.text()).trim();
    if (r.ok && corta.startsWith("http")) return corta;
  } catch (e) {
    console.error("Error acortando URL:", e);
  }
  return "";
}

async function redactarMsgCumpleIA(primerNombre: string, rasgos: string, beneficios: string[], elegibleCortesias: boolean): Promise<string | null> {
  // Gratis/Básica no tienen cortesías de cumpleaños (eso es solo Premium/
  // Vitalicia) -- para esos el prompt no debe mencionar NINGÚN beneficio,
  // ni siquiera invitarlos al Directorio, para no generar una expectativa
  // que no les corresponde. Solo a Premium/Vitalicia sin promo de hoy se les
  // invita a mirar el Directorio (sí tienen acceso real a esos descuentos).
  const listaBeneficios = beneficios.length
    ? beneficios.join("\n")
    : elegibleCortesias
      ? "Hoy no hay una promoción de cumpleaños específica para sus intereses -- invítala a revisar el Directorio por si algo le interesa: https://elclubdelagente.com/Directorio.html"
      : null;
  const bloqueBeneficios = listaBeneficios
    ? `\nBeneficios reales disponibles hoy para ella (no inventes otros, cópialos tal cual si los incluyes):\n${listaBeneficios}\n`
    : `\nEsta persona NO tiene ninguna cortesía de cumpleaños disponible (es un beneficio exclusivo de otros planes) -- NO menciones beneficios, descuentos, promociones ni el Directorio. Es solo un saludo cálido de cumpleaños.\n`;
  const systemPrompt = `Eres parte del equipo de El Club de la Gente (Fusagasugá, Colombia) escribiendo UN mensaje de feliz cumpleaños por WhatsApp para un miembro del Club.

Rasgos de personalidad de esta persona (úsalos solo como guía de TONO, nunca los menciones explícitamente ni dentro expliques que vienen de un "perfil" o "número"): es ${rasgos}
${bloqueBeneficios}
Instrucciones:
- Máximo 6 líneas, cálido y natural, nunca genérico ni de plantilla.
- Usa el nombre "${primerNombre}".
- Un par de emojis está bien, sin exagerar.
- Firma al final con "El Club de la Gente" en una línea aparte.
- Responde ÚNICAMENTE con el texto final del mensaje, sin comillas ni explicaciones.`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Escribe el mensaje." }],
        // gpt-oss-120b "piensa" antes de responder y ese razonamiento también
        // cuenta contra max_tokens -- con 300 se cortaba el mensaje a mitad
        // de frase (el presupuesto se gastaba pensando, no en el texto final).
        max_tokens: 700,
        temperature: 0.8,
      }),
    });
    const data = await groqRes.json();
    const texto = data?.choices?.[0]?.message?.content?.trim();
    return texto || null;
  } catch (e) {
    console.error("Error generando mensaje de cumpleaños con IA:", e);
    return null;
  }
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fecha en hora Colombia (UTC-5), no UTC -- si no, cerca de medianoche
  // se corre el día de cumpleaños de todos.
  const hoyCo = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const mesDia = `${String(hoyCo.getUTCMonth() + 1).padStart(2, "0")}-${String(hoyCo.getUTCDate()).padStart(2, "0")}`;

  // Gratis y Básica también reciben su saludo de cumpleaños (solo que sin
  // cortesías -- esas son exclusivas de Premium/Vitalicia, ver más abajo).
  const { data: candidatos, error: errCandidatos } = await supabase
    .from("perfiles")
    .select("id, nombre, whatsapp, plan, categorias_interes, fecha_nacimiento")
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

  // Aliados activos con al menos una promoción de cumpleaños activa
  const { data: aliados, error: errAliados } = await supabase
    .from("aliados")
    .select("id, nombre, whatsapp, categoria, promociones!inner(descripcion, es_cumpleanos, activa)")
    .eq("activo", true)
    .eq("promociones.es_cumpleanos", true)
    .eq("promociones.activa", true);

  if (errAliados) console.error("Error buscando aliados con promo de cumpleaños:", errAliados);

  let mensajesEnviados = 0;
  for (const p of cumpleanerosHoy) {
    if (noQuierenDescuentos.has(p.id)) continue;
    const primerNombre = (p.nombre || "").trim().split(" ")[0] || "";
    const intereses = (Array.isArray(p.categorias_interes) ? p.categorias_interes : []).map((c: string) =>
      c.trim().toLowerCase()
    );

    // Las cortesías de cumpleaños son exclusivas de Premium/Vitalicia -- a
    // Gratis/Básica ni se les calcula (quedan sin beneficios ni enlaces).
    const elegibleCortesias = p.plan === "premium" || p.plan === "vitalicia";

    // "beneficios" es solo texto (para que la IA redacte con eso de guía) --
    // los links de WhatsApp van aparte en "enlaces" y se pegan tal cual al
    // final del mensaje, sin pasar por la IA, para que el link nunca salga
    // mal escrito o parafraseado.
    const beneficios: string[] = [];
    const enlaces: string[] = [];
    if (elegibleCortesias) {
      for (const a of aliados || []) {
        const catsAliado = (a.categoria || "").split(",").map((c: string) => c.trim().toLowerCase());
        const coincide = intereses.length === 0 || catsAliado.some((c: string) => intereses.includes(c));
        if (!coincide) continue;
        for (const promo of a.promociones || []) {
          beneficios.push(`🎁 ${a.nombre}: ${promo.descripcion}`);
          if (a.whatsapp) {
            const waDigits = String(a.whatsapp).replace(/\D/g, "");
            const texto = encodeURIComponent(`Hola, ¿Cómo estás? Soy miembro de El Club de la Gente y hoy es mi cumpleaños -- quisiera saber cómo puedo reclamar la cortesía, muchas gracias por tu servicio.`);
            const urlLarga = `https://wa.me/57${waDigits}?text=${texto}`;
            const urlCorta = await acortarUrl(urlLarga);
            enlaces.push(`🎁 *${a.nombre}*: ${promo.descripcion}\n${urlCorta || `https://wa.me/57${waDigits}`}`);
          }
        }
      }
    }

    const msgRespaldo = beneficios.length
      ? `¡Feliz cumpleaños, ${primerNombre}! 🎉🌿\n\nEl Club de la Gente te tiene estos beneficios especiales hoy:\n\n${beneficios.join("\n")}\n\n¡Que lo disfrutes!`
      : elegibleCortesias
        ? `¡Feliz cumpleaños, ${primerNombre}! 🎉🌿\n\nHoy hay aliados del Club con beneficios especiales de cumpleaños -- revísalos en el Directorio: https://elclubdelagente.com/Directorio.html\n\n¡Que tengas un gran día!`
        : `¡Feliz cumpleaños, ${primerNombre}! 🎉🌿\n\nQue tengas un día lleno de alegría, rodeado de las personas que quieres. Desde El Club de la Gente te mandamos un fuerte abrazo.\n\n¡Que lo disfrutes!`;

    const numerologia = p.fecha_nacimiento ? calcularNumerologia(p.fecha_nacimiento) : 0;
    const rasgos = RASGOS_NUMEROLOGIA[numerologia];
    const msgIA = rasgos ? await redactarMsgCumpleIA(primerNombre, rasgos, beneficios, elegibleCortesias) : null;
    const msgBase = msgIA || msgRespaldo;
    // Si el mensaje de respaldo ya trae los beneficios en texto, no hace
    // falta repetir la lista -- pero el bloque de links siempre se agrega,
    // para que pueda escribirle al aliado con un toque.
    const msg = enlaces.length
      ? `${msgBase}\n\n📲 Reclámalo escribiendo directo:\n\n${enlaces.join("\n\n")}`
      : msgBase;

    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: p.whatsapp, body: msg }),
      });
      if (r.ok) mensajesEnviados++;
    } catch (e) {
      console.error("Error enviando felicitación a", p.whatsapp, e);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, cumpleanos_hoy: cumpleanerosHoy.length, mensajes_enviados: mensajesEnviados }),
    { headers: { "Content-Type": "application/json" } },
  );
});
