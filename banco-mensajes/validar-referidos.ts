// validar-referidos — El Club de la Gente
// Supabase Edge Function · JWT: OFF
// Después de cada pago aprobado: si el nuevo miembro tiene referidor
// y ese referidor ya acumuló 5 referidos activos → sube a vitalicia + ClubCard

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

  // Verificar que el referidor no sea ya vitalicio
  const { data: referidor, error: errRef } = await supabase
    .from("perfiles")
    .select("plan")
    .eq("id", referidorId)
    .single();

  if (errRef || !referidor) return new Response("Referidor no encontrado", { status: 200 });
  if (referidor.plan === "vitalicia") return new Response("Ya es vitalicio", { status: 200 });

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

  // Subir a vitalicia
  const { error: errUpdate } = await supabase
    .from("perfiles")
    .update({ plan: "vitalicia" })
    .eq("id", referidorId);

  if (errUpdate) {
    console.error("Error actualizando a vitalicia:", errUpdate);
    return new Response("Error", { status: 500 });
  }

  console.log(`Membresía vitalicia activada para ${referidorId}`);

  // Disparar ClubCard física
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/generar-clubcard`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ miembro_id: referidorId, plan: "vitalicia" }),
    });
  } catch (e) {
    console.error("Error llamando generar-clubcard:", e);
  }

  return new Response("Vitalicia activada", { status: 200 });
});
