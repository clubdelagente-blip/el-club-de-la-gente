// whatsapp-send — El Club de la Gente
// Supabase Edge Function · JWT: OFF
//
// SEGURIDAD (2026-09-04): esta funcion no verificaba nada -- cualquiera con
// la URL podia usar el numero de WhatsApp Business del Club para mandar un
// mensaje con cualquier texto a cualquier numero del mundo (spam/phishing
// con la reputacion del Club, costos de Twilio, riesgo de bloqueo de Meta).
// Ahora solo se permite mandar a numeros que ya existen en la base de datos
// (miembros o aliados) -- cierra la posibilidad de spamear a desconocidos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const FROM = "whatsapp:+14155238886";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { to, body } = await req.json();
    if (!to || !body) return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400, headers: cors });
    if (typeof body !== "string" || body.length > 1000) {
      return new Response(JSON.stringify({ error: "Mensaje inválido" }), { status: 400, headers: cors });
    }

    const num = to.replace(/\D/g, "");
    const numSinPrefijo = num.startsWith("57") ? num.slice(2) : num;
    if (numSinPrefijo.length < 7) {
      return new Response(JSON.stringify({ error: "Número inválido" }), { status: 400, headers: cors });
    }

    // Solo se puede mandar a numeros que ya existen en la base (miembro o aliado)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const [{ data: perfilesData }, { data: aliadosData }] = await Promise.all([
      supabase.from("perfiles").select("whatsapp"),
      supabase.from("aliados").select("whatsapp"),
    ]);
    const conocido = [...(perfilesData || []), ...(aliadosData || [])].some((r) => {
      const d = (r.whatsapp || "").replace(/\D/g, "");
      return d.length >= 7 && (d.endsWith(numSinPrefijo) || numSinPrefijo.endsWith(d));
    });
    if (!conocido) {
      return new Response(JSON.stringify({ error: "Número no autorizado" }), { status: 403, headers: cors });
    }

    const destino = "whatsapp:+" + (num.startsWith("57") ? num : "57" + num);

    const form = new URLSearchParams({ From: FROM, To: destino, Body: body });
    const creds = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);

    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const json = await r.json();
    if (!r.ok) return new Response(JSON.stringify({ error: json.message }), { status: 400, headers: cors });

    return new Response(JSON.stringify({ ok: true, sid: json.sid }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
});
