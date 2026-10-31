// whatsapp-receive — El Club de la Gente
// Supabase Edge Function · JWT: OFF
// Groq API (openai/gpt-oss-120b) + perfiles numerológicos
//
// NOTA (2026-09-04): antes usaba llama-3.3-70b-versatile, pero ese modelo
// paso a ser exclusivo para cuentas Enterprise de Groq el 26 de agosto de
// 2026 y ya no esta disponible en el plan estandar. Se cambio a
// openai/gpt-oss-120b, que si esta disponible.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE_TTS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_WEBHOOK_URL = Deno.env.get("TWILIO_WEBHOOK_URL")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;

// Modelo de visión de Groq (ver verificar-comprobante.ts para más contexto
// de por qué esto se revisa aparte -- Groq cambia su catálogo seguido).
const MODELO_VISION = "qwen/qwen3.8-27b";

// Modelo de transcripción de audio (Whisper) de Groq, para notas de voz.
const MODELO_AUDIO = "whisper-large-v3-turbo";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MIN = 5;
// Tope aparte por día -- el de 5 minutos no frena a alguien que manda
// mensajes "a goteo" (uno cada rato) durante horas; cada uno igual gasta una
// llamada completa a Groq. 80/día es generoso para una conversación real,
// pero corta un uso sostenido fuera de lo normal.
const RATE_LIMIT_DIARIO_MAX = 80;
const MAX_MESSAGE_LENGTH = 500;

// Tope de tiempo para llamadas externas (Groq, Twilio, Google) -- sin esto,
// si alguno de esos servicios se cuelga, la función se queda esperando
// indefinidamente y el miembro nunca recibe respuesta.
const TIMEOUT_EXTERNO_MS = 20000;

async function fetchConTimeout(url: string, options: RequestInit, timeoutMs: number = TIMEOUT_EXTERNO_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Plantilla "escalacion_agente_whatsapp", ya aprobada por Meta -- {{1}}=nombre
// del miembro, {{2}}=su WhatsApp, {{3}}=su último mensaje.
const CONTENT_SID_ESCALACION_AGENTE_WHATSAPP = "HX08a7a8103f59f6256d3df18c2860dd1e";

// Mismas etiquetas de estado que dashboard.js (ESTADO_PEDIDO_CLUB), sin color
// -- solo el texto, para que el Agente describa el estado con las mismas
// palabras que ya ve el miembro en "Mis pedidos".
const ESTADO_PEDIDO_CLUB_TXT: Record<string, string> = {
  pendiente_pago: "Confirmando pago",
  pagado: "Pagado, en cola para pedir",
  pedido_proveedor: "Pedido al proveedor",
  en_transito: "En tránsito",
  aduana: "En aduana",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const ESTADO_PEDIDO_ALIADO_TXT: Record<string, string> = {
  pendiente: "Pendiente de confirmación del negocio",
  confirmado: "Confirmado por el negocio",
  rechazado: "Rechazado",
  entregado: "Entregado",
};

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

// Respaldo fijo de escalación: la IA debería marcar [ESCALAR] ella misma
// cuando detecta una queja o un pedido de hablar con una persona, pero
// ningún modelo obedece el 100% de las veces. Estas frases fuerzan la
// escalación aunque la IA no lo haya marcado, para que una queja real nunca
// se quede sin llegarle a nadie del equipo.
const PALABRAS_ESCALACION = [
  /hablar\s+con\s+(alguien|una\s+persona|un\s+humano|un\s+asesor|un\s+agente)/i,
  /persona\s+real/i,
  /necesito\s+un\s+asesor/i,
  /es\s+una\s+queja/i,
  /tengo\s+una\s+queja/i,
  /quiero\s+poner\s+una\s+queja/i,
  /quiero\s+reclamar/i,
];

function sanitizar(mensaje: string): { texto: string; esAtaque: boolean } {
  const texto = mensaje.slice(0, MAX_MESSAGE_LENGTH);
  const esAtaque = INJECTION_PATTERNS.some((p) => p.test(texto));
  return { texto, esAtaque };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-twilio-signature",
  "Access-Control-Max-Age": "86400",
};

// ─── Validación firma Twilio ─────────────────────────────────────────────────

async function validateTwilioSignature(url: string, params: Record<string, string>, signature: string): Promise<boolean> {
  const sortedKeys = Object.keys(params).sort();
  let str = url;
  for (const key of sortedKeys) str += key + (params[key] ?? "");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(TWILIO_AUTH_TOKEN), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(str));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
  return computed === signature;
}

// ─── Rate limiting ───────────────────────────────────────────────────────────

async function excedeLimite(supabase: ReturnType<typeof createClient>, whatsapp: string): Promise<boolean> {
  const desde = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("conversaciones")
    .select("id", { count: "exact", head: true })
    .eq("whatsapp", whatsapp)
    .eq("rol", "user")
    .gte("created_at", desde);
  if ((count ?? 0) >= RATE_LIMIT_MAX) return true;

  const desdeHoy = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: countDia } = await supabase
    .from("conversaciones")
    .select("id", { count: "exact", head: true })
    .eq("whatsapp", whatsapp)
    .eq("rol", "user")
    .gte("created_at", desdeHoy);
  return (countDia ?? 0) >= RATE_LIMIT_DIARIO_MAX;
}

// ─── Media entrante (fotos y audios de WhatsApp) ────────────────────────────
// Twilio exige Basic Auth para descargar el archivo -- Groq no puede recibir
// esa URL directo porque Groq la descarga por su cuenta y no tiene esas
// credenciales. Por eso se descarga aquí con la auth de Twilio. Las fotos se
// vuelven a subir al bucket "contenido" (mismo bucket y patrón que usa
// Admin.html para las fotos que YA se envían desde el Club) para tener una
// URL pública que Groq sí pueda leer; los audios se transcriben directo
// (Whisper recibe el archivo, no una URL) y TAMBIÉN se suben, para que el
// audio original quede reproducible en el hilo de Admin → Agente WhatsApp.

async function descargarMediaTwilio(mediaUrl: string): Promise<Blob | null> {
  try {
    const authHeader = "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const res = await fetchConTimeout(mediaUrl, { headers: { Authorization: authHeader } });
    if (!res.ok) return null;
    return await res.blob();
  } catch (_) {
    return null;
  }
}

async function subirBlobAStorage(
  supabase: ReturnType<typeof createClient>,
  blob: Blob,
  contentType: string
): Promise<string | null> {
  try {
    const ext = (contentType.split("/")[1] || "bin").split(";")[0];
    const path = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("contenido").upload(path, blob, { contentType });
    if (error) return null;
    return supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
  } catch (_) {
    return null;
  }
}

async function descargarYSubirMedia(
  supabase: ReturnType<typeof createClient>,
  mediaUrl: string,
  contentType: string
): Promise<string | null> {
  const blob = await descargarMediaTwilio(mediaUrl);
  if (!blob) return null;
  return subirBlobAStorage(supabase, blob, contentType);
}

async function transcribirAudioWhatsApp(blob: Blob, contentType: string): Promise<string | null> {
  try {
    const ext = (contentType.split("/")[1] || "ogg").split(";")[0];
    const form = new FormData();
    form.append("file", blob, `audio.${ext}`);
    form.append("model", MODELO_AUDIO);
    form.append("language", "es");
    const res = await fetchConTimeout("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.text || "").trim() || null;
  } catch (_) {
    return null;
  }
}

async function describirImagenWhatsApp(imageUrl: string): Promise<string | null> {
  try {
    const groqRes = await fetchConTimeout("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODELO_VISION,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Describe en español, en máximo 3 frases, qué se ve en esta imagen. Sé concreto (objeto, texto visible, contexto relevante) para que alguien que no puede verla entienda de qué se trata." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        }],
        temperature: 0,
        max_tokens: 200,
      }),
    });
    const data = await groqRes.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (_) {
    return null;
  }
}

// Limpia el texto antes de mandarlo a hablar: *negrita*/_cursiva_ tienen
// sentido en el chat de WhatsApp, pero en audio el TTS lee los símbolos tal
// cual ("asterisco") -- se quitan solo para la voz, el texto guardado en
// conversaciones (lo que ve el admin) no se toca.
function limpiarParaVoz(texto: string): string {
  return texto.replace(/[*_~]/g, "");
}

