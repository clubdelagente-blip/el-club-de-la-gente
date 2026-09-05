// wompi-webhook — El Club de la Gente
// Supabase Edge Function · JWT: OFF
// Recibe eventos de Wompi y activa la membresía del miembro

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const WOMPI_SECRET = Deno.env.get("WOMPI_EVENTS_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-event-checksum",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const body = await req.text();

  // Verificar firma de Wompi
  const signature = req.headers.get("x-event-checksum") || "";
  const hmac = createHmac("sha256", WOMPI_SECRET).update(body).digest("hex");
  if (hmac !== signature) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const event = JSON.parse(body);

  if (event?.event !== "transaction.updated") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const tx = event?.data?.transaction;
  if (!tx || tx.status !== "APPROVED") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const parts = (tx.reference || "").split("-");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Compra en la Tienda del Club (dropshipping) — referencia: ECDLGTIENDA-<pedidoId>-...
  if (parts[0] === "ECDLGTIENDA") {
    if (parts.length < 6) return new Response("OK", { status: 200, headers: corsHeaders });
    const pedidoId = parts.slice(1, 6).join("-");

    const { data: pedido, error: pedidoErr } = await supabase
      .from("pedidos_club").select("id, monto, estado").eq("id", pedidoId).maybeSingle();
    if (pedidoErr || !pedido) {
      console.error("Pedido de tienda no encontrado:", pedidoId, pedidoErr);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
    if (pedido.estado !== "pendiente_pago") {
      return new Response("OK", { status: 200, headers: corsHeaders }); // ya procesado
    }
    if (Math.round(tx.amount_in_cents / 100) !== pedido.monto) {
      console.error("Monto no coincide para pedido de tienda:", pedidoId, tx.amount_in_cents, pedido.monto);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const { error } = await supabase
      .from("pedidos_club")
      .update({ estado: "pagado", referencia_pago: tx.reference })
      .eq("id", pedidoId).eq("estado", "pendiente_pago");
    if (error) {
      console.error("Error marcando pedido de tienda como pagado:", error);
      return new Response("Error", { status: 500, headers: corsHeaders });
    }
    console.log(`Pedido de Tienda del Club ${pedidoId} marcado como pagado`);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  // Pago de membresía — referencia: ECDLG-<miembroId>-...
  if (parts.length < 3 || parts[0] !== "ECDLG") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const miembroId = parts.slice(1, 6).join("-");

  const monto = tx.amount_in_cents;
  let plan = "basica";
  if (monto >= 2000000) plan = "premium";

  const fechaVencimiento = new Date();
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);

  const { error } = await supabase
    .from("perfiles")
    .update({
      plan,
      fecha_vencimiento: fechaVencimiento.toISOString().split("T")[0],
    })
    .eq("id", miembroId);

  if (error) {
    console.error("Error activando membresía:", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }

  console.log(`Membresía ${plan} activada para miembro ${miembroId}`);

  const { error: pagoError } = await supabase.from("pagos").insert({
    miembro_id: miembroId,
    monto: Math.round(monto / 100),
    plan,
    referencia: tx.reference,
  });
  if (pagoError) console.error("Error registrando pago:", pagoError);

  // Validar si el referidor alcanzó 5 referidos activos → vitalicia
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/validar-referidos`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ miembro_id: miembroId }),
    });
  } catch (e) {
    console.error("Error llamando validar-referidos:", e);
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
});
