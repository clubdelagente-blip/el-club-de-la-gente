/* ============================================================
   EL CLUB DE LA GENTE — Módulo 6 · Lógica del backoffice
   ============================================================ */

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const ic = (n) => `<i data-lucide="${n}"></i>`;
const nf = new Intl.NumberFormat("es-CO");
const COP = (n) => "$" + nf.format(Math.round(n || 0));
const COPk = (n) => n >= 1000000 ? "$" + (n / 1000000).toFixed(1).replace(".0", "") + "M" : "$" + nf.format(n);
const ini = (nombre) => nombre.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const planLbl = (p) => p === "premium" ? "Premium" : "Básica";
// Expuestos por window para que el script inline (type="module") de Admin.html
// pueda reusarlos sin depender del scope compartido entre script clasico y modulo.
window.nf = nf; window.ini = ini; window.planLbl = planLbl;

/* ---------- TÍTULOS DE PANEL ---------- */
const PANELES = {
  dashboard:    { t: "Dashboard", s: "Vista general en tiempo real" },
  miembros:     { t: "Miembros", s: "Gestión de la base de miembros" },
  aliados:      { t: "Aliados", s: "Establecimientos, fotos y descuentos" },
  planes:       { t: "Planes", s: "Precios y beneficios de cada membresía" },
  profesionales:{ t: "Profesionales", s: "Asesores jurídicos, psicológicos y contables" },
  marcas:       { t: "Marcas", s: "Logos y links de afiliado que aparecen en el carrusel" },
  tienda:       { t: "Tienda", s: "Catálogo de productos con descuentos para miembros" },
  contenido:    { t: "Contenido", s: "Imágenes, videos y publicaciones de la web" },
  programas:    { t: "Programas sociales", s: "Programas, fundaciones, eventos y voluntarios" },
  ventas:       { t: "Ventas", s: "Historial de transacciones y proyecciones" },
  suscripciones:{ t: "Suscripciones", s: "Renovaciones y cobros automáticos" },
  contabilidad: { t: "Contabilidad", s: "Ingresos, gastos y balance del Club" },
  agente:       { t: "Agente WhatsApp", s: "Bandeja de conversaciones y difusión masiva" },
  config:       { t: "Configuración", s: "Ajustes generales de la plataforma" },
};

/* ============================================================
   RENDER: DASHBOARD
   ============================================================ */
function renderDashboard() {
  $("#p-dashboard").innerHTML = `<div style="text-align:center;padding:60px 20px;color:rgba(242,240,234,.3)">Cargando…</div>`;
  window.cargarDashboardReal?.();
}
function metric(icon, num, lbl, sub, chip, dir) {
  return `<div class="ad-metric">
    <div class="ad-metric__top"><span class="ad-metric__ic">${ic(icon)}</span>${chip ? `<span class="ad-metric__chip ${dir}">${ic(dir === "up" ? "trending-up" : "trending-down")} ${chip}</span>` : ""}</div>
    <div class="ad-metric__num">${num}</div><div class="ad-metric__lbl">${lbl}</div><div class="ad-metric__sub">${sub}</div>
  </div>`;
}
window.metric = metric;

/* ============================================================
   RENDER: MIEMBROS
   ============================================================ */
let miembroTab = "todos", miembroQ = "";
function renderMiembros() {
  $("#p-miembros").innerHTML = `
    <div class="ad-toolbar">
      <div class="ad-tabs" id="m-tabs">
        ${["todos", "premium", "basica", "inactivos"].map(t => `<button class="ad-tab ${t === miembroTab ? "is-on" : ""}" data-tab="${t}">${{ todos: "Todos", premium: "Premium", basica: "Básica", inactivos: "Inactivos" }[t]}</button>`).join("")}
      </div>
      <div class="ad-search-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input id="m-search" placeholder="Buscar por nombre o número…" autocomplete="off"></div>
      <div class="ad-spacer"></div>
      <button class="ad-btn" id="m-csv">${ic("download")} Exportar CSV</button>
      <button class="ad-btn ad-btn--wa" id="m-wa">${ic("message-circle")} WhatsApp masivo</button>
    </div>
    <div class="ad-table-wrap">
      <table class="ad-table">
        <thead><tr><th>Miembro</th><th>Plan</th><th>Estado</th><th style="text-align:right">Ahorro total</th></tr></thead>
        <tbody id="m-body"></tbody>
      </table>
    </div>`;
  window.cargarMiembrosReal?.(miembroTab, miembroQ);
}