// Respuesta en audio: solo se usa cuando el miembro LE escribió al Agente con
// un audio (esAudio más abajo) -- se le contesta en el mismo formato, como
// haría una persona. OGG/Opus es el único formato que WhatsApp reproduce
// como nota de voz real (con la forma de onda); cualquier otro formato le
// llegaría como archivo adjunto para descargar, no como audio del chat.
// Neural2 (en vez de Wavenet) suena bastante más natural -- Google todavía
// la cubre en su nivel gratis (1 millón de caracteres/mes), de sobra para
// este uso.
async function generarAudioTTS(texto: string): Promise<Blob | null> {
  try {
    const res = await fetchConTimeout(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: limpiarParaVoz(texto) },
        voice: { languageCode: "es-US", name: "es-US-Neural2-A" },
        audioConfig: { audioEncoding: "OGG_OPUS" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const base64 = data?.audioContent;
    if (!base64) return null;
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new Blob([bytes], { type: "audio/ogg" });
  } catch (_) {
    return null;
  }
}

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
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    2: `PERFIL DE COMUNICACIÓN — NÚMERO 2

Esta persona es sensible, empática y valora profundamente sentirse escuchada y comprendida. No toma decisiones bajo presión — las toma cuando siente confianza y conexión genuina. La cierran: la frialdad, los mensajes robóticos, la prisa y sentir que es un número más.

REGLAS ABSOLUTAS:
- Tono cálido pero sin exagerar. Natural, como una conversación entre personas.
- Validar siempre antes de informar. Primero reconocer, luego explicar.
- NUNCA escribir: "Según nuestros registros", "Procederemos a", "Le informamos que", "Es su responsabilidad".
- SIEMPRE preferir: "Claro que sí", "Con gusto te ayudo", "Entiendo perfectamente", "Estamos aquí para ti".
- Cerrar con una pregunta amable, nunca con una instrucción fría.

GUÍA POR SITUACIÓN:
- Bienvenida: mencionar el impacto de comunidad y los beneficios con calidez, invitar a explorar.
- Descuentos: presentar los aliados más relevantes para su perfil con una frase de contexto, no solo lista seca.
- Límite plan básico: explicar con comprensión, ofrecer el upgrade como una forma de "tener más tranquilidad".
- Fallo de aliado: reconocer primero ("eso no debió pasar"), pedir los datos con amabilidad y comprometerse.
- Pago/renovación: acompañar el link con una frase de apoyo, no enviarlo solo.
- Cancelación: mostrar comprensión genuina, preguntar si hubo algo que no funcionó bien, dejar la puerta abierta.
- Queja: escuchar completamente antes de responder. Nunca interrumpir con soluciones antes de validar el malestar.
- Escalamiento: garantizar que una persona real va a atenderle, dar nombre del equipo si es posible.
- Fuera de tema: redirigir con amabilidad, no cortar de golpe.
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    3: `PERFIL DE COMUNICACIÓN — NÚMERO 3

Esta persona es creativa, sociable y expresiva. Le encanta la energía positiva, las ideas nuevas y sentir que pertenece a algo especial. Se desconecta con lo aburrido, lo repetitivo o lo demasiado formal. La ganan: el entusiasmo genuino, las historias y el sentido de comunidad.

REGLAS ABSOLUTAS:
- Mensajes con energía y personalidad. Pueden ser un poco más largos si cuentan algo interesante.
- Usar lenguaje cercano y fresco. Nada de corporativo.
- NUNCA escribir: "Estimado usuario", "De acuerdo a la política", "Procedemos a informarle", "No es posible".
- SIEMPRE preferir: "¡Perfecto!", "Mira esto que te tengo", "El Club tiene algo bueno para ti", "Te cuento".
- Cerrar con algo que invite a participar o descubrir más.

GUÍA POR SITUACIÓN:
- Bienvenida: destacar la comunidad, el ambiente del Club y lo que lo hace diferente. Hacerle sentir especial.
- Descuentos: presentar los aliados como experiencias, no como lista. "Puedes ir a X y ahorrar Y" en lugar de solo datos.
- Límite plan básico: presentar el Premium como "más libertad para disfrutar el Club sin límites".
- Fallo de aliado: reconocer con energía positiva ("vamos a solucionar eso"), pedir los datos sin sonar a protocolo.
- Pago/renovación: enlace con una frase que genere emoción por renovar, no solo instrucción.
- Cancelación: mostrar pena genuina, recordar lo que ha disfrutado, dejar una puerta muy abierta para volver.
- Queja: tomar el tema con seriedad sin perder el tono cercano. No dramatizar pero sí resolver.
- Escalamiento: "Te conecto con el equipo, ellos te van a atender personalmente."
- Fuera de tema: redirigir con humor suave o con energía positiva, nunca con dureza.
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    4: `PERFIL DE COMUNICACIÓN — NÚMERO 4

Esta persona es práctica, organizada y confiable. Toma decisiones basadas en datos concretos, pasos claros y garantías. Desconfía de lo vago, lo exagerado o lo que suena a promesa sin respaldo. La ganan: la exactitud, la consistencia y demostrar que el Club cumple lo que dice.

REGLAS ABSOLUTAS:
- Mensajes precisos y bien estructurados. Listas cuando hay varios puntos.
- Dar siempre datos concretos: precios exactos, fechas, pasos numerados.
- NUNCA escribir: "Aproximadamente", "Más o menos", "Debería funcionar", "Casi siempre".
- SIEMPRE preferir: "El costo exacto es", "Los pasos son", "Se activa en menos de 2 horas con comprobante", "Está confirmado".
- Cerrar con el siguiente paso claro y concreto.

GUÍA POR SITUACIÓN:
- Bienvenida: explicar el Club con estructura: qué es, cómo funciona, qué incluye cada plan. Sin adornos.
- Descuentos: lista ordenada con nombre del aliado, categoría, porcentaje exacto y dirección.
- Límite plan básico: explicar exactamente cuántos usos quedan o cuándo se reinicia el contador.
- Fallo de aliado: solicitar datos específicos (nombre del aliado, fecha, qué pasó exactamente) y dar plazo concreto de respuesta.
- Pago/renovación: indicar exactamente cuánto cuesta, qué incluye y cuánto tarda la activación.
- Cancelación: confirmar que queda cancelado, indicar hasta qué fecha aplica y qué pasa con los beneficios restantes.
- Queja: documentar el problema con detalle, comprometerse a una solución con tiempo definido.
- Escalamiento: "El equipo te contacta en máximo 4 horas. Te confirmo cuando lo hagan."
- Fuera de tema: "Eso no está dentro de lo que manejo. ¿Hay algo del Club en lo que pueda ayudarte?"
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    5: `PERFIL DE COMUNICACIÓN — NÚMERO 5

Esta persona es libre, aventurera y espontánea. Le gustan las novedades, la variedad y sentir que tiene opciones. Se aburre con lo rutinario, lo lento o lo que siente como obligación. La ganan: la flexibilidad, las sorpresas y mostrarle algo que no conocía.

REGLAS ABSOLUTAS:
- Mensajes ágiles, dinámicos. Nunca largos ni llenos de pasos.
- Mostrar variedad y posibilidades, no una sola opción.
- NUNCA escribir: "Debe seguir el proceso", "Es obligatorio", "No hay otra opción", "Tiene que".
- SIEMPRE preferir: "Tienes varias opciones", "Lo que más te acomode", "Esto acaba de llegar", "Algo nuevo que te puede interesar".
- Cerrar con algo que invite a explorar, no a comprometerse.

GUÍA POR SITUACIÓN:
- Bienvenida: destacar la variedad de aliados y la libertad del Club. Mencionar que siempre hay algo nuevo.
- Descuentos: mostrar opciones variadas según su perfil, destacar las más diferentes o recientes.
- Límite plan básico: presentar el Premium como "sin límites, cuando quieras, donde quieras".
- Fallo de aliado: resolver rápido y sin burocracia. No pedir demasiados datos.
- Pago/renovación: hacerlo fácil y rápido. Destacar que se activa casi de inmediato.
- Cancelación: respetar la decisión sin presión. Mencionar que puede volver cuando quiera, sin trámites.
- Queja: resolver ágil. Esta persona no quiere esperar ni llenar formularios.
- Escalamiento: "Te conecto ahora con alguien del equipo."
- Fuera de tema: redirigir con algo interesante del Club que pueda captar su atención.
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    6: `PERFIL DE COMUNICACIÓN — NÚMERO 6

Esta persona es protectora, responsable y orientada a su familia y comunidad. Toma decisiones pensando en los demás, no solo en sí misma. La mueven: el bienestar colectivo, la confianza y saber que está apoyando algo bueno. La cierran: la frialdad, el individualismo y la falta de valores claros.

REGLAS ABSOLUTAS:
- Tono cálido, familiar y de confianza. Como hablar con alguien de confianza.
- Conectar los beneficios del Club con el bienestar de su familia y comunidad.
- NUNCA escribir: "Eso no aplica", "No es nuestro problema", "Solo aplica para usted".
- SIEMPRE preferir: "Esto también puede beneficiar a tu familia", "El Club cuida a toda la comunidad", "Estamos para apoyarte".
- Mencionar el impacto social cuando sea natural hacerlo.

GUÍA POR SITUACIÓN:
- Bienvenida: destacar el impacto del Club en la comunidad local y cómo su membresía apoya causas reales.
- Descuentos: priorizar aliados familiares (heladería, fruver, veterinaria, regalos) y mencionar que son locales.
- Límite plan básico: enfocar el upgrade en "más beneficios para ti y tu familia sin preocupaciones".
- Fallo de aliado: mostrar genuina preocupación. "Eso no debe pasar. Lo atendemos."
- Pago/renovación: recordar el valor que genera para su familia y para la comunidad al renovar.
- Cancelación: preguntar con cuidado si hubo algo que no la hizo sentir bien atendida.
- Queja: tomar el malestar con seriedad total. Esta persona espera que el Club sea confiable.
- Escalamiento: garantizar atención personal y humana, no robótica.
- Fuera de tema: redirigir con amabilidad, mencionando algo del Club que pueda serle útil a ella o su familia.
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    7: `PERFIL DE COMUNICACIÓN — NÚMERO 7

Esta persona es analítica, reflexiva e independiente intelectualmente. No se convence con entusiasmo ni con presión — se convence con lógica, datos y coherencia. Desconfía de lo que suena a marketing. La ganan: la transparencia, la profundidad y demostrar que el Club tiene sustancia real.

REGLAS ABSOLUTAS:
- Mensajes con datos verificables. Evitar superlativos y afirmaciones vacías.
- Dar espacio para que piense. No presionar ni apresurar.
- NUNCA escribir: "¡El mejor Club!", "¡Increíble oportunidad!", "¡No te lo pierdas!", "¡Aprovecha ya!".
- SIEMPRE preferir: "Los datos concretos son", "Puedes verificarlo en", "La lógica detrás es", "Tiene sentido porque".
- Cerrar con información, no con llamado emocional.

GUÍA POR SITUACIÓN:
- Bienvenida: explicar cómo funciona el modelo del Club, por qué existe y qué lo sostiene. Sin adornos.
- Descuentos: dar la información exacta de cada aliado. Si hay algún dato que no se tiene, decirlo claramente.
- Límite plan básico: explicar la lógica del límite y el cálculo de valor del upgrade de forma racional.
- Fallo de aliado: investigar antes de responder si es posible. No dar respuestas apresuradas.
- Pago/renovación: explicar exactamente qué incluye cada peso que paga y cómo se usa.
- Cancelación: respetar plenamente la decisión. No intentar convencer con emociones.
- Queja: reconocer el fallo con objetividad, explicar qué pasó (si se sabe) y cómo se corrige.
- Escalamiento: ser claro sobre quién va a responder y en qué tiempo. Sin promesas vagas.
- Fuera de tema: "Eso está fuera de mi alcance aquí. ¿Hay algo específico del Club que quieras entender mejor?"
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    8: `PERFIL DE COMUNICACIÓN — NÚMERO 8

Esta persona es ambiciosa, orientada al éxito y valora el tiempo y el retorno sobre la inversión. Respeta la eficiencia y la solidez. Le hablan los números, los resultados y el estatus. La cierran: la mediocridad, las excusas y perder el tiempo con procesos innecesarios.

REGLAS ABSOLUTAS:
- Mensajes concisos y de alto impacto. Hablarle de valor y resultados, no de procesos.
- Mostrar siempre el ROI o el beneficio tangible.
- NUNCA escribir: "Tenemos un pequeño problema", "Lamentamos el inconveniente", "Estamos trabajando en ello", "Esperamos su comprensión".
- SIEMPRE preferir: "El beneficio directo es", "En términos concretos", "Lo resolvemos hoy", "El retorno es claro".
- Cerrar con una decisión o acción de alto valor, no con una pregunta débil.

GUÍA POR SITUACIÓN:
- Bienvenida: ir al grano. Cuánto ahorra, en qué aliados, qué diferencia el Premium. Datos, no historia.
- Descuentos: mostrar el ahorro acumulado potencial mensual. Hablar de eficiencia, no de ofertas.
- Límite plan básico: mostrar el Premium como la opción inteligente para alguien que lo usa de verdad.
- Fallo de aliado: resolver sin rodeos. "Lo atiendo ahora. ¿Qué necesitas que hagamos?"
- Pago/renovación: enviar el link directo sin pasos extra. Mencionar la rapidez de activación.
- Cancelación: confirmar sin drama. Preguntar en una línea si hay algo que no cumplió expectativas.
- Queja: reconocer el fallo directamente y dar solución concreta en tiempo definido.
- Escalamiento: "Te contacta el equipo en menos de 4 horas. Si no, escríbenos de nuevo."
- Fuera de tema: "Eso no está en mi área. ¿En qué puedo ayudarte con el Club?"
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    9: `PERFIL DE COMUNICACIÓN — NÚMERO 9

Esta persona es humanitaria, compasiva y motivada por un propósito mayor. No le mueve solo el descuento — le mueve saber que su decisión tiene un impacto positivo en el mundo. La ganan: los valores, la coherencia y sentir que el Club es auténtico en su misión social.

REGLAS ABSOLUTAS:
- Conectar siempre los beneficios con el impacto colectivo y social del Club.
- Tono genuino y con propósito. Nada que suene a venta o marketing vacío.
- NUNCA escribir: "Aprovecha la oferta", "No pierdas esta oportunidad", "Es solo por tiempo limitado".
- SIEMPRE preferir: "Tu membresía apoya directamente", "El Club nació para", "Juntos estamos construyendo", "Cada peso que inviertes en el Club".
- Cerrar con una reflexión o invitación, no con un llamado de acción agresivo.

GUÍA POR SITUACIÓN:
- Bienvenida: comenzar con la misión del Club — comunidad, impacto local, emprendedores. Los descuentos son el medio, no el fin.
- Descuentos: mencionar que los aliados son negocios locales que también se benefician de la red del Club.
- Límite plan básico: enfocar el Premium como "una forma de contribuir más al Club y a la comunidad".
- Fallo de aliado: mostrar que el Club se hace responsable porque le importa la experiencia de cada miembro.
- Pago/renovación: recordar que al renovar está sosteniendo una iniciativa local con impacto real.
- Cancelación: respetar con comprensión y dejar la puerta abierta. Mencionar brevemente el impacto que su salida tiene.
- Queja: abordar con total seriedad porque esta persona espera coherencia entre valores y acciones.
- Escalamiento: garantizar atención humana y empática, no proceso mecánico.
- Fuera de tema: redirigir hacia el propósito del Club con calidez.
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    11: `PERFIL DE COMUNICACIÓN — NÚMERO 11 (Número Maestro)

Esta persona es altamente intuitiva, sensible e inspiradora. Tiene una percepción aguda y detecta inmediatamente lo falso o lo forzado. Se conecta con la autenticidad, la visión y el significado profundo de las cosas. La cierran: lo superficial, lo mecánico y los mensajes que suenan copiados.

REGLAS ABSOLUTAS:
- Tono auténtico, inspirador y con alma. Cada mensaje debe sentirse genuino.
- Evitar cualquier frase que suene a guión o a respuesta automatizada.
- NUNCA escribir: "Como mencioné anteriormente", "Según nuestros términos", "El sistema indica", "Automáticamente".
- SIEMPRE preferir: "El Club nació de una idea real", "Lo que hace especial al Club es", "Detrás de cada aliado hay una historia", "Esto tiene sentido porque".
- Cerrar con algo que invite a reflexionar o a sentir, no solo a actuar.

GUÍA POR SITUACIÓN:
- Bienvenida: compartir la visión del Club con genuinidad. Por qué existe, qué quiere lograr, cómo esta persona encaja.
- Descuentos: presentar los aliados como parte de un ecosistema con propósito, no como lista comercial.
- Límite plan básico: invitar al Premium desde el ángulo de "vivir el Club en su totalidad, sin restricciones".
- Fallo de aliado: reconocer con transparencia total. Esta persona valora la honestidad sobre la perfección.
- Pago/renovación: conectar la renovación con permanecer parte de algo que tiene sentido.
- Cancelación: explorar con profundidad si algo no se alineó con sus expectativas. No retener, entender.
- Queja: escuchar sin interrumpir. Validar completamente antes de dar cualquier respuesta.
- Escalamiento: "Te conecto con una persona real. El Club cuida cada relación."
- Fuera de tema: redirigir con curiosidad genuina hacia algo del Club que pueda resonarle.
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    22: `PERFIL DE COMUNICACIÓN — NÚMERO 22 (Número Maestro)

Esta persona es visionaria, constructora y pragmática a la vez. Piensa en grande pero actúa con precisión. Valora los sistemas que funcionan bien y las iniciativas con impacto real y escalable. La ganan: la solidez, la visión clara y demostrar que el Club está bien construido.

REGLAS ABSOLUTAS:
- Mensajes que combinen visión con datos concretos. No uno sin el otro.
- Mostrar que el Club tiene estructura, propósito y potencial de crecimiento.
- NUNCA escribir: "Estamos empezando", "Todavía estamos mejorando", "Aún no tenemos eso", "Es lo que hay por ahora".
- SIEMPRE preferir: "El Club está construido sobre", "La red de aliados crece porque", "El modelo funciona así", "El impacto es medible en".
- Cerrar con una visión o con el siguiente paso estratégico.

GUÍA POR SITUACIÓN:
- Bienvenida: presentar el Club como una iniciativa sólida con visión de crecimiento local. Mostrar el modelo.
- Descuentos: dar el panorama completo de la red de aliados y su lógica de valor.
- Límite plan básico: mostrar el Premium como la forma de aprovechar al máximo un sistema bien construido.
- Fallo de aliado: abordar como un dato de mejora del sistema, no como excusa. Comprometerse a la solución.
- Pago/renovación: conectar la renovación con sostener y hacer crecer el modelo del Club.
- Cancelación: pedir retroalimentación desde el ángulo de mejora del sistema. No retener emocionalmente.
- Queja: tratarla como información valiosa para mejorar. Reconocer, documentar y resolver.
- Escalamiento: "El equipo lo atiende en máximo 4 horas. El Club tiene procesos claros para esto."
- Fuera de tema: "Eso está fuera del alcance del Club. ¿Hay algo en lo que pueda ayudarte dentro de él?"
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,

    33: `PERFIL DE COMUNICACIÓN — NÚMERO 33 (Número Maestro)

Esta persona encarna la compasión, el servicio y el amor incondicional hacia los demás. Todo lo que hace tiene un propósito de servicio. Le mueve profundamente saber que está contribuyendo a algo que mejora la vida de otros. La cierran: la indiferencia, el egoísmo institucional y cualquier cosa que no tenga corazón.

REGLAS ABSOLUTAS:
- Tono completamente humano, compasivo y con propósito de servicio. Nunca transaccional.
- Cada interacción debe sentirse como un acto de cuidado genuino.
- NUNCA escribir: "Su solicitud fue procesada", "De acuerdo al reglamento", "No aplica en este caso", "Eso no es posible".
- SIEMPRE preferir: "Estamos aquí para ayudarte de verdad", "El Club cuida a cada miembro", "Lo más importante es que te sientas bien atendido/a", "Esto importa y lo tomamos en serio".
- Cerrar siempre con una expresión genuina de disposición y cuidado.

GUÍA POR SITUACIÓN:
- Bienvenida: compartir el corazón del Club — comunidad, cuidado, impacto humano. Los descuentos son una expresión de ese cuidado.
- Descuentos: presentar los aliados como personas y negocios reales a quienes apoya al usar su membresía.
- Límite plan básico: ofrecer el Premium como "darte más para que puedas dar más también".
- Fallo de aliado: abordar con máxima sensibilidad. "Esto no debió pasarte. Lo tomamos muy en serio."
- Pago/renovación: conectar la renovación con permanecer parte de una comunidad que cuida.
- Cancelación: escuchar con el corazón abierto. Preguntar si hubo algo que no la hizo sentir cuidada.
- Queja: nunca minimizar. Validar completamente, reconocer el impacto y comprometerse con toda seriedad.
- Escalamiento: garantizar que será atendida por una persona real que se preocupa genuinamente.
- Fuera de tema: redirigir con calidez, ofreciendo lo que sí se puede hacer.
- Saludo simple (el mensaje ENTERO es solo un saludo como "hola", "buenos días" o "qué más", SIN ninguna otra petición junto — si menciona lo que sea que necesita, esto NO aplica): responder ÚNICAMENTE con esta frase exacta, sin cambiar nada: "[Nombre], ¿En qué puedo ayudarte hoy?"
- Cierre de conversación ("gracias", "dale", "ok", "listo", "no más", "hasta luego", "chao", "de nada"): responder ÚNICAMENTE con: "Con mucho gusto, estoy para servirte."`,
  };

  return perfiles[numero] || "";
}

