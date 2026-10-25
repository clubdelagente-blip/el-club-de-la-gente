// eliminar-miembro — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se verifica a mano que sea un admin real)
// Borra un miembro por completo desde Admin → Miembros: su perfil, su cuenta
// de acceso (Authentication) y todo lo relacionado (solicitudes, pagos,
// reseñas, confirmaciones de eventos, etc. -- esas tablas ya tienen
// ON DELETE CASCADE hacia perfiles, así que se limpian solas).
//
// La única relación que NO tiene cascade es perfiles.referido_por (un
// miembro puede ser el referidor de otros) -- si no se limpia antes, el
// DELETE de perfiles falla con un error de llave foránea. Por eso primero
// se desvincula a quienes refirió, y recién después se borra su perfil y
// su cuenta de Authentication.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });
  }

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });
  }

  const { miembro_id } = await req.json().catch(() => ({}));
  if (!miembro_id) {
    return new Response(JSON.stringify({ error: "miembro_id requerido" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: perfilLlamador } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (perfilLlamador?.rol !== "admin") {
    return new Response(JSON.stringify({ error: "No tienes permisos de administrador" }), { status: 403, headers: corsHeaders });
  }

  const { data: miembro, error: miembroErr } = await supabase
    .from("perfiles")
    .select("id, nombre, whatsapp")
    .eq("id", miembro_id)
    .maybeSingle();
  if (miembroErr || !miembro) {
    return new Response(JSON.stringify({ error: "Miembro no encontrado" }), { status: 404, headers: corsHeaders });
  }

  // Desvincular a quienes refirió -- único FK hacia perfiles sin cascade.
  const { error: referidosErr } = await supabase
    .from("perfiles")
    .update({ referido_por: null })
    .eq("referido_por", miembro_id);
  if (referidosErr) {
    console.error("Error desvinculando referidos:", referidosErr);
    return new Response(JSON.stringify({ error: referidosErr.message }), { status: 500, headers: corsHeaders });
  }

  const { error: deleteErr } = await supabase.from("perfiles").delete().eq("id", miembro_id);
  if (deleteErr) {
    console.error("Error borrando perfil:", deleteErr);
    return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500, headers: corsHeaders });
  }

  // Borra también la cuenta de acceso (Authentication) para que no pueda
  // volver a entrar -- si falla, el perfil ya quedó borrado de todas formas,
  // así que solo se registra el error, no se bloquea la respuesta.
  const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(miembro_id);
  if (authDeleteErr) {
    console.error("Error borrando cuenta de Authentication:", authDeleteErr);
  }

  console.log(`Miembro eliminado: ${miembro.nombre} (${miembro_id}) por admin ${userData.user.id}`);

  return new Response(JSON.stringify({ ok: true, nombre: miembro.nombre }), { status: 200, headers: corsHeaders });
});
