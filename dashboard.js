/* ============================================================
   EL CLUB DE LA GENTE — Módulo 4 · Lógica de perfil/dashboard
   ============================================================ */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL = "https://egwaedadpqfwnbfosiao.supabase.co";
const supabase = createClient(
  SUPABASE_URL,
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2FlZGFkcHFmd25iZm9zaWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njc2ODcsImV4cCI6MjA5NjM0MzY4N30.NrBPX8HhTcs_y-QG3o_GoEAednFc0TqUunkQe1dblT4"
);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const ic = (n) => `<i data-lucide="${n}"></i>`;
const ICON_WA = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 2C6.486 2 2 6.486 2 12.004c0 2.123.666 4.09 1.804 5.714L2.5 22l4.418-1.265A9.955 9.955 0 0 0 12.004 22C17.522 22 22 17.514 22 12.004 22 6.486 17.522 2 12.004 2zm0 18.18a8.14 8.14 0 0 1-4.15-1.136l-.298-.177-3.11.89.903-3.03-.194-.31a8.15 8.15 0 0 1-1.25-4.413c0-4.5 3.66-8.157 8.1-8.157 4.44 0 8.09 3.656 8.09 8.157 0 4.5-3.65 8.176-8.09 8.176z"/></svg>`;
// agente.js es un script clásico (no módulo) que reutiliza estos helpers vía window
window.$ = $; window.$$ = $$; window.ic = ic;
const fmtCOP = (n) => "$" + new Intl.NumberFormat("es-CO").format(n);
// Anima un número (formato COP) de 0 hasta el valor real -- el efecto de
// "conteo" solo se ve una vez por carga, no engaña el dato final.
function animarNumeroCOP(el, target) {
  if (!el) return;
  const dur = 1000, t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = fmtCOP(Math.round(target * ease(p)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
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
    foto: p.foto_url || "",
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
const LIMITE_DESCUENTOS = { gratis: 0, basica: 2, premium: Infinity, vitalicia: Infinity };

// Pinta en pantalla el plan activo (ClubCard, tarjeta "Plan activo"/"subir de
// plan", fecha de renovación) -- se usa tanto en la carga inicial como desde
// la suscripción en tiempo real, para que al aprobar un pago el plan se vea
// activo sin que la persona tenga que cerrar y volver a entrar.
function aplicarPlanUI(plan, fechaVencimiento) {
  if (plan) {
    localStorage.setItem("ecdlg_plan", plan);
    const sbPlanEl = document.getElementById("sb-plan-name"); if (sbPlanEl) sbPlanEl.textContent = PLAN_LABEL[plan] || plan;

    // Gratis/básica: en vez de la tarjeta "Plan activo", se muestra una
    // invitación a subir de plan que lleva directo a pagar.
    const esPlanTope = plan === "premium" || plan === "vitalicia";
    const elActivo = document.getElementById("sb-plan-activo");
    const elUpgrade = document.getElementById("sb-plan-upgrade");
    if (elActivo) elActivo.style.display = esPlanTope ? "" : "none";
    if (elUpgrade) {
      elUpgrade.style.display = esPlanTope ? "none" : "block";
      const nombreEl = document.getElementById("sb-plan-upgrade-name");
      if (nombreEl) nombreEl.textContent = PLAN_LABEL[plan] || plan;
    }
    // Re-sincroniza el tema de la ClubCard con el plan real de Supabase --
    // render() ya la pintó antes con el plan en caché (o "premium" como
    // valor por defecto en el primerísimo login, antes de tener caché).
    document.querySelectorAll(".ccv2").forEach(el => {
      el.classList.toggle("ccv2--gratis", plan === "gratis");
      el.classList.toggle("ccv2--premium", plan === "premium");
      el.classList.toggle("ccv2--vitalicia", plan === "vitalicia");
      el.classList.toggle("ccv2--basica", plan === "basica");
    });
  }

  // Fecha de renovación real (viene del pago aprobado por el admin, no inventada)
  const sbRenuevaEl = document.querySelector(".sb-plan__renueva");
  const ccRenuevaEl = document.querySelector(".cc-card-renueva");
  if (plan === "vitalicia") {
    if (sbRenuevaEl) sbRenuevaEl.textContent = "Vitalicia — no vence";
    if (ccRenuevaEl) ccRenuevaEl.textContent = "Vitalicia";
  } else if (plan === "gratis") {
    if (sbRenuevaEl) sbRenuevaEl.textContent = "Plan gratuito";
    if (ccRenuevaEl) ccRenuevaEl.textContent = "—";
  } else if (fechaVencimiento && (plan === "basica" || plan === "premium")) {
    const dVenc = new Date(fechaVencimiento + "T00:00:00");
    if (sbRenuevaEl) sbRenuevaEl.textContent = "Renueva el " + dVenc.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
    if (ccRenuevaEl) ccRenuevaEl.textContent = dVenc.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
  } else {
    if (sbRenuevaEl) sbRenuevaEl.textContent = "Sin membresía activa";
    if (ccRenuevaEl) ccRenuevaEl.textContent = "—";
  }
}

// Escucha en vivo el cambio de plan de ESTE miembro (postgres_changes de
// Supabase Realtime, mismo mecanismo que ya usa Admin para la bandeja de
// Mi Agente) -- así, cuando el admin aprueba una solicitud de membresía
// mientras la persona sigue con el Perfil abierto, el plan se actualiza
// solo, sin recargar ni volver a entrar.
let _planRealtimeCh = null;
function suscribirPlanRealtime(userId) {
  if (_planRealtimeCh) return;
  _planRealtimeCh = supabase.channel('perfil-plan-' + userId)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'perfiles', filter: `id=eq.${userId}` }, (payload) => {
      const nuevo = payload.new;
      if (!nuevo) return;
      const subioDePlan = nuevo.plan && nuevo.plan !== payload.old?.plan;
      aplicarPlanUI(nuevo.plan, nuevo.fecha_vencimiento);
      if (subioDePlan) toast(`¡Tu membresía ${PLAN_LABEL[nuevo.plan] || nuevo.plan} ya está activa! 🎉`);
    })
    .subscribe();
}

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
  // Tema de la ClubCard según el plan: vitalicia y premium en el verde
  // vivo de marca (vitalicia con más destello), básica en plata, gratis
  // sin tema (default)
  $$(".ccv2").forEach(el => {
    el.classList.toggle("ccv2--gratis", u.plan === "gratis");
    el.classList.toggle("ccv2--premium", u.plan === "premium");
    el.classList.toggle("ccv2--vitalicia", u.plan === "vitalicia");
    el.classList.toggle("ccv2--basica", u.plan === "basica");
  });

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
  if (tablaEl) tablaEl.innerHTML = `<li class="act-item" style="color:#888;font-size:13px;padding:16px 0;border-bottom:none;justify-content:center">Sin actividad aún</li>`;

  // Rol aliado ("Mi negocio") y rol profesional ("Mi consultorio"/"Mis
  // viajes") ya no se deciden acá con localStorage — se resuelven con la
  // sesión real de Supabase más abajo, en el callback de getSession(), para
  // no quedar mal si el caché del navegador tiene un rol viejo de otra
  // cuenta probada antes en el mismo dispositivo.

  if (window.lucide) lucide.createIcons();
}

/* ---------- Foto de perfil ---------- */
function aplicarFoto(dataUrl) {
  $$("[data-ini]").forEach(el => { el.innerHTML = `<img src="${dataUrl}" alt="Foto de perfil">`; });
  const quitar = $("#cfg-foto-quitar"); if (quitar) quitar.hidden = false;
}
async function subirFotoPerfil(file) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `perfil-${session.user.id}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
  if (upErr) { toast("Error subiendo la foto"); return; }
  const url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
  await supabase.from("perfiles").update({ foto_url: url }).eq("id", session.user.id);
  aplicarFoto(url);
  const perfil = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
  perfil.foto_url = url;
  localStorage.setItem("ecdlg_perfil", JSON.stringify(perfil));
  toast("Foto de perfil actualizada");
}
// Overlay propio (no el modal de paneles) para encuadrar la foto en 1:1
// antes de subirla -- mismo patrón de recorte que ya usa Admin para las
// fotos de aliados, pero cuadrado (la foto de perfil se ve en un círculo).
function abrirRecorteFotoPerfil(file) {
  const url = URL.createObjectURL(file);
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.75);display:grid;place-items:center;padding:20px";
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:20px;max-width:420px;width:100%">
      <div style="font-weight:700;font-size:15px;margin-bottom:4px">Ajustar foto</div>
      <p style="font-size:12px;color:#777;margin-bottom:14px">Mueve y haz zoom para encuadrar -- se recorta cuadrada, igual que se ve en tu perfil.</p>
      <div style="max-height:52vh;overflow:hidden;background:#000;border-radius:8px">
        <img id="cfg-crop-img" src="${url}" style="max-width:100%;display:block">
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
        <button class="btn btn--secundario" id="cfg-crop-cancel">Cancelar</button>
        <button class="btn btn--primario" id="cfg-crop-ok">${ic("check")} Recortar y subir</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  if (window.lucide) lucide.createIcons();

  const cerrar = () => { cropper.destroy(); URL.revokeObjectURL(url); ov.remove(); };
  const imgEl = ov.querySelector("#cfg-crop-img");
  const cropper = new Cropper(imgEl, { aspectRatio: 1, viewMode: 1, autoCropArea: 1, background: false });
  ov.querySelector("#cfg-crop-cancel").addEventListener("click", cerrar);
  ov.querySelector("#cfg-crop-ok").addEventListener("click", () => {
    const btn = ov.querySelector("#cfg-crop-ok");
    btn.disabled = true; btn.innerHTML = `${ic("loader")} Subiendo…`; if (window.lucide) lucide.createIcons();
    cropper.getCroppedCanvas({ width: 500, height: 500 }).toBlob(async (blob) => {
      const archivo = new File([blob], "foto.jpg", { type: "image/jpeg" });
      cerrar();
      await subirFotoPerfil(archivo);
    }, "image/jpeg", 0.9);
  });
}
async function quitarFoto() {
  const perfil = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
  delete perfil.foto_url;
  localStorage.setItem("ecdlg_perfil", JSON.stringify(perfil));
  const u = leerPerfil();
  $$("[data-ini]").forEach(el => { el.textContent = iniciales(u.nombre); });
  const quitar = $("#cfg-foto-quitar"); if (quitar) quitar.hidden = true;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) await supabase.from("perfiles").update({ foto_url: null }).eq("id", session.user.id);
}

/* ---------- Navegación de paneles ---------- */
const TITULOS = { inicio: "Inicio", negocio: "Mi negocio", perfil: "Mi perfil", clubcard: "Mi ClubCard", tienda: "Tienda", educacion: "Educación", vacantes: "Bolsa de trabajo", "profesionales-club": "Profesionales", programas: "Programas", descuentos: "Mis descuentos", agente: "Mi Agente", config: "Configuración" };
// Cambia el panel visible sin tocar el historial -- lo usa irPanel() (que sí
// lo agrega) y el listener de popstate (para no crear una entrada nueva al
// volver atrás, que crearía un loop).
function mostrarPanel(panel) {
  $$(".panel-view").forEach(v => v.classList.toggle("is-active", v.dataset.panel === panel));
  $$(".sb-link[data-panel]").forEach(l => l.classList.toggle("is-active", l.dataset.panel === panel));
  $("#topbar-title").innerHTML = `Mi cuenta · <b>${TITULOS[panel] || ""}</b>`;
  $("#dash").classList.remove("menu-open");
  $(".dash-content").scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Navegación real entre paneles: agrega una entrada al historial del
// navegador para que el botón/gesto de "atrás" (deslizar desde el borde)
// regrese al panel anterior en vez de salir de toda la página.
function irPanel(panel) {
  if (history.state?.panel !== panel) {
    history.pushState({ panel }, "", location.href);
  }
  mostrarPanel(panel);
}
window.irPanel = irPanel;

// El gesto de swipe-desde-el-borde en sí vive en gesto-volver.js (compartido
// con las demás páginas) -- acá solo hace falta escuchar popstate para que
// ese history.back() muestre el panel correcto en vez de salir de la página.
window.addEventListener("popstate", (e) => {
  if (e.state?.panel) mostrarPanel(e.state.panel);
});

/* ============================================================
   SEGMENTACIÓN
   ============================================================ */
let segBlock = 0;
let SEG_TOTAL = 0; // se recalcula tras cargar las preguntas dinámicas (ya no hay bloque fijo de identidad)
let _preguntasSeg = []; // preguntas activas traídas de Supabase, una por página
let _catBlockIndex = 1; // índice de la página que contiene la pregunta "categorías" (para el botón Actualizar)
let _respuestasSegPrevias = {}; // respuestas ya guardadas del miembro, para no perderlas al reabrir en una página puntual
let _whatsappPrevio = ""; // whatsapp que ya tenía el perfil al abrir el formulario (para saber si este es el primero que damos)

// Una pregunta oculta (condicional que no se activó) no cuenta como página
// real — se salta al avanzar/retroceder para no dejarle una pantalla vacía.
function segSiguienteVisible(desde, dir) {
  const bloques = $$(".seg-block");
  let i = desde + dir;
  while (i >= 0 && i < bloques.length) {
    const q = bloques[i].querySelector(".seg-q");
    if (!q || !q.hidden) return i;
    i += dir;
  }
  return null;
}

function segMostrar(i) {
  segBlock = Math.max(0, Math.min(SEG_TOTAL - 1, i));
  const bloques = $$(".seg-block");
  bloques.forEach((b, k) => b.classList.toggle("is-active", k === segBlock));
  const visibles = bloques.filter(b => { const q = b.querySelector(".seg-q"); return !q || !q.hidden; });
  const idxVisible = Math.max(0, visibles.indexOf(bloques[segBlock]));
  $("#seg-bar").style.width = ((idxVisible + 1) / visibles.length * 100) + "%";
  $("#seg-prev").style.visibility = segBlock === 0 ? "hidden" : "visible";
  const esUltima = segSiguienteVisible(segBlock, 1) === null;
  $("#seg-next").innerHTML = (esUltima ? "Finalizar" : "Siguiente") + ' <span class="ar">&rarr;</span>';
  $(".seg-overlay").scrollTo({ top: 0, behavior: "smooth" });
}
// mostrarIntro=true: pantalla de bienvenida sola, con su propio botón
// "Comenzar" -- el flujo real de preguntas (progreso + bloques) arranca
// recién cuando lo tocan. Se omite (va directo al flujo) si ya había un
// borrador en curso o si se reabre en un bloque puntual (ej. "Actualizar
// categorías"), para no volver a mostrarle la bienvenida a quien ya empezó.
function abrirSeg(i = 0, mostrarIntro = false) {
  $(".seg-overlay").classList.add("is-open");
  document.body.style.overflow = "hidden";
  $$(".seg-interstitial").forEach(el => el.hidden = true);
  document.querySelector(".seg-logo").style.display = "";
  if (mostrarIntro) {
    $("#seg-intro").hidden = false;
    $("#seg-flujo").hidden = true;
  } else {
    $("#seg-intro").hidden = true;
    $("#seg-flujo").hidden = false;
    segMostrar(i);
  }
  if (window.lucide) lucide.createIcons();
}
function cerrarSeg() {
  $(".seg-overlay").classList.remove("is-open");
  document.body.style.overflow = "";
  if (_miembroId) localStorage.setItem(`ecdlg_segmentado_${_miembroId}`, "1");
}

// Pantallas especiales (justificación de datos, confirmación, cierre final):
// reemplazan temporalmente el flujo normal de preguntas sin tocar segBlock/
// SEG_TOTAL, para no desordenar la barra de progreso ni la paginación.
function mostrarSegInterstitial(id) {
  document.querySelector(".seg-logo").style.display = id === "seg-final-gracias" ? "none" : "";
  $("#seg-intro").hidden = true;
  $("#seg-flujo").hidden = true;
  $$(".seg-interstitial").forEach(el => el.hidden = el.id !== id);
  $(".seg-overlay").scrollTo({ top: 0, behavior: "smooth" });
}
function ocultarSegInterstitials() {
  document.querySelector(".seg-logo").style.display = "";
  $$(".seg-interstitial").forEach(el => el.hidden = true);
  $("#seg-flujo").hidden = false;
}

// La clave del borrador incluye el miembro_id -- si no, un borrador a medias
// de una cuenta queda pegado en el navegador y se lo come la siguiente
// cuenta que inicie sesión ahí (ej. pruebas), saltándole la bienvenida.
function claveSegBorrador() {
  return _miembroId ? `ecdlg_seg_borrador_${_miembroId}` : "ecdlg_seg_borrador";
}

// Guarda en el navegador lo respondido hasta ahora en el cuestionario, para
// que minimizar o recargar a mitad de camino no borre el progreso. Solo dura
// mientras no se llega al final (cerrarSeg/el guardado real la limpia).
function guardarBorradorSeg() {
  const respuestas = { ..._respuestasSegPrevias };
  $$("#seg-dinamico .seg-q[data-pregunta-id]").forEach(q => {
    const id = q.dataset.preguntaId;
    const input = q.querySelector(".seg-input");
    if (input) {
      const v = input.value.trim();
      if (v) respuestas[id] = v;
      return;
    }
    const sel = [...$$(".seg-opt.is-on", q)].map(b => b.textContent.trim());
    if (sel.length) respuestas[id] = q.dataset.multi === "1" ? sel : sel[0];
  });
  try {
    localStorage.setItem(claveSegBorrador(), JSON.stringify({
      bloque: segBlock,
      respuestas,
      nombre: $("#seg-nombre")?.value.trim() || "",
      apellido: $("#seg-apellido")?.value.trim() || "",
      fecha: $("#seg-fecha")?.value || "",
      whatsapp: $("#seg-whatsapp")?.value.trim() || "",
    }));
  } catch {}
}

// Restaura un borrador previo (si existe) sobre los campos ya renderizados.
function restaurarBorradorSeg() {
  let borrador;
  try { borrador = JSON.parse(localStorage.getItem(claveSegBorrador()) || "null"); } catch { borrador = null; }
  if (!borrador) return null;

  if (borrador.nombre) { const el = $("#seg-nombre"); if (el) el.value = borrador.nombre; }
  if (borrador.apellido) { const el = $("#seg-apellido"); if (el) el.value = borrador.apellido; }
  if (borrador.fecha) { const el = $("#seg-fecha"); if (el) el.value = borrador.fecha; }
  if (borrador.whatsapp) { const el = $("#seg-whatsapp"); if (el) el.value = borrador.whatsapp; }

  $$("#seg-dinamico .seg-q[data-pregunta-id]").forEach(q => {
    const v = borrador.respuestas?.[q.dataset.preguntaId];
    if (v === undefined) return;
    const input = q.querySelector(".seg-input");
    if (input) { input.value = v; return; }
    const valores = Array.isArray(v) ? v : [v];
    $$(".seg-opt", q).forEach(o => o.classList.toggle("is-on", valores.includes(o.textContent.trim())));
  });
  actualizarCondicionalesSeg();
  return borrador.bloque;
}

// Trae las preguntas activas desde Admin → "Formulario de bienvenida" y arma
// una página por pregunta dentro de #seg-dinamico (una sola pregunta a la vez,
// para que no sea largo de responder). Idempotente: si ya se cargaron antes en
// esta sesión (ej. al reabrir con "Actualizar"), no vuelve a pedirlas.
async function cargarPreguntasSegmentacion() {
  const cont = $("#seg-dinamico");
  if (!cont) return;
  if (!_preguntasSeg.length) {
    const { data } = await supabase.from("preguntas_segmentacion").select("*").eq("activa", true).order("orden");
    _preguntasSeg = data || [];
  }
  _catBlockIndex = Math.max(0, _preguntasSeg.findIndex(p => p.guardar_como_categorias));

  cont.innerHTML = _preguntasSeg.map(p => {
    return `
    <div class="seg-block">
      <div class="seg-block__title">${esc(p.bloque)}</div>
      <div class="seg-q" data-pregunta-id="${p.id}" ${p.tipo === "multiple" ? 'data-multi="1"' : ""} ${p.obligatoria ? 'data-obligatoria="1"' : ""} ${p.guardar_como_categorias ? 'data-categorias="1"' : ""} ${p.es_autorizacion_datos ? 'data-autorizacion="1"' : ""} ${p.pregunta_padre_id ? `data-padre-id="${p.pregunta_padre_id}" data-mostrar-si="${esc(p.mostrar_si_respuesta || "")}" hidden` : ""}>
        <div class="seg-q__label">${esc(p.pregunta)}${p.obligatoria ? ' <span class="seg-q__hint">obligatoria</span>' : ""}${p.ayuda ? ` <span class="seg-q__hint">${esc(p.ayuda)}</span>` : ""}</div>
        ${p.tipo === "texto"
          ? `<input type="text" class="seg-input">`
          : `<div class="seg-opts">${(p.opciones || []).map(o => `<button type="button" class="seg-opt">${esc(o)}</button>`).join("")}</div>`}
      </div>
    </div>`;
  }).join("");

  SEG_TOTAL = _preguntasSeg.length;

  // Los botones de opción y la lógica de único/múltiple viven en el mismo
  // documento; se enlazan cada vez que se regenera el HTML dinámico.
  $$("#seg-dinamico .seg-q").forEach(q => {
    const multi = q.dataset.multi === "1";
    $$(".seg-opt", q).forEach(opt => opt.addEventListener("click", () => {
      if (multi) opt.classList.toggle("is-on");
      else $$(".seg-opt", q).forEach(o => o.classList.toggle("is-on", o === opt));
      actualizarCondicionalesSeg();
      guardarBorradorSeg();
    }));
    const inputTexto = q.querySelector(".seg-input");
    inputTexto?.addEventListener("input", guardarBorradorSeg);
  });
  actualizarCondicionalesSeg();
  if (window.lucide) lucide.createIcons();
}

// Muestra/oculta las preguntas que dependen de otra (ej. "¿Cuál producto de
// belleza?" solo si "¿Te interesa belleza?" = Sí). Se llama cada vez que se
// toca un botón de opción dentro del formulario dinámico.
function actualizarCondicionalesSeg() {
  $$("#seg-dinamico .seg-q[data-padre-id]").forEach(hijo => {
    const padre = document.querySelector(`#seg-dinamico .seg-q[data-pregunta-id="${hijo.dataset.padreId}"]`);
    const seleccion = padre ? [...$$(".seg-opt.is-on", padre)].map(b => b.textContent.trim()) : [];
    const debeMostrar = seleccion.includes(hijo.dataset.mostrarSi);
    if (debeMostrar === !hijo.hidden) return;
    hijo.hidden = !debeMostrar;
    if (!debeMostrar) {
      $$(".seg-opt.is-on", hijo).forEach(o => o.classList.remove("is-on"));
      const inp = hijo.querySelector(".seg-input"); if (inp) inp.value = "";
    }
  });
}

