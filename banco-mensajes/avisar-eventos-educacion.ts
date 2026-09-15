// avisar-eventos-educacion — El Club de la Gente
// Supabase Edge Function · JWT: OFF (la llama pg_cron internamente, 1 vez al día)
//
// Busca los talleres de "Educación" programados para mañana y le avisa por
// WhatsApp a todos los miembros con plan activo (gratis/basica/premium/
// vitalicia), con un link para confirmar asistencia sin necesidad de login.
// Marca cada evento como "aviso_enviado" para no repetir el mensaje si el
// cron corre más de una vez el mismo día.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const fechaManana = manana.toISOString().slice(0, 10);

  const { data: eventos, error: errEventos } = await supabase
    .from("eventos_educacion")
    .select("id, titulo, descripcion, fecha, lugar")
    .eq("fecha", fechaManana)
    .eq("activo", true)
    .eq("aviso_enviado", false);

  if (errEventos) {
    console.error("Error buscando eventos de mañana:", errEventos);
    return new Response(JSON.stringify({ ok: false, error: errEventos.message }), { status: 500 });
  }

  if (!eventos?.length) {
    return new Response(JSON.stringify({ ok: true, eventos: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  const { data: miembros, error: errMiembros } = await supabase
    .from("perfiles")
    .select("id, nombre, whatsapp")
    .in("plan", ["gratis", "basica", "premium", "vitalicia"])
    .not("whatsapp", "is", null);

  if (errMiembros) console.error("Error buscando miembros activos:", errMiembros);

  let totalEnviados = 0;
  const resumenPorEvento: Record<string, number> = {};

  for (const evento of eventos) {
    const fechaFmt = new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
    let enviados = 0;

    for (const m of miembros || []) {
      if (!m.whatsapp) continue;
      const primerNombre = (m.nombre || "").trim().split(" ")[0] || "";
      const link = `https://elclubdelagente.com/ConfirmarEvento.html?evento=${evento.id}&miembro=${m.id}`;
      const msg = `🎓 ¡Hola ${primerNombre}! Mañana (${fechaFmt}) tenemos el taller "${evento.titulo}" en El Club de la Gente.${evento.descripcion ? `\n\n${evento.descripcion}` : ""}${evento.lugar ? `\n\n📍 ${evento.lugar}` : ""}\n\nEs gratis para todos los miembros. Confirma que vas aquí:\n${link}\n\nEl Club de la Gente`;
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: m.whatsapp, body: msg }),
        });
        if (r.ok) enviados++;
      } catch (e) {
        console.error("Error avisando a", m.whatsapp, e);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    resumenPorEvento[evento.id] = enviados;
    totalEnviados += enviados;

    const { error: errMarcar } = await supabase
      .from("eventos_educacion")
      .update({ aviso_enviado: true })
      .eq("id", evento.id);
    if (errMarcar) console.error("Error marcando aviso_enviado para", evento.id, errMarcar);
  }

  return new Response(
    JSON.stringify({ ok: true, eventos: eventos.length, total_enviados: totalEnviados, por_evento: resumenPorEvento }),
    { headers: { "Content-Type": "application/json" } },
  );
});
