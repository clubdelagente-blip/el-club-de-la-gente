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

/* ---------- TÍTULOS DE PANEL ---------- */
const PANELES = {
  dashboard:    { t: "Dashboard", s: "Vista general en tiempo real" },
  miembros:     { t: "Miembros", s: "Gestión de la base de miembros" },
  aliados:      { t: "Aliados", s: "Establecimientos, fotos y descuentos" },
  profesionales:{ t: "Profesionales", s: "Asesores jurídicos, psicológicos y contables" },
  contenido:    { t: "Contenido", s: "Imágenes, videos y publicaciones de la web" },
  programas:    { t: "Programas sociales", s: "Programas, fundaciones, eventos y voluntarios" },
  ventas:       { t: "Ventas", s: "Historial de transacciones y proyecciones" },
  suscripciones:{ t: "Suscripciones", s: "Renovaciones y cobros automáticos" },
  agente:       { t: "Agente WhatsApp", s: "Bandeja de conversaciones y difusión masiva" },
  config:       { t: "Configuración", s: "Ajustes generales de la plataforma" },
};

/* ============================================================
   RENDER: DASHBOARD
   ============================================================ */
function renderDashboard() {
  const m = ADM_METRICAS;
  $("#p-dashboard").innerHTML = `
    <div class="ad-metrics">
      ${metric("users", m.miembros.toLocaleString("es-CO"), "Miembros activos", `${m.miembrosNuevos} nuevos este mes`, m.miembrosTrend, "up")}
      ${metric("banknote", COPk(m.ingresos), "Ingresos del mes", "vs. mes anterior", m.ingresosTrend, "up")}
      ${metric("ticket-percent", nf.format(m.descuentos), "Descuentos usados", `${m.descuentosSemana} esta semana`, "+7%", "up")}
      ${metric("sparkles", COPk(m.ahorroAcum), "Ahorro generado", "acumulado total", m.ahorroTrend, "up")}
    </div>

    <div class="ad-grid">
      <div class="ad-card">
        <div class="ad-card__head">
          <div><div class="ad-card__title">Ingresos por mes</div><div class="ad-card__sub">Recaudo de membresías · 2026</div></div>
        </div>
        ${chart()}
        <div class="ad-chart-legend">
          <div class="ad-leg"><div class="ad-leg__top"><span class="ad-leg__sw b"></span> Básica</div><div class="ad-leg__val">${ADM_DESGLOSE.basica.miembros} <small>· ${COP(ADM_DESGLOSE.basica.valor)}</small></div></div>
          <div class="ad-leg"><div class="ad-leg__top"><span class="ad-leg__sw p"></span> Premium</div><div class="ad-leg__val">${ADM_DESGLOSE.premium.miembros} <small>· ${COP(ADM_DESGLOSE.premium.valor)}</small></div></div>
        </div>
      </div>

      <div class="ad-card">
        <div class="ad-card__head"><div><div class="ad-card__title">Actividad en vivo</div><div class="ad-card__sub">Últimos movimientos</div></div></div>
        <ul class="ad-feed">
          ${ADM_FEED.map(f => `
            <li><span class="ad-feed__dot ${f.tipo}"></span>
              <div class="ad-feed__body"><div class="ad-feed__txt">${f.txt}</div><div class="ad-feed__time">${f.time}</div></div>
            </li>`).join("")}
        </ul>
      </div>
    </div>

    <div class="ad-grid-2">
      <div class="ad-card">
        <div class="ad-card__head"><div><div class="ad-card__title">Últimos miembros</div></div><button class="ad-card__link" data-goto="miembros">Ver todos ${ic("arrow-right")}</button></div>
        <div class="ad-table-wrap" style="border:none">
          <table class="ad-table">
            <tbody>
              ${ADM_MIEMBROS.slice(0, 4).map(u => `
                <tr data-miembro="${u.num}">
                  <td><div class="ad-cell-user"><span class="ad-av">${ini(u.nombre)}</span><div><div class="ad-cell-user__name">${u.nombre}</div><div class="ad-table__num">#${u.num}</div></div></div></td>
                  <td><span class="ad-pill ${u.plan}"><span class="d"></span>${planLbl(u.plan)}</span></td>
                  <td style="text-align:right"><span class="ad-pill ${u.estado}"><span class="d"></span>${u.estado === "activo" ? "Activo" : "Inactivo"}</span></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="ad-card">
        <div class="ad-card__head"><div><div class="ad-card__title">Aliados más usados</div><div class="ad-card__sub">Este mes</div></div><button class="ad-card__link" data-goto="aliados">Gestionar ${ic("arrow-right")}</button></div>
        <ul class="ad-rank">
          ${ADM_ALIADOS.slice(0, 5).map((a, i) => `
            <li><span class="ad-rank__pos">${i + 1}</span><span class="ad-rank__ic">${ic(a.icon)}</span>
              <div><div class="ad-rank__name">${a.nombre}</div><div class="ad-rank__cat">${a.cat}</div></div>
              <div class="ad-rank__usos"><b>${a.usos}</b><small>usos</small></div>
            </li>`).join("")}
        </ul>
      </div>
    </div>`;
}
function metric(icon, num, lbl, sub, chip, dir) {
  return `<div class="ad-metric">
    <div class="ad-metric__top"><span class="ad-metric__ic">${ic(icon)}</span><span class="ad-metric__chip ${dir}">${ic(dir === "up" ? "trending-up" : "trending-down")} ${chip}</span></div>
    <div class="ad-metric__num">${num}</div><div class="ad-metric__lbl">${lbl}</div><div class="ad-metric__sub">${sub}</div>
  </div>`;
}
function chart() {
  const max = Math.max(...ADM_INGRESOS.map(d => d.valor));
  return `<div class="ad-chart">
    ${ADM_INGRESOS.map(d => `
      <div class="ad-bar-col ${d.now ? "is-now" : ""}">
        <div class="ad-bar ${d.now ? "is-now" : ""}" style="height:${(d.valor / max * 100).toFixed(1)}%"><span class="ad-bar__val">${COPk(d.valor)}</span></div>
        <span class="ad-bar-col__lbl">${d.mes}</span>
      </div>`).join("")}
  </div>`;
}

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
  fillMiembros();
}
function filtroMiembros() {
  const q = norm(miembroQ.trim());
  return ADM_MIEMBROS.filter(u => {
    const okTab = miembroTab === "todos" || (miembroTab === "inactivos" ? u.estado === "inactivo" : u.plan === miembroTab && u.estado === "activo");
    const okQ = !q || norm(u.nombre).includes(q) || u.num.includes(q);
    return okTab && okQ;
  });
}
function fillMiembros() {
  const list = filtroMiembros();
  $("#m-body").innerHTML = list.length ? list.map(u => `
    <tr data-miembro="${u.num}">
      <td><div class="ad-cell-user"><span class="ad-av">${ini(u.nombre)}</span><div><div class="ad-cell-user__name">${u.nombre}</div><div class="ad-table__num">#${u.num} · ${u.fecha}</div></div></div></td>
      <td><span class="ad-pill ${u.plan}"><span class="d"></span>${planLbl(u.plan)}</span></td>
      <td><span class="ad-pill ${u.estado}"><span class="d"></span>${u.estado === "activo" ? "Activo" : "Inactivo"}</span></td>
      <td style="text-align:right"><span class="ad-num-strong verde">${COP(u.ahorro)}</span></td>
    </tr>`).join("") : `<tr><td colspan="4" style="text-align:center;padding:50px;color:var(--txt-40)">Sin resultados</td></tr>`;
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   RENDER: ALIADOS
   ============================================================ */
function renderAliados() {
  $("#p-aliados").innerHTML = `
    <div class="ad-toolbar">
      <div class="ad-search-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input id="a-search" placeholder="Buscar aliado…" autocomplete="off"></div>
      <div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="a-add">${ic("plus")} Agregar aliado</button>
    </div>
    <div class="ad-table-wrap">
      <table class="ad-table">
        <thead><tr><th>Establecimiento</th><th>Categoría</th><th>Usos del mes</th><th>Descuento</th><th style="text-align:right">Estado</th></tr></thead>
        <tbody id="a-body"></tbody>
      </table>
    </div>`;
  fillAliados("");
}
function fillAliados(q) {
  const nq = norm(q.trim());
  const list = ADM_ALIADOS.filter(a => !nq || norm(a.nombre).includes(nq) || norm(a.cat).includes(nq));
  $("#a-body").innerHTML = list.map(a => `
    <tr>
      <td><div class="ad-cell-user"><span class="ad-rank__ic">${ic(a.icon)}</span><div class="ad-cell-user__name">${a.nombre}</div></div></td>
      <td><span class="ad-table__num">${a.cat}</span></td>
      <td><span class="ad-num-strong">${a.usos}</span></td>
      <td><span class="ad-num-strong verde">${a.pct}</span></td>
      <td style="text-align:right"><span class="ad-pill ${a.estado}"><span class="d"></span>${a.estado === "activo" ? "Activo" : "Inactivo"}</span></td>
    </tr>`).join("");
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   RENDER: PROFESIONALES
   ============================================================ */
function renderProfesionales() {
  $("#p-profesionales").innerHTML = `
    <div class="ad-toolbar">
      <div class="ad-search-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input id="prof-search" placeholder="Buscar profesional…" autocomplete="off"></div>
      <div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="prof-add">${ic("plus")} Agregar profesional</button>
    </div>
    <div class="ad-table-wrap">
      <table class="ad-table">
        <thead><tr><th>Profesional</th><th>Área</th><th>Consultas del mes</th><th style="text-align:right">Estado</th></tr></thead>
        <tbody id="prof-body"></tbody>
      </table>
    </div>`;
  fillProfesionales("");
}
function fillProfesionales(q) {
  const nq = norm(q.trim());
  const list = ADM_PROFESIONALES.filter(p => !nq || norm(p.nombre).includes(nq) || norm(p.area).includes(nq));
  $("#prof-body").innerHTML = list.map(p => `
    <tr>
      <td><div class="ad-cell-user"><span class="ad-rank__ic">${ic(p.icon)}</span><div class="ad-cell-user__name">${p.nombre}</div></div></td>
      <td><span class="ad-table__num">${p.area}</span></td>
      <td><span class="ad-num-strong">${p.consultas}</span></td>
      <td style="text-align:right"><span class="ad-pill ${p.estado}"><span class="d"></span>${p.estado === "activo" ? "Activo" : "Inactivo"}</span></td>
    </tr>`).join("");
  if (window.lucide) lucide.createIcons();
}

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
      ${metric("banknote", COPk(v.mes), "Ingresos del mes", "junio 2026", "+8%", "up")}
      ${metric("calendar", COPk(v.anterior), "Mes anterior", "mayo 2026", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
      ${metric("trending-up", COPk(v.proyeccion), "Proyección anual", "estimado 2026", "+15%", "up")}
      ${metric("receipt", COP(v.ticket), "Ticket promedio", "por miembro / mes", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
    </div>
    <div class="ad-toolbar"><div class="ad-card__title">Últimas transacciones</div><div class="ad-spacer"></div><button class="ad-btn" id="v-csv">${ic("download")} Exportar historial</button></div>
    <div class="ad-table-wrap">
      <table class="ad-table">
        <thead><tr><th>Miembro</th><th>Plan</th><th>Fecha</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>
          ${ADM_TRANSACCIONES.map(t => `
            <tr>
              <td><div class="ad-cell-user"><span class="ad-av">${ini(t.nombre)}</span><div><div class="ad-cell-user__name">${t.nombre}</div><div class="ad-table__num">#${t.num}</div></div></div></td>
              <td><span class="ad-pill ${t.plan}"><span class="d"></span>${planLbl(t.plan)}</span></td>
              <td><span class="ad-table__num">${t.fecha}</span></td>
              <td style="text-align:right"><span class="ad-num-strong">${COP(t.valor)}</span></td>
            </tr>`).join("")}
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
      ${metric("badge-check", nf.format(s.activas), "Suscripciones activas", "al día de hoy", "+5%", "up")}
      ${metric("clock", s.vencen, "Vencen esta semana", "requieren recordatorio", "", "up").replace(/<span class="ad-metric__chip up">.*?<\/span>/, "")}
      ${metric("x-circle", s.canceladas, "Canceladas", "este mes", "-2%", "down")}
      ${metric("repeat", s.renovacion, "Tasa de renovación", "últimos 30 días", "+1%", "up")}
    </div>
    <div class="ad-toolbar"><div class="ad-card__title">Próximas renovaciones</div><div class="ad-spacer"></div><button class="ad-btn ad-btn--wa" id="s-rem">${ic("bell")} Enviar recordatorios</button></div>
    <div class="ad-table-wrap">
      <table class="ad-table">
        <thead><tr><th>Miembro</th><th>Plan</th><th>Renueva</th><th style="text-align:right">Cobro automático</th></tr></thead>
        <tbody>
          ${ADM_RENOVACIONES.map(r => `
            <tr>
              <td><div class="ad-cell-user"><span class="ad-av">${ini(r.nombre)}</span><div><div class="ad-cell-user__name">${r.nombre}</div><div class="ad-table__num">#${r.num}</div></div></div></td>
              <td><span class="ad-pill ${r.plan}"><span class="d"></span>${planLbl(r.plan)}</span></td>
              <td><span class="ad-table__num">${r.fecha}</span></td>
              <td style="text-align:right"><span class="ad-pill ${COBRO[r.cobro].c}"><span class="d"></span>${COBRO[r.cobro].t}</span></td>
            </tr>`).join("")}
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
   MÓDULO 7 — AGENTE DE WHATSAPP (bandeja del admin)
   ============================================================ */
let agActive = null, agQ = "";

function agPrev(c) {
  const last = c.msgs[c.msgs.length - 1];
  if (!last) return "";
  const txt = last.txt.replace(/<[^>]+>/g, "");
  return last.from === "agent" ? `<span class="me">Tú: ${txt}</span>` : txt;
}
function agUnreadTotal() { return ADM_CONVERS.reduce((s, c) => s + (c.unread || 0), 0); }
function updateAgCount() {
  const el = $("#ag-nav-count");
  if (el) { const n = agUnreadTotal(); el.textContent = n ? n : ""; el.style.display = n ? "" : "none"; }
}

function renderAgente() {
  if (!agActive) agActive = ADM_CONVERS[0]?.num || null;
  $("#p-agente").innerHTML = `
    <div class="ad-toolbar">
      <div class="ad-card__title">Conversaciones · ${ADM_CONVERS.length} chats activos</div>
      <div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="ag-broadcast">${ic("megaphone")} Difusión masiva</button>
    </div>
    <div class="ag-wrap">
      <div class="ag-list">
        <div class="ag-list__top">
          <div class="ag-list__title"><h3>Bandeja</h3><span class="n">${agUnreadTotal()} sin leer</span></div>
          <div class="ag-search-mini">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="ag-search" placeholder="Buscar conversación…" autocomplete="off" value="${agQ}">
          </div>
        </div>
        <ul class="ag-convs" id="ag-convs"></ul>
      </div>
      <div class="ag-thread" id="ag-thread"></div>
    </div>`;
  fillConvs();
  renderThread();
  if (window.lucide) lucide.createIcons();
}

function fillConvs() {
  const q = norm(agQ.trim());
  const list = ADM_CONVERS.filter(c => !q || norm(c.nombre).includes(q) || c.num.includes(q));
  $("#ag-convs").innerHTML = list.length ? list.map(c => `
    <li class="ag-conv ${c.num === agActive ? "is-active" : ""}" data-conv="${c.num}">
      <span class="ag-conv__av"><span class="av">${ini(c.nombre)}</span>${c.online ? '<span class="ag-conv__on"></span>' : ""}</span>
      <span class="ag-conv__main">
        <span class="ag-conv__row"><span class="ag-conv__name">${c.nombre}</span><span class="ag-conv__time">${c.time}</span></span>
        <span class="ag-conv__row"><span class="ag-conv__prev">${agPrev(c)}</span>${c.unread ? `<span class="ag-conv__badge">${c.unread}</span>` : ""}</span>
      </span>
    </li>`).join("") : `<li style="padding:30px;text-align:center;color:var(--txt-40);font-size:13px">Sin conversaciones</li>`;
}

function renderThread() {
  const c = ADM_CONVERS.find(x => x.num === agActive);
  const wrap = $("#ag-thread");
  if (!c) { wrap.innerHTML = `<div class="ag-empty"><span class="ag-empty__ic">${ic("message-circle")}</span><h3>Selecciona una conversación</h3><p>Elige un miembro de la bandeja para ver y responder sus mensajes.</p></div>`; if (window.lucide) lucide.createIcons(); return; }
  wrap.innerHTML = `
    <div class="ag-thread__head">
      <span class="av">${ini(c.nombre)}</span>
      <div class="ag-thread__id">
        <div class="ag-thread__name">${c.nombre} <span class="ad-pill ${c.plan}"><span class="d"></span>${planLbl(c.plan)}</span></div>
        <div class="ag-thread__meta">#${c.num} · ${c.online ? "en línea" : "visto recientemente"} · +57 ${c.wsp}</div>
      </div>
      <div class="ag-thread__actions">
        <button class="ad-btn" data-ver-miembro="${c.num}">${ic("user")} Ver perfil</button>
        <a class="ad-btn ad-btn--wa" href="https://wa.me/57${c.wsp.replace(/\s/g, "")}" target="_blank">${ic("external-link")} WhatsApp</a>
      </div>
    </div>
    <div class="ag-msgs" id="ag-msgs">
      ${c.msgs.map(m => `
        <div class="ag-b ag-b--${m.from}">
          ${m.from === "agent" && m.auto ? `<span class="ag-b__auto">${ic("bot")} Automático</span>` : ""}
          ${m.txt}
          <span class="t">${m.time}${m.from === "agent" ? " " + ic("check-check") : ""}</span>
        </div>`).join("")}
    </div>
    <div class="ag-compose">
      <div class="ag-tpls">
        ${ADM_WA_PLANTILLAS.map((p, i) => `<button class="ag-tpl" data-tpl="${i}">${p.lbl}</button>`).join("")}
      </div>
      <div class="ag-compose__row">
        <textarea class="ag-compose__in" id="ag-input" rows="1" placeholder="Escribe un mensaje para ${c.nombre.split(" ")[0]}…"></textarea>
        <button class="ag-send" id="ag-send">${ic("send-horizontal")}</button>
      </div>
    </div>`;
  if (window.lucide) lucide.createIcons();
  scrollMsgs();
}
function scrollMsgs() { const m = $("#ag-msgs"); if (m) m.scrollTop = m.scrollHeight; }

function abrirConv(num) {
  agActive = num;
  const c = ADM_CONVERS.find(x => x.num === num);
  if (c) c.unread = 0;
  fillConvs();
  renderThread();
  updateAgCount();
}
function ahora() {
  return new Date().toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
}
function enviarMsg() {
  const inp = $("#ag-input");
  const c = ADM_CONVERS.find(x => x.num === agActive);
  if (!inp || !c) return;
  const txt = inp.value.trim();
  if (!txt) return;
  c.msgs.push({ from: "agent", txt: txt.replace(/</g, "&lt;"), time: ahora() });
  c.time = "ahora";
  inp.value = ""; inp.style.height = "auto";
  renderThread();
  fillConvs();
}

function abrirDifusion() {
  let aud = "todos";
  $("#modal-body").innerHTML = `
    <div class="ad-field">
      <label>Audiencia</label>
      <div class="ag-aud" id="ag-aud">
        ${ADM_WA_AUDIENCIAS.map(a => `
          <div class="ag-aud__opt ${a.id === aud ? "is-on" : ""}" data-aud="${a.id}">
            <span class="ag-aud__radio"></span>
            <span class="ag-aud__lbl">${a.lbl}</span>
            <span class="ag-aud__n"><b>${a.n.toLocaleString("es-CO")}</b> miembros</span>
          </div>`).join("")}
      </div>
    </div>
    <div class="ad-field"><label>Mensaje</label><textarea id="ag-bc-msg" rows="4" placeholder="Escribe el mensaje que recibirán por WhatsApp…">🌿 Hola {nombre}, desde El Club de la Gente queremos contarte que…</textarea></div>
    <div class="ad-field" style="margin-bottom:6px"><label>Plantillas rápidas</label>
      <div class="ag-tpls" style="padding:0">${ADM_WA_PLANTILLAS.map((p, i) => `<button class="ag-tpl" data-bc-tpl="${i}">${p.lbl}</button>`).join("")}</div>
    </div>
    <div class="ad-toolbar" style="margin:6px 0 0">
      <span style="font-size:12px;color:var(--txt-40)">${ic("info")} Se enviará desde el número oficial del Club</span>
      <div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="ag-bc-send">${ic("send-horizontal")} Enviar difusión</button>
    </div>`;
  $("#modal-title").textContent = "Difusión masiva por WhatsApp";
  $("#modal-sub").textContent = "Mensaje a un grupo de miembros";
  $("#ad-modal-ov").classList.add("is-open");
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   MODAL DE MIEMBRO
   ============================================================ */
function abrirMiembro(num) {
  const u = ADM_MIEMBROS.find(x => x.num === num);
  if (!u) return;
  $("#modal-body").innerHTML = `
    <div class="ad-field-2">
      <div class="ad-field"><label>Plan</label><input value="${planLbl(u.plan)}" readonly></div>
      <div class="ad-field"><label>Estado</label><input value="${u.estado === "activo" ? "Activo" : "Inactivo"}" readonly></div>
    </div>
    <div class="ad-field-2">
      <div class="ad-field"><label>Miembro desde</label><input value="${u.fecha}" readonly></div>
      <div class="ad-field"><label>Barrio</label><input value="${u.barrio}" readonly></div>
    </div>
    <div class="ad-field"><label>WhatsApp</label><input value="${u.wsp}" readonly></div>
    <div class="ad-field"><label>Ahorro total acumulado</label><input value="${COP(u.ahorro)}" readonly></div>
    <div class="ad-toolbar" style="margin:6px 0 0">
      <a class="ad-btn ad-btn--wa" href="https://wa.me/57${u.wsp.replace(/\s/g, "")}" target="_blank">${ic("message-circle")} Escribir por WhatsApp</a>
      <div class="ad-spacer"></div>
    </div>`;
  $("#modal-title").textContent = u.nombre;
  $("#modal-sub").textContent = "Miembro #" + u.num;
  $("#ad-modal-ov").classList.add("is-open");
  if (window.lucide) lucide.createIcons();
}
function abrirAgregarAliado() {
  $("#modal-body").innerHTML = `
    <div class="ad-field"><label>Nombre del establecimiento</label><input placeholder="Ej: Café del Parque"></div>
    <div class="ad-field-2">
      <div class="ad-field"><label>Categoría</label>
        <select>${["Salud", "Odontología", "Turismo", "Veterinaria", "Canasta familiar", "Barbería", "Comida rápida", "Heladería", "Ropa personalizada", "Negocios"].map(c => `<option>${c}</option>`).join("")}</select>
      </div>
      <div class="ad-field"><label>Descuento principal</label><input placeholder="Ej: 20%"></div>
    </div>
    <div class="ad-field"><label>Descripción del negocio</label><textarea rows="3" placeholder="Cuéntale al Club qué ofrece este aliado…"></textarea></div>
    <div class="ad-field"><label>Foto del lugar</label>
      <div class="ad-drop" style="padding:28px"><div class="ad-drop__ic" style="width:42px;height:42px;margin-bottom:10px">${ic("image-plus")}</div><p>Subir foto del establecimiento</p></div>
    </div>
    <div class="ad-toolbar" style="margin:6px 0 0"><div class="ad-spacer"></div><button class="ad-btn ad-btn--verde" id="aliado-guardar">${ic("check")} Guardar aliado</button></div>`;
  $("#modal-title").textContent = "Agregar aliado";
  $("#modal-sub").textContent = "Se publicará en el directorio";
  $("#ad-modal-ov").classList.add("is-open");
  if (window.lucide) lucide.createIcons();
}
function cerrarModal() { $("#ad-modal-ov").classList.remove("is-open"); }

/* ---------- MODAL: Agregar profesional ---------- */
function abrirAgregarProfesional() {
  $("#modal-body").innerHTML = `
    <div class="ad-field"><label>Nombre del profesional</label><input placeholder="Ej: Dra. Laura Gómez"></div>
    <div class="ad-field-2">
      <div class="ad-field"><label>Área de asesoría</label>
        <select>${["Asesoría jurídica", "Asesoría psicológica", "Asesoría contable", "Asesoría financiera", "Asesoría empresarial"].map(c => `<option>${c}</option>`).join("")}</select>
      </div>
      <div class="ad-field"><label>WhatsApp de contacto</label><input placeholder="300 000 0000"></div>
    </div>
    <div class="ad-field"><label>Servicios que ofrece a los miembros</label><textarea rows="3" placeholder="Describe las asesorías y beneficios para miembros del Club…"></textarea></div>
    <div class="ad-field"><label>Foto del profesional</label>
      <div class="ad-drop" style="padding:28px"><div class="ad-drop__ic" style="width:42px;height:42px;margin-bottom:10px">${ic("image-plus")}</div><p>Subir foto del profesional</p></div>
    </div>
    <div class="ad-toolbar" style="margin:6px 0 0"><div class="ad-spacer"></div><button class="ad-btn ad-btn--verde" id="prof-guardar">${ic("check")} Guardar profesional</button></div>`;
  $("#modal-title").textContent = "Agregar profesional";
  $("#modal-sub").textContent = "Se publicará en la sección Profesionales de la web";
  $("#ad-modal-ov").classList.add("is-open");
  if (window.lucide) lucide.createIcons();
}

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
    ({ dashboard: renderDashboard, miembros: renderMiembros, aliados: renderAliados, profesionales: renderProfesionales, contenido: renderContenido, programas: renderProgramas, ventas: renderVentas, suscripciones: renderSuscripciones, config: renderConfig, agente: renderAgente })[panel]?.();
    RENDERED[panel] = true;
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
    if (mTab) { miembroTab = mTab.dataset.tab; $$("#m-tabs .ad-tab").forEach(t => t.classList.toggle("is-on", t === mTab)); fillMiembros(); return; }

    const row = e.target.closest("tr[data-miembro]");
    if (row) { abrirMiembro(row.dataset.miembro); return; }

    // --- Agente WhatsApp ---
    const conv = e.target.closest("[data-conv]");
    if (conv) { abrirConv(conv.dataset.conv); return; }
    const tpl = e.target.closest("[data-tpl]");
    if (tpl) { const inp = $("#ag-input"); if (inp) { inp.value = ADM_WA_PLANTILLAS[tpl.dataset.tpl].txt; inp.focus(); inp.style.height = "auto"; inp.style.height = inp.scrollHeight + "px"; } return; }
    if (e.target.closest("#ag-send")) { enviarMsg(); return; }
    if (e.target.closest("#ag-broadcast")) { abrirDifusion(); return; }
    const verM = e.target.closest("[data-ver-miembro]");
    if (verM) { abrirMiembro(verM.dataset.verMiembro); return; }
    const aud = e.target.closest("[data-aud]");
    if (aud) { $$("#ag-aud .ag-aud__opt").forEach(o => o.classList.toggle("is-on", o === aud)); return; }
    const bcTpl = e.target.closest("[data-bc-tpl]");
    if (bcTpl) { const m = $("#ag-bc-msg"); if (m) m.value = ADM_WA_PLANTILLAS[bcTpl.dataset.bcTpl].txt; return; }
    if (e.target.closest("#ag-bc-send")) {
      const sel = $("#ag-aud .ag-aud__opt.is-on");
      const a = ADM_WA_AUDIENCIAS.find(x => x.id === (sel?.dataset.aud || "todos"));
      cerrarModal(); toast(`Difusión enviada a ${a.n.toLocaleString("es-CO")} miembros · ${a.lbl}`); return;
    }

    if (e.target.closest("#a-add")) { abrirAgregarAliado(); return; }
    if (e.target.closest("#prof-add")) { abrirAgregarProfesional(); return; }
    if (e.target.closest("#prof-guardar")) { cerrarModal(); toast("Profesional guardado · publicado en la web"); return; }
    if (e.target.closest("#modal-close") || e.target.id === "ad-modal-ov") { cerrarModal(); return; }
    if (e.target.closest("#aliado-guardar")) { cerrarModal(); toast("Aliado guardado · publicado en el directorio"); return; }
    if (e.target.closest("#m-csv") || e.target.closest("#v-csv")) { toast("Exportando CSV…"); return; }
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
    if (e.target.id === "m-search") { miembroQ = e.target.value; fillMiembros(); }
    if (e.target.id === "a-search") { fillAliados(e.target.value); }
    if (e.target.id === "prof-search") { fillProfesionales(e.target.value); }
    if (e.target.id === "ag-search") { agQ = e.target.value; fillConvs(); }
    if (e.target.id === "ag-input") { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }
  });

  // Enter para enviar mensaje del agente
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "ag-input" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMsg(); }
  });
  document.addEventListener("dragover", (e) => { const d = e.target.closest("#ad-drop"); if (d) { e.preventDefault(); d.classList.add("is-over"); } });
  document.addEventListener("dragleave", (e) => { const d = e.target.closest("#ad-drop"); if (d) d.classList.remove("is-over"); });
  document.addEventListener("drop", (e) => { const d = e.target.closest("#ad-drop"); if (d) { e.preventDefault(); d.classList.remove("is-over"); toast("Archivo subido · se reflejará en la web"); } });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarModal(); });

  if (window.lucide) lucide.createIcons();
});
