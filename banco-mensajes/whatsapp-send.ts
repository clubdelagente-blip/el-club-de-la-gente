// whatsapp-send — El Club de la Gente
// Supabase Edge Function · JWT: OFF
//
// SEGURIDAD (2026-09-04): esta funcion no verificaba nada -- cualquiera con
// la URL podia usar el numero de WhatsApp Business del Club para mandar un
// mensaje con cualquier texto a cualquier numero del mundo (spam/phishing
// con la reputacion del Club, costos de Twilio, riesgo de bloqueo de Meta).
// Ahora solo se permite mandar a numeros que ya existen en la base de datos
// (miembros o aliados) -- cierra la posibilidad de spamear a desconocidos.
//
// SEGURIDAD (2026-10-09): la función se llama desde navegador, Admin y
// varias Edge Functions internas sin un token de sesión (demasiados
// llamadores legítimos distintos para exigir uno sin romper algo), así que
// en vez de autenticación se le puso un límite de frecuencia por número
// destino -- si alguien descubre la URL (es pública: está en el código
// fuente de Admin.html, que cualquiera puede ver) ya no puede usarla para
// bombardear a un mismo miembro/aliado con mensajes de phishing usando el
// WhatsApp oficial del Club.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const FROM = "whatsapp:+14155238886";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Generoso a propósito: el Admin usa esta misma función para chatear en vivo
// con un miembro (varios mensajes seguidos son normales ahí) -- el límite
// solo necesita frenar un bombardeo real, no una conversación de soporte.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MIN = 10;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { to, body, mediaUrl } = await req.json();
    if (!to || (!body && !mediaUrl)) return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400, headers: cors });
    if (body && (typeof body !== "string" || body.length > 1000)) {
      return new Response(JSON.stringify({ error: "Mensaje inválido" }), { status: 400, headers: cors });
    }
    if (mediaUrl && (typeof mediaUrl !== "string" || !/^https:\/\//.test(mediaUrl))) {
      return new Response(JSON.stringify({ error: "Media inválida" }), { status: 400, headers: cors });
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
      console.warn(`Rechazado: ${numSinPrefijo} no existe en perfiles/aliados`);
      return new Response(JSON.stringify({ error: "Número no autorizado" }), { status: 403, headers: cors });
    }

    // Límite de frecuencia por número destino -- evita que alguien use esta
    // función para bombardear al mismo miembro/aliado con el WhatsApp del Club.
    const desde = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString();
    const { count: enviosRecientes } = await supabase
      .from("whatsapp_envios_log")
      .select("id", { count: "exact", head: true })
      .eq("numero", numSinPrefijo)
      .gt("created_at", desde);
    if ((enviosRecientes ?? 0) >= RATE_LIMIT_MAX) {
      console.warn(`Rate limit excedido para ${numSinPrefijo}`);
      return new Response(JSON.stringify({ error: "Demasiados mensajes a este número, intenta más tarde" }), { status: 429, headers: cors });
    }

    const destino = "whatsapp:+" + (num.startsWith("57") ? num : "57" + num);

    const formFields: Record<string, string> = { From: FROM, To: destino };
    if (body) formFields.Body = body;
    if (mediaUrl) formFields.MediaUrl = mediaUrl;
    const form = new URLSearchParams(formFields);
    const creds = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);

    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const json = await r.json();
    if (!r.ok) {
      console.error(`Twilio rechazó el envío a ${destino}:`, JSON.stringify(json));
      return new Response(JSON.stringify({ error: json.message }), { status: 400, headers: cors });
    }

    console.log(`Enviado a ${destino}, sid=${json.sid}`);
    const { error: logErr } = await supabase.from("whatsapp_envios_log").insert({ numero: numSinPrefijo });
    if (logErr) console.error("Error registrando envío en whatsapp_envios_log:", logErr);
    return new Response(JSON.stringify({ ok: true, sid: json.sid }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error inesperado en whatsapp-send:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
});
