// verificar-producto — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se llama sola desde el navegador justo
// después de que un aliado agrega o edita un producto de su tienda, sin
// sesión de admin)
//
// Lee la foto principal del producto con un modelo de visión (Groq) y, SOLO
// si todo cuadra -- es claramente una foto real de un producto (no una
// pantalla en blanco, no una captura de texto), coincide con el
// nombre/categoría que puso el aliado, no tiene contenido inapropiado, Y el
// modelo reporta confianza alta -- publica el producto solo (mismo
// procedimiento que el botón "Aprobar" de Admin → Tienda del Club). Si falta
// cualquiera de esas condiciones, o el análisis falla por cualquier razón,
// NO HACE NADA: el producto queda "pendiente" para revisión manual del
// admin, exactamente igual que hoy.
//
// Esto es una capa de ayuda, no un reemplazo de la revisión humana: no puede
// confirmar que el precio o el stock sean reales, ni que la foto sea propia
// del aliado y no una imagen bajada de internet -- solo filtra los casos
// obvios (foto que no corresponde, contenido inapropiado, imagen rota) para
// que el admin revise a mano únicamente los casos dudosos.
//
// POST { producto_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

// Modelo de visión de Groq. Groq ha cambiado su catálogo de modelos de
// visión varias veces (ver verificar-comprobante.ts para otro ejemplo de
// esto en este mismo proyecto) -- si este deja de funcionar, hay que revisar
// console.groq.com/docs/vision para ver qué modelo está disponible y
// reemplazar este nombre.
const MODELO_VISION = "qwen/qwen3.8-27b";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const { producto_id } = await req.json().catch(() => ({}));
  if (!producto_id) {
    return new Response(JSON.stringify({ error: "producto_id requerido" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: producto } = await supabase
    .from("productos_aliado")
    .select("id, nombre, descripcion, imagen_url, estado, categoria_id, categorias_productos(nombre)")
    .eq("id", producto_id)
    .maybeSingle();

  if (!producto || producto.estado !== "pendiente" || !producto.imagen_url) {
    return new Response("Nada que verificar", { status: 200, headers: corsHeaders });
  }

  const categoriaNombre = (producto as unknown as { categorias_productos?: { nombre?: string } }).categorias_productos?.nombre || "";

  let analisis: {
    es_foto_de_producto: boolean;
    coincide_con_nombre: boolean;
    contenido_inapropiado: boolean;
    confianza: "alta" | "media" | "baja";
    razon: string | null;
  };

  try {
    const prompt = `Eres un moderador de contenido para la tienda de aliados de un club de membresías. Analiza la foto de un producto y responde SOLO un JSON con esta forma exacta, sin texto adicional ni explicaciones:
{"es_foto_de_producto": boolean, "coincide_con_nombre": boolean, "contenido_inapropiado": boolean, "confianza": "alta"|"media"|"baja", "razon": string|null}

El producto fue publicado como: nombre "${producto.nombre}"${categoriaNombre ? `, categoría "${categoriaNombre}"` : ""}${producto.descripcion ? `, descripción "${producto.descripcion}"` : ""}.

"es_foto_de_producto": true solo si la imagen muestra claramente un producto o servicio real (no una pantalla en blanco, no solo texto, no una imagen rota o irreconocible).
"coincide_con_nombre": true solo si lo que se ve en la foto es razonablemente lo mismo que describe el nombre/categoría/descripción de arriba.
"contenido_inapropiado": true si la imagen tiene cualquier contenido ofensivo, violento, sexual, o que claramente no debería estar en una tienda familiar.
"confianza": "alta" solo si no tienes ninguna duda sobre los tres campos anteriores. Si algo no es claro, usa "baja" o "media".
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
            { type: "image_url", image_url: { url: producto.imagen_url } },
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
    console.error("Error analizando producto con IA:", e);
    await supabase.from("productos_aliado")
      .update({ verificacion_ia: { motivo: "error_analisis", error: String(e) } })
      .eq("id", producto.id);
    return new Response("No se pudo analizar, queda para revisión manual", { status: 200, headers: corsHeaders });
  }

  // Se guarda siempre el análisis, haya quedado aprobado o no -- transparencia
  // para el admin de por qué la IA decidió lo que decidió.
  await supabase.from("productos_aliado").update({ verificacion_ia: analisis }).eq("id", producto.id);

  const aprobarSolo = analisis.es_foto_de_producto === true
    && analisis.coincide_con_nombre === true
    && analisis.contenido_inapropiado === false
    && analisis.confianza === "alta";

  if (!aprobarSolo) {
    console.log(`Producto ${producto_id} NO se auto-aprueba:`, JSON.stringify(analisis));
    return new Response(JSON.stringify({ ok: true, aprobado: false, analisis }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { error: estadoErr } = await supabase
    .from("productos_aliado")
    .update({ estado: "aprobado", aprobado_por: "ia_automatica" })
    .eq("id", producto.id);
  if (estadoErr) {
    console.error("Error aprobando producto (auto-IA):", estadoErr);
    return new Response(JSON.stringify({ error: estadoErr.message }), { status: 500, headers: corsHeaders });
  }

  console.log(`Producto ${producto_id} auto-aprobado por IA`);
  return new Response(JSON.stringify({ ok: true, aprobado: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
