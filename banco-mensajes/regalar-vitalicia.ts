// regalar-vitalicia — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se verifica a mano que sea un admin real)
//
// El admin regala una membresía Vitalicia gratis a alguien, como estrategia
// de crecimiento (embajadores, sorteos, alianzas). Si la persona ya tiene
// cuenta en el Club, se le sube el plan a Vitalicia. Si no tiene cuenta, se
// le crea una de una vez -- mismo mecanismo de "email ficticio" que usa el
// login por WhatsApp (auth-otp.ts): la cuenta real de Supabase Auth queda
// con email "<whatsapp>@clubdelagente.app", sin contraseña, porque en este
// Club siempre se entra con el código que llega por WhatsApp. Así la
// persona no tiene que registrarse ni llenar ningún formulario -- su cuenta
// ya está lista y activa en cuanto le llega el mensaje.
//
// SEGURIDAD: exige token de sesión real y rol='admin' -- sin esto cualquiera
// podría regalarse a sí mismo (o a quien sea) una membresía gratis de por
// vida, igual que se protegió aprobar-membresia.ts.
//
// POST { nombre, whatsapp }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: perfilLlamador } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (perfilLlamador?.rol !== "admin") {
    return new Response(JSON.stringify({ error: "No tienes permisos de administrador" }), { status: 403, headers: corsHeaders });
  }

  const { nombre, whatsapp } = await req.json().catch(() => ({}));
  if (!nombre?.trim() || !whatsapp) {
    return new Response(JSON.stringify({ error: "Nombre y WhatsApp son obligatorios" }), { status: 400, headers: corsHeaders });
  }

  let digits = String(whatsapp).replace(/\D/g, "");
  while (digits.length > 10 && digits.startsWith("57")) digits = digits.slice(2);
  if (!/^3\d{9}$/.test(digits)) {
    return new Response(JSON.stringify({ error: "Número de WhatsApp inválido (10 dígitos, debe empezar en 3)" }), { status: 400, headers: corsHeaders });
  }

  const { data: existente } = await supabase
    .from("perfiles")
    .select("id, plan")
    .eq("whatsapp", digits)
    .maybeSingle();

  let miembroId: string;
  let esNuevo = false;

  if (existente) {
    if (existente.plan === "vitalicia") {
      return new Response(JSON.stringify({ ok: true, aviso: "Ya tenía Vitalicia" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    miembroId = existente.id;
    const { error: updErr } = await supabase.from("perfiles").update({ plan: "vitalicia" }).eq("id", miembroId);
    if (updErr) {
      console.error("Error subiendo a Vitalicia:", updErr);
      return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: corsHeaders });
    }
  } else {
    esNuevo = true;
    // Mismo email ficticio que usa auth-otp.ts para el login por WhatsApp --
    // tiene que coincidir exacto en formato (10 dígitos, sin "57") para que
    // el login por WhatsApp de esta persona resuelva a esta misma cuenta.
    const email = `${digits}@clubdelagente.app`;
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
    if (linkErr || !linkData?.user?.id) {
      console.error("Error creando cuenta nueva:", linkErr);
      return new Response(JSON.stringify({ error: "No se pudo crear la cuenta" }), { status: 500, headers: corsHeaders });
    }
    miembroId = linkData.user.id;

    const { error: perfError } = await supabase.from("perfiles").insert({
      id: miembroId,
      nombre: nombre.trim(),
      whatsapp: digits,
      rol: "miembro",
      plan: "vitalicia",
    });
    if (perfError) {
      console.error("Error creando perfil:", perfError);
      return new Response(JSON.stringify({ error: perfError.message }), { status: 500, headers: corsHeaders });
    }
  }

  const { error: notifErr } = await supabase.from("notificaciones_miembro").insert({
    miembro_id: miembroId,
    titulo: "¡Tienes una membresía Vitalicia de regalo!",
    cuerpo: "El Club te regaló la membresía Vitalicia — descuentos ilimitados para siempre en todos los aliados, sin ningún costo.",
  });
  if (notifErr) console.error("Error creando notificación:", notifErr);

  const primerNombre = nombre.trim().split(" ")[0];
  const msg = esNuevo
    ? `🎁 ¡Hola ${primerNombre}! El Club de la Gente te regaló una membresía *Vitalicia* — descuentos ilimitados para siempre en todos nuestros aliados, sin ningún costo.\n\nYa tienes tu cuenta lista. Para entrar:\n1. Ve a elclubdelagente.com\n2. Toca "Iniciar sesión"\n3. Pon tu número de WhatsApp (este mismo) y te llega un código para entrar — no necesitas contraseña.\n\n¡Bienvenido al Club!`
    : `🎁 ¡Hola ${primerNombre}! El Club de la Gente te regaló la membresía *Vitalicia* — descuentos ilimitados para siempre en todos los aliados, sin ningún costo. Ya está activa en tu cuenta.\n\nEl Club de la Gente`;

  try {
    const rEnvio = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: digits, body: msg }),
    });
    if (!rEnvio.ok) {
      console.error("whatsapp-send-3 rechazó el mensaje de regalo:", rEnvio.status, await rEnvio.text().catch(() => ""));
    }
  } catch (e) {
    console.error("Error enviando WhatsApp de regalo:", e);
  }

  console.log(`Vitalicia regalada a ${miembroId} (${esNuevo ? "cuenta nueva" : "cuenta existente"})`);
  return new Response(JSON.stringify({ ok: true, nuevo: esNuevo }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
