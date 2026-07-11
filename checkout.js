/* ============================================================
   EL CLUB DE LA GENTE — Módulo 3 · Lógica de checkout
   ============================================================ */

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const SB_URL = "https://egwaedadpqfwnbfosiao.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2FlZGFkcHFmd25iZm9zaWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njc2ODcsImV4cCI6MjA5NjM0MzY4N30.NrBPX8HhTcs_y-QG3o_GoEAednFc0TqUunkQe1dblT4";

async function actualizarPlanSupabase(plan) {
  try {
    const raw = localStorage.getItem("sb-egwaedadpqfwnbfosiao-auth-token");
    if (!raw) return;
    const { access_token, user } = JSON.parse(raw);
    if (!access_token || !user?.id) return;
    await fetch(`${SB_URL}/rest/v1/perfiles?id=eq.${user.id}`, {
      method: "PATCH",
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ plan }),
    });
  } catch (_) {}
}

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

  // Form de envío solo para Premium
  $("#envio-premium").classList.toggle("oculto", estado.plan !== "premium");
}

/* ---------- ClubCard de éxito (personalizable) ---------- */
function setCardPreview() {
  const nombre = ($("#cc-in-nombre").value || "").trim();
  const apellido = ($("#cc-in-apellido").value || "").trim();
  const codigo = ($("#cc-in-codigo").value || "").trim();
  const full = `${nombre} ${apellido}`.trim();
  $("#cc-prev-name").textContent = full ? full.toUpperCase() : "TU NOMBRE";
  $("#cc-prev-codigo").textContent = codigo || "300 000 0000";
}
function pintarClubcard() {
  const perfil = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
  const num = ("0000" + Math.floor(1000 + Math.random() * 8999)).slice(-4);
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const hoy = new Date();
  const desde = `${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;

  // Prefill desde el registro
  const partes = (perfil.nombre || "").trim().split(/\s+/).filter(Boolean);
  if ($("#cc-in-nombre") && partes.length) {
    $("#cc-in-nombre").value = partes[0] || "";
    $("#cc-in-apellido").value = partes.slice(1).join(" ") || "";
  }
  if ($("#cc-in-codigo") && perfil.whatsapp) $("#cc-in-codigo").value = perfil.whatsapp;

  // Fecha de renovación: hoy + 1 año (dd/mm)
  const ren = new Date(hoy); ren.setFullYear(ren.getFullYear() + 1);
  if ($("#cc-renueva")) $("#cc-renueva").textContent = `${String(ren.getDate()).padStart(2,"0")}/${String(ren.getMonth()+1).padStart(2,"0")}`;

  setCardPreview();
  localStorage.setItem("ecdlg_miembro", JSON.stringify({ num, plan: estado.plan, desde }));
  localStorage.removeItem("ecdlg_segmentado");

  // Premium muestra la tarjeta física personalizable; básica la oculta
  $("#exito-clubcard").style.display = estado.plan === "premium" ? "block" : "none";
}
function confirmarClubcard() {
  const nombre = ($("#cc-in-nombre").value || "").trim();
  const apellido = ($("#cc-in-apellido").value || "").trim();
  const codigo = ($("#cc-in-codigo").value || "").trim();
  const full = `${nombre} ${apellido}`.trim() || "Miembro del Club";
  // Persistir para el perfil
  const m = JSON.parse(localStorage.getItem("ecdlg_miembro") || "{}");
  m.nombreTarjeta = full; m.codigo = codigo;
  localStorage.setItem("ecdlg_miembro", JSON.stringify(m));
  const perfil = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
  perfil.nombre = full; perfil.primerNombre = nombre || full.split(" ")[0]; perfil.codigo = codigo;
  localStorage.setItem("ecdlg_perfil", JSON.stringify(perfil));

  $("#cc-flip").classList.add("is-back");
  $("#cc-perso").classList.add("cc-perso--done");
  $("#form-clubcard").hidden = true;
  $("#cc-plazo").hidden = false;
  if (window.lucide) lucide.createIcons();
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
  $("#btn-continuar").addEventListener("click", async () => {
    localStorage.setItem("ecdlg_plan", estado.plan);
    if (estado.plan === "vitalicia") {
      await actualizarPlanSupabase("vitalicia");
      location.href = "Perfil.html";
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

    const checkout = new WidgetCheckout({
      currency,
      amountInCents,
      reference,
      publicKey: "pub_test_yuvhTaT4Bg2JmPbJuxpeuodluZUX7HyE",
      signature: { integrity },
      redirectUrl: "https://clubdelagente-blip.github.io/el-club-de-la-gente/Perfil.html?nuevo=1",
    });

    checkout.open(async (result) => {
      const tx = result.transaction;
      if (tx && tx.status === "APPROVED") {
        localStorage.setItem("ecdlg_plan", estado.plan);
        await actualizarPlanSupabase(estado.plan);
        pintarClubcard();
        mostrar("view-exito", 4);
        if (window.lucide) lucide.createIcons();
      }
    });
  });

  // Personalización de la ClubCard (vista previa en vivo)
  ["cc-in-nombre", "cc-in-apellido", "cc-in-codigo"].forEach(id => {
    $("#" + id)?.addEventListener("input", setCardPreview);
  });
  $("#form-clubcard")?.addEventListener("submit", (e) => { e.preventDefault(); confirmarClubcard(); });
});
