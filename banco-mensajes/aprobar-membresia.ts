// aprobar-membresia — El Club de la Gente
// Supabase Edge Function · JWT: OFF (se verifica a mano que sea un admin real)
// El admin aprueba un comprobante de pago manual (Bre-B) desde Admin → Ventas.
// Reproduce exactamente lo que antes hacía wompi-webhook al confirmar un pago
// de membresía: activa el plan, registra el pago, avisa por WhatsApp y valida
// si el referidor llega a 5 referidos.
//
// SEGURIDAD (2026-10-09): esta función activaba cualquier solicitud con solo
// mandarle su id -- sin esta verificación, cualquier miembro podía crearse su
// propia solicitud_membresia desde el navegador (checkout.js la inserta
// directo) y luego llamar esta función él mismo para auto-aprobarse Premium
// o Vitalicia gratis, sin pagar ni pasar por el Admin. Ahora exige un token
// de sesión real y que esa cuenta tenga rol='admin'.

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

  const { solicitud_id } = await req.json().catch(() => ({}));
  if (!solicitud_id) {
    return new Response(JSON.stringify({ error: "solicitud_id requerido" }), { status: 400, headers: corsHeaders });
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

  // SEGURIDAD/CONCURRENCIA (2026-10-29): antes esto leía el estado acá y
  // recién marcaba "aprobado" al final, después de activar el plan, registrar
  // el pago y mandar el WhatsApp -- si verificar-comprobante.ts (la IA)
  // estaba analizando esta misma solicitud al mismo tiempo, las dos pasaban
  // esta validación y ambas terminaban duplicando el pago y la notificación.
  // Ahora el "aprobado" se reclama de forma atómica, primero que nada: solo
  // una de las dos llamadas puede encontrar la fila todavía en "pendiente" y
  // actualizarla -- la otra no afecta ninguna fila y se corta acá mismo, sin
  // haber tocado perfiles/pagos/WhatsApp.
  const { data: solicitud, error: solicitudErr } = await supabase
    .from("solicitudes_membresia")
    .update({ estado: "aprobado" })
    .eq("id", solicitud_id)
    .eq("estado", "pendiente")
    .select("id, miembro_id, plan, monto")
    .maybeSingle();

  if (solicitudErr) {
    console.error("Error reclamando la solicitud:", solicitudErr);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500, headers: corsHeaders });
  }
  if (!solicitud) {
    return new Response(JSON.stringify({ error: "Esta solicitud no existe o ya fue procesada" }), { status: 409, headers: corsHeaders });
  }

  // Si renueva ANTES de vencer, los días que le quedaban se suman en vez de
  // perderse -- el nuevo mes se cuenta desde su fecha de vencimiento actual
  // (si todavía no pasó), no desde hoy.
  const { data: perfilActual } = await supabase
    .from("perfiles")
    .select("fecha_vencimiento")
    .eq("id", solicitud.miembro_id)
    .maybeSingle();
  const hoy = new Date();
  const vencimientoActual = perfilActual?.fecha_vencimiento ? new Date(perfilActual.fecha_vencimiento + "T00:00:00") : null;
  const fechaBase = vencimientoActual && vencimientoActual > hoy ? vencimientoActual : hoy;
  const fechaVencimiento = new Date(fechaBase);
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

  const planLabelNotif = solicitud.plan === "premium" ? "Premium" : "Básica";
  const { error: notifErr } = await supabase.from("notificaciones_miembro").insert({
    miembro_id: solicitud.miembro_id,
    titulo: "Tu membresía ya está activa",
    cuerpo: `Tu membresía ${planLabelNotif} quedó activa. Ya puedes mostrar tu ClubCard en cualquier aliado del Club para empezar a ahorrar.`,
  });
  if (notifErr) console.error("Error creando notificación de aprobación:", notifErr);

  // Confirmación de activación por WhatsApp — se espera (no fire-and-forget)
  // porque esta función puede terminar apenas se devuelve la Response.
  if (updated?.whatsapp) {
    const primerNombre = (updated.nombre || "").split(" ")[0] || "";
    const planLabel = solicitud.plan === "premium" ? "Premium" : "Básica";
    const msgActivacion = `✅ ¡Tu membresía *${planLabel}* ya está activa${primerNombre ? `, *${primerNombre}*` : ""}! 💙🌿\n\nDesde hoy puedes disfrutar de tus beneficios y presentar tu ClubCard en nuestros aliados para empezar a ahorrar. 🛍️\n\nPero hay algo aún más bonito: *tu membresía no solo te beneficia a ti, también nos ayuda a impulsar programas sociales que llevarán apoyo, oportunidades y esperanza a muchos seres que lo necesitan.* ❤️\n\nPorque cuando ahorras, aprendes y haces parte de esta comunidad, también contribuyes a construir algo bueno para los demás.\n\n*¡Gracias por ser parte de El Club de la Gente! Juntos podemos hacer que ayudar sea parte de nuestra vida cotidiana.* 🧡\n\n_El Club de la Gente_`;
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
