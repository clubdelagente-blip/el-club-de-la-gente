/* ============================================================
   EL CLUB DE LA GENTE — Módulo 3 · Lógica de checkout
   ============================================================ */
import { supabase } from './supabase.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

const PLANES_SIN_PAGO = ["gratis", "vitalicia"]; // se activan solos, no piden comprobante de pago
const fmt = new Intl.NumberFormat("es-CO");

let PLANES = {}; // se llena desde Supabase → { slug: fila de la tabla "planes" }

let estado = {
  plan: localStorage.getItem("ecdlg_plan") || "premium",
  metodo: "tarjeta",
};

let estadoPago = { plan: null, precio: 0, planLabel: "", miembroId: null };

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
  const estiloCard = esVitalicia ? ' style="border:2px solid #095544;background:#f0faf4;position:relative;"' : "";
  const colorVital = esVitalicia ? ' style="color:#095544"' : "";
  const dotVital = esVitalicia ? ' style="background:#095544"' : "";

  return `
    <article class="plan-pick${clase}" data-plan="${p.slug}"${estiloCard}>
      ${p.recomendado ? `<span class="plan-pick__badge-rec" id="badge-rec">Recomendado</span>` : ""}
      ${p.ribbon_texto ? `<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#095544;color:#fff;font-size:10px;font-weight:700;letter-spacing:.12em;padding:4px 14px;border-radius:99px;white-space:nowrap">${p.ribbon_texto}</div>` : ""}
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
      <div class="plan-pick__state"${esVitalicia ? ' style="color:#095544;border-color:#095544"' : ""}>${p.cta_texto || "Elegir"}</div>
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

/* ---------- Pago manual (Bre-B): muestra la llave del Club y pide comprobante ---------- */
async function cargarLlavePago() {
  const { data } = await supabase.from("configuracion").select("valor").eq("clave", "club_llave_pago").maybeSingle();
  return data?.valor || null;
}

async function abrirPagoManual(plan, card) {
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

  estadoPago = { plan, precio, planLabel: p.tag || p.nombre || plan, miembroId };
  estadoEl.textContent = textoOriginal;

  $("#pago-sub").textContent = `Vas a pagar tu membresía ${estadoPago.planLabel}.`;
  $("#pago-monto").textContent = fmt.format(precio) + " COP";
  $("#pago-llave").value = "Cargando…";
  $("#pago-comprobante").value = "";
  mostrar("view-pago", 3);

  const llave = await cargarLlavePago();
  $("#pago-llave").value = llave || "No configurada — escríbenos por WhatsApp";
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
      abrirPagoManual(plan, card);
    });
  });
}

function wirePago() {
  $("#pago-copiar")?.addEventListener("click", () => {
    const btn = $("#pago-copiar");
    navigator.clipboard.writeText($("#pago-llave")?.value || "").then(() => {
      const orig = btn.textContent;
      btn.textContent = "Copiada";
      setTimeout(() => { btn.textContent = orig; }, 2000);
    });
  });
  $("#pago-volver")?.addEventListener("click", () => mostrar("view-plan", 2));
  $("#pago-confirmar")?.addEventListener("click", async () => {
    const btn = $("#pago-confirmar");
    const file = $("#pago-comprobante")?.files?.[0];
    if (!file) { alert("Sube el comprobante de pago"); return; }
    btn.disabled = true; btn.textContent = "Enviando…";

    const ext = file.name.split(".").pop();
    const path = `comprobante-membresia-${estadoPago.miembroId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
    if (upErr) { alert("Error subiendo el comprobante"); btn.disabled = false; btn.textContent = "Confirmar pago"; return; }
    const comprobante_url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;

    const { error } = await supabase.from("solicitudes_membresia").insert({
      miembro_id: estadoPago.miembroId,
      plan: estadoPago.plan,
      monto: estadoPago.precio,
      comprobante_url,
    });
    if (error) { alert("Error: " + error.message); btn.disabled = false; btn.textContent = "Confirmar pago"; return; }

    localStorage.setItem("ecdlg_plan", estadoPago.plan);
    btn.disabled = false; btn.textContent = "Confirmar pago";
    mostrar("view-pendiente", 4);

    // Avisar al equipo para que revise el comprobante — fire-and-forget.
    supabase.from("configuracion").select("valor").eq("clave", "numero_admin_notificaciones").maybeSingle()
      .then(({ data }) => {
        if (!data?.valor) return;
        fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/whatsapp-send-3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: data.valor, body: `💳 Nueva solicitud de membresía ${estadoPago.planLabel} por ${fmt.format(estadoPago.precio)} COP. Revísala en Admin → Ventas.` }),
        }).catch(() => {});
      }).catch(() => {});
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
  // La vitalicia no se compra aquí — se gana con 5 referidos activos, no se
  // muestra como opción seleccionable en esta pantalla.
  renderTarjetas(data.filter(p => p.slug !== "vitalicia"));
  if (window.lucide) lucide.createIcons();
  pintarSeleccion();
  wireTarjetas();
  wirePago();
});
