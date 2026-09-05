/* ============================================================
   EL CLUB DE LA GENTE — Módulo 4 · Lógica de perfil/dashboard
   ============================================================ */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const supabase = createClient(
  "https://egwaedadpqfwnbfosiao.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2FlZGFkcHFmd25iZm9zaWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njc2ODcsImV4cCI6MjA5NjM0MzY4N30.NrBPX8HhTcs_y-QG3o_GoEAednFc0TqUunkQe1dblT4"
);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const ic = (n) => `<i data-lucide="${n}"></i>`;
// agente.js es un script clásico (no módulo) que reutiliza estos helpers vía window
window.$ = $; window.$$ = $$; window.ic = ic;
const fmtCOP = (n) => "$" + new Intl.NumberFormat("es-CO").format(n);
// Escapa texto que viene de otros usuarios (nombre de producto del aliado,
// datos de envio del miembro) antes de insertarlo en innerHTML.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Campos de dinero: texto con separador de miles en vivo (un <input type="number"> interpreta
// el "." que la gente escribe para miles como punto decimal, ej. "62.000" -> 62).
function formatearInputMoneda(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "");
    input.value = digits ? Number(digits).toLocaleString("es-CO") : "";
  });
}
function valorMoneda(input) { return parseInt((input?.value || "").replace(/\D/g, "")) || 0; }

/* ---------- TOAST ---------- */
let _toastT;
function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.innerHTML = `<span class="chk">${ic("check")}</span><span>${msg}</span>`;
  if (window.lucide) lucide.createIcons();
  t.classList.add("is-show");
  clearTimeout(_toastT);
  _toastT = setTimeout(() => t.classList.remove("is-show"), 3200);
}

