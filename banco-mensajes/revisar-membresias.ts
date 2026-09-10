// revisar-membresias — El Club de la Gente
// Supabase Edge Function · JWT: OFF (la llama pg_cron internamente, 1 vez al día)
//
// 1) A quien se le venció la membresía hoy (o antes) y no renovó, le baja
//    el plan a "sin_plan" -> eso activa la pantalla de ClubCard bloqueada
//    que ya existe en Perfil.html, sin tocar nada más.
// 2) A quien le vence en 3 días, le manda un recordatorio por WhatsApp.
// 3) Aliados y profesionales cuyo contrato (fecha_fin) venció y no se
//    renovó se desactivan solos del Directorio; al profesional además se
//    le quita la membresía vitalicia que traía por estar afiliado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const hoy = new Date().toISOString().slice(0, 10);
  const en3dias = new Date();
  en3dias.setDate(en3dias.getDate() + 3);
  const fecha3dias = en3dias.toISOString().slice(0, 10);

  // 1) Bajar el plan de quien ya venció y sigue con un plan pago
  const { data: vencidos, error: errVencidos } = await supabase
    .from("perfiles")
    .select("id")
    .not("plan", "in", "(gratis,vitalicia,sin_plan)")
    .lte("fecha_vencimiento", hoy);

  if (errVencidos) console.error("Error buscando vencidos:", errVencidos);

  if (vencidos?.length) {
    const ids = vencidos.map((p) => p.id);
    const { error: errBajar } = await supabase.from("perfiles").update({ plan: "sin_plan" }).in("id", ids);
    if (errBajar) console.error("Error bajando plan de vencidos:", errBajar);
  }

  // 2) Recordatorio de WhatsApp a quien vence en 3 días
  const { data: porVencer, error: errPorVencer } = await supabase
    .from("perfiles")
    .select("nombre, whatsapp")
    .not("plan", "in", "(gratis,vitalicia,sin_plan)")
    .eq("fecha_vencimiento", fecha3dias);

  if (errPorVencer) console.error("Error buscando por vencer:", errPorVencer);

  let recordatoriosEnviados = 0;
  for (const p of porVencer || []) {
    if (!p.whatsapp) continue;
    const primerNombre = (p.nombre || "").trim().split(" ")[0] || "";
    const msg = `¡Hola ${primerNombre}! 🌿 Tu membresía de El Club de la Gente vence en 3 días.\n\nRenueva a tiempo para no perder tus descuentos y beneficios. Entra a tu perfil para renovar:\nhttps://elclubdelagente.com/Perfil.html\n\nEl Club de la Gente`;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: p.whatsapp, body: msg }),
      });
      if (r.ok) recordatoriosEnviados++;
    } catch (e) {
      console.error("Error enviando recordatorio a", p.whatsapp, e);
    }
  }

  // 3a) Aliados cuyo contrato venció sin renovar
  const { data: aliadosVencidos, error: errAliadosVenc } = await supabase
    .from("aliados")
    .select("id")
    .eq("activo", true)
    .not("fecha_fin", "is", null)
    .lte("fecha_fin", hoy);

  if (errAliadosVenc) console.error("Error buscando aliados vencidos:", errAliadosVenc);

  if (aliadosVencidos?.length) {
    const { error: errDesactAliados } = await supabase
      .from("aliados")
      .update({ activo: false })
      .in("id", aliadosVencidos.map((a) => a.id));
    if (errDesactAliados) console.error("Error desactivando aliados vencidos:", errDesactAliados);
  }

  // 3b) Profesionales cuyo contrato venció sin renovar — se desactivan y
  // pierden la membresía vitalicia ligada a estar afiliados
  const { data: profVencidos, error: errProfVenc } = await supabase
    .from("profesionales")
    .select("id, user_id")
    .eq("activo", true)
    .not("fecha_fin", "is", null)
    .lte("fecha_fin", hoy);

  if (errProfVenc) console.error("Error buscando profesionales vencidos:", errProfVenc);

  if (profVencidos?.length) {
    const { error: errDesactProf } = await supabase
      .from("profesionales")
      .update({ activo: false, estado: "pendiente" })
      .in("id", profVencidos.map((p) => p.id));
    if (errDesactProf) console.error("Error desactivando profesionales vencidos:", errDesactProf);

    const userIds = profVencidos.map((p) => p.user_id).filter(Boolean);
    if (userIds.length) {
      const { error: errQuitarPlan } = await supabase.from("perfiles").update({ plan: "sin_plan" }).in("id", userIds);
      if (errQuitarPlan) console.error("Error quitando vitalicia a profesionales vencidos:", errQuitarPlan);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      bajados: vencidos?.length || 0,
      recordatorios_enviados: recordatoriosEnviados,
      aliados_desactivados: aliadosVencidos?.length || 0,
      profesionales_desactivados: profVencidos?.length || 0,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
