// aprobar-membresia — El Club de la Gente
// Supabase Edge Function · JWT: OFF
// El admin aprueba un comprobante de pago manual (Bre-B) desde Admin → Ventas.
// Reproduce exactamente lo que antes hacía wompi-webhook al confirmar un pago
// de membresía: activa el plan, registra el pago, avisa por WhatsApp y valida
// si el referidor llega a 5 referidos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  const { solicitud_id } = await req.json().catch(() => ({}));
  if (!solicitud_id) {
    return new Response(JSON.stringify({ error: "solicitud_id requerido" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: solicitud, error: solicitudErr } = await supabase
    .from("solicitudes_membresia")
    .select("id, miembro_id, plan, monto, estado")
    .eq("id", solicitud_id)
    .maybeSingle();

  if (solicitudErr || !solicitud) {
    return new Response(JSON.stringify({ error: "Solicitud no encontrada" }), { status: 404, headers: corsHeaders });
  }
  if (solicitud.estado !== "pendiente") {
    return new Response(JSON.stringify({ error: "Esta solicitud ya fue procesada" }), { status: 409, headers: corsHeaders });
  }

  const fechaVencimiento = new Date();
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);

  const { data: updated, error: updateErr } = await supabase
    .from("perfiles")
    .update({
      plan: solicitud.plan,
      fecha_vencimiento: fechaVencimiento.toISOString().split("T")[0],
    })
    .eq("id", solicitud.miembro_id)
    .select("nombre, whatsapp")
    .maybeSingle();

  if (updateErr) {
    console.error("Error activando membresía:", updateErr);
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
  }

  console.log(`Membresía ${solicitud.plan} activada para miembro ${solicitud.miembro_id} (solicitud ${solicitud_id})`);

  const { error: pagoError } = await supabase.from("pagos").insert({
    miembro_id: solicitud.miembro_id,
    monto: solicitud.monto,
    plan: solicitud.plan,
    referencia: `MANUAL-${solicitud.id}`,
  });
  if (pagoError) console.error("Error registrando pago:", pagoError);

  const { error: estadoErr } = await supabase
    .from("solicitudes_membresia")
    .update({ estado: "aprobado" })
    .eq("id", solicitud.id);
  if (estadoErr) console.error("Error marcando solicitud como aprobada:", estadoErr);

  // Confirmación de activación por WhatsApp — se espera (no fire-and-forget)
  // porque esta función puede terminar apenas se devuelve la Response.
  if (updated?.whatsapp) {
    const primerNombre = (updated.nombre || "").split(" ")[0] || "";
    const planLabel = solicitud.plan === "premium" ? "Premium" : "Básica";
    const msgActivacion = `✅ ¡Tu membresía ${planLabel} ya está activa${primerNombre ? `, ${primerNombre}` : ""}!\n\nYa puedes mostrar tu ClubCard en cualquier aliado del Club para empezar a ahorrar.\n\nEl Club de la Gente`;
    try {
      const rEnvio = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: updated.whatsapp, body: msgActivacion }),
      });
      if (!rEnvio.ok) {
        console.error("whatsapp-send-3 rechazó la confirmación de activación:", rEnvio.status, await rEnvio.text().catch(() => ""));
      }
    } catch (e) {
      console.error("Error enviando confirmación de activación:", e);
    }
  }

  // Validar si el referidor alcanzó 5 referidos activos → vitalicia
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/validar-referidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ miembro_id: solicitud.miembro_id }),
    });
  } catch (e) {
    console.error("Error llamando validar-referidos:", e);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});
