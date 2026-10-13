// verificar-foto-perfil — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se llama sola desde el navegador justo
// después de que un miembro sube/cambia su foto de perfil, sin sesión de
// admin)
//
// La foto de perfil no la ve nadie más que el propio dueño y el admin (no
// aparece en el Directorio, la Tienda ni las reseñas), así que a diferencia
// de las fotos públicas NO se deja "pendiente" esperando aprobación -- se
// muestra de inmediato como siempre. Esta función la revisa después con un
// modelo de visión (Groq) y, SOLO si detecta contenido obsceno con
// confianza razonable, la borra sola y le avisa al miembro para que suba
// otra. Si todo está bien, no hace nada.
//
// POST { miembro_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

const MODELO_VISION = "qwen/qwen3.8-27b";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const { miembro_id } = await req.json().catch(() => ({}));
  if (!miembro_id) {
    return new Response(JSON.stringify({ error: "miembro_id requerido" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, whatsapp, foto_url")
    .eq("id", miembro_id)
    .maybeSingle();

  if (!perfil || !perfil.foto_url) {
    return new Response("Nada que verificar", { status: 200, headers: corsHeaders });
  }

  const fotoAlMomentoDeAnalizar = perfil.foto_url;

  let analisis: {
    es_foto_valida: boolean;
    contenido_inapropiado: boolean;
    confianza: "alta" | "media" | "baja";
    razon: string | null;
  };

  try {
    const prompt = `Eres un moderador de contenido para las fotos de perfil de los miembros de un club de membresías. Analiza la foto y responde SOLO un JSON con esta forma exacta, sin texto adicional ni explicaciones:
{"es_foto_valida": boolean, "contenido_inapropiado": boolean, "confianza": "alta"|"media"|"baja", "razon": string|null}

"es_foto_valida": true si la imagen se puede ver con claridad.
"contenido_inapropiado": true si la imagen tiene CUALQUIER contenido ofensivo, violento, sexual/desnudez, odio, o que claramente no debería ser la foto de perfil de alguien. Una foto de perfil normal (una persona, una mascota, un paisaje, un logo, etc.) es "false" aunque no sea un rostro.
"confianza": "alta" solo si no tienes ninguna duda. Si algo no es claro, usa "baja" o "media".
"razon": una frase corta en español explicando tu decisión (o null si todo está bien).`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODELO_VISION,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: perfil.foto_url } },
          ],
        }],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) throw new Error(`Groq respondió ${groqRes.status}: ${await groqRes.text()}`);
    const groqJson = await groqRes.json();
    analisis = JSON.parse(groqJson.choices[0].message.content);
  } catch (e) {
    console.error("Error analizando foto de perfil con IA:", e);
    await supabase.from("perfiles").update({ foto_verificacion_ia: { motivo: "error_analisis", error: String(e) } }).eq("id", miembro_id);
    return new Response("No se pudo analizar", { status: 200, headers: corsHeaders });
  }

  await supabase.from("perfiles").update({ foto_verificacion_ia: analisis }).eq("id", miembro_id);

  // No actuar si no hay contenido inapropiado, o si la confianza es muy baja
  // (evita falsos positivos borrando fotos normales por una duda mínima de
  // la IA) -- "media" sí alcanza para actuar, porque acá el objetivo es
  // limpiar lo obsceno, no exigir certeza absoluta como en una aprobación.
  if (analisis.contenido_inapropiado !== true || analisis.confianza === "baja") {
    return new Response(JSON.stringify({ ok: true, borrada: false, analisis }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Revisar que la foto no haya cambiado mientras se analizaba (el miembro
  // pudo haber subido otra justo después) -- si cambió, no tocar la nueva.
  const { data: perfilAhora } = await supabase.from("perfiles").select("foto_url").eq("id", miembro_id).maybeSingle();
  if (perfilAhora?.foto_url !== fotoAlMomentoDeAnalizar) {
    return new Response("La foto ya había cambiado, no se tocó", { status: 200, headers: corsHeaders });
  }

  const { error: updErr } = await supabase.from("perfiles").update({ foto_url: null }).eq("id", miembro_id);
  if (updErr) {
    console.error("Error borrando foto de perfil:", updErr);
    return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: corsHeaders });
  }

  await supabase.from("notificaciones_miembro").insert({
    miembro_id,
    titulo: "Quitamos tu foto de perfil",
    cuerpo: "Tu foto de perfil no cumplía con las normas de la comunidad, así que la quitamos. Puedes subir una nueva cuando quieras desde Configuración.",
  });

  if (perfil.whatsapp) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: perfil.whatsapp,
          body: `Hola ${(perfil.nombre || "").split(" ")[0] || ""}, quitamos tu foto de perfil del Club porque no cumplía con las normas de la comunidad. Puedes subir una nueva cuando quieras desde tu perfil en la app.\n\nEl Club de la Gente`,
        }),
      });
    } catch (e) {
      console.error("Error avisando por WhatsApp:", e);
    }
  }

  console.log(`Foto de perfil de ${miembro_id} borrada por IA:`, JSON.stringify(analisis));
  return new Response(JSON.stringify({ ok: true, borrada: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
