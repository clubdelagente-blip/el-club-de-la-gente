// avisar-fechas-especiales — El Club de la Gente
// Supabase Edge Function · JWT: OFF (la llama pg_cron internamente, 1 vez al día)
//
// Revisa si hoy es el arranque de alguna fecha especial del calendario
// comercial del Club (ver FECHAS abajo). Si lo es, busca las promociones
// activas marcadas con esa fecha_especial (campo agregado en Admin →
// Nueva promoción) y le avisa por WhatsApp a los miembros cuyas categorías
// de interés coincidan con el aliado de cada promo -- un solo mensaje por
// miembro con todo lo que le aplica ese día. Respeta "solo_premium" por
// promoción y la preferencia "descuentos" de Mi Agente (mismo criterio que
// avisar-cumpleanos.ts).
//
// Los eventos de varios días (Navidad, la Primatón, fin de año) solo avisan
// UNA vez, el primer día del rango -- no todos los días -- para no saturar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// mes-dia (MM-DD) en que arranca el aviso de cada fecha especial. Los
// eventos de un solo día usan esa misma fecha; los de rango (Navidad, la
// Primatón, fin de año) avisan solo el primer día.
const FECHAS: Record<string, { mesDia: string; nombre: string }> = {
  cumple_fusa: { mesDia: "02-05", nombre: "el cumpleaños de Fusagasugá" },
  san_valentin: { mesDia: "02-14", nombre: "San Valentín" },
  dia_mujer: { mesDia: "03-08", nombre: "el Día de la Mujer" },
  dia_nino: { mesDia: "04-25", nombre: "el Día del Niño" },
  dia_madre: { mesDia: "05-10", nombre: "el Día de la Madre" },
  dia_padre: { mesDia: "06-14", nombre: "el Día del Padre" },
  primaton: { mesDia: "06-24", nombre: "la Primatón" },
  amor_amistad: { mesDia: "09-19", nombre: "el Día del Amor y la Amistad" },
  halloween: { mesDia: "10-31", nombre: "Halloween" },
  black_friday: { mesDia: "11-27", nombre: "el Black Friday" },
  dia_velitas: { mesDia: "12-08", nombre: "el Día de las Velitas" },
  navidad: { mesDia: "12-17", nombre: "la Navidad" },
  fin_de_ano: { mesDia: "12-26", nombre: "el fin de año" },
};

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fecha en hora Colombia (UTC-5), no UTC
  const hoyCo = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const mesDia = `${String(hoyCo.getUTCMonth() + 1).padStart(2, "0")}-${String(hoyCo.getUTCDate()).padStart(2, "0")}`;

  const slugHoy = Object.keys(FECHAS).find((slug) => FECHAS[slug].mesDia === mesDia);
  if (!slugHoy) {
    return new Response(JSON.stringify({ ok: true, hoy_es_fecha_especial: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  const nombreFecha = FECHAS[slugHoy].nombre;

  const { data: promos, error: errPromos } = await supabase
    .from("promociones")
    .select("descripcion, solo_premium, aliados!inner(id, nombre, categoria, activo)")
    .eq("fecha_especial", slugHoy)
    .eq("activa", true)
    .eq("aliados.activo", true);

  if (errPromos) {
    console.error("Error buscando promociones de la fecha:", errPromos);
    return new Response(JSON.stringify({ ok: false, error: errPromos.message }), { status: 500 });
  }

  if (!promos?.length) {
    return new Response(JSON.stringify({ ok: true, hoy_es_fecha_especial: true, slug: slugHoy, promos: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: miembros, error: errMiembros } = await supabase
    .from("perfiles")
    .select("id, nombre, whatsapp, plan, categorias_interes")
    .not("whatsapp", "is", null)
    .not("categorias_interes", "is", null);

  if (errMiembros) {
    console.error("Error buscando miembros:", errMiembros);
    return new Response(JSON.stringify({ ok: false, error: errMiembros.message }), { status: 500 });
  }

  const ids = (miembros || []).map((m) => m.id);
  let noQuierenDescuentos = new Set<string>();
  if (ids.length) {
    const { data: prefs } = await supabase
      .from("preferencias_notificacion")
      .select("miembro_id")
      .in("miembro_id", ids)
      .eq("descuentos", false);
    noQuierenDescuentos = new Set((prefs || []).map((r) => r.miembro_id));
  }

  let mensajesEnviados = 0;
  for (const m of miembros || []) {
    if (noQuierenDescuentos.has(m.id)) continue;
    const esPremium = m.plan === "premium" || m.plan === "vitalicia";
    const intereses = (Array.isArray(m.categorias_interes) ? m.categorias_interes : []).map((c: string) =>
      c.trim().toLowerCase()
    );
    if (!intereses.length) continue;

    const beneficios: string[] = [];
    for (const promo of promos) {
      if (promo.solo_premium && !esPremium) continue;
      const catsAliado = (promo.aliados?.categoria || "").split(",").map((c: string) => c.trim().toLowerCase());
      if (!catsAliado.some((c: string) => intereses.includes(c))) continue;
      beneficios.push(`🎁 ${promo.aliados?.nombre}: ${promo.descripcion}`);
    }
    if (!beneficios.length) continue;

    const primerNombre = (m.nombre || "").trim().split(" ")[0] || "";
    const msg = `¡Hola ${primerNombre}! 🌿 Por ${nombreFecha}, El Club de la Gente te tiene estos beneficios especiales:\n\n${beneficios.join("\n")}\n\n¡Aprovéchalos!`;

    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: m.whatsapp, body: msg }),
      });
      if (r.ok) mensajesEnviados++;
    } catch (e) {
      console.error("Error enviando aviso de fecha especial a", m.whatsapp, e);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, hoy_es_fecha_especial: true, slug: slugHoy, promos: promos.length, mensajes_enviados: mensajesEnviados }),
    { headers: { "Content-Type": "application/json" } },
  );
});
