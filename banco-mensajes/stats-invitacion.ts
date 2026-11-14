// stats-invitacion — El Club de la Gente
// Supabase Edge Function · JWT: OFF (la llama Invitacion.html, sin sesión)
//
// Junta en una sola llamada los datos REALES que necesita la landing de
// invitación para generar FOMO legítimo (sin inventar nada). Todos los
// números son ACUMULADOS desde que existe el Club (no "esta semana") a
// propósito -- un número que solo crece siempre se ve bien, mientras que
// uno que se reinicia cada semana puede salir chiquito o en cero en una
// semana floja y jugar en contra:
// - Cuántos miembros hay en total.
// - Cuántos descuentos se han usado en total.
// - Cuánto han ahorrado los miembros en total (suma real, en pesos).
// - Si llega un "ref" (el miembro_id de quien compartió el link), su
//   nombre y cuántos referidos activos ya tiene (de 5, para la Vitalicia).
// - Reseñas reales de aliados, con buena calificación y comentario.
//
// Usa la llave de servicio porque "perfiles" tiene datos privados
// (WhatsApp, etc.) que NUNCA deben quedar expuestos a un visitante sin
// cuenta -- esta función solo devuelve los pocos campos públicos que
// necesita cada pieza (nombre, conteos), nunca filas completas.
//
// POST { ref?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const { ref } = await req.json().catch(() => ({}));
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const [
    { count: totalMiembros },
    { count: totalDescuentos },
    { data: ahorroRaw },
    { data: resenasRaw },
  ] = await Promise.all([
    supabase.from("perfiles").select("id", { count: "exact", head: true }).eq("rol", "miembro"),
    supabase.from("descuentos").select("id", { count: "exact", head: true }),
    // Suma total acumulada (nunca por semana) de lo que han ahorrado los
    // miembros -- el agregado .sum() de PostgREST evita traer cada fila
    // de "descuentos" solo para sumarlas a mano acá.
    supabase.from("descuentos").select("ahorro.sum()"),
    supabase.from("aliados_resenas")
      .select("estrellas, comentario, aliados(nombre, imagen_url), perfiles(nombre)")
      .gte("estrellas", 4)
      .not("comentario", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const totalAhorro = Array.isArray(ahorroRaw) && ahorroRaw[0]
    ? Number((ahorroRaw[0] as { sum: number | null }).sum) || 0
    : 0;

  const resenas = (resenasRaw || [])
    .filter((r: { comentario: string | null }) => (r.comentario || "").trim().length > 0)
    .slice(0, 10)
    .map((r: { estrellas: number; comentario: string; aliados: { nombre: string; imagen_url: string | null } | null; perfiles: { nombre: string } | null }) => ({
      estrellas: r.estrellas,
      comentario: r.comentario,
      aliado: r.aliados?.nombre || null,
      aliadoLogo: r.aliados?.imagen_url || null,
      miembro: r.perfiles?.nombre ? String(r.perfiles.nombre).split(" ")[0] : "Un miembro del Club",
    }));

  let referidor: { nombre: string; referidos: number } | null = null;
  if (ref) {
    const [{ data: perfilRef }, { count: countRef }] = await Promise.all([
      supabase.from("perfiles").select("nombre").eq("id", ref).maybeSingle(),
      supabase.from("perfiles").select("id", { count: "exact", head: true }).eq("referido_por", ref).in("plan", ["basica", "premium", "vitalicia"]),
    ]);
    if (perfilRef?.nombre) {
      referidor = { nombre: String(perfilRef.nombre).split(" ")[0], referidos: Math.min(countRef || 0, 5) };
    }
  }

  return new Response(JSON.stringify({
    totalMiembros: totalMiembros || 0,
    totalDescuentos: totalDescuentos || 0,
    totalAhorro,
    resenas,
    referidor,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
