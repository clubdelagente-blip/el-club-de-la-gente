// generar-clubcard — El Club de la Gente
// Supabase Edge Function · JWT: OFF
// Renderiza la ClubCard como imagen via HCTI y la envía por email con adjunto descargable

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const HCTI_USER_ID = Deno.env.get("HCTI_USER_ID")!;
const HCTI_API_KEY = Deno.env.get("HCTI_API_KEY")!;
const DESTINO = "clubdelagente@gmail.com";
const BASE = "https://elclubdelagente.com";

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function buildCardHtml(nombre: string, codigo: string, fechaRenovacion: string, qrUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #F4F1EA; padding: 24px; width: 520px; }
.label { text-align:center; font-family:Arial,sans-serif; font-size:9px; color:#aaa; letter-spacing:.25em; text-transform:uppercase; margin-bottom:8px; }
.card-wrap { position:relative; width:100%; padding-top:63%; border-radius:14px; overflow:hidden; margin-bottom:20px;
  background:radial-gradient(120% 140% at 50% 0%,#161616 0%,#0a0a0a 60%,#050505 100%); isolation:isolate; }
.frame { position:absolute; inset:0; width:100%; height:100%; object-fit:fill;
  filter:invert(1) saturate(0) brightness(12) contrast(10); mix-blend-mode:screen; z-index:1; }
.front { position:absolute; inset:0; padding:9% 11% 13%; display:flex; flex-direction:column; z-index:2; mix-blend-mode:screen; }
.brand { text-align:center; font-family:Arial,sans-serif; font-size:12px; font-weight:700;
  letter-spacing:.42em; color:#D4AF37; margin-top:5%; }
.mid { flex:1; display:flex; align-items:center; justify-content:center; }
.logo { width:42%; max-width:148px; filter:invert(1); object-fit:contain; display:block; margin:0 auto; }
.footer { display:flex; align-items:flex-end; justify-content:space-between; gap:6px; }
.name { font-family:Arial,sans-serif; font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#D4AF37; }
.cod-lbl { display:block; font-family:Arial,sans-serif; font-size:9px; color:rgba(212,175,55,.65); text-align:right; }
.cod-val { display:block; font-family:Arial,sans-serif; font-size:12px; font-weight:600; color:#D4AF37; }
.back { position:absolute; inset:0; padding:10% 11%; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:5%; z-index:2; }
.qr-box { width:88px; height:88px; background:#fff; border-radius:6px; padding:5px;
  display:flex; align-items:center; justify-content:center; }
.renov { font-family:Arial,sans-serif; font-size:12px; color:rgba(212,175,55,.8); }
.renov strong { color:#D4AF37; }
</style>
</head>
<body>
<div id="card-render">

  <p class="label">Frente</p>
  <div class="card-wrap">
    <img class="frame" src="${BASE}/marco-card.png" alt="">
    <div class="front">
      <div class="brand">C L U B C A R D</div>
      <div class="mid">
        <img class="logo" src="${BASE}/logo-club.png" alt="El Club de la Gente">
      </div>
      <div class="footer">
        <div class="name">${nombre}</div>
        <div>
          <span class="cod-lbl">Código:</span>
          <span class="cod-val">${codigo}</span>
        </div>
      </div>
    </div>
  </div>

  <p class="label">Reverso</p>
  <div class="card-wrap">
    <img class="frame" src="${BASE}/marco-ornamento.png" alt="">
    <div class="back">
      <div class="qr-box">
        <img src="${qrUrl}" width="78" height="78" alt="QR ClubCard">
      </div>
      <div class="renov">Renovación: <strong>${fechaRenovacion}</strong></div>
    </div>
  </div>

</div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

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
  const planLabel = plan === "premium" ? "Premium" : "Básica";

  const qrData = encodeURIComponent(`${BASE}/Verificar.html?id=${miembro_id}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${qrData}`;

  // Renderizar tarjeta como imagen
  const hctiRes = await fetch("https://hcti.io/v1/image", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${HCTI_USER_ID}:${HCTI_API_KEY}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      html: buildCardHtml(nombre, codigo, fechaRenovacion, qrUrl),
      selector: "#card-render",
      viewport_width: 568,
      device_scale_factor: 2,
      ms_delay: 800,
    }),
  });

  if (!hctiRes.ok) {
    console.error("Error HCTI:", await hctiRes.text());
    return new Response("Error generando imagen de tarjeta", { status: 500 });
  }

  const { url: cardImageUrl } = await hctiRes.json();

  // Descargar imagen para adjuntar al email
  const imgBuffer = await (await fetch(cardImageUrl)).arrayBuffer();
  const imgBase64 = toBase64(imgBuffer);

  const nombreSlug = nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/g, "");
  const filename = `clubcard-${nombreSlug}.png`;

  // Enviar email con imagen visible + adjunto descargable
  const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:32px 16px;background:#F4F1EA;font-family:Arial,sans-serif;">
  <p style="text-align:center;font-size:13px;color:#555;margin:0 0 6px;">
    Nueva ClubCard generada · Plan <strong>${planLabel}</strong>
  </p>
  <p style="text-align:center;font-size:11px;color:#999;margin:0 0 24px;">
    Imprimir y entregar al miembro · El archivo PNG viene adjunto
  </p>
  <div style="text-align:center;">
    <img src="${cardImageUrl}" alt="ClubCard ${nombre}"
      style="max-width:520px;width:100%;border-radius:10px;display:inline-block;">
  </div>
  <p style="text-align:center;font-size:11px;color:#bbb;margin:20px 0 0;">
    ID: ${miembro_id}
  </p>
</body>
</html>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "El Club de la Gente <clubcard@elclubdelagente.com>",
      to: [DESTINO],
      subject: `Nueva ClubCard — ${nombre} · ${planLabel}`,
      html: emailHtml,
      attachments: [{ filename, content: imgBase64 }],
    }),
  });

  if (!resendRes.ok) {
    console.error("Error Resend:", await resendRes.text());
    return new Response("Error enviando email", { status: 500 });
  }

  console.log(`ClubCard enviada para ${nombre} (${miembro_id})`);
  return new Response("OK", { status: 200 });
});