// Punto de entrada único para abrir el formulario: asegura que los bloques
// dinámicos ya estén cargados antes de mostrar cualquier paso.
async function iniciarSegmentacion(perfil, irABloque = 0) {
  await cargarPreguntasSegmentacion();
  if (perfil) prepararCamposConocidos(perfil);
  let bloqueInicial = irABloque === "categorias" ? _catBlockIndex : irABloque;
  // La bienvenida solo se muestra en la entrada normal, de cero -- no cuando
  // se pide ir directo a "categorias", ni cuando ya había un borrador en
  // curso (esa persona ya la vio la primera vez).
  let mostrarIntro = irABloque === 0;
  if (irABloque === 0) {
    const bloqueGuardado = restaurarBorradorSeg();
    if (bloqueGuardado != null) { bloqueInicial = bloqueGuardado; mostrarIntro = false; }
  }
  abrirSeg(bloqueInicial, mostrarIntro);
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
async function cargarDescuentos(userId, whatsapp) {
  const u = leerPerfil();

  const [{ data: aliadosData, error }, { data: tiendaData }, { data: uberData }, { data: profData }] = await Promise.all([
    supabase.from("descuentos")
      .select("aliado_nombre, categoria, descuento_pct, compra, ahorro, created_at, aliados(imagen_url)")
      .eq("miembro_id", userId).order("created_at", { ascending: false }),
    supabase.from("pedidos_club")
      .select("nombre_producto, monto, ahorro, created_at")
      .eq("miembro_id", userId).not("estado", "in", "(pendiente_pago,cancelado)"),
    supabase.from("viajes_conductor")
      .select("tipo, monto, ahorro, created_at")
      .eq("miembro_id", userId).eq("anulado", false),
    supabase.from("servicios_aplicados")
      .select("nombre_servicio, tarifa, descuento_pct, es_cortesia, ahorro, created_at")
      .eq("miembro_id", userId),
  ]);

  // El banner de "te quedan N descuentos" solo mide uso de aliados -- Tienda,
  // Uber y Profesionales no cuentan contra ese límite mensual.
  const limite = LIMITE_DESCUENTOS[u.plan] ?? 2;
  if (limite !== Infinity) {
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
    const usosMes = (aliadosData || []).filter(d => new Date(d.created_at) >= inicioMes).length;
    const restantes = Math.max(0, limite - usosMes);
    const banner = document.getElementById("banner-usos");
    if (banner) {
      if (limite === 0) {
        banner.style.display = "flex";
        banner.innerHTML = `<span style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="display:inline-flex;align-items:center;gap:4px;background:#0f4423;color:#fff;font-weight:800;font-size:12.5px;padding:5px 11px;border-radius:20px;white-space:nowrap">🔥 Hasta 40% OFF</span>
          <span>Solo para las primeras 50 personas — los descuentos de aliados son exclusivos desde Básica · <a href="Planes.html" style="color:#0f4423;font-weight:800;text-decoration:underline">Ver membresías →</a></span>
        </span>`;
        banner.style.background = "#e8f5ee";
        banner.style.color = "#095544";
      } else {
        banner.style.display = "flex";
        banner.innerHTML = restantes > 0
          ? `<span>${ic("ticket-percent")} Te quedan <b>${restantes} descuento${restantes !== 1 ? "s" : ""}</b> este mes · <a href="Planes.html" style="color:#095544;font-weight:700">Actualizar a Premium</a></span>`
          : `<span style="color:#b45309">${ic("alert-triangle")} Llegaste al límite de ${limite} descuento${limite !== 1 ? "s" : ""} este mes · <a href="Planes.html" style="color:#b45309;font-weight:700">Actualizar a Premium</a></span>`;
        banner.style.background = restantes > 0 ? "#e8f5ee" : "#fef3c7";
        banner.style.color = restantes > 0 ? "#095544" : "#b45309";
      }
      if (window.lucide) lucide.createIcons();
    }
  }

  if (error) return;

  const TIPO_UBER_LBL = { carro: "Carro", moto: "Moto", domicilio: "Domicilio" };
  const data = [
    ...(aliadosData || []).map(d => ({
      tipo: "aliado", nombre: d.aliado_nombre, categoria: d.categoria, imagen_url: d.aliados?.imagen_url || null,
      descuento_pct: d.descuento_pct, compra: d.compra, ahorro: d.ahorro || 0, created_at: d.created_at,
    })),
    ...(tiendaData || []).map(d => ({
      tipo: "tienda", nombre: d.nombre_producto, categoria: "Tienda del Club",
      descuento_pct: null, compra: d.monto, ahorro: d.ahorro || 0, created_at: d.created_at,
    })),
    ...(uberData || []).map(d => ({
      tipo: "uber", nombre: `Uber ${TIPO_UBER_LBL[d.tipo] || d.tipo}`, categoria: "Transporte",
      descuento_pct: "10%", compra: d.monto, ahorro: d.ahorro || 0, created_at: d.created_at,
    })),
    ...(profData || []).map(d => ({
      tipo: "profesional", nombre: d.nombre_servicio, categoria: "Profesionales",
      descuento_pct: d.es_cortesia ? "Cortesía" : d.descuento_pct, compra: d.tarifa, ahorro: d.ahorro || 0, created_at: d.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (!data?.length) {
    const dirHref = `Directorio.html?miembro=${userId}&wa=${encodeURIComponent(whatsapp || "")}&plan=${u.plan || "basica"}&usos=0`;
    const elAhorroMes = document.getElementById("stat-ahorro-mes");
    const elDescMes = document.getElementById("stat-descuentos-mes");
    const elAliadosMes = document.getElementById("stat-aliados-mes");
    const elAhorroTotal = document.getElementById("stat-ahorro-total");
    if (elAhorroMes) elAhorroMes.textContent = fmtCOP(0);
    if (elDescMes) elDescMes.textContent = "0";
    if (elAliadosMes) elAliadosMes.textContent = "0";
    if (elAhorroTotal) elAhorroTotal.textContent = fmtCOP(0);

    const actEl = $("#actividad");
    if (actEl) actEl.innerHTML = `
      <li class="act-item act-item--empty" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;padding:28px 10px">
        <span style="width:38px;height:38px;border-radius:50%;background:var(--verde-soft);color:var(--verde);display:grid;place-items:center">${ic("sparkles")}</span>
        <span style="font-size:13px;line-height:1.5;max-width:260px;color:var(--tinta-45,#888)">Aún no has usado ningún descuento. Lleva tu ClubCard a un aliado y actívalo con el código QR.</span>
        <a href="${dirHref}" style="font-size:12.5px;font-weight:700;color:var(--verde);display:inline-flex;align-items:center;gap:5px;text-decoration:none">Ver aliados cerca de ti ${ic("arrow-right")}</a>
      </li>`;

    const tablaEl = $("#tabla-body");
    if (tablaEl) tablaEl.innerHTML = `
      <li class="act-item" style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:32px 16px;border-bottom:none">
        <span style="font-size:13px;color:var(--tinta-45,#888)">Todavía no tienes descuentos registrados.</span>
        <a href="${dirHref}" style="font-size:12.5px;font-weight:700;color:var(--verde);text-decoration:none">Explora los aliados del Club →</a>
      </li>`;

    if (window.lucide) lucide.createIcons();
    return;
  }

  const iconMap = { "Odontología": "smile", "Bienestar y salud": "heart-pulse", "Turismo": "mountain-snow",
    "Veterinaria": "paw-print", "Canasta familiar": "shopping-basket", "Ropa personalizada": "shirt",
    "Heladería": "ice-cream", "Comida rápida": "sandwich", "Barbería": "scissors" };
  const TIPO_ICON = { tienda: "shopping-bag", uber: "car", profesional: "briefcase-medical" };
  const getIcon = (it) => TIPO_ICON[it.tipo] || iconMap[it.categoria] || "receipt";
  const fmtFecha = (iso) => new Date(iso).toLocaleDateString("es-CO", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" });

  // Stats
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
  const dataMes = data.filter(d => new Date(d.created_at) >= inicioMes);
  const ahorroMes = dataMes.reduce((s, d) => s + (d.ahorro || 0), 0);
  const countMes = dataMes.length;
  // "Aliados visitados" solo cuenta aliados de verdad, no Tienda/Uber/Profesionales
  const aliadosMes = new Set(dataMes.filter(d => d.tipo === "aliado").map(d => d.nombre)).size;
  const ahorroTotal = data.reduce((s, d) => s + (d.ahorro || 0), 0);

  // Mes anterior, para la variación real (nada de porcentajes inventados)
  const inicioMesAnterior = new Date(inicioMes); inicioMesAnterior.setMonth(inicioMesAnterior.getMonth() - 1);
  const ahorroMesAnterior = data
    .filter(d => { const f = new Date(d.created_at); return f >= inicioMesAnterior && f < inicioMes; })
    .reduce((s, d) => s + (d.ahorro || 0), 0);

  const elAhorroMes = document.getElementById("stat-ahorro-mes");
  const elDescMes = document.getElementById("stat-descuentos-mes");
  const elAliadosMes = document.getElementById("stat-aliados-mes");
  const elAhorroTotal = document.getElementById("stat-ahorro-total");
  if (elAhorroMes) animarNumeroCOP(elAhorroMes, ahorroMes);
  if (elDescMes) elDescMes.textContent = countMes;
  if (elAliadosMes) elAliadosMes.textContent = aliadosMes;
  if (elAhorroTotal) elAhorroTotal.textContent = fmtCOP(ahorroTotal);

  const elTrend = document.getElementById("hero-ahorro-trend");
  const elTrendTxt = document.getElementById("hero-ahorro-trend-txt");
  if (elTrend && elTrendTxt) {
    if (ahorroMesAnterior > 0) {
      const variacion = Math.round(((ahorroMes - ahorroMesAnterior) / ahorroMesAnterior) * 100);
      elTrendTxt.textContent = `${variacion >= 0 ? "+" : ""}${variacion}% vs. el mes pasado`;
      elTrend.hidden = false;
    } else {
      elTrend.hidden = true;
    }
  }

  // Racha: meses seguidos (hasta el actual) con al menos un descuento usado
  const card = document.getElementById("card-racha");
  const dotsEl = document.getElementById("racha-dots");
  const txtEl = document.getElementById("racha-txt");
  if (card && dotsEl && txtEl) {
    const mesesConAhorro = new Set(data.map(d => { const f = new Date(d.created_at); return f.getFullYear() * 12 + f.getMonth(); }));
    const claveMes = inicioMes.getFullYear() * 12 + inicioMes.getMonth();
    let racha = 0;
    for (let m = claveMes; mesesConAhorro.has(m); m--) racha++;
    if (racha >= 2) {
      card.hidden = false;
      txtEl.textContent = `🔥 ${racha} meses seguidos ahorrando`;
      const dots = [];
      for (let i = 5; i >= 0; i--) {
        const clave = claveMes - i;
        dots.push(`<span class="racha-dot${mesesConAhorro.has(clave) ? " is-on" : ""}"></span>`);
      }
      dotsEl.innerHTML = dots.join("");
    } else {
      card.hidden = true;
    }
  }

  // Actividad reciente (dashboard)
  const actEl = $("#actividad");
  if (actEl) actEl.innerHTML = data.slice(0, 4).map(it => `
    <li class="act-item">
      <span class="act-item__ic">${ic(getIcon(it))}</span>
      <span class="act-item__body">
        <span class="act-item__name">${esc(it.nombre)}</span>
        <span class="act-item__meta">${fmtFecha(it.created_at)}${it.descuento_pct ? ` · ${esc(String(it.descuento_pct))} de descuento` : ""}</span>
      </span>
      <span class="act-item__nums">
        <span class="act-item__ahorro">−${fmtCOP(it.ahorro)}</span>
        <span class="act-item__compra">de ${fmtCOP(it.compra)}</span>
      </span>
    </li>`).join("");

  // Lista completa de descuentos (antes era una tabla de 5 columnas que se
  // desbordaba en móvil -- se usa el mismo patrón que "Actividad reciente")
  const tablaEl = $("#tabla-body");
  if (tablaEl) tablaEl.innerHTML = data.map(it => `
    <li class="act-item">
      ${it.imagen_url
        ? `<img class="act-item__ic" src="${esc(it.imagen_url)}" alt="" style="object-fit:cover">`
        : `<span class="act-item__ic">${ic(getIcon(it))}</span>`}
      <span class="act-item__body">
        <span class="act-item__name">${esc(it.nombre)}</span>
        <span class="act-item__meta">${esc(it.categoria || "")} · ${fmtFecha(it.created_at)}${it.descuento_pct ? ` · ${esc(String(it.descuento_pct))}` : ""}</span>
      </span>
      <span class="act-item__nums">
        <span class="act-item__ahorro">−${fmtCOP(it.ahorro)}</span>
        <span class="act-item__compra">de ${fmtCOP(it.compra)}</span>
      </span>
    </li>`).join("");

  if (window.lucide) lucide.createIcons();
}

/* ---------- Modal: evolución del ahorro mes a mes ---------- */
function barPathTop(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, Math.max(h, 0));
  if (h <= 0) return `M${x},${y} L${x + w},${y} Z`;
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}
async function abrirAhorroMensual() {
  if (!_miembroId) return;
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);

  const [{ data: d1 }, { data: d2 }, { data: d3 }, { data: d4 }] = await Promise.all([
    supabase.from("descuentos").select("ahorro, created_at").eq("miembro_id", _miembroId).gte("created_at", desde.toISOString()),
    supabase.from("pedidos_club").select("ahorro, created_at").eq("miembro_id", _miembroId).not("estado", "in", "(pendiente_pago,cancelado)").gte("created_at", desde.toISOString()),
    supabase.from("viajes_conductor").select("ahorro, created_at").eq("miembro_id", _miembroId).eq("anulado", false).gte("created_at", desde.toISOString()),
    supabase.from("servicios_aplicados").select("ahorro, created_at").eq("miembro_id", _miembroId).gte("created_at", desde.toISOString()),
  ]);
  const todos = [...(d1 || []), ...(d2 || []), ...(d3 || []), ...(d4 || [])];

  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({ clave: `${d.getFullYear()}-${d.getMonth()}`, lbl: MES_LBL[d.getMonth()], total: 0 });
  }
  todos.forEach(it => {
    const f = new Date(it.created_at);
    const clave = `${f.getFullYear()}-${f.getMonth()}`;
    const mes = meses.find(m => m.clave === clave);
    if (mes) mes.total += (it.ahorro || 0);
  });

  const ANCHO = 300, ALTO = 150, EJE_Y = 116, BAR_W = 30;
  const GAP = (ANCHO - BAR_W * 6) / 7;
  const maxVal = Math.max(...meses.map(m => m.total), 1);

  const barsSvg = meses.map((m, i) => {
    const h = Math.round((m.total / maxVal) * (EJE_Y - 18));
    const x = GAP + i * (BAR_W + GAP);
    const y = EJE_Y - h;
    const esActual = i === meses.length - 1;
    const color = esActual ? "#00DF81" : "rgba(0,223,129,.32)";
    return `
      <g class="ahorro-bar-g" data-valor="${fmtCOP(m.total)}" data-mes="${m.lbl}" tabindex="0">
        <rect x="${x}" y="0" width="${BAR_W}" height="${ALTO}" fill="transparent"></rect>
        <path d="${barPathTop(x, y, BAR_W, h, 4)}" fill="${color}"></path>
        ${esActual ? `<text x="${x + BAR_W / 2}" y="${y - 8}" text-anchor="middle" font-family="Fraunces, serif" font-size="12" font-weight="700" fill="#F1F7F6">${fmtCOP(m.total)}</text>` : ""}
        <text x="${x + BAR_W / 2}" y="${EJE_Y + 16}" text-anchor="middle" font-size="10.5" fill="rgba(241,247,246,.55)">${m.lbl}</text>
      </g>`;
  }).join("");

  abrirModalTienda("Tu ahorro mes a mes", `
    <div style="background:#021B1A;border-radius:16px;padding:22px 14px 14px;margin-bottom:20px;position:relative">
      <svg viewBox="0 0 ${ANCHO} ${ALTO}" style="width:100%;height:auto;display:block;overflow:visible" id="ahorro-chart-svg">${barsSvg}</svg>
      <div id="ahorro-chart-tooltip" style="display:none;position:absolute;transform:translate(-50%,-100%);background:#fff;color:#021B1A;font-size:12px;font-weight:700;padding:6px 10px;border-radius:8px;pointer-events:none;box-shadow:0 6px 16px rgba(0,0,0,.25);white-space:nowrap;z-index:2"></div>
    </div>
    <div style="background:linear-gradient(135deg,#EAB749,#d99a2b);border-radius:16px;padding:22px 20px;color:#2b1d02;text-align:center">
      <div style="font-size:30px;margin-bottom:8px">🏆 🎁 ✈️</div>
      <div style="font-family:'Fraunces',serif;font-size:19px;font-weight:700;margin-bottom:8px;line-height:1.25">¡Pronto premiaremos a quienes más ahorran!</div>
      <p style="font-size:13.5px;line-height:1.55;opacity:.85">Viajes, celulares, ropa de marca y muchas sorpresas más para los miembros que más aprovechen sus beneficios cada mes. Sigue ahorrando — ¡tú podrías ser el próximo ganador! 🎉</p>
    </div>
    <div style="text-align:center;margin-top:22px">
      <img src="logo-club.png" alt="El Club de la Gente" style="height:34px;width:auto;opacity:.55">
    </div>
  `);

  const cont = document.querySelector("#ahorro-chart-svg")?.parentElement;
  const svg = document.getElementById("ahorro-chart-svg");
  const tip = document.getElementById("ahorro-chart-tooltip");
  const mostrarTip = (g) => {
    if (!tip || !cont) return;
    const barRect = g.querySelector("path").getBoundingClientRect();
    const contRect = cont.getBoundingClientRect();
    tip.style.left = `${barRect.left - contRect.left + barRect.width / 2}px`;
    tip.style.top = `${barRect.top - contRect.top - 8}px`;
    tip.textContent = `${g.dataset.mes}: ${g.dataset.valor}`;
    tip.style.display = "block";
  };
  svg?.querySelectorAll(".ahorro-bar-g").forEach(g => {
    g.style.cursor = "pointer";
    g.addEventListener("click", () => mostrarTip(g));
    g.addEventListener("mouseenter", () => mostrarTip(g));
    g.addEventListener("mouseleave", () => { if (tip) tip.style.display = "none"; });
  });
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

let _modalTiendaAbierta = false;
function abrirModalTienda(titulo, bodyHtml) {
  const t = $("#modal-tienda-title"); if (t) t.textContent = titulo;
  const b = $("#modal-tienda-body"); if (b) b.innerHTML = bodyHtml;
  const m = $("#modal-tienda"); if (m) m.style.display = "flex";
  document.body.style.overflow = "hidden";
  if (!_modalTiendaAbierta) history.pushState({ modalTienda: true }, "");
  _modalTiendaAbierta = true;
  if (window.lucide) lucide.createIcons();
}
function cerrarModalTienda(_desdePopstate) {
  const m = $("#modal-tienda"); if (m) m.style.display = "none";
  document.body.style.overflow = "";
  if (_modalTiendaAbierta) {
    _modalTiendaAbierta = false;
    if (!_desdePopstate) history.back();
  }
}
window.addEventListener("popstate", () => {
  if (_modalTiendaAbierta) cerrarModalTienda(true);
});
// Delegado en document (no depende de que #modal-tienda ya exista ni de DOMContentLoaded)
document.addEventListener("click", (e) => {
  if (e.target.closest("#modal-tienda-close")) { cerrarModalTienda(); return; }
  if (e.target.id === "modal-tienda") { cerrarModalTienda(); return; }
});

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
    const vac = $("#negtab-vacantes"); if (vac) vac.style.display = tab === "vacantes" ? "" : "none";
    if (tab === "vacantes") cargarVacantesAliado(negocio.id);
  }));

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

  $("#vac-publicar")?.addEventListener("click", async () => {
    const btn = $("#vac-publicar");
    const titulo = $("#vac-titulo")?.value.trim();
    const desc = $("#vac-desc")?.value.trim();
    let wa = $("#vac-wa")?.value.trim().replace(/\D/g, "");
    if (wa.length === 12 && wa.startsWith("57")) wa = wa.slice(2);
    if (!titulo || !wa || wa.length !== 10) { toast("Completa el cargo y un WhatsApp válido (10 dígitos)"); return; }
    btn.disabled = true;
    const { error } = await supabase.from("vacantes").insert({ aliado_id: negocio.id, titulo, descripcion: desc || null, whatsapp: wa });
    btn.disabled = false;
    if (error) { toast("Error publicando la vacante"); return; }
    $("#vac-titulo").value = ""; $("#vac-desc").value = ""; $("#vac-wa").value = "";
    toast("Vacante enviada a revisión");
    cargarVacantesAliado(negocio.id);
  });

  cargarMisProductos(negocio.id);
  cargarPedidosAliado(negocio.id);
}

