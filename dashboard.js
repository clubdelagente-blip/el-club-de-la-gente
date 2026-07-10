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
const fmtCOP = (n) => "$" + new Intl.NumberFormat("es-CO").format(n);

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

/* ---------- ALIADOS (subset para dashboard) ---------- */
const ALIADOS = [
  { nombre: "Patitas Felices",   cat: "Veterinaria",      icon: "paw-print",        pct: "30%" },
  { nombre: "Sonrisa Sana",      cat: "Odontología",      icon: "smile",            pct: "25%" },
  { nombre: "Barbería Don Carlos", cat: "Barbería",       icon: "scissors",         pct: "30%" },
  { nombre: "Mercado del Campo", cat: "Canasta familiar", icon: "shopping-basket",  pct: "12%" },
];

/* ---------- ACTIVIDAD RECIENTE ---------- */
const ACTIVIDAD = [
  { nombre: "Heladería La Sumapaz", cat: "Heladería",       icon: "ice-cream",       fecha: "Hoy · 4:20 p.m.",    pct: "15%", compra: 24000, ahorro: 3600 },
  { nombre: "Mercado del Campo",    cat: "Canasta familiar", icon: "shopping-basket", fecha: "Ayer · 10:05 a.m.",  pct: "12%", compra: 92000, ahorro: 11040 },
  { nombre: "Barbería Don Carlos",  cat: "Barbería",        icon: "scissors",        fecha: "28 may · 6:30 p.m.", pct: "30%", compra: 25000, ahorro: 7500 },
  { nombre: "Patitas Felices",      cat: "Veterinaria",     icon: "paw-print",       fecha: "24 may · 11:15 a.m.",pct: "30%", compra: 80000, ahorro: 24000 },
  { nombre: "Sonrisa Sana",         cat: "Odontología",     icon: "smile",           fecha: "19 may · 3:00 p.m.", pct: "25%", compra: 120000, ahorro: 30000 },
];

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
function iniciales(nombre) {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const PLAN_LABEL = { sin_plan: "Sin activar", basica: "Básica", premium: "Premium", vitalicia: "Vitalicia" };

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

  // Aliados strip
  $("#aliados-strip").innerHTML = ALIADOS.map(al => `
    <a class="aliado-mini" href="Directorio.html">
      <span class="aliado-mini__ic">${ic(al.icon)}</span>
      <span>
        <span class="aliado-mini__name">${al.nombre}</span>
        <span class="aliado-mini__cat">${al.cat}</span>
      </span>
      <span class="aliado-mini__pct">${al.pct}</span>
    </a>`).join("");

  // Actividad reciente: se carga desde Supabase en cargarDescuentos()
  const actEl = $("#actividad");
  if (actEl) actEl.innerHTML = `<li class="act-item" style="color:#888;font-size:13px;padding:12px 0">Aún no tienes descuentos registrados.</li>`;

  const tablaEl = $("#tabla-body");
  if (tablaEl) tablaEl.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;padding:16px">Sin actividad aún</td></tr>`;

  // Rol aliado: mostrar "Mi negocio"
  if (u.rol === "aliado") {
    const li = $("#sb-negocio-li");
    if (li) li.hidden = false;
    const negNombre = $("#negocio-nombre"); if (negNombre) negNombre.textContent = u.negocio;
    const negCat = $("#negocio-cat"); if (negCat && u.negocioCat) negCat.textContent = u.negocioCat;
    if (u.negocio) cargarVentasNegocio(u.negocio);
  }

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
const TITULOS = { inicio: "Inicio", negocio: "Mi negocio", perfil: "Mi perfil", clubcard: "Mi ClubCard", descuentos: "Mis descuentos", agente: "Mi Agente", config: "Configuración" };
function irPanel(panel) {
  $$(".panel-view").forEach(v => v.classList.toggle("is-active", v.dataset.panel === panel));
  $$(".sb-link[data-panel]").forEach(l => l.classList.toggle("is-active", l.dataset.panel === panel));
  $("#topbar-title").innerHTML = `Mi cuenta · <b>${TITULOS[panel] || ""}</b>`;
  $("#dash").classList.remove("menu-open");
  $(".dash-content").scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

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

/* ---------- Descuentos reales ---------- */
async function cargarDescuentos(userId) {
  const { data, error } = await supabase
    .from("descuentos")
    .select("aliado_nombre, categoria, descuento_pct, compra, ahorro, created_at")
    .eq("miembro_id", userId)
    .order("created_at", { ascending: false });
  // Mostrar usos restantes si es plan básica
  const u = leerPerfil();
  if (u.plan !== "premium") {
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
    const usosMes = (data || []).filter(d => new Date(d.created_at) >= inicioMes).length;
    const restantes = Math.max(0, 2 - usosMes);
    const banner = document.getElementById("banner-usos");
    if (banner) {
      banner.style.display = "flex";
      banner.innerHTML = restantes > 0
        ? `<span>${ic("ticket-percent")} Te quedan <b>${restantes} descuento${restantes !== 1 ? "s" : ""}</b> este mes · <a href="Planes.html" style="color:#1a7a3c;font-weight:700">Actualizar a Premium</a></span>`
        : `<span style="color:#b45309">${ic("alert-triangle")} Llegaste al límite de 2 descuentos este mes · <a href="Planes.html" style="color:#b45309;font-weight:700">Actualizar a Premium</a></span>`;
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
async function cargarVentasNegocio(nombreNegocio) {
  const { data, error } = await supabase
    .from("descuentos")
    .select("miembro_id, descuento_pct, compra, ahorro, created_at")
    .eq("aliado_nombre", nombreNegocio)
    .order("created_at", { ascending: false });

  if (error || !data?.length) return;

  const ahora = new Date();
  const esMes = d => {
    const f = new Date(d.created_at);
    return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
  };
  const mes = data.filter(esMes);
  const totalVentas  = mes.reduce((s, d) => s + (d.compra || 0), 0);
  const totalAhorro  = mes.reduce((s, d) => s + (d.ahorro || 0), 0);
  const countDesc    = mes.length;
  const countClients = new Set(mes.map(d => d.miembro_id)).size;

  // Actualizar stats del panel negocio
  const panel = document.querySelector("[data-panel='negocio']");
  if (!panel) return;
  const nums = panel.querySelectorAll(".stat__num");
  if (nums[0]) nums[0].textContent = fmtCOP(totalVentas);
  if (nums[1]) nums[1].textContent = countClients;
  if (nums[2]) nums[2].textContent = countDesc;
  if (nums[3]) nums[3].textContent = fmtCOP(totalAhorro);

  // Actualizar tabla de ventas
  const tbody = panel.querySelector(".tabla tbody");
  if (!tbody) return;
  const fmtF = iso => new Date(iso).toLocaleDateString("es-CO", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });
  tbody.innerHTML = data.slice(0, 15).map(it => `
    <tr>
      <td><span class="tabla__name">Miembro del Club</span></td>
      <td>${fmtF(it.created_at)}</td>
      <td><span class="tag-pct">${it.descuento_pct}</span></td>
      <td>${fmtCOP(it.compra)}</td>
      <td class="tabla__ahorro">−${fmtCOP(it.ahorro)}</td>
    </tr>`).join("");

  if (window.lucide) lucide.createIcons();
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

/* ---------- QR de verificación ---------- */
async function generarQR() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;
  const userId = session.user.id;
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

  // Interceptar aliados strip
  const strip = document.getElementById("aliados-strip");
  if (strip) {
    strip.addEventListener("click", (e) => { e.preventDefault(); abrirModalActivar(); });
  }

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

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  render();
  const u = leerPerfil();
  irPanel("inicio");
  generarQR();
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!session?.user?.id) return;
    const userId = session.user.id;

    const { data: perfData } = await supabase.from("perfiles").select("plan, nombre").eq("id", userId).single();
    const plan = perfData?.plan || null;
    const nombre = perfData?.nombre || null;
    if (plan) localStorage.setItem("ecdlg_plan", plan);

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
    }
    cargarReferidos(userId);
  });
  if (window.lucide) lucide.createIcons();

  // Sidebar nav
  $$(".sb-link[data-panel]").forEach(l => l.addEventListener("click", () => irPanel(l.dataset.panel)));

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
  const params = new URLSearchParams(location.search);
  const debeSegmentar = params.get("nuevo") === "1" && localStorage.getItem("ecdlg_segmentado") !== "1";
  if (debeSegmentar) abrirSeg(0);

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
