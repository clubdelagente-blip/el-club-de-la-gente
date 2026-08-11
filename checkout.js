/* ============================================================
   EL CLUB DE LA GENTE — Módulo 3 · Lógica de checkout
   ============================================================ */
import { supabase } from './supabase.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];


const PLANES = {
  gratis:    { tag: "Plan gratis",           nombre: "Gratis",    precio: 0,     precioTxt: "$0",      antes: "",        ahorra: "" },
  basica:    { tag: "Plan básica",           nombre: "Básica",    precio: 10000, precioTxt: "$10.000", antes: "$30.000", ahorra: "33%" },
  premium:   { tag: "Plan premium",          nombre: "Premium",   precio: 20000, precioTxt: "$20.000", antes: "$50.000", ahorra: "40%" },
  vitalicia: { tag: "Membresía vitalicia",   nombre: "Vitalicia", precio: 0,     precioTxt: "$0",      antes: "",        ahorra: "100%" },
};
const PLANES_SIN_PAGO = ["gratis", "vitalicia"]; // se activan solos, no pasan por Wompi
const fmt = new Intl.NumberFormat("es-CO");

let estado = {
  plan: localStorage.getItem("ecdlg_plan") || "premium",
  metodo: "tarjeta",
};

/* ---------- Stepper ---------- */
function setWizard(step) {
  // step: 2 (plan), 3 (pago), 4 (listo)
  $$(".wstep").forEach(el => {
    const n = +el.dataset.step;
    el.classList.toggle("done", n < step);
    el.classList.toggle("active", n === step);
  });
}

/* ---------- Vistas ---------- */
function mostrar(id, step) {
  $$(".checkout-view").forEach(v => v.classList.toggle("is-active", v.id === id));
  setWizard(step);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Selección de plan ---------- */
function pintarSeleccion() {
  $$(".plan-pick").forEach(card => {
    if (!card.dataset.plan) return; // tarjeta sin plan seleccionable
    const on = card.dataset.plan === estado.plan;
    card.classList.toggle("is-selected", on);
    card.querySelector(".plan-pick__state").textContent = on ? "Seleccionado ✓" : "Elegir " + PLANES[card.dataset.plan].nombre;
  });
}

/* ---------- Wompi: abre la pasarela directo desde la tarjeta del plan ---------- */
async function abrirWompi(plan, card) {
  const estadoEl = card.querySelector(".plan-pick__state");
  const textoOriginal = estadoEl.textContent;
  estadoEl.textContent = "Un momento…";

  const p = PLANES[plan];
  const amountInCents = p.precio * 100;
  const miembroId = localStorage.getItem("ecdlg_miembro_id") || localStorage.getItem("ecdlg_uid") || "unknown";
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
    redirectUrl: `https://clubdelagente-blip.github.io/el-club-de-la-gente/Perfil.html?activar=${plan}`,
  });

  checkout.open((result) => {
    const tx = result.transaction;
    if (tx && tx.status === "APPROVED") {
      localStorage.setItem("ecdlg_plan", plan);
      location.href = "Perfil.html?activar=" + plan;
    }
  });
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  // Capturar ID del miembro si viene desde el agente de WhatsApp
  const urlId = new URLSearchParams(location.search).get("id");
  if (urlId) localStorage.setItem("ecdlg_miembro_id", urlId);

  pintarSeleccion();
  mostrar("view-plan", 2);

  // Elegir plan: básica/premium van directo a Wompi, gratis/vitalicia se activan solos
  $$(".plan-pick").forEach(card => {
    if (!card.dataset.plan) return;
    card.addEventListener("click", () => {
      const plan = card.dataset.plan;
      estado.plan = plan;
      pintarSeleccion();
      localStorage.setItem("ecdlg_plan", plan);

      if (PLANES_SIN_PAGO.includes(plan)) {
        location.href = "Perfil.html?activar=" + plan;
        return;
      }
      abrirWompi(plan, card);
    });
  });
});