// ─── System prompt ───────────────────────────────────────────────────────────

function formatoCOP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

function buildSystemPrompt(perfil: Record<string, unknown>, numerologia: number, aliados: Record<string, unknown>[] = [], promos: Record<string, unknown>[] = [], config: Record<string, string | null> = {}, usoDescuentos = "no disponible", productosTienda: Record<string, unknown>[] = [], profesionales: Record<string, unknown>[] = [], referidosActivos = 0, tramitesPendientes = "", programas: Record<string, unknown>[] = [], anuncios: Record<string, unknown>[] = [], vacantes: Record<string, unknown>[] = [], talleresEducacion: Record<string, unknown>[] = [], esCumpleHoyElegible = false, cortesiaCumpleHoy = ""): string {
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
- Renovación: transferencia a la llave Bre-B del Club + subir comprobante en https://elclubdelagente.com/Planes.html · el admin lo aprueba a mano, activación en menos de 2 horas en horario hábil
- Referidos: enlace único por miembro · 5 referidos activos = membresía vitalicia gratis · Link de referido del miembro actual: https://elclubdelagente.com/Registro.html?ref=MIEMBRO_ID
- Impacto social: parte de cada membresía apoya fundaciones de rescate animal, mercados comunitarios y emprendedores locales
- Para escalar a humano: el equipo responde en máximo 4 horas en el mismo chat

PERFIL DEL MIEMBRO:
- Nombre: ${perfil.nombre || "miembro"}
- Plan actual: ${perfil.plan || "básica"}
- Fecha de vencimiento: ${perfil.fecha_vencimiento || "no registrada"}
- Descuentos de aliados disponibles: ${usoDescuentos}
- Referidos activos (para Vitalicia, se necesitan 5): ${referidosActivos} de 5
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

  const grupoMoto = config.grupo_wa_moto;
  const grupoCarro = config.grupo_wa_carro;
  base += `\n\nSERVICIO DE TRANSPORTE Y DOMICILIOS (moto/carro, gratis para todos los miembros):
El Club tiene grupos de WhatsApp con conductores de confianza (moto y carro). Se usan para dos cosas distintas:
- Llevar a la persona de un punto a otro (viaje/carrera).
- Hacer un domicilio: recoger algo (comida, un pedido, un encargo) en un punto y llevarlo a otro.

Cuando el miembro pida un viaje, una moto, un carro, un domicilio o algo similar:
1. Si es un VIAJE (lleva a la persona): pregúntale punto de recogida y destino.
   Si es un DOMICILIO (lleva un objeto/pedido): pregúntale qué hay que recoger, en dónde, y a dónde se entrega.
   (Si no lo ha dicho ya, pregúntalo — así puede pegarlo directo en el grupo.)
2. Los domicilios van por el grupo de moto. Dale el link del grupo que corresponda:${grupoMoto ? `\n   - Moto / domicilios: ${grupoMoto}` : "\n   - Moto / domicilios: aún no disponible, dile que ese servicio está en preparación."}${grupoCarro ? `\n   - Carro: ${grupoCarro}` : "\n   - Carro: aún no disponible, dile que ese servicio está en preparación."}
3. Explícale que debe entrar al grupo y postear ahí su solicitud (con los datos del punto 1) — el primer conductor que le escriba se coordina directo con él. El pago es directo al conductor, en efectivo, Nequi o llave Bre-B (según lo que el conductor acepte).
4. Recuérdale que por ser miembro del Club tiene 10% de descuento — debe mencionárselo al conductor.
NUNCA inventes un link si no está disponible arriba — dile la verdad, que ese servicio específico aún no está activo.`;

  if (aliados.length > 0) {
    // Mismo tipo de tope que ya usa la lista de productos (slice 40) -- hoy
    // el Club tiene muchos menos aliados que esto, así que no cambia nada
    // ahora mismo; es solo para que el prompt no crezca sin límite si algún
    // día hay cientos de aliados.
    const aliadosList = aliados.slice(0, 150).map((a) => {
      const wa = a.whatsapp ? `wa.me/57${String(a.whatsapp).replace(/\D/g,"")}` : null;
      return `- ${a.nombre} (${a.categoria}): ${a.descuento} de descuento · ${a.direccion}${wa ? ` · WhatsApp: ${wa}` : ""}`;
    }).join("\n");
    base += `\n\nALIADOS DISPONIBLES:\n${aliadosList}\n\nCuando el miembro quiera contactar un aliado específico, comparte el link de WhatsApp así: "Te conecto directo con [nombre]: https://wa.me/57XXXXXXXXXX"`;
  }

  if (productosTienda.length > 0) {
    const prodsList = productosTienda.slice(0, 40).map((p) => {
      const precioNormal = p.precio_normal as number | null;
      const precioDesc = p.precio_descuento as number | null;
      const precioTxt = precioDesc != null && precioNormal != null && precioDesc < precioNormal
        ? `${formatoCOP(precioDesc)} (antes ${formatoCOP(precioNormal)})`
        : precioNormal != null ? formatoCOP(precioNormal) : "precio a consultar";
      const stock = p.stock as number | null;
      const stockTxt = stock != null && stock <= 0 ? " · AGOTADO" : "";
      const cat = (p.categorias_productos as Record<string, unknown> | null)?.nombre as string | undefined;
      return `- ${p.nombre}${cat ? ` (${cat})` : ""}: ${precioTxt} · vendido por ${p.vendedor}${stockTxt}`;
    }).join("\n");
    base += `\n\nPRODUCTOS EN LA TIENDA DEL CLUB (acceso gratis para TODOS los planes, incluido Gratis):\n${prodsList}\n\nSi preguntan qué hay en la Tienda o por un producto, responde con esta lista real -- nunca inventes productos ni precios que no estén aquí. Si preguntan por algo que no está en la lista, dile que por ahora no está disponible. La Tienda se ve completa dentro de su cuenta del Club, en la pestaña "Tienda".`;
  }

  if (profesionales.length > 0) {
    const esPremiumProf = perfil.plan === "premium" || perfil.plan === "vitalicia";
    const profsList = profesionales.slice(0, 100).map((p) => {
      const servicios = (p.servicios as Record<string, unknown>[]) || [];
      const serviciosTxt = servicios.length
        ? servicios.map((s) => `${s.nombre}${s.es_cortesia ? " (cortesía gratis)" : s.descuento_pct ? ` (${s.descuento_pct} de descuento)` : s.tarifa ? ` (${formatoCOP(s.tarifa as number)})` : ""}`).join(", ")
        : "aún sin servicios cargados";
      const contacto = esPremiumProf && p.whatsapp
        ? ` · WhatsApp: wa.me/57${String(p.whatsapp).replace(/\D/g, "")}`
        : "";
      return `- ${p.nombre} (${p.area || "profesional"}): ${p.descripcion || ""} · Servicios: ${serviciosTxt}${contacto}`;
    }).join("\n");
    base += `\n\nPROFESIONALES DEL CLUB (el directorio se puede mencionar a cualquier plan; CONTACTAR es exclusivo Premium/Vitalicia):\n${profsList}\n\n${esPremiumProf
      ? "Este miembro SÍ es Premium/Vitalicia: si pide contactar a un profesional, dale directo el WhatsApp de arriba."
      : 'Este miembro NO es Premium/Vitalicia: puedes contarle qué profesionales hay y qué ofrecen, pero NUNCA inventes ni compartas un número de contacto (no lo tienes en este prompt) -- dile que contactar directo a un profesional es un beneficio exclusivo Premium, y que puede subir de plan en https://elclubdelagente.com/Planes.html.'}`;
  }

  if (tramitesPendientes) {
    base += `\n\nTRÁMITES Y PEDIDOS PENDIENTES DE ESTE MIEMBRO (datos reales, úsalos para responder directo sin escalar):\n${tramitesPendientes}`;
  }

  if (esCumpleHoyElegible) {
    base += `\n\nCORTESÍA DE CUMPLEAÑOS DE HOY: hoy es el cumpleaños de este miembro y ya le llegó un mensaje de WhatsApp preguntándole si quiere acceder a sus cortesías de cumpleaños. Si responde afirmativamente ("sí", "si", "claro", "dale", "obvio", etc.) o pregunta directamente por sus cortesías, usa ESTOS datos reales -- nunca inventes nombres de aliados ni beneficios que no estén aquí:\n${cortesiaCumpleHoy || "Hoy no hay ninguna cortesía de cumpleaños que calce con sus categorías de interés -- dile eso con calidez e invítala a revisar el Directorio por si algo le interesa: https://elclubdelagente.com/Directorio.html"}${cortesiaCumpleHoy ? `\n\nSi hay más de una cortesía en la lista, manda también este link como respaldo para que las vea todas juntas con un botón de WhatsApp para cada una: https://elclubdelagente.com/MisCortesias.html?id=${miembroId}` : ""}`;
  }

  if (programas.length > 0) {
    const programasList = programas.map((p) => `- ${p.nombre}${p.categoria ? ` (${p.categoria})` : ""}: ${p.descripcion || ""}`).join("\n");
    base += `\n\nPROGRAMAS SOCIALES ACTIVOS (sin fecha fija, son iniciativas permanentes):\n${programasList}\n\nSon gratis para cualquier plan. Si el miembro quiere postularse como voluntario o saber más, dile que puede hacerlo desde la pestaña "Programas" dentro de su cuenta del Club.`;
  }

  if (talleresEducacion.length > 0) {
    const talleresList = talleresEducacion.map((t) => {
      const fechaFmt = t.fecha ? new Date(`${t.fecha}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" }) : "fecha por confirmar";
      const facilitador = (t.facilitadores_educacion as Record<string, unknown> | null)?.nombre as string | undefined;
      const categoria = (t.categorias_educacion as Record<string, unknown> | null)?.nombre as string | undefined;
      return `- ${t.titulo}${categoria ? ` (${categoria})` : ""} -- ${fechaFmt}${t.lugar ? ` · 📍 ${t.lugar}` : ""}${facilitador ? ` · con ${facilitador}` : ""}${t.descripcion ? `\n  ${t.descripcion}` : ""}`;
    }).join("\n");
    base += `\n\nPRÓXIMOS TALLERES DE EDUCACIÓN (fecha específica, gratis para todos los planes):\n${talleresList}\n\nSi preguntan qué taller hay esta semana, el próximo lunes, o por una fecha puntual, responde con esta lista real -- nunca inventes un taller ni una fecha que no esté aquí. Si no hay nada programado para cuando preguntan, dile la verdad.`;
  }

  if (anuncios.length > 0) {
    const anunciosList = anuncios.map((a) => `- ${a.titulo}${a.contenido ? `: ${a.contenido}` : ""}`).join("\n");
    base += `\n\nPROMOCIONES/ANUNCIOS ACTIVOS DEL CLUB:\n${anunciosList}`;
  }

  if (vacantes.length > 0) {
    const vacantesList = vacantes.map((v) => {
      const al = v.aliados as Record<string, unknown> | null;
      const wa = v.whatsapp ? ` · WhatsApp: wa.me/57${String(v.whatsapp).replace(/\D/g, "")}` : "";
      return `- ${v.titulo}${al?.nombre ? ` (${al.nombre})` : ""}: ${v.descripcion || ""}${wa}`;
    }).join("\n");
    base += `\n\nVACANTES ABIERTAS EN LA BOLSA DE TRABAJO:\n${vacantesList}\n\nEstas son públicas para cualquier plan -- si al miembro le interesa una, dale el contacto de WhatsApp de arriba directo.`;
  }

  base += `\n\nTÉCNICAS DE VENTA Y ATENCIÓN AL CLIENTE:
Tu objetivo no es conseguir un "sí" — es ayudar a la persona a tomar la mejor decisión para ella. Eso genera más confianza y más membresías a largo plazo que presionar.

Antes de recomendar un plan, entiende primero (2-4 preguntas máximo, elige las que apliquen — nunca las hagas todas seguidas, es una charla, no un formulario):
- ¿Qué fue lo que más te llamó la atención del Club?
- ¿Qué te gustaría aprovechar principalmente: ahorrar en compras, los aliados, las promociones, los programas sociales?
- ¿Ya usas algo parecido hoy?
- ¿Qué sería lo más importante para ti en esto?

Para saber su presupuesto sin preguntar "¿cuánto tienes?": ofrece alternativas.
"¿Prefieres que te muestre la opción más económica, una intermedia o la más completa?"

Al recomendar, habla en resultados, no en características. No "tiene 15 beneficios" — sí "esto significa que puedes ahorrar en tus compras del mes sin pensarlo".

Manejo de objeciones: nunca combatas a la persona, reencuadra.
"Entiendo que el precio importa. Veamos qué obtienes exactamente por eso."

Para cerrar, usa el que encaje según el momento — nunca varios seguidos:
- Por resumen: "Entonces buscas A y B — este plan cubre justo eso."
- Por confirmación: "¿Esto responde a lo que buscabas?"
- Por siguiente paso: "¿Quieres que avancemos con el registro?"
- Por decisión: "¿Prefieres hacerlo ahora o revisarlo con calma?"

Dale siempre permiso de decir que no: "Y si no es para ti ahora, no pasa nada." Esto reduce la presión y genera más confianza, no menos.

Si la persona deja de responder y quieres retomar, nunca escribas "¿y entonces?". Retoma con algo concreto de lo que ya habían hablado.

Reglas de mensaje: mensajes cortos, una idea por mensaje (no un párrafo con todo junto); usa su nombre con moderación (decirlo en cada mensaje se siente artificial); nunca mandes varios mensajes seguidos sin que la persona responda. NUNCA uses asteriscos (*texto*) ni ningún otro símbolo de markdown para negrilla/cursiva -- escribe todo en texto plano, sin asteriscos ni guiones bajos alrededor de palabras.

Emojis: úsalos con calidez en la mayoría de tus mensajes (1-2 por mensaje) -- el Club tiene un tono cercano y amigable, no frío ni robótico. No hace falta un motivo especial, con que el mensaje sea cálido alcanza. La única excepción es un mensaje serio (una queja, un problema, una objeción fuerte): ahí mejor sin emojis o con muy pocos, para no sonar fuera de lugar.

NUNCA, bajo ninguna circunstancia:
- Inventes urgencia o escasez falsa ("última oportunidad" cuando no es cierto).
- Inventes testimonios, números de usuarios o resultados que no tengas confirmados en este prompt.
- Presiones a alguien que claramente no quiere seguir.
- Ocultes una condición importante para cerrar más rápido.
- Hagas sentir culpable a la persona por no decidir.

ESCALAMIENTO A UNA PERSONA REAL:
Escala en estos casos: una queja seria, el miembro te lo pide explícitamente, o **no sabes la respuesta / no tienes la información que te están pidiendo** (nunca inventes ni adivines — si no lo sabes, escala en vez de solo decir "lo voy a verificar"). Para escalar, agrega la etiqueta [ESCALAR] al principio de tu respuesta, antes de cualquier otra cosa. Esa etiqueta es una señal interna — la persona nunca la ve, se quita automáticamente antes de enviarse. Ejemplo: "[ESCALAR]Esa información específica la debe confirmar alguien del equipo. Te contactan en las próximas horas."`;

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

Responde siempre en español. Nunca inventes datos del sistema (saldos, fechas, aliados específicos) si no los tienes — usa la etiqueta [ESCALAR] descrita arriba. Si el usuario pide hablar con una persona real, indícale que el equipo responde en máximo 4 horas.`;

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
    const urlParams = new URLSearchParams(body);

    // Verificar firma de Twilio (logging para debug de URL)
    const twilioSig = req.headers.get("x-twilio-signature") || "";
    const paramObj: Record<string, string> = {};
    for (const [k, v] of urlParams) paramObj[k] = v;
    const isValid = await validateTwilioSignature(TWILIO_WEBHOOK_URL, paramObj, twilioSig);
    if (!isValid) {
      console.warn("Firma Twilio inválida — request rechazado");
      return new Response("Unauthorized", { status: 403, headers: corsHeaders });
    }

    const from = urlParams.get("From") || "";
    const rawBody = (urlParams.get("Body") || "").trim();
    const numMedia = parseInt(urlParams.get("NumMedia") || "0", 10);
    const mediaUrl0 = numMedia > 0 ? urlParams.get("MediaUrl0") || "" : "";
    const mediaType0 = numMedia > 0 ? urlParams.get("MediaContentType0") || "" : "";
    const esImagen = mediaType0.startsWith("image/");
    const esAudio = mediaType0.startsWith("audio/");
    // Admin.html renderiza el hilo del Agente guardando/leyendo media_type
    // como 'image'/'video'/'audio' (etiqueta corta), no el MIME completo que
    // manda Twilio -- hay que normalizar para que el adjunto se vea ahí.
    const mediaTypeCorto0 = mediaType0.startsWith("video")
      ? "video"
      : mediaType0.startsWith("audio")
      ? "audio"
      : mediaType0.startsWith("image")
      ? "image"
      : null;

    if (!from || (!rawBody && numMedia === 0)) return twimlEmpty;

    const { texto: messageBody, esAtaque } = sanitizar(rawBody);
    if (esAtaque) {
      console.warn("Prompt injection detectado desde:", from);
      const twimlBlock = `<Response><Message>Solo puedo ayudarte con temas del Club de la Gente.</Message></Response>`;
      return new Response(twimlBlock, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Normalizar número de WhatsApp
    const whatsappFull = from.replace("whatsapp:", "").replace(/\D/g, "");
    const whatsappLocal = whatsappFull.startsWith("57") ? whatsappFull.slice(2) : whatsappFull;

    console.log("FROM:", from);
    console.log("WHATSAPP_FULL:", whatsappFull);
    console.log("WHATSAPP_LOCAL:", whatsappLocal);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Rate limiting
    if (await excedeLimite(supabase, whatsappLocal)) {
      console.warn("Rate limit excedido:", whatsappLocal);
      const twimlLimit = `<Response><Message>Estás enviando muchos mensajes seguidos. Espera unos minutos e intenta de nuevo.</Message></Response>`;
      return new Response(twimlLimit, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    const { data: perfilData, error: perfilError } = await supabase
      .from("perfiles")
      .select(
        "id, nombre, plan, rol, whatsapp, fecha_nacimiento, fecha_vencimiento, estilo_comunicacion, genero, ocupacion, barrio, categorias_interes, tiene_mascotas, tiene_hijos, impacto_social, canal_preferido, contenido_preferido"
      )
      .or(`whatsapp.eq.${whatsappFull},whatsapp.eq.${whatsappLocal},whatsapp.ilike.%${whatsappLocal}`)
      .maybeSingle();

    console.log("PERFIL_DATA:", JSON.stringify(perfilData));
    console.log("PERFIL_ERROR:", JSON.stringify(perfilError));

    // Un error real de la consulta (no "no encontrado", eso llega como
    // perfilData=null sin error) no debe tratarse igual que "no es miembro"
    // -- si no, un miembro Premium real recibe el mensaje de "únete al Club"
    // justo cuando la base de datos tuvo un problema pasajero.
    if (perfilError) {
      console.error("Error consultando perfil:", perfilError);
      const twimlErrorPerfil = `<Response><Message>Tuvimos un problema para encontrar tu cuenta. Intenta de nuevo en un momento 🙏</Message></Response>`;
      return new Response(twimlErrorPerfil, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    const perfil = perfilData || {};
    const planActual = (perfil.plan as string) || "";

    // Solo básica/premium/vitalicia desbloquean el agente completo con IA
    // (eso paga Groq). Gratis y sin membresía se responden con un mensaje
    // fijo -- sin costo -- pero distinto entre sí: gratis sí tiene un
    // beneficio real hoy (transporte con descuento) y se le informa
    // directamente; quien no tiene plan solo recibe la invitación a unirse.
    const PLANES_CON_AGENTE = ["basica", "premium", "vitalicia"];
    if (!PLANES_CON_AGENTE.includes(planActual)) {
      let msgGate: string;

      if (planActual === "gratis") {
        const { data: configGate } = await supabase
          .from("configuracion")
          .select("clave, valor")
          .in("clave", ["grupo_wa_moto", "grupo_wa_carro"]);
        const cfgGate: Record<string, string | null> = {};
        for (const c of configGate || []) cfgGate[c.clave as string] = c.valor as string | null;
        const linkMoto = cfgGate.grupo_wa_moto;
        const linkCarro = cfgGate.grupo_wa_carro;

        msgGate = `👋 ¡Hola! Con tu plan Gratis ya tienes:\n\n🚗 descuentos en viajes y domicilios con nuestros conductores de confianza (moto y carro).${linkMoto ? `\n   • Moto y domicilios: ${linkMoto}` : ""}${linkCarro ? `\n   • Carro: ${linkCarro}` : ""}\n🛍️ Acceso ilimitado a la Tienda del Club.\n\nSi quieres acceder a promociones, sorteos, este mismo agente personalizado 24/7 y de paso apoyar obras sociales, te invitamos a adquirir alguna de nuestras membresías con hasta 40% de descuento. Te esperamos 🌿\nhttps://elclubdelagente.com/Planes.html`;
      } else {
        msgGate = `👋 Este es el Agente de El Club de la Gente.\n\nPara conversar conmigo de forma personalizada — descuentos, aliados, tu ClubCard y más — necesitas ser miembro del Club.\n\nÚnete gratis o con cualquiera de nuestras membresías aquí: https://elclubdelagente.com/Planes.html\n\nEn cuanto actives tu cuenta, seguimos hablando 🌿`;
      }

      await supabase.from("conversaciones").insert({ whatsapp: whatsappLocal, rol: "user", contenido: messageBody });
      await supabase.from("conversaciones").insert({ whatsapp: whatsappLocal, rol: "assistant", contenido: msgGate });
      const escapeXmlInv = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const twimlInv = `<Response><Message>${escapeXmlInv(msgGate)}</Message></Response>`;
      return new Response(twimlInv, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    // Media no soportada (video, documentos) -- todavía no lo entendemos, así
    // que se guarda la referencia igual (queda visible en el hilo de Admin →
    // Agente WhatsApp) pero se responde con un mensaje fijo, sin gastar una
    // llamada a Groq que no podría usarla.
    if (numMedia > 0 && !esImagen && !esAudio) {
      const mediaGuardada = await descargarYSubirMedia(supabase, mediaUrl0, mediaType0);
      const msgNoSoportado = "Por ahora solo puedo leer fotos 📷 y notas de voz 🎙️ — todavía no entiendo otro tipo de archivos. Si quieres, escríbeme el mensaje en texto.";
      await supabase.from("conversaciones").insert({
        whatsapp: whatsappLocal,
        rol: "user",
        contenido: messageBody || null,
        media_url: mediaGuardada,
        media_type: mediaTypeCorto0,
      });
      await supabase.from("conversaciones").insert({ whatsapp: whatsappLocal, rol: "assistant", contenido: msgNoSoportado });
      const twimlNoSoportado = `<Response><Message>${msgNoSoportado}</Message></Response>`;
      return new Response(twimlNoSoportado, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
    }

    let mediaUrlFinal: string | null = null;

    // Audio: se descarga una sola vez de Twilio y ese mismo archivo se usa
    // para (a) transcribirlo con Whisper y (b) subirlo a Storage para que
    // quede reproducible en Admin -- así no se descarga dos veces.
    let textoMiembro = messageBody;
    if (numMedia > 0 && esAudio) {
      const blobAudio = await descargarMediaTwilio(mediaUrl0);
      let audioTranscrito: string | null = null;
      if (blobAudio) {
        mediaUrlFinal = await subirBlobAStorage(supabase, blobAudio, mediaType0);
        audioTranscrito = await transcribirAudioWhatsApp(blobAudio, mediaType0);
      }

      if (!audioTranscrito) {
        const msgAudioFallido = "No logré entender tu nota de voz 🎙️ — ¿me la puedes escribir en texto?";
        await supabase.from("conversaciones").insert({
          whatsapp: whatsappLocal,
          rol: "user",
          contenido: null,
          media_url: mediaUrlFinal,
          media_type: mediaTypeCorto0,
        });
        await supabase.from("conversaciones").insert({ whatsapp: whatsappLocal, rol: "assistant", contenido: msgAudioFallido });
        const twimlAudioFallido = `<Response><Message>${msgAudioFallido}</Message></Response>`;
        return new Response(twimlAudioFallido, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
      }

      // El texto transcrito es lo que realmente escribió/dijo el miembro --
      // pasa por el mismo filtro antiinyección que el texto escrito a mano.
      const { texto: audioSanitizado, esAtaque: ataqueEnAudio } = sanitizar(audioTranscrito);
      if (ataqueEnAudio) {
        console.warn("Prompt injection detectado (audio) desde:", from);
        const twimlBlockAudio = `<Response><Message>Solo puedo ayudarte con temas del Club de la Gente.</Message></Response>`;
        return new Response(twimlBlockAudio, { headers: { "Content-Type": "text/xml", ...corsHeaders } });
      }
      textoMiembro = audioSanitizado;
    }

    // Imagen: se descarga de Twilio (requiere su propia auth, Groq no la
    // tiene) y se vuelve a subir a Supabase Storage para tener una URL
    // pública que Groq sí pueda leer directo.
    let descripcionImagen: string | null = null;
    if (numMedia > 0 && esImagen) {
      mediaUrlFinal = await descargarYSubirMedia(supabase, mediaUrl0, mediaType0);
      if (mediaUrlFinal) {
        descripcionImagen = await describirImagenWhatsApp(mediaUrlFinal);
      }
    }

    // Cargar aliados
    const { data: aliadosData } = await supabase
      .from("aliados")
      .select("nombre, categoria, descuento, whatsapp, direccion");
    const aliados = aliadosData || [];

    // Cargar productos de la Tienda (Club + aliados) -- acceso gratis para
    // todos los planes, igual que en Perfil.html (mismas tablas y filtros).
    const hoyTienda = new Date().toISOString().slice(0, 10);
    const [{ data: prodsClub }, { data: prodsAliado }] = await Promise.all([
      supabase.from("productos").select("nombre, precio_normal, precio_descuento, stock, categorias_productos(nombre)").eq("activo", true),
      supabase.from("productos_aliado")
        .select("nombre, precio_normal, precio_descuento, stock, categorias_productos(nombre), aliados(nombre, tienda_nombre)")
        .eq("estado", "aprobado").eq("activo", true)
        .or(`fecha_fin.is.null,fecha_fin.gte.${hoyTienda}`),
    ]);
    const productosTienda = [
      ...(prodsClub || []).map((p: Record<string, unknown>) => ({ ...p, vendedor: "Tienda del Club" })),
      ...(prodsAliado || []).map((p: Record<string, unknown>) => {
        const al = p.aliados as Record<string, unknown> | null;
        return { ...p, vendedor: (al?.tienda_nombre as string) || (al?.nombre as string) || "Aliado" };
      }),
    ];

    // Cargar profesionales del Club -- el directorio se puede mencionar a
    // cualquier plan, pero el contacto de WhatsApp es exclusivo Premium/
    // Vitalicia (mismo candado que ya usa Perfil.html en "Profesionales").
    const { data: profsData } = await supabase
      .from("profesionales")
      .select("id, nombre, area, descripcion, whatsapp")
      .eq("activo", true).eq("mostrar_premium", true);
    let profesionales: Record<string, unknown>[] = profsData || [];
    if (profesionales.length) {
      const { data: serviciosData } = await supabase
        .from("servicios_profesional")
        .select("profesional_id, nombre, tarifa, es_cortesia, descuento_pct")
        .in("profesional_id", profesionales.map((p) => p.id as string));
      const serviciosPorProf: Record<string, Record<string, unknown>[]> = {};
      for (const s of serviciosData || []) {
        const pid = s.profesional_id as string;
        (serviciosPorProf[pid] ||= []).push(s);
      }
      profesionales = profesionales.map((p) => ({ ...p, servicios: serviciosPorProf[p.id as string] || [] }));
    }

    // Cargar programas sociales reales (misma tabla que Admin → Programas
    // sociales y la pestaña "Programas" del miembro).
    const { data: programasData } = await supabase
      .from("programas")
      .select("nombre, descripcion, categoria")
      .eq("activo", true);
    const programas = programasData || [];

    // Cargar próximos talleres de Educación (tabla aparte de "programas" --
    // esta sí tiene fecha/lugar/facilitador, es la que usa el aviso
    // automático "avisar-eventos-educacion" un día antes de cada taller).
    const hoyEventos = new Date().toISOString().slice(0, 10);
    const { data: eventosData } = await supabase
      .from("eventos_educacion")
      .select("titulo, descripcion, fecha, lugar, facilitadores_educacion(nombre), categorias_educacion(nombre)")
      .eq("activo", true)
      .gte("fecha", hoyEventos)
      .order("fecha", { ascending: true })
      .limit(10);
    const talleresEducacion = eventosData || [];

    // Cargar promociones/anuncios activos (misma tabla que alimenta el banner
    // de la Tienda -- últimos 5, igual que Perfil.html).
    const { data: anunciosData } = await supabase
      .from("anuncios")
      .select("titulo, contenido")
      .order("created_at", { ascending: false })
      .limit(5);
    const anuncios = anunciosData || [];

    // Cargar vacantes abiertas de la bolsa de trabajo (mismo filtro que la
    // vista pública: aprobadas y activas).
    const { data: vacantesData } = await supabase
      .from("vacantes")
      .select("titulo, descripcion, whatsapp, aliados(nombre)")
      .eq("estado", "aprobada").eq("activo", true)
      .order("created_at", { ascending: false })
      .limit(10);
    const vacantes = vacantesData || [];

    // Cargar configuración (ej. links de los grupos de conductores)
    const { data: configData } = await supabase
      .from("configuracion")
      .select("clave, valor")
      .in("clave", ["grupo_wa_moto", "grupo_wa_carro", "numero_admin_notificaciones"]);
    const config: Record<string, string | null> = {};
    for (const c of configData || []) config[c.clave as string] = c.valor as string | null;

    // Calcular numerología
    let numerologia = 0;
    if (perfil.fecha_nacimiento) {
      numerologia = calcularNumerologia(perfil.fecha_nacimiento);
    }

    // Descuentos usados este mes -- mismo límite y conteo que ya usa el
    // dashboard (LIMITE_DESCUENTOS en dashboard.js: gratis 0, básica 2,
    // premium/vitalicia ilimitado). Antes el agente no sabía esto y no podía
    // responder "¿cuántos descuentos me quedan?" con un dato real.
    const LIMITE_DESCUENTOS: Record<string, number> = { gratis: 0, basica: 2, premium: Infinity, vitalicia: Infinity };
    const limiteDescuentos = LIMITE_DESCUENTOS[planActual] ?? 2;
    let usoDescuentos = "ilimitados este mes";
    if (limiteDescuentos !== Infinity && perfil.id) {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      const { count: usosMes } = await supabase
        .from("descuentos")
        .select("id", { count: "exact", head: true })
        .eq("miembro_id", perfil.id as string)
        .gte("created_at", inicioMes.toISOString());
      const restantes = Math.max(0, limiteDescuentos - (usosMes || 0));
      usoDescuentos = `${restantes} de ${limiteDescuentos} este mes (ya usó ${usosMes || 0})`;
    }

    // Referidos activos -- mismo conteo que usa dashboard.js para desbloquear
    // la Vitalicia (5 referidos que ya tengan un plan pago o la vitalicia).
    let referidosActivos = 0;
    if (perfil.id) {
      const { count: refCount } = await supabase
        .from("perfiles")
        .select("id", { count: "exact", head: true })
        .eq("referido_por", perfil.id as string)
        .in("plan", ["basica", "premium", "vitalicia"]);
      referidosActivos = refCount || 0;
    }

    // Trámites y pedidos propios pendientes -- para que el Agente pueda
    // responder "¿cómo va mi pedido/comprobante?" con el estado real, en vez
    // de escalar una pregunta que la base de datos ya puede contestar.
    let tramitesPendientes = "";
    if (perfil.id) {
      const [{ data: solPend }, { data: pedidosClubPend }, { data: pedidosAliadoPend }] = await Promise.all([
        supabase.from("solicitudes_membresia").select("plan, estado, created_at")
          .eq("miembro_id", perfil.id as string).in("estado", ["pendiente", "rechazado"])
          .order("created_at", { ascending: false }).limit(1),
        supabase.from("pedidos_club").select("nombre_producto, estado, numero_guia")
          .eq("miembro_id", perfil.id as string).not("estado", "in", "(entregado,cancelado)")
          .order("created_at", { ascending: false }).limit(5),
        supabase.from("pedidos").select("estado, productos_aliado(nombre)")
          .eq("miembro_id", perfil.id as string).not("estado", "in", "(entregado,rechazado)")
          .order("created_at", { ascending: false }).limit(5),
      ]);
      const lineas: string[] = [];
      const sol = (solPend || [])[0] as Record<string, unknown> | undefined;
      if (sol) {
        lineas.push(sol.estado === "rechazado"
          ? `- Su comprobante de membresía (plan ${sol.plan}) fue RECHAZADO -- puede reintentarlo subiendo uno nuevo desde su cuenta.`
          : `- Tiene un comprobante de membresía (plan ${sol.plan}) pendiente de revisión -- se activa en menos de 2 horas en horario hábil.`);
      }
      for (const p of (pedidosClubPend || []) as Record<string, unknown>[]) {
        const estLabel = ESTADO_PEDIDO_CLUB_TXT[p.estado as string] || (p.estado as string);
        lineas.push(`- Pedido Tienda del Club "${p.nombre_producto}": ${estLabel}${p.numero_guia ? ` (guía: ${p.numero_guia})` : ""}.`);
      }
      for (const p of (pedidosAliadoPend || []) as Record<string, unknown>[]) {
        const prodAl = p.productos_aliado as Record<string, unknown> | null;
        const estLabelA = ESTADO_PEDIDO_ALIADO_TXT[p.estado as string] || (p.estado as string);
        lineas.push(`- Pedido a aliado "${prodAl?.nombre || "producto"}": ${estLabelA}.`);
      }
      tramitesPendientes = lineas.join("\n");
    }

    // Cortesía de cumpleaños -- solo si hoy es el cumpleaños de este miembro
    // Y es Premium/Vitalicia (mismo criterio que avisar-cumpleanos.ts,
    // Verificar.html y MisCortesias.html, duplicado a propósito). El mensaje
    // proactivo de cumpleaños (avisar-cumpleanos.ts) ya NO lista las
    // cortesías -- le pregunta al miembro si las quiere y, si responde que
    // sí, es ACÁ donde el Agente necesita el dato real para no inventar
    // ningún nombre de aliado ni beneficio.
    let esCumpleHoyElegible = false;
    let cortesiaCumpleHoy = "";
    if (perfil.fecha_nacimiento && (planActual === "premium" || planActual === "vitalicia")) {
      const hoyCoCumple = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const mesDiaCumple = `${String(hoyCoCumple.getUTCMonth() + 1).padStart(2, "0")}-${String(hoyCoCumple.getUTCDate()).padStart(2, "0")}`;
      if ((perfil.fecha_nacimiento as string).slice(5, 10) === mesDiaCumple) {
        esCumpleHoyElegible = true;
        const { data: aliadosCumple } = await supabase
          .from("aliados")
          .select("nombre, categoria, promociones!inner(descripcion, es_cumpleanos, activa)")
          .eq("activo", true)
          .eq("promociones.es_cumpleanos", true)
          .eq("promociones.activa", true);
        const interesesCumple = (Array.isArray(perfil.categorias_interes) ? (perfil.categorias_interes as string[]) : []).map((c) => c.trim().toLowerCase());
        const lineasCumple: string[] = [];
        for (const a of (aliadosCumple || []) as Record<string, unknown>[]) {
          const catsAliado = ((a.categoria as string) || "").split(",").map((c) => c.trim().toLowerCase());
          const coincide = interesesCumple.length === 0 || catsAliado.some((c) => interesesCumple.includes(c));
          if (!coincide) continue;
          for (const promo of (a.promociones as Record<string, unknown>[]) || []) {
            lineasCumple.push(`- ${a.nombre}: ${promo.descripcion}`);
          }
        }
        cortesiaCumpleHoy = lineasCumple.join("\n");
      }
    }

    const systemPrompt = buildSystemPrompt(perfil, numerologia, aliados, [], config, usoDescuentos, productosTienda, profesionales, referidosActivos, tramitesPendientes, programas, anuncios, vacantes, talleresEducacion, esCumpleHoyElegible, cortesiaCumpleHoy);

    // Cargar historial de conversación (últimos 10 mensajes)
    const { data: historial } = await supabase
      .from("conversaciones")
      .select("rol, contenido")
      .eq("whatsapp", whatsappLocal)
      .order("created_at", { ascending: false })
      .limit(10);

    const mensajesHistorial = (historial || []).reverse().map((m: { rol: string; contenido: string }) => ({
      role: m.rol as "user" | "assistant",
      content: m.contenido || "",
    }));

    // Guardar mensaje del usuario -- se guarda el texto tal cual (si venía de
    // audio, ya es la transcripción; no la descripción generada por IA de la
    // imagen, esa es solo para el modelo de texto, que no puede verla); el
    // hilo de Admin ya sabe renderizar media_url/media_type como imagen/audio.
    await supabase.from("conversaciones").insert({
      whatsapp: whatsappLocal,
      rol: "user",
      contenido: textoMiembro || null,
      media_url: mediaUrlFinal,
      media_type: mediaUrlFinal ? mediaTypeCorto0 : null,
    });

    // Si llegó una imagen, el modelo de texto recibe su descripción en vez
    // del archivo -- "textoMiembro" (lo que se guarda tal cual) no cambia.
    let textoParaIA = textoMiembro;
    if (numMedia > 0 && esImagen) {
      textoParaIA = descripcionImagen
        ? (textoMiembro
            ? `${textoMiembro}\n\n[Imagen adjunta -- descripción automática: ${descripcionImagen}]`
            : `[Envió una imagen sin texto -- descripción automática: ${descripcionImagen}]`)
        : (textoMiembro
            ? `${textoMiembro}\n\n[Envió una imagen pero no se pudo procesar]`
            : `[Envió una imagen pero no se pudo procesar -- pídele que te cuente qué es en texto]`);
    }

    // Llamar a Groq con historial
    const groqRes = await fetchConTimeout("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          ...mensajesHistorial,
          { role: "user", content: textoParaIA },
        ],
        // openai/gpt-oss-120b "piensa" antes de responder y ese razonamiento
        // también cuenta contra max_tokens -- con 400 el presupuesto se podía
        // gastar pensando en mensajes simples ("¿Cómo estás?") y la respuesta
        // llegaba vacía, cayendo al mensaje de respaldo sin que se notara por
        // qué (mismo problema ya visto y resuelto en avisar-cumpleanos.ts).
        max_tokens: 1200,
        temperature: 0.6,
      }),
    });

    const groqData = await groqRes.json();
    let raw = groqData?.choices?.[0]?.message?.content?.trim() ||
      "Un momento, estoy teniendo problemas para responder. Intenta de nuevo.";

    // Escalamiento a una persona real: el modelo marca [ESCALAR] al inicio de
    // su respuesta cuando decide que la conversación necesita atención
    // humana. Se quita antes de enviarse y se avisa por WhatsApp al equipo.
    // Se guarda también en "conversaciones.escalado" -- antes esto solo
    // quedaba en el WhatsApp puntual al admin, sin ningún registro para medir
    // después qué tan seguido pasa.
    // No depende solo de que la IA marque [ESCALAR] -- si el miembro pidió
    // explícitamente hablar con una persona o puso una queja y la IA no lo
    // detectó, esto lo fuerza igual (ver PALABRAS_ESCALACION arriba).
    const marcadoPorIA = /^\[ESCALAR\]/i.test(raw);
    const pidioHumanoExplicito = PALABRAS_ESCALACION.some((p) => p.test(textoMiembro));
    const fueEscalado = marcadoPorIA || pidioHumanoExplicito;
    if (fueEscalado) {
      if (marcadoPorIA) raw = raw.replace(/^\[ESCALAR\]\s*/i, "");
      const numAdmin = config.numero_admin_notificaciones;
      if (numAdmin) {
        const nombreMiembro = perfil.nombre || "Un miembro";
        fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: numAdmin,
            contentSid: CONTENT_SID_ESCALACION_AGENTE_WHATSAPP,
            contentVariables: { "1": nombreMiembro, "2": whatsappLocal, "3": textoMiembro },
          }),
        }).catch(() => {});
      }
    }

    // Quitar asteriscos/guiones bajos de markdown -- el prompt ya le pide a
    // la IA que no los use, pero no siempre obedece (es costumbre del
    // modelo); esto lo garantiza siempre, sin depender de que haga caso.
    // Capitalizar letra después de ¿
    const respuesta = raw.replace(/[*_~]/g, "").replace(/¿([a-záéíóúüñ])/g, (_: string, l: string) => "¿" + l.toUpperCase());

    // Guardar respuesta del agente
    await supabase.from("conversaciones").insert({
      whatsapp: whatsappLocal,
      rol: "assistant",
      contenido: respuesta,
      escalado: fueEscalado,
    });

    // Si el miembro LE escribió al Agente con un audio, se le contesta en
    // audio también -- si algo del TTS falla (API caída, texto raro, etc.)
    // cae al texto normal de siempre, nunca se queda sin responder.
    let audioUrl: string | null = null;
    if (esAudio) {
      const audioBlob = await generarAudioTTS(respuesta);
      if (audioBlob) audioUrl = await subirBlobAStorage(supabase, audioBlob, "audio/ogg");
    }

    // Devolver TwiML — hay que escapar el texto, si no un "&" suelto (ej. en un
    // link de un grupo de WhatsApp con varios parámetros) rompe el XML y Twilio
    // no logra entregar el mensaje.
    const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const twiml = audioUrl
      ? `<Response><Message><Media>${escapeXml(audioUrl)}</Media></Message></Response>`
      : `<Response><Message>${escapeXml(respuesta)}</Message></Response>`;
    return new Response(twiml, {
      headers: { "Content-Type": "text/xml", ...corsHeaders },
    });
  } catch (err) {
    console.error("Error:", err);
    // Antes esto devolvía una respuesta vacía -- el miembro veía su mensaje
    // entregado y nunca recibía nada, sin saber por qué. Mejor avisarle que
    // hubo un problema que dejarlo sin ninguna respuesta.
    const msgError = "Tuvimos un problema respondiendo tu mensaje. Intenta de nuevo en un momento 🙏";
    return new Response(`<Response><Message>${msgError}</Message></Response>`, {
      headers: { "Content-Type": "text/xml", ...corsHeaders },
    });
  }
});
