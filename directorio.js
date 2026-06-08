/* ============================================================
   EL CLUB DE LA GENTE — Módulo 5
   Directorio QR · buscador · filtros · calculadora de ahorro
   (reutiliza tokens, botones, sheet y toast de styles.css)
   ============================================================ */

/* ---------- DATOS: ALIADOS (con grupo de filtro) ---------- */
const ALIADOS = [
  {
    nombre: "Sonrisa Sana", categoria: "Odontología", grupo: "Salud", icon: "smile", pct: "25%",
    foto: "Fachada / consultorio de Sonrisa Sana",
    desc: "Odontología integral y estética dental en el centro de Fusagasugá. Limpieza, ortodoncia y blanqueamiento con tarifas preferenciales para miembros del Club.",
    descuentos: [
      { pct: "25%", nombre: "Limpieza y profilaxis", desc: "Sobre el valor regular de la consulta" },
      { pct: "15%", nombre: "Ortodoncia y brackets", desc: "Aplica al plan completo de tratamiento" },
    ],
  },
  {
    nombre: "Bienestar Integral Spa", categoria: "Bienestar y salud", grupo: "Salud", icon: "heart-pulse", pct: "20%",
    foto: "Sala de masajes de Bienestar Integral Spa",
    desc: "Centro de relajación y terapias corporales. Masajes, faciales y rutinas de bienestar pensadas para liberar el estrés de la semana.",
    descuentos: [
      { pct: "20%", nombre: "Masaje relajante 60 min", desc: "De lunes a jueves" },
      { pct: "10%", nombre: "Paquetes de 4 sesiones", desc: "Acumulable con otras promociones" },
    ],
  },
  {
    nombre: "Fusa Aventura Tours", categoria: "Turismo", grupo: "Turismo", icon: "mountain-snow", pct: "15%",
    foto: "Plan de aventura al aire libre en Sumapaz",
    desc: "Experiencias de naturaleza y aventura en la región del Sumapaz: senderismo, cascadas y planes de fin de semana para toda la familia.",
    descuentos: [
      { pct: "15%", nombre: "Planes de día completo", desc: "Por persona, mínimo 2 cupos" },
      { pct: "12%", nombre: "Tours familiares", desc: "Grupos de 4 o más personas" },
    ],
  },
  {
    nombre: "Patitas Felices", categoria: "Veterinaria", grupo: "Mascotas", icon: "paw-print", pct: "30%",
    foto: "Consultorio veterinario de Patitas Felices",
    desc: "Veterinaria y tienda de mascotas. Consulta general, vacunación, baño y guardería para que tu compañero esté siempre sano.",
    descuentos: [
      { pct: "30%", nombre: "Consulta + vacunación", desc: "Primera visita del mes" },
      { pct: "20%", nombre: "Baño y peluquería", desc: "Todos los días" },
    ],
  },
  {
    nombre: "Mercado del Campo", categoria: "Canasta familiar", grupo: "Alimentos", icon: "shopping-basket", pct: "12%",
    foto: "Puesto de frutas y verduras de Mercado del Campo",
    desc: "Fruver y mercado campesino con producto fresco de la región. La canasta familiar de la semana a precio justo.",
    descuentos: [
      { pct: "12%", nombre: "Mercado superior a $80.000", desc: "Pago en efectivo o Nequi" },
      { pct: "8%", nombre: "Frutas y verduras", desc: "Todos los días" },
    ],
  },
  {
    nombre: "Estilo Propio", categoria: "Ropa personalizada", grupo: "Negocios", icon: "shirt", pct: "20%",
    foto: "Taller de estampado de Estilo Propio",
    desc: "Ropa y estampados personalizados. Camisetas, uniformes y detalles para tu marca o tu equipo, hechos en Fusagasugá.",
    descuentos: [
      { pct: "20%", nombre: "Estampado personalizado", desc: "Desde 1 prenda" },
      { pct: "15%", nombre: "Pedidos por mayor", desc: "Más de 10 unidades" },
    ],
  },
  {
    nombre: "Heladería La Sumapaz", categoria: "Heladería", grupo: "Alimentos", icon: "ice-cream", pct: "2x1",
    foto: "Vitrina de helados de La Sumapaz",
    desc: "Heladería artesanal con sabores de la región. El plan perfecto para la tarde, ahora con beneficios para miembros.",
    descuentos: [
      { pct: "2x1", nombre: "Conos artesanales", desc: "Martes y miércoles" },
      { pct: "15%", nombre: "Malteadas y postres", desc: "Todos los días" },
    ],
  },
  {
    nombre: "El Buen Sabor", categoria: "Comida rápida", grupo: "Alimentos", icon: "sandwich", pct: "25%",
    foto: "Mostrador de El Buen Sabor",
    desc: "Hamburguesas, perros y comida rápida casera. Porciones generosas y precios de barrio para todos los miembros.",
    descuentos: [
      { pct: "25%", nombre: "Combo del día", desc: "De domingo a jueves" },
      { pct: "10%", nombre: "Pedidos a domicilio", desc: "Dentro del casco urbano" },
    ],
  },
  {
    nombre: "Barbería Don Carlos", categoria: "Barbería", grupo: "Cuidado personal", icon: "scissors", pct: "30%",
    foto: "Silla y espejo de Barbería Don Carlos",
    desc: "Cortes clásicos y modernos, arreglo de barba y cuidado personal. Tradición de barrio con estilo.",
    descuentos: [
      { pct: "30%", nombre: "Corte + barba", desc: "De lunes a miércoles" },
      { pct: "20%", nombre: "Corte clásico", desc: "Todos los días" },
    ],
  },
];