const ESTADO_VACANTE = {
  pendiente: { c: "#b45309", bg: "#fef3c7", t: "En revisión" },
  aprobada:  { c: "#095544", bg: "#e8f5ee", t: "Publicada" },
  rechazada: { c: "#c0392b", bg: "#fdecea", t: "Rechazada" },
};

async function cargarVacantesAliado(aliadoId) {
  const list = $("#vac-lista");
  if (!list) return;
  const { data } = await supabase.from("vacantes").select("*").eq("aliado_id", aliadoId).order("created_at", { ascending: false });
  const vacantes = data || [];
  if (!vacantes.length) { list.innerHTML = `<p style="padding:8px 0">Aún no has publicado ninguna vacante.</p>`; return; }
  list.innerHTML = vacantes.map(v => {
    const est = ESTADO_VACANTE[v.estado] || ESTADO_VACANTE.pendiente;
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #ebebeb">
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">${esc(v.titulo)}</div>
        <div style="font-size:12px;color:#777">WhatsApp ${esc(v.whatsapp)}${!v.activo ? " · cerrada" : ""}</div>
      </div>
      <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:${est.bg};color:${est.c};flex-shrink:0;white-space:nowrap">${est.t}</span>
      ${v.estado !== "aprobada" || v.activo ? `<button data-cerrar-vac="${v.id}" style="border:none;background:none;cursor:pointer;color:#777;font-size:11px;font-weight:600;white-space:nowrap">${v.activo ? "Cerrar" : "Cerrada"}</button>` : ""}
    </div>`;
  }).join("");
  list.querySelectorAll("[data-cerrar-vac]").forEach(btn => btn.addEventListener("click", async () => {
    if (btn.textContent !== "Cerrar") return;
    btn.disabled = true;
    const { error } = await supabase.from("vacantes").update({ activo: false }).eq("id", btn.dataset.cerrarVac);
    if (error) { toast("Error cerrando la vacante"); btn.disabled = false; return; }
    cargarVacantesAliado(aliadoId);
  }));
}

let _vacantesMiembroCargadas = false;
async function cargarVacantesMiembro() {
  if (_vacantesMiembroCargadas) return;
  _vacantesMiembroCargadas = true;

  const grid = $("#vacantes-grid");
  if (!grid) return;

  const { data } = await supabase
    .from("vacantes")
    .select("*, aliados(nombre, imagen_url)")
    .eq("estado", "aprobada")
    .eq("activo", true)
    .order("created_at", { ascending: false });

  const vacantes = data || [];
  if (!vacantes.length) {
    grid.innerHTML = `
      <div style="text-align:center;padding:48px 20px;grid-column:1/-1">
        <span style="display:inline-flex;width:38px;height:38px;border-radius:50%;background:var(--verde-soft);color:var(--verde);align-items:center;justify-content:center;margin-bottom:14px">${ic("briefcase")}</span>
        <p style="font-size:13px;color:var(--tinta-45,#888);max-width:320px;margin:0 auto;line-height:1.5">Todavía no hay vacantes publicadas. En cuanto algún aliado publique una, la verás aquí.</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  grid.innerHTML = vacantes.map(v => `
    <div class="card" style="padding:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        ${v.aliados?.imagen_url ? `<img src="${v.aliados.imagen_url}" style="width:34px;height:34px;object-fit:cover;border-radius:8px;flex-shrink:0">` : `<div style="width:34px;height:34px;border-radius:8px;background:#f0faf4;flex-shrink:0"></div>`}
        <div style="font-size:12px;color:#777;font-weight:600">${esc(v.aliados?.nombre || "")}</div>
      </div>
      <div style="font-weight:700;font-size:15px;margin-bottom:6px">${esc(v.titulo)}</div>
      ${v.descripcion ? `<p style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px">${esc(v.descripcion)}</p>` : ""}
      <a class="btn btn--primario" style="width:100%;justify-content:center" target="_blank" href="https://wa.me/57${v.whatsapp}?text=${encodeURIComponent("Hola, vi la vacante de " + v.titulo + " en El Club de la Gente")}">${ICON_WA}Escribir por WhatsApp</a>
    </div>`).join("");
  if (window.lucide) lucide.createIcons();
}

const ESTADO_PRODUCTO_ALIADO = {
  pendiente: { c: "#b45309", bg: "#fef3c7", t: "En revisión" },
  aprobado:  { c: "#095544", bg: "#e8f5ee", t: "Publicado" },
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
    if (error) {
      if (error.code === "23503") {
        if (confirm("Este producto ya tiene pedidos y no se puede eliminar sin perder ese historial.\n\n¿Prefieres solo desactivarlo? (desaparece de la tienda, pero conserva los pedidos)")) {
          const { error: errDesact } = await supabase.from("productos_aliado").update({ activo: false }).eq("id", btn.dataset.rmProdal);
          if (errDesact) { toast("Error desactivando: " + errDesact.message); return; }
          toast("Producto desactivado ✓");
          cargarMisProductos(aliadoId);
        }
        return;
      }
      toast("Error eliminando: " + error.message);
      return;
    }
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
    <div class="cfg-campo"><label class="cfg-label">Fotos del producto <span style="font-weight:400;opacity:.6">(hasta 5, la primera es la principal)</span></label>
      <div id="pa-img-grid" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px"></div>
      <input type="file" id="pa-img-input" accept="image/*" style="display:none">
    </div>
    <button class="btn btn--primario" id="pa-save" data-id="${p.id || ""}" style="margin-top:8px">${p.id ? "Guardar cambios" : "Agregar producto"} <i data-lucide="check" style="width:15px;height:15px"></i></button>
  `);
  formatearInputMoneda($("#pa-precio"));
  formatearInputMoneda($("#pa-descuento"));

  let imagenes = p.imagenes || (p.imagen_url ? [p.imagen_url] : []);

  // Borrador solo para productos nuevos (uno editándose ya tiene sus datos en
  // la base) -- si se cierra el modal o la app antes de "Guardar", no se
  // pierde lo escrito. Las fotos ya se suben a Storage al elegirlas, así que
  // también se guarda su URL para no dejarlas huérfanas sin referenciar.
  const esNuevoProducto = !p.id;
  const BORRADOR_PRODUCTO_KEY = "ecdlg_producto_borrador";
  function guardarBorradorProducto() {
    if (!esNuevoProducto) return;
    try {
      localStorage.setItem(BORRADOR_PRODUCTO_KEY, JSON.stringify({
        nombre: $("#pa-nombre")?.value || "",
        desc: $("#pa-desc")?.value || "",
        cat: $("#pa-cat")?.value || "",
        precio: $("#pa-precio")?.value || "",
        descuento: $("#pa-descuento")?.value || "",
        wa: $("#pa-wa")?.value || "",
        fecha: $("#pa-fecha")?.value || "",
        imagenes,
      }));
    } catch {}
  }
  if (esNuevoProducto) {
    let borrador;
    try { borrador = JSON.parse(localStorage.getItem(BORRADOR_PRODUCTO_KEY) || "null"); } catch { borrador = null; }
    if (borrador) {
      if (borrador.nombre) $("#pa-nombre").value = borrador.nombre;
      if (borrador.desc) $("#pa-desc").value = borrador.desc;
      if (borrador.cat) $("#pa-cat").value = borrador.cat;
      if (borrador.precio) $("#pa-precio").value = borrador.precio;
      if (borrador.descuento) $("#pa-descuento").value = borrador.descuento;
      if (borrador.wa) $("#pa-wa").value = borrador.wa;
      if (borrador.fecha) $("#pa-fecha").value = borrador.fecha;
      if (borrador.imagenes?.length) imagenes = borrador.imagenes;
    }
    ["pa-nombre", "pa-desc", "pa-cat", "pa-precio", "pa-descuento", "pa-wa", "pa-fecha"].forEach(id => {
      $("#" + id)?.addEventListener("input", guardarBorradorProducto);
      $("#" + id)?.addEventListener("change", guardarBorradorProducto);
    });
  }
  function renderImgGrid() {
    const cont = $("#pa-img-grid");
    if (!cont) return;
    cont.innerHTML = imagenes.map((url, i) => `
      <div style="position:relative;width:64px;height:64px">
        <img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
        <button type="button" data-rm-img="${i}" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#c0392b;color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer">×</button>
      </div>`).join("") + (imagenes.length < 5 ? `
      <button type="button" id="pa-img-add" style="width:64px;height:64px;border:2px dashed #ccc;border-radius:8px;background:none;cursor:pointer;font-size:24px;color:#999;line-height:1">+</button>` : "");
    $("#pa-img-add")?.addEventListener("click", () => $("#pa-img-input")?.click());
    cont.querySelectorAll("[data-rm-img]").forEach(b => b.addEventListener("click", () => {
      imagenes.splice(+b.dataset.rmImg, 1);
      renderImgGrid();
      guardarBorradorProducto();
    }));
  }
  renderImgGrid();
  $("#pa-img-input")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `producto-${_tiendaAliadoId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
    if (upErr) { toast("Error subiendo la foto"); return; }
    imagenes.push(supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl);
    renderImgGrid();
    guardarBorradorProducto();
  });

  $("#pa-save")?.addEventListener("click", async () => {
    const btn = $("#pa-save");
    const nombre = $("#pa-nombre")?.value.trim();
    if (!nombre) { toast("El nombre es obligatorio"); return; }
    btn.disabled = true; btn.textContent = "Guardando…";
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
      imagenes,
      imagen_url: imagenes[0] || null,
      estado: "pendiente",
    };
    const { error } = id
      ? await supabase.from("productos_aliado").update(payload).eq("id", id)
      : await supabase.from("productos_aliado").insert(payload);
    if (error) { toast("Error: " + error.message); btn.disabled = false; btn.textContent = id ? "Guardar cambios" : "Agregar producto"; return; }
    if (esNuevoProducto) { try { localStorage.removeItem(BORRADOR_PRODUCTO_KEY); } catch {} }
    cerrarModalTienda();
    toast(id ? "Producto actualizado — vuelve a quedar en revisión" : "Producto agregado — queda en revisión");
    cargarMisProductos(_tiendaAliadoId);
  });
}

const ESTADO_PEDIDO = {
  pendiente:  { c: "#b45309", bg: "#fef3c7", t: "Pendiente de confirmar" },
  confirmado: { c: "#095544", bg: "#e8f5ee", t: "Confirmado" },
  entregado:  { c: "#095544", bg: "#e8f5ee", t: "Entregado" },
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
  const nPendientes = pedidos.filter(p => p.estado === "pendiente").length;
  const statVendidoEl = $("#tda-stat-vendido"); if (statVendidoEl) statVendidoEl.textContent = COP(vendido);
  const statPendEl = $("#tda-stat-pendientes"); if (statPendEl) statPendEl.textContent = nPendientes;

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
        </div>
        <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:${est.bg};color:${est.c};white-space:nowrap">${est.t}</span>
      </div>
      ${p.comprobante_url ? `<a href="${esc(p.comprobante_url)}" target="_blank" style="font-size:12px;color:#095544;display:inline-block;margin-top:6px">Ver comprobante ↗</a>` : ""}
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
  const barra = document.getElementById("ref-barra");
  const contador = document.getElementById("ref-contador");
  const msg = document.getElementById("ref-msg");
  const badge = document.getElementById("ref-badge");
  const copiarBtn = document.getElementById("ref-copiar");

  if (!barra) return;

  const base = "https://elclubdelagente.com/Registro.html";
  const link = `${base}?ref=${userId}`;

  copiarBtn?.addEventListener("click", () => {
    navigator.clipboard.writeText(link).then(() => {
      copiarBtn.innerHTML = "¡Copiado!";
      setTimeout(() => {
        copiarBtn.innerHTML = `<i data-lucide="link" style="width:14px;height:14px"></i> Copiar mi link`;
        if (window.lucide) lucide.createIcons();
      }, 2000);
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
    if (badge) badge.hidden = false;
  } else {
    const faltan = 5 - total;
    if (msg) msg.textContent = `Te falta${faltan === 1 ? "" : "n"} ${faltan} referido${faltan === 1 ? "" : "s"} activo${faltan === 1 ? "" : "s"}.`;
  }
}

/* ---------- Checklist de primeros pasos (Inicio) ---------- */
async function cargarOnboarding(userId, perfData) {
  const wrap = $("#onb-wrap");
  if (!wrap) return;
  if (localStorage.getItem("ecdlg_onb_cerrado_" + userId) === "1") return; // el miembro ya lo cerró

  const pasoPerfil = Object.keys(perfData?.respuestas_segmentacion || {}).length > 0;
  const whatsapp = (perfData?.whatsapp || "").replace(/\D/g, "");

  const [{ count: descCount }, { count: refCount }, convRes] = await Promise.all([
    supabase.from("descuentos").select("id", { count: "exact", head: true }).eq("miembro_id", userId),
    supabase.from("perfiles").select("id", { count: "exact", head: true }).eq("referido_por", userId),
    whatsapp
      ? supabase.from("conversaciones").select("id", { count: "exact", head: true }).eq("whatsapp", whatsapp).eq("rol", "user")
      : Promise.resolve({ count: 0 }),
  ]);

  const pasos = {
    perfil: pasoPerfil,
    clubcard: (descCount || 0) > 0,
    agente: (convRes?.count || 0) > 0,
    referidos: (refCount || 0) > 0,
  };

  const total = Object.keys(pasos).length;
  const hechos = Object.values(pasos).filter(Boolean).length;
  wrap.style.display = "";

  if (hechos === total) {
    $("#onb-card").hidden = true;
    $("#onb-done").hidden = false;
  } else {
    $("#onb-card").hidden = false;
    $("#onb-done").hidden = true;
    $$(".onb-item").forEach(btn => btn.classList.toggle("is-done", !!pasos[btn.dataset.step]));
    const RING_LEN = 113.1;
    const ringFg = $("#onb-ring-fg");
    if (ringFg) ringFg.style.strokeDashoffset = RING_LEN - (RING_LEN * hechos / total);
    const ringN = $("#onb-ring-n");
    if (ringN) ringN.textContent = hechos + "/" + total;
  }
  if (window.lucide) lucide.createIcons();

  const cerrar = () => {
    wrap.classList.add("is-hidden");
    localStorage.setItem("ecdlg_onb_cerrado_" + userId, "1");
  };
  $("#onb-close-card")?.addEventListener("click", cerrar);
  $("#onb-close-done")?.addEventListener("click", cerrar);
  $("#onb-item-referidos")?.addEventListener("click", () => {
    const card = $("#card-referidos");
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("onb-highlight");
    setTimeout(() => card.classList.remove("onb-highlight"), 1500);
  });
}

/* ---------- Aliados recomendados (personalizado con el perfil real) ---------- */
async function cargarAliadosRecomendados(perfData) {
  const card = $("#card-recomendados");
  const wrap = $("#aliados-recomendados");
  if (!card || !wrap) return;

  const { data: aliados, error } = await supabase
    .from("aliados")
    .select("id, nombre, categoria, descuento, whatsapp, imagen_url")
    .eq("activo", true);
  if (error || !aliados?.length) return;

  const intereses = perfData?.categorias_interes || [];
  const interesLower = intereses.map(i => (i || "").toLowerCase());
  const tieneInteres = (re) => interesLower.some(i => re.test(i));
  const mascotas = !!perfData?.tiene_mascotas;
  const hijos = !!perfData?.tiene_hijos;

  const FAMILIARES = ["Heladería", "Canasta familiar", "Regalos", "Fruver"];
  const SALUD = ["Bienestar y salud", "Odontología", "Barbería"];
  const COMIDA = ["Comida rápida", "Canasta familiar", "Heladería", "Fruver"];

  function puntaje(a) {
    const cat = a.categoria || "";
    let s = 0;
    if (intereses.includes(cat)) s += 3;
    if (mascotas && cat === "Veterinaria") s += 2;
    if (hijos && FAMILIARES.includes(cat)) s += 2;
    if (tieneInteres(/salud|bienestar/) && SALUD.includes(cat)) s += 1;
    if (tieneInteres(/turismo/) && cat === "Turismo") s += 1;
    if (tieneInteres(/comida/) && COMIDA.includes(cat)) s += 1;
    return s;
  }

  const top = aliados.map(a => ({ ...a, _s: puntaje(a) })).sort((x, y) => y._s - x._s).slice(0, 4);
  const personalizado = top.some(a => a._s > 0);

  const subEl = $("#recomendados-sub");
  if (subEl) subEl.textContent = personalizado
    ? "Elegidos según tus intereses y tu perfil."
    : "Aliados destacados para empezar a ahorrar.";

  const iconMap = { "Odontología": "smile", "Bienestar y salud": "heart-pulse", "Turismo": "mountain-snow",
    "Veterinaria": "paw-print", "Canasta familiar": "shopping-basket", "Ropa personalizada": "shirt",
    "Heladería": "ice-cream", "Comida rápida": "sandwich", "Barbería": "scissors" };
  const getIcon = (cat) => iconMap[cat] || "store";

  wrap.innerHTML = top.map(a => {
    const pctLen = (a.descuento || "").length;
    return `
    <a class="aliado-mini" href="Directorio.html?abrir=${a.id}">
      ${a.imagen_url
        ? `<img class="aliado-mini__ic" src="${esc(a.imagen_url)}" alt="" style="object-fit:cover">`
        : `<span class="aliado-mini__ic">${ic(getIcon(a.categoria))}</span>`}
      <span>
        <span class="aliado-mini__name">${esc(a.nombre)}</span><br>
        <span class="aliado-mini__cat">${esc(a.categoria || "")}</span>
      </span>
      <span class="aliado-mini__pct" style="max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${pctLen > 6 ? "font-size:14px" : ""}">${esc(a.descuento || "")}</span>
    </a>`;
  }).join("");

  card.hidden = false;
  if (window.lucide) lucide.createIcons();
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

// Código dinámico de verificación (reverso de la ClubCard): un aliado tiene
// que pedírselo al miembro para pasar la puerta de seguridad de
// Verificar.html -- el QR solo ya no alcanza para evitar suplantación.
let _ultimoCodigoVerifTs = 0;
async function generarCodigoVerificacion() {
  const ahora = Date.now();
  if (ahora - _ultimoCodigoVerifTs < 10000) return; // evita pedir uno nuevo en cada flip rápido
  _ultimoCodigoVerifTs = ahora;
  const { data, error } = await supabase.rpc("generar_codigo_verificacion");
  if (error || !data) return;
  const codigo = String(data);
  document.querySelectorAll(".cc-codigo-verif").forEach(el => el.textContent = `${codigo.slice(0, 2)} ${codigo.slice(2)}`);
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

  // Actualizar sidebar -- sin plan también cuenta como "no premium/vitalicia",
  // así que se muestra la invitación a elegir/pagar un plan.
  const elActivoB = document.getElementById("sb-plan-activo");
  const elUpgradeB = document.getElementById("sb-plan-upgrade");
  if (elActivoB) elActivoB.style.display = "none";
  if (elUpgradeB) {
    elUpgradeB.style.display = "block";
    const nombreElB = document.getElementById("sb-plan-upgrade-name");
    if (nombreElB) nombreElB.textContent = "Sin activar";
  }

  // Actualizar saludo
  const greetP = document.querySelector(".dash-greet p");
  if (greetP) greetP.textContent = "Activa tu membresía o invita 5 amigos para comenzar a disfrutar tus beneficios.";
}

/* ---------- TIENDA ---------- */
const COP = n => n != null ? '$' + Number(n).toLocaleString('es-CO') : '';
let _tiendaCargada = false;
let _miembroId = null;

/* ---------- Notificaciones (campana del topbar) ---------- */
async function cargarNotificacionesMiembro(userId) {
  const { data } = await supabase.from("notificaciones_miembro").select("*").eq("miembro_id", userId).order("created_at", { ascending: false }).limit(20);
  const lista = data || [];
  const noLeidas = lista.filter(n => !n.leida).length;
  const dot = document.getElementById("topbar-notif-dot");
  if (dot) { dot.hidden = noLeidas === 0; dot.textContent = noLeidas > 9 ? "9+" : String(noLeidas || ""); }
  const drop = document.getElementById("topbar-notif-drop");
  if (drop) {
    drop.innerHTML = `<div style="padding:14px 16px;border-bottom:1px solid #ebebeb;font-weight:700;font-size:13px">Notificaciones</div>` +
      (lista.length ? lista.map(n => `
        <div class="topbar-notif-item" style="padding:12px 16px;border-bottom:1px solid #f3f1ec;${n.leida ? "" : "background:#f7fbf8"}">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px">${esc(n.titulo)}</div>
          ${n.cuerpo ? `<div style="font-size:12.5px;color:#777;line-height:1.4">${esc(n.cuerpo)}</div>` : ""}
          <div style="font-size:11px;color:#999;margin-top:4px">${new Date(n.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
          ${n.titulo === "No pudimos confirmar tu pago" ? `<button type="button" data-reintentar-pago style="margin-top:8px;font-size:12px;font-weight:600;color:var(--verde);background:none;border:1px solid var(--verde);border-radius:8px;padding:6px 12px;cursor:pointer">Volver a subir comprobante</button>` : ""}
        </div>`).join("") : `<div style="padding:24px 16px;text-align:center;color:#999;font-size:13px">No tienes notificaciones todavía</div>`);
    drop.querySelectorAll("[data-reintentar-pago]").forEach(btn => btn.addEventListener("click", (e) => {
      e.stopPropagation();
      drop.style.display = "none";
      abrirReintentarComprobante();
    }));
  }
}

// Reintentar un comprobante rechazado -- trae la última solicitud rechazada
// de este miembro y deja subir uno nuevo, sin tener que escribir por
// WhatsApp ni volver a pasar por todo el registro.
async function abrirReintentarComprobante() {
  if (!_miembroId) return;
  const { data: sol } = await supabase.from("solicitudes_membresia")
    .select("id, plan, monto")
    .eq("miembro_id", _miembroId)
    .eq("estado", "rechazado")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sol) { toast("No encontramos una solicitud rechazada para reintentar."); return; }

  const { data: planRow } = await supabase.from("planes").select("tag, nombre").eq("slug", sol.plan).maybeSingle();
  const planLabel = planRow?.tag || planRow?.nombre || sol.plan;
  const { data: cfg } = await supabase.from("configuracion").select("valor").eq("clave", "club_llave_pago").maybeSingle();
  const llave = cfg?.valor || "No configurada — escríbenos por WhatsApp";

  abrirModalTienda(`Reintentar pago: ${planLabel}`, `
    <p style="font-size:14px;margin-bottom:16px">Vas a confirmar tu pago de <b>${COP(sol.monto)}</b> por tu membresía ${esc(planLabel)}.</p>
    <div class="cfg-campo">
      <label class="cfg-label">Llave de pago del Club</label>
      <div style="display:flex;gap:8px">
        <input class="cfg-input" id="rt-llave" readonly value="${esc(llave)}" style="flex:1">
        <button type="button" class="btn" id="rt-copiar-llave" style="padding:0 16px;white-space:nowrap">${ic('copy')} Copiar</button>
      </div>
      <div style="text-align:center;font-weight:800;letter-spacing:.02em;font-size:13px;color:#111;border:1px solid #ebebeb;border-radius:8px;padding:6px;margin-top:8px;background:#fff">Bre-B</div>
    </div>
    <div class="cfg-campo">
      <label class="cfg-label">Nuevo comprobante de pago *</label>
      <input type="file" id="rt-comprobante" accept="image/*">
    </div>
    <button class="btn btn--primario" id="rt-confirmar" style="margin-top:8px;width:100%">Enviar comprobante ${ic('check')}</button>
  `);

  $("#rt-copiar-llave")?.addEventListener("click", () => {
    const btn = $("#rt-copiar-llave");
    navigator.clipboard.writeText($("#rt-llave")?.value || "").then(() => {
      btn.innerHTML = `${ic('check')} Copiada`;
      setTimeout(() => { btn.innerHTML = `${ic('copy')} Copiar`; if (window.lucide) lucide.createIcons(); }, 2000);
      if (window.lucide) lucide.createIcons();
    });
  });

  $("#rt-confirmar")?.addEventListener("click", async () => {
    const btn = $("#rt-confirmar");
    const file = $("#rt-comprobante")?.files?.[0];
    if (!file) { toast("Sube el comprobante de pago"); return; }
    btn.disabled = true; btn.textContent = "Enviando…";
    const ext = file.name.split(".").pop();
    const path = `comprobante-membresia-${_miembroId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
    if (upErr) { toast("Error subiendo el comprobante"); btn.disabled = false; btn.textContent = "Enviar comprobante"; return; }
    const comprobante_url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;

    const { error } = await supabase.from("solicitudes_membresia").update({
      estado: "pendiente",
      comprobante_url,
      created_at: new Date().toISOString(),
    }).eq("id", sol.id);
    if (error) { toast("Error: " + error.message); btn.disabled = false; btn.textContent = "Enviar comprobante"; return; }

    cerrarModalTienda();
    toast("¡Comprobante enviado! Te avisamos apenas lo confirmemos.");

    supabase.from("configuracion").select("valor").eq("clave", "numero_admin_notificaciones").maybeSingle()
      .then(({ data }) => {
        if (!data?.valor) return;
        fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/whatsapp-send-3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: data.valor, body: `💳 Comprobante reenviado para la membresía ${planLabel} (${COP(sol.monto)}). Revísalo en Admin → Ventas.` }),
        }).catch(() => {});
      }).catch(() => {});
  });
}

