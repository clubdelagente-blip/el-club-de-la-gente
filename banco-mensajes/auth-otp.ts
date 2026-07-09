// auth-otp — El Club de la Gente
// Supabase Edge Function · JWT: ON
// Genera y verifica códigos OTP enviados por WhatsApp para login seguro.
//
// POST { action: "send",   phone: "3001234567" }
// POST { action: "verify", phone: "3001234567", code: "123456" }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL        = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID  = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN   = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM         = Deno.env.get("TWILIO_WHATSAPP_FROM")!;
const OTP_SALT            = Deno.env.get("OTP_SALT") ?? "ecdlg-otp-salt-2026";

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code + OTP_SALT);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST")    return new Response("Method not allowed", { status: 405, headers: cors });

  try {
  const { action, phone, code } = await req.json();
  const digits = (phone ?? "").replace(/\D/g, "");

  if (!digits || digits.length < 7) return json({ error: "Número inválido" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── ENVIAR OTP ────────────────────────────────────────────────────────────
  if (action === "send") {
    // Rate limit: máximo un código por minuto por número
    const { data: reciente, error: rateErr } = await supabase
      .from("otp_tokens")
      .select("created_at")
      .eq("phone", digits)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rateErr) console.error("[send] rate-limit query error:", rateErr);

    if (reciente) {
      const segs = (Date.now() - new Date(reciente.created_at).getTime()) / 1000;
      if (segs < 60) return json({ error: "Espera un momento antes de solicitar otro código." }, 429);
    }

    // Limpiar tokens viejos del mismo número
    await supabase.from("otp_tokens").delete().eq("phone", digits);

    // Generar código de 6 dígitos
    const otpCode  = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await hashCode(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase
      .from("otp_tokens")
      .insert({ phone: digits, code_hash: codeHash, expires_at: expiresAt });

    if (insertErr) {
      console.error("[send] Error guardando OTP:", insertErr);
      return json({ error: "Error interno. Intenta de nuevo." }, 500);
    }
    // Enviar por WhatsApp via Twilio
    const to   = digits.startsWith("57") ? `+${digits}` : `+57${digits}`;
    const body = `Tu código de acceso al *Club de la Gente* es:\n\n*${otpCode}*\n\nVálido por 10 minutos. No lo compartas con nadie.`;

    const formData = new URLSearchParams({
      From: `whatsapp:${TWILIO_FROM}`,
      To:   `whatsapp:${to}`,
      Body: body,
    });

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method:  "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type":  "application/x-www-form-urlencoded",
        },
        body: formData,
      }
    );

    if (!twilioRes.ok) {
      const txt = await twilioRes.text();
      console.error("[send] Twilio error:", txt);
      return json({ error: "No se pudo enviar el código. Verifica tu número." }, 500);
    }

    return json({ ok: true });
  }

  // ── VERIFICAR OTP ─────────────────────────────────────────────────────────
  if (action === "verify") {
    const otp = (code ?? "").replace(/\s/g, "");
    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      return json({ error: "El código debe tener 6 dígitos." }, 400);
    }

    const codeHash = await hashCode(otp);

    const { data: token, error: tokenErr } = await supabase
      .from("otp_tokens")
      .select("id, code_hash")
      .eq("phone", digits)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenErr || !token || token.code_hash !== codeHash) {
      return json({ error: "Código incorrecto o vencido. Solicita uno nuevo." }, 401);
    }

    // Marcar como usado (solo puede usarse una vez)
    await supabase.from("otp_tokens").update({ used: true }).eq("id", token.id);

    // Generar enlace mágico para el email ficticio del miembro
    const email = `${digits}@clubdelagente.app`;
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("generateLink error:", linkErr);
      return json({ error: "Error al generar acceso. Intenta de nuevo." }, 500);
    }

    return json({ hashed_token: linkData.properties.hashed_token });
  }

  return json({ error: "Acción no reconocida" }, 400);

  } catch (err) {
    console.error("[auth-otp] crash:", err);
    return json({ error: "Error interno. Revisa los logs." }, 500);
  }
});