/* ---------- Estado / perfil ---------- */
function leerPerfil() {
  const p = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
  const m = JSON.parse(localStorage.getItem("ecdlg_miembro") || "{}");
  const plan = localStorage.getItem("ecdlg_plan") || "premium";
  const params = new URLSearchParams(location.search);
  const rol = params.get("rol") || p.rol || localStorage.getItem("ecdlg_rol") || "miembro";
  return {
    nombre: p.nombre || "",
    primerNombre: p.primerNombre || "Miembro",
    fechaISO: p.fechaISO || "",
    mision: p.mision || null,
    num: m.num || "",
    codigo: m.codigo || p.codigo || p.whatsapp || "",
    foto: localStorage.getItem("ecdlg_foto") || "",
    desde: m.desde || "",
    negocio: p.negocio || "Tu negocio",
    rol, plan,
  };
}
window.leerPerfil = leerPerfil;
function iniciales(nombre) {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const PLAN_LABEL = { sin_plan: "Sin activar", gratis: "Gratis", basica: "Básica", premium: "Premium", vitalicia: "Vitalicia" };
const LIMITE_DESCUENTOS = { gratis: 1, basica: 2, premium: Infinity, vitalicia: Infinity };

/* ---------- RENDER ---------- */
function render() {
  const u = leerPerfil();
  const ini = iniciales(u.nombre);
  const planLbl = PLAN_LABEL[u.plan] || "Premium";

  // Sidebar + topbar
  $$("[data-ini]").forEach(el => el.textContent = ini);
  if (u.foto) aplicarFoto(u.foto);
  $("#sb-name").textContent = u.nombre;
  $("#sb-num").textContent = "Miembro #" + u.num;
  $("#sb-plan-name").textContent = planLbl;
  $("#greet-name").textContent = "Hola, " + u.primerNombre + ".";

  // ClubCard (nuevo diseño)
  $$(".cc-card-name").forEach(el => el.textContent = u.nombre.toUpperCase());
  $$(".cc-card-codigo").forEach(el => el.textContent = u.codigo);
  // Tema premium (dorado) o básico (plata)
  $$(".ccv2").forEach(el => el.classList.toggle("ccv2--premium", u.plan === "premium"));

  // Perfil
  $("#perfil-name").textContent = u.nombre;
  $("#perfil-num").textContent = "Miembro #" + u.num;
  $("#perfil-plan").textContent = planLbl;
  const fecha = new Date(u.fechaISO + "T00:00:00");
  $("#perfil-fecha").textContent = fecha.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  $("#perfil-desde").textContent = u.desde;

  // Actividad reciente: se carga desde Supabase en cargarDescuentos()
  const actEl = $("#actividad");
  if (actEl) actEl.innerHTML = `<li class="act-item" style="color:#888;font-size:13px;padding:12px 0">Aún no tienes descuentos registrados.</li>`;

  const tablaEl = $("#tabla-body");
  if (tablaEl) tablaEl.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;padding:16px">Sin actividad aún</td></tr>`;

  // Rol aliado ("Mi negocio") ya no se decide acá con localStorage — se
  // resuelve con la sesión real de Supabase más abajo, en el callback de
  // getSession(), donde se busca el aliado vinculado por user_id.

  // Rol profesional: mostrar "Mi consultorio"
  if (u.rol === "profesional") {
    const li = $("#sb-profesional-li");
    if (li) li.hidden = false;
    cargarPanelProfesional();
  }

  if (window.lucide) lucide.createIcons();
}

/* ---------- Foto de perfil ---------- */
function aplicarFoto(dataUrl) {
  $$("[data-ini]").forEach(el => { el.innerHTML = `<img src="${dataUrl}" alt="Foto de perfil">`; });
  const quitar = $("#cfg-foto-quitar"); if (quitar) quitar.hidden = false;
}
function quitarFoto() {
  localStorage.removeItem("ecdlg_foto");
  const u = leerPerfil();
  $$("[data-ini]").forEach(el => { el.textContent = iniciales(u.nombre); });
  const quitar = $("#cfg-foto-quitar"); if (quitar) quitar.hidden = true;
}

/* ---------- Navegación de paneles ---------- */
const TITULOS = { inicio: "Inicio", negocio: "Mi negocio", perfil: "Mi perfil", clubcard: "Mi ClubCard", tienda: "Tienda", descuentos: "Mis descuentos", agente: "Mi Agente", config: "Configuración" };
function irPanel(panel) {
  $$(".panel-view").forEach(v => v.classList.toggle("is-active", v.dataset.panel === panel));
  $$(".sb-link[data-panel]").forEach(l => l.classList.toggle("is-active", l.dataset.panel === panel));
  $("#topbar-title").innerHTML = `Mi cuenta · <b>${TITULOS[panel] || ""}</b>`;
  $("#dash").classList.remove("menu-open");
  $(".dash-content").scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.irPanel = irPanel;

/* ============================================================
   SEGMENTACIÓN
   ============================================================ */
let segBlock = 0;
const SEG_TOTAL = 4;
function segMostrar(i) {
  segBlock = Math.max(0, Math.min(SEG_TOTAL - 1, i));
  $$(".seg-block").forEach((b, k) => b.classList.toggle("is-active", k === segBlock));
  $("#seg-bar").style.width = ((segBlock + 1) / SEG_TOTAL * 100) + "%";
  $("#seg-prev").style.visibility = segBlock === 0 ? "hidden" : "visible";
  $("#seg-next").textContent = segBlock === SEG_TOTAL - 1 ? "Finalizar" : "Continuar";
  $(".seg-overlay").scrollTo({ top: 0, behavior: "smooth" });
}
function abrirSeg(i = 0) {
  $(".seg-overlay").classList.add("is-open");
  document.body.style.overflow = "hidden";
  segMostrar(i);
  if (window.lucide) lucide.createIcons();
}
function cerrarSeg() {
  $(".seg-overlay").classList.remove("is-open");
  document.body.style.overflow = "";
  localStorage.setItem("ecdlg_segmentado", "1");
}

// Oculta y precarga del Bloque 1 solo lo que ya conocemos (registro manual o
// Google) — así no le repetimos preguntas a quien ya las respondió, pero sí
// se las hacemos a quien entró por Google (que no trae fecha ni WhatsApp).
function prepararCamposConocidos(perfil) {
  const partes = (perfil?.nombre || "").trim().split(/\s+/).filter(Boolean);
  const tieneNombre = partes.length > 0;
  const tieneApellido = partes.length > 1;
  const tieneFecha = !!perfil?.fecha_nacimiento;
  const tieneWhatsapp = !!perfil?.whatsapp;

  const ajustar = (id, valor, conocido) => {
    const input = $("#" + id);
    if (!input) return;
    if (conocido && valor) input.value = valor;
    const q = input.closest(".seg-q");
    if (q) q.hidden = conocido;
  };
  ajustar("seg-nombre", partes[0] || "", tieneNombre);
  ajustar("seg-apellido", partes.slice(1).join(" "), tieneApellido);
  ajustar("seg-fecha", perfil?.fecha_nacimiento || "", tieneFecha);
  ajustar("seg-whatsapp", perfil?.whatsapp || "", tieneWhatsapp);
}

/* ---------- Descuentos reales ---------- */
async function cargarDescuentos(userId) {
  const { data, error } = await supabase
    .from("descuentos")
    .select("aliado_nombre, categoria, descuento_pct, compra, ahorro, created_at")
    .eq("miembro_id", userId)
    .order("created_at", { ascending: false });
  // Mostrar usos restantes según el límite de cada plan (premium/vitalicia = ilimitado)
  const u = leerPerfil();
  const limite = LIMITE_DESCUENTOS[u.plan] ?? 2;
  if (limite !== Infinity) {
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
    const usosMes = (data || []).filter(d => new Date(d.created_at) >= inicioMes).length;
    const restantes = Math.max(0, limite - usosMes);
    const banner = document.getElementById("banner-usos");
    if (banner) {
      banner.style.display = "flex";
      banner.innerHTML = restantes > 0
        ? `<span>${ic("ticket-percent")} Te quedan <b>${restantes} descuento${restantes !== 1 ? "s" : ""}</b> este mes · <a href="Planes.html" style="color:#1a7a3c;font-weight:700">Actualizar a Premium</a></span>`
        : `<span style="color:#b45309">${ic("alert-triangle")} Llegaste al límite de ${limite} descuento${limite !== 1 ? "s" : ""} este mes · <a href="Planes.html" style="color:#b45309;font-weight:700">Actualizar a Premium</a></span>`;
      banner.style.background = restantes > 0 ? "#e8f5ee" : "#fef3c7";
      banner.style.color = restantes > 0 ? "#1a7a3c" : "#b45309";
      if (window.lucide) lucide.createIcons();
    }
  }

  if (error || !data?.length) return;

  const iconMap = { "Odontología": "smile", "Bienestar y salud": "heart-pulse", "Turismo": "mountain-snow",
    "Veterinaria": "paw-print", "Canasta familiar": "shopping-basket", "Ropa personalizada": "shirt",
    "Heladería": "ice-cream", "Comida rápida": "sandwich", "Barbería": "scissors" };
  const getIcon = (cat) => iconMap[cat] || "receipt";
  const fmtFecha = (iso) => new Date(iso).toLocaleDateString("es-CO", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });

  // Stats
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
  const dataMes = data.filter(d => new Date(d.created_at) >= inicioMes);
  const ahorroMes = dataMes.reduce((s, d) => s + (d.ahorro || 0), 0);
  const countMes = dataMes.length;
  const aliadosMes = new Set(dataMes.map(d => d.aliado_nombre)).size;
  const ahorroTotal = data.reduce((s, d) => s + (d.ahorro || 0), 0);

  const elAhorroMes = document.getElementById("stat-ahorro-mes");
  const elDescMes = document.getElementById("stat-descuentos-mes");
  const elAliadosMes = document.getElementById("stat-aliados-mes");
  const elAhorroTotal = document.getElementById("stat-ahorro-total");
  if (elAhorroMes) elAhorroMes.textContent = fmtCOP(ahorroMes);
  if (elDescMes) elDescMes.textContent = countMes;
  if (elAliadosMes) elAliadosMes.textContent = aliadosMes;
  if (elAhorroTotal) elAhorroTotal.textContent = fmtCOP(ahorroTotal);

  // Actividad reciente (dashboard)
  const actEl = $("#actividad");
  if (actEl) actEl.innerHTML = data.slice(0, 4).map(it => `
    <li class="act-item">
      <span class="act-item__ic">${ic(getIcon(it.categoria))}</span>
      <span class="act-item__body">
        <span class="act-item__name">${it.aliado_nombre}</span>
        <span class="act-item__meta">${fmtFecha(it.created_at)} · ${it.descuento_pct} de descuento</span>
      </span>
      <span class="act-item__nums">
        <span class="act-item__ahorro">−${fmtCOP(it.ahorro)}</span>
        <span class="act-item__compra">de ${fmtCOP(it.compra)}</span>
      </span>
    </li>`).join("");

  // Tabla completa de descuentos
  const tablaEl = $("#tabla-body");
  if (tablaEl) tablaEl.innerHTML = data.map(it => `
    <tr>
      <td><span class="tabla__aliado"><span class="tabla__ic">${ic(getIcon(it.categoria))}</span>
        <span><span class="tabla__name">${it.aliado_nombre}</span><br><span class="tabla__cat">${it.categoria || ""}</span></span></span></td>
      <td>${fmtFecha(it.created_at)}</td>
      <td><span class="tag-pct">${it.descuento_pct}</span></td>
      <td>${fmtCOP(it.compra)}</td>
      <td class="tabla__ahorro">−${fmtCOP(it.ahorro)}</td>
    </tr>`).join("");

  if (window.lucide) lucide.createIcons();
}

/* ---------- Ventas del negocio (aliados) ---------- */
const MES_LBL = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

async function cargarVentasNegocio(aliadoId) {
  const panel = document.querySelector("section[data-panel='negocio']");
  if (!panel) return;
  const ahora = new Date();

  const [{ data, error }, { data: promos }, { data: todas }] = await Promise.all([
    supabase.from("descuentos")
      .select("miembro_id, descuento_pct, compra, ahorro, created_at")
      .eq("aliado_id", aliadoId)
      .order("created_at", { ascending: false }),
    supabase.from("promociones")
      .select("tipo, descripcion, precio_normal, precio_descuento, ahorro_fijo")
      .eq("aliado_id", aliadoId).eq("activa", true)
      .order("created_at", { ascending: false }).limit(1),
    supabase.from("descuentos")
      .select("aliado_id")
      .gte("created_at", new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()),
  ]);

  if (error) { console.error("cargarVentasNegocio:", error); return; }
  const filas = data || [];

  const esMes = d => {
    const f = new Date(d.created_at);
    return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
  };
  const mes = filas.filter(esMes);
  const totalVentas  = mes.reduce((s, d) => s + (d.compra || 0), 0);
  const totalAhorro  = mes.reduce((s, d) => s + (d.ahorro || 0), 0);
  const countDesc    = mes.length;
  const countClients = new Set(mes.map(d => d.miembro_id)).size;

  // Stats
  const nums = panel.querySelectorAll(".stat__num");
  if (nums[0]) nums[0].textContent = fmtCOP(totalVentas);
  if (nums[1]) nums[1].textContent = countClients;
  if (nums[2]) nums[2].textContent = countDesc;
  if (nums[3]) nums[3].textContent = fmtCOP(totalAhorro);

  // Tabla de ventas
  const tbody = panel.querySelector(".tabla tbody");
  const fmtF = iso => new Date(iso).toLocaleDateString("es-CO", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
  if (tbody) {
    tbody.innerHTML = filas.length
      ? filas.slice(0, 15).map(it => `
        <tr>
          <td><span class="tabla__name">Miembro del Club</span></td>
          <td>${fmtF(it.created_at)}</td>
          <td><span class="tag-pct">${it.descuento_pct}</span></td>
          <td>${it.compra ? fmtCOP(it.compra) : "—"}</td>
          <td class="tabla__ahorro">−${fmtCOP(it.ahorro || 0)}</td>
        </tr>`).join("")
      : `<tr><td colspan="5" style="text-align:center;color:var(--tinta-40);padding:16px">Aún no tienes ventas registradas con el Club</td></tr>`;
  }

  // Gráfico de los últimos 6 meses (real)
  const chart = document.getElementById("negocio-chart");
  const chartYear = document.getElementById("negocio-chart-year");
  if (chart) {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      meses.push({ y: d.getFullYear(), m: d.getMonth(), total: 0 });
    }
    filas.forEach(f => {
      const d = new Date(f.created_at);
      const slot = meses.find(x => x.y === d.getFullYear() && x.m === d.getMonth());
      if (slot) slot.total += (f.compra || 0);
    });
    const max = Math.max(1, ...meses.map(x => x.total));
    chart.innerHTML = meses.map((x, i) => `
      <div class="neg-col"><span class="neg-bar${i === meses.length - 1 ? " neg-bar--now" : ""}" style="height:${x.total ? Math.max(6, Math.round(x.total / max * 100)) : 2}%"></span><span class="neg-lbl">${MES_LBL[x.m]}</span></div>
    `).join("");
    if (chartYear) chartYear.textContent = String(ahora.getFullYear());
  }

  // Beneficio activo (promo real del aliado)
  const promo = promos?.[0];
  const pctEl = document.getElementById("negocio-benef-pct");
  const nameEl = document.getElementById("negocio-benef-name");
  const estadoEl = document.getElementById("negocio-benef-estado");
  if (promo) {
    let badge = "Promo";
    if (promo.tipo === "porcentaje" && promo.precio_normal && promo.ahorro_fijo) badge = Math.round(promo.ahorro_fijo / promo.precio_normal * 100) + "%";
    else if (promo.tipo === "monto_fijo" && promo.ahorro_fijo) badge = "-" + fmtCOP(promo.ahorro_fijo);
    else if (promo.tipo === "precio_especial" && promo.precio_descuento != null) badge = fmtCOP(promo.precio_descuento);
    else if (promo.tipo === "regalo") badge = "🎁";
    else if (promo.tipo === "2x1") badge = "2×1";
    if (pctEl) pctEl.textContent = badge;
    if (nameEl) nameEl.textContent = promo.descripcion || "Descuento para miembros";
    if (estadoEl) estadoEl.innerHTML = `<span class="dot"></span> Activo y publicado en el directorio`;
  } else {
    if (pctEl) pctEl.textContent = "—";
    if (nameEl) nameEl.textContent = "Sin promociones activas";
    if (estadoEl) estadoEl.textContent = "Crea una promoción desde el Directorio para que los miembros la vean";
  }

  // Posición en usos este mes (ranking real entre todos los aliados)
  const posEl = document.getElementById("negocio-posicion");
  if (posEl) {
    if (todas?.length) {
      const conteos = {};
      todas.forEach(r => { conteos[r.aliado_id] = (conteos[r.aliado_id] || 0) + 1; });
      const orden = Object.entries(conteos).sort((a, b) => b[1] - a[1]);
      const idx = orden.findIndex(([id]) => id === aliadoId);
      posEl.textContent = idx >= 0 ? `#${idx + 1} del mes` : "Sin usos este mes";
    } else {
      posEl.textContent = "Sin usos este mes";
    }
  }

  if (window.lucide) lucide.createIcons();
}

/* ---------- Mi tienda (aliado) ---------- */
let _tiendaAliadoId = null;
let _tiendaCategorias = [];

function abrirModalTienda(titulo, bodyHtml) {
  const t = $("#modal-tienda-title"); if (t) t.textContent = titulo;
  const b = $("#modal-tienda-body"); if (b) b.innerHTML = bodyHtml;
  const m = $("#modal-tienda"); if (m) m.style.display = "flex";
  document.body.style.overflow = "hidden";
  if (window.lucide) lucide.createIcons();
}
function cerrarModalTienda() {
  const m = $("#modal-tienda"); if (m) m.style.display = "none";
  document.body.style.overflow = "";
}

function renderTiendaEstado(negocio) {
  const explicador = $("#tienda-aliado-explicador");
  const panel = $("#tienda-aliado-panel");
  if (negocio.tienda_activa) {
    if (explicador) explicador.style.display = "none";
    if (panel) panel.style.display = "";
    const nombreEl = $("#tda-nombre"); if (nombreEl) nombreEl.value = negocio.tienda_nombre || negocio.nombre || "";
    const llaveEl = $("#tda-llave"); if (llaveEl) llaveEl.value = negocio.tienda_llave_pago || "";
    const mapsEl = $("#tda-maps"); if (mapsEl) mapsEl.value = negocio.maps_url || "";
    const igEl = $("#tda-instagram"); if (igEl) igEl.value = negocio.instagram || "";
    const fbEl = $("#tda-facebook"); if (fbEl) fbEl.value = negocio.facebook || "";
    const ttEl = $("#tda-tiktok"); if (ttEl) ttEl.value = negocio.tiktok || "";
  } else {
    if (explicador) explicador.style.display = "";
    if (panel) panel.style.display = "none";
  }
}

function inicializarMiTienda(negocio) {
  _tiendaAliadoId = negocio.id;

  $$(".neg-tab-btn").forEach(b => b.addEventListener("click", () => {
    $$(".neg-tab-btn").forEach(x => x.classList.toggle("is-active", x === b));
    const tab = b.dataset.negtab;
    const res = $("#negtab-resumen"); if (res) res.style.display = tab === "resumen" ? "" : "none";
    const tie = $("#negtab-tienda"); if (tie) tie.style.display = tab === "tienda" ? "" : "none";
  }));

  $("#modal-tienda-close")?.addEventListener("click", cerrarModalTienda);
  $("#modal-tienda")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) cerrarModalTienda(); });

  renderTiendaEstado(negocio);

  $("#btn-activar-tienda")?.addEventListener("click", async () => {
    const btn = $("#btn-activar-tienda");
    btn.disabled = true;
    const tiendaNombre = negocio.tienda_nombre || negocio.nombre;
    const { error } = await supabase.from("aliados").update({ tienda_activa: true, tienda_nombre: tiendaNombre }).eq("id", negocio.id);
    if (error) { toast("Error activando la tienda"); btn.disabled = false; return; }
    negocio.tienda_activa = true;
    negocio.tienda_nombre = tiendaNombre;
    renderTiendaEstado(negocio);
  });

  $("#tda-guardar")?.addEventListener("click", async () => {
    const btn = $("#tda-guardar");
    const nombre = $("#tda-nombre")?.value.trim();
    const llave = $("#tda-llave")?.value.trim();
    const maps = $("#tda-maps")?.value.trim();
    const instagram = $("#tda-instagram")?.value.trim();
    const facebook = $("#tda-facebook")?.value.trim();
    const tiktok = $("#tda-tiktok")?.value.trim();
    btn.disabled = true;
    const { error } = await supabase.from("aliados").update({ tienda_nombre: nombre || null, tienda_llave_pago: llave || null, maps_url: maps || null, instagram: instagram || null, facebook: facebook || null, tiktok: tiktok || null }).eq("id", negocio.id);
    btn.disabled = false;
    if (error) { toast("Error guardando los datos"); return; }
    const msg = $("#tda-guardado-msg");
    if (msg) { msg.style.display = "inline"; setTimeout(() => { msg.style.display = "none"; }, 2000); }
  });

  $("#btn-agregar-producto")?.addEventListener("click", () => abrirFormProducto());

  cargarMisProductos(negocio.id);
  cargarPedidosAliado(negocio.id);
}