document.getElementById("topbar-notif-btn")?.addEventListener("click", async (e) => {
  e.stopPropagation();
  const drop = document.getElementById("topbar-notif-drop");
  if (!drop) return;
  const abrir = drop.style.display === "none";
  drop.style.display = abrir ? "block" : "none";
  if (abrir && _miembroId) {
    await cargarNotificacionesMiembro(_miembroId);
    const { error } = await supabase.from("notificaciones_miembro").update({ leida: true }).eq("miembro_id", _miembroId).eq("leida", false);
    if (error) {
      // Si el UPDATE falla (ej. la política RLS de esta tabla no quedó bien
      // aplicada), el punto rojo debe seguir mostrándose -- en la base de
      // datos sigue en leida:false, así que ocultarlo aquí sería mentir.
      console.error("Error marcando notificaciones como leídas:", error);
      return;
    }
    const dot = document.getElementById("topbar-notif-dot");
    if (dot) dot.hidden = true;
  }
});
document.addEventListener("click", (e) => {
  const wrap = document.getElementById("topbar-notif-wrap");
  if (wrap && !wrap.contains(e.target)) { const drop = document.getElementById("topbar-notif-drop"); if (drop) drop.style.display = "none"; }
});

/* ---------- Educación (talleres presenciales, gratis para todos) ---------- */
let _educacionCargada = false;

