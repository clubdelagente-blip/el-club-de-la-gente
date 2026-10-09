// cambiar-whatsapp — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se verifica a mano que el token sea del propio miembro_id)
//
// El WhatsApp de un miembro no es solo un dato de contacto: es su identidad
// de acceso (el login por OTP busca el correo interno "{digits}@clubdelagente.app").
// Por eso cambiarlo no puede ser un simple UPDATE desde el navegador del
// miembro -- hay que verificar que el número nuevo sea realmente suyo (OTP
// igual que el login) y, con la llave de servicio, actualizar a la vez
// perfiles.whatsapp y el email real en auth.users para que sigan coincidiendo.
//
// SEGURIDAD (2026-10-09): el OTP probaba que el número NUEVO era del que
// llamaba, pero nunca se verificaba que quien llamaba fuera dueño del
// miembro_id que se está modificando. Como el miembro_id de cualquiera es
// público a propósito (es el mismo id que va en su link de referidos,
// "?ref=<miembro_id>"), cualquiera que tuviera ese link podía secuestrar la
// cuenta de otra persona: pedía el OTP a SU propio celular para el
// miembro_id de la víctima, lo confirmaba, y la cuenta de la víctima pasaba
// a iniciar sesión con el número del atacante. Ahora se exige el token de
// sesión real del miembro_id que se está cambiando.
//
// POST { action: "send",   miembro_id, nuevo_whatsapp }   (requiere Authorization: Bearer <token del propio miembro_id>)
// POST { action: "verify", miembro_id, nuevo_whatsapp, code }  (idem)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM")!;
const OTP_SALT = Deno.env.get("OTP_SALT") ?? "ecdlg-otp-salt-2026";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code + OTP_SALT);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizarDigits(raw: string): string {
  let d = (raw ?? "").replace(/\D/g, "");
  while (d.length > 10 && d.startsWith("57")) d = d.slice(2);
  return d;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "No autorizado" }, 401);

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "No autorizado" }, 401);

    const { action, miembro_id, nuevo_whatsapp, code } = await req.json();
    if (!miembro_id) return json({ error: "Falta miembro_id" }, 400);
    if (userData.user.id !== miembro_id) return json({ error: "No autorizado" }, 403);

    const digits = normalizarDigits(nuevo_whatsapp);
    if (!digits || digits.length !== 10 || !digits.startsWith("3")) {
      return json({ error: "Ingresa un número de WhatsApp colombiano válido." }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: miembro, error: miembroErr } = await supabase
      .from("perfiles").select("id, whatsapp").eq("id", miembro_id).maybeSingle();
    if (miembroErr || !miembro) return json({ error: "No encontramos tu cuenta." }, 404);
    if (digits === miembro.whatsapp) return json({ error: "Ese ya es tu número actual." }, 400);

    const { data: enUso } = await supabase
      .from("perfiles").select("id").eq("whatsapp", digits).neq("id", miembro_id).maybeSingle();
    if (enUso) return json({ error: "Ese número ya está vinculado a otra cuenta del Club." }, 409);

    // ── ENVIAR OTP AL NÚMERO NUEVO ───────────────────────────────────────────
    if (action === "send") {
      const { data: reciente } = await supabase
        .from("otp_tokens").select("created_at").eq("phone", digits).eq("used", false)
        .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (reciente) {
        const segs = (Date.now() - new Date(reciente.created_at).getTime()) / 1000;
        if (segs < 60) return json({ error: "Espera un momento antes de solicitar otro código." }, 429);
      }

      await supabase.from("otp_tokens").delete().eq("phone", digits);
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const codeHash = await hashCode(otpCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error: insertErr } = await supabase.from("otp_tokens").insert({ phone: digits, code_hash: codeHash, expires_at: expiresAt });
      if (insertErr) { console.error("[send] Error guardando OTP:", insertErr); return json({ error: "Error interno. Intenta de nuevo." }, 500); }

      const to = `+57${digits}`;
      const body = `Tu código para confirmar tu nuevo WhatsApp en *El Club de la Gente* es:\n\n*${otpCode}*\n\nVálido por 10 minutos. No lo compartas con nadie.`;
      const formData = new URLSearchParams({ From: `whatsapp:${TWILIO_FROM}`, To: `whatsapp:${to}`, Body: body });
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: { "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });
      if (!twilioRes.ok) { console.error("[send] Twilio error:", await twilioRes.text()); return json({ error: "No se pudo enviar el código. Verifica el número." }, 500); }

      return json({ ok: true });
    }

    // ── VERIFICAR OTP Y CAMBIAR EL NÚMERO ───────────────────────────────────
    if (action === "verify") {
      const otp = (code ?? "").replace(/\s/g, "");
      if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
        return json({ error: "El código debe tener 6 dígitos." }, 400);
      }

      const { data: token, error: tokenErr } = await supabase
        .from("otp_tokens").select("id, code_hash, intentos").eq("phone", digits).eq("used", false)
        .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (tokenErr || !token) return json({ error: "Código incorrecto o vencido. Solicita uno nuevo." }, 401);

      const MAX_INTENTOS = 5;
      if ((token.intentos ?? 0) >= MAX_INTENTOS) {
        await supabase.from("otp_tokens").update({ used: true }).eq("id", token.id);
        return json({ error: "Demasiados intentos. Solicita un código nuevo." }, 429);
      }

      const codeHash = await hashCode(otp);
      if (token.code_hash !== codeHash) {
        await supabase.from("otp_tokens").update({ intentos: (token.intentos ?? 0) + 1 }).eq("id", token.id);
        return json({ error: "Código incorrecto o vencido. Solicita uno nuevo." }, 401);
      }
      await supabase.from("otp_tokens").update({ used: true }).eq("id", token.id);

      // Correo interno real (identidad de acceso) y el perfil, a la vez --
      // si el perfil fallara después de ya cambiar el acceso, quedaría
      // desincronizado, así que primero se confirma el acceso y luego el perfil.
      const nuevoEmail = `${digits}@clubdelagente.app`;
      const { error: authErr } = await supabase.auth.admin.updateUserById(miembro_id, { email: nuevoEmail });
      if (authErr) {
        console.error("Error actualizando email de auth:", authErr);
        return json({ error: "No pudimos actualizar tu acceso. Intenta de nuevo." }, 500);
      }

      const { error: perfErr } = await supabase.from("perfiles").update({ whatsapp: digits }).eq("id", miembro_id);
      if (perfErr) {
        console.error("Error actualizando perfil:", perfErr);
        return json({ error: "Tu acceso cambió pero no pudimos guardar tu perfil. Escríbenos por WhatsApp." }, 500);
      }

      return json({ ok: true });
    }

    return json({ error: "Acción no reconocida" }, 400);
  } catch (err) {
    console.error("[cambiar-whatsapp] crash:", err);
    return json({ error: "Error interno. Revisa los logs." }, 500);
  }
});