const ESTADO_PRODUCTO_ALIADO = {
  pendiente: { c: "#b45309", bg: "#fef3c7", t: "En revisión" },
  aprobado:  { c: "#1a7a3c", bg: "#e8f5ee", t: "Publicado" },
  rechazado: { c: "#c0392b", bg: "#fdecea", t: "Rechazado" },
};

async function cargarMisProductos(aliadoId) {
  const list = $("#tienda-productos-list");
  if (!list) return;
  const { data } = await supabase.from("productos_aliado").select("*, categorias_productos(nombre)").eq("aliado_id", aliadoId).order("created_at", { ascending: false });
  const productos = data || [];
  const statProdEl = $("#tda-stat-productos");
  if (statProdEl) statProdEl.textContent = productos.filter(p => p.estado === "aprobado" && p.activo).length;
  if (!productos.length) { list.innerHTML = `<p style="padding:8px 0">Aún no has agregado productos.</p>`; return; }
  list.innerHTML = productos.map(p => {
    const est = ESTADO_PRODUCTO_ALIADO[p.estado] || ESTADO_PRODUCTO_ALIADO.pendiente;
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #ebebeb">
      ${p.imagen_url ? `<img src="${p.imagen_url}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0">` : `<div style="width:44px;height:44px;border-radius:8px;background:#f0faf4;flex-shrink:0"></div>`}
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">${esc(p.nombre)}</div>
        <div style="font-size:12px;color:#777">${esc(p.categorias_productos?.nombre) || "Sin categoría"}${p.fecha_fin ? " · promo hasta " + new Date(p.fecha_fin + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : ""}</div>
      </div>
      <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:${est.bg};color:${est.c};flex-shrink:0;white-space:nowrap">${est.t}</span>
      <button data-ed-prodal="${p.id}" style="border:none;background:none;cursor:pointer;color:#777"><i data-lucide="pencil" style="width:16px;height:16px"></i></button>
      <button data-rm-prodal="${p.id}" style="border:none;background:none;cursor:pointer;color:#c0392b"><i data-lucide="trash-2" style="width:16px;height:16px"></i></button>
    </div>`;
  }).join("");
  if (window.lucide) lucide.createIcons();
  list.querySelectorAll("[data-ed-prodal]").forEach(btn => btn.addEventListener("click", () => {
    const p = productos.find(x => x.id === btn.dataset.edProdal);
    if (p) abrirFormProducto(p);
  }));
  list.querySelectorAll("[data-rm-prodal]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error, count } = await supabase.from("productos_aliado").delete({ count: "exact" }).eq("id", btn.dataset.rmProdal);
    if (error) { toast("Error eliminando: " + error.message); return; }
    if (!count) { toast("No se pudo eliminar (sin permiso)"); return; }
    cargarMisProductos(aliadoId);
  }));
}

async function abrirFormProducto(p = {}) {
  if (!_tiendaCategorias.length) {
    const { data } = await supabase.from("categorias_productos").select("*").order("nombre");
    _tiendaCategorias = data || [];
  }
  const catOpts = _tiendaCategorias.map(c => `<option value="${c.id}" ${p.categoria_id === c.id ? "selected" : ""}>${c.nombre}</option>`).join("");
  abrirModalTienda(p.id ? "Editar producto" : "Agregar producto", `
    <div class="cfg-campo"><label class="cfg-label">Nombre del producto *</label><input class="cfg-input" id="pa-nombre" type="text" value="${(p.nombre || "").replace(/"/g, "&quot;")}" placeholder="Ej: Torta de tres leches"></div>
    <div class="cfg-campo"><label class="cfg-label">Descripción</label><textarea class="cfg-input" id="pa-desc" rows="2">${p.descripcion || ""}</textarea></div>
    <div class="cfg-campo"><label class="cfg-label">Categoría</label><select class="cfg-input" id="pa-cat"><option value="">Sin categoría</option>${catOpts}</select></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="cfg-campo"><label class="cfg-label">Precio normal (COP)</label><input class="cfg-input" id="pa-precio" type="text" inputmode="numeric" value="${p.precio_normal ? Number(p.precio_normal).toLocaleString("es-CO") : ""}" placeholder="Ej: 50.000"></div>
      <div class="cfg-campo"><label class="cfg-label">Precio con descuento (COP)</label><input class="cfg-input" id="pa-descuento" type="text" inputmode="numeric" value="${p.precio_descuento ? Number(p.precio_descuento).toLocaleString("es-CO") : ""}" placeholder="Ej: 40.000"></div>
    </div>
    <div class="cfg-campo"><label class="cfg-label">WhatsApp para atender pedidos</label><input class="cfg-input" id="pa-wa" type="tel" value="${p.whatsapp || ""}" placeholder="300 000 0000"></div>
    <div class="cfg-campo"><label class="cfg-label">Promoción válida hasta (opcional)</label><input class="cfg-input" id="pa-fecha" type="date" value="${p.fecha_fin || ""}"></div>
    <div class="cfg-campo"><label class="cfg-label">Foto del producto</label>
      ${p.imagen_url ? `<img src="${p.imagen_url}" style="height:60px;border-radius:8px;display:block;margin-bottom:8px">` : ""}
      <input type="file" id="pa-img" accept="image/*">
      <input type="hidden" id="pa-img-url" value="${p.imagen_url || ""}">
    </div>
    <button class="btn btn--primario" id="pa-save" data-id="${p.id || ""}" style="margin-top:8px">${p.id ? "Guardar cambios" : "Agregar producto"} <i data-lucide="check" style="width:15px;height:15px"></i></button>
  `);
  formatearInputMoneda($("#pa-precio"));
  formatearInputMoneda($("#pa-descuento"));
  $("#pa-save")?.addEventListener("click", async () => {
    const btn = $("#pa-save");
    const nombre = $("#pa-nombre")?.value.trim();
    if (!nombre) { toast("El nombre es obligatorio"); return; }
    btn.disabled = true; btn.textContent = "Guardando…";
    let imagen_url = $("#pa-img-url")?.value || null;
    const file = $("#pa-img")?.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `producto-${_tiendaAliadoId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
      if (!upErr) imagen_url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
    }
    const id = btn.dataset.id;
    const payload = {
      aliado_id: _tiendaAliadoId,
      nombre,
      descripcion: $("#pa-desc")?.value.trim() || null,
      categoria_id: $("#pa-cat")?.value || null,
      precio_normal: valorMoneda($("#pa-precio")) || null,
      precio_descuento: valorMoneda($("#pa-descuento")) || null,
      whatsapp: $("#pa-wa")?.value.trim() || null,
      fecha_fin: $("#pa-fecha")?.value || null,
      imagen_url,
      estado: "pendiente",
    };
    const { error } = id
      ? await supabase.from("productos_aliado").update(payload).eq("id", id)
      : await supabase.from("productos_aliado").insert(payload);
    if (error) { toast("Error: " + error.message); btn.disabled = false; btn.textContent = id ? "Guardar cambios" : "Agregar producto"; return; }
    cerrarModalTienda();
    toast(id ? "Producto actualizado — vuelve a quedar en revisión" : "Producto agregado — queda en revisión");
    cargarMisProductos(_tiendaAliadoId);
  });
}