// Programas sociales que apoya el Club -- mismo contenido informativo que la
// sección pública "Programas" de la landing (aún no hay tabla en Supabase
// para esto, así que por ahora es contenido fijo, igual que allá).
const PROGRAMAS_SOCIALES = [
  {
    nombre: "Patas que Rescatan",
    icon: "paw-print",
    descBreve: "Rescate, atención y adopción de animales en condición de calle en Fusagasugá y la región del Sumapaz.",
    descCompleta: "Con cada membresía financiamos jornadas de rescate, esterilización y adopción responsable. El programa conecta refugios locales con familias que quieren darle un hogar a un animal y cubre atención veterinaria de urgencia.",
    fundaciones: ["Fundación Huellas Fusa", "Refugio Sumapaz", "Red de Hogares de Paso"],
  },
  {
    nombre: "Mesa Compartida",
    icon: "utensils-crossed",
    descBreve: "Entrega de mercados y apoyo alimentario a familias vulnerables de la región.",
    descCompleta: "Un porcentaje de cada membresía se transforma en mercados para familias que más lo necesitan. Trabajamos con el banco de alimentos local para llegar a las veredas y barrios con mayor necesidad.",
    fundaciones: ["Banco de Alimentos Fusa", "Parroquia Nuestra Señora", "Juntas de Acción Comunal"],
  },
  {
    nombre: "Aprende y Crece",
    icon: "graduation-cap",
    descBreve: "Talleres gratuitos de educación financiera y emprendimiento para miembros y comunidad.",
    descCompleta: "Creemos que ahorrar también es aprender. Ofrecemos talleres de finanzas personales, ahorro y emprendimiento dictados por aliados profesionales del Club, abiertos a toda la comunidad.",
    fundaciones: ["Cámara de Comercio Fusagasugá", "SENA Regional", "Aliados profesionales del Club"],
  },
  {
    nombre: "Manos a la Obra",
    icon: "hammer",
    descBreve: "Mejoramiento de vivienda y espacios comunitarios con voluntarios del Club.",
    descCompleta: "Jornadas de pintura, arreglo y adecuación de hogares y espacios comunes para familias de escasos recursos. La fuerza del Club puesta al servicio de quienes más lo necesitan.",
    fundaciones: ["Techo Colombia", "Voluntariado El Club de la Gente", "Alcaldía de Fusagasugá"],
  },
];
let _programasCargados = false;
function cargarProgramas() {
  if (_programasCargados) return;
  _programasCargados = true;
  const grid = document.getElementById("programas-grid-dash");
  if (!grid) return;
  grid.innerHTML = PROGRAMAS_SOCIALES.map((p, i) => `
    <div style="border:1px solid #ebebeb;border-radius:12px;padding:20px;background:#fff">
      <span style="display:inline-flex;width:38px;height:38px;border-radius:50%;background:var(--verde-soft);color:var(--verde);align-items:center;justify-content:center;margin-bottom:12px">${ic(p.icon)}</span>
      <div style="font-weight:700;font-size:15px;margin-bottom:6px">${esc(p.nombre)}</div>
      <p style="font-size:13px;color:#666;line-height:1.5;margin-bottom:14px">${esc(p.descBreve)}</p>
      <button type="button" class="btn btn--secundario" data-ver-programa="${i}" style="font-size:12.5px">Ver más y postularme como voluntario &rarr;</button>
    </div>`).join("");
  if (window.lucide) lucide.createIcons();
  grid.querySelectorAll("[data-ver-programa]").forEach(btn => btn.addEventListener("click", () => {
    const p = PROGRAMAS_SOCIALES[+btn.dataset.verPrograma];
    if (!p) return;
    abrirModalTienda(p.nombre, `
      <p style="font-size:14px;line-height:1.6;margin-bottom:16px">${esc(p.descCompleta)}</p>
      <div style="font-size:12.5px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Fundaciones y organizaciones apoyadas</div>
      <ul style="font-size:13px;color:#555;line-height:1.9;margin-bottom:20px;padding-left:18px">
        ${p.fundaciones.map(f => `<li>${esc(f)}</li>`).join("")}
      </ul>
      <div style="font-size:12.5px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Quiero ser voluntario</div>
      <form id="form-voluntario">
        <div class="cfg-campo"><label class="cfg-label">Motivo de participación</label><textarea class="cfg-input" id="vol-motivo" rows="3" required placeholder="Cuéntanos por qué te gustaría participar"></textarea></div>
        <button type="submit" class="btn btn--primario" style="margin-top:6px">Quiero ser voluntario <i data-lucide="heart-handshake" style="width:15px;height:15px"></i></button>
      </form>
    `);
    if (window.lucide) lucide.createIcons();
    document.getElementById("form-voluntario")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn2 = e.target.querySelector("button[type=submit]");
      const u = leerPerfil();
      const motivo = document.getElementById("vol-motivo")?.value.trim() || "";
      supabase.from("configuracion").select("valor").eq("clave", "numero_admin_notificaciones").maybeSingle()
        .then(({ data }) => {
          if (!data?.valor) return;
          fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: data.valor, body: `🙋 Postulación de voluntariado\n\nPrograma: ${p.nombre}\nMiembro: ${u.nombre || "—"}\nMotivo: ${motivo}` }),
          }).catch(() => {});
        }).catch(() => {});
      btn2.disabled = true;
      btn2.innerHTML = `${ic("check")} Enviado — te contactamos por WhatsApp`;
      if (window.lucide) lucide.createIcons();
    });
  }));
}
function estrellasHtml(valor, size) {
  const redondeado = Math.round(valor || 0);
  return `<span style="display:inline-flex;gap:1px">${[1, 2, 3, 4, 5].map(n => `<i data-lucide="star" style="width:${size}px;height:${size}px;${n <= redondeado ? 'color:#EAB749;fill:#EAB749' : 'color:#ccc;fill:none'}"></i>`).join('')}</span>`;
}
function resumenResenas(resenas) {
  if (!resenas.length) return { promedio: 0, texto: 'Sin reseñas aún' };
  const promedio = resenas.reduce((s, r) => s + r.estrellas, 0) / resenas.length;
  return { promedio, texto: `${promedio.toFixed(1)} (${resenas.length})` };
}
function listaResenasHtml(resenas, eventoId, miembroId) {
  const yaReseno = resenas.some(r => r.miembro_id === miembroId);
  const lista = resenas.length
    ? resenas.map(r => `
      <div style="padding:10px 0;border-bottom:1px solid #f5f5f5">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">
          <span style="font-size:12.5px;font-weight:600;color:#333">${esc((r.perfiles?.nombre || 'Miembro').split(' ')[0])}</span>
          ${estrellasHtml(r.estrellas, 12)}
        </div>
        ${r.comentario ? `<p style="font-size:12.5px;color:#666;line-height:1.5;margin:0">${esc(r.comentario)}</p>` : ''}
      </div>`).join('')
    : `<p style="font-size:12.5px;color:#999;padding:4px 0 12px">Sé el primero en dejar una reseña de este taller.</p>`;

  const form = yaReseno
    ? `<div style="font-size:12.5px;color:var(--verde);font-weight:600;padding-top:10px">✓ Ya dejaste tu reseña de este taller</div>`
    : `<div style="border-top:1px solid #f0f0f0;padding-top:12px;margin-top:4px">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:8px;color:#444">Deja tu reseña</div>
        <div data-resena-stars="${eventoId}" data-selected="0" style="display:flex;gap:4px;margin-bottom:8px">
          ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-estrella="${n}" style="background:none;border:none;cursor:pointer;padding:2px"><i data-lucide="star" style="width:22px;height:22px;color:#ccc;fill:none"></i></button>`).join('')}
        </div>
        <textarea data-resena-texto="${eventoId}" rows="2" placeholder="Cuéntanos qué te pareció (opcional)" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px;font-size:13px;font-family:inherit;resize:vertical;box-sizing:border-box"></textarea>
        <button data-enviar-resena="${eventoId}" class="btn btn--primario" style="font-size:12.5px;padding:8px 14px;margin-top:8px">Enviar reseña</button>
      </div>`;

  return lista + form;
}
async function cargarEducacion() {
  if (_educacionCargada) return;
  _educacionCargada = true;

  const grid = document.getElementById('educacion-grid');
  if (!grid) return;

  const { data: eventos } = await supabase
    .from('eventos_educacion')
    .select('*, facilitadores_educacion(nombre, foto_url), categorias_educacion(nombre)')
    .eq('activo', true)
    .order('fecha', { ascending: false });

  const lista = eventos || [];
  if (!lista.length) {
    grid.innerHTML = `
      <div style="text-align:center;padding:48px 20px;grid-column:1/-1">
        <span style="display:inline-flex;width:38px;height:38px;border-radius:50%;background:var(--verde-soft);color:var(--verde);align-items:center;justify-content:center;margin-bottom:14px">${ic("graduation-cap")}</span>
        <p style="font-size:13px;color:var(--tinta-45,#888);max-width:320px;margin:0 auto;line-height:1.5">Todavía no hay talleres publicados. En cuanto programemos uno, lo verás aquí y te avisamos por WhatsApp.</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const filtrosCont = document.getElementById('educacion-filtros');
  if (filtrosCont) {
    const categoriasEnUso = new Map();
    lista.forEach(e => { if (e.categoria_id && e.categorias_educacion?.nombre) categoriasEnUso.set(e.categoria_id, e.categorias_educacion.nombre); });
    if (!categoriasEnUso.size) {
      filtrosCont.innerHTML = '';
    } else {
      const chip = (id, nombre, activo) => `<button type="button" data-filtro-categ="${id}" style="font-size:12.5px;font-weight:600;padding:6px 14px;border-radius:20px;border:1px solid ${activo ? 'var(--verde)' : '#ddd'};background:${activo ? 'var(--verde)' : '#fff'};color:${activo ? '#fff' : '#555'};cursor:pointer">${esc(nombre)}</button>`;
      filtrosCont.innerHTML = chip('', 'Todas', true) + [...categoriasEnUso.entries()].map(([id, nombre]) => chip(id, nombre, false)).join('');
      filtrosCont.querySelectorAll('[data-filtro-categ]').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.dataset.filtroCateg;
        filtrosCont.querySelectorAll('[data-filtro-categ]').forEach(b => {
          const activo = b === btn;
          b.style.borderColor = activo ? 'var(--verde)' : '#ddd';
          b.style.background = activo ? 'var(--verde)' : '#fff';
          b.style.color = activo ? '#fff' : '#555';
        });
        grid.querySelectorAll('[data-categoria-id]').forEach(card => {
          card.style.display = (!id || card.dataset.categoriaId === id) ? '' : 'none';
        });
      }));
    }
  }

  const { data: resenasRaw } = await supabase
    .from('resenas_evento')
    .select('id, evento_id, estrellas, comentario, miembro_id, perfiles(nombre)')
    .in('evento_id', lista.map(e => e.id))
    .order('created_at', { ascending: false });

  const resenasPorEvento = new Map();
  (resenasRaw || []).forEach(r => {
    if (!resenasPorEvento.has(r.evento_id)) resenasPorEvento.set(r.evento_id, []);
    resenasPorEvento.get(r.evento_id).push(r);
  });

  const hoy = new Date().toISOString().slice(0, 10);
  grid.innerHTML = lista.map(e => {
    const esProximo = e.fecha >= hoy;
    const fechaFmt = new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    const resenasEvento = resenasPorEvento.get(e.id) || [];
    const { promedio, texto } = resumenResenas(resenasEvento);
    return `
    <div data-categoria-id="${e.categoria_id || ''}" style="border:1px solid #ebebeb;border-radius:12px;overflow:hidden;background:#fff">
      ${e.imagen_url ? `<img src="${esc(e.imagen_url)}" alt="${esc(e.titulo)}" data-ampliar-flyer="${esc(e.imagen_url)}" style="width:100%;height:150px;object-fit:cover;cursor:zoom-in">` : ''}
      <div style="padding:16px">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
          <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:${esProximo ? 'var(--verde-soft)' : '#EAF3EF'};color:${esProximo ? 'var(--verde)' : '#888'}">${esProximo ? 'Próximo' : 'Pasado'} · ${fechaFmt}</span>
          ${e.categorias_educacion?.nombre ? `<span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:#EEF0FD;color:#5B6EE1">${esc(e.categorias_educacion.nombre)}</span>` : ''}
        </div>
        <div style="font-weight:700;font-size:15px;margin:0 0 4px">${esc(e.titulo)}</div>
        ${e.descripcion ? `<p style="font-size:13px;color:#666;line-height:1.5;margin-bottom:10px">${esc(e.descripcion)}</p>` : ''}
        ${e.facilitadores_educacion?.nombre ? `<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:#777;margin-bottom:12px">
          ${e.facilitadores_educacion.foto_url ? `<img src="${esc(e.facilitadores_educacion.foto_url)}" style="width:22px;height:22px;border-radius:50%;object-fit:cover">` : ''}
          Dictado por ${esc(e.facilitadores_educacion.nombre)}
        </div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${e.pdf_url ? `<a href="${esc(e.pdf_url)}" target="_blank" class="btn" style="font-size:12.5px;padding:8px 12px">${ic('download')} Descargar PDF</a>` : ''}
          ${e.link_grabacion ? `<a href="${esc(e.link_grabacion)}" target="_blank" class="btn" style="font-size:12.5px;padding:8px 12px">${ic('play')} Ver clase grabada</a>` : ''}
          ${esProximo ? `<button class="btn btn--primario" data-confirmar-evento="${e.id}" style="font-size:12.5px;padding:8px 12px">Confirmar asistencia</button>` : ''}
        </div>
        <div data-confirmado-msg="${e.id}" style="display:none;font-size:12.5px;color:var(--verde);font-weight:600;margin-top:8px">✓ Ya confirmaste tu asistencia</div>

        <button type="button" data-toggle-detalle="${e.id}" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;background:none;border:none;border-top:1px solid #f0f0f0;margin-top:12px;padding:12px 0 0;cursor:pointer;text-align:left">
          <span data-resumen-resenas="${e.id}" style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:#666">${estrellasHtml(promedio, 13)}<span>${texto}</span></span>
          <i data-lucide="chevron-down" data-chevron-ico style="width:16px;height:16px;color:#999;transition:transform .2s;flex-shrink:0"></i>
        </button>
        <div data-detalle-evento="${e.id}" style="display:none;margin-top:4px">
          ${listaResenasHtml(resenasEvento, e.id, _miembroId)}
        </div>
      </div>
    </div>`;
  }).join('');

  if (window.lucide) lucide.createIcons();

  grid.querySelectorAll('[data-confirmar-evento]').forEach(btn => btn.addEventListener('click', async () => {
    const eventoId = btn.dataset.confirmarEvento;
    btn.disabled = true; btn.textContent = 'Confirmando…';
    const { error } = await supabase.from('confirmaciones_evento').insert({ evento_id: eventoId, miembro_id: _miembroId });
    if (error && error.code !== '23505') {
      toast('Error: ' + error.message);
      btn.disabled = false; btn.textContent = 'Confirmar asistencia';
      return;
    }
    btn.style.display = 'none';
    const msg = grid.querySelector(`[data-confirmado-msg="${eventoId}"]`);
    if (msg) msg.style.display = 'block';
  }));

  grid.querySelectorAll('[data-ampliar-flyer]').forEach(img => img.addEventListener('click', () => {
    abrirLightbox(img.dataset.ampliarFlyer);
  }));

  async function refrescarDetalleEvento(eventoId) {
    const { data } = await supabase
      .from('resenas_evento')
      .select('id, evento_id, estrellas, comentario, miembro_id, perfiles(nombre)')
      .eq('evento_id', eventoId)
      .order('created_at', { ascending: false });
    const resenasEvento = data || [];
    const det = grid.querySelector(`[data-detalle-evento="${eventoId}"]`);
    if (det) det.innerHTML = listaResenasHtml(resenasEvento, eventoId, _miembroId);
    const resumen = grid.querySelector(`[data-resumen-resenas="${eventoId}"]`);
    if (resumen) {
      const { promedio, texto } = resumenResenas(resenasEvento);
      resumen.innerHTML = `${estrellasHtml(promedio, 13)}<span>${texto}</span>`;
    }
    if (window.lucide) lucide.createIcons();
  }

  grid.addEventListener('click', e => {
    const toggleBtn = e.target.closest('[data-toggle-detalle]');
    if (toggleBtn) {
      const det = grid.querySelector(`[data-detalle-evento="${toggleBtn.dataset.toggleDetalle}"]`);
      const chevron = toggleBtn.querySelector('[data-chevron-ico]');
      if (det) {
        const abierto = det.style.display !== 'none';
        det.style.display = abierto ? 'none' : 'block';
        if (chevron) chevron.style.transform = abierto ? '' : 'rotate(180deg)';
      }
      return;
    }
    const starBtn = e.target.closest('[data-estrella]');
    if (starBtn) {
      const cont = starBtn.closest('[data-resena-stars]');
      const n = +starBtn.dataset.estrella;
      cont.dataset.selected = n;
      [...cont.querySelectorAll('[data-estrella]')].forEach((b, idx) => {
        const icono = b.querySelector('svg, i');
        if (!icono) return;
        icono.style.color = idx < n ? '#EAB749' : '#ccc';
        icono.style.fill = idx < n ? '#EAB749' : 'none';
      });
      return;
    }
    const enviarBtn = e.target.closest('[data-enviar-resena]');
    if (enviarBtn) {
      const eventoId = enviarBtn.dataset.enviarResena;
      const starsCont = grid.querySelector(`[data-resena-stars="${eventoId}"]`);
      const estrellas = +(starsCont?.dataset.selected || 0);
      if (!estrellas) { toast('Selecciona cuántas estrellas le das al taller'); return; }
      const comentario = grid.querySelector(`[data-resena-texto="${eventoId}"]`)?.value.trim() || null;
      enviarBtn.disabled = true; enviarBtn.textContent = 'Enviando…';
      supabase.from('resenas_evento').insert({ evento_id: eventoId, miembro_id: _miembroId, estrellas, comentario })
        .then(({ error }) => {
          if (error) {
            toast(error.code === '23505' ? 'Ya habías dejado una reseña de este taller' : 'Error: ' + error.message);
            enviarBtn.disabled = false; enviarBtn.textContent = 'Enviar reseña';
            return;
          }
          toast('¡Gracias por tu reseña! ✓');
          refrescarDetalleEvento(eventoId);
        });
      return;
    }
  });
}
window.cargarEducacion = cargarEducacion;