const GRUPOS = ["Todos", "Salud", "Turismo", "Alimentos", "Cuidado personal", "Mascotas", "Negocios"];

/* ---------- HELPERS ---------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const ic = (n) => `<i data-lucide="${n}"></i>`;
const nf = new Intl.NumberFormat("es-CO");
const fmtCOP = (n) => "$" + nf.format(Math.max(0, Math.round(n || 0)));
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/* "25%" → 0.25 · "2x1" → 0.5 (pagas 1 de 2) */
function pctFrac(p) {
  if (/x/i.test(p)) { const [a, b] = p.toLowerCase().split("x").map(Number); return a && b ? (a - b) / a : 0.5; }
  return (parseFloat(p) || 0) / 100;
}

/* ---------- SUPABASE (REST directo para no requerir módulo) ---------- */
const SB_URL = "https://egwaedadpqfwnbfosiao.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2FlZGFkcHFmd25iZm9zaWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njc2ODcsImV4cCI6MjA5NjM0MzY4N30.NrBPX8HhTcs_y-QG3o_GoEAednFc0TqUunkQe1dblT4";
const MIEMBRO_ID = new URLSearchParams(location.search).get("miembro");
const MIEMBRO_WA = new URLSearchParams(location.search).get("wa") || "";

async function registrarDescuento({ aliado_nombre, categoria, descuento_pct, compra, ahorro }) {
  if (!MIEMBRO_ID) return false;
  const res = await fetch(`${SB_URL}/rest/v1/descuentos`, {
    method: "POST",
    headers: {
      "apikey": SB_KEY,
      "Authorization": "Bearer " + SB_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({ miembro_id: MIEMBRO_ID, aliado_nombre, categoria, descuento_pct, compra, ahorro })
  });
  return res.ok;
}

/* ---------- ESTADO ---------- */
let filtroActivo = "Todos";
let query = "";

/* ---------- RENDER FILTROS ---------- */
function renderFiltros() {
  $("#dir-filtros").innerHTML = GRUPOS.map(g =>
    `<button class="dir-chip${g === filtroActivo ? " is-on" : ""}" data-grupo="${g}">${g}</button>`
  ).join("");
}

/* ---------- RENDER GRID ---------- */
function aliadosFiltrados() {
  const q = norm(query.trim());
  return ALIADOS.map((a, i) => ({ ...a, _i: i })).filter(a => {
    const okGrupo = filtroActivo === "Todos" || a.grupo === filtroActivo;
    const okQ = !q || norm(a.nombre).includes(q) || norm(a.categoria).includes(q) || norm(a.grupo).includes(q);
    return okGrupo && okQ;
  });
}
function renderGrid() {
  const list = aliadosFiltrados();
  const cont = $("#dir-grid");
  $("#dir-count").innerHTML = `<b>${list.length}</b> ${list.length === 1 ? "aliado" : "aliados"}${filtroActivo !== "Todos" ? " · " + filtroActivo : ""}`;

  if (!list.length) {
    cont.innerHTML = `<div class="dir-empty">${ic("search-x")}<h3>Sin resultados</h3><p>No encontramos aliados para tu búsqueda. Prueba con otra categoría.</p></div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  cont.innerHTML = list.map(a => `
    <article class="dir-card" data-aliado="${a._i}" tabindex="0">
      <div class="dir-card__top">
        <span class="dir-card__ic">${ic(a.icon)}</span>
        <div>
          <div class="dir-card__cat">${a.categoria}</div>
          <div class="dir-card__nombre">${a.nombre}</div>
        </div>
      </div>
      <div class="dir-card__pct-row">
        <span class="dir-card__pct">${a.pct}</span>
        <span class="dir-card__pct-lbl">de descuento<br>para miembros</span>
      </div>
      <div class="dir-card__ver">
        <button class="btn btn--ghost-verde" data-aliado-btn="${a._i}">Ver establecimiento &rarr;</button>
      </div>
    </article>`).join("");
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   SHEET
   ============================================================ */
const overlay = $("#sheet-overlay");
const sheet = $("#sheet");
const sheetInner = $("#sheet-inner");
let aliadoActual = null;

function openSheet(i) {
  aliadoActual = ALIADOS[i];
  sheetInner.innerHTML = sheetAliado(aliadoActual);
  overlay.classList.add("is-open");
  sheet.classList.add("is-open");
  document.body.style.overflow = "hidden";
  if (window.lucide) lucide.createIcons();
  $("#sheet-scroll").scrollTop = 0;
  wireCalc(aliadoActual);
}
function closeSheet() {
  overlay.classList.remove("is-open");
  sheet.classList.remove("is-open");
  document.body.style.overflow = "";
}

function sheetAliado(a) {
  return `
    <div class="sheet__cat">${a.categoria}</div>
    <h2 class="sheet__nombre">${a.nombre}</h2>
    <div class="foto-ph">
      <span class="foto-ph__ic">${ic(a.icon)}</span>
      <span class="foto-ph__txt">FOTO · ${a.foto}</span>
    </div>
    <p class="sheet__desc">${a.desc}</p>

    <div class="sheet__sub">Descuentos disponibles</div>
    ${a.descuentos.map((d, di) => `
      <div class="descuento">
        <div class="descuento__pct">${d.pct}</div>
        <div class="descuento__body">
          <h4>${d.nombre}</h4>
          <p>${d.desc}</p>
        </div>
        <button class="btn btn--ghost-verde" data-aplicar="${di}">Aplicar</button>
      </div>`).join("")}

    <div class="sheet__sub" style="margin-top:34px">Calculadora de ahorro</div>
    <div class="calc">
      <span class="calc__lbl">Tu beneficio en vivo</span>
      <div class="calc__title">¿Cuánto ahorras hoy?</div>
      <div class="calc__grid">
        <div class="calc__field">
          <label>Valor de tu compra</label>
          <div class="calc__input-wrap">
            <span class="peso">$</span>
            <input type="text" inputmode="numeric" id="calc-monto" placeholder="0" autocomplete="off">
          </div>
        </div>
        <div class="calc__field">
          <label>Descuento a aplicar</label>
          <select id="calc-desc">
            ${a.descuentos.map((d, di) => `<option value="${di}">${d.pct} · ${d.nombre}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="calc__result">
        <div class="calc__cel">
          <small>Pagas</small>
          <div class="calc__cel-num" id="calc-pagas">$0</div>
        </div>
        <div class="calc__cel calc__cel--ahorro">
          <small>Ahorraste</small>
          <div class="calc__cel-num" id="calc-ahorro">$0</div>
        </div>
      </div>
      <button class="btn btn--primario btn--bloque" id="calc-aplicar" style="margin-top:16px">
        Aplicar descuento &rarr;
      </button>
      <div id="calc-exito" style="display:none;text-align:center;padding:24px 0 8px">
        <div style="font-size:48px;line-height:1">✓</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;margin:10px 0 6px">¡Descuento aplicado!</div>
        <p style="font-size:13px;color:#666;line-height:1.5">Gracias por tu compra en el Club.<br>Tu ahorro ya quedó registrado.</p>
      </div>
      <p class="calc__nota" id="calc-nota">Ingresa el valor de la compra y toca el botón para aplicar el descuento y notificar al miembro.</p>
    </div>
  `;
}

/* ---------- CALCULADORA ---------- */
function wireCalc(a) {
  const inMonto = $("#calc-monto");
  const selDesc = $("#calc-desc");
  const elPagas = $("#calc-pagas");
  const elAhorro = $("#calc-ahorro");
  let monto = 0;

  function recalc() {
    const d = a.descuentos[+selDesc.value];
    const frac = pctFrac(d.pct);
    const ahorro = monto * frac;
    elAhorro.textContent = fmtCOP(ahorro);
    elPagas.textContent = fmtCOP(monto - ahorro);
  }
  inMonto.addEventListener("input", () => {
    const raw = inMonto.value.replace(/\D/g, "");
    monto = parseInt(raw, 10) || 0;
    inMonto.value = monto ? nf.format(monto) : "";
    recalc();
  });
  selDesc.addEventListener("change", recalc);

  const btnAplicar = $("#calc-aplicar");
  const exitoEl = $("#calc-exito");
  const notaEl = $("#calc-nota");

  btnAplicar.addEventListener("click", async () => {
    if (!monto) { toast("Ingresa el valor de la compra primero", false); inMonto.focus(); return; }
    const d = a.descuentos[+selDesc.value];
    const ahorro = Math.round(monto * pctFrac(d.pct));

    btnAplicar.disabled = true;
    btnAplicar.textContent = "Aplicando...";

    // 1. Guardar en Supabase
    if (MIEMBRO_ID) {
      await registrarDescuento({
        aliado_nombre: a.nombre, categoria: a.categoria,
        descuento_pct: d.pct, compra: monto, ahorro
      });
    }

    // 2. WhatsApp de agradecimiento al miembro
    if (MIEMBRO_WA) {
      const digits = MIEMBRO_WA.replace(/\D/g, "");
      const numero = digits.startsWith("57") ? digits : "57" + digits;
      const msg = `¡Hola! 🎉 Tu descuento del ${d.pct} en ${a.nombre} ya quedó registrado.\n\nAhorraste ${fmtCOP(ahorro)} en una compra de ${fmtCOP(monto)}. 💳\n\n¿Cómo fue tu experiencia? Cuéntanos — tu opinión nos ayuda a mejorar el Club.\n\nEl Club de la Gente`;
      window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, "_blank");
    }

    // 3. Mostrar éxito
    btnAplicar.style.display = "none";
    if (notaEl) notaEl.style.display = "none";
    exitoEl.style.display = "block";
    if (window.lucide) lucide.createIcons();
  });

  recalc();
}

/* ---------- TOAST ---------- */
let toastT;
function toast(msg, check = true) {
  const t = $("#toast");
  t.innerHTML = (check ? `<span class="chk">${ic("check")}</span>` : "") + `<span>${msg}</span>`;
  if (window.lucide) lucide.createIcons();
  t.classList.add("is-show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("is-show"), 3400);
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderFiltros();
  renderGrid();
  if (window.lucide) lucide.createIcons();

  // Buscador en vivo
  $("#dir-search").addEventListener("input", (e) => { query = e.target.value; renderGrid(); });

  // Filtros
  $("#dir-filtros").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-grupo]");
    if (!chip) return;
    filtroActivo = chip.dataset.grupo;
    renderFiltros();
    renderGrid();
  });

  // Clicks globales (abrir sheet, aplicar, cerrar)
  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-aliado-btn], [data-aliado]");
    if (card) { openSheet(+(card.dataset.aliadoBtn ?? card.dataset.aliado)); return; }

    const ap = e.target.closest("[data-aplicar]");
    if (ap && !ap.classList.contains("is-aplicado")) {
      ap.classList.add("is-aplicado");
      ap.innerHTML = `${ic("check")} Aplicado`;
      if (window.lucide) lucide.createIcons();
      toast("Descuento aplicado · muéstralo en el establecimiento");
      return;
    }

    if (e.target.closest("#sheet-close") || e.target === overlay) closeSheet();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (e.key === "Enter") {
      const card = e.target.closest(".dir-card[data-aliado]");
      if (card) openSheet(+card.dataset.aliado);
    }
  });
});
