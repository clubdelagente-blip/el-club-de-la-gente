// entrar-como-negocio — ContaClub
// Supabase Edge Function · JWT: OFF (se verifica a mano que sea un admin real)
// Genera un link de acceso de un solo uso para "entrar como" un negocio de
// ContaClub (soporte/control), sin tocar su contraseña ni su sesión actual.
//
// El link, al abrirse, autentica esa pestaña como el negocio. Como Supabase
// guarda la sesión en localStorage (compartido entre pestañas del MISMO
// navegador), abrirlo en una pestaña normal junto a la del Admin
// reemplazaría también la sesión del Admin ahí -- por eso el panel le pide
// abrirlo en una ventana de incógnito/privada, que tiene su propio
// almacenamiento aislado. Así quedan las dos sesiones en paralelo, cada
// una en su propia ventana, sin pisarse.

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

  const { negocio_user_id } = await req.json().catch(() => ({}));
  if (!negocio_user_id) {
    return new Response(JSON.stringify({ error: "negocio_user_id requerido" }), { status: 400, headers: corsHeaders });
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

  // Blindaje extra: solo negocios de ContaClub, nunca un miembro cualquiera
  // del Club -- esto no es para "entrar como" cualquier usuario del sistema.
  const { data: negocio } = await supabase
    .from("aliados")
    .select("id, nombre, contaclub_standalone")
    .eq("user_id", negocio_user_id)
    .maybeSingle();
  if (!negocio?.contaclub_standalone) {
    return new Response(JSON.stringify({ error: "Ese usuario no es un negocio de ContaClub" }), { status: 403, headers: corsHeaders });
  }

  const { data: usuarioObjetivo, error: userTargetErr } = await supabase.auth.admin.getUserById(negocio_user_id);
  if (userTargetErr || !usuarioObjetivo?.user?.email) {
    return new Response(JSON.stringify({ error: "No encontramos la cuenta de ese negocio" }), { status: 404, headers: corsHeaders });
  }

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: usuarioObjetivo.user.email,
    options: { redirectTo: "https://contaclub.online/dashboard.html" },
  });
  if (linkErr || !linkData) {
    return new Response(JSON.stringify({ error: linkErr?.message || "No se pudo generar el link" }), { status: 500, headers: corsHeaders });
  }

  console.log(`Link de acceso a "${negocio.nombre}" (${negocio_user_id}) generado por admin ${userData.user.id}`);

  return new Response(JSON.stringify({ ok: true, link: linkData.properties?.action_link, nombre: negocio.nombre }), { status: 200, headers: corsHeaders });
});
