// generar-clubcard — El Club de la Gente
// Supabase Edge Function · JWT: OFF
// Genera y envía por email el diseño de la ClubCard al recibir un pago aprobado

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const DESTINO = "clubdelagente@gmail.com";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { miembro_id, plan } = await req.json();
  if (!miembro_id) return new Response("miembro_id requerido", { status: 400 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: perfil, error } = await supabase
    .from("perfiles")
    .select("nombre, whatsapp, fecha_vencimiento")
    .eq("id", miembro_id)
    .single();

  if (error || !perfil) {
    console.error("Perfil no encontrado:", error);
    return new Response("Perfil no encontrado", { status: 404 });
  }

  const nombre = (perfil.nombre ?? "MIEMBRO").toUpperCase();
  const codigo = perfil.whatsapp ?? "—";
  const fechaRenovacion = perfil.fecha_vencimiento
    ? new Date(perfil.fecha_vencimiento).toLocaleDateString("es-CO", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : "—";

  const qrData = encodeURIComponent(`https://elclubdelagente.com/Verificar.html?id=${miembro_id}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${qrData}`;
  const planLabel = plan === "premium" ? "Premium" : "Básica";

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#F4F1EA;font-family:Arial,sans-serif;">

<p style="text-align:center;font-size:13px;color:#555;margin:0 0 8px;">
  Nueva ClubCard generada · Plan <strong>${planLabel}</strong>
</p>
<p style="text-align:center;font-size:11px;color:#999;margin:0 0 28px;">
  Imprimir y entregar al miembro
</p>

<!-- ── FRENTE ── -->
<p style="text-align:center;font-size:10px;color:#999;letter-spacing:.2em;margin:0 0 8px;">FRENTE</p>
<table cellpadding="0" cellspacing="0" width="440" style="margin:0 auto 6px;background:#0a0a0a;border-radius:14px;overflow:hidden;">
  <tr><td style="padding:3px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid rgba(244,241,234,.45);border-radius:10px;">
      <tr><td style="padding:28px 36px 22px;">

        <!-- Brand -->
        <p style="margin:0 0 18px;text-align:center;color:rgba(244,241,234,.9);font-size:10px;font-weight:700;letter-spacing:.42em;font-family:Arial,sans-serif;">C L U B C A R D</p>

        <!-- Medio: logo + código -->
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="vertical-align:middle;width:55%;">
              <p style="margin:0;color:rgba(244,241,234,.6);font-size:7px;font-weight:700;letter-spacing:.35em;font-family:Georgia,serif;">EL</p>
              <p style="margin:0;color:#F4F1EA;font-size:16px;font-weight:700;letter-spacing:.04em;font-family:Georgia,serif;line-height:1.1;">CLUB DE LA</p>
              <p style="margin:0;color:#F4F1EA;font-size:26px;font-weight:700;letter-spacing:.02em;font-family:Georgia,serif;line-height:1.05;">GENTE</p>
            </td>
            <td style="vertical-align:middle;text-align:right;width:45%;">
              <p style="margin:0;color:rgba(244,241,234,.55);font-size:8px;letter-spacing:.18em;font-family:Arial,sans-serif;">CÓDIGO</p>
              <p style="margin:5px 0 0;color:#F4F1EA;font-size:13px;font-weight:600;letter-spacing:.05em;font-family:Arial,sans-serif;">${codigo}</p>
            </td>
          </tr>
        </table>

        <!-- Nombre -->
        <p style="margin:18px 0 0;color:#F4F1EA;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-family:Arial,sans-serif;">${nombre}</p>

      </td></tr>
    </table>
  </td></tr>
</table>

<!-- ── REVERSO ── -->
<p style="text-align:center;font-size:10px;color:#999;letter-spacing:.2em;margin:20px 0 8px;">REVERSO</p>
<table cellpadding="0" cellspacing="0" width="440" style="margin:0 auto 32px;background:#0a0a0a;border-radius:14px;overflow:hidden;">
  <tr><td style="padding:3px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid rgba(244,241,234,.45);border-radius:10px;">
      <tr><td style="padding:28px 36px;text-align:center;">
        <p style="margin:0 0 14px;color:rgba(244,241,234,.3);font-size:10px;letter-spacing:.4em;font-family:Arial,sans-serif;">─ ✦ ─</p>
        <img src="${qrUrl}" width="92" height="92" alt="QR ClubCard" style="background:#fff;padding:6px;border-radius:6px;display:block;margin:0 auto;" />
        <p style="margin:12px 0 0;color:rgba(244,241,234,.78);font-size:11px;font-family:Arial,sans-serif;">
          Renovación: <strong style="color:#F4F1EA;">${fechaRenovacion}</strong>
        </p>
        <p style="margin:14px 0 0;color:rgba(244,241,234,.3);font-size:10px;letter-spacing:.4em;font-family:Arial,sans-serif;">─ ✦ ─</p>
      </td></tr>
    </table>
  </td></tr>
</table>

<p style="text-align:center;font-size:11px;color:#aaa;margin:0;">
  ID miembro: ${miembro_id}
</p>

</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "El Club de la Gente <clubcard@elclubdelagente.com>",
      to: [DESTINO],
      subject: `Nueva ClubCard — ${nombre} · ${planLabel}`,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Error Resend:", await res.text());
    return new Response("Error enviando email", { status: 500 });
  }

  console.log(`ClubCard enviada para ${nombre} (${miembro_id})`);
  return new Response("OK", { status: 200 });
});
