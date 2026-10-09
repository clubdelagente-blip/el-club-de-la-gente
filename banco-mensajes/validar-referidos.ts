// validar-referidos — El Club de la Gente
// Supabase Edge Function · JWT: OFF
// Después de cada pago aprobado: si el nuevo miembro tiene referidor
// y ese referidor ya acumuló 5 referidos activos → gana vitalicia.
// Si el referidor está pagando un plan activo (básica/premium con
// fecha_vencimiento futura), NO se le cambia el plan de inmediato -- eso
// le cortaría el mes que ya pagó. Se marca vitalicia_pendiente=true y
// revisar-membresias.ts la activa sola el día que ese mes termine.
// Si no tiene plan pago activo (gratis/sin_plan), se activa de una vez.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { miembro_id } = await req.json();
  if (!miembro_id) return new Response("miembro_id requerido", { status: 400 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Buscar si este miembro tiene referidor
  const { data: miembro, error: errMiembro } = await supabase
    .from("perfiles")
    .select("referido_por")
    .eq("id", miembro_id)
    .single();

  if (errMiembro || !miembro?.referido_por) {
    return new Response("Sin referidor", { status: 200 });
  }

  const referidorId = miembro.referido_por;

  // Verificar que el referidor no sea ya vitalicio (o ya esté en espera de serlo)
  const { data: referidor, error: errRef } = await supabase
    .from("perfiles")
    .select("plan, vitalicia_pendiente, fecha_vencimiento")
    .eq("id", referidorId)
    .single();

  if (errRef || !referidor) return new Response("Referidor no encontrado", { status: 200 });
  if (referidor.plan === "vitalicia" || referidor.vitalicia_pendiente) {
    return new Response("Ya es vitalicio o ya está pendiente", { status: 200 });
  }

  // Contar referidos activos del referidor
  const { count, error: errCount } = await supabase
    .from("perfiles")
    .select("id", { count: "exact", head: true })
    .eq("referido_por", referidorId)
    .in("plan", ["basica", "premium", "vitalicia"]);

  if (errCount) {
    console.error("Error contando referidos:", errCount);
    return new Response("Error", { status: 500 });
  }

  console.log(`Referidor ${referidorId} tiene ${count} referidos activos`);

  if ((count ?? 0) < 5) return new Response("Aún no llega a 5", { status: 200 });

  // ¿Tiene un plan pago activo todavía corriendo? Si sí, no se le corta --
  // se le marca como pendiente y revisar-membresias.ts la activa sola
  // cuando ese mes pagado termine. Si no tiene nada pago activo
  // (gratis/sin_plan), se activa de inmediato.
  const hoy = new Date().toISOString().slice(0, 10);
  const tienePlanPagoActivo = ["basica", "premium"].includes(referidor.plan) &&
    referidor.fecha_vencimiento && referidor.fecha_vencimiento > hoy;

  if (tienePlanPagoActivo) {
    const { error: errPendiente } = await supabase
      .from("perfiles")
      .update({ vitalicia_pendiente: true })
      .eq("id", referidorId);

    if (errPendiente) {
      console.error("Error marcando vitalicia pendiente:", errPendiente);
      return new Response("Error", { status: 500 });
    }

    const fechaFmt = new Date(referidor.fecha_vencimiento + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
    const { error: notifErr } = await supabase.from("notificaciones_miembro").insert({
      miembro_id: referidorId,
      titulo: "¡Ya ganaste la membresía Vitalicia!",
      cuerpo: `Por tus 5 referidos activos, ya ganaste la membresía Vitalicia. Primero completas el mes que ya pagaste y el ${fechaFmt} se activa sola, sin que tengas que pagar ni hacer nada.`,
    });
    if (notifErr) console.error("Error creando notificación de vitalicia pendiente:", notifErr);

    console.log(`Vitalicia pendiente marcada para ${referidorId} (se activa el ${referidor.fecha_vencimiento})`);
    return new Response("Vitalicia pendiente", { status: 200 });
  }

  // Sin plan pago activo -> se activa de inmediato
  const { error: errUpdate } = await supabase
    .from("perfiles")
    .update({ plan: "vitalicia", vitalicia_pendiente: false })
    .eq("id", referidorId);

  if (errUpdate) {
    console.error("Error actualizando a vitalicia:", errUpdate);
    return new Response("Error", { status: 500 });
  }

  const { error: notifErr } = await supabase.from("notificaciones_miembro").insert({
    miembro_id: referidorId,
    titulo: "¡Ganaste la membresía Vitalicia!",
    cuerpo: "Por tus 5 referidos activos, tu membresía ya quedó en Vitalicia — descuentos ilimitados para siempre, sin ningún costo.",
  });
  if (notifErr) console.error("Error creando notificación de vitalicia:", notifErr);

  console.log(`Membresía vitalicia activada para ${referidorId}`);

  return new Response("Vitalicia activada", { status: 200 });
});
