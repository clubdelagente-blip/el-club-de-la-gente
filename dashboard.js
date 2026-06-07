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
  // Defaults de demostración si entran directo sin registrarse
  return {
    nombre: p.nombre || "Carlos Andrés Pérez",
    primerNombre: p.primerNombre || "Carlos",
    fechaISO: p.fechaISO || "2001-06-28",
    mision: p.mision || 1,
    num: m.num || "2048",
    codigo: m.codigo || p.codigo || p.whatsapp || "300 412 8890",
    foto: localStorage.getItem("ecdlg_foto") || "",
    desde: m.desde || "junio 2026",
    negocio: p.negocio || "Tu negocio",
    rol, plan,
  };
}
function iniciales(nombre) {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const PLAN_LABEL = { basica: "Básica", premium: "Premium" };

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

  // Actividad reciente (dashboard: 4)
  $("#actividad").innerHTML = ACTIVIDAD.slice(0, 4).map(it => `
    <li class="act-item">
      <span class="act-item__ic">${ic(it.icon)}</span>
      <span class="act-item__body">
        <span class="act-item__name">${it.nombre}</span>
        <span class="act-item__meta">${it.fecha} · ${it.pct} de descuento</span>
      </span>
      <span class="act-item__nums">
        <span class="act-item__ahorro">−${fmtCOP(it.ahorro)}</span>
        <span class="act-item__compra">de ${fmtCOP(it.compra)}</span>
      </span>
    </li>`).join("");

  // Tabla completa de descuentos
  $("#tabla-body").innerHTML = ACTIVIDAD.map(it => `
    <tr>
      <td>
        <span class="tabla__aliado">
          <span class="tabla__ic">${ic(it.icon)}</span>
          <span><span class="tabla__name">${it.nombre}</span><br><span class="tabla__cat">${it.cat}</span></span>
        </span>
      </td>
      <td>${it.fecha}</td>
      <td><span class="tag-pct">${it.pct}</span></td>
      <td>${fmtCOP(it.compra)}</td>
      <td class="tabla__ahorro">−${fmtCOP(it.ahorro)}</td>
    </tr>`).join("");

  // Rol aliado: mostrar "Mi negocio"
  if (u.rol === "aliado") {
    const li = $("#sb-negocio-li");
    if (li) li.hidden = false;
    const negNombre = $("#negocio-nombre"); if (negNombre) negNombre.textContent = u.negocio;
    const negCat = $("#negocio-cat"); if (negCat && u.negocioCat) negCat.textContent = u.negocioCat;
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

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  render();
  const u = leerPerfil();
  irPanel("inicio");
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

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const updates = {};
        if (nombreCompleto) updates.nombre = nombreCompleto;
        if (fecha) updates.fecha_nacimiento = fecha;
        if (whatsapp) updates.whatsapp = whatsapp;
        if (Object.keys(updates).length) {
          await supabase.from("perfiles").update(updates).eq("id", session.user.id);
        }
        const perfil = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
        if (nombreCompleto) { perfil.nombre = nombreCompleto; perfil.primerNombre = nombre; }
        if (fecha) perfil.fechaISO = fecha;
        if (whatsapp) perfil.whatsapp = whatsapp;
        localStorage.setItem("ecdlg_perfil", JSON.stringify(perfil));
      }
      cerrarSeg();
    } else {
      segMostrar(segBlock + 1);
    }
  });
  $("#seg-prev").addEventListener("click", () => segMostrar(segBlock - 1));
  $("#seg-skip").addEventListener("click", cerrarSeg);
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
