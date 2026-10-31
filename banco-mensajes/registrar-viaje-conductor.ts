// registrar-viaje-conductor — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se llama sola desde Verificar.html --
// el conductor no inicia sesión, solo escribe su WhatsApp, decisión ya
// tomada antes a propósito: ver memoria "ecosistema conductores Uber")
//
// Antes, Verificar.html insertaba DIRECTO en "viajes_conductor" desde el
// navegador con la llave pública (anon) de Supabase -- el navegador buscaba
// el conductor por WhatsApp solo para mostrar el mensaje de error, pero
// nada impedía que alguien, abriendo la consola, llamara el insert con
// cualquier conductor_id o miembro_id inventado. Ahora el navegador solo
// manda el WhatsApp (no el id) y ESTA función, con la llave de servicio,
// es la única que resuelve el conductor real y hace el insert.
//
// POST { whatsapp, miembro_id, tipo, monto }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TIPOS_VALIDOS = ["carro", "moto", "domicilio"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Mismo normalizado que ya usaba Verificar.html en el navegador (y que usa
// auth.js para el login de miembros): quita todo lo que no sea dígito y
// pela el "57" duplicado al inicio si quedó de más.
function normalizarWhatsapp(s: string): string {
  let v = (s || "").replace(/\D/g, "");
  while (v.length > 10 && v.startsWith("57")) v = v.slice(2);
  return v;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const { whatsapp, miembro_id, tipo, monto } = await req.json().catch(() => ({}));

  const wa = normalizarWhatsapp(whatsapp || "");
  const montoNum = Number(monto);

  if (wa.length < 7 || !miembro_id || !TIPOS_VALIDOS.includes(tipo) || !Number.isFinite(montoNum) || montoNum <= 0) {
    return new Response(JSON.stringify({ error: "Datos inválidos" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Match EXACTO contra el WhatsApp del conductor, igual que antes se hacía
  // en el navegador -- pero ahora con la llave de servicio, directo sobre
  // "profesionales" (no la vista pública), así nadie puede saltarse esta
  // verificación llamando a la base de datos directo.
  const { data: conductor } = await supabase
    .from("profesionales")
    .select("id")
    .eq("es_conductor", true)
    .eq("whatsapp", wa)
    .maybeSingle();

  if (!conductor) {
    return new Response(JSON.stringify({ error: "Ese WhatsApp no está registrado como conductor del Club" }), { status: 404, headers: corsHeaders });
  }

  const ahorro = Math.round(montoNum * 0.10);
  const { error } = await supabase.from("viajes_conductor").insert({
    conductor_id: conductor.id,
    miembro_id,
    tipo,
    monto: montoNum,
    descuento_pct: 10,
    ahorro,
  });

  if (error) {
    console.error("Error registrando viaje de conductor:", error);
    return new Response(JSON.stringify({ error: "No se pudo registrar el viaje" }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true, ahorro }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
