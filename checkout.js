/* ============================================================
   EL CLUB DE LA GENTE — Módulo 3 · Lógica de checkout
   ============================================================ */
import { supabase } from './supabase.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];


const PLANES = {
  basica:    { tag: "Plan básica",           nombre: "Básica",    precio: 10000, precioTxt: "$10.000", antes: "$30.000", ahorra: "33%" },
  premium:   { tag: "Plan premium",          nombre: "Premium",   precio: 20000, precioTxt: "$20.000", antes: "$50.000", ahorra: "40%" },
  vitalicia: { tag: "Membresía vitalicia",   nombre: "Vitalicia", precio: 0,     precioTxt: "$0",      antes: "",        ahorra: "100%" },
};
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
    if (!card.dataset.plan) return; // tarjeta sin plan seleccionable (ej. Vitalicia)
    const on = card.dataset.plan === estado.plan;
    card.classList.toggle("is-selected", on);
    card.querySelector(".plan-pick__state").textContent = on ? "Seleccionado ✓" : "Elegir " + PLANES[card.dataset.plan].nombre;
  });
}

/* ---------- Resumen de pago ---------- */
function pintarResumen() {
  const p = PLANES[estado.plan];
  $("#res-tag").textContent = p.tag;
  $("#res-nombre").textContent = p.nombre;
  $("#res-precio").innerHTML = `${p.precioTxt}<small> /mes</small>`;
  $("#res-antes").textContent = "Antes " + p.antes;
  $("#res-ahorra").textContent = "Ahorro " + p.ahorra;
  $("#res-total").innerHTML = `${p.precioTxt}<small> /mes</small>`;
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  // Capturar ID del miembro si viene desde el agente de WhatsApp
  const urlId = new URLSearchParams(location.search).get("id");
  if (urlId) localStorage.setItem("ecdlg_miembro_id", urlId);

  pintarSeleccion();
  mostrar("view-plan", 2);

  // Elegir plan
  $$(".plan-pick").forEach(card => {
    card.addEventListener("click", () => { estado.plan = card.dataset.plan; pintarSeleccion(); });
  });

  // Continuar al pago
  $("#btn-continuar").addEventListener("click", () => {
    localStorage.setItem("ecdlg_plan", estado.plan);
    if (estado.plan === "vitalicia") {
      location.href = "Perfil.html?activar=vitalicia";
      return;
    }
    pintarResumen();
    mostrar("view-pago", 3);
  });

  // Volver a planes
  $("#btn-cambiar-plan").addEventListener("click", () => mostrar("view-plan", 2));

  // Métodos de pago
  $$(".metodo").forEach(m => m.addEventListener("click", () => {
    estado.metodo = m.dataset.metodo;
    $$(".metodo").forEach(x => x.classList.toggle("is-on", x === m));
  }));

  // Confirmar y pagar — Wompi
  $("#form-pago").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#btn-pagar");
    btn.disabled = true;
    btn.innerHTML = `Un momento…`;

    const p = PLANES[estado.plan];
    const amountInCents = p.precio * 100;
    const miembroId = localStorage.getItem("ecdlg_miembro_id") || localStorage.getItem("ecdlg_uid") || "unknown";
    const reference = `ECDLG-${miembroId}-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
    const currency = "COP";

    const cadena = `${reference}${amountInCents}${currency}test_integrity_aTSPYcCp7kbu6kNCp8q9Q7TEmXPXceoh`;
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cadena));
    const integrity = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,"0")).join("");

    btn.disabled = false;
    btn.innerHTML = `Confirmar y pagar <span class="ar">&rarr;</span>`;

    const checkout = new window.WidgetCheckout({
      currency,
      amountInCents,
      reference,
      publicKey: "pub_test_yuvhTaT4Bg2JmPbJuxpeuodluZUX7HyE",
      signature: { integrity },
      redirectUrl: `https://clubdelagente-blip.github.io/el-club-de-la-gente/Perfil.html?activar=${estado.plan}`,
    });

    checkout.open((result) => {
      const tx = result.transaction;
      if (tx && tx.status === "APPROVED") {
        localStorage.setItem("ecdlg_plan", estado.plan);
        location.href = "Perfil.html?activar=" + estado.plan;
      }
    });
  });
});