// Modal simple para ver una imagen en grande (ej. el flyer de un taller).
function abrirLightbox(url) {
  let lb = document.getElementById('img-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'img-lightbox';
    lb.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.85);display:none;align-items:center;justify-content:center;padding:24px;cursor:zoom-out';
    lb.innerHTML = `<img id="img-lightbox-img" style="max-width:100%;max-height:100%;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5)">`;
    lb.addEventListener('click', () => { lb.style.display = 'none'; });
    document.body.appendChild(lb);
  }
  document.getElementById('img-lightbox-img').src = url;
  lb.style.display = 'flex';
}

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
    grid.innerHTML = `
      <div style="text-align:center;padding:48px 20px;grid-column:1/-1">
        <span style="display:inline-flex;width:38px;height:38px;border-radius:50%;background:var(--verde-soft);color:var(--verde);align-items:center;justify-content:center;margin-bottom:14px">${ic("package")}</span>
        <p style="font-size:13px;color:var(--tinta-45,#888);max-width:320px;margin:0 auto 12px;line-height:1.5">Aún no hay productos propios del Club disponibles. Mientras tanto, explora los descuentos de nuestros aliados.</p>
        <a href="Directorio.html" style="font-size:12.5px;font-weight:700;color:var(--verde);text-decoration:none">Ver aliados del Club →</a>
      </div>`;
    if (window.lucide) lucide.createIcons();
    cargarTiendaAliados();
    cargarMisPedidosClub();
    return;
  }

  let catActiva = 'todos';
  function renderGrid() {
    const filtrados = catActiva === 'todos' ? prods : prods.filter(p => p.categoria_id === catActiva);
    grid.innerHTML = filtrados.map(p => {
      const precioNormal = p.precio_normal != null ? COP(p.precio_normal) : '';
      const precioDesc   = p.precio_descuento != null ? COP(p.precio_descuento) : '';
      const imgSrc = (p.imagenes && p.imagenes[0]) || p.imagen_url;
      const descuentoPct = (p.precio_normal && p.precio_descuento && p.precio_normal > p.precio_descuento)
        ? Math.round((1 - p.precio_descuento / p.precio_normal) * 100) : null;
      return `<div class="tienda-card" data-ver-prod-club="${p.id}">
        <div class="tienda-card__img-wrap">
          ${imgSrc ? `<img src="${imgSrc}" class="tienda-card__img" alt="${esc(p.nombre)}">` : `<div class="tienda-card__img tienda-card__img--ph"></div>`}
          ${descuentoPct ? `<span class="tienda-card__badge">-${descuentoPct}%</span>` : ''}
        </div>
        <div class="tienda-card__body">
          ${p.categorias_productos?.nombre ? `<span class="tienda-card__cat">${esc(p.categorias_productos.nombre)}</span>` : ''}
          <div class="tienda-card__nombre">${esc(p.nombre)}</div>
          <div class="tienda-card__precios">
            <div class="tienda-card__precios-txt">
              ${precioNormal ? `<span class="tienda-card__antes">${precioNormal}</span>` : ''}
              <span class="tienda-card__precio">${precioDesc || precioNormal}</span>
            </div>
            <button class="tienda-card__cart" data-comprar-club="${p.id}" type="button">Comprar</button>
          </div>
        </div>
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-ver-prod-club]').forEach(card => card.addEventListener('click', (e) => {
      if (e.target.closest('[data-comprar-club]')) return;
      const p = prods.find(x => x.id === card.dataset.verProdClub);
      if (p) abrirDetalleProductoClub(p);
    }));
    grid.querySelectorAll('[data-comprar-club]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
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
  entregado:        { c: "#095544", bg: "#e8f5ee", t: "Entregado" },
  cancelado:        { c: "#c0392b", bg: "#fdecea", t: "Cancelado" },
};

/* ---------- Tienda del Club (checkout con pago manual Bre-B + seguimiento de pedido) ---------- */
function abrirDetalleProductoClub(p) {
  const precio = p.precio_descuento ?? p.precio_normal ?? 0;
  const imgs = (p.imagenes && p.imagenes.length) ? p.imagenes : (p.imagen_url ? [p.imagen_url] : []);
  abrirModalTienda(p.nombre, `
    <div class="tprod-galeria">
      <div class="tprod-galeria__main" id="tpg-main">
        ${imgs[0] ? `<img src="${esc(imgs[0])}" alt="${esc(p.nombre)}">` : ''}
      </div>
      ${imgs.length > 1 ? `<div class="tprod-galeria__thumbs">
        ${imgs.map((url, i) => `<div class="tprod-galeria__thumb${i === 0 ? ' is-on' : ''}" data-tpg-thumb="${i}"><img src="${esc(url)}" alt=""></div>`).join('')}
      </div>` : ''}
    </div>
    ${p.categorias_productos?.nombre ? `<span class="tienda-card__cat" style="display:block;margin-top:16px">${esc(p.categorias_productos.nombre)}</span>` : ''}
    <p style="font-size:14px;line-height:1.6;color:#444;margin:8px 0 16px">${p.descripcion ? esc(p.descripcion) : 'Sin descripción adicional.'}</p>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      ${p.precio_normal && p.precio_descuento && p.precio_normal > p.precio_descuento ? `<span style="font-size:14px;color:#999;text-decoration:line-through">${COP(p.precio_normal)}</span>` : ''}
      <span style="font-size:24px;font-weight:800;color:var(--verde)">${COP(precio)}</span>
    </div>
    <button class="btn btn--primario" id="tpg-comprar" style="width:100%">Comprar</button>
  `);
  if (imgs.length > 1) {
    document.querySelectorAll('[data-tpg-thumb]').forEach(t => t.addEventListener('click', () => {
      const i = +t.dataset.tpgThumb;
      const main = document.getElementById('tpg-main');
      if (main) main.innerHTML = `<img src="${esc(imgs[i])}" alt="${esc(p.nombre)}">`;
      document.querySelectorAll('[data-tpg-thumb]').forEach(x => x.classList.toggle('is-on', x === t));
    }));
  }
  document.getElementById('tpg-comprar')?.addEventListener('click', () => abrirCheckoutClub(p));
}

async function abrirCheckoutClub(p) {
  const precio = p.precio_descuento ?? p.precio_normal ?? 0;
  const { data: cfgLlave } = await supabase.from("configuracion").select("valor").eq("clave", "club_llave_pago").maybeSingle();
  const llave = cfgLlave?.valor || "";
  abrirModalTienda(`Comprar: ${esc(p.nombre)}`, `
    <p style="font-size:14px;margin-bottom:16px">Vas a pagar <b>${COP(precio)}</b>. El Club se encarga de pedirlo al proveedor y hacerte llegar el envío — verás el estado en "Mis pedidos".</p>
    <div class="cfg-campo"><label class="cfg-label">Nombre de quien recibe</label><input class="cfg-input" id="pcc-nombre" type="text"></div>
    <div class="cfg-campo"><label class="cfg-label">Dirección</label><input class="cfg-input" id="pcc-direccion" type="text"></div>
    <div class="cfg-campo"><label class="cfg-label">Barrio (opcional)</label><input class="cfg-input" id="pcc-barrio" type="text"></div>
    <div class="cfg-campo"><label class="cfg-label">Teléfono de contacto</label><input class="cfg-input" id="pcc-telefono" type="tel"></div>
    <div class="cfg-campo">
      <label class="cfg-label">Llave de pago del Club</label>
      <div style="display:flex;gap:8px">
        <input class="cfg-input" id="pcc-llave" readonly value="${esc(llave) || 'No registrada — escríbenos por WhatsApp'}" style="flex:1">
        ${llave ? `<button type="button" class="btn" id="pcc-copiar-llave" style="padding:0 16px;white-space:nowrap">${ic('copy')} Copiar</button>` : ''}
      </div>
      <span style="font-size:12px;color:#777;display:block;margin-top:4px">Transfiere ${COP(precio)} a esa llave antes de continuar.</span>
      <div style="text-align:center;font-weight:800;letter-spacing:.02em;font-size:13px;color:#111;border:1px solid #ebebeb;border-radius:8px;padding:6px;margin-top:8px;background:#fff">Bre-B</div>
    </div>
    <div class="cfg-campo">
      <label class="cfg-label">Comprobante de pago *</label>
      <input type="file" id="pcc-comprobante" accept="image/*">
    </div>
    <button class="btn btn--primario" id="pcc-pagar" style="margin-top:8px;width:100%">Confirmar pedido</button>
  `);
  $("#pcc-copiar-llave")?.addEventListener("click", () => {
    const btn = $("#pcc-copiar-llave");
    navigator.clipboard.writeText($("#pcc-llave")?.value || "").then(() => {
      btn.innerHTML = `${ic('check')} Copiada`;
      setTimeout(() => { btn.innerHTML = `${ic('copy')} Copiar`; if (window.lucide) lucide.createIcons(); }, 2000);
      if (window.lucide) lucide.createIcons();
    });
  });
  $("#pcc-pagar")?.addEventListener("click", async () => {
    const btn = $("#pcc-pagar");
    const nombre = $("#pcc-nombre")?.value.trim();
    const direccion = $("#pcc-direccion")?.value.trim();
    const barrio = $("#pcc-barrio")?.value.trim();
    const telefono = $("#pcc-telefono")?.value.trim();
    const file = $("#pcc-comprobante")?.files?.[0];
    if (!nombre || !direccion || !telefono) { toast("Completa nombre, dirección y teléfono"); return; }
    if (!file) { toast("Sube el comprobante de pago"); return; }
    if (!precio) { toast("Este producto no tiene un precio válido"); return; }
    btn.disabled = true; btn.textContent = "Enviando…";

    const { data: { session } } = await supabase.auth.getSession();
    const miembroId = session?.user?.id;
    if (!miembroId) { toast("Debes iniciar sesión"); btn.disabled = false; return; }

    const ext = file.name.split(".").pop();
    const path = `comprobante-club-${miembroId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
    if (upErr) { toast("Error subiendo el comprobante"); btn.disabled = false; btn.textContent = "Confirmar pedido"; return; }
    const comprobante_url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;

    const { error } = await supabase.from("pedidos_club").insert({
      producto_id: p.id, miembro_id: miembroId, nombre_producto: p.nombre, monto: precio,
      // Se guarda el precio normal y el ahorro tal como están AHORA, no se
      // recalculan después uniendo con "productos" -- si el producto cambia
      // de precio o se borra, el ahorro de este pedido no debe cambiar.
      precio_normal: p.precio_normal ?? null,
      ahorro: Math.max(0, (p.precio_normal ?? precio) - precio),
      envio_nombre: nombre, envio_direccion: direccion, envio_barrio: barrio || null, envio_telefono: telefono,
      comprobante_url,
      estado: "pendiente_pago",
    });
    if (error) { toast("Error: " + error.message); btn.disabled = false; btn.textContent = "Confirmar pedido"; return; }

    cerrarModalTienda();
    toast("Pedido enviado — te avisamos por WhatsApp en cuanto confirmemos tu pago");
    setTimeout(cargarMisPedidosClub, 800);

    supabase.from("configuracion").select("valor").eq("clave", "numero_admin_notificaciones").maybeSingle()
      .then(({ data }) => {
        if (!data?.valor) return;
        fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/whatsapp-send-3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: data.valor, body: `🛍️ Nuevo pedido de la Tienda del Club con comprobante pendiente\n\nProducto: ${p.nombre}\nMonto: ${COP(precio)}\n\nRevísalo en Admin → Ventas o Tienda del Club.` }),
        }).catch(() => {});
      }).catch(() => {});
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
  const { data: prods } = await supabase.from('productos_aliado')
    .select('*, categorias_productos(nombre), aliados(nombre, tienda_nombre, whatsapp, maps_url, tienda_llave_pago, instagram, facebook, tiktok)')
    .eq('estado', 'aprobado').eq('activo', true)
    .or(`fecha_fin.is.null,fecha_fin.gte.${hoy}`)
    .order('created_at', { ascending: false });

  const productos = prods || [];
  if (!productos.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  grid.innerHTML = productos.map(p => {
    const precioNormal = p.precio_normal != null ? COP(p.precio_normal) : '';
    const precioDesc   = p.precio_descuento != null ? COP(p.precio_descuento) : '';
    const imgSrc = (p.imagenes && p.imagenes[0]) || p.imagen_url;
    return `<div class="tienda-card" data-ver-prodal="${p.id}">
      ${imgSrc ? `<img src="${imgSrc}" class="tienda-card__img" alt="${esc(p.nombre)}">` : `<div class="tienda-card__img tienda-card__img--ph"></div>`}
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

  grid.querySelectorAll('[data-ver-prodal]').forEach(card => card.addEventListener('click', (e) => {
    if (e.target.closest('[data-comprar-prodal]')) return;
    const p = productos.find(x => x.id === card.dataset.verProdal);
    if (p) abrirDetalleProductoAliado(p);
  }));
  grid.querySelectorAll('[data-comprar-prodal]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = productos.find(x => x.id === btn.dataset.comprarProdal);
    if (p) abrirCheckoutProducto(p);
  }));
}

function abrirDetalleProductoAliado(p) {
  const imgs = (p.imagenes && p.imagenes.length) ? p.imagenes : (p.imagen_url ? [p.imagen_url] : []);
  const precioNormal = p.precio_normal != null ? COP(p.precio_normal) : '';
  const precioDesc = p.precio_descuento != null ? COP(p.precio_descuento) : '';
  abrirModalTienda(p.nombre, `
    <div class="tprod-galeria">
      <div class="tprod-galeria__main" id="tpg2-main">
        ${imgs[0] ? `<img src="${esc(imgs[0])}" alt="${esc(p.nombre)}">` : ''}
      </div>
      ${imgs.length > 1 ? `<div class="tprod-galeria__thumbs">
        ${imgs.map((url, i) => `<div class="tprod-galeria__thumb${i === 0 ? ' is-on' : ''}" data-tpg2-thumb="${i}"><img src="${esc(url)}" alt=""></div>`).join('')}
      </div>` : ''}
    </div>
    <div style="font-size:13px;color:var(--tinta-60);margin:14px 0 4px">${esc(p.aliados?.tienda_nombre || p.aliados?.nombre)}</div>
    ${p.categorias_productos?.nombre ? `<span class="tienda-card__cat">${esc(p.categorias_productos.nombre)}</span>` : ''}
    <p style="font-size:14px;line-height:1.6;color:#444;margin:8px 0 16px">${p.descripcion ? esc(p.descripcion) : 'Sin descripción adicional.'}</p>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      ${precioNormal ? `<span style="font-size:14px;color:#999;text-decoration:line-through">${precioNormal}</span>` : ''}
      ${precioDesc ? `<span style="font-size:24px;font-weight:800;color:var(--verde)">${precioDesc}</span>` : ''}
    </div>
    <button class="btn btn--primario" id="tpg2-comprar" style="width:100%">Comprar</button>
  `);
  if (imgs.length > 1) {
    document.querySelectorAll('[data-tpg2-thumb]').forEach(t => t.addEventListener('click', () => {
      const i = +t.dataset.tpg2Thumb;
      const main = document.getElementById('tpg2-main');
      if (main) main.innerHTML = `<img src="${esc(imgs[i])}" alt="${esc(p.nombre)}">`;
      document.querySelectorAll('[data-tpg2-thumb]').forEach(x => x.classList.toggle('is-on', x === t));
    }));
  }
  document.getElementById('tpg2-comprar')?.addEventListener('click', () => abrirCheckoutProducto(p));
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
      <p style="font-size:12px;color:#095544;font-weight:600;margin:-4px 0 12px">✓ El envío es completamente gratis</p>
      <div class="cfg-campo"><label class="cfg-label">Nombre de quien recibe</label><input class="cfg-input" id="pc-nombre" type="text"></div>
      <div class="cfg-campo"><label class="cfg-label">Dirección</label><input class="cfg-input" id="pc-direccion" type="text"></div>
      <div class="cfg-campo"><label class="cfg-label">Teléfono de contacto</label><input class="cfg-input" id="pc-telefono" type="tel"></div>
    </div>
    <div id="pc-recoger-campos" style="display:none">
      ${/^https?:\/\//i.test(p.aliados?.maps_url || '') ? `<a href="${esc(p.aliados.maps_url)}" target="_blank" rel="noopener" style="font-size:13px;color:#095544">Ver ubicación en Google Maps ↗</a>` : `<p style="font-size:13px;color:#777">El negocio no registró una ubicación.</p>`}
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
    $("#pc-cerrar-exito")?.addEventListener("click", () => cerrarModalTienda());
  });
}

/* ---------- PROFESIONALES DEL CLUB (exclusivo Premium/Vitalicia) ---------- */
async function cargarProfesionalesClub(plan) {
  const bloqueadoEl = $("#profes-club-bloqueado");
  const gridEl = $("#profes-club-grid");
  if (!bloqueadoEl || !gridEl) return;

  const esPremium = plan === "premium" || plan === "vitalicia";
  if (!esPremium) {
    bloqueadoEl.style.display = "block";
    gridEl.style.display = "none";
    if (window.lucide) lucide.createIcons();
    return;
  }
  bloqueadoEl.style.display = "none";
  gridEl.style.display = "grid";

  const [{ data: profs }, { data: servicios }] = await Promise.all([
    supabase.from("profesionales").select("*").eq("activo", true).eq("mostrar_premium", true).order("created_at"),
    supabase.from("servicios_profesional").select("*").order("orden"),
  ]);

  const serviciosPorProf = {};
  (servicios || []).forEach(s => {
    (serviciosPorProf[s.profesional_id] ||= []).push(s);
  });

  if (!profs?.length) {
    gridEl.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:44px 20px">
        <span style="display:inline-flex;width:38px;height:38px;border-radius:50%;background:var(--verde-soft);color:var(--verde);align-items:center;justify-content:center;margin-bottom:14px">${ic("briefcase-medical")}</span>
        <p style="font-size:13px;color:var(--tinta-45,#888);max-width:320px;margin:0 auto">Estamos sumando profesionales de confianza a esta sección. Vuelve pronto — te avisamos por tu Agente de WhatsApp en cuanto haya novedades.</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  gridEl.innerHTML = profs.map(p => `
    <div class="card" style="text-align:center">
      ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${esc(p.nombre)}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 12px">` : `<div style="width:72px;height:72px;border-radius:50%;background:var(--verde-soft);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:24px;font-weight:700;color:var(--verde)">${esc((p.nombre || "P")[0])}</div>`}
      <div style="font-weight:600;font-size:15px;margin-bottom:4px">${esc(p.nombre)}</div>
      <div style="font-size:13px;color:var(--tinta-60);margin-bottom:8px">${esc(p.area || "")}</div>
      <p style="font-size:13px;color:var(--tinta-60);line-height:1.5;margin-bottom:14px">${esc(p.descripcion || "")}</p>
      <button type="button" class="btn btn--primario" data-ver-servicios="${p.id}" style="font-size:13px">Mis servicios</button>
    </div>`).join("");

  gridEl.querySelectorAll("[data-ver-servicios]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = profs.find(x => x.id === btn.dataset.verServicios);
      if (!p) return;
      const susServicios = serviciosPorProf[p.id] || [];
      const wa = (p.whatsapp || "").replace(/\D/g, "");
      const waUrl = wa ? `https://wa.me/57${wa}?text=${encodeURIComponent(`Hola ${p.nombre}, soy miembro Premium de El Club de la Gente y me gustaría agendar una cita.`)}` : "";
      abrirModalTienda(p.nombre, `
        <div style="font-size:13px;color:var(--tinta-60);margin-bottom:16px">${esc(p.area || "")}</div>
        ${susServicios.length ? susServicios.map(s => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--linea,#eee)">
            <div>
              <div style="font-weight:600;font-size:14px">${esc(s.nombre)}</div>
              ${s.es_cortesia ? `<span style="font-size:11px;color:var(--verde);font-weight:600">Cortesía gratis</span>` : s.descuento_pct ? `<span style="font-size:11px;color:var(--verde);font-weight:600">${esc(s.descuento_pct)} de descuento</span>` : ""}
            </div>
            <div style="font-weight:600;font-size:14px">${s.es_cortesia ? "Gratis" : COP(s.tarifa)}</div>
          </div>`).join("") : `<p style="font-size:13px;color:var(--tinta-40);padding:12px 0">Aún no cargó su lista de servicios — escríbele por WhatsApp para conocer sus tarifas.</p>`}
        ${waUrl ? `<a href="${waUrl}" target="_blank" rel="noopener" class="btn btn--primario btn--bloque" style="margin-top:20px;display:flex;align-items:center;justify-content:center;gap:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.335-1.502A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.898 0-3.67-.523-5.188-1.432l-.372-.22-3.762.892.952-3.67-.242-.383A9.937 9.937 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          Contactar por WhatsApp
        </a>` : ""}
      `);
    });
  });

  if (window.lucide) lucide.createIcons();
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

// Banner de reintento cuando falla la carga inicial del dashboard (ej. se
// perdió la conexión justo al recuperar el celular de segundo plano) — sin
// esto, la persona se queda viendo los spinners internos girar para siempre.
function mostrarErrorCargaDash() {
  if (document.getElementById("dash-error-retry")) return;
  const banner = document.createElement("div");
  banner.id = "dash-error-retry";
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#fdecea;color:#c0392b;padding:14px 20px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.1)";
  banner.innerHTML = `<span>No pudimos cargar tu cuenta. Revisa tu conexión e intenta de nuevo.</span><button id="dash-error-retry-btn" style="background:#c0392b;color:#fff;border:none;padding:8px 16px;border-radius:20px;font-weight:700;cursor:pointer">Reintentar</button>`;
  document.body.prepend(banner);
  document.getElementById("dash-error-retry-btn").addEventListener("click", () => location.reload());
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  render();
  const u = leerPerfil();
  // La primera pantalla reemplaza el historial (no lo agrega) para que el
  // gesto de "atrás" no deje a alguien atrapado en un "Inicio" fantasma
  // antes de salir de la página.
  history.replaceState({ panel: "inicio" }, "", location.href);
  mostrarPanel("inicio");
  // getSession() puede devolver null al reabrir la app (PWA en segundo plano)
  // -- antes eso mandaba a Login.html de una, pidiendo el código de nuevo
  // aunque la sesión siguiera siendo válida. Se reintenta varias veces (hasta
  // ~4s en total) y, si sigue sin aparecer pero SÍ hay un token guardado en
  // este navegador, se fuerza un refreshSession() antes de rendirse --
  // cubre el caso de iOS en modo "app" (ícono de pantalla de inicio), donde
  // el proceso se suspende/mata al segundo de salir y getSession() puede
  // tardar en releer lo que ya está guardado en el dispositivo.
  function haySesionGuardadaEnStorage() {
    try {
      return Object.keys(localStorage).some(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
    } catch { return false; }
  }
  async function obtenerSesionConReintento() {
    for (const espera of [0, 400, 900, 1600]) {
      if (espera) await new Promise(r => setTimeout(r, espera));
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) return data.session;
    }
    if (haySesionGuardadaEnStorage()) {
      try {
        const { data } = await supabase.auth.refreshSession();
        if (data.session?.user?.id) return data.session;
      } catch {}
    }
    return null;
  }
  obtenerSesionConReintento().then(async (session) => {
    if (!session?.user?.id) { location.href = "Registro.html?modo=login"; return; }
    const userId = session.user.id;
    _miembroId = userId;
    generarQR(userId);
    cargarNotificacionesMiembro(userId);
    suscribirPlanRealtime(userId);

    // Si viene de elegir un plan sin pago (gratis), se activa directo aquí.
    // Los planes de pago (básica/premium) NO se activan desde el navegador —
    // eso lo hace únicamente la función aprobar-membresia cuando el admin
    // aprueba el comprobante, por seguridad (activar_plan solo permite
    // auto-activar "gratis").
    const paramsIniciales = new URLSearchParams(location.search);
    const planActivar = paramsIniciales.get("activar");
    if (planActivar === "gratis") {
      const { error: rpcErr } = await supabase.rpc("activar_plan", { nuevo_plan: planActivar });
      if (rpcErr) console.error("activar_plan error:", rpcErr);
    }
    if (planActivar) {
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
      document.getElementById("bienvenida-cerrar")?.addEventListener("click", () => cerrarModalTienda());
    }

    const { data: perfData, error: perfError } = await supabase.from("perfiles").select("plan, nombre, fecha_nacimiento, whatsapp, rol, fecha_vencimiento, categorias_interes, respuestas_segmentacion, foto_url, tiene_mascotas, tiene_hijos").eq("id", userId).maybeSingle();
    if (perfError) {
      // No mostrar "activa tu membresía" cuando en realidad es un error técnico
      // (ej. una columna que falta) — sería engañoso, parecería que no pagó.
      console.error("Error cargando perfil:", perfError);
      toast("No pudimos cargar tu perfil. Recarga la página.");
      return;
    }
    _respuestasSegPrevias = perfData?.respuestas_segmentacion || {};
    _whatsappPrevio = perfData?.whatsapp || "";
    const cfgWaActualEl = document.getElementById("cfg-wa-actual");
    if (cfgWaActualEl) cfgWaActualEl.textContent = _whatsappPrevio || "—";

    // Plan Gratis recién activado: mandar de una vez sus beneficios por
    // WhatsApp (mismo mensaje que usa el Agente cuando alguien en Gratis le
    // escribe) — no hay que esperar a que la persona le escriba primero.
    if (planActivar === "gratis" && !rpcErr && perfData?.whatsapp) {
      const msgGratis = `👋 ¡Hola! Con tu plan Gratis ya tienes:\n\n🚗 10% de descuento en viajes y domicilios con nuestros conductores de confianza (moto y carro).\n🛍️ Acceso ilimitado a la Tienda del Club.\n\nA continuación te invitamos a rellenar el siguiente formulario para validar tu membresía gratuita:\nhttps://elclubdelagente.com/Bienvenida.html?id=${userId}\n\nSi quieres acceder a promociones, sorteos, este mismo agente personalizado 24/7 y de paso apoyar obras sociales, te invitamos a adquirir alguna de nuestras membresías con hasta 40% de descuento. Te esperamos 🌿`;
      fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: perfData.whatsapp, body: msgGratis }),
        keepalive: true,
      }).catch(() => {});
    }

    // Foto de perfil: Supabase es la fuente de verdad (sincroniza entre dispositivos)
    {
      const perfilCache = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
      if (perfData?.foto_url) {
        aplicarFoto(perfData.foto_url);
        perfilCache.foto_url = perfData.foto_url;
      } else if (perfilCache.foto_url) {
        delete perfilCache.foto_url;
        $$("[data-ini]").forEach(el => { el.textContent = iniciales(perfData?.nombre || ""); });
        const quitar = $("#cfg-foto-quitar"); if (quitar) quitar.hidden = true;
      }
      localStorage.setItem("ecdlg_perfil", JSON.stringify(perfilCache));
    }
    const plan = perfData?.plan || null;
    const nombre = perfData?.nombre || session.user.user_metadata?.nombre || session.user.user_metadata?.full_name || null;
    aplicarPlanUI(plan, perfData?.fecha_vencimiento);

    // Categorías de interés reales (nada de datos de ejemplo)
    const catsEl = document.getElementById("perfil-cats");
    if (catsEl) {
      const cats = perfData?.categorias_interes || [];
      catsEl.innerHTML = cats.length
        ? cats.map(c => `<span class="chip-int">${esc(c)}</span>`).join("")
        : `<span style="font-size:12.5px;color:var(--tinta-suave, #888)">Aún no elegiste categorías — dale a "Actualizar" para escogerlas.</span>`;
    }

    // Segmentación del miembro nuevo: se dispara simplemente si todavía no
    // hay respuestas guardadas, sin importar cómo llegó a su perfil (registro
    // normal, Google, o "pagar primero" -- este último nunca trae "?bienvenida=1"
    // porque a propósito no lo mandamos a su perfil mientras el pago sigue sin
    // verificar). Si ya le dio "Omitir por ahora" antes, no se le insiste en
    // cada inicio de sesión (ver cerrarSeg(), guarda esa elección por cuenta).
    const sinRespuestasAun = !Object.keys(perfData?.respuestas_segmentacion || {}).length;
    const yaOmitioSegmentacion = localStorage.getItem(`ecdlg_segmentado_${userId}`) === "1";
    if (sinRespuestasAun && !yaOmitioSegmentacion) {
      iniciarSegmentacion({ ...perfData, nombre });
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
      cargarDescuentos(userId, perfData?.whatsapp);
      actualizarLinksAliados(userId, plan, perfData?.whatsapp);
      cargarOnboarding(userId, perfData);
      cargarAliadosRecomendados(perfData);
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

    // Rol profesional (cuenta real, no localStorage): si el caché del
    // navegador quedó con un rol viejo (ej. se probó otra cuenta antes en
    // el mismo dispositivo), esto corrige "Mi consultorio"/"Mis viajes" con
    // el dato de verdad en vez de confiar solo en lo que quedó guardado.
    const liProf = $("#sb-profesional-li");
    if (perfData?.rol === "profesional") {
      if (liProf) liProf.hidden = false;
      cargarPanelProfesional();
    } else if (liProf) {
      liProf.hidden = true;
    }

    cargarReferidos(userId);
    cargarMarcasCarrusel();
    cargarProfesionalesClub(plan);
  }).catch((err) => {
    // Sin esto, un fallo aquí (típico al recuperar conexión en móvil tras
    // minimizar) dejaba todo el contenido del dashboard colgado en silencio,
    // con los .brand-loader internos girando para siempre.
    console.error("Error cargando el dashboard:", err);
    mostrarErrorCargaDash();
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
    if (l.dataset.panel === 'educacion') cargarEducacion();
    if (l.dataset.panel === 'vacantes') cargarVacantesMiembro();
    if (l.dataset.panel === 'soporte') cargarSoporte();
    if (l.dataset.panel === 'programas') cargarProgramas();
  }));

  // Avatar del topbar: acceso directo a Configuración (foto, usuario, contraseña)
  $("#topbar-avatar-btn")?.addEventListener("click", () => irPanel("config"));

  // Tarjeta "Ahorro total del mes": abre la evolución mes a mes
  $("#hero-ahorro-card")?.addEventListener("click", () => abrirAhorroMensual());
  $("#hero-ahorro-card")?.addEventListener("keydown", (e) => { if (e.key === "Enter") abrirAhorroMensual(); });

  // Burger móvil
  $("#topbar-burger")?.addEventListener("click", () => $("#dash").classList.toggle("menu-open"));
  $("#dash-backdrop")?.addEventListener("click", () => $("#dash").classList.remove("menu-open"));

  // Atajos a ClubCard / perfil desde tarjetas
  $$("[data-goto-panel]").forEach(b => b.addEventListener("click", () => irPanel(b.dataset.gotoPanel)));

  // Flip de ClubCard -- también se voltea tocando la tarjeta misma, no
  // solo con el botón "Quiero acceder a mis beneficios". Cada vez que queda
  // mostrando el reverso, se pide un código de verificación nuevo (el QR
  // solo ya no basta -- una foto del QR serviría para siempre; el código
  // vence a los pocos minutos).
  const flipYGenerarCodigo = (flipEl) => {
    flipEl.classList.toggle("is-back");
    if (flipEl.classList.contains("is-back")) generarCodigoVerificacion();
  };
  $("#cc-flip-toggle")?.addEventListener("click", () => flipYGenerarCodigo($("#cc-flip")));
  $("#cc-flip")?.addEventListener("click", () => flipYGenerarCodigo($("#cc-flip")));
  // Preview de la ClubCard en Inicio: se voltea igual, es su propia tarjeta
  // (id distinto porque no puede repetirse "cc-flip" en la misma página).
  $("#cc-flip-inicio")?.addEventListener("click", () => flipYGenerarCodigo($("#cc-flip-inicio")));

  // Copiar el código de verificación (sin disparar el flip de la tarjeta)
  $$("[data-copiar-codigo-verif]").forEach(btn => btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const codigo = (document.querySelector(".cc-codigo-verif")?.textContent || "").replace(/[^\d]/g, "");
    if (codigo.length !== 4) return;
    navigator.clipboard?.writeText(codigo).then(() => toast("Código copiado ✓")).catch(() => {});
  }));

  // ---- Configuración ----
  $("#cfg-foto-btn")?.addEventListener("click", () => $("#cfg-foto-input").click());
  $("#cfg-foto-input")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    abrirRecorteFotoPerfil(file);
  });
  $("#cfg-foto-quitar")?.addEventListener("click", () => { quitarFoto(); toast("Foto de perfil eliminada"); });

  // Cambiar WhatsApp -- el número es la identidad de acceso (login por OTP),
  // así que no basta con guardarlo en "perfiles": hace falta verificar que
  // sea suyo (OTP al número nuevo) y una función con permisos de admin que
  // actualice a la vez el perfil y el correo interno real en auth.users.
  let _cfgWaPendiente = null;
  $("#cfg-wa-nuevo")?.addEventListener("input", (e) => {
    const limpio = e.target.value.replace(/\D/g, "");
    if (limpio !== e.target.value) e.target.value = limpio;
  });
  $("#cfg-wa-enviar")?.addEventListener("click", async () => {
    const btn = $("#cfg-wa-enviar");
    let digits = ($("#cfg-wa-nuevo")?.value || "").replace(/\D/g, "");
    while (digits.length > 10 && digits.startsWith("57")) digits = digits.slice(2);
    if (!/^3\d{9}$/.test(digits)) { toast("Ingresa un número de WhatsApp colombiano válido (10 dígitos, empieza en 3)"); return; }
    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      const r = await fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/cambiar-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", miembro_id: _miembroId, nuevo_whatsapp: digits }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(j.error || "No pudimos enviar el código."); btn.disabled = false; btn.textContent = "Enviar código de confirmación"; return; }
      _cfgWaPendiente = digits;
      $("#cfg-wa-msg").textContent = `Enviamos un código a tu nuevo WhatsApp (${digits}). Ingrésalo para confirmar.`;
      $("#cfg-wa-paso1").hidden = true;
      $("#cfg-wa-paso2").hidden = false;
      setTimeout(() => $("#cfg-wa-otp")?.focus(), 50);
    } catch (e) {
      toast("Error de conexión. Intenta de nuevo.");
    }
    btn.disabled = false; btn.textContent = "Enviar código de confirmación";
  });
  $("#cfg-wa-confirmar")?.addEventListener("click", async () => {
    const btn = $("#cfg-wa-confirmar");
    const code = ($("#cfg-wa-otp")?.value || "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) { toast("El código debe tener 6 dígitos"); return; }
    btn.disabled = true; btn.textContent = "Confirmando…";
    try {
      const r = await fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/cambiar-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", miembro_id: _miembroId, nuevo_whatsapp: _cfgWaPendiente, code }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast(j.error || "No pudimos confirmar el código."); btn.disabled = false; btn.textContent = "Confirmar"; return; }
      toast("¡WhatsApp actualizado! ✓");
      const actualEl = $("#cfg-wa-actual"); if (actualEl) actualEl.textContent = _cfgWaPendiente;
      $("#cfg-wa-paso2").hidden = true;
      $("#cfg-wa-paso1").hidden = false;
      $("#cfg-wa-nuevo").value = "";
      $("#cfg-wa-otp").value = "";
      const perfil = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
      perfil.whatsapp = _cfgWaPendiente;
      localStorage.setItem("ecdlg_perfil", JSON.stringify(perfil));
      _whatsappPrevio = _cfgWaPendiente;
      _cfgWaPendiente = null;
    } catch (e) {
      toast("Error de conexión. Intenta de nuevo.");
    }
    btn.disabled = false; btn.textContent = "Confirmar";
  });
  $("#cfg-wa-cancelar")?.addEventListener("click", () => {
    $("#cfg-wa-paso2").hidden = true;
    $("#cfg-wa-paso1").hidden = false;
    $("#cfg-wa-otp").value = "";
    _cfgWaPendiente = null;
  });

  // Cerrar sesión → inicio
  $("#sb-logout")?.addEventListener("click", () => { location.href = "El Club de la Gente.html"; });

  // ---- Segmentación ----
  // (el disparo real vive arriba, dentro del callback de getSession, para
  // esperar a saber qué campos ya tenemos antes de mostrar el overlay)

  // Actualizar categorías desde el perfil → reabre la segmentación
  $("#editar-cats")?.addEventListener("click", () => iniciarSegmentacion(null, "categorias"));

  // Bloque fijo de identidad (nombre/apellido/fecha/whatsapp): estos campos no
  // se regeneran dinámicamente, así que se enlazan una sola vez aquí.
  ["seg-nombre", "seg-apellido", "seg-fecha", "seg-whatsapp"].forEach(id => {
    $("#" + id)?.addEventListener("input", guardarBorradorSeg);
  });

  $("#seg-next").addEventListener("click", async () => {
    // Validar obligatorias del bloque que se está viendo antes de avanzar
    const bloqueActual = $$(".seg-block")[segBlock];
    const sinResponder = $$(".seg-q[data-obligatoria='1']", bloqueActual).find(q => {
      if (q.hidden) return false;
      const input = q.querySelector(".seg-input");
      return input ? !input.value.trim() : !$(".seg-opt.is-on", q);
    });
    if (sinResponder) {
      toast("Esta pregunta es obligatoria");
      sinResponder.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Pregunta de autorización de datos: si responde "No" por primera vez,
    // se le muestra una justificación con oportunidad de reconsiderar antes
    // de aceptarlo como respuesta final (ver botones seg-autorizar-si/no).
    const qAutorizacion = bloqueActual?.querySelector('.seg-q[data-autorizacion="1"]');
    if (qAutorizacion && !qAutorizacion.hidden) {
      const seleccion = $(".seg-opt.is-on", qAutorizacion)?.textContent.trim().toLowerCase();
      if (seleccion === "no" && !qAutorizacion.dataset.justificado) {
        mostrarSegInterstitial("seg-autorizacion-justif");
        return;
      }
    }

    guardarBorradorSeg();

    if (segSiguienteVisible(segBlock, 1) === null) {
      // Ya no hay bloque fijo de nombre/apellido/fecha/WhatsApp (se quitó del
      // cuestionario, esos datos ya se piden en el registro) -- estos campos
      // ya no existen en el DOM, así que estas lecturas siempre dan vacío y
      // las actualizaciones de más abajo quedan como no-ops seguros.
      const nombre = $("#seg-nombre")?.value?.trim();
      const apellido = $("#seg-apellido")?.value?.trim();
      const fecha = $("#seg-fecha")?.value;
      const whatsapp = $("#seg-whatsapp")?.value?.trim();
      const nombreCompleto = [nombre, apellido].filter(Boolean).join(" ");

      // Leer las respuestas de todas las preguntas dinámicas por su id (no por
      // posición, ya que el admin puede agregar/quitar/reordenar preguntas)
      const respuestas = { ..._respuestasSegPrevias };
      let categoriasParaEspejar = null;
      $$("#seg-dinamico .seg-q[data-pregunta-id]").forEach(q => {
        const id = q.dataset.preguntaId;
        const input = q.querySelector(".seg-input");
        if (input) {
          const v = input.value.trim();
          if (v) respuestas[id] = v;
          return;
        }
        const sel = [...$$(".seg-opt.is-on", q)].map(b => b.textContent.trim());
        if (!sel.length) return;
        const valor = q.dataset.multi === "1" ? sel : sel[0];
        respuestas[id] = valor;
        if (q.dataset.categorias === "1") categoriasParaEspejar = sel;
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const updates = { respuestas_segmentacion: respuestas };
        if (nombreCompleto) updates.nombre = nombreCompleto;
        if (fecha) updates.fecha_nacimiento = fecha;
        if (whatsapp) updates.whatsapp = whatsapp;
        if (categoriasParaEspejar) updates.categorias_interes = categoriasParaEspejar;

        const { error: segUpdateError } = await supabase.from("perfiles").update(updates).eq("id", session.user.id);
        if (segUpdateError) {
          // No lo demos por guardado si falló -- si no, la próxima sesión
          // sigue viendo "sin respuestas" (reaparece el cuestionario) aunque
          // la persona ya lo haya llenado, sin que nadie se entere del error.
          console.error("Error guardando segmentación:", segUpdateError);
          toast("No pudimos guardar tus respuestas. Intenta de nuevo en un momento.");
          return;
        }
        try { localStorage.removeItem(claveSegBorrador()); } catch {}

        const perfil = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
        if (nombreCompleto) { perfil.nombre = nombreCompleto; perfil.primerNombre = nombre; }
        if (fecha) perfil.fechaISO = fecha;
        if (whatsapp) perfil.whatsapp = whatsapp;
        if (categoriasParaEspejar) perfil.categorias = categoriasParaEspejar;
        localStorage.setItem("ecdlg_perfil", JSON.stringify(perfil));

        // Mensaje de bienvenida por WhatsApp: solo si este es el primer momento
        // en el que conocemos su número (ej. se registró con Google, que no pide
        // WhatsApp al inicio) — si ya lo tenía desde el registro manual, ya lo
        // recibió allá y no hay que duplicarlo.
        if (!_whatsappPrevio && whatsapp) {
          const primerNombre = perfil.primerNombre || nombre || "";
          const msgBienvenida = `¡Hola ${primerNombre}! 🌿 Bienvenido/a a El Club de la Gente.\n\nYa eres parte de una comunidad que ahorra, aprende y apoya a Fusagasugá. 🎉\n\nDesde aquí recibirás confirmaciones de tus descuentos y novedades del Club.\n\nEl Club de la Gente`;
          fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: whatsapp, body: msgBienvenida }),
          }).catch(() => {});
        }

        const catsEl = document.getElementById("perfil-cats");
        if (catsEl && categoriasParaEspejar) {
          catsEl.innerHTML = categoriasParaEspejar.map(c => `<span class="chip-int">${esc(c)}</span>`).join("");
        }
      }
      mostrarSegInterstitial("seg-final-gracias");
    } else {
      segMostrar(segSiguienteVisible(segBlock, 1));
    }
  });
  $("#seg-prev").addEventListener("click", () => { guardarBorradorSeg(); segMostrar(segSiguienteVisible(segBlock, -1) ?? 0); });
  $("#seg-skip").addEventListener("click", cerrarSeg);

  // Pantallas especiales de la pregunta de autorización de datos
  $("#seg-autorizar-si")?.addEventListener("click", () => {
    const q = $('.seg-q[data-autorizacion="1"]');
    if (q) $$(".seg-opt", q).forEach(o => o.classList.toggle("is-on", o.textContent.trim().toLowerCase() !== "no"));
    ocultarSegInterstitials();
    $("#seg-next").click();
  });
  $("#seg-autorizar-no")?.addEventListener("click", () => {
    const q = $('.seg-q[data-autorizacion="1"]');
    if (q) q.dataset.justificado = "1"; // ya se le explicó -- su "No" ahora sí se acepta
    mostrarSegInterstitial("seg-autorizacion-gracias");
  });
  $("#seg-autorizacion-continuar")?.addEventListener("click", () => {
    ocultarSegInterstitials();
    $("#seg-next").click();
  });
  $("#seg-final-cerrar")?.addEventListener("click", () => {
    ocultarSegInterstitials();
    cerrarSeg();
  });
  $("#seg-comenzar")?.addEventListener("click", () => {
    $("#seg-intro").hidden = true;
    $("#seg-flujo").hidden = false;
    segMostrar(0);
    if (window.lucide) lucide.createIcons();
  });

  // Modal de activación
  $("#modal-activar-close")?.addEventListener("click", cerrarModalActivar);
  $("#modal-activar")?.addEventListener("click", (e) => { if (e.target === e.currentTarget) cerrarModalActivar(); });
  $("#modal-ir-referidos")?.addEventListener("click", () => {
    cerrarModalActivar();
    const refCard = document.getElementById("card-referidos");
    if (refCard) {
      refCard.scrollIntoView({ behavior: "smooth", block: "center" });
      refCard.style.outline = "3px solid #095544";
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

  // Conductores Uber (moto/carro): no tiene sentido "Mi consultorio" (foto,
  // descripción, servicios fijos) — en vez de eso, ven su historial de viajes.
  // Se usa el booleano es_conductor (marcado desde Admin) en vez de comparar
  // el texto libre de "área" -- ese texto se rompía con un typo o un
  // espacio de más y dejaba al conductor sin acceso a su panel.
  if (prof.es_conductor) {
    const btn = $("#sb-profesional-btn");
    if (btn) btn.dataset.panel = "conductor";
    const ic = $("#sb-profesional-ic"); if (ic) ic.setAttribute("data-lucide", "car");
    const txt = $("#sb-profesional-txt"); if (txt) txt.textContent = "Mis viajes";
    const badge = $("#sb-profesional-badge"); if (badge) badge.textContent = "Conductor";
    if (window.lucide) lucide.createIcons();
    cargarPanelConductor(prof);
    return;
  }

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

  // ---- Mis servicios ----
  async function cargarMisServicios() {
    const { data: servicios } = await supabase.from('servicios_profesional').select('*').eq('profesional_id', prof.id).order('orden');
    const list = $("#mis-servicios-list");
    if (!list) return;
    if (!servicios?.length) {
      list.innerHTML = `<p style="font-size:13px;color:var(--tinta-40);padding:8px 0">Aún no has agregado servicios.</p>`;
    } else {
      list.innerHTML = servicios.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--linea,#eee)">
          <div>
            <div style="font-weight:600;font-size:14px">${esc(s.nombre)}</div>
            <div style="font-size:12px;color:var(--tinta-60)">${s.es_cortesia ? "Cortesía gratis" : `${COP(s.tarifa)}${s.descuento_pct ? " · " + esc(s.descuento_pct) + " desc." : ""}`}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button type="button" class="btn btn--secundario" data-ed-serv="${s.id}" style="font-size:12px;padding:6px 10px">Editar</button>
            <button type="button" class="btn btn--secundario" data-rm-serv="${s.id}" style="font-size:12px;padding:6px 10px">Eliminar</button>
          </div>
        </div>`).join("");
      list.querySelectorAll("[data-ed-serv]").forEach(b => b.addEventListener("click", () => {
        const s = servicios.find(x => x.id === b.dataset.edServ);
        if (!s) return;
        abrirFormServicio(s);
      }));
      list.querySelectorAll("[data-rm-serv]").forEach(b => b.addEventListener("click", async () => {
        if (!confirm("¿Eliminar este servicio?")) return;
        await supabase.from('servicios_profesional').delete().eq('id', b.dataset.rmServ);
        cargarMisServicios();
      }));
    }
    if (window.lucide) lucide.createIcons();
  }

  function abrirFormServicio(s = {}) {
    const form = $("#mis-servicios-form");
    if (!form) return;
    form.style.display = "block";
    form.dataset.editId = s.id || "";
    if ($("#ms-nombre")) $("#ms-nombre").value = s.nombre || "";
    if ($("#ms-tarifa")) $("#ms-tarifa").value = s.tarifa || "";
    if ($("#ms-descuento")) $("#ms-descuento").value = s.descuento_pct || "";
    if ($("#ms-cortesia")) $("#ms-cortesia").checked = !!s.es_cortesia;
  }
  function cerrarFormServicio() {
    const form = $("#mis-servicios-form");
    if (form) { form.style.display = "none"; form.dataset.editId = ""; }
  }

  $("#ms-agregar")?.addEventListener("click", () => abrirFormServicio());
  $("#ms-cancelar")?.addEventListener("click", cerrarFormServicio);
  $("#ms-guardar")?.addEventListener("click", async () => {
    const nombre = $("#ms-nombre")?.value.trim();
    if (!nombre) { toast("El nombre del servicio es obligatorio"); return; }
    const payload = {
      profesional_id: prof.id,
      nombre,
      tarifa: $("#ms-tarifa")?.value ? parseInt($("#ms-tarifa").value) : null,
      descuento_pct: $("#ms-descuento")?.value.trim() || null,
      es_cortesia: !!$("#ms-cortesia")?.checked,
    };
    const editId = $("#mis-servicios-form")?.dataset.editId;
    if (editId) await supabase.from('servicios_profesional').update(payload).eq('id', editId);
    else await supabase.from('servicios_profesional').insert(payload);
    cerrarFormServicio();
    cargarMisServicios();
    toast("Servicio guardado ✓");
  });

  cargarMisServicios();
}

/* ============================================================
   MIS VIAJES (conductores Uber moto/carro)
   ============================================================ */
async function cargarPanelConductor(prof) {
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);

  const { data: viajes } = await supabase
    .from("viajes_conductor")
    .select("tipo, monto, created_at, anulado")
    .eq("conductor_id", prof.id)
    .order("created_at", { ascending: false });

  const lista = viajes || [];
  // Un viaje anulado por Admin no cuenta en las estadísticas -- sí se sigue
  // mostrando en el historial, marcado, para que quede claro qué pasó.
  const viajesMes = lista.filter(v => !v.anulado && new Date(v.created_at) >= inicioMes);
  const dineroMes = viajesMes.reduce((s, v) => s + (v.monto || 0), 0);

  const statViajes = $("#cond-stat-viajes"); if (statViajes) statViajes.textContent = viajesMes.length;
  const statDinero = $("#cond-stat-dinero"); if (statDinero) statDinero.textContent = fmtCOP(dineroMes);

  const TIPO_LBL = { carro: "Carro", moto: "Moto", domicilio: "Domicilio" };
  const fmtF = iso => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const tbody = $("#cond-tabla-body");
  if (tbody) {
    tbody.innerHTML = lista.length
      ? lista.slice(0, 30).map(v => `
        <tr${v.anulado ? ' style="opacity:.45;text-decoration:line-through"' : ''}>
          <td>${TIPO_LBL[v.tipo] || v.tipo}${v.anulado ? ' <small>(anulado)</small>' : ''}</td>
          <td>${fmtF(v.created_at)}</td>
          <td>${fmtCOP(v.monto)}</td>
        </tr>`).join("")
      : `<tr><td colspan="3" style="text-align:center;color:var(--tinta-45,#888);padding:16px">Aún no tienes viajes registrados.</td></tr>`;
  }
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   SOPORTE TÉCNICO (chat de autoservicio del dashboard)
   ============================================================ */
let _sopInit = false;
let _sopImagenPendiente = null;

function sopBurbuja(rol, mensaje, imagenUrl, escalado) {
  const esUsuario = rol === "usuario";
  const img = imagenUrl ? `<img src="${esc(imagenUrl)}" alt="">` : "";
  const texto = mensaje ? esc(mensaje).replace(/\n/g, "<br>") : "";
  const tag = escalado ? `<span class="sop-esc-tag">${ic("check-circle")} Escalado al equipo</span>` : "";
  return `<div class="ag-msg ${esUsuario ? "ag-msg--out" : "ag-msg--in"}">${img}${texto}</div>${tag}`;
}

async function cargarSoporte() {
  if (_sopInit) return;
  _sopInit = true;

  const chat = $("#sop-chat");
  const form = $("#sop-form");
  const input = $("#sop-input");
  const sendBtn = $("#sop-send");
  const imgBtn = $("#sop-img-btn");
  const imgInput = $("#sop-img-input");
  const imgPreview = $("#sop-img-preview");
  const imgPreviewSrc = $("#sop-img-preview-src");
  const imgPreviewName = $("#sop-img-preview-name");
  const imgRemove = $("#sop-img-remove");
  if (!chat || !form) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data: historial } = await supabase
    .from("soporte_mensajes")
    .select("rol, mensaje, imagen_url, escalado, created_at")
    .eq("miembro_id", session.user.id)
    .order("created_at", { ascending: true })
    .limit(50);

  if (historial && historial.length) {
    chat.innerHTML = historial.map(m => sopBurbuja(m.rol, m.mensaje, m.imagen_url, m.escalado)).join("");
    chat.scrollTop = chat.scrollHeight;
  }

  imgBtn?.addEventListener("click", () => imgInput.click());
  imgInput?.addEventListener("change", async () => {
    const file = imgInput.files?.[0];
    imgInput.value = "";
    if (!file) return;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `soporte-${session.user.id}-${Date.now()}.${ext}`;
    sendBtn.disabled = true;
    const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
    sendBtn.disabled = false;
    if (upErr) { toast("Error subiendo la captura"); return; }
    _sopImagenPendiente = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
    imgPreviewSrc.src = _sopImagenPendiente;
    imgPreviewName.textContent = file.name;
    imgPreview.style.display = "flex";
  });
  imgRemove?.addEventListener("click", () => {
    _sopImagenPendiente = null;
    imgPreview.style.display = "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mensaje = input.value.trim();
    const imagenUrl = _sopImagenPendiente;
    if (!mensaje && !imagenUrl) return;

    $(".sop-empty")?.remove();
    chat.insertAdjacentHTML("beforeend", sopBurbuja("usuario", mensaje, imagenUrl, false));
    input.value = "";
    _sopImagenPendiente = null;
    imgPreview.style.display = "none";
    sendBtn.disabled = true;

    const typingId = "sop-typing-" + Date.now();
    chat.insertAdjacentHTML("beforeend", `<div class="sop-typing" id="${typingId}"><span></span><span></span><span></span></div>`);
    chat.scrollTop = chat.scrollHeight;

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/soporte-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ mensaje, imagen_url: imagenUrl }),
      });
      const data = await resp.json();
      $("#" + typingId)?.remove();
      chat.insertAdjacentHTML("beforeend", sopBurbuja("asistente", data.respuesta || "No pude responder, intenta de nuevo.", null, data.escalado));
    } catch (err) {
      $("#" + typingId)?.remove();
      chat.insertAdjacentHTML("beforeend", sopBurbuja("asistente", "Tuvimos un problema de conexión. Intenta de nuevo.", null, false));
    }
    chat.scrollTop = chat.scrollHeight;
    sendBtn.disabled = false;
    if (window.lucide) lucide.createIcons();
  });

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });

  if (window.lucide) lucide.createIcons();
}