/* ============================================================
   RENDER: MARCAS AMAZON
   ============================================================ */
function renderMarcas() {
  $("#p-marcas").innerHTML = `
    <div class="ad-toolbar">
      <div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="marca-add">${ic("plus")} Agregar marca</button>
    </div>
    <div class="ad-table-wrap">
      <table class="ad-table">
        <thead><tr><th>Marca</th><th>Link de afiliado</th><th>Orden</th><th style="text-align:right">Estado</th></tr></thead>
        <tbody id="marcas-body"><tr><td colspan="4" style="text-align:center;padding:40px;color:rgba(242,240,234,.3)">Cargando…</td></tr></tbody>
      </table>
    </div>`;
  if (window.lucide) lucide.createIcons();
  window.cargarMarcasAdmin?.();
}
window.renderMarcas = renderMarcas;

/* ============================================================
   RENDER: TIENDA
   ============================================================ */
function renderTienda() {
  $("#p-tienda").innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:20px">
      <button class="ad-link" data-tiendatab="amazon" style="width:auto;display:inline-flex" data-is-tab>Catálogo Amazon</button>
      <button class="ad-link" data-tiendatab="aliados" style="width:auto;display:inline-flex" data-is-tab>Tiendas de aliados</button>
    </div>
    <div id="tiendatab-amazon">
      <div style="display:flex;gap:12px;margin-bottom:20px">
        <button class="ad-btn ad-btn--verde" id="cat-add">${ic("folder-plus")} Nueva categoría</button>
        <button class="ad-btn ad-btn--verde" id="prod-add">${ic("plus")} Agregar producto</button>
      </div>
      <div class="ad-card" style="margin-bottom:20px">
        <div class="ad-card__head"><div class="ad-card__title">Categorías</div></div>
        <div class="ad-table-wrap">
          <table class="ad-table">
            <thead><tr><th>Nombre</th><th style="text-align:right">Estado</th></tr></thead>
            <tbody id="cats-body"><tr><td colspan="2" style="text-align:center;padding:30px;color:rgba(242,240,234,.3)">Cargando…</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="ad-card">
        <div class="ad-card__head"><div class="ad-card__title">Productos</div></div>
        <div class="ad-table-wrap">
          <table class="ad-table">
            <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Precio miembro</th><th style="text-align:right">Estado</th></tr></thead>
            <tbody id="prods-body"><tr><td colspan="5" style="text-align:center;padding:30px;color:rgba(242,240,234,.3)">Cargando…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
    <div id="tiendatab-aliados" style="display:none">
      <div class="ad-card" style="margin-bottom:20px">
        <div class="ad-card__head"><div class="ad-card__title">Productos pendientes de aprobación</div></div>
        <div class="ad-table-wrap">
          <table class="ad-table">
            <thead><tr><th>Producto</th><th>Tienda</th><th>Precio</th><th style="text-align:right">Acción</th></tr></thead>
            <tbody id="prodal-pend-body"><tr><td colspan="4" style="text-align:center;padding:30px;color:rgba(242,240,234,.3)">Cargando…</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="ad-card">
        <div class="ad-card__head"><div class="ad-card__title">Tiendas de aliados activas</div></div>
        <div class="ad-table-wrap">
          <table class="ad-table">
            <thead><tr><th>Tienda</th><th>Aliado</th><th>Productos</th><th>Pedidos</th><th>Ventas confirmadas</th><th style="text-align:right">Comisión a cobrar</th></tr></thead>
            <tbody id="tiendas-aliados-body"><tr><td colspan="6" style="text-align:center;padding:30px;color:rgba(242,240,234,.3)">Cargando…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>`;
  if (window.lucide) lucide.createIcons();
  window.cargarTiendaAdmin?.();
  $$("[data-tiendatab]").forEach(b => b.addEventListener("click", () => {
    const tab = b.dataset.tiendatab;
    $("#tiendatab-amazon").style.display = tab === "amazon" ? "" : "none";
    $("#tiendatab-aliados").style.display = tab === "aliados" ? "" : "none";
    if (tab === "aliados") window.cargarTiendasAliados?.();
  }));
}
window.renderTienda = renderTienda;

/* ============================================================
   RENDER: CONTENIDO
   ============================================================ */
function renderContenido() {
  $("#p-contenido").innerHTML = `
    <div class="ad-drop" id="ad-drop">
      <div class="ad-drop__ic">${ic("upload-cloud")}</div>
      <h3>Arrastra tus archivos aquí</h3>
      <p>O haz clic para seleccionar imágenes y videos</p>
      <div class="ad-drop__hint">JPG · PNG · MP4 — máximo 50 MB · se reflejan en tiempo real en la web pública</div>
    </div>
    <div class="ad-card__head" style="margin-bottom:16px"><div class="ad-card__title">Contenido publicado</div><div class="ad-card__sub">${ADM_CONTENIDO.length} piezas</div></div>
    <div class="ad-gallery" id="ad-gallery">
      ${ADM_CONTENIDO.map((c, i) => `
        <div class="ad-asset" data-asset="${i}">
          <div class="ad-asset__thumb"><span class="ad-asset__type">${c.tipo}</span>${ic(c.icon)}</div>
          <div class="ad-asset__body">
            <div><div class="ad-asset__name">${c.nombre}</div><div class="ad-asset__date">${c.fecha}</div></div>
            <button class="ad-asset__del" data-del="${i}" title="Eliminar">${ic("trash-2")}</button>
          </div>
        </div>`).join("")}
    </div>`;
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   RENDER: PROGRAMAS
   ============================================================ */
function renderProgramas() {
  $("#p-programas").innerHTML = `
    <div class="ad-toolbar"><div class="ad-spacer"></div>
      <button class="ad-btn" id="prog-add">${ic("plus")} Nuevo programa</button>
      <button class="ad-btn ad-btn--verde" id="ev-add">${ic("calendar-plus")} Crear evento</button>
    </div>
    ${ADM_PROGRAMAS.map((p, i) => `
      <div class="ad-prog">
        <div class="ad-prog__head">
          <span class="ad-prog__ic">${ic(p.icon)}</span>
          <div style="flex:1">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:14px">
              <div class="ad-prog__name">${p.nombre}</div>
              <button class="ad-btn" data-edit-prog="${i}">${ic("pencil")} Editar</button>
            </div>
            <p class="ad-prog__desc">${p.desc}</p>
          </div>
        </div>
        <div class="ad-prog__cifras">
          ${p.cifras.map(c => `<div class="ad-prog__cifra"><b>${c.n}</b><small>${c.l}</small></div>`).join("")}
        </div>
        <div class="ad-vol">
          <div class="ad-vol__lbl">Postulaciones de voluntarios · ${p.voluntarios.length}</div>
          <div class="ad-vol__list">
            ${p.voluntarios.map(v => `<span class="ad-vol__item"><span class="av">${ini(v.nombre)}</span>${v.nombre} · <a href="https://wa.me/57${v.wsp.replace(/\s/g, "")}" target="_blank">${v.wsp}</a></span>`).join("")}
          </div>
        </div>
      </div>`).join("")}`;
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   RENDER: VENTAS
   ============================================================ */
function renderVentas() {
  const v = ADM_VENTAS_METRICAS;
  $("#p-ventas").innerHTML = `
    <div class="ad-metrics">
      ${metric("banknote", COPk(v.mes), "Ingresos del mes", "", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
      ${metric("calendar", COPk(v.anterior), "Mes anterior", "", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
      ${metric("trending-up", COPk(v.proyeccion), "Proyección anual", "", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
      ${metric("receipt", COP(v.ticket), "Ticket promedio", "por miembro / mes", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
    </div>
    <div class="ad-toolbar"><div class="ad-card__title">Últimas transacciones</div><div class="ad-spacer"></div><button class="ad-btn" id="v-csv">${ic("download")} Exportar historial</button></div>
    <div class="ad-table-wrap">
      <table class="ad-table">
        <thead><tr><th>Miembro</th><th>Plan</th><th>Fecha</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>
          ${ADM_TRANSACCIONES.length ? ADM_TRANSACCIONES.map(t => `
            <tr>
              <td><div class="ad-cell-user"><span class="ad-av">${ini(t.nombre)}</span><div><div class="ad-cell-user__name">${t.nombre}</div><div class="ad-table__num">#${t.num}</div></div></div></td>
              <td><span class="ad-pill ${t.plan}"><span class="d"></span>${planLbl(t.plan)}</span></td>
              <td><span class="ad-table__num">${t.fecha}</span></td>
              <td style="text-align:right"><span class="ad-num-strong">${COP(t.valor)}</span></td>
            </tr>`).join("") : `<tr><td colspan="4" style="text-align:center;padding:30px;color:rgba(242,240,234,.3)">Este panel todavía no está conectado a datos reales</td></tr>`}
        </tbody>
      </table>
    </div>`;
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   RENDER: SUSCRIPCIONES
   ============================================================ */
const COBRO = { auto: { c: "activo", t: "Automático" }, pend: { c: "pend", t: "Pendiente" }, fallido: { c: "fallido", t: "Fallido" } };
function renderSuscripciones() {
  const s = ADM_SUSC_METRICAS;
  $("#p-suscripciones").innerHTML = `
    <div class="ad-metrics">
      ${metric("badge-check", nf.format(s.activas), "Suscripciones activas", "", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
      ${metric("clock", s.vencen, "Vencen esta semana", "requieren recordatorio", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
      ${metric("x-circle", s.canceladas, "Canceladas", "este mes", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
      ${metric("repeat", s.renovacion, "Tasa de renovación", "", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
    </div>
    <div class="ad-toolbar"><div class="ad-card__title">Próximas renovaciones</div><div class="ad-spacer"></div><button class="ad-btn ad-btn--wa" id="s-rem">${ic("bell")} Enviar recordatorios</button></div>
    <div class="ad-table-wrap">
      <table class="ad-table">
        <thead><tr><th>Miembro</th><th>Plan</th><th>Renueva</th><th style="text-align:right">Cobro automático</th></tr></thead>
        <tbody>
          ${ADM_RENOVACIONES.length ? ADM_RENOVACIONES.map(r => `
            <tr>
              <td><div class="ad-cell-user"><span class="ad-av">${ini(r.nombre)}</span><div><div class="ad-cell-user__name">${r.nombre}</div><div class="ad-table__num">#${r.num}</div></div></div></td>
              <td><span class="ad-pill ${r.plan}"><span class="d"></span>${planLbl(r.plan)}</span></td>
              <td><span class="ad-table__num">${r.fecha}</span></td>
              <td style="text-align:right"><span class="ad-pill ${COBRO[r.cobro].c}"><span class="d"></span>${COBRO[r.cobro].t}</span></td>
            </tr>`).join("") : `<tr><td colspan="4" style="text-align:center;padding:30px;color:rgba(242,240,234,.3)">Este panel todavía no está conectado a datos reales</td></tr>`}
        </tbody>
      </table>
    </div>`;
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   RENDER: CONFIGURACIÓN
   ============================================================ */
function renderConfig() {
  const items = [
    { n: "Cobros recurrentes automáticos", d: "Wompi cobra la membresía cada mes sin intervención", on: true },
    { n: "Mensajes de WhatsApp automáticos", d: "Bienvenida, resumen mensual y recordatorios de renovación", on: true },
    { n: "Sincronización con la web pública", d: "Los cambios en aliados y programas se reflejan en tiempo real", on: true },
    { n: "Notificaciones al panel", d: "Avisos de nuevos miembros, pagos y descuentos aplicados", on: true },
    { n: "Modo mantenimiento de la web", d: "Muestra una página de 'volvemos pronto' a los visitantes", on: false },
  ];
  $("#p-config").innerHTML = `
    <div class="ad-set">
      ${items.map((it, i) => `
        <div class="ad-set__row">
          <div><div class="ad-set__name">${it.n}</div><div class="ad-set__desc">${it.d}</div></div>
          <div class="ad-toggle ${it.on ? "is-on" : ""}" data-toggle="${i}"></div>
        </div>`).join("")}
    </div>
    <div class="ad-toolbar"><div class="ad-spacer"></div><button class="ad-btn ad-btn--verde" id="cfg-save">${ic("check")} Guardar cambios</button></div>`;
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   MÓDULO 7 — AGENTE DE WHATSAPP (bandeja del admin, datos reales)
   ============================================================ */
function renderAgente() {
  $("#p-agente").innerHTML = `
    <div class="ad-toolbar">
      <div class="ad-card__title" id="ag-title">Conversaciones</div>
      <div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="ag-broadcast">${ic("megaphone")} Difusión masiva</button>
    </div>
    <div class="ag-wrap">
      <div class="ag-list">
        <div class="ag-list__top">
          <div class="ag-list__title"><h3>Bandeja</h3><span class="n" id="ag-pend-n"></span></div>
          <div class="ag-search-mini">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="ag-search" placeholder="Buscar conversación…" autocomplete="off">
          </div>
        </div>
        <ul class="ag-convs" id="ag-convs"><li style="padding:30px;text-align:center;color:var(--txt-40);font-size:13px">Cargando…</li></ul>
      </div>
      <div class="ag-thread" id="ag-thread"></div>
    </div>`;
  if (window.lucide) lucide.createIcons();
  window.cargarAgenteReal?.();
}

function updateAgCount() { window.actualizarAgCountReal?.(); }

window.ADM_WA_PLANTILLAS = ADM_WA_PLANTILLAS;

/* ============================================================
   MODAL DE MIEMBRO
   ============================================================ */
function cerrarModal() { $("#ad-modal-ov").classList.remove("is-open"); }

/* ---------- MODAL: Crear evento ---------- */
function abrirCrearEvento() {
  $("#modal-body").innerHTML = `
    <div class="ad-field"><label>Programa social</label>
      <select>${ADM_PROGRAMAS.map(p => `<option>${p.nombre}</option>`).join("")}</select>
    </div>
    <div class="ad-field"><label>Nombre del evento</label><input placeholder="Ej: Gran jornada de adopción"></div>
    <div class="ad-field-2">
      <div class="ad-field"><label>Fecha</label><input type="date"></div>
      <div class="ad-field"><label>Lugar</label><input placeholder="Ej: Parque Principal, Fusagasugá"></div>
    </div>
    <div class="ad-field"><label>Descripción</label><textarea rows="3" placeholder="Detalles del evento que verán los miembros…"></textarea></div>
    <div class="ad-toolbar" style="margin:6px 0 0"><div class="ad-spacer"></div><button class="ad-btn ad-btn--verde" id="ev-guardar">${ic("check")} Publicar evento</button></div>`;
  $("#modal-title").textContent = "Crear evento";
  $("#modal-sub").textContent = "Se mostrará en el programa social seleccionado";
  $("#ad-modal-ov").classList.add("is-open");
  if (window.lucide) lucide.createIcons();
}

/* ---------- MODAL: Crear / editar programa social ---------- */
function abrirPrograma(i) {
  const p = i != null ? ADM_PROGRAMAS[i] : null;
  const c = p ? p.cifras : [{ n: "", l: "" }, { n: "", l: "" }, { n: "", l: "" }];
  $("#modal-body").innerHTML = `
    <div class="ad-field"><label>Nombre del programa</label><input id="prog-nombre" value="${p ? p.nombre : ""}" placeholder="Ej: Patas que Rescatan"></div>
    <div class="ad-field"><label>Descripción</label><textarea id="prog-desc" rows="3" placeholder="De qué se trata el programa…">${p ? p.desc : ""}</textarea></div>
    <div class="ad-field"><label>Cifras de impacto</label>
      <div class="ad-field-2">
        ${c.map(cf => `<div class="ad-field"><input value="${cf.n}" placeholder="Cifra (ej: 340)"></div><div class="ad-field"><input value="${cf.l}" placeholder="Etiqueta (ej: Animales rescatados)"></div>`).join("")}
      </div>
    </div>
    <div class="ad-toolbar" style="margin:6px 0 0"><div class="ad-spacer"></div><button class="ad-btn ad-btn--verde" id="prog-guardar">${ic("check")} ${p ? "Guardar cambios" : "Crear programa"}</button></div>`;
  $("#modal-title").textContent = p ? "Editar programa social" : "Nuevo programa social";
  $("#modal-sub").textContent = p ? p.nombre : "Se publicará en la web pública";
  $("#ad-modal-ov").classList.add("is-open");
  if (window.lucide) lucide.createIcons();
}

/* ---------- TOAST ---------- */
let toastT;
function toast(msg) {
  const t = $("#ad-toast");
  t.innerHTML = ic("check") + `<span>${msg}</span>`;
  if (window.lucide) lucide.createIcons();
  t.classList.add("is-show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("is-show"), 3200);
}

/* ============================================================
   NAVEGACIÓN
   ============================================================ */
const RENDERED = {};
function irPanel(panel) {
  $$(".ad-panel").forEach(p => p.classList.toggle("is-active", p.id === "p-" + panel));
  $$(".ad-link[data-panel]").forEach(l => l.classList.toggle("is-active", l.dataset.panel === panel));
  $("#ad-h1").textContent = PANELES[panel].t;
  $("#ad-sub").textContent = PANELES[panel].s;
  $("#admin").classList.remove("menu-open");
  if (!RENDERED[panel]) {
    // window.X (no la variable local sin prefijo) para las funciones que vive en el
    // script inline de Admin.html: ese script es type="module" y puede tardar un
    // instante en terminar de cargar (importa supabase-js desde un CDN), y una
    // referencia sin prefijo a un nombre que todavia no existe en ningun lado
    // (ni local ni en window) lanza ReferenceError y rompe TODO irPanel -- incluidos
    // paneles que no tienen nada que ver, como pasó con Dashboard.
    const fn = ({ dashboard: renderDashboard, miembros: renderMiembros, aliados: window.renderAliados, planes: window.renderPlanes, profesionales: window.renderProfesionales, marcas: renderMarcas, tienda: renderTienda, contenido: renderContenido, programas: renderProgramas, ventas: renderVentas, suscripciones: renderSuscripciones, contabilidad: window.renderContabilidad, config: renderConfig, agente: renderAgente })[panel];
    if (fn) { fn(); RENDERED[panel] = true; }
  }
  if (window.lucide) lucide.createIcons();
  $(".ad-content")?.scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0 });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Fecha actual
  $("#ad-date").textContent = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  irPanel("dashboard");
  updateAgCount();

  // Nav
  $$(".ad-link[data-panel]").forEach(l => l.addEventListener("click", () => irPanel(l.dataset.panel)));
  $("#ad-burger")?.addEventListener("click", () => $("#admin").classList.toggle("menu-open"));
  $("#ad-backdrop")?.addEventListener("click", () => $("#admin").classList.remove("menu-open"));

  // Delegación global
  document.addEventListener("click", (e) => {
    const goto = e.target.closest("[data-goto]");
    if (goto) { irPanel(goto.dataset.goto); return; }

    const mTab = e.target.closest("[data-tab]");
    if (mTab) { miembroTab = mTab.dataset.tab; $$("#m-tabs .ad-tab").forEach(t => t.classList.toggle("is-on", t === mTab)); window.filtrarMiembrosReal?.(miembroTab, miembroQ); return; }

    const row = e.target.closest("tr[data-miembro]");
    if (row) { window.abrirMiembroReal?.(row.dataset.miembro); return; }

    // --- Agente WhatsApp ---
    const conv = e.target.closest("[data-conv]");
    if (conv) { window.abrirConvReal?.(conv.dataset.conv); return; }
    const tpl = e.target.closest("[data-tpl]");
    if (tpl) { const inp = $("#ag-input"); if (inp) { inp.value = ADM_WA_PLANTILLAS[tpl.dataset.tpl].txt; inp.focus(); inp.style.height = "auto"; inp.style.height = inp.scrollHeight + "px"; } return; }
    if (e.target.closest("#ag-send")) { window.enviarMsgReal?.(); return; }
    if (e.target.closest("#ag-attach-btn")) { $("#ag-attach-input")?.click(); return; }
    if (e.target.closest("#ag-attach-remove")) { window.agRemoveAttach?.(); return; }
    if (e.target.closest("#ag-mic-btn")) { window.agStartRecording?.(); return; }
    if (e.target.closest("#ag-rec-cancel")) { window.agCancelRecording?.(); return; }
    if (e.target.closest("#ag-rec-send")) { window.agSendRecording?.(); return; }
    if (e.target.closest("#ag-broadcast")) { window.abrirDifusionReal?.(); return; }
    const verM = e.target.closest("[data-ver-miembro]");
    if (verM) { window.abrirMiembroReal?.(verM.dataset.verMiembro); return; }
    const aud = e.target.closest("[data-aud]");
    if (aud) { $$(".ag-aud .ag-aud__opt").forEach(o => o.classList.toggle("is-on", o === aud)); return; }
    const bcTpl = e.target.closest("[data-bc-tpl]");
    if (bcTpl) { const m = $("#ag-bc-msg"); if (m) m.value = ADM_WA_PLANTILLAS[bcTpl.dataset.bcTpl].txt; return; }
    if (e.target.closest("#ag-bc-send")) {
      const sel = $(".ag-aud .ag-aud__opt.is-on");
      window.enviarDifusionReal?.(sel?.dataset.aud || "todos");
      return;
    }

    if (e.target.closest("#a-add")) { window.abrirAgregarAliado?.(); return; }
    if (e.target.closest("#prof-add")) { window.abrirAgregarProfesional?.(); return; }
    if (e.target.closest("#prof-guardar")) { cerrarModal(); toast("Profesional guardado · publicado en la web"); return; }
    if (e.target.closest("#modal-close") || e.target.id === "ad-modal-ov") { cerrarModal(); return; }
    if (e.target.closest("#aliado-guardar")) { cerrarModal(); toast("Aliado guardado · publicado en el directorio"); return; }
    if (e.target.closest("#m-csv")) { window.exportarMiembrosCSV?.(); return; }
    if (e.target.closest("#v-csv")) { toast("Exportando CSV…"); return; }
    if (e.target.closest("#m-wa")) { toast("Mensaje masivo programado por WhatsApp"); return; }
    if (e.target.closest("#s-rem")) { toast("Recordatorios enviados a los que vencen pronto"); return; }
    if (e.target.closest("#ev-add")) { abrirCrearEvento(); return; }
    if (e.target.closest("#ev-guardar")) { cerrarModal(); toast("Evento publicado · visible para los miembros"); return; }
    if (e.target.closest("#prog-add")) { abrirPrograma(); return; }
    const editProg = e.target.closest("[data-edit-prog]");
    if (editProg) { abrirPrograma(+editProg.dataset.editProg); return; }
    if (e.target.closest("#prog-guardar")) { cerrarModal(); toast("Programa social guardado"); return; }
    if (e.target.closest("#cfg-save")) { toast("Configuración guardada"); return; }

    const tog = e.target.closest("[data-toggle]");
    if (tog) { tog.classList.toggle("is-on"); return; }

    const del = e.target.closest("[data-del]");
    if (del) { del.closest(".ad-asset").remove(); toast("Contenido eliminado"); return; }

    const drop = e.target.closest("#ad-drop");
    if (drop) { toast("Selector de archivos abierto"); return; }
  });

  // Búsqueda + drag&drop (delegado en input/dragover)
  document.addEventListener("input", (e) => {
    if (e.target.id === "m-search") { miembroQ = e.target.value; window.filtrarMiembrosReal?.(miembroTab, miembroQ); }
    if (e.target.id === "a-search") { window.filtrarAliadosReal?.(e.target.value); }
    if (e.target.id === "ag-search") { window.filtrarConvsReal?.(e.target.value); }
    if (e.target.id === "ag-input") { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }
  });

  // Adjuntar foto/video en el Agente WhatsApp
  document.addEventListener("change", (e) => {
    if (e.target.id === "ag-attach-input") { window.agAttachFile?.(e.target.files[0]); e.target.value = ""; }
  });

  // Enter para enviar mensaje del agente
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "ag-input" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); window.enviarMsgReal?.(); }
  });
  document.addEventListener("dragover", (e) => { const d = e.target.closest("#ad-drop"); if (d) { e.preventDefault(); d.classList.add("is-over"); } });
  document.addEventListener("dragleave", (e) => { const d = e.target.closest("#ad-drop"); if (d) d.classList.remove("is-over"); });
  document.addEventListener("drop", (e) => { const d = e.target.closest("#ad-drop"); if (d) { e.preventDefault(); d.classList.remove("is-over"); toast("Archivo subido · se reflejará en la web"); } });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarModal(); });

  if (window.lucide) lucide.createIcons();
});
