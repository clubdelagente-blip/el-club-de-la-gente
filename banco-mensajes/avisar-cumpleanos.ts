// avisar-cumpleanos — El Club de la Gente
// Supabase Edge Function · JWT: OFF (la llama pg_cron internamente, 1 vez al día)
//
// Cada día busca a los miembros Premium o Vitalicia cuyo cumpleaños es hoy,
// cruza sus categorías de interés (perfiles.categorias_interes) con los
// aliados que tengan una promoción activa marcada "es_cumpleanos", y les
// manda un WhatsApp de felicitación contándoles qué beneficios tienen ese
// día. Respeta la preferencia "descuentos" de Mi Agente (mismo criterio que
// usan las alertas de descuentos por categoría) -- sin fila en
// preferencias_notificacion se asume que sí quiere, solo se excluye a quien
// la desactivó explícitamente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fecha en hora Colombia (UTC-5), no UTC -- si no, cerca de medianoche
  // se corre el día de cumpleaños de todos.
  const hoyCo = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const mesDia = `${String(hoyCo.getUTCMonth() + 1).padStart(2, "0")}-${String(hoyCo.getUTCDate()).padStart(2, "0")}`;

  const { data: candidatos, error: errCandidatos } = await supabase
    .from("perfiles")
    .select("id, nombre, whatsapp, plan, categorias_interes, fecha_nacimiento")
    .in("plan", ["premium", "vitalicia"])
    .not("fecha_nacimiento", "is", null)
    .not("whatsapp", "is", null);

  if (errCandidatos) {
    console.error("Error buscando candidatos:", errCandidatos);
    return new Response(JSON.stringify({ ok: false, error: errCandidatos.message }), { status: 500 });
  }

  const cumpleanerosHoy = (candidatos || []).filter((p) => (p.fecha_nacimiento || "").slice(5, 10) === mesDia);

  if (!cumpleanerosHoy.length) {
    return new Response(JSON.stringify({ ok: true, cumpleanos_hoy: 0, mensajes_enviados: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Respeta la preferencia real de "Alertas de descuentos" de Mi Agente
  const ids = cumpleanerosHoy.map((p) => p.id);
  const { data: prefs } = await supabase
    .from("preferencias_notificacion")
    .select("miembro_id")
    .in("miembro_id", ids)
    .eq("descuentos", false);
  const noQuierenDescuentos = new Set((prefs || []).map((r) => r.miembro_id));

  // Aliados activos con al menos una promoción de cumpleaños activa
  const { data: aliados, error: errAliados } = await supabase
    .from("aliados")
    .select("id, nombre, categoria, promociones!inner(descripcion, es_cumpleanos, activa)")
    .eq("activo", true)
    .eq("promociones.es_cumpleanos", true)
    .eq("promociones.activa", true);

  if (errAliados) console.error("Error buscando aliados con promo de cumpleaños:", errAliados);

  let mensajesEnviados = 0;
  for (const p of cumpleanerosHoy) {
    if (noQuierenDescuentos.has(p.id)) continue;
    const primerNombre = (p.nombre || "").trim().split(" ")[0] || "";
    const intereses = (Array.isArray(p.categorias_interes) ? p.categorias_interes : []).map((c: string) =>
      c.trim().toLowerCase()
    );

    const beneficios: string[] = [];
    for (const a of aliados || []) {
      const catsAliado = (a.categoria || "").split(",").map((c: string) => c.trim().toLowerCase());
      const coincide = intereses.length === 0 || catsAliado.some((c: string) => intereses.includes(c));
      if (!coincide) continue;
      for (const promo of a.promociones || []) {
        beneficios.push(`🎁 ${a.nombre}: ${promo.descripcion}`);
      }
    }

    const msg = beneficios.length
      ? `¡Feliz cumpleaños, ${primerNombre}! 🎉🌿\n\nEl Club de la Gente te tiene estos beneficios especiales hoy:\n\n${beneficios.join("\n")}\n\n¡Que lo disfrutes!`
      : `¡Feliz cumpleaños, ${primerNombre}! 🎉🌿\n\nHoy hay aliados del Club con beneficios especiales de cumpleaños -- revísalos en el Directorio: https://elclubdelagente.com/Directorio.html\n\n¡Que tengas un gran día!`;

    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: p.whatsapp, body: msg }),
      });
      if (r.ok) mensajesEnviados++;
    } catch (e) {
      console.error("Error enviando felicitación a", p.whatsapp, e);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, cumpleanos_hoy: cumpleanerosHoy.length, mensajes_enviados: mensajesEnviados }),
    { headers: { "Content-Type": "application/json" } },
  );
});