const ESTADO_PEDIDO = {
  pendiente:  { c: "#b45309", bg: "#fef3c7", t: "Pendiente de confirmar" },
  confirmado: { c: "#1a7a3c", bg: "#e8f5ee", t: "Confirmado" },
  entregado:  { c: "#1a7a3c", bg: "#e8f5ee", t: "Entregado" },
  rechazado:  { c: "#c0392b", bg: "#fdecea", t: "Rechazado" },
};

async function cargarPedidosAliado(aliadoId) {
  const list = $("#tienda-pedidos-list");
  if (!list) return;
  const { data } = await supabase
    .from("pedidos")
    .select("*, productos_aliado(nombre)")
    .eq("aliado_id", aliadoId)
    .order("created_at", { ascending: false });
  const pedidos = data || [];

  const vendido = pedidos.filter(p => p.estado === "confirmado" || p.estado === "entregado").reduce((s, p) => s + (p.monto || 0), 0);
  const comisionPendiente = pedidos.filter(p => p.estado === "pendiente" || p.estado === "confirmado").reduce((s, p) => s + (p.comision_valor || 0), 0);
  const nPendientes = pedidos.filter(p => p.estado === "pendiente").length;
  const statVendidoEl = $("#tda-stat-vendido"); if (statVendidoEl) statVendidoEl.textContent = COP(vendido);
  const statPendEl = $("#tda-stat-pendientes"); if (statPendEl) statPendEl.textContent = nPendientes;
  const statComEl = $("#tda-stat-comision"); if (statComEl) statComEl.textContent = COP(comisionPendiente);

  if (!pedidos.length) { list.innerHTML = `<p style="padding:8px 0">Aún no has recibido pedidos.</p>`; return; }

  list.innerHTML = pedidos.map(p => {
    const est = ESTADO_PEDIDO[p.estado] || ESTADO_PEDIDO.pendiente;
    const entrega = p.tipo_entrega === "envio"
      ? `Envío a ${esc(p.envio_nombre) || "—"} · ${esc(p.envio_direccion)}${p.envio_telefono ? " · " + esc(p.envio_telefono) : ""}`
      : "Recoge en el negocio";
    return `
    <div style="padding:14px 0;border-bottom:1px solid #ebebeb">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:180px">
          <div style="font-weight:600;font-size:14px">${esc(p.productos_aliado?.nombre) || "Producto"} — ${COP(p.monto)}</div>
          <div style="font-size:12px;color:#777">${entrega}</div>
          <div style="font-size:12px;color:#777">Comisión: ${COP(p.comision_valor)} (${p.comision_pct}%)</div>
        </div>
        <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:${est.bg};color:${est.c};white-space:nowrap">${est.t}</span>
      </div>
      ${p.comprobante_url ? `<a href="${esc(p.comprobante_url)}" target="_blank" style="font-size:12px;color:#1a7a3c;display:inline-block;margin-top:6px">Ver comprobante ↗</a>` : ""}
      <div style="display:flex;gap:8px;margin-top:10px">
        ${p.estado === "pendiente" ? `
          <button data-confirmar-pedido="${p.id}" class="btn btn--primario" style="padding:8px 14px;font-size:12px">Confirmar pago</button>
          <button data-rechazar-pedido="${p.id}" style="padding:8px 14px;font-size:12px;border:1px solid #ebebeb;border-radius:8px;background:none;cursor:pointer">Rechazar</button>
        ` : ""}
        ${p.estado === "confirmado" ? `<button data-entregar-pedido="${p.id}" class="btn btn--primario" style="padding:8px 14px;font-size:12px">Marcar entregado</button>` : ""}
      </div>
    </div>`;
  }).join("");

  list.querySelectorAll("[data-confirmar-pedido]").forEach(btn => btn.addEventListener("click", async () => {
    await supabase.from("pedidos").update({ estado: "confirmado" }).eq("id", btn.dataset.confirmarPedido);
    cargarPedidosAliado(aliadoId);
  }));
  list.querySelectorAll("[data-rechazar-pedido]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Rechazar este pedido?")) return;
    await supabase.from("pedidos").update({ estado: "rechazado" }).eq("id", btn.dataset.rechazarPedido);
    cargarPedidosAliado(aliadoId);
  }));
  list.querySelectorAll("[data-entregar-pedido]").forEach(btn => btn.addEventListener("click", async () => {
    await supabase.from("pedidos").update({ estado: "entregado" }).eq("id", btn.dataset.entregarPedido);
    cargarPedidosAliado(aliadoId);
  }));
}

/* ---------- Referidos ---------- */
async function cargarReferidos(userId) {
  const linkEl = document.getElementById("ref-link");
  const barra = document.getElementById("ref-barra");
  const contador = document.getElementById("ref-contador");
  const msg = document.getElementById("ref-msg");
  const badge = document.getElementById("ref-badge");
  const copiarBtn = document.getElementById("ref-copiar");

  if (!linkEl) return;

  const base = "https://elclubdelagente.com/Registro.html";
  const link = `${base}?ref=${userId}`;
  linkEl.value = link;

  copiarBtn?.addEventListener("click", () => {
    navigator.clipboard.writeText(link).then(() => {
      copiarBtn.textContent = "¡Copiado!";
      setTimeout(() => copiarBtn.textContent = "Copiar", 2000);
    });
  });

  const { count } = await supabase
    .from("perfiles")
    .select("id", { count: "exact", head: true })
    .eq("referido_por", userId)
    .in("plan", ["basica", "premium", "vitalicia"]);

  const total = count || 0;
  const pct = Math.min(total / 5 * 100, 100);

  if (barra) barra.style.width = pct + "%";
  if (contador) contador.textContent = `${total} de 5`;

  if (total >= 5) {
    if (msg) msg.textContent = "🎉 ¡Membresía vitalicia activada! Gracias por crecer el Club.";
    if (msg) msg.style.color = "#1a7a3c";
    if (badge) badge.hidden = false;
  } else {
    const faltan = 5 - total;
    if (msg) msg.textContent = `Te falta${faltan === 1 ? "" : "n"} ${faltan} referido${faltan === 1 ? "" : "s"} activo${faltan === 1 ? "" : "s"}.`;
  }
}

