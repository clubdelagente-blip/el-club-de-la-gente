/* ============================================================
   EL CLUB DE LA GENTE — Módulo 3 · Lógica de checkout
   ============================================================ */
import { supabase } from './supabase.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const PLANES_SIN_PAGO = ["gratis", "vitalicia"]; // se activan solos, no pasan por Wompi
const fmt = new Intl.NumberFormat("es-CO");

let PLANES = {}; // se llena desde Supabase → { slug: fila de la tabla "planes" }

let estado = {
  plan: localStorage.getItem("ecdlg_plan") || "premium",
  metodo: "tarjeta",
};

/* ---------- Vistas ---------- */
function setWizard(step) {
  $$(".wstep").forEach(el => {
    const n = +el.dataset.step;
    el.classList.toggle("done", n < step);
    el.classList.toggle("active", n === step);
  });
}
function mostrar(id, step) {
  $$(".checkout-view").forEach(v => v.classList.toggle("is-active", v.id === id));
  setWizard(step);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Carga de planes desde Supabase ---------- */
async function cargarPlanes() {
  const { data, error } = await supabase.from("planes").select("*").order("orden");
  if (error || !data || !data.length) return false;
  PLANES = {};
  data.forEach(p => { PLANES[p.slug] = p; });
  return data;
}

function tarjetaHtml(p) {
  const esVitalicia = p.slug === "vitalicia";
  const esPremium = p.slug === "premium";
  const clase = esPremium ? " plan-pick--premium" : esVitalicia ? " plan-pick--vitalicia" : "";
  const estiloCard = esVitalicia ? ' style="border:2px solid #1a7a3c;background:#f0faf4;position:relative;"' : "";
  const colorVital = esVitalicia ? ' style="color:#1a7a3c"' : "";
  const dotVital = esVitalicia ? ' style="background:#1a7a3c"' : "";

  return `
    <article class="plan-pick${clase}" data-plan="${p.slug}"${estiloCard}>
      ${p.recomendado ? `<span class="plan-pick__badge-rec" id="badge-rec">Recomendado</span>` : ""}
      ${p.ribbon_texto ? `<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#1a7a3c;color:#fff;font-size:10px;font-weight:700;letter-spacing:.12em;padding:4px 14px;border-radius:99px;white-space:nowrap">${p.ribbon_texto}</div>` : ""}
      ${p.urgencia_texto ? `<div style="font-size:11px;font-weight:700;color:#b45309;background:#fef3c7;border-radius:8px;padding:6px 10px;margin-bottom:12px;text-align:center">${p.urgencia_texto}</div>` : ""}
      <div class="plan-pick__head">
        <span class="plan-pick__tag"${colorVital}>${p.tag}</span>
        ${esVitalicia ? "" : '<span class="radio"></span>'}
      </div>
      ${(p.antes_texto || p.ahorra_texto) ? `<div class="plan-pick__precio-row">
        ${p.antes_texto ? `<span class="plan-pick__antes">${p.antes_texto}</span>` : ""}
        ${p.ahorra_texto ? `<span class="plan-pick__ahorra">${p.ahorra_texto}</span>` : ""}
      </div>` : ""}
      <div class="plan-pick__precio"${colorVital}>${p.precio_texto}<small> ${p.precio_sufijo || ""}</small></div>
      <div class="plan-pick__ciclo">${p.ciclo_texto || ""}</div>
      <ul class="plan-pick__bens">
        ${(p.beneficios || []).map(b => `<li><span class="dot"${dotVital}></span>${b}</li>`).join("")}
      </ul>
      <div class="plan-pick__state"${esVitalicia ? ' style="color:#1a7a3c;border-color:#1a7a3c"' : ""}>${p.cta_texto || "Elegir"}</div>
    </article>`;
}

function renderTarjetas(lista) {
  $("#plan-grid").innerHTML = lista.map(tarjetaHtml).join("");
}

/* ---------- Selección de plan ---------- */
function pintarSeleccion() {
  $$(".plan-pick").forEach(card => {
    if (!card.dataset.plan) return;
    const p = PLANES[card.dataset.plan];
    if (!p) return;
    const on = card.dataset.plan === estado.plan;
    card.classList.toggle("is-selected", on);
    card.querySelector(".plan-pick__state").textContent = on ? "Seleccionado ✓" : (p.cta_texto || "Elegir " + (p.nombre || p.tag));
  });
}

/* ---------- Wompi: abre la pasarela directo desde la tarjeta del plan ---------- */
async function abrirWompi(plan, card) {
  const p = PLANES[plan];
  const precio = Number(p?.precio);
  if (!p || !Number.isFinite(precio) || precio <= 0) {
    alert("Este plan no tiene un precio configurado correctamente. Escríbenos por WhatsApp para activarlo manualmente.");
    return;
  }

  const estadoEl = card.querySelector(".plan-pick__state");
  const textoOriginal = estadoEl.textContent;
  estadoEl.textContent = "Un momento…";

  const { data: { session } } = await supabase.auth.getSession();
  const miembroId = session?.user?.id;
  if (!miembroId) {
    estadoEl.textContent = textoOriginal;
    alert("Debes iniciar sesión antes de pagar. Vuelve a intentarlo desde tu perfil.");
    return;
  }

  const amountInCents = precio * 100;
  const reference = `ECDLG-${miembroId}-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
  const currency = "COP";

  const cadena = `${reference}${amountInCents}${currency}test_integrity_aTSPYcCp7kbu6kNCp8q9Q7TEmXPXceoh`;
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cadena));
  const integrity = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,"0")).join("");

  estadoEl.textContent = textoOriginal;

  const checkout = new window.WidgetCheckout({
    currency,
    amountInCents,
    reference,
    publicKey: "pub_test_yuvhTaT4Bg2JmPbJuxpeuodluZUX7HyE",
    signature: { integrity },
    redirectUrl: `https://clubdelagente-blip.github.io/el-club-de-la-gente/Perfil.html?activar=${plan}&nuevo=1`,
  });

  checkout.open((result) => {
    const tx = result.transaction;
    if (tx && tx.status === "APPROVED") {
      localStorage.setItem("ecdlg_plan", plan);
      location.href = "Perfil.html?activar=" + plan + "&nuevo=1";
    }
  });
}

function wireTarjetas() {
  $$(".plan-pick").forEach(card => {
    if (!card.dataset.plan) return;
    card.addEventListener("click", () => {
      const plan = card.dataset.plan;
      estado.plan = plan;
      pintarSeleccion();
      localStorage.setItem("ecdlg_plan", plan);

      if (PLANES_SIN_PAGO.includes(plan)) {
        location.href = "Perfil.html?activar=" + plan + "&nuevo=1";
        return;
      }
      abrirWompi(plan, card);
    });
  });
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  if (window.lucide) lucide.createIcons();

  // Capturar ID del miembro si viene desde el agente de WhatsApp
  const urlId = new URLSearchParams(location.search).get("id");
  if (urlId) localStorage.setItem("ecdlg_miembro_id", urlId);

  mostrar("view-plan", 2);

  const data = await cargarPlanes();
  if (!data) {
    $("#plan-grid").innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 0;color:var(--tinta-45)">
      No pudimos cargar los planes en este momento. Intenta de nuevo en unos minutos.
    </div>`;
    return;
  }
  renderTarjetas(data);
  if (window.lucide) lucide.createIcons();
  pintarSeleccion();
  wireTarjetas();
});
