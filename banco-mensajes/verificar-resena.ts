// verificar-resena — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se llama sola desde el navegador justo
// después de que un miembro deja una reseña con foto de un producto, sin
// sesión de admin)
//
// Las reseñas de producto se publican de inmediato -- SALVO que traigan
// foto: ahí quedan "pendiente" hasta que esta función (o el admin a mano)
// las revise. Un modelo de visión (Groq) analiza la foto y SOLO la publica
// sola si no tiene ningún contenido inapropiado y el modelo tiene confianza
// alta. Cualquier duda la deja pendiente para que el admin la revise a
// mano -- el objetivo es bloquear contenido obsceno, no exigir que la foto
// sea "perfecta" o que coincida con nada en particular.
//
// POST { resena_id }

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

  const { resena_id } = await req.json().catch(() => ({}));
  if (!resena_id) {
    return new Response(JSON.stringify({ error: "resena_id requerido" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: resena } = await supabase
    .from("resenas_producto")
    .select("id, foto_url, estado")
    .eq("id", resena_id)
    .maybeSingle();

  if (!resena || resena.estado !== "pendiente" || !resena.foto_url) {
    return new Response("Nada que verificar", { status: 200, headers: corsHeaders });
  }

  let analisis: {
    es_foto_valida: boolean;
    contenido_inapropiado: boolean;
    confianza: "alta" | "media" | "baja";
    razon: string | null;
  };

  try {
    const prompt = `Eres un moderador de contenido para las reseñas de productos de un club de membresías. Analiza la foto y responde SOLO un JSON con esta forma exacta, sin texto adicional ni explicaciones:
{"es_foto_valida": boolean, "contenido_inapropiado": boolean, "confianza": "alta"|"media"|"baja", "razon": string|null}

"es_foto_valida": true si la imagen se puede ver con claridad (no está rota, en blanco, o es irreconocible).
"contenido_inapropiado": true si la imagen tiene CUALQUIER contenido ofensivo, violento, sexual/desnudez, odio, o que claramente no debería estar en una reseña de producto familiar. No se exige que la foto sea del producto exacto -- solo que no sea contenido obsceno.
"confianza": "alta" solo si no tienes ninguna duda sobre los dos campos anteriores. Si algo no es claro, usa "baja" o "media".
"razon": una frase corta en español explicando tu decisión (o null si todo está perfecto).`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODELO_VISION,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: resena.foto_url } },
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
    console.error("Error analizando reseña con IA:", e);
    await supabase.from("resenas_producto")
      .update({ verificacion_ia: { motivo: "error_analisis", error: String(e) } })
      .eq("id", resena.id);
    return new Response("No se pudo analizar, queda para revisión manual", { status: 200, headers: corsHeaders });
  }

  await supabase.from("resenas_producto").update({ verificacion_ia: analisis }).eq("id", resena.id);

  const aprobarSolo = analisis.es_foto_valida === true
    && analisis.contenido_inapropiado === false
    && analisis.confianza === "alta";

  if (!aprobarSolo) {
    console.log(`Reseña ${resena_id} NO se auto-publica:`, JSON.stringify(analisis));
    return new Response(JSON.stringify({ ok: true, aprobado: false, analisis }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { error: estadoErr } = await supabase
    .from("resenas_producto")
    .update({ estado: "aprobado", aprobado_por: "ia_automatica" })
    .eq("id", resena.id);
  if (estadoErr) {
    console.error("Error publicando reseña (auto-IA):", estadoErr);
    return new Response(JSON.stringify({ error: estadoErr.message }), { status: 500, headers: corsHeaders });
  }

  console.log(`Reseña ${resena_id} auto-publicada por IA`);
  return new Response(JSON.stringify({ ok: true, aprobado: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