/* ---------- Links a Directorio con datos del miembro (mismo esquema que Verificar.html) ---------- */
async function actualizarLinksAliados(userId, plan, whatsapp) {
  const limite = LIMITE_DESCUENTOS[plan] ?? 1;
  let usos = 0;
  if (limite !== Infinity) {
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    const { count } = await supabase.from("descuentos").select("id", { count: "exact", head: true })
      .eq("miembro_id", userId).gte("created_at", inicioMes.toISOString());
    usos = count || 0;
  }
  const qs = `?miembro=${userId}&wa=${encodeURIComponent(whatsapp || "")}&plan=${plan || "basica"}&usos=${usos}`;
  document.querySelectorAll('a[href="Directorio.html"]').forEach(a => a.href = "Directorio.html" + qs);
}

/* ---------- QR de verificación ---------- */
function generarQR(userId) {
  if (!userId) return;
  const base = "https://elclubdelagente.com/Verificar.html";
  const url = encodeURIComponent(`${base}?id=${userId}`);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data=${url}`;
  document.querySelectorAll(".ccv2-qr img").forEach(img => img.src = qrSrc);
}

/* ---------- MODAL ACTIVAR ---------- */
function abrirModalActivar() {
  const m = document.getElementById("modal-activar");
  if (m) { m.style.display = "flex"; document.body.style.overflow = "hidden"; if (window.lucide) lucide.createIcons(); }
}
function cerrarModalActivar() {
  const m = document.getElementById("modal-activar");
  if (m) { m.style.display = "none"; document.body.style.overflow = ""; }
}

/* ---------- BLOQUEO (sin_plan) ---------- */
function inicializarBloqueo() {
  // Locks en ClubCard
  ["cc-lock-inicio", "cc-lock-panel"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = "flex"; el.addEventListener("click", abrirModalActivar); }
  });

  // Ocultar banner de usos (no aplica a usuarios sin plan)
  const bu = document.getElementById("banner-usos");
  if (bu) bu.style.display = "none";

  // Actualizar sidebar
  const sbPlan = document.getElementById("sb-plan-name");
  if (sbPlan) sbPlan.textContent = "Sin activar";
  const sbEstado = document.querySelector(".sb-plan__estado");
  if (sbEstado) sbEstado.innerHTML = '<span class="dot" style="background:#e5890a"></span> Pendiente';

  // Actualizar saludo
  const greetP = document.querySelector(".dash-greet p");
  if (greetP) greetP.textContent = "Activa tu membresía o invita 5 amigos para comenzar a disfrutar tus beneficios.";
}

/* ---------- BANNER REFERIDOS (plan activo) ---------- */
function inicializarBannerReferidos(userId) {
  const banner = document.getElementById("banner-referidos-activo");
  if (!banner) return;
  banner.style.display = "flex";
  const link = `https://elclubdelagente.com/Registro.html?ref=${userId}`;
  const btn = document.getElementById("bra-copiar");
  if (btn) {
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(link).then(() => {
        btn.textContent = "¡Copiado!";
        setTimeout(() => { btn.innerHTML = `<i data-lucide="link" style="width:14px;height:14px"></i> Copiar mi link`; if (window.lucide) lucide.createIcons(); }, 2000);
      });
    });
  }
  if (window.lucide) lucide.createIcons();
}

/* ---------- TIENDA ---------- */
const COP = n => n != null ? '$' + Number(n).toLocaleString('es-CO') : '';
let _tiendaCargada = false;
let _miembroId = null;
let _comisionTiendaPct = 10;

async function cargarTienda() {
  if (_tiendaCargada) return;
  _tiendaCargada = true;

  const grid = document.getElementById('tienda-grid');
  const catsEl = document.getElementById('tienda-cats');
  if (!grid) return;

  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabase.from('categorias_productos').select('id,nombre').eq('activa', true).order('orden'),
    supabase.from('productos').select('*, categorias_productos(nombre)').eq('activo', true).order('orden')
  ]);

  if (!prods || !prods.length) {
    grid.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--tinta-suave);grid-column:1/-1">Próximamente habrá productos disponibles.</div>`;
    return;
  }

  let catActiva = 'todos';
  function renderGrid() {
    const filtrados = catActiva === 'todos' ? prods : prods.filter(p => p.categoria_id === catActiva);
    grid.innerHTML = filtrados.map(p => {
      const precioNormal = p.precio_normal != null ? COP(p.precio_normal) : '';
      const precioDesc   = p.precio_descuento != null ? COP(p.precio_descuento) : '';
      return `<div class="tienda-card">
        ${p.imagen_url ? `<img src="${p.imagen_url}" class="tienda-card__img" alt="${esc(p.nombre)}">` : `<div class="tienda-card__img tienda-card__img--ph"></div>`}
        <div class="tienda-card__body">
          ${p.categorias_productos?.nombre ? `<span class="tienda-card__cat">${esc(p.categorias_productos.nombre)}</span>` : ''}
          <div class="tienda-card__nombre">${esc(p.nombre)}</div>
          ${p.descripcion ? `<div class="tienda-card__desc">${esc(p.descripcion)}</div>` : ''}
          <div class="tienda-card__precios">
            ${precioNormal ? `<span class="tienda-card__antes">${precioNormal}</span>` : ''}
            ${precioDesc ? `<span class="tienda-card__precio">${precioDesc}</span>` : ''}
          </div>
          <button class="tienda-card__btn" data-comprar-club="${p.id}" style="border:none;cursor:pointer;width:100%;font:inherit">Comprar</button>
        </div>
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-comprar-club]').forEach(btn => btn.addEventListener('click', () => {
      const p = prods.find(x => x.id === btn.dataset.comprarClub);
      if (p) abrirCheckoutClub(p);
    }));
  }

  if (cats && cats.length && catsEl) {
    catsEl.innerHTML = `<button class="tienda-filtro is-on" data-cat="todos">Todos</button>` +
      cats.map(c => `<button class="tienda-filtro" data-cat="${c.id}">${c.nombre}</button>`).join('');
    catsEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-cat]'); if (!btn) return;
      catActiva = btn.dataset.cat;
      catsEl.querySelectorAll('.tienda-filtro').forEach(b => b.classList.toggle('is-on', b === btn));
      renderGrid();
    });
  }
  renderGrid();
  cargarTiendaAliados();
  cargarMisPedidosClub();
}

const ESTADO_PEDIDO_CLUB = {
  pendiente_pago:   { c: "#6b7280", bg: "#f3f4f6", t: "Confirmando pago" },
  pagado:           { c: "#b45309", bg: "#fef3c7", t: "Pagado · en cola para pedir" },
  pedido_proveedor: { c: "#1d4ed8", bg: "#dbeafe", t: "Pedido al proveedor" },
  en_transito:      { c: "#7c3aed", bg: "#ede9fe", t: "En tránsito" },
  aduana:           { c: "#be185d", bg: "#fce7f3", t: "En aduana" },
  entregado:        { c: "#1a7a3c", bg: "#e8f5ee", t: "Entregado" },
  cancelado:        { c: "#c0392b", bg: "#fdecea", t: "Cancelado" },
};

/* ---------- Tienda del Club (checkout con Wompi + seguimiento de pedido) ---------- */
function abrirCheckoutClub(p) {
  const precio = p.precio_descuento ?? p.precio_normal ?? 0;
  abrirModalTienda(`Comprar: ${esc(p.nombre)}`, `
    <p style="font-size:14px;margin-bottom:16px">Vas a pagar <b>${COP(precio)}</b>. El Club se encarga de pedirlo al proveedor y hacerte llegar el envío — verás el estado en "Mis pedidos".</p>
    <div class="cfg-campo"><label class="cfg-label">Nombre de quien recibe</label><input class="cfg-input" id="pcc-nombre" type="text"></div>
    <div class="cfg-campo"><label class="cfg-label">Dirección</label><input class="cfg-input" id="pcc-direccion" type="text"></div>
    <div class="cfg-campo"><label class="cfg-label">Barrio (opcional)</label><input class="cfg-input" id="pcc-barrio" type="text"></div>
    <div class="cfg-campo"><label class="cfg-label">Teléfono de contacto</label><input class="cfg-input" id="pcc-telefono" type="tel"></div>
    <button class="btn btn--primario" id="pcc-pagar" style="margin-top:8px;width:100%">Pagar ${COP(precio)} con Wompi</button>
  `);
  $("#pcc-pagar")?.addEventListener("click", async () => {
    const btn = $("#pcc-pagar");
    const nombre = $("#pcc-nombre")?.value.trim();
    const direccion = $("#pcc-direccion")?.value.trim();
    const barrio = $("#pcc-barrio")?.value.trim();
    const telefono = $("#pcc-telefono")?.value.trim();
    if (!nombre || !direccion || !telefono) { toast("Completa nombre, dirección y teléfono"); return; }
    if (!precio) { toast("Este producto no tiene un precio válido"); return; }
    if (!window.WidgetCheckout) { toast("No se pudo cargar la pasarela de pago, recarga la página"); return; }
    btn.disabled = true; btn.textContent = "Un momento…";

    const { data: { session } } = await supabase.auth.getSession();
    const miembroId = session?.user?.id;
    if (!miembroId) { toast("Debes iniciar sesión"); btn.disabled = false; return; }

    const { data: pedido, error } = await supabase.from("pedidos_club").insert({
      producto_id: p.id, miembro_id: miembroId, nombre_producto: p.nombre, monto: precio,
      envio_nombre: nombre, envio_direccion: direccion, envio_barrio: barrio || null, envio_telefono: telefono,
      estado: "pendiente_pago",
    }).select().single();
    if (error) { toast("Error: " + error.message); btn.disabled = false; btn.textContent = "Pagar " + COP(precio) + " con Wompi"; return; }

    const amountInCents = precio * 100;
    const reference = `ECDLGTIENDA-${pedido.id}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const currency = "COP";
    const cadena = `${reference}${amountInCents}${currency}test_integrity_aTSPYcCp7kbu6kNCp8q9Q7TEmXPXceoh`;
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cadena));
    const integrity = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const checkout = new window.WidgetCheckout({
      currency, amountInCents, reference,
      publicKey: "pub_test_yuvhTaT4Bg2JmPbJuxpeuodluZUX7HyE",
      signature: { integrity },
      redirectUrl: "https://elclubdelagente.com/Perfil.html",
    });
    cerrarModalTienda();
    checkout.open(() => {
      toast("Confirmando tu pago… en unos segundos verás el pedido en \"Mis pedidos\"");
      setTimeout(cargarMisPedidosClub, 4000);
    });
  });
}

async function cargarMisPedidosClub() {
  const wrap = document.getElementById("mis-pedidos-club-wrap");
  const list = document.getElementById("mis-pedidos-club-list");
  if (!wrap || !list) return;
  const { data } = await supabase.from("pedidos_club").select("*").order("created_at", { ascending: false });
  const pedidos = data || [];
  if (!pedidos.length) { wrap.style.display = "none"; return; }
  wrap.style.display = "";
  list.innerHTML = pedidos.map(p => {
    const est = ESTADO_PEDIDO_CLUB[p.estado] || ESTADO_PEDIDO_CLUB.pendiente_pago;
    return `<div style="padding:14px 0;border-bottom:1px solid #ebebeb;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:180px">
        <div style="font-weight:600;font-size:14px">${esc(p.nombre_producto)} — ${COP(p.monto)}</div>
        ${p.numero_guia ? `<div style="font-size:12px;color:#777">Guía: ${esc(p.numero_guia)}</div>` : ""}
      </div>
      <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:${est.bg};color:${est.c};white-space:nowrap">${est.t}</span>
    </div>`;
  }).join("");
}

/* ---------- Tienda de aliados (vitrina + checkout) ---------- */
async function cargarTiendaAliados() {
  const grid = document.getElementById('tienda-aliados-grid');
  const wrap = document.getElementById('tienda-aliados-wrap');
  if (!grid || !wrap) return;

  const hoy = new Date().toISOString().slice(0, 10);
  const [{ data: prods }, { data: comPct }] = await Promise.all([
    supabase.from('productos_aliado')
      .select('*, categorias_productos(nombre), aliados(nombre, tienda_nombre, whatsapp, maps_url, tienda_llave_pago, instagram, facebook, tiktok)')
      .eq('estado', 'aprobado').eq('activo', true)
      .or(`fecha_fin.is.null,fecha_fin.gte.${hoy}`)
      .order('created_at', { ascending: false }),
    supabase.rpc('get_comision_tienda_pct'),
  ]);
  if (comPct != null) _comisionTiendaPct = comPct;

  const productos = prods || [];
  if (!productos.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  grid.innerHTML = productos.map(p => {
    const precioNormal = p.precio_normal != null ? COP(p.precio_normal) : '';
    const precioDesc   = p.precio_descuento != null ? COP(p.precio_descuento) : '';
    return `<div class="tienda-card">
      ${p.imagen_url ? `<img src="${p.imagen_url}" class="tienda-card__img" alt="${esc(p.nombre)}">` : `<div class="tienda-card__img tienda-card__img--ph"></div>`}
      <div class="tienda-card__body">
        ${p.categorias_productos?.nombre ? `<span class="tienda-card__cat">${esc(p.categorias_productos.nombre)}</span>` : ''}
        <div class="tienda-card__nombre">${esc(p.nombre)}</div>
        <div style="font-size:12px;color:var(--tinta-60);margin-bottom:4px">${esc(p.aliados?.tienda_nombre || p.aliados?.nombre)}</div>
        ${p.descripcion ? `<div class="tienda-card__desc">${esc(p.descripcion)}</div>` : ''}
        <div class="tienda-card__precios">
          ${precioNormal ? `<span class="tienda-card__antes">${precioNormal}</span>` : ''}
          ${precioDesc ? `<span class="tienda-card__precio">${precioDesc}</span>` : ''}
        </div>
        <button class="tienda-card__btn" data-comprar-prodal="${p.id}" style="border:none;cursor:pointer;width:100%;font:inherit">Comprar</button>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('[data-comprar-prodal]').forEach(btn => btn.addEventListener('click', () => {
    const p = productos.find(x => x.id === btn.dataset.comprarProdal);
    if (p) abrirCheckoutProducto(p);
  }));
}

function redesSocialesHTML(aliado) {
  const redes = [
    { url: aliado?.instagram, label: "Instagram", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>` },
    { url: aliado?.facebook, label: "Facebook", icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.8c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>` },
    { url: aliado?.tiktok, label: "TikTok", icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82a4.28 4.28 0 0 1-3.05-3.06h-3.1v13.44a2.6 2.6 0 1 1-1.9-2.5V10.6a5.7 5.7 0 1 0 4.9 5.66V9.83a7.3 7.3 0 0 0 4.15 1.3V8.1a4.3 4.3 0 0 1-1-2.28z"/></svg>` },
  ].filter(r => /^https?:\/\//i.test(r.url || ""));
  if (!redes.length) return "";
  return `
    <div style="margin-top:22px;padding-top:18px;border-top:1px solid #ebebeb;text-align:center">
      <p style="font-size:13px;font-weight:600;margin-bottom:12px">¡Síguenos para no perderte nuevas promos! 🌿</p>
      <div style="display:flex;gap:10px;justify-content:center">
        ${redes.map(r => `<a href="${esc(r.url)}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid #ebebeb;border-radius:100px;color:#111;text-decoration:none;font-size:12.5px;font-weight:600"><span style="width:16px;height:16px;display:inline-flex">${r.icon}</span>${r.label}</a>`).join("")}
      </div>
    </div>`;
}

function abrirCheckoutProducto(p) {
  const precio = p.precio_descuento ?? p.precio_normal ?? 0;
  abrirModalTienda(`Comprar: ${p.nombre}`, `
    <p style="font-size:14px;margin-bottom:16px">Vas a pagar <b>${COP(precio)}</b> a <b>${esc(p.aliados?.tienda_nombre || p.aliados?.nombre) || 'el negocio'}</b>.</p>
    <div class="cfg-campo">
      <label class="cfg-label">¿Cómo recibes tu pedido?</label>
      <select class="cfg-input" id="pc-entrega">
        <option value="envio">Envío a domicilio (gratis)</option>
        <option value="recoger">Recoger en el negocio</option>
      </select>
    </div>
    <div id="pc-envio-campos">
      <p style="font-size:12px;color:#1a7a3c;font-weight:600;margin:-4px 0 12px">✓ El envío es completamente gratis</p>
      <div class="cfg-campo"><label class="cfg-label">Nombre de quien recibe</label><input class="cfg-input" id="pc-nombre" type="text"></div>
      <div class="cfg-campo"><label class="cfg-label">Dirección</label><input class="cfg-input" id="pc-direccion" type="text"></div>
      <div class="cfg-campo"><label class="cfg-label">Teléfono de contacto</label><input class="cfg-input" id="pc-telefono" type="tel"></div>
    </div>
    <div id="pc-recoger-campos" style="display:none">
      ${/^https?:\/\//i.test(p.aliados?.maps_url || '') ? `<a href="${esc(p.aliados.maps_url)}" target="_blank" rel="noopener" style="font-size:13px;color:#1a7a3c">Ver ubicación en Google Maps ↗</a>` : `<p style="font-size:13px;color:#777">El negocio no registró una ubicación.</p>`}
    </div>
    <div class="cfg-campo" style="margin-top:16px">
      <label class="cfg-label">Llave de pago del negocio</label>
      <div style="display:flex;gap:8px">
        <input class="cfg-input" id="pc-llave" readonly value="${esc(p.aliados?.tienda_llave_pago) || 'No registrada — contacta al negocio por WhatsApp'}" style="flex:1">
        ${p.aliados?.tienda_llave_pago ? `<button type="button" class="btn" id="pc-copiar-llave" style="padding:0 16px;white-space:nowrap">${ic('copy')} Copiar</button>` : ''}
      </div>
      <span style="font-size:12px;color:#777;display:block;margin-top:4px">Transfiere ${COP(precio)} a esa llave antes de continuar.</span>
      <div style="text-align:center;font-weight:800;letter-spacing:.02em;font-size:13px;color:#111;border:1px solid #ebebeb;border-radius:8px;padding:6px;margin-top:8px;background:#fff">Bre-B</div>
    </div>
    <div class="cfg-campo">
      <label class="cfg-label">Comprobante de pago *</label>
      <input type="file" id="pc-comprobante" accept="image/*">
    </div>
    <button class="btn btn--primario" id="pc-confirmar" style="margin-top:8px">Confirmar pedido <i data-lucide="check" style="width:15px;height:15px"></i></button>
  `);

  $("#pc-entrega")?.addEventListener("change", (e) => {
    const esEnvio = e.target.value === "envio";
    const envioEl = $("#pc-envio-campos"); if (envioEl) envioEl.style.display = esEnvio ? "" : "none";
    const recogerEl = $("#pc-recoger-campos"); if (recogerEl) recogerEl.style.display = esEnvio ? "none" : "";
  });

  $("#pc-copiar-llave")?.addEventListener("click", () => {
    const btn = $("#pc-copiar-llave");
    navigator.clipboard.writeText($("#pc-llave")?.value || "").then(() => {
      btn.innerHTML = `${ic('check')} Copiada`;
      setTimeout(() => { btn.innerHTML = `${ic('copy')} Copiar`; if (window.lucide) lucide.createIcons(); }, 2000);
      if (window.lucide) lucide.createIcons();
    });
  });

  $("#pc-confirmar")?.addEventListener("click", async () => {
    const btn = $("#pc-confirmar");
    const tipoEntrega = $("#pc-entrega")?.value || "envio";
    const file = $("#pc-comprobante")?.files?.[0];
    if (!file) { toast("Sube el comprobante de pago"); return; }
    const nombre = $("#pc-nombre")?.value.trim();
    const direccion = $("#pc-direccion")?.value.trim();
    const telefono = $("#pc-telefono")?.value.trim();
    if (tipoEntrega === "envio" && (!nombre || !direccion)) { toast("Completa nombre y dirección"); return; }

    btn.disabled = true; btn.textContent = "Enviando…";
    const ext = file.name.split(".").pop();
    const path = `comprobante-${_miembroId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
    if (upErr) { toast("Error subiendo el comprobante"); btn.disabled = false; btn.textContent = "Confirmar pedido"; return; }
    const comprobante_url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;

    const comisionValor = Math.round(precio * (_comisionTiendaPct / 100));
    const payload = {
      producto_id: p.id,
      aliado_id: p.aliado_id,
      miembro_id: _miembroId,
      tipo_entrega: tipoEntrega,
      envio_nombre: tipoEntrega === "envio" ? nombre : null,
      envio_direccion: tipoEntrega === "envio" ? direccion : null,
      envio_telefono: tipoEntrega === "envio" ? telefono : null,
      comprobante_url,
      monto: precio,
      comision_pct: _comisionTiendaPct,
      comision_valor: comisionValor,
      estado: "pendiente",
    };
    const { error } = await supabase.from("pedidos").insert(payload);
    if (error) { toast("Error: " + error.message); btn.disabled = false; btn.textContent = "Confirmar pedido"; return; }

    if (p.whatsapp) {
      const wa = p.whatsapp.replace(/\D/g, "");
      const nombreMiembro = leerPerfil()?.nombre || "Un miembro del Club";
      const msg = `¡Nuevo pedido! ${nombreMiembro} pidió "${p.nombre}" por ${COP(precio)}. Revisa el comprobante en tu panel "Mi negocio" → "Mi tienda" para confirmarlo.`;
      fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/whatsapp-send-3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: wa, body: msg }),
      }).then(async (r) => {
        if (!r.ok) console.error("whatsapp-send-3 (aviso al aliado) falló:", r.status, await r.text().catch(() => ""));
      }).catch((e) => console.error("whatsapp-send-3 (aviso al aliado) error de red:", e));
    }
    abrirModalTienda("¡Pedido enviado!", `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:44px;line-height:1">✓</div>
        <p style="font-size:14px;margin-top:12px">Gracias por tu compra en <b>${esc(p.aliados?.tienda_nombre || p.aliados?.nombre) || 'el negocio'}</b>.<br>El negocio confirmará tu pago pronto.</p>
      </div>
      ${redesSocialesHTML(p.aliados)}
      <button class="btn btn--primario" id="pc-cerrar-exito" style="margin-top:20px;width:100%">Listo</button>
    `);
    $("#pc-cerrar-exito")?.addEventListener("click", cerrarModalTienda);
  });
}

/* ---------- CARRUSEL MARCAS ---------- */
async function cargarMarcasCarrusel() {
  const track = document.getElementById("marcas-track-dash");
  const wrap  = document.getElementById("marcas-carrusel-dash");
  if (!track) return;
  const { data } = await supabase.from("marcas_aliadas").select("nombre,logo_url,link_afiliado").eq("activa", true).order("orden", { ascending: true });
  if (!data || !data.length) { if (wrap) wrap.style.display = "none"; return; }
  const items = [...data, ...data];
  track.innerHTML = items.map(m => `<div class="marcas-carrusel__item">
    <a href="${m.link_afiliado || '#'}" target="_blank" rel="noopener" title="${m.nombre}">
      <img src="${m.logo_url}" alt="${m.nombre}">
    </a>
    <span class="marcas-carrusel__sep">✷</span>
  </div>`).join("");
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  render();
  const u = leerPerfil();
  irPanel("inicio");
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!session?.user?.id) { location.href = "Registro.html?modo=login"; return; }
    const userId = session.user.id;
    _miembroId = userId;
    generarQR(userId);

    // Si viene de un pago aprobado, activar el plan en Supabase
    const planActivar = new URLSearchParams(location.search).get("activar");
    if (planActivar && ["gratis", "basica", "premium", "vitalicia"].includes(planActivar)) {
      const { error: rpcErr } = await supabase.rpc("activar_plan", { nuevo_plan: planActivar });
      if (rpcErr) console.error("activar_plan error:", rpcErr);
      history.replaceState({}, "", location.pathname);
    }

    // Primera vez que llega desde el registro: invitarlo a seguir el Instagram del Club
    if (new URLSearchParams(location.search).get("bienvenida") === "1") {
      history.replaceState({}, "", location.pathname);
      abrirModalTienda("¡Bienvenido/a al Club! 🌿", `
        <div style="text-align:center;padding:8px 0 4px">
          <p style="font-size:14px;margin-bottom:20px">Síguenos en Instagram para no perderte las nuevas promos, los aliados que se van sumando y las novedades del Club.</p>
          <a href="https://www.instagram.com/clubdelagente" target="_blank" rel="noopener" class="btn btn--primario" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            Seguir en Instagram
          </a>
        </div>
        <button type="button" id="bienvenida-cerrar" style="display:block;margin:16px auto 0;background:none;border:none;color:#999;font-size:12px;cursor:pointer;text-decoration:underline">Ahora no</button>
      `);
      document.getElementById("bienvenida-cerrar")?.addEventListener("click", cerrarModalTienda);
    }

    const { data: perfData } = await supabase.from("perfiles").select("plan, nombre, fecha_nacimiento, whatsapp, rol").eq("id", userId).maybeSingle();
    const plan = perfData?.plan || null;
    const nombre = perfData?.nombre || session.user.user_metadata?.nombre || session.user.user_metadata?.full_name || null;
    if (plan) { localStorage.setItem("ecdlg_plan", plan); const sbPlanEl = document.getElementById("sb-plan-name"); if (sbPlanEl) sbPlanEl.textContent = PLAN_LABEL[plan] || plan; }

    // Segmentación del miembro nuevo: solo preguntamos lo que no sepamos ya
    // (registro manual trae nombre/fecha/whatsapp; Google solo trae nombre).
    const debeSegmentar = new URLSearchParams(location.search).get("nuevo") === "1"
      && localStorage.getItem("ecdlg_segmentado") !== "1";
    if (debeSegmentar) {
      prepararCamposConocidos({ ...perfData, nombre });
      abrirSeg(0);
    }

    // Fuente de verdad: nombre siempre desde Supabase, no localStorage
    if (nombre) {
      document.querySelectorAll(".cc-card-name").forEach(el => el.textContent = nombre.toUpperCase());
      document.querySelectorAll("[data-ini]").forEach(el => {
        if (!el.querySelector("img")) el.textContent = nombre.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
      });
      document.getElementById("sb-name").textContent = nombre;
      document.getElementById("greet-name").textContent = "Hola, " + nombre.split(" ")[0] + ".";
      const p = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
      p.nombre = nombre;
      p.primerNombre = nombre.split(" ")[0];
      localStorage.setItem("ecdlg_perfil", JSON.stringify(p));
    }

    const bloqueado = !plan || plan === "sin_plan";
    if (bloqueado) {
      inicializarBloqueo();
    } else {
      cargarDescuentos(userId);
      inicializarBannerReferidos(userId);
      actualizarLinksAliados(userId, plan, perfData?.whatsapp);
    }

    // Rol aliado (cuenta real, no localStorage): "Mi negocio" conectado por aliado_id
    if (perfData?.rol === "aliado") {
      const { data: negocio } = await supabase.from("aliados").select("id, nombre, categoria, whatsapp, maps_url, tienda_activa, tienda_nombre, tienda_llave_pago, instagram, facebook, tiktok").eq("user_id", userId).maybeSingle();
      if (negocio) {
        const li = $("#sb-negocio-li"); if (li) li.hidden = false;
        const negNombre = $("#negocio-nombre"); if (negNombre) negNombre.textContent = negocio.nombre;
        const negCat = $("#negocio-cat"); if (negCat && negocio.categoria) negCat.textContent = negocio.categoria;
        cargarVentasNegocio(negocio.id);
        inicializarMiTienda(negocio);
      }
    }
    cargarReferidos(userId);
    cargarMarcasCarrusel();
  });

  // Respaldo del QR: getSession() puede correr en carrera con la sesión
  // todavía restaurándose (típico justo después de entrar por el link
  // mágico del OTP). onAuthStateChange se dispara de forma confiable en
  // cuanto la sesión real está lista, así que regeneramos el QR ahí también.
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) generarQR(session.user.id);
  });

  if (window.lucide) lucide.createIcons();

  // Sidebar nav
  $$(".sb-link[data-panel]").forEach(l => l.addEventListener("click", () => {
    irPanel(l.dataset.panel);
    if (l.dataset.panel === 'tienda') cargarTienda();
  }));

  // Burger móvil
  $("#topbar-burger")?.addEventListener("click", () => $("#dash").classList.toggle("menu-open"));
  $("#dash-backdrop")?.addEventListener("click", () => $("#dash").classList.remove("menu-open"));

  // Atajos a ClubCard / perfil desde tarjetas
  $$("[data-goto-panel]").forEach(b => b.addEventListener("click", () => irPanel(b.dataset.gotoPanel)));

  // Flip de ClubCard
  $("#cc-flip-toggle")?.addEventListener("click", () => $("#cc-flip").classList.toggle("is-back"));

  // ---- Configuración ----
  $("#cfg-foto-btn")?.addEventListener("click", () => $("#cfg-foto-input").click());
  $("#cfg-foto-input")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      localStorage.setItem("ecdlg_foto", reader.result);
      aplicarFoto(reader.result);
      toast("Foto de perfil actualizada");
    };
    reader.readAsDataURL(file);
  });
  $("#cfg-foto-quitar")?.addEventListener("click", () => { quitarFoto(); toast("Foto de perfil eliminada"); });
  $("#form-usuario")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("#cfg-usuario").value.trim();
    if (!v) return;
    toast("Usuario actualizado a @" + v);
  });
  $("#form-pass")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const nueva = $("#cfg-pass-new").value, conf = $("#cfg-pass-conf").value;
    if (nueva.length < 8) { toast("La contraseña debe tener al menos 8 caracteres"); return; }
    if (nueva !== conf) { toast("Las contraseñas no coinciden"); return; }
    e.target.reset();
    toast("Contraseña actualizada correctamente");
  });

  // Cerrar sesión → inicio
  $("#sb-logout")?.addEventListener("click", () => { location.href = "El Club de la Gente.html"; });

  // ---- Segmentación ----
  // (el disparo real vive arriba, dentro del callback de getSession, para
  // esperar a saber qué campos ya tenemos antes de mostrar el overlay)

  // Actualizar categorías desde el perfil → reabre la segmentación
  $("#editar-cats")?.addEventListener("click", () => abrirSeg(1));

  // Opciones (toggle single/multi)
  $$(".seg-q").forEach(q => {
    const multi = q.dataset.multi === "1";
    $$(".seg-opt", q).forEach(opt => opt.addEventListener("click", () => {
      if (multi) opt.classList.toggle("is-on");
      else $$(".seg-opt", q).forEach(o => o.classList.toggle("is-on", o === opt));
    }));
  });

  $("#seg-next").addEventListener("click", async () => {
    if (segBlock === SEG_TOTAL - 1) {
      const nombre = $("#seg-nombre")?.value.trim();
      const apellido = $("#seg-apellido")?.value.trim();
      const fecha = $("#seg-fecha")?.value;
      const whatsapp = $("#seg-whatsapp")?.value.trim();
      const nombreCompleto = [nombre, apellido].filter(Boolean).join(" ");

      // Leer selecciones del formulario
      const getSelected = (idx) => {
        const q = $$(".seg-q")[idx];
        return q ? [...$$(".seg-opt.is-on", q)].map(b => b.textContent.trim()) : [];
      };
      const getSingle = (idx) => getSelected(idx)[0] || null;

      const genero         = getSingle(4);
      const ocupacion      = getSingle(5);
      const barrio         = $$(".seg-q")[6]?.querySelector("input")?.value.trim() || null;
      const categorias     = getSelected(8);
      const tiene_mascotas = getSingle(10);
      const tiene_hijos    = getSingle(11) === "Sí";
      const impacto_social = getSingle(12);
      const canal_preferido    = getSingle(13);
      const contenido_preferido = getSelected(14);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const updates = {};
        if (nombreCompleto) updates.nombre = nombreCompleto;
        if (fecha) updates.fecha_nacimiento = fecha;
        if (whatsapp) updates.whatsapp = whatsapp;
        if (genero) updates.genero = genero;
        if (ocupacion) updates.ocupacion = ocupacion;
        if (barrio) updates.barrio = barrio;
        if (categorias.length) updates.categorias_interes = categorias;
        if (tiene_mascotas) updates.tiene_mascotas = tiene_mascotas;
        updates.tiene_hijos = tiene_hijos;
        if (impacto_social) updates.impacto_social = impacto_social;
        if (canal_preferido) updates.canal_preferido = canal_preferido;
        if (contenido_preferido.length) updates.contenido_preferido = contenido_preferido;

        if (Object.keys(updates).length) {
          await supabase.from("perfiles").update(updates).eq("id", session.user.id);
        }
        const perfil = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
        if (nombreCompleto) { perfil.nombre = nombreCompleto; perfil.primerNombre = nombre; }
        if (fecha) perfil.fechaISO = fecha;
        if (whatsapp) perfil.whatsapp = whatsapp;
        if (categorias.length) perfil.categorias = categorias;
        localStorage.setItem("ecdlg_perfil", JSON.stringify(perfil));
      }
      cerrarSeg();
    } else {
      segMostrar(segBlock + 1);
    }
  });
  $("#seg-prev").addEventListener("click", () => segMostrar(segBlock - 1));
  $("#seg-skip").addEventListener("click", cerrarSeg);

  // Modal de activación
  $("#modal-activar-close")?.addEventListener("click", cerrarModalActivar);
  $("#modal-activar")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) cerrarModalActivar(); });
  $("#modal-ir-referidos")?.addEventListener("click", () => {
    cerrarModalActivar();
    const refCard = document.getElementById("card-referidos");
    if (refCard) {
      refCard.scrollIntoView({ behavior: "smooth", block: "center" });
      refCard.style.outline = "3px solid #1a7a3c";
      refCard.style.outlineOffset = "3px";
      setTimeout(() => { refCard.style.outline = ""; refCard.style.outlineOffset = ""; }, 2000);
    }
  });
});

/* ============================================================
   PANEL PROFESIONAL
   ============================================================ */
async function cargarPanelProfesional() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data: prof } = await supabase
    .from('profesionales')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (!prof) return;

  // Vista previa
  const fotoEl = $("#prof-preview-foto");
  if (fotoEl) {
    fotoEl.innerHTML = prof.imagen_url
      ? `<img src="${prof.imagen_url}" style="width:100%;height:100%;object-fit:cover">`
      : (prof.nombre || 'P')[0];
  }
  const el = (id, val) => { const e = $("#" + id); if (e) e.textContent = val || '—'; };
  el("prof-preview-nombre", prof.nombre);
  el("prof-preview-area",   prof.area);
  el("prof-preview-desc",   prof.descripcion);

  // Llenar campos del formulario
  const setVal = (id, val) => { const e = $("#" + id); if (e) e.value = val || ''; };
  setVal("prof-edit-area", prof.area);
  setVal("prof-edit-desc", prof.descripcion);
  setVal("prof-edit-wa",   prof.whatsapp);

  if (window.lucide) lucide.createIcons();

  // Guardar cambios
  $("#prof-edit-save")?.addEventListener("click", async () => {
    const btn = $("#prof-edit-save");
    btn.disabled = true;

    let imagen_url = prof.imagen_url || null;
    const file = $("#prof-edit-img")?.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `prof-${session.user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('contenido').upload(path, file, { upsert: true });
      if (!upErr) imagen_url = supabase.storage.from('contenido').getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      area:        $("#prof-edit-area")?.value.trim() || null,
      descripcion: $("#prof-edit-desc")?.value.trim() || null,
      whatsapp:    $("#prof-edit-wa")?.value.trim()   || null,
      imagen_url,
    };

    await supabase.from('profesionales').update(payload).eq('id', prof.id);

    // Actualizar vista previa
    el("prof-preview-area",  payload.area);
    el("prof-preview-desc",  payload.descripcion);
    if (fotoEl && imagen_url) fotoEl.innerHTML = `<img src="${imagen_url}" style="width:100%;height:100%;object-fit:cover">`;

    btn.disabled = false;
    const msg = $("#prof-edit-msg");
    if (msg) { msg.style.display = "inline"; setTimeout(() => msg.style.display = "none", 3000); }
  });
}
