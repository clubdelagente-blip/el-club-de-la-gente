/* ============================================================
   EL CLUB DE LA GENTE — Módulo 4 · Lógica de perfil/dashboard
   ============================================================ */
import { comprimirImagen } from './imagen.js';
// Usa el mismo cliente compartido que auth.js/checkout.js (con respaldo de
// sesión en cookie) -- antes este archivo creaba su PROPIO cliente aparte,
// sin ese respaldo, así que en el primer arranque de la app instalada en
// iOS (localStorage todavía vacío, solo la cookie tenía la sesión) este
// cliente nunca encontraba nada por más que se reintentara.
import { supabase } from './supabase.js';
const SUPABASE_URL = "https://egwaedadpqfwnbfosiao.supabase.co";

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const ic = (n) => `<i data-lucide="${n}"></i>`;

// Plantillas de WhatsApp aprobadas por Meta -- fuera del Sandbox ya no se
// puede mandar texto libre a un número que no escribió primero.
const CONTENT_SID_AVISO_PEDIDO_TIENDA = "HX3df50ee9ad94b3111aad8ca72ea451ec";
const CONTENT_SID_AVISO_ALIADO_NUEVO_PEDIDO = "HXbe8cad531c251f88c649206f3f4eb479";
const CONTENT_SID_BIENVENIDA_PLAN_GRATIS = "HX49497d7c3926d0d4c69fb8e6cf15301e";
const CONTENT_SID_AVISO_VOLUNTARIADO = "HXf05138c905fff2e0539fb9c251da8c42";
const CONTENT_SID_AVISO_COMPROBANTE_REENVIADO = "HXa184ee5bec9818903b58ca8563afcd24";
const ICON_WA = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 2C6.486 2 2 6.486 2 12.004c0 2.123.666 4.09 1.804 5.714L2.5 22l4.418-1.265A9.955 9.955 0 0 0 12.004 22C17.522 22 22 17.514 22 12.004 22 6.486 17.522 2 12.004 2zm0 18.18a8.14 8.14 0 0 1-4.15-1.136l-.298-.177-3.11.89.903-3.03-.194-.31a8.15 8.15 0 0 1-1.25-4.413c0-4.5 3.66-8.157 8.1-8.157 4.44 0 8.09 3.656 8.09 8.157 0 4.5-3.65 8.176-8.09 8.176z"/></svg>`;
// agente.js es un script clásico (no módulo) que reutiliza estos helpers vía window
window.$ = $; window.$$ = $$; window.ic = ic;
const fmtCOP = (n) => "$" + new Intl.NumberFormat("es-CO").format(n);
// overflow:hidden en el body NO basta en iOS Safari para bloquear el scroll
// de fondo detrás de un overlay/modal -- el truco que sí funciona ahí es
// "congelar" el body con position:fixed, guardando y restaurando el scroll.
function bloquearScroll() {
  if (document.body.dataset.scrollY !== undefined) return; // ya estaba bloqueado
  const y = window.scrollY || window.pageYOffset || 0;
  document.body.dataset.scrollY = y;
  document.body.style.position = "fixed";
  document.body.style.top = `-${y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}
function desbloquearScroll() {
  if (document.body.dataset.scrollY === undefined) return; // no había bloqueo activo
  const y = parseInt(document.body.dataset.scrollY, 10);
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  delete document.body.dataset.scrollY;
  window.scrollTo(0, y);
}
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
// Igual que en directorio.js/app-cms.js: las descripciones (de aliado o de
// producto) a veces vienen con **negrilla** en formato markdown -- esto las
// convierte en <strong> real y respeta los saltos de línea, en vez de
// mostrar los asteriscos tal cual.
const descHtml = (s) => esc(s ?? '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
// Campos de dinero: texto con separador de miles en vivo (un <input type="number"> interpreta
// el "." que la gente escribe para miles como punto decimal, ej. "62.000" -> 62).
// "oninput =" en vez de addEventListener a propósito: es idempotente (una
// reasignación simplemente reemplaza la anterior) -- hace falta porque
// algunos inputs de dinero viven en HTML estático (ej. "Personalizar mi
// carta") que se vuelve a tocar en cada cargarContabilidadNegocio(), y con
// addEventListener se habría ido acumulando un listener nuevo por cada
// vez que se refresca esa pestaña.
function formatearInputMoneda(input) {
  if (!input) return;
  input.oninput = () => {
    const digits = input.value.replace(/\D/g, "");
    input.value = digits ? Number(digits).toLocaleString("es-CO") : "";
  };
}
function valorMoneda(input) { return parseInt((input?.value || "").replace(/\D/g, "")) || 0; }

// Dos formas de elegir el mismo color -- la ruedita nativa (fácil para
// quien no conoce códigos) y un campo de texto para pegar un código hex
// directo (fácil para quien ya tiene su color de marca definido, ej. de un
// manual de marca). Quedan sincronizados entre sí sin importar cuál se use;
// el resto del código sigue leyendo solo el input de color de siempre.
function vincularColorHex(colorId, hexId, alCambiar) {
  const colorInput = $("#" + colorId);
  const hexInput = $("#" + hexId);
  if (!colorInput || !hexInput) return;
  hexInput.value = colorInput.value;
  colorInput.oninput = () => { hexInput.value = colorInput.value; if (alCambiar) alCambiar(); };
  hexInput.oninput = () => {
    let v = hexInput.value.trim();
    if (v && !v.startsWith("#")) v = "#" + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { colorInput.value = v; if (alCambiar) alCambiar(); }
  };
}

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
  // "premium" como default aquí pintaba una ClubCard dorada falsa (plan que
  // la persona puede ni tener) en el primerísimo login, antes de que llegue
  // el plan real de Supabase -- "gratis" es un default mucho menos engañoso
  // mientras tanto (aplicarPlanUI() la corrige al real apenas carga).
  const plan = localStorage.getItem("ecdlg_plan") || "gratis";
  const params = new URLSearchParams(location.search);
  const rol = params.get("rol") || p.rol || localStorage.getItem("ecdlg_rol") || "miembro";
  // A veces el nombre queda guardado como el correo interno
  // (10digitos@clubdelagente.app) en vez del nombre real -- nunca se debe
  // mostrar eso en pantalla, así que si pasa se cae a un genérico presentable.
  const nombreCrudo = (p.nombre || "").trim();
  const nombreOk = nombreCrudo && !nombreCrudo.includes("@");
  return {
    nombre: nombreOk ? nombreCrudo : "Miembro del Club",
    primerNombre: (p.primerNombre && !p.primerNombre.includes("@")) ? p.primerNombre : "Miembro",
    fechaISO: p.fechaISO || "",
    mision: p.mision || null,
    num: p.numero_miembro || "",
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

const PLAN_LABEL = { sin_plan: "Sin activar", gratis: "Gratis", basica: "Básico", premium: "Premium", vitalicia: "Vitalicia" };
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
  // -- hay dos cajas con esta clase (la de Premium/Vitalicia y la de
  // Gratis/Básico "Cambiar de plan"), así que se rellenan las dos.
  const sbRenuevaEls = document.querySelectorAll(".sb-plan__renueva");
  const ccRenuevaEl = document.querySelector(".cc-card-renueva");
  if (plan === "vitalicia") {
    sbRenuevaEls.forEach(el => el.textContent = "Vitalicia — no vence");
    if (ccRenuevaEl) ccRenuevaEl.textContent = "Vitalicia";
  } else if (plan === "gratis") {
    sbRenuevaEls.forEach(el => el.textContent = "Plan gratuito");
    if (ccRenuevaEl) ccRenuevaEl.textContent = "—";
  } else if (fechaVencimiento && (plan === "basica" || plan === "premium")) {
    const dVenc = new Date(fechaVencimiento + "T00:00:00");
    sbRenuevaEls.forEach(el => el.textContent = "Renueva el " + dVenc.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }));
    if (ccRenuevaEl) ccRenuevaEl.textContent = dVenc.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
  } else {
    sbRenuevaEls.forEach(el => el.textContent = "Sin membresía activa");
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
  const fileComprimido = await comprimirImagen(file);
  const ext = (fileComprimido.name.split(".").pop() || "jpg").toLowerCase();
  const path = `perfil-${session.user.id}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("contenido").upload(path, fileComprimido, { upsert: true });
  if (upErr) { toast("Error subiendo la foto"); return; }
  const url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
  await supabase.from("perfiles").update({ foto_url: url }).eq("id", session.user.id);
  aplicarFoto(url);
  const perfil = JSON.parse(localStorage.getItem("ecdlg_perfil") || "{}");
  perfil.foto_url = url;
  localStorage.setItem("ecdlg_perfil", JSON.stringify(perfil));
  toast("Foto de perfil actualizada");

  // Moderación con IA en segundo plano -- la foto ya se ve de inmediato (acá
  // solo la ve el propio dueño), pero si resulta tener contenido obsceno se
  // borra sola y se le avisa al miembro.
  fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/verificar-foto-perfil", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ miembro_id: session.user.id }),
  }).catch(() => {});
}
// Overlay genérico (no el modal de paneles) para encuadrar una foto antes
// de subirla -- mover y hacer zoom con Cropper.js, en vez de subir la foto
// tal cual venía de la cámara/galería y que el recorte automático del sitio
// (object-fit:cover) decida solo qué parte mostrar. aspectRatio controla la
// forma del recorte (1 = cuadrada, como la foto de perfil; 9/16 = vertical,
// como se ve un producto en el feed de la carta); onListo(archivo) recibe
// el resultado ya recortado, listo para comprimir/subir donde haga falta.
function abrirRecorteFoto(file, { aspectRatio = 1, titulo = "Ajustar foto", ayuda = "Mueve y haz zoom para encuadrar.", onListo }) {
  const url = URL.createObjectURL(file);
  const ov = document.createElement("div");
  // z-index por encima de .activar-overlay (900) -- este recortador ahora
  // también se abre DESDE adentro de ese modal (ej. foto de producto), no
  // solo desde "Mi perfil" como antes, así que tiene que quedar encima.
  ov.style.cssText = "position:fixed;inset:0;z-index:950;background:rgba(0,0,0,.75);display:grid;place-items:center;padding:20px";
  ov.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:20px;max-width:420px;width:100%">
      <div style="font-weight:700;font-size:15px;margin-bottom:4px">${esc(titulo)}</div>
      <p style="font-size:12px;color:#777;margin-bottom:14px">${esc(ayuda)}</p>
      <div style="max-height:52vh;overflow:hidden;background:#000;border-radius:8px">
        <img id="cfg-crop-img" src="${url}" alt="Foto para recortar" style="max-width:100%;display:block">
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
  const cropper = new Cropper(imgEl, { aspectRatio, viewMode: 1, autoCropArea: 1, background: false });
  ov.querySelector("#cfg-crop-cancel").addEventListener("click", cerrar);
  ov.querySelector("#cfg-crop-ok").addEventListener("click", () => {
    const btn = ov.querySelector("#cfg-crop-ok");
    btn.disabled = true; btn.innerHTML = `${ic("loader")} Subiendo…`; if (window.lucide) lucide.createIcons();
    const anchoSalida = aspectRatio >= 1 ? 800 : Math.round(800 * aspectRatio);
    const altoSalida = aspectRatio >= 1 ? Math.round(800 / aspectRatio) : 800;
    cropper.getCroppedCanvas({ width: anchoSalida, height: altoSalida }).toBlob(async (blob) => {
      const archivo = new File([blob], "foto.jpg", { type: "image/jpeg" });
      cerrar();
      await onListo(archivo);
    }, "image/jpeg", 0.9);
  });
}
function abrirRecorteFotoPerfil(file) {
  abrirRecorteFoto(file, {
    ayuda: "Mueve y haz zoom para encuadrar -- se recorta cuadrada, igual que se ve en tu perfil.",
    onListo: subirFotoPerfil,
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
const TITULOS = { inicio: "Inicio", negocio: "Mi negocio", perfil: "Mi perfil", clubcard: "Mi ClubCard", tienda: "Tienda", educacion: "Educación", vacantes: "Bolsa de trabajo", "profesionales-club": "Profesionales", programas: "Programas", descuentos: "Mis descuentos", sellos: "Mis sellos", agente: "Mi Agente", config: "Configuración" };
// Cambia el panel visible sin tocar el historial -- lo usa irPanel() (que sí
// lo agrega) y el listener de popstate (para no crear una entrada nueva al
// volver atrás, que crearía un loop).
function mostrarPanel(panel) {
  $$(".panel-view").forEach(v => v.classList.toggle("is-active", v.dataset.panel === panel));
  $$(".sb-link[data-panel]").forEach(l => l.classList.toggle("is-active", l.dataset.panel === panel));
  $("#topbar-title").innerHTML = `Mi cuenta · <b>${TITULOS[panel] || ""}</b>`;
  if ($("#dash").classList.contains("menu-open")) { $("#dash").classList.remove("menu-open"); desbloquearScroll(); }
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

// Los paneles con carga diferida (Tienda, Educación, etc.) antes solo se
// cargaban al hacer click en el enlace del sidebar -- un link directo por
// URL (ej. "Perfil.html?panel=tienda", usado por "Producto destacado de
// hoy" en Inicio) mostraba el panel correcto pero vacío/cargando para
// siempre, porque mostrarPanel() solo cambia qué se ve, nunca pide los
// datos. Esta función queda compartida para que el primer panel que carga
// la página (ver el arranque de sesión más abajo) dispare la misma carga
// que el click del sidebar.
function cargarPanelSiHaceFalta(panel) {
  if (panel === 'tienda') cargarTienda();
  if (panel === 'educacion') cargarEducacion();
  if (panel === 'vacantes') cargarVacantesMiembro();
  if (panel === 'soporte') cargarSoporte();
  if (panel === 'programas') cargarProgramas();
  if (panel === 'sellos') cargarSellos();
}

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
let _segEsPrimeraVez = true; // false cuando se reabre el cuestionario desde "Actualizar" -- el aviso de instalar la app solo se muestra la primera vez
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
  bloquearScroll();
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
  desbloquearScroll();
  if (_miembroId) localStorage.setItem(`ecdlg_segmentado_${_miembroId}`, "1");
}

// Paso a paso para instalar la app como PWA -- solo aplica en celular, en
// escritorio no existe el gesto de "agregar a inicio" así que se deja oculto.
// (Misma función que auth.js, repetida acá porque este archivo no lo carga.)
function mostrarPasosInstalarApp() {
  const el = $("#seg-final-instalar");
  if (!el) return;

  // Ya instalada (como PWA hoy, o como app real de Play Store/App Store el
  // día de mañana -- misma detección sirve para las dos) -- no tiene caso
  // explicarle a alguien cómo instalar algo que ya tiene abierto.
  const esStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone === true;
  if (esStandalone) return;

  const ua = navigator.userAgent || "";
  const esIOS = /iPhone|iPad|iPod/.test(ua);
  const esAndroid = /Android/.test(ua);
  if (!esIOS && !esAndroid) return;

  const msg = $("#seg-final-instalar-msg");
  if (msg) {
    msg.innerHTML = esIOS
      ? `Toca los tres puntos <b>(•••)</b> abajo en Safari, elige el ícono de <b>Compartir</b>, luego <b>"Ver más"</b>, después <b>"Agregar al inicio"</b> y por último toca <b>"Agregar"</b> para confirmar.`
      : `Toca el menú <b>⋮</b> de Chrome (arriba a la derecha), elige <b>"Instalar app"</b> o <b>"Agregar a pantalla de inicio"</b>, luego toca <b>"Instalar"</b> y <b>"Crear acceso"</b> para confirmar.`;
  }
  el.hidden = false;
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
  _segEsPrimeraVez = irABloque === 0;
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

/* ---------- Sellos (tarjeta de fidelidad por aliado) ----------
   Los sellos actuales no son un contador aparte que el navegador pueda
   inflar: se derivan de cuántos "descuentos" tiene el miembro en ese aliado
   DESPUÉS de su último canje (mismo criterio que usa Verificar.html del lado
   del aliado). */
async function cargarSellos() {
  const wrap = document.getElementById("sellos-grid");
  if (!wrap || !_miembroId) return;

  const [{ data: descuentos }, { data: canjes }] = await Promise.all([
    supabase.from("descuentos").select("aliado_id, created_at").eq("miembro_id", _miembroId).not("aliado_id", "is", null),
    supabase.from("sellos_canjes").select("aliado_id, created_at").eq("miembro_id", _miembroId),
  ]);

  const idsAliados = [...new Set((descuentos || []).map(d => d.aliado_id))];
  const sinSellos = `<p style="text-align:center;padding:40px 20px;color:var(--tinta-60)">Aún no tienes sellos — usa tus descuentos en aliados con tarjeta de sellos para empezar a sumar.</p>`;
  if (!idsAliados.length) { wrap.innerHTML = sinSellos; return; }

  const { data: aliados } = await supabase.from("aliados_publico")
    .select("id, nombre, imagen_url, sellos_activo, sellos_meta, sellos_premio_tipo, sellos_premio_desc")
    .in("id", idsAliados).eq("sellos_activo", true);
  if (!aliados?.length) { wrap.innerHTML = sinSellos; return; }

  const ultimoCanjePorAliado = {};
  (canjes || []).forEach(c => {
    const actual = ultimoCanjePorAliado[c.aliado_id];
    if (!actual || new Date(c.created_at) > new Date(actual)) ultimoCanjePorAliado[c.aliado_id] = c.created_at;
  });

  const tarjetas = aliados.map(a => {
    const desde = ultimoCanjePorAliado[a.id];
    const sellosActuales = (descuentos || []).filter(d => d.aliado_id === a.id && (!desde || new Date(d.created_at) > new Date(desde))).length;
    return { ...a, sellosActuales };
  }).filter(a => a.sellosActuales > 0);

  if (!tarjetas.length) { wrap.innerHTML = sinSellos; return; }

  wrap.innerHTML = tarjetas.map(a => {
    const meta = a.sellos_meta || 10;
    const completo = a.sellosActuales >= meta;
    const premio = a.sellos_premio_desc || (a.sellos_premio_tipo === "gratis" ? "Gratis" : "Descuento");
    return `
    <a class="aliado-mini" href="Directorio.html?abrir=${a.id}">
      ${a.imagen_url
        ? `<img class="aliado-mini__ic" src="${esc(a.imagen_url)}" alt="" style="object-fit:cover">`
        : `<span class="aliado-mini__ic">${ic("stamp")}</span>`}
      <span>
        <span class="aliado-mini__name">${esc(a.nombre)}</span><br>
        <span class="aliado-mini__cat">${completo ? "¡Listo para canjear! 🎉" : `Premio: ${esc(premio)}`}</span>
      </span>
      <span class="aliado-mini__pct" style="${completo ? "color:#b45309" : ""}">${a.sellosActuales}/${meta}</span>
    </a>`;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

/* ---------- Descuentos reales ---------- */
async function cargarDescuentos(userId, whatsapp) {
  const u = leerPerfil();

  const [{ data: aliadosData, error }, { data: tiendaData }, { data: uberData }, { data: profData }] = await Promise.all([
    supabase.from("descuentos")
      .select("aliado_id, aliado_nombre, categoria, descuento_pct, compra, ahorro, created_at")
      .eq("miembro_id", userId).order("created_at", { ascending: false }),
    supabase.from("pedidos_club")
      .select("nombre_producto, monto, ahorro, created_at")
      .eq("miembro_id", userId).not("estado", "in", "(pendiente_pago,cancelado)"),
    supabase.from("viajes_conductor")
      .select("tipo, monto, descuento_pct, ahorro, created_at")
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
          <span style="display:inline-flex;align-items:center;gap:4px;background:#0f4423;color:#fff;font-weight:800;font-size:12.5px;padding:5px 11px;border-radius:20px;white-space:nowrap">🔥 Más del 70% OFF</span>
          <span>Solo para las primeras 50 personas — los descuentos de aliados son exclusivos desde Básico · <a href="Planes.html" style="color:#0f4423;font-weight:800;text-decoration:underline">Ver membresías →</a></span>
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

  // La imagen del aliado ya no viene embebida en la misma consulta (ese join
  // se resuelve contra la tabla "aliados" protegida por RLS y el miembro no
  // es su dueño) -- se trae aparte desde la vista pública y se cruza por id.
  const idsAliadosDesc = [...new Set((aliadosData || []).map(d => d.aliado_id).filter(Boolean))];
  const imgPorAliado = new Map();
  if (idsAliadosDesc.length) {
    const { data: aliadosImg } = await supabase.from("aliados_publico").select("id, imagen_url").in("id", idsAliadosDesc);
    (aliadosImg || []).forEach(a => imgPorAliado.set(a.id, a.imagen_url));
  }

  const TIPO_UBER_LBL = { carro: "Carro", moto: "Moto", domicilio: "Domicilio" };
  const data = [
    ...(aliadosData || []).map(d => ({
      tipo: "aliado", nombre: d.aliado_nombre, categoria: d.categoria, imagen_url: imgPorAliado.get(d.aliado_id) || null,
      descuento_pct: d.descuento_pct, compra: d.compra, ahorro: d.ahorro || 0, created_at: d.created_at,
    })),
    ...(tiendaData || []).map(d => ({
      tipo: "tienda", nombre: d.nombre_producto, categoria: "Tienda del Club",
      descuento_pct: null, compra: d.monto, ahorro: d.ahorro || 0, created_at: d.created_at,
    })),
    ...(uberData || []).map(d => ({
      tipo: "uber", nombre: `Uber ${TIPO_UBER_LBL[d.tipo] || d.tipo}`, categoria: "Transporte",
      descuento_pct: `${d.descuento_pct || 10}%`, compra: d.monto, ahorro: d.ahorro || 0, created_at: d.created_at,
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
        ${esActual ? `<text x="${x + BAR_W / 2}" y="${y - 8}" text-anchor="middle" font-family="Anton, sans-serif" font-size="12" font-weight="700" fill="#F1F7F6">${fmtCOP(m.total)}</text>` : ""}
        <text x="${x + BAR_W / 2}" y="${EJE_Y + 16}" text-anchor="middle" font-size="10.5" fill="rgba(241,247,246,.55)">${m.lbl}</text>
      </g>`;
  }).join("");

  const ahorroActual = meses[meses.length - 1].total;
  const METAS = [
    { monto: 40000, emoji: "🍽️", titulo: "Cena gratis", desc: "con uno de nuestros aliados" },
    { monto: 100000, emoji: "👟", titulo: "Ropa y zapatos", desc: "de marca, gratis" },
    { monto: 150000, emoji: "✈️", titulo: "Viajes", desc: "completamente gratis" },
  ];
  const metaMax = METAS[METAS.length - 1].monto;
  const pctBarra = Math.min(100, (ahorroActual / metaMax) * 100);

  const marcadoresHtml = METAS.map(m => {
    const logrado = ahorroActual >= m.monto;
    const pos = Math.min(100, (m.monto / metaMax) * 100);
    return `<div style="position:absolute;top:-14px;left:${pos}%;transform:translateX(-50%);width:28px;height:28px;border-radius:50%;background:${logrado ? "#EAB749" : "#fff"};border:2px solid ${logrado ? "#EAB749" : "#e0cfa0"};display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.12)">${logrado ? "✓" : m.emoji}</div>`;
  }).join("");

  const etiquetasHtml = METAS.map(m => `<span style="flex:1;text-align:center">${fmtCOP(m.monto)}</span>`).join("");

  const metasListaHtml = METAS.map(m => {
    const logrado = ahorroActual >= m.monto;
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:${logrado ? "rgba(234,183,73,.18)" : "#fff"};border:1px solid ${logrado ? "#EAB749" : "#f0e4c8"}">
      <span style="font-size:22px;flex:none">${m.emoji}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13.5px;color:#2b1d02">${m.titulo}</div>
        <div style="font-size:11.5px;color:#8a7140">${m.desc}</div>
      </div>
      <span style="font-size:11px;font-weight:700;flex:none;padding:4px 10px;border-radius:100px;background:${logrado ? "#EAB749" : "#f0e4c8"};color:${logrado ? "#fff" : "#8a7140"}">${logrado ? "✓ Logrado" : fmtCOP(m.monto)}</span>
    </div>`;
  }).join("");

  abrirModalTienda("Tu ahorro mes a mes", `
    <div style="background:#021B1A;border-radius:16px;padding:22px 14px 14px;margin-bottom:20px;position:relative">
      <svg viewBox="0 0 ${ANCHO} ${ALTO}" style="width:100%;height:auto;display:block;overflow:visible" id="ahorro-chart-svg">${barsSvg}</svg>
      <div id="ahorro-chart-tooltip" style="display:none;position:absolute;transform:translate(-50%,-100%);background:#fff;color:#021B1A;font-size:12px;font-weight:700;padding:6px 10px;border-radius:8px;pointer-events:none;box-shadow:0 6px 16px rgba(0,0,0,.25);white-space:nowrap;z-index:2"></div>
    </div>
    <div style="background:linear-gradient(160deg,#fff 0%,#fdf6e8 100%);border:1px solid #f0dfb0;border-radius:16px;padding:24px 20px">
      <div style="text-align:center;margin-bottom:4px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#b9770e">Metas de ahorro este mes</div>
        <div style="font-family:'Anton',sans-serif;font-size:20px;font-weight:700;margin-top:4px;color:#2b1d02">Llevas ${fmtCOP(ahorroActual)} ahorrados</div>
      </div>

      <div style="position:relative;margin:34px 6px 10px">
        <div style="height:10px;background:#f0e4c8;border-radius:100px;overflow:hidden">
          <div style="height:100%;width:${pctBarra}%;background:linear-gradient(90deg,#EAB749,#F5D77A);border-radius:100px;transition:width .6s ease"></div>
        </div>
        ${marcadoresHtml}
      </div>
      <div style="display:flex;justify-content:space-between;margin:0 6px 20px;font-size:10.5px;font-weight:700;color:#8a7140">${etiquetasHtml}</div>

      <div style="display:flex;flex-direction:column;gap:10px">${metasListaHtml}</div>

      <p style="font-size:12px;color:#8a7140;text-align:center;margin-top:16px;line-height:1.5">Al llegar a cada meta participas por el premio — entre más ahorres, más oportunidades tienes de ganar. 🎉</p>
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
    supabase.rpc("ranking_ventas_aliados", { p_desde: new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString() }),
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

  // Posición en usos este mes (ranking real entre todos los aliados) -- la
  // función ya devuelve los conteos agregados por aliado, no filas sueltas
  // (no tiene sentido que un negocio vea el detalle de ventas de otro).
  const posEl = document.getElementById("negocio-posicion");
  if (posEl) {
    if (todas?.length) {
      const orden = [...todas].sort((a, b) => b.total - a.total);
      const idx = orden.findIndex(r => r.aliado_id === aliadoId);
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
  // Por si el modal anterior quedó expandido a pantalla completa (ver
  // "Nuevo pedido" con mesa elegida) -- cada modal nuevo arranca del
  // tamaño normal, nunca heredando el tamaño del anterior. OJO: maxHeight
  // vuelve a "85vh" (el valor de siempre en el HTML), NUNCA a "" -- sin
  // tope de altura, un formulario largo (ej. "Agregar producto") crece más
  // alto que la pantalla y, como el fondo queda bloqueado mientras el
  // modal está abierto, no hay forma de llegar a lo que quedó por encima.
  const box = $("#modal-tienda-box");
  if (box) { box.style.maxWidth = ""; box.style.width = ""; box.style.maxHeight = "85vh"; box.style.height = ""; box.style.borderRadius = ""; }
  const m = $("#modal-tienda"); if (m) m.style.display = "flex";
  bloquearScroll();
  if (!_modalTiendaAbierta) history.pushState({ modalTienda: true }, "");
  _modalTiendaAbierta = true;
  if (window.lucide) lucide.createIcons();
}
function cerrarModalTienda(_desdePopstate) {
  const m = $("#modal-tienda"); if (m) m.style.display = "none";
  desbloquearScroll();
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

  function irANegTab(tab) {
    $$(".neg-tab-btn").forEach(x => x.classList.toggle("is-active", x.dataset.negtab === tab));
    const res = $("#negtab-resumen"); if (res) res.style.display = tab === "resumen" ? "" : "none";
    const tie = $("#negtab-tienda"); if (tie) tie.style.display = tab === "tienda" ? "" : "none";
    const vac = $("#negtab-vacantes"); if (vac) vac.style.display = tab === "vacantes" ? "" : "none";
    const con = $("#negtab-contabilidad"); if (con) con.style.display = tab === "contabilidad" ? "" : "none";
    // Mi Contabilidad es una vista enfocada propia -- mientras se usa, se
    // esconden el resto de pestañas de "Mi negocio" y la caja del código
    // de aliado (nada se borra, solo se oculta; "Volver" restaura todo).
    const esContabilidad = tab === "contabilidad";
    const chrome = $("#neg-chrome"); if (chrome) chrome.style.display = esContabilidad ? "none" : "";
    $$(".neg-tab-btn").forEach(x => { if (x.dataset.negtab !== "contabilidad") x.hidden = esContabilidad; });
    const volver = $("#neg-volver"); if (volver) volver.hidden = !esContabilidad;
    if (tab === "vacantes") cargarVacantesAliado(negocio.id);
    if (tab === "contabilidad") cargarContabilidadNegocio(negocio.id);
  }
  $$(".neg-tab-btn").forEach(b => b.addEventListener("click", () => irANegTab(b.dataset.negtab)));
  $("#neg-volver")?.addEventListener("click", () => irANegTab("resumen"));

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

  // Si falla la carga (red, timeout) la bandera se resetea al final del
  // catch -- antes quedaba en "true" para siempre y el panel se veía vacío
  // el resto de la sesión, sin forma de reintentar.
  try {
    const { data, error } = await supabase
      .from("vacantes")
      .select("*")
      .eq("estado", "aprobada")
      .eq("activo", true)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const vacantes = data || [];

    // El nombre/imagen del aliado se trae aparte desde la vista pública (el
    // join directo contra "aliados" ya no es visible para un miembro que no es
    // dueño de esa fila).
    const idsAliadosVac = [...new Set(vacantes.map(v => v.aliado_id).filter(Boolean))];
    if (idsAliadosVac.length) {
      const { data: aliadosVac } = await supabase.from("aliados_publico").select("id, nombre, imagen_url").in("id", idsAliadosVac);
      const mapaAliadosVac = new Map((aliadosVac || []).map(a => [a.id, a]));
      vacantes.forEach(v => { v.aliados = mapaAliadosVac.get(v.aliado_id) || null; });
    }
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
          ${v.aliados?.imagen_url ? `<img src="${v.aliados.imagen_url}" alt="${esc(v.aliados?.nombre || '')}" style="width:34px;height:34px;object-fit:cover;border-radius:8px;flex-shrink:0">` : `<div style="width:34px;height:34px;border-radius:8px;background:#f0faf4;flex-shrink:0"></div>`}
          <div style="font-size:12px;color:#777;font-weight:600">${esc(v.aliados?.nombre || "")}</div>
        </div>
        <div style="font-weight:700;font-size:15px;margin-bottom:6px">${esc(v.titulo)}</div>
        ${v.descripcion ? `<p style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px">${esc(v.descripcion)}</p>` : ""}
        <a class="pm-wa" style="width:100%;justify-content:center" target="_blank" href="https://wa.me/57${v.whatsapp}?text=${encodeURIComponent("Hola, vi la vacante de " + v.titulo + " en El Club de la Gente")}">${ICON_WA}Escribir por WhatsApp</a>
      </div>`).join("");
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error("cargarVacantesMiembro:", e);
    _vacantesMiembroCargadas = false;
    grid.innerHTML = `<p style="text-align:center;padding:40px 20px;color:var(--tinta-45,#888);grid-column:1/-1;font-size:13px">No se pudieron cargar las vacantes. Cambia de pestaña y vuelve a intentarlo.</p>`;
  }
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
      ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${esc(p.nombre)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0">` : `<div style="width:44px;height:44px;border-radius:8px;background:#f0faf4;flex-shrink:0"></div>`}
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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="cfg-campo"><label class="cfg-label">Promoción válida hasta (opcional)</label><input class="cfg-input" id="pa-fecha" type="date" value="${p.fecha_fin || ""}"></div>
      <div class="cfg-campo"><label class="cfg-label">Stock <span style="font-weight:400;opacity:.6">(vacío = sin límite)</span></label><input class="cfg-input" id="pa-stock" type="number" min="0" value="${p.stock ?? ""}" placeholder="Ej: 10"></div>
    </div>
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
        stock: $("#pa-stock")?.value || "",
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
      if (borrador.stock) $("#pa-stock").value = borrador.stock;
      if (borrador.imagenes?.length) imagenes = borrador.imagenes;
    }
    ["pa-nombre", "pa-desc", "pa-cat", "pa-precio", "pa-descuento", "pa-wa", "pa-fecha", "pa-stock"].forEach(id => {
      $("#" + id)?.addEventListener("input", guardarBorradorProducto);
      $("#" + id)?.addEventListener("change", guardarBorradorProducto);
    });
  }
  function renderImgGrid() {
    const cont = $("#pa-img-grid");
    if (!cont) return;
    cont.innerHTML = imagenes.map((url, i) => `
      <div style="position:relative;width:64px;height:64px">
        <img src="${url}" alt="Foto del producto ${i + 1}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
        <button type="button" data-rm-img="${i}" aria-label="Quitar esta foto" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#c0392b;color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer">×</button>
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
    let file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    file = await comprimirImagen(file);
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
    // Id generado en el navegador para un producto nuevo (no depende de que
    // el SELECT post-insert tenga permiso de RLS para devolverlo) -- mismo
    // patrón ya usado en checkout.js/auth.js para disparar la verificación
    // con IA justo después de guardar.
    const nuevoProductoId = id || crypto.randomUUID();
    const payload = {
      aliado_id: _tiendaAliadoId,
      nombre,
      descripcion: $("#pa-desc")?.value.trim() || null,
      categoria_id: $("#pa-cat")?.value || null,
      precio_normal: valorMoneda($("#pa-precio")) || null,
      precio_descuento: valorMoneda($("#pa-descuento")) || null,
      whatsapp: $("#pa-wa")?.value.trim() || null,
      fecha_fin: $("#pa-fecha")?.value || null,
      stock: $("#pa-stock")?.value !== "" ? parseInt($("#pa-stock").value) : null,
      imagenes,
      imagen_url: imagenes[0] || null,
      estado: "pendiente",
    };
    const { error } = id
      ? await supabase.from("productos_aliado").update(payload).eq("id", id)
      : await supabase.from("productos_aliado").insert({ id: nuevoProductoId, ...payload });
    if (error) { toast("Error: " + error.message); btn.disabled = false; btn.textContent = id ? "Guardar cambios" : "Agregar producto"; return; }
    if (esNuevoProducto) { try { localStorage.removeItem(BORRADOR_PRODUCTO_KEY); } catch {} }
    cerrarModalTienda();
    toast(id ? "Producto actualizado — vuelve a quedar en revisión" : "Producto agregado — queda en revisión");
    cargarMisProductos(_tiendaAliadoId);

    // Verificación automática de la foto con IA -- no bloquea nada (el
    // aliado ya ve su producto "en revisión"), pero si todo cuadra lo
    // publica solo y se refresca la lista para que se vea el cambio.
    if (imagenes[0]) {
      fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/verificar-producto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producto_id: nuevoProductoId }),
      }).then(() => cargarMisProductos(_tiendaAliadoId)).catch(() => {});
    }
  });
}

const ESTADO_PEDIDO = {
  pendiente:  { c: "#b45309", bg: "#fef3c7", t: "Pendiente de confirmar" },
  confirmado: { c: "#095544", bg: "#e8f5ee", t: "Confirmado" },
  entregado:  { c: "#095544", bg: "#e8f5ee", t: "Entregado" },
  rechazado:  { c: "#c0392b", bg: "#fdecea", t: "Rechazado" },
};

function razonNoAutoConfirmadoPedido(v) {
  if (!v) return "";
  let motivo = "No se verificó solo";
  if (v.motivo === "monto_sobre_tope") motivo = "Monto arriba del tope de auto-confirmación";
  else if (v.motivo === "error_analisis") motivo = "No se pudo analizar el comprobante";
  else if (v.es_comprobante === false) motivo = "La IA no reconoció un comprobante bancario";
  else if (v.senales_edicion === true) motivo = "La IA notó posibles señales de edición";
  else if (v.confianza && v.confianza !== "alta") motivo = "La IA no tuvo confianza suficiente";
  else if (v.monto != null) motivo = "El monto/llave/fecha no coincidieron exacto";
  return `<div style="font-size:11px;color:#999;margin-top:4px" title="${esc(JSON.stringify(v))}">🤖 ${esc(motivo)}</div>`;
}

async function cargarPedidosAliado(aliadoId) {
  const list = $("#tienda-pedidos-list");
  if (!list) return;
  const { data } = await supabase
    .from("pedidos")
    .select("*, verificacion_ia, productos_aliado(nombre)")
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
      ${p.estado === "pendiente" ? razonNoAutoConfirmadoPedido(p.verificacion_ia) : ""}
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

/* ---------- Mi Contabilidad (aliado) ----------
   Tablas propias por negocio_id (negocio_gastos, negocio_ingresos, etc.) --
   nunca las del Club (gastos/ingresos_manuales son de un solo tenant) ni las
   de Mi Tienda (productos_aliado/pedidos son para miembros del Club
   logueados, con comprobante). Ver plan "Mi Contabilidad" para el detalle. */
let _contaNegocioId = null;
let _contaNegocio = null;
let _contaPeriodo = "mes"; // dia | semana | mes | rango
let _contaMes = null;
let _contaRangoDesde = null;
let _contaRangoHasta = null;
let _contaCategoriasGasto = [];
let _contaGastos = [];
let _contaCategoriasIngreso = [];
let _contaIngresos = [];
let _contaFiltroOrigen = "todos";
let _contaCartaProductos = [];
let _contaCartaPedidos = [];
let _contaComentarios = [];
let _contaModGrupos = [];
let _contaModOpciones = [];
let _contaModProdGrupos = [];
let _contaMesas = [];
let _contaInsumos = [];
let _contaRecetaItems = [];
let _contaRecetasPrimarias = [];
let _contaRecetasPrimariasInsumos = [];
let _contaVisitas = [];
let _contaCategoriasOrdenCarta = [];
let _contaAvisosCarta = [];
// Solo se llenan dentro de iniciarContaClubDashboard() -- el dashboard del
// Club (Perfil.html) nunca las toca, así que quedan en null/false y
// aplicarGatesContaClub() no restringe nada ahí.
let _contaClubNivel = null;
let _contaClubImplPagada = false;
let _cartaPedidosRealtimeCh = null;
let _audioCtxPedido = null;
let _pedidosNuevosSinVer = 0;
let _tipoNegocioModalMostrado = false;

// Config por tipo de negocio -- al activar Mi Contabilidad por primera vez
// se le pregunta al aliado qué tipo de negocio tiene, y con eso se le deja
// la carta lista de una vez (color sugerido + categorías típicas de
// ejemplo), sin inventar productos falsos, solo un empujón inicial que
// después puede cambiar como quiera.
// "mesas: false" para los tipos de negocio donde "varias personas en la
// misma mesa" no tiene sentido (un servicio de peluquería/barbería se
// atiende una persona a la vez, una tienda no tiene mesas) -- en esos casos
// se esconde toda la sección de Mesas en vez de dejarla ahí sin usarla. Si
// el negocio todavía no eligió tipo (o eligió "Otro"), se deja visible por
// si acaso, ya que no se sabe si aplica o no.
const TIPOS_NEGOCIO_CARTA = {
  restaurante: { nombre: "Restaurante", color: "#164a2c", categorias: ["Entradas", "Platos fuertes", "Postres", "Bebidas"], mesas: true },
  heladeria:   { nombre: "Heladería", color: "#9d174d", categorias: ["Sabores", "Toppings", "Combos"], mesas: true },
  cafeteria:   { nombre: "Cafetería / Panadería", color: "#92400e", categorias: ["Panes", "Pasteles", "Bebidas calientes", "Bebidas frías"], mesas: true },
  estetica:    { nombre: "Belleza y estética", color: "#86198f", categorias: ["Servicios", "Paquetes", "Productos"], mesas: false },
  barberia:    { nombre: "Barbería", color: "#1e3a5f", categorias: ["Cortes", "Combos", "Productos"], mesas: false },
  tienda:      { nombre: "Tienda / Supermercado", color: "#14532d", categorias: ["Ofertas", "Nuevo"], mesas: false },
  otro:        { nombre: "Otro", color: "#095544", categorias: [], mesas: true },
};

// Modal de bienvenida, una sola vez por negocio (mientras carta_tipo_negocio
// siga sin elegir) -- al confirmar, guarda el tipo Y aplica de una vez el
// color sugerido (tanto el de acento como el del aviso), para que la carta
// no arranque genérica.
function abrirSelectorTipoNegocio() {
  const opciones = Object.entries(TIPOS_NEGOCIO_CARTA).map(([key, t]) => `<option value="${key}">${t.nombre}</option>`).join("");
  abrirModalTienda("¿Qué tipo de negocio tienes?", `
    <p style="font-size:13px;color:var(--tinta-60);line-height:1.5;margin-bottom:14px">Con esto dejamos tu carta lista de una vez: un color sugerido y categorías típicas para tus productos. Lo puedes cambiar después cuando quieras.</p>
    <div class="cfg-campo"><label class="cfg-label">Tipo de negocio</label>
      <select class="cfg-input" id="tn-tipo"><option value="">Selecciona...</option>${opciones}</select>
    </div>
    <button class="btn btn--primario" id="tn-guardar" style="width:100%;justify-content:center">Continuar</button>
  `);
  $("#tn-guardar")?.addEventListener("click", async () => {
    const tipo = $("#tn-tipo")?.value;
    if (!tipo) { toast("Elige un tipo de negocio"); return; }
    const cfg = TIPOS_NEGOCIO_CARTA[tipo];
    const btn = $("#tn-guardar"); btn.disabled = true; btn.textContent = "Guardando…";
    const payload = { carta_tipo_negocio: tipo, carta_color: cfg.color, carta_aviso_color: cfg.color };
    const { error } = await supabase.from("aliados").update(payload).eq("id", _contaNegocioId);
    if (error) { toast("Error: " + error.message); btn.disabled = false; btn.textContent = "Continuar"; return; }
    if (_contaNegocio) Object.assign(_contaNegocio, payload);
    cerrarModalTienda();
    toast(`Listo, dejamos tu carta lista para un negocio tipo ${cfg.nombre.toLowerCase()} ✓`);
    cargarContabilidadNegocio(_contaNegocioId);
  });
}

const ESTADO_PEDIDO_CARTA = {
  pendiente: { c: "#b45309", bg: "#fef3c7", t: "Pendiente", siguiente: "entregado", siguienteLbl: "Marcar entregado" },
  entregado: { c: "#095544", bg: "#e8f5ee", t: "Entregado", siguiente: null,        siguienteLbl: null },
  cancelado: { c: "#c0392b", bg: "#fdecea", t: "Cancelado", siguiente: null,        siguienteLbl: null },
};

// Respaldo para cuando navigator.clipboard falla o no existe (mismo
// problema que ya tapó el botón "Copiar" del pago previo en Registro.html)
// -- sin esto el link del QR podía quedar sin copiar y sin avisar nada.
function copiarTextoConRespaldo(texto) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(texto).catch(() => copiarTextoFallback(texto));
  }
  return Promise.resolve(copiarTextoFallback(texto));
}
function copiarTextoFallback(texto) {
  const ta = document.createElement("textarea");
  ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch {}
  document.body.removeChild(ta);
}

// El atributo "download" de un <a> no sirve de mucho acá: en otro dominio
// (Supabase Storage) casi ningún navegador lo respeta, y en iPhone Safari
// directamente lo ignora para imágenes (abre una vista previa rara en vez
// de guardar). Lo que sí funciona en cualquier celular moderno es el botón
// nativo de "compartir" (deja guardar en Fotos con un toque); si el
// navegador no lo soporta, se abre la imagen sola para guardarla
// manteniéndola presionada, como siempre se ha podido con cualquier foto.
async function descargarImagenComoArchivo(url, nombreArchivo) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const file = new File([blob], nombreArchivo, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch {}
  window.open(url, "_blank");
}

function contaFechaISO(d) { return d.toISOString().slice(0, 10); }
function contaEnRango(fechaISO, desde, hasta) { return !!fechaISO && fechaISO >= desde && fechaISO <= hasta; }

// Devuelve el rango de fechas del periodo elegido (día/semana/mes/rango) y
// el rango equivalente INMEDIATAMENTE ANTERIOR (misma duración), para poder
// comparar "cuánto vs. el periodo pasado" -- mismo patrón que ya usa
// Admin.html para "mes anterior", generalizado a los 4 tipos de periodo.
function calcularRangoConta() {
  const hoy = new Date();
  if (_contaPeriodo === "dia") {
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const d = contaFechaISO(hoy), a = contaFechaISO(ayer);
    return { desde: d, hasta: d, desdeAnt: a, hastaAnt: a };
  }
  if (_contaPeriodo === "semana") {
    const dow = (hoy.getDay() + 6) % 7; // lunes = 0
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - dow);
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    const lunesAnt = new Date(lunes); lunesAnt.setDate(lunes.getDate() - 7);
    const domingoAnt = new Date(lunesAnt); domingoAnt.setDate(lunesAnt.getDate() + 6);
    return { desde: contaFechaISO(lunes), hasta: contaFechaISO(domingo), desdeAnt: contaFechaISO(lunesAnt), hastaAnt: contaFechaISO(domingoAnt) };
  }
  if (_contaPeriodo === "rango") {
    const desde = _contaRangoDesde || contaFechaISO(hoy);
    const hasta = _contaRangoHasta || contaFechaISO(hoy);
    const dias = Math.max(1, Math.round((new Date(hasta) - new Date(desde)) / 86400000) + 1);
    const hastaAntD = new Date(desde); hastaAntD.setDate(hastaAntD.getDate() - 1);
    const desdeAntD = new Date(hastaAntD); desdeAntD.setDate(desdeAntD.getDate() - dias + 1);
    return { desde, hasta, desdeAnt: contaFechaISO(desdeAntD), hastaAnt: contaFechaISO(hastaAntD) };
  }
  // "mes" (por defecto)
  const ym = _contaMes || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const [yy, mm] = ym.split("-").map(Number);
  const ultimoDia = new Date(yy, mm, 0).getDate();
  const mesAntYm = mm === 1 ? `${yy - 1}-12` : `${yy}-${String(mm - 1).padStart(2, "0")}`;
  const [yyA, mmA] = mesAntYm.split("-").map(Number);
  const ultimoDiaAnt = new Date(yyA, mmA, 0).getDate();
  return {
    desde: `${ym}-01`, hasta: `${ym}-${String(ultimoDia).padStart(2, "0")}`,
    desdeAnt: `${mesAntYm}-01`, hastaAnt: `${mesAntYm}-${String(ultimoDiaAnt).padStart(2, "0")}`,
  };
}

function pctChipConta(actual, anterior) {
  if (!anterior) return "";
  const pct = Math.round((actual - anterior) / anterior * 100);
  return `<span style="color:${pct >= 0 ? "#0E7A3E" : "#B23B2E"}">${pct >= 0 ? "+" : ""}${pct}% vs. anterior</span>`;
}

// Dos tonos cortos generados con Web Audio (sin archivo de sonido que
// cargar) para avisar un pedido nuevo de la carta. El AudioContext se crea
// la primera vez dentro de cargarContabilidadNegocio, en la misma llamada
// síncrona que dispara el clic de la pestaña "Mi Contabilidad" -- eso
// "desbloquea" el audio para el resto de la sesión, porque los navegadores
// exigen que el primer sonido salga en respuesta a un gesto real del
// usuario; sin este truco, el sonido de un pedido que llega después (vía
// Realtime, sin ningún clic de por medio) se quedaría mudo en iOS/Chrome.
function obtenerAudioCtxPedido() {
  if (!_audioCtxPedido) {
    try { _audioCtxPedido = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (_audioCtxPedido.state === "suspended") _audioCtxPedido.resume().catch(() => {});
  return _audioCtxPedido;
}
function reproducirSonidoPedido() {
  const ctx = obtenerAudioCtxPedido();
  if (!ctx) return;
  const tono = (freq, inicio, dur) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + inicio);
    gain.gain.setValueAtTime(0.18, ctx.currentTime + inicio);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + dur);
    osc.start(ctx.currentTime + inicio);
    osc.stop(ctx.currentTime + inicio + dur);
  };
  tono(880, 0, 0.35);
  tono(1180, 0.18, 0.3);
}

// Voz "Nuevo pedido" con la API de síntesis de voz del navegador (sin
// archivo de audio). Igual que el AudioContext, la primera vez que se usa
// speechSynthesis.speak() tiene que pasar en respuesta a un gesto real del
// usuario para que no quede muda luego -- por eso se "calienta" con un
// decir vacío (volumen 0) en el mismo punto donde se desbloquea el audio.
function desbloquearVozPedido() {
  try {
    if (!("speechSynthesis" in window)) return;
    const utterVacio = new SpeechSynthesisUtterance("");
    utterVacio.volume = 0;
    speechSynthesis.speak(utterVacio);
  } catch {}
}
function anunciarPedidoNuevo() {
  try {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance("Nuevo pedido");
    utter.lang = "es-CO";
    speechSynthesis.speak(utter);
  } catch {}
}

// Banner fijo arriba de la pantalla -- a diferencia de un toast, se queda
// puesto hasta que el negocio lo vea de verdad (lo cierra o entra a ver el
// pedido), igual de persistente que el banner de "No pudimos cargar tu
// cuenta" (mostrarErrorCargaDash) que ya existe para errores de carga.
function mostrarBannerPedidoNuevo() {
  _pedidosNuevosSinVer++;
  const texto = _pedidosNuevosSinVer > 1 ? `🧾 ¡${_pedidosNuevosSinVer} pedidos nuevos de la carta!` : "🧾 ¡Nuevo pedido de la carta!";
  let banner = document.getElementById("conta-banner-pedido");
  if (banner) { const span = banner.querySelector("span"); if (span) span.textContent = texto; return; }
  banner = document.createElement("div");
  banner.id = "conta-banner-pedido";
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#095544;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.15)";
  banner.innerHTML = `
    <span>${texto}</span>
    <button id="conta-banner-pedido-ver" type="button" style="background:#fff;color:#095544;border:none;padding:8px 16px;border-radius:20px;font-weight:700;cursor:pointer">Ver pedido</button>
    <button id="conta-banner-pedido-cerrar" type="button" aria-label="Cerrar" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;padding:4px">✕</button>
  `;
  document.body.prepend(banner);
  const cerrar = () => { banner.remove(); _pedidosNuevosSinVer = 0; };
  document.getElementById("conta-banner-pedido-cerrar").addEventListener("click", cerrar);
  document.getElementById("conta-banner-pedido-ver").addEventListener("click", () => {
    cerrar();
    document.querySelector('#contasub-nav [data-contasub="pedido"]')?.click();
    document.getElementById("conta-carta-pedidos-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// Suscripción en vivo a pedidos nuevos de la carta -- apenas alguien manda
// un pedido por el QR, aparece solo en la lista (sin recargar la página) y
// suena un aviso. Una sola suscripción por sesión (igual que
// suscribirPlanRealtime), filtrada por este negocio.
function suscribirPedidosCartaRealtime(negocioId) {
  if (_cartaPedidosRealtimeCh) return;
  _cartaPedidosRealtimeCh = supabase.channel("carta-pedidos-" + negocioId)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "negocio_carta_pedidos", filter: `negocio_id=eq.${negocioId}` }, async (payload) => {
      // Un pedido "manual" lo acaba de digitar el propio negocio desde
      // "Nuevo pedido" -- no tiene sentido avisarle a sí mismo con sonido,
      // voz y el banner "¡Nuevo pedido de la carta!" (ni es de la carta).
      if (payload.new?.origen !== "manual") {
        reproducirSonidoPedido();
        anunciarPedidoNuevo();
        mostrarBannerPedidoNuevo();
      }
      const { data } = await supabase.from("negocio_carta_pedidos").select("*").eq("negocio_id", negocioId).order("created_at", { ascending: false }).limit(100);
      _contaCartaPedidos = data || [];
      cargarCartaPedidos();
    })
    .subscribe();
}

// Categorías distintas ya usadas en los productos de la carta (sin "Otros",
// que siempre va al final sin excepción, no tiene sentido ordenarla a mano).
function categoriasDisponiblesCarta() {
  const set = new Set();
  _contaCartaProductos.forEach(p => { const c = (p.categoria || "").trim(); if (c) set.add(c); });
  return [...set];
}

// Lista reordenable (subir/bajar) de categorías -- arranca del orden que el
// negocio ya haya guardado, y le agrega al final cualquier categoría nueva
// que todavía no estuviera ahí (ej. porque acaba de agregar un producto con
// una categoría distinta).
// "carta_categorias_orden" ahora guarda objetos {nombre, color} en vez de
// solo el nombre -- esta pareja de funciones deja leer negocios viejos que
// todavía tengan el arreglo de puros strings guardado, sin romper nada.
function catOrdenNombre(c) { return typeof c === "string" ? c : c?.nombre; }
function catOrdenColor(c) { return (typeof c === "string" ? null : c?.color) || null; }

function renderOrdenCategoriasCarta() {
  const cont = $("#conta-carta-cat-orden");
  if (!cont) return;
  const disponibles = categoriasDisponiblesCarta();
  const guardado = Array.isArray(_contaNegocio.carta_categorias_orden) ? _contaNegocio.carta_categorias_orden : [];
  if (!_contaCategoriasOrdenCarta.length) {
    _contaCategoriasOrdenCarta = guardado
      .filter(c => disponibles.includes(catOrdenNombre(c)))
      .map(c => ({ nombre: catOrdenNombre(c), color: catOrdenColor(c) }));
  } else {
    _contaCategoriasOrdenCarta = _contaCategoriasOrdenCarta.filter(c => disponibles.includes(c.nombre));
  }
  disponibles.forEach(cat => {
    if (!_contaCategoriasOrdenCarta.some(c => c.nombre === cat)) _contaCategoriasOrdenCarta.push({ nombre: cat, color: null });
  });

  if (!_contaCategoriasOrdenCarta.length) { cont.innerHTML = `<p style="font-size:12.5px;color:#999">Todavía no usas categorías en tus productos.</p>`; return; }
  cont.innerHTML = _contaCategoriasOrdenCarta.map((c, i) => `
    <div style="display:flex;align-items:center;gap:8px;background:var(--crema-2);border-radius:8px;padding:8px 10px;flex-wrap:wrap">
      <span style="flex:1;font-size:13px;font-weight:600;min-width:90px">${esc(c.nombre)}</span>
      <input type="color" data-cat-color="${i}" value="${c.color || "#095544"}" title="Color de esta categoría" style="width:32px;height:32px;padding:0;border:1px solid var(--linea-fuerte);border-radius:6px;flex:none;cursor:pointer">
      <input type="text" data-cat-color-hex="${i}" value="${c.color || ""}" placeholder="#095544" style="width:92px;flex:none;padding:7px 8px;border:1px solid var(--linea-fuerte);border-radius:6px;font-size:12px">
      <button type="button" data-cat-subir="${i}" ${i === 0 ? "disabled" : ""} style="border:none;background:none;cursor:pointer;opacity:${i === 0 ? ".3" : "1"}">${ic("chevron-up")}</button>
      <button type="button" data-cat-bajar="${i}" ${i === _contaCategoriasOrdenCarta.length - 1 ? "disabled" : ""} style="border:none;background:none;cursor:pointer;opacity:${i === _contaCategoriasOrdenCarta.length - 1 ? ".3" : "1"}">${ic("chevron-down")}</button>
    </div>`).join("");
  if (window.lucide) lucide.createIcons();
  cont.querySelectorAll("[data-cat-subir]").forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.catSubir;
    if (i > 0) {
      [_contaCategoriasOrdenCarta[i - 1], _contaCategoriasOrdenCarta[i]] = [_contaCategoriasOrdenCarta[i], _contaCategoriasOrdenCarta[i - 1]];
      renderOrdenCategoriasCarta();
    }
  }));
  cont.querySelectorAll("[data-cat-bajar]").forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.catBajar;
    if (i < _contaCategoriasOrdenCarta.length - 1) {
      [_contaCategoriasOrdenCarta[i + 1], _contaCategoriasOrdenCarta[i]] = [_contaCategoriasOrdenCarta[i], _contaCategoriasOrdenCarta[i + 1]];
      renderOrdenCategoriasCarta();
    }
  }));
  // El selector nativo y el campo de texto se mantienen sincronizados entre
  // sí -- así quien prefiera pegar un código de color a mano (de su manual
  // de marca, por ejemplo) no tiene que usar la ruedita de colores.
  cont.querySelectorAll("[data-cat-color]").forEach(input => input.addEventListener("input", () => {
    const i = +input.dataset.catColor;
    _contaCategoriasOrdenCarta[i].color = input.value;
    const hexInput = cont.querySelector(`[data-cat-color-hex="${i}"]`);
    if (hexInput) hexInput.value = input.value;
  }));
  cont.querySelectorAll("[data-cat-color-hex]").forEach(input => input.addEventListener("input", () => {
    const i = +input.dataset.catColorHex;
    let v = input.value.trim();
    if (v && !v.startsWith("#")) v = "#" + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      _contaCategoriasOrdenCarta[i].color = v;
      const colorInput = cont.querySelector(`[data-cat-color="${i}"]`);
      if (colorInput) colorInput.value = v;
    }
  }));
}

// Lista editable de avisos (título + subtítulo cada uno) -- si hay más de
// uno, en la carta se ven como un carrusel (mismo patrón que el banner de
// "Tienda del Club", .tienda-hero/.tienda-banner-track/.tienda-banner-dots).
function renderAvisosCarta() {
  const cont = $("#conta-carta-avisos-lista");
  if (!cont) return;
  if (!_contaAvisosCarta.length) _contaAvisosCarta = [{ titulo: "", subtitulo: "" }];
  cont.innerHTML = _contaAvisosCarta.map((a, i) => `
    <div style="background:#fff;border:1px solid var(--linea);border-radius:10px;padding:10px;margin-bottom:8px">
      <input class="cfg-input" data-aviso-titulo="${i}" type="text" placeholder="Título (ej: Hoy solo domicilios)" value="${esc(a.titulo || "")}" style="margin-bottom:6px">
      <input class="cfg-input" data-aviso-subtitulo="${i}" type="text" placeholder="Texto más chico (opcional)" value="${esc(a.subtitulo || "")}" style="margin-bottom:6px">
      <input class="cfg-input" data-aviso-link="${i}" type="url" placeholder="Link al tocarlo (opcional, ej: tu Instagram)" value="${esc(a.link || "")}">
      ${_contaAvisosCarta.length > 1 ? `<button type="button" data-aviso-quitar="${i}" style="margin-top:6px;border:none;background:none;color:#c0392b;font-size:12px;cursor:pointer">Quitar este aviso</button>` : ""}
    </div>`).join("");
  cont.querySelectorAll("[data-aviso-titulo]").forEach(inp => inp.oninput = (e) => { _contaAvisosCarta[+e.target.dataset.avisoTitulo].titulo = e.target.value; aplicarPreviewCarta(); });
  cont.querySelectorAll("[data-aviso-subtitulo]").forEach(inp => inp.oninput = (e) => { _contaAvisosCarta[+e.target.dataset.avisoSubtitulo].subtitulo = e.target.value; aplicarPreviewCarta(); });
  cont.querySelectorAll("[data-aviso-link]").forEach(inp => inp.oninput = (e) => { _contaAvisosCarta[+e.target.dataset.avisoLink].link = e.target.value; aplicarPreviewCarta(); });
  cont.querySelectorAll("[data-aviso-quitar]").forEach(btn => btn.onclick = () => { _contaAvisosCarta.splice(+btn.dataset.avisoQuitar, 1); renderAvisosCarta(); aplicarPreviewCarta(); });
}

// "Pincha" los colores/avisos en vivo dentro del iframe de la vista previa
// (mismo origen que Perfil.html, así que se puede tocar su DOM directo, sin
// postMessage) -- nada de esto toca la base de datos todavía.
function aplicarPreviewCarta() {
  const iframe = $("#conta-carta-preview");
  let doc;
  try { doc = iframe?.contentWindow?.document; } catch { return; }
  if (!doc || !doc.documentElement) return;
  const root = doc.documentElement;
  root.style.setProperty("--verde", $("#conta-carta-color")?.value || "#095544");
  root.style.setProperty("--carta-tarjeta-bg", $("#conta-carta-color-tarjeta")?.value || "#ffffff");
  root.style.setProperty("--carta-tarjeta-borde", $("#conta-carta-color-borde")?.value || "#e5e5e5");
  root.style.setProperty("--carta-pedido-bg", $("#conta-carta-color-pedido")?.value || "#ffffff");

  const avisoWrap = doc.getElementById("carta-aviso-wrap");
  const avisoTrack = doc.getElementById("carta-aviso-track");
  const avisoDots = doc.getElementById("carta-aviso-dots");
  if (avisoWrap && avisoTrack) {
    const activo = $("#conta-carta-aviso-activo")?.checked;
    const colorBase = $("#conta-carta-aviso-color")?.value || "#164a2c";
    const avisosValidos = _contaAvisosCarta.filter(a => a.titulo?.trim());
    if (activo && avisosValidos.length) {
      avisoWrap.hidden = false;
      avisoTrack.innerHTML = avisosValidos.map(a => `
        <div class="tienda-hero" style="background:radial-gradient(120% 140% at 15% 0%, ${colorBase} 0%, #0c2e1b 55%, #05160d 100%)">
          <span class="tienda-hero__eyebrow">Aviso</span>
          <h2>${esc(a.titulo)}</h2>
          ${a.subtitulo ? `<p>${esc(a.subtitulo)}</p>` : ""}
        </div>`).join("");
      if (avisosValidos.length > 1 && avisoDots) { avisoDots.innerHTML = avisosValidos.map((_, i) => `<span class="${i === 0 ? "is-on" : ""}"></span>`).join(""); avisoDots.style.display = ""; }
      else if (avisoDots) avisoDots.style.display = "none";
    } else {
      avisoWrap.hidden = true;
    }
  }
}

// Bootstrap del dashboard de ContaClub (contaclub.online) -- cuentas de
// negocio propias, sin pasar por la membresía del Club. Todo lo demás de
// este archivo (cargarContabilidadNegocio y el resto de Mi Contabilidad) se
// reusa tal cual; esto solo reemplaza el arranque del dashboard de miembro.
async function iniciarContaClubDashboard() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.href = "login.html"; return; }
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre").eq("id", session.user.id).maybeSingle();
  if (perfil?.rol !== "aliado") {
    await supabase.auth.signOut();
    location.href = "login.html";
    return;
  }
  const { data: negocio } = await supabase.from("aliados").select("id, nombre, imagen_url, contaclub_plan_id, contaclub_activo, contaclub_implementacion_pagada").eq("user_id", session.user.id).maybeSingle();
  if (!negocio) {
    const root = document.getElementById("contaclub-root");
    if (root) root.innerHTML = `<p style="padding:40px 20px;text-align:center;color:#c0392b">No encontramos un negocio vinculado a esta cuenta. Escríbenos si crees que es un error.</p>`;
    return;
  }
  // Planes con mensualidad fija (Básico/Pro) nacen con esto en false (ver
  // activacion.js) hasta que el Admin apruebe el comprobante del primer
  // pago -- mientras tanto, nada del panel es visible, solo este mensaje.
  if (negocio.contaclub_activo === false) {
    const root = document.getElementById("contaclub-root");
    if (root) root.innerHTML = `
      <div style="max-width:420px;margin:60px auto;padding:0 20px;text-align:center">
        <h2 style="font-family:'Space Grotesk',sans-serif;margin-bottom:10px">Tu cuenta está pendiente de activación</h2>
        <p style="color:#5C6C61;line-height:1.5;margin-bottom:20px">Ya recibimos tu registro. Estamos revisando tu comprobante de pago -- en cuanto lo confirmemos, tu panel queda disponible.</p>
        <a href="pagar-implementacion.html" style="color:#0E6B52;font-weight:600;text-decoration:none">Ver de nuevo los datos de pago</a>
        <div style="margin-top:28px"><button type="button" id="contaclub-root-salir" style="border:none;background:none;color:#5C6C61;cursor:pointer;font-size:13px;text-decoration:underline">Salir</button></div>
      </div>`;
    document.getElementById("contaclub-root-salir")?.addEventListener("click", async () => { await supabase.auth.signOut(); location.href = "login.html"; });
    return;
  }
  _contaClubImplPagada = !!negocio.contaclub_implementacion_pagada;
  // Sin plan asignado todavía (recién registrado, Admin no lo ha
  // configurado) = acceso completo -- nunca se bloquea a nadie por un dato
  // que todavía no existe.
  _contaClubNivel = 2;
  if (negocio.contaclub_plan_id) {
    const { data: plan } = await supabase.from("contaclub_planes").select("nivel").eq("id", negocio.contaclub_plan_id).maybeSingle();
    if (plan?.nivel) _contaClubNivel = plan.nivel;
  }
  aplicarGatesContaClub();
  const nombreEl = document.getElementById("contaclub-negocio-nombre");
  if (nombreEl) nombreEl.textContent = negocio.nombre;
  const logoEl = document.getElementById("contaclub-logo");
  if (logoEl && negocio.imagen_url) logoEl.innerHTML = `<img src="${esc(negocio.imagen_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
  const salirBtn = document.getElementById("contaclub-salir");
  if (salirBtn) salirBtn.addEventListener("click", async () => { await supabase.auth.signOut(); location.href = "login.html"; });
  cargarContabilidadNegocio(negocio.id);
}

// Restricciones reales por plan de ContaClub (Básico/Pro/Premium) -- nunca
// corre para el dashboard del Club (_contaClubNivel sigue null ahí). Nivel
// 1 = Básico: sin carta pública/QR (apariencia, mesas, promociones y
// avisos, comentarios) ni Métricas, pero SÍ catálogo de productos (lo
// necesita "Nuevo pedido" en mostrador) y Fidelización. Costos se bloquea
// aparte, por haber pagado o no la implementación, sin importar el plan.
function aplicarGatesContaClub() {
  if (_contaClubNivel === null) return;
  const sinCartaPublica = _contaClubNivel === 1;
  ["apariencia", "mesas", "promos", "comentarios"].forEach(id => {
    const fila = $(`[data-carta-ir="${id}"]`);
    // Mismo motivo que ya explica cargarMesas() más abajo: .carta-fila/
    // .cc-hub-fila fijan su propio "display" en la hoja de estilos, así que
    // [hidden] solo no les gana -- hay que apagarlas por display directo.
    if (fila) fila.style.display = sinCartaPublica ? "none" : "";
    const panel = $(`#carta-seccion-${id}`);
    if (panel) panel.hidden = sinCartaPublica;
  });
  const metricasBtn = $('[data-contasub="metricas"]');
  if (metricasBtn) metricasBtn.style.display = sinCartaPublica ? "none" : "";
  const costosBtn = $('[data-contasub="costos"]');
  if (costosBtn) costosBtn.style.display = _contaClubImplPagada ? "" : "none";

  const hub = $("#carta-hub");
  if (hub) {
    let hint = document.getElementById("carta-hub-nivel-hint");
    if (sinCartaPublica) {
      if (!hint) {
        hint = document.createElement("p");
        hint.id = "carta-hub-nivel-hint";
        hint.style.cssText = "font-size:12.5px;color:var(--tinta-45);margin:0 0 14px";
        hint.textContent = "Apariencia, Mesas, Promociones y avisos, y Comentarios están disponibles desde el plan Pro.";
        hub.insertBefore(hint, hub.children[1] || null);
      }
      hint.style.display = "";
    } else if (hint) {
      hint.style.display = "none";
    }
  }
}

async function cargarContabilidadNegocio(negocioId) {
  _contaNegocioId = negocioId;
  obtenerAudioCtxPedido();
  desbloquearVozPedido();
  suscribirPedidosCartaRealtime(negocioId);
  const hoy = new Date();
  if (!_contaMes) _contaMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const mesInput = $("#conta-mes");
  if (mesInput) {
    mesInput.value = _contaMes;
    mesInput.hidden = _contaPeriodo !== "mes";
    mesInput.onchange = (e) => { if (e.target.value) { _contaMes = e.target.value; renderContabilidadNegocioUI(); } };
  }
  const rangoWrap = $("#conta-rango-wrap"); if (rangoWrap) rangoWrap.hidden = _contaPeriodo !== "rango";
  const rDesde = $("#conta-rango-desde"); if (rDesde) rDesde.onchange = (e) => { _contaRangoDesde = e.target.value; renderContabilidadNegocioUI(); };
  const rHasta = $("#conta-rango-hasta"); if (rHasta) rHasta.onchange = (e) => { _contaRangoHasta = e.target.value; renderContabilidadNegocioUI(); };
  $$("#conta-periodo-filtro [data-periodo]").forEach(b => {
    b.classList.toggle("is-on", b.dataset.periodo === _contaPeriodo);
    b.onclick = () => {
      _contaPeriodo = b.dataset.periodo;
      $$("#conta-periodo-filtro [data-periodo]").forEach(x => x.classList.toggle("is-on", x === b));
      if (mesInput) mesInput.hidden = _contaPeriodo !== "mes";
      if (rangoWrap) rangoWrap.hidden = _contaPeriodo !== "rango";
      renderContabilidadNegocioUI();
    };
  });
  $$("#contasub-nav [data-contasub]").forEach(b => {
    b.onclick = () => {
      $$("#contasub-nav [data-contasub]").forEach(x => x.classList.toggle("is-on", x === b));
      ["balance", "pedido", "fidelizacion", "carta", "gasto", "costos", "metricas"].forEach(s => { const el = $(`#contasub-${s}`); if (el) el.style.display = s === b.dataset.contasub ? "" : "none"; });
      // Siempre entra al hub de "Carta", nunca dejado a mitad de una
      // sección de la visita anterior -- más predecible.
      if (b.dataset.contasub === "carta") mostrarCartaSeccion(null);
    };
  });

  const hace90Dias = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: negocio }, { data: catsG }, { data: gastos }, { data: catsI }, { data: ingresos }, { data: cartaProd }, { data: cartaPed }, { data: modGrupos }, { data: modOpciones }, { data: modProdGrupos }, { data: mesas }, { data: comentarios }, { data: insumos }, { data: recetaItems }, { data: visitas }, { data: recetasPrimarias }, { data: recetasPrimariasInsumos }] = await Promise.all([
    supabase.from("aliados").select("imagen_url, instagram, carta_color, carta_portada_url, carta_sellos_activo, carta_sellos_meta, carta_sellos_premio_tipo, carta_sellos_premio_desc, tienda_llave_pago, carta_color_tarjeta, carta_color_borde, carta_color_pedido, carta_categorias_orden, carta_aviso_activo, carta_avisos, carta_aviso_color, carta_tipo_negocio, carta_precio_desde, carta_costo_operativo_pct, carta_bienvenida_mensaje").eq("id", negocioId).maybeSingle(),
    supabase.from("negocio_categorias_gasto").select("*").eq("negocio_id", negocioId).order("nombre"),
    supabase.from("negocio_gastos").select("*, negocio_categorias_gasto(nombre)").eq("negocio_id", negocioId).order("fecha", { ascending: false }),
    supabase.from("negocio_categorias_ingreso").select("*").eq("negocio_id", negocioId).order("nombre"),
    supabase.from("negocio_ingresos").select("*, negocio_categorias_ingreso(nombre)").eq("negocio_id", negocioId).order("fecha", { ascending: false }),
    supabase.from("negocio_carta_productos").select("*").eq("negocio_id", negocioId).order("orden"),
    supabase.from("negocio_carta_pedidos").select("*").eq("negocio_id", negocioId).order("created_at", { ascending: false }).limit(100),
    supabase.from("negocio_carta_grupos_mod").select("*").eq("negocio_id", negocioId).order("orden"),
    supabase.from("negocio_carta_opciones_mod").select("*").eq("negocio_id", negocioId).order("orden"),
    supabase.from("negocio_carta_producto_grupos").select("*").eq("negocio_id", negocioId),
    supabase.from("negocio_mesas").select("*").eq("negocio_id", negocioId).order("orden"),
    supabase.from("negocio_carta_comentarios").select("*, negocio_carta_productos(nombre)").eq("negocio_id", negocioId).order("created_at", { ascending: false }),
    supabase.from("negocio_insumos").select("*").eq("negocio_id", negocioId).order("nombre"),
    supabase.from("negocio_carta_producto_insumos").select("*").eq("negocio_id", negocioId),
    supabase.from("negocio_carta_visitas").select("created_at").eq("negocio_id", negocioId).gte("created_at", hace90Dias),
    supabase.from("negocio_recetas_primarias").select("*").eq("negocio_id", negocioId).order("nombre"),
    supabase.from("negocio_recetas_primarias_insumos").select("*").eq("negocio_id", negocioId),
  ]);

  _contaNegocio = negocio || {};
  _contaCategoriasGasto = catsG || [];
  _contaGastos = gastos || [];
  _contaCategoriasIngreso = catsI || [];
  _contaIngresos = ingresos || [];
  _contaCartaProductos = cartaProd || [];
  _contaCartaPedidos = cartaPed || [];
  _contaModGrupos = modGrupos || [];
  _contaModOpciones = modOpciones || [];
  _contaModProdGrupos = modProdGrupos || [];
  _contaMesas = mesas || [];
  _contaComentarios = comentarios || [];
  _contaInsumos = insumos || [];
  _contaRecetaItems = recetaItems || [];
  _contaRecetasPrimarias = recetasPrimarias || [];
  _contaRecetasPrimariasInsumos = recetasPrimariasInsumos || [];
  _contaVisitas = visitas || [];
  await renovarGastosRecurrentes();

  // Primera vez que este negocio abre la pestaña: siembra categorías
  // típicas para que no arranque vacío -- solo pasa una vez, porque en la
  // siguiente carga ya no estarán vacías.
  if (!_contaCategoriasGasto.length) {
    const defaults = ["Inventario", "Nómina", "Arriendo", "Servicios públicos", "Transporte", "Publicidad", "Mantenimiento", "Otros"].map(nombre => ({ negocio_id: negocioId, nombre }));
    const { data: creadas } = await supabase.from("negocio_categorias_gasto").insert(defaults).select();
    _contaCategoriasGasto = creadas || [];
  }
  if (!_contaCategoriasIngreso.length) {
    const defaults = ["Ventas", "Servicios", "Otros"].map(nombre => ({ negocio_id: negocioId, nombre }));
    const { data: creadas } = await supabase.from("negocio_categorias_ingreso").insert(defaults).select();
    _contaCategoriasIngreso = creadas || [];
  }

  // QR de la carta -- mismo patrón que generarQR (imagen de qrserver, sin librería).
  // location.origin, no un dominio fijo -- este mismo dashboard.js también
  // corre desde contaclub.online (ver iniciarContaClubDashboard arriba), y
  // ahí el QR tiene que apuntar a SU carta, no a la de El Club de la Gente.
  const cartaUrl = `${location.origin}/Carta.html?aliado=${negocioId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(cartaUrl)}`;
  const qrImg = $("#conta-carta-qr"); if (qrImg) qrImg.src = qrSrc;
  const qrDescargar = $("#conta-carta-descargar"); if (qrDescargar) qrDescargar.href = qrSrc;
  const btnCopiar = $("#conta-carta-copiar");
  if (btnCopiar) btnCopiar.onclick = () => copiarTextoConRespaldo(cartaUrl).then(() => toast("Link copiado ✓"));

  // QR de registro de clientes para el mostrador (ver Cliente.html/cliente.js)
  // -- mismo patrón que el de arriba, apunta a Cliente.html en vez de Carta.html.
  const clienteUrl = `${location.origin}/Cliente.html?aliado=${negocioId}`;
  const clienteQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(clienteUrl)}`;
  const clienteQrImg = $("#conta-cliente-qr"); if (clienteQrImg) clienteQrImg.src = clienteQrSrc;
  const clienteQrDescargar = $("#conta-cliente-descargar"); if (clienteQrDescargar) clienteQrDescargar.href = clienteQrSrc;
  const btnClienteCopiar = $("#conta-cliente-copiar");
  if (btnClienteCopiar) btnClienteCopiar.onclick = () => copiarTextoConRespaldo(clienteUrl).then(() => toast("Link copiado ✓"));
  const colorInput = $("#conta-carta-color"); if (colorInput) colorInput.value = _contaNegocio.carta_color || "#095544";
  const logoUrlInput = $("#conta-carta-logo-url"); if (logoUrlInput) logoUrlInput.value = _contaNegocio.imagen_url || "";
  const instagramInput = $("#conta-carta-instagram"); if (instagramInput) instagramInput.value = _contaNegocio.instagram || "";
  const logoPreview = $("#conta-carta-logo-preview");
  if (logoPreview) { if (_contaNegocio.imagen_url) { logoPreview.src = _contaNegocio.imagen_url; logoPreview.style.display = ""; } else { logoPreview.style.display = "none"; } }
  const portadaUrlInput = $("#conta-carta-portada-url"); if (portadaUrlInput) portadaUrlInput.value = _contaNegocio.carta_portada_url || "";
  const sellosActivoInput = $("#conta-carta-sellos-activo"); if (sellosActivoInput) sellosActivoInput.checked = !!_contaNegocio.carta_sellos_activo;
  const sellosMetaInput = $("#conta-carta-sellos-meta"); if (sellosMetaInput) sellosMetaInput.value = _contaNegocio.carta_sellos_meta || 10;
  const sellosTipoInput = $("#conta-carta-sellos-tipo"); if (sellosTipoInput) sellosTipoInput.value = _contaNegocio.carta_sellos_premio_tipo || "descuento";
  const sellosPremioInput = $("#conta-carta-sellos-premio"); if (sellosPremioInput) sellosPremioInput.value = _contaNegocio.carta_sellos_premio_desc || "";
  const llaveInput = $("#conta-carta-llave"); if (llaveInput) llaveInput.value = _contaNegocio.tienda_llave_pago || "";
  const llaveQrUrlInput = $("#conta-carta-llave-qr-url"); if (llaveQrUrlInput) llaveQrUrlInput.value = _contaNegocio.tienda_llave_qr_url || "";
  const llaveQrPreview = $("#conta-carta-llave-qr-preview");
  const llaveQrDescargar = $("#conta-carta-llave-qr-descargar");
  if (llaveQrPreview) {
    if (_contaNegocio.tienda_llave_qr_url) {
      llaveQrPreview.src = _contaNegocio.tienda_llave_qr_url; llaveQrPreview.style.display = "block";
      if (llaveQrDescargar) { llaveQrDescargar.href = _contaNegocio.tienda_llave_qr_url; llaveQrDescargar.style.display = "inline-flex"; }
    } else {
      llaveQrPreview.style.display = "none";
      if (llaveQrDescargar) llaveQrDescargar.style.display = "none";
    }
  }
  if (llaveQrDescargar) llaveQrDescargar.onclick = (e) => {
    e.preventDefault();
    const url = $("#conta-carta-llave-qr-url")?.value;
    if (url) descargarImagenComoArchivo(url, "qr-de-pago.png");
  };
  const colorTarjetaInput = $("#conta-carta-color-tarjeta"); if (colorTarjetaInput) colorTarjetaInput.value = _contaNegocio.carta_color_tarjeta || "#ffffff";
  const colorBordeInput = $("#conta-carta-color-borde"); if (colorBordeInput) colorBordeInput.value = _contaNegocio.carta_color_borde || "#e5e5e5";
  const colorPedidoInput = $("#conta-carta-color-pedido"); if (colorPedidoInput) colorPedidoInput.value = _contaNegocio.carta_color_pedido || "#ffffff";
  const avisoActivoInput = $("#conta-carta-aviso-activo"); if (avisoActivoInput) avisoActivoInput.checked = !!_contaNegocio.carta_aviso_activo;
  const precioDesdeInput = $("#conta-carta-precio-desde"); if (precioDesdeInput) precioDesdeInput.checked = !!_contaNegocio.carta_precio_desde;
  const bienvenidaMensajeInput = $("#conta-carta-bienvenida-mensaje"); if (bienvenidaMensajeInput) bienvenidaMensajeInput.value = _contaNegocio.carta_bienvenida_mensaje || "";
  const avisoColorInput = $("#conta-carta-aviso-color"); if (avisoColorInput) avisoColorInput.value = _contaNegocio.carta_aviso_color || "#164a2c";
  const domicilioActivoInput = $("#conta-carta-domicilio-activo"); if (domicilioActivoInput) domicilioActivoInput.checked = !!_contaNegocio.carta_domicilio_activo;
  const domicilioValorInput = $("#conta-carta-domicilio-valor"); if (domicilioValorInput) domicilioValorInput.value = _contaNegocio.carta_domicilio_valor ? Number(_contaNegocio.carta_domicilio_valor).toLocaleString("es-CO") : "";
  const domicilioMinimoInput = $("#conta-carta-domicilio-minimo"); if (domicilioMinimoInput) domicilioMinimoInput.value = _contaNegocio.carta_domicilio_minimo ? Number(_contaNegocio.carta_domicilio_minimo).toLocaleString("es-CO") : "";
  const domicilioTiempoInput = $("#conta-carta-domicilio-tiempo"); if (domicilioTiempoInput) domicilioTiempoInput.value = _contaNegocio.carta_domicilio_tiempo || "";
  formatearInputMoneda(domicilioValorInput);
  formatearInputMoneda(domicilioMinimoInput);
  // Solo se siembra la primera vez (igual que el orden de categorías) --
  // si ya se armó a mano en esta sesión (ej. se agregó un aviso nuevo), no
  // se vuelve a pisar con lo guardado cada vez que se cambia de pestaña.
  if (!_contaAvisosCarta.length && Array.isArray(_contaNegocio.carta_avisos) && _contaNegocio.carta_avisos.length) {
    _contaAvisosCarta = _contaNegocio.carta_avisos.map(a => ({ titulo: a.titulo || "", subtitulo: a.subtitulo || "", link: a.link || "" }));
  }
  renderAvisosCarta();
  const btnAvisoAdd = $("#conta-carta-aviso-add");
  if (btnAvisoAdd) btnAvisoAdd.onclick = () => { _contaAvisosCarta.push({ titulo: "", subtitulo: "" }); renderAvisosCarta(); };

  // Vista previa en vivo -- un iframe cargando la carta real (se carga una
  // sola vez por sesión), y cada color/aviso se "pincha" directo en su DOM
  // (mismo origen, sin postMessage) apenas cambia el valor -- nada de esto
  // toca la base de datos hasta que se le dé a "Guardar personalización".
  const previewIframe = $("#conta-carta-preview");
  if (previewIframe && !previewIframe.dataset.cargado) {
    previewIframe.src = `Carta.html?aliado=${negocioId}`;
    previewIframe.dataset.cargado = "1";
    previewIframe.addEventListener("load", aplicarPreviewCarta);
  }
  const avisoActivoEl = $("#conta-carta-aviso-activo"); if (avisoActivoEl) avisoActivoEl.oninput = aplicarPreviewCarta;
  ["conta-carta-color", "conta-carta-color-tarjeta", "conta-carta-color-borde", "conta-carta-color-pedido", "conta-carta-aviso-color"].forEach(id => {
    vincularColorHex(id, id + "-hex", aplicarPreviewCarta);
  });

  const btnGastoAdd = $("#conta-gasto-add"); if (btnGastoAdd) btnGastoAdd.onclick = () => abrirFormGastoNegocio();
  const btnIngresoAdd = $("#conta-ingreso-add"); if (btnIngresoAdd) btnIngresoAdd.onclick = () => abrirFormIngresoNegocio();
  const btnGastoCats = $("#conta-gastos-cats"); if (btnGastoCats) btnGastoCats.onclick = () => gestionarCategoriasNegocio("gasto");
  const btnIngresoCats = $("#conta-ingresos-cats"); if (btnIngresoCats) btnIngresoCats.onclick = () => gestionarCategoriasNegocio("ingreso");
  const btnCartaProdAdd = $("#conta-carta-producto-add"); if (btnCartaProdAdd) btnCartaProdAdd.onclick = () => abrirFormProductoCarta();
  const btnModGrupoAdd = $("#conta-mod-grupo-add"); if (btnModGrupoAdd) btnModGrupoAdd.onclick = () => abrirFormModGrupo();
  const btnMesaAdd = $("#conta-mesa-add"); if (btnMesaAdd) btnMesaAdd.onclick = () => abrirFormMesa();
  const btnNuevoPedido = $("#conta-nuevo-pedido-btn"); if (btnNuevoPedido) btnNuevoPedido.onclick = () => abrirConstructorPedido();
  const btnPersonalizar = $("#conta-carta-personalizar-guardar"); if (btnPersonalizar) btnPersonalizar.onclick = () => guardarPersonalizacionCarta(btnPersonalizar);
  const btnPromosGuardar = $("#conta-carta-promos-guardar"); if (btnPromosGuardar) btnPromosGuardar.onclick = () => guardarPersonalizacionCarta(btnPromosGuardar);
  const btnFidelizacionGuardar = $("#conta-fidelizacion-guardar"); if (btnFidelizacionGuardar) btnFidelizacionGuardar.onclick = () => guardarPersonalizacionCarta(btnFidelizacionGuardar);
  wireCartaHub();
  const inputLogo = $("#conta-carta-logo");
  if (inputLogo) inputLogo.onchange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const preview = $("#conta-carta-logo-preview");
    try {
      const comprimido = await comprimirImagen(file);
      if (preview) { preview.src = URL.createObjectURL(comprimido); preview.style.display = ""; }
      const ext = comprimido.name.split(".").pop();
      const path = `carta-logo-${_contaNegocioId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("contenido").upload(path, comprimido, { upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
      const urlInput = $("#conta-carta-logo-url"); if (urlInput) urlInput.value = url;
      if (preview) preview.src = url;
      toast("Logo listo -- dale a \"Guardar personalización\"");
    } catch { toast("Error subiendo el logo"); }
  };

  const inputPortada = $("#conta-carta-portada");
  if (inputPortada) inputPortada.onchange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Vista previa instantánea con la foto elegida, antes de subirla de
    // verdad -- URL.createObjectURL funciona directo en el iframe porque
    // es un <img>/background-image normal, sin esperar la subida.
    try {
      const previewUrl = URL.createObjectURL(file);
      const doc = $("#conta-carta-preview")?.contentWindow?.document;
      const fondoFijoPreview = doc?.getElementById("fondo-fijo");
      if (fondoFijoPreview) {
        fondoFijoPreview.classList.add("con-portada");
        fondoFijoPreview.style.backgroundImage = `linear-gradient(rgba(241,247,246,.45), rgba(241,247,246,.88) 340px), url("${previewUrl}")`;
      }
    } catch {}
    try {
      const comprimido = await comprimirImagen(file);
      const ext = comprimido.name.split(".").pop();
      const path = `carta-portada-${_contaNegocioId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("contenido").upload(path, comprimido, { upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
      const urlInput = $("#conta-carta-portada-url"); if (urlInput) urlInput.value = url;
      toast("Portada lista -- dale a \"Guardar personalización\"");
    } catch { toast("Error subiendo la portada"); }
  };

  const inputLlaveQr = $("#conta-carta-llave-qr");
  if (inputLlaveQr) inputLlaveQr.onchange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const preview = $("#conta-carta-llave-qr-preview");
    if (preview) { preview.src = URL.createObjectURL(file); preview.style.display = "block"; }
    try {
      const comprimido = await comprimirImagen(file);
      const ext = comprimido.name.split(".").pop();
      const path = `carta-llave-qr-${_contaNegocioId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("contenido").upload(path, comprimido, { upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
      const urlInput = $("#conta-carta-llave-qr-url"); if (urlInput) urlInput.value = url;
      const descargar = $("#conta-carta-llave-qr-descargar"); if (descargar) { descargar.href = url; descargar.style.display = "inline-flex"; }
      toast("QR listo -- dale a \"Guardar personalización\"");
    } catch { toast("Error subiendo el QR"); }
  };

  renderContabilidadNegocioUI();
  cargarModGrupos();
  cargarMesas();
  cargarCartaProductos();
  cargarCartaPedidos();
  cargarComentariosCarta();
  mostrarSugerenciaCategorias();
  const operativoPctInput = $("#costos-operativo-pct"); if (operativoPctInput) operativoPctInput.value = _contaNegocio.carta_costo_operativo_pct ?? 0;
  const btnOperativoGuardar = $("#costos-operativo-guardar"); if (btnOperativoGuardar) btnOperativoGuardar.onclick = () => guardarCostoOperativoPct();
  const btnInsumoAdd = $("#costos-insumo-add"); if (btnInsumoAdd) btnInsumoAdd.onclick = () => abrirFormInsumo();
  cargarInsumos();
  const btnPrimariaAdd = $("#costos-primaria-add"); if (btnPrimariaAdd) btnPrimariaAdd.onclick = () => abrirFormRecetaPrimaria();
  cargarRecetasPrimarias();
  cargarCostosProductos();
  cargarMetricas();

  if (!_contaNegocio.carta_tipo_negocio && !_tipoNegocioModalMostrado) {
    _tipoNegocioModalMostrado = true;
    abrirSelectorTipoNegocio();
  }
}

// Debajo de "Productos de mi carta", un recordatorio chiquito con las
// categorías típicas del tipo de negocio elegido (si lo eligieron) -- es
// solo una sugerencia de texto, no crea productos de mentira.
function mostrarSugerenciaCategorias() {
  const el = $("#conta-carta-tipo-hint");
  if (!el) return;
  const cfg = TIPOS_NEGOCIO_CARTA[_contaNegocio.carta_tipo_negocio];
  if (cfg && cfg.categorias.length) {
    el.hidden = false;
    el.textContent = `💡 Para un negocio tipo ${cfg.nombre.toLowerCase()}, te recomendamos usar categorías como: ${cfg.categorias.join(", ")}.`;
  } else {
    el.hidden = true;
  }
}

// Achica la letra de un monto SOLO lo necesario para que quepa en su
// tarjeta -- en vez de truncar o dejar que se salga (un monto no se puede
// cortar con "..." como un texto cualquiera, hay que verlo completo).
// Empieza en el tamaño base (el de la hoja de estilos) y baja de a 1px
// hasta que deje de desbordar, con un piso para que nunca quede ilegible.
function ajustarTamanoStat(el) {
  if (!el) return;
  const BASE = 40, MIN = 20;
  el.style.fontSize = "";
  let fontSize = parseFloat(getComputedStyle(el).fontSize) || BASE;
  while (el.scrollWidth > el.clientWidth && fontSize > MIN) {
    fontSize -= 1;
    el.style.fontSize = fontSize + "px";
  }
}

// Costo de lo vendido en el periodo: cada pedido de la carta (ni cancelado)
// trae sus items con producto_id -- se multiplica cada cantidad por el
// costo de receta de ESE producto (costoInsumosProducto, misma función que
// ya usa la pestaña Costos) + el % operativo del negocio. "created_at" es
// timestamp completo (no solo fecha), así que "hasta" necesita hora de
// cierre del día o contaEnRango excluye el último día del periodo entero.
function calcularCostoVentasPeriodo(desde, hasta) {
  const pct = Number(_contaNegocio.carta_costo_operativo_pct) || 0;
  const hastaConHora = `${hasta}T23:59:59`;
  return _contaCartaPedidos
    .filter(p => p.estado !== "cancelado" && contaEnRango(p.created_at, desde, hastaConHora))
    .reduce((total, p) => {
      const items = Array.isArray(p.items) ? p.items : [];
      return total + items.reduce((s, it) => s + (Number(it.cantidad) || 0) * costoInsumosProducto(it.producto_id) * (1 + pct / 100), 0);
    }, 0);
}

// Desglose "Ingresos -> Costo de ventas -> Utilidad bruta -> Gastos ->
// Utilidad neta", para que se entienda de dónde sale la utilidad neta (el
// stat de arriba) en vez de solo ver el número final. El último renglón
// (utilidad neta) es el mismo valor que #conta-stat-balance -- misma
// cuenta, dos lugares.
function renderDesgloseUtilidad(ingresos, costoVentas, gastos) {
  const cont = $("#conta-utilidad-desglose");
  if (!cont) return;
  const utilidadBruta = ingresos - costoVentas;
  const utilidadNeta = utilidadBruta - gastos;
  const fila = (label, valor, o = {}) => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding:${o.grande ? "16px 0 4px" : "10px 0"};${o.borde ? "border-top:1.5px solid var(--linea-fuerte);margin-top:4px" : ""}">
      <span style="font-size:${o.grande ? "14.5px" : "13px"};font-weight:${o.grande ? 700 : 600};color:${o.muted ? "var(--tinta-60)" : "var(--tinta)"}">${esc(label)}</span>
      <span style="font-family:var(--cuerpo);font-variant-numeric:tabular-nums;letter-spacing:-.01em;font-size:${o.grande ? "26px" : "16px"};font-weight:400;color:${o.color || "var(--tinta)"};white-space:nowrap">${o.signo || ""}${COP(Math.abs(valor))}</span>
    </div>`;
  cont.innerHTML =
    fila("Ingresos", ingresos) +
    fila("Costo de ventas (tus recetas)", costoVentas, { signo: "− ", muted: true, color: "#c0392b" }) +
    fila("Utilidad bruta", utilidadBruta, { borde: true }) +
    fila("Gastos operativos", gastos, { signo: "− ", muted: true, color: "#c0392b" }) +
    fila("Utilidad neta", utilidadNeta, { borde: true, grande: true, color: utilidadNeta >= 0 ? "var(--verde)" : "#c0392b" });
}
function renderGaugeMargen(margenPct) {
  const cont = $("#conta-margen-gauge");
  if (!cont) return;
  const pct = Math.max(0, Math.min(100, margenPct));
  const color = margenPct >= 20 ? "var(--verde)" : margenPct >= 0 ? "#b45309" : "#c0392b";
  cont.innerHTML = `
    <div class="conta-gauge" style="background:conic-gradient(${color} ${pct * 3.6}deg, var(--linea) 0)">
      <span class="conta-gauge__n">${margenPct.toFixed(0)}%</span>
    </div>`;
}

function renderContabilidadNegocioUI() {
  const { desde, hasta, desdeAnt, hastaAnt } = calcularRangoConta();
  const gastosPeriodo = _contaGastos.filter(g => contaEnRango(g.fecha, desde, hasta));
  const ingresosPeriodoTodos = _contaIngresos.filter(i => contaEnRango(i.fecha, desde, hasta));
  const gastosAnt = _contaGastos.filter(g => contaEnRango(g.fecha, desdeAnt, hastaAnt)).reduce((s, g) => s + Number(g.monto || 0), 0);
  const ingresosAnt = _contaIngresos.filter(i => contaEnRango(i.fecha, desdeAnt, hastaAnt)).reduce((s, i) => s + Number(i.monto || 0), 0);

  const totalGastos = gastosPeriodo.reduce((s, g) => s + Number(g.monto || 0), 0);
  const totalIngresos = ingresosPeriodoTodos.reduce((s, i) => s + Number(i.monto || 0), 0);
  const costoVentas = calcularCostoVentasPeriodo(desde, hasta);
  const balance = totalIngresos - costoVentas - totalGastos;
  const rentabilidad = totalIngresos > 0 ? (balance / totalIngresos * 100) : 0;

  const elIng = $("#conta-stat-ingresos"); if (elIng) elIng.textContent = COP(totalIngresos);
  const elIngChip = $("#conta-stat-ingresos-chip"); if (elIngChip) elIngChip.innerHTML = pctChipConta(totalIngresos, ingresosAnt);
  const elGas = $("#conta-stat-gastos"); if (elGas) elGas.textContent = COP(totalGastos);
  const elGasChip = $("#conta-stat-gastos-chip"); if (elGasChip) elGasChip.innerHTML = pctChipConta(totalGastos, gastosAnt);
  const elBal = $("#conta-stat-balance"); if (elBal) elBal.textContent = COP(balance);
  const elRent = $("#conta-stat-rentabilidad"); if (elRent) elRent.textContent = rentabilidad.toFixed(1) + "%";
  [elIng, elGas, elBal, elRent].forEach(ajustarTamanoStat);
  renderDesgloseUtilidad(totalIngresos, costoVentas, totalGastos);
  renderGaugeMargen(rentabilidad);

  const chartWrap = $("#conta-chart-wrap");
  if (chartWrap) {
    chartWrap.style.display = _contaPeriodo === "mes" ? "" : "none";
    if (_contaPeriodo === "mes") renderGraficaConta();
  }

  const chartCatWrap = $("#conta-chart-gastos-cat-wrap");
  if (chartCatWrap) {
    chartCatWrap.style.display = gastosPeriodo.length ? "" : "none";
    if (gastosPeriodo.length) renderGraficaGastosCategoria(gastosPeriodo, totalGastos);
  }

  const bodyGastos = $("#conta-gastos-body");
  if (bodyGastos) {
    bodyGastos.innerHTML = gastosPeriodo.length ? gastosPeriodo.map(g => `
      <tr>
        <td>${esc(g.proveedor || "—")}${g.recurrente || g.gasto_origen_id ? ` <span title="Gasto recurrente">🔁</span>` : ""}${g.factura_url ? ` <a href="${esc(g.factura_url)}" target="_blank" title="Ver factura">${ic("paperclip")}</a>` : ""}${g.metodo_pago ? ` <span style="font-size:11px;color:#999">· ${esc(g.metodo_pago)}</span>` : ""}</td>
        <td>${esc(g.negocio_categorias_gasto?.nombre || "Sin categoría")}</td>
        <td>${new Date(g.fecha + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</td>
        <td>${COP(g.monto)}</td>
        <td style="white-space:nowrap"><button data-ed-gn="${g.id}" style="border:none;background:none;cursor:pointer">${ic("pencil")}</button><button data-rm-gn="${g.id}" style="border:none;background:none;cursor:pointer;color:#c0392b">${ic("trash-2")}</button></td>
      </tr>`).join("") : `<tr><td colspan="5" style="text-align:center;padding:16px;color:#999">Sin gastos en este periodo</td></tr>`;
    if (window.lucide) lucide.createIcons();
    bodyGastos.querySelectorAll("[data-ed-gn]").forEach(b => b.addEventListener("click", () => {
      const g = _contaGastos.find(x => x.id === b.dataset.edGn);
      if (g) abrirFormGastoNegocio(g);
    }));
    bodyGastos.querySelectorAll("[data-rm-gn]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("¿Eliminar este gasto?")) return;
      await supabase.from("negocio_gastos").delete().eq("id", b.dataset.rmGn);
      toast("Gasto eliminado");
      cargarContabilidadNegocio(_contaNegocioId);
    }));
  }

  const ingresosVista = _contaFiltroOrigen === "todos" ? ingresosPeriodoTodos : ingresosPeriodoTodos.filter(i => i.origen === _contaFiltroOrigen);
  const bodyIngresos = $("#conta-ingresos-body");
  if (bodyIngresos) {
    bodyIngresos.innerHTML = ingresosVista.length ? ingresosVista.map(i => `
      <tr>
        <td>${esc(i.descripcion || (i.origen === "carta" ? "Pedido de la carta" : "—"))}</td>
        <td>${esc(i.negocio_categorias_ingreso?.nombre || "—")}</td>
        <td>${new Date(i.fecha + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</td>
        <td>${COP(i.monto)}</td>
        <td style="white-space:nowrap">${i.origen === "manual" ? `<button data-ed-in="${i.id}" style="border:none;background:none;cursor:pointer">${ic("pencil")}</button><button data-rm-in="${i.id}" style="border:none;background:none;cursor:pointer;color:#c0392b">${ic("trash-2")}</button>` : ""}</td>
      </tr>`).join("") : `<tr><td colspan="5" style="text-align:center;padding:16px;color:#999">Sin ingresos en este periodo</td></tr>`;
    if (window.lucide) lucide.createIcons();
    bodyIngresos.querySelectorAll("[data-ed-in]").forEach(b => b.addEventListener("click", () => {
      const i = _contaIngresos.find(x => x.id === b.dataset.edIn);
      if (i) abrirFormIngresoNegocio(i);
    }));
    bodyIngresos.querySelectorAll("[data-rm-in]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("¿Eliminar este ingreso?")) return;
      await supabase.from("negocio_ingresos").delete().eq("id", b.dataset.rmIn);
      toast("Ingreso eliminado");
      cargarContabilidadNegocio(_contaNegocioId);
    }));
  }

  $$("#conta-ingresos-filtro [data-filtro-origen]").forEach(b => {
    b.classList.toggle("is-on", b.dataset.filtroOrigen === _contaFiltroOrigen);
    b.onclick = () => { _contaFiltroOrigen = b.dataset.filtroOrigen; renderContabilidadNegocioUI(); };
  });
}

// Gráfica simple (SVG a mano, sin librería): ingresos vs. gastos de los
// últimos 6 meses + una línea de utilidad superpuesta. Solo se usa en el
// filtro "Mes" -- Día/Semana/Rango no tienen una secuencia natural de 6
// periodos previos igual de útil, así que ahí solo se muestra el total +
// el chip de comparación (simplificación consciente).
function renderGraficaConta() {
  const cont = $("#conta-chart");
  if (!cont) return;
  const hoy = new Date();
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    meses.push({ ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("es-CO", { month: "short" }) });
  }
  const datos = meses.map(m => {
    const [yy, mm] = m.ym.split("-").map(Number);
    const desde = `${m.ym}-01`;
    const hasta = `${m.ym}-${String(new Date(yy, mm, 0).getDate()).padStart(2, "0")}`;
    const ingresos = _contaIngresos.filter(i => contaEnRango(i.fecha, desde, hasta)).reduce((s, i) => s + Number(i.monto || 0), 0);
    const gastos = _contaGastos.filter(g => contaEnRango(g.fecha, desde, hasta)).reduce((s, g) => s + Number(g.monto || 0), 0);
    return { label: m.label, ingresos, gastos, utilidad: ingresos - gastos };
  });
  const max = Math.max(1, ...datos.map(d => Math.max(d.ingresos, d.gastos)));
  const alto = 150, anchoGrupo = 110, baseline = alto + 22;
  const escala = (v) => (v / max) * alto;
  const w = anchoGrupo * datos.length;

  let svg = `<line x1="0" y1="${baseline}" x2="${w}" y2="${baseline}" stroke="rgba(2,27,26,.12)" stroke-width="1"></line>`;
  const puntos = [];
  datos.forEach((d, i) => {
    const gx = i * anchoGrupo;
    const hIng = escala(d.ingresos), hGas = escala(d.gastos);
    svg += `<rect x="${gx + 20}" y="${baseline - hIng}" width="26" height="${hIng}" rx="3" fill="var(--verde)"></rect>`;
    svg += `<rect x="${gx + 52}" y="${baseline - hGas}" width="26" height="${hGas}" rx="3" fill="#D97757"></rect>`;
    svg += `<text x="${gx + anchoGrupo / 2}" y="${baseline + 18}" text-anchor="middle" font-size="11" fill="rgba(2,27,26,.5)">${esc(d.label)}</text>`;
    if (i === datos.length - 1) {
      // Cada valor apunta hacia AFUERA de su propia barra (ingresos hacia
      // la izquierda, gastos hacia la derecha) en vez de quedar centrado
      // sobre una barra angosta de 26px -- un monto largo como "$1.209.990"
      // centrado ahí se desbordaba sobre la barra vecina.
      svg += `<text x="${gx + 46}" y="${baseline - hIng - 6}" text-anchor="end" font-size="10" font-weight="700" fill="#021B1A">${COP(d.ingresos)}</text>`;
      svg += `<text x="${gx + 52}" y="${baseline - hGas - 6}" text-anchor="start" font-size="10" font-weight="700" fill="rgba(2,27,26,.6)">${COP(d.gastos)}</text>`;
    }
    const cy = d.utilidad > 0 ? baseline - escala(d.utilidad) : baseline;
    puntos.push(`${gx + anchoGrupo / 2},${cy}`);
  });
  svg += `<polyline points="${puntos.join(" ")}" fill="none" stroke="#EAB749" stroke-width="2"></polyline>`;
  // +35 de margen a la derecha -- el valor de "Gastos" del último mes ahora
  // se extiende hacia afuera de su barra (ver arriba) y podía quedar
  // recortado contra el borde del viewBox.
  cont.innerHTML = `<svg viewBox="0 0 ${w + 35} ${baseline + 26}" style="width:${Math.max(w + 35, 320)}px;height:auto;display:block">${svg}</svg>`;
}

// Gastos recurrentes (ej. arriendo mensual): en vez de un cron aparte, se
// revisa de forma perezosa cada vez que el negocio entra a Mi Contabilidad
// -- si ya tocaba la siguiente repetición (y puede que hayan pasado varias
// mientras no entraba), se crean todas las que falten, encadenadas al
// original vía "gasto_origen_id" (nunca el original mismo -- cada repetición
// es su propia fila, editable/borrable sin afectar a las demás). Si se
// apaga "recurrente" en el original, sencillamente deja de generar nuevas.
function siguienteFechaGasto(fechaISO, frecuencia) {
  const d = new Date(fechaISO + "T00:00:00");
  if (frecuencia === "semanal") d.setDate(d.getDate() + 7);
  else if (frecuencia === "anual") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1); // mensual (por defecto)
  return d.toISOString().slice(0, 10);
}
async function renovarGastosRecurrentes() {
  const originales = _contaGastos.filter(g => g.recurrente && !g.gasto_origen_id);
  if (!originales.length) return;
  const hoy = new Date().toISOString().slice(0, 10);
  const nuevas = [];
  originales.forEach(original => {
    const familia = [original, ..._contaGastos.filter(g => g.gasto_origen_id === original.id)];
    const ultima = familia.reduce((max, g) => (g.fecha > max.fecha ? g : max), familia[0]);
    let siguiente = siguienteFechaGasto(ultima.fecha, original.frecuencia);
    while (siguiente <= hoy) {
      nuevas.push({
        negocio_id: _contaNegocioId, categoria_id: original.categoria_id, proveedor: original.proveedor,
        monto: original.monto, fecha: siguiente, metodo_pago: original.metodo_pago, nota: original.nota,
        gasto_origen_id: original.id,
      });
      siguiente = siguienteFechaGasto(siguiente, original.frecuencia);
    }
  });
  if (!nuevas.length) return;
  const { data: insertadas } = await supabase.from("negocio_gastos").insert(nuevas).select("*, negocio_categorias_gasto(nombre)");
  if (insertadas?.length) _contaGastos.push(...insertadas);
}

// "¿A dónde se va la plata?" -- barras horizontales ordenadas de mayor a
// menor en vez de una torta/dona: para comparar y rankear categorías el ojo
// compara mejor barras sobre una misma línea base que pedazos de un
// círculo, y escala sin problema a más de 5-6 categorías.
function renderGraficaGastosCategoria(gastosPeriodo, totalGastos) {
  const cont = $("#conta-chart-gastos-cat");
  if (!cont) return;
  const porCategoria = new Map();
  gastosPeriodo.forEach(g => {
    const nombre = g.negocio_categorias_gasto?.nombre || "Sin categoría";
    porCategoria.set(nombre, (porCategoria.get(nombre) || 0) + Number(g.monto || 0));
  });
  const filas = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...filas.map(([, v]) => v));
  cont.innerHTML = filas.map(([nombre, monto]) => {
    const pct = totalGastos > 0 ? (monto / totalGastos * 100) : 0;
    const anchoPct = (monto / max) * 100;
    return `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;margin-bottom:4px">
        <span style="font-weight:600">${esc(nombre)}</span>
        <span style="color:var(--tinta-60);white-space:nowrap">${COP(monto)} · ${pct.toFixed(0)}%</span>
      </div>
      <div style="background:var(--crema-2);border-radius:100px;height:10px;overflow:hidden">
        <div style="width:${anchoPct}%;height:100%;background:var(--verde);border-radius:100px"></div>
      </div>
    </div>`;
  }).join("");
}

function abrirFormGastoNegocio(g = {}) {
  const catOptions = _contaCategoriasGasto.map(c => `<option value="${c.id}" ${g.categoria_id === c.id ? "selected" : ""}>${esc(c.nombre)}</option>`).join("");
  const metodosPago = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];
  abrirModalTienda(g.id ? "Editar gasto" : "Agregar gasto", `
    <div class="cfg-campo"><label class="cfg-label">Categoría</label>
      <select class="cfg-input" id="cg-categoria">
        <option value="">Sin categoría</option>
        ${catOptions}
        <option value="__nueva__">+ Nueva categoría…</option>
      </select>
      <input class="cfg-input" id="cg-categoria-nueva" type="text" placeholder="Nombre de la categoría nueva" style="display:none;margin-top:8px">
    </div>
    <div class="cfg-campo"><label class="cfg-label">Proveedor / Descripción</label><input class="cfg-input" id="cg-proveedor" type="text" value="${esc(g.proveedor || "")}" placeholder="Ej: Arriendo local, insumos..."></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="cfg-campo"><label class="cfg-label">Monto (COP)</label><input class="cfg-input" id="cg-monto" type="text" inputmode="numeric" value="${g.monto ? Number(g.monto).toLocaleString("es-CO") : ""}" placeholder="Ej: 62.000"></div>
      <div class="cfg-campo"><label class="cfg-label">Fecha</label><input class="cfg-input" id="cg-fecha" type="date" value="${g.fecha || new Date().toISOString().slice(0, 10)}"></div>
    </div>
    <div class="cfg-campo"><label class="cfg-label">Método de pago</label>
      <select class="cfg-input" id="cg-metodo">
        <option value="">Sin especificar</option>
        ${metodosPago.map(m => `<option value="${m}" ${g.metodo_pago === m ? "selected" : ""}>${m}</option>`).join("")}
      </select>
    </div>
    <div class="cfg-campo"><label class="cfg-label">Nota (opcional)</label><textarea class="cfg-input" id="cg-nota" rows="2">${g.nota || ""}</textarea></div>
    <div class="cfg-campo"><label class="cfg-label">Factura (foto o PDF, opcional)</label>
      ${g.factura_url ? `<div style="margin-bottom:8px"><a href="${esc(g.factura_url)}" target="_blank" style="font-size:12px">Ver factura actual ↗</a></div>` : ""}
      <input type="file" id="cg-factura" accept="image/*,.pdf">
      <input type="hidden" id="cg-factura-url" value="${g.factura_url || ""}">
    </div>
    ${!g.gasto_origen_id ? `
    <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--tinta-60);margin:4px 0 8px;cursor:pointer">
      <input type="checkbox" id="cg-recurrente" ${g.recurrente ? "checked" : ""}> Este gasto se repite solo (ej. arriendo mensual)
    </label>
    <div class="cfg-campo" id="cg-frecuencia-campo" ${g.recurrente ? "" : "hidden"}>
      <label class="cfg-label">Cada cuánto se repite</label>
      <select class="cfg-input" id="cg-frecuencia">
        <option value="mensual" ${g.frecuencia !== "semanal" && g.frecuencia !== "anual" ? "selected" : ""}>Cada mes</option>
        <option value="semanal" ${g.frecuencia === "semanal" ? "selected" : ""}>Cada semana</option>
        <option value="anual" ${g.frecuencia === "anual" ? "selected" : ""}>Cada año</option>
      </select>
      <span style="font-size:12px;color:var(--tinta-45);display:block;margin-top:4px">Cada vez que entres a Mi Contabilidad, se crea solo cuando ya toque la siguiente repetición -- mismo monto, categoría y descripción. Lo puedes apagar cuando quieras.</span>
    </div>` : ""}
    <button class="btn btn--primario" id="cg-save" data-id="${g.id || ""}" style="margin-top:8px">${g.id ? "Guardar cambios" : "Agregar gasto"}</button>
  `);
  formatearInputMoneda($("#cg-monto"));
  $("#cg-categoria")?.addEventListener("change", (e) => {
    const n = $("#cg-categoria-nueva"); if (n) n.style.display = e.target.value === "__nueva__" ? "block" : "none";
  });
  $("#cg-recurrente")?.addEventListener("change", (e) => {
    const campo = $("#cg-frecuencia-campo"); if (campo) campo.hidden = !e.target.checked;
  });
  $("#cg-save")?.addEventListener("click", async () => {
    const btn = $("#cg-save");
    const resetBtn = () => { btn.disabled = false; btn.textContent = g.id ? "Guardar cambios" : "Agregar gasto"; };
    let categoriaId = $("#cg-categoria")?.value;
    const nuevaCat = $("#cg-categoria-nueva")?.value.trim();
    const monto = valorMoneda($("#cg-monto"));
    const fecha = $("#cg-fecha")?.value;
    if (!monto) { toast("Ingresa un monto válido"); return; }
    if (!fecha) { toast("Selecciona una fecha"); return; }
    btn.disabled = true; btn.textContent = "Guardando…";
    if (categoriaId === "__nueva__") {
      if (!nuevaCat) { toast("Escribe el nombre de la categoría nueva"); resetBtn(); return; }
      const { data: catData, error: catErr } = await supabase.from("negocio_categorias_gasto").insert({ negocio_id: _contaNegocioId, nombre: nuevaCat }).select().single();
      if (catErr) { toast("Error creando categoría: " + catErr.message); resetBtn(); return; }
      categoriaId = catData.id;
    }
    let facturaUrl = $("#cg-factura-url")?.value || null;
    const facturaFile = $("#cg-factura")?.files?.[0];
    if (facturaFile) {
      try {
        const file = await comprimirImagen(facturaFile);
        const ext = file.name.split(".").pop();
        const path = `factura-negocio-${_contaNegocioId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        facturaUrl = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
      } catch { toast("Error subiendo la factura"); resetBtn(); return; }
    }
    const recurrente = $("#cg-recurrente")?.checked || false;
    const payload = {
      negocio_id: _contaNegocioId, categoria_id: categoriaId || null, proveedor: $("#cg-proveedor")?.value.trim() || null,
      monto, fecha, metodo_pago: $("#cg-metodo")?.value || null, nota: $("#cg-nota")?.value.trim() || null, factura_url: facturaUrl,
      ...(g.gasto_origen_id ? {} : { recurrente, frecuencia: recurrente ? ($("#cg-frecuencia")?.value || "mensual") : null }),
    };
    const { error } = g.id ? await supabase.from("negocio_gastos").update(payload).eq("id", g.id) : await supabase.from("negocio_gastos").insert(payload);
    if (error) { toast("Error: " + error.message); resetBtn(); return; }
    cerrarModalTienda();
    toast(g.id ? "Gasto actualizado ✓" : "Gasto agregado ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  });
}

// Grupos de modificadores (toppings/salsas/tamaño) configurados para un
// producto puntual, con sus opciones ya resueltas -- mismo join que hace
// carta.js para el cliente final, pero del lado del cajero.
function gruposDeProducto(productoId) {
  const grupoIds = _contaModProdGrupos.filter(pg => pg.producto_id === productoId).map(pg => pg.grupo_id);
  return _contaModGrupos.filter(g => grupoIds.includes(g.id)).map(g => ({
    ...g, opciones: _contaModOpciones.filter(o => o.grupo_id === g.id),
  }));
}

// Constructor de venta manual ("Nuevo pedido") -- usa el catálogo de la
// Carta (_contaCartaProductos) para que nunca haya precios distintos entre
// lo que se vende por QR y lo que se vende desde el mostrador.
//
// Si SÍ se elige una mesa, es porque alguien pidió con la carta física (el
// mesero lo digita acá) -- en ese caso se une a la MISMA sesión de mesa que
// usa la carta por QR (la carta real, embebida en un iframe), para que si
// otra persona de esa mesa pidió digital, los dos pedidos queden juntos en
// "Pedidos" y se cobren como una sola cuenta al final.
//
// Si NO se elige mesa, es venta de mostrador: una grilla visual (foto,
// buscador, personalización de toppings a la derecha) tipo caja registradora.
// Al cobrar, el pedido entra a "Pedidos" igual que cualquier pedido de la
// carta (origen "manual", para distinguirlo), ya marcado como pagado -- el
// cajero solo tiene que darle "Marcar entregado" cuando se lo entregue al
// cliente.
function abrirConstructorPedido() {
  if (!_contaCartaProductos.length) { toast("Agrega productos a tu carta antes de crear un pedido"); return; }
  const carritoPos = []; // { id, producto_id, nombre, precioUnit, cantidad, modificadores }
  let metodoPagoPos = "efectivo"; // arranca en efectivo -- el caso más común de mostrador, para no sumar un click extra al 90% de las ventas

  abrirModalTienda("Nuevo pedido", `
    ${_contaMesas.length ? `
    <div class="cfg-campo" id="cp-mesa-campo">
      <label class="cfg-label">¿Es para una mesa? <span style="font-weight:400;color:var(--tinta-45)">(opcional)</span></label>
      <select class="cfg-input" id="cp-mesa">
        <option value="">No -- venta de mostrador</option>
        ${_contaMesas.map(m => `<option value="${m.id}">${esc(m.nombre)}</option>`).join("")}
      </select>
      <span style="font-size:12px;color:var(--tinta-45);display:block;margin-top:4px">Si alguien de esa mesa ya pidió por el QR, este pedido se junta con el de ella y entre los dos arman la cuenta completa de la mesa.</span>
    </div>
    <div id="cp-carta-embebida" hidden>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">
        <p style="font-size:12.5px;color:var(--tinta-60);margin:0">Arma el pedido con tu carta real, igual que lo haría el cliente. Al mandarlo, llega a "Pedidos" igual que cualquier pedido por QR.</p>
        <button type="button" id="cp-cambiar-mesa" style="flex:none;font-size:12.5px;font-weight:700;color:var(--verde);background:none;border:none;cursor:pointer;white-space:nowrap">Cambiar mesa</button>
      </div>
      <iframe id="cp-carta-iframe" src="" style="width:100%;height:calc(100vh - 130px);border:none;display:block" title="Carta para tomar el pedido"></iframe>
    </div>` : ""}
    <div id="cp-lista-simple">
      <div id="cp-pos" style="display:flex;gap:14px;height:calc(100vh - 150px)">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column">
          <input class="cfg-input" id="cp-pos-buscar" type="text" placeholder="🔍 Buscar producto..." style="margin-bottom:10px;flex:none">
          <div id="cp-pos-grid" style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;align-content:start"></div>
        </div>
        <div style="width:280px;flex:none;display:flex;flex-direction:column;background:#f7faf8;border-radius:12px;padding:12px;min-height:0">
          <div id="cp-pos-cart-view" style="display:flex;flex-direction:column;flex:1;min-height:0">
            <div style="font-weight:700;font-size:14px;margin-bottom:8px">Pedido</div>
            <div id="cp-pos-cart-items" style="flex:1;overflow-y:auto;margin-bottom:10px"></div>
            <input class="cfg-input" id="cp-pos-whatsapp" type="tel" inputmode="numeric" placeholder="WhatsApp del cliente (opcional, para sellos)" style="margin-bottom:8px;flex:none">
            <input class="cfg-input" id="cp-pos-nota" type="text" placeholder="Nota (opcional)" style="margin-bottom:8px;flex:none">
            <div style="display:flex;gap:8px;margin-bottom:10px;flex:none">
              <button type="button" class="btn" data-pos-metodo="efectivo" style="flex:1;padding:8px;font-size:12.5px;justify-content:center">💵 Efectivo</button>
              <button type="button" class="btn" data-pos-metodo="transferencia" style="flex:1;padding:8px;font-size:12.5px;justify-content:center">🏦 Transferencia</button>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:800;font-size:16px;padding:6px 0 10px;flex:none">
              <span>Total</span><span id="cp-pos-total">${COP(0)}</span>
            </div>
            <button class="btn btn--primario" id="cp-pos-cobrar" style="width:100%;justify-content:center;flex:none" disabled>Elige un producto</button>
          </div>
          <div id="cp-pos-detalle-view" style="display:none;flex-direction:column;flex:1;min-height:0"></div>
        </div>
      </div>
    </div>
  `);
  // Esta pantalla necesita todo el espacio posible (grilla + panel de
  // personalización), así que arranca expandida a pantalla completa --
  // abrirModalTienda() la vuelve a su tamaño normal la próxima vez que se
  // abra cualquier otro modal (no solo este).
  const box = $("#modal-tienda-box");
  if (box) { box.style.maxWidth = "100vw"; box.style.width = "100vw"; box.style.maxHeight = "100vh"; box.style.height = "100vh"; box.style.borderRadius = "0"; }

  const renderCart = () => {
    const itemsEl = $("#cp-pos-cart-items");
    const totalEl = $("#cp-pos-total");
    const cobrarBtn = $("#cp-pos-cobrar");
    if (!itemsEl) return;
    itemsEl.innerHTML = carritoPos.length ? carritoPos.map(it => `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #e5efe9">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${it.cantidad}× ${esc(it.nombre)}</div>
          ${it.modificadores.length ? `<div style="font-size:11.5px;color:#777">${esc(it.modificadores.map(m => m.opcion).join(", "))}</div>` : ""}
          <div style="font-size:12px;color:#777;margin-top:2px">${COP(it.precioUnit * it.cantidad)}</div>
        </div>
        <button type="button" data-pos-quitar="${it.id}" style="border:none;background:none;color:#c0392b;cursor:pointer;font-size:14px;flex:none">✕</button>
      </div>`).join("") : `<p style="color:#777;font-size:13px">Toca un producto de la grilla para agregarlo aquí.</p>`;
    const total = carritoPos.reduce((s, it) => s + it.precioUnit * it.cantidad, 0);
    if (totalEl) totalEl.textContent = COP(total);
    if (cobrarBtn) { cobrarBtn.disabled = !carritoPos.length; cobrarBtn.textContent = carritoPos.length ? `Cobrar ${COP(total)}` : "Elige un producto"; }
    itemsEl.querySelectorAll("[data-pos-quitar]").forEach(btn => btn.addEventListener("click", () => {
      const idx = carritoPos.findIndex(it => it.id === btn.dataset.posQuitar);
      if (idx > -1) carritoPos.splice(idx, 1);
      renderCart();
      renderGrid(busquedaActual);
    }));
  };

  // Al tocar un producto de la grilla, el panel de la derecha deja de
  // mostrar el carrito y muestra sus toppings/opciones para personalizarlo
  // -- "Agregar" lo suma al carrito y vuelve a mostrar el carrito.
  const abrirDetalleProducto = (productoId) => {
    const p = _contaCartaProductos.find(x => x.id === productoId);
    if (!p) return;
    const grupos = gruposDeProducto(productoId);
    const seleccion = new Map(); // grupo_id -> Set(opcion_id)
    let cantidad = 1;
    const cartView = $("#cp-pos-cart-view");
    const detView = $("#cp-pos-detalle-view");
    if (!detView) return;
    if (cartView) cartView.style.display = "none";
    detView.style.display = "flex";

    const calcularExtra = () => {
      let extra = 0;
      grupos.forEach(g => {
        const sel = seleccion.get(g.id);
        if (!sel) return;
        g.opciones.forEach(o => { if (sel.has(o.id)) extra += Number(o.precio_adicional) || 0; });
      });
      return extra;
    };
    const grupoCompleto = (g) => g.tipo !== "unica" || seleccion.get(g.id)?.size === 1;
    const pintar = () => {
      const n = $("#cp-det-qty-n"); if (n) n.textContent = String(cantidad);
      const btn = $("#cp-det-agregar");
      if (!btn) return;
      const faltante = grupos.find(g => !grupoCompleto(g));
      if (faltante) { btn.disabled = true; btn.textContent = `Elige "${faltante.nombre}" para continuar`; }
      else { btn.disabled = false; btn.textContent = `Agregar ${COP((Number(p.precio) + calcularExtra()) * cantidad)}`; }
    };

    detView.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex:none">
        <button type="button" id="cp-det-volver" style="border:none;background:none;cursor:pointer;font-size:18px;line-height:1">←</button>
        <div style="font-weight:700;font-size:14.5px">${esc(p.nombre)}</div>
      </div>
      <div style="flex:1;overflow-y:auto;min-height:0">
        ${grupos.length ? grupos.map(g => `
          <div style="margin-bottom:14px">
            <div style="font-weight:600;font-size:12.5px;margin-bottom:6px">${esc((g.pregunta || "").trim() || g.nombre)} <span style="font-weight:400;color:#999">· ${g.tipo === "unica" ? "obligatorio" : "opcional"}</span></div>
            ${g.opciones.map(o => `
              <label style="display:flex;align-items:center;gap:8px;padding:7px 0;cursor:pointer;font-size:13px">
                <input type="${g.tipo === "unica" ? "radio" : "checkbox"}" name="cp-det-grupo-${g.id}" data-cp-det-opcion="${o.id}" data-cp-det-grupo="${g.id}" style="flex:none">
                ${o.imagen_url ? `<img src="${esc(o.imagen_url)}" alt="" style="width:34px;height:34px;border-radius:8px;object-fit:cover;flex:none">` : ""}
                <span style="flex:1;min-width:0">${esc(o.nombre)}</span>
                ${Number(o.precio_adicional) > 0 ? `<span style="color:#777">+${COP(o.precio_adicional)}</span>` : ""}
              </label>`).join("")}
          </div>`).join("") : `<p style="color:#777;font-size:12.5px">Este producto no tiene toppings configurados.</p>`}
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;padding:8px 0;flex:none">
        <button type="button" id="cp-det-qty-menos" style="width:32px;height:32px;border-radius:50%;border:1px solid #ddd;background:#fff;font-weight:700;cursor:pointer">−</button>
        <span id="cp-det-qty-n" style="min-width:20px;text-align:center;font-weight:700">1</span>
        <button type="button" id="cp-det-qty-mas" style="width:32px;height:32px;border-radius:50%;border:1px solid #ddd;background:#fff;font-weight:700;cursor:pointer">+</button>
      </div>
      <button class="btn btn--primario" id="cp-det-agregar" style="width:100%;justify-content:center;flex:none">Agregar</button>
    `;
    detView.querySelectorAll("[data-cp-det-opcion]").forEach(input => input.addEventListener("change", () => {
      const grupoId = input.dataset.cpDetGrupo, opcionId = input.dataset.cpDetOpcion;
      const g = grupos.find(x => x.id === grupoId);
      if (!g) return;
      if (g.tipo === "unica") seleccion.set(grupoId, new Set([opcionId]));
      else {
        const sel = seleccion.get(grupoId) || new Set();
        if (input.checked) sel.add(opcionId); else sel.delete(opcionId);
        seleccion.set(grupoId, sel);
      }
      pintar();
    }));
    // Tope de stock también acá -- una venta de mostrador tampoco puede
    // vender más de lo que de verdad hay.
    const tope = () => p.stock_activo ? Math.max(0, p.stock_cantidad ?? 0) : Infinity;
    $("#cp-det-qty-mas")?.addEventListener("click", () => { if (cantidad < tope()) { cantidad++; pintar(); } });
    $("#cp-det-qty-menos")?.addEventListener("click", () => { if (cantidad > 1) { cantidad--; pintar(); } });
    const volverAlCarrito = () => { detView.style.display = "none"; if (cartView) cartView.style.display = "flex"; };
    $("#cp-det-volver")?.addEventListener("click", volverAlCarrito);
    $("#cp-det-agregar")?.addEventListener("click", () => {
      const modificadores = [];
      grupos.forEach(g => {
        const sel = seleccion.get(g.id) || new Set();
        g.opciones.forEach(o => { if (sel.has(o.id)) modificadores.push({ grupo: g.nombre, opcion: o.nombre, precio_adicional: Number(o.precio_adicional) || 0 }); });
      });
      carritoPos.push({ id: crypto.randomUUID(), producto_id: p.id, nombre: p.nombre, precioUnit: Number(p.precio) + calcularExtra(), cantidad, modificadores });
      volverAlCarrito();
      renderCart();
      renderGrid(busquedaActual);
    });
    pintar();
  };

  // Un producto SIN toppings configurados no necesita el panel de
  // personalización -- tocarlo lo suma de una vez al carrito (si ya estaba,
  // solo sube la cantidad), para poder marcar varios productos seguidos sin
  // ida y vuelta. Uno CON toppings sí abre el panel, porque hay algo real
  // que elegir.
  const agregarRapido = (p) => {
    const tope = p.stock_activo ? Math.max(0, p.stock_cantidad ?? 0) : Infinity;
    const existente = carritoPos.find(it => it.producto_id === p.id && !it.modificadores.length);
    if ((existente?.cantidad || 0) >= tope) { toast("No queda más stock de este producto"); return; }
    if (existente) existente.cantidad++;
    else carritoPos.push({ id: crypto.randomUUID(), producto_id: p.id, nombre: p.nombre, precioUnit: Number(p.precio), cantidad: 1, modificadores: [] });
    renderCart();
    renderGrid(busquedaActual);
  };

  let busquedaActual = "";
  const renderGrid = (filtro = "") => {
    busquedaActual = filtro;
    const gridEl = $("#cp-pos-grid");
    if (!gridEl) return;
    const q = filtro.trim().toLowerCase();
    const productos = _contaCartaProductos.filter(p => p.disponible !== false && (!q || p.nombre.toLowerCase().includes(q)));
    gridEl.innerHTML = productos.length ? productos.map(p => {
      const enCarrito = carritoPos.filter(it => it.producto_id === p.id && !it.modificadores.length).reduce((s, it) => s + it.cantidad, 0);
      return `
      <button type="button" data-pos-prod="${p.id}" style="position:relative;text-align:left;border:1px solid #ebebeb;border-radius:12px;overflow:hidden;background:#fff;cursor:pointer;padding:0;display:flex;flex-direction:column">
        ${enCarrito ? `<span style="position:absolute;top:6px;right:6px;background:var(--verde);color:#fff;font-size:11px;font-weight:700;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 5px">${enCarrito}</span>` : ""}
        <div style="aspect-ratio:1;background:#f0faf4 center/cover no-repeat;${p.imagen_url ? `background-image:url('${esc(p.imagen_url)}')` : ""};display:flex;align-items:center;justify-content:center;font-size:26px;color:#bbb">${p.imagen_url ? "" : "🍽️"}</div>
        <div style="padding:8px 10px">
          <div style="font-weight:600;font-size:12.5px;line-height:1.25">${esc(p.nombre)}</div>
          <div style="font-size:12px;color:#777;margin-top:2px">${COP(p.precio)}</div>
        </div>
      </button>`;
    }).join("") : `<p style="grid-column:1/-1;color:#777">Sin resultados</p>`;
    gridEl.querySelectorAll("[data-pos-prod]").forEach(btn => btn.addEventListener("click", () => {
      const productoId = btn.dataset.posProd;
      const p = _contaCartaProductos.find(x => x.id === productoId);
      if (!p) return;
      if (gruposDeProducto(productoId).length) abrirDetalleProducto(productoId);
      else agregarRapido(p);
    }));
  };

  // Método de pago de la venta de mostrador -- arranca en "efectivo"
  // marcado para que no haya que elegir en el caso más común.
  const pintarMetodoPos = () => {
    $$("[data-pos-metodo]").forEach(b => {
      const on = b.dataset.posMetodo === metodoPagoPos;
      b.style.background = on ? "var(--verde)" : "";
      b.style.color = on ? "#fff" : "";
      b.style.borderColor = on ? "var(--verde)" : "";
    });
  };
  $$("[data-pos-metodo]").forEach(b => b.addEventListener("click", () => { metodoPagoPos = b.dataset.posMetodo; pintarMetodoPos(); }));
  pintarMetodoPos();

  renderGrid();
  renderCart();
  $("#cp-pos-buscar")?.addEventListener("input", (e) => renderGrid(e.target.value));

  // Elegir una mesa cambia por completo la ventana: en vez de la grilla de
  // mostrador, se abre la carta real embebida (con fotos, categorías y
  // toppings, igual que ve el cliente) apuntada a esa mesa -- el pedido se
  // manda desde ADENTRO de esa carta, por el mismo camino de siempre, así
  // que la notificación al dashboard llega exactamente igual.
  $("#cp-mesa")?.addEventListener("change", (e) => {
    const mesaId = e.target.value;
    const listaSimple = $("#cp-lista-simple");
    const cartaEmbebida = $("#cp-carta-embebida");
    if (mesaId) {
      if (listaSimple) listaSimple.hidden = true;
      if (cartaEmbebida) {
        cartaEmbebida.hidden = false;
        const iframe = $("#cp-carta-iframe");
        if (iframe) iframe.src = `Carta.html?aliado=${_contaNegocioId}&mesa=${mesaId}`;
      }
    } else {
      if (listaSimple) listaSimple.hidden = false;
      if (cartaEmbebida) cartaEmbebida.hidden = true;
    }
  });
  $("#cp-cambiar-mesa")?.addEventListener("click", () => {
    const mesaSelect = $("#cp-mesa"); if (mesaSelect) mesaSelect.value = "";
    $("#cp-lista-simple")?.removeAttribute("hidden");
    $("#cp-carta-embebida")?.setAttribute("hidden", "");
  });

  // "Cobrar" solo existe para la grilla de mostrador (sin mesa) -- al elegir
  // mesa, esta grilla se oculta y el pedido se manda desde ADENTRO de la
  // carta embebida, nunca desde este botón. El pago ya se cobró en el
  // mostrador al tocar este botón, así que el pedido entra ya "pagado";
  // solo falta que el cajero lo marque "Entregado" cuando se lo dé al
  // cliente -- por eso entra a negocio_carta_pedidos (no directo a
  // negocio_ingresos) igual que cualquier pedido de la carta.
  $("#cp-pos-cobrar")?.addEventListener("click", async () => {
    const btn = $("#cp-pos-cobrar");
    if (!carritoPos.length) return;
    btn.disabled = true; btn.textContent = "Guardando…";
    const items = carritoPos.map(it => ({
      producto_id: it.producto_id, nombre: it.nombre, precio: it.precioUnit, cantidad: it.cantidad,
      ...(it.modificadores.length ? { modificadores: it.modificadores } : {}),
    }));
    const total = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
    const nota = $("#cp-pos-nota")?.value.trim() || null;
    // Si el cliente da su WhatsApp (ya registrado antes con el QR de
    // Cliente.html, o uno nuevo), esta venta también cuenta para su tarjeta
    // de sellos -- sellos_carta_estado cuenta pedidos por (negocio_id,
    // cliente_whatsapp), sin importar si vinieron de la carta o de acá.
    const wa = $("#cp-pos-whatsapp")?.value.trim().replace(/\D/g, "") || null;
    let clienteNombre = "Mostrador";
    if (wa) {
      const { data: cliente } = await supabase.from("negocio_carta_clientes").select("nombre").eq("negocio_id", _contaNegocioId).eq("whatsapp", wa).maybeSingle();
      if (cliente?.nombre) clienteNombre = cliente.nombre;
    }
    const ahora = new Date().toISOString();
    const { data: pedido, error } = await supabase.from("negocio_carta_pedidos").insert({
      negocio_id: _contaNegocioId, cliente_nombre: clienteNombre, cliente_whatsapp: wa, nota, items, monto_total: total,
      estado: "pendiente", origen: "manual", pagado: true, pagado_at: ahora, metodo_pago: metodoPagoPos,
    }).select().single();
    if (error) { toast("Error: " + error.message); btn.disabled = false; renderCart(); return; }
    await supabase.from("negocio_ingresos").insert({
      negocio_id: _contaNegocioId, origen: "manual", pedido_id: pedido.id,
      descripcion: items.map(it => `${it.cantidad}× ${it.nombre}`).join(", "),
      items, monto: total, fecha: ahora.slice(0, 10),
    });
    // Una venta manual de mostrador nunca pasa por el trigger de stock de
    // los pedidos por QR, así que acá hay que descontarlo a mano -- si no,
    // el stock quedaría desactualizado para cualquier negocio que también
    // venda de mostrador.
    for (const it of items) {
      const prod = _contaCartaProductos.find(p => p.id === it.producto_id);
      if (prod?.stock_activo) {
        const nuevoStock = Math.max((prod.stock_cantidad ?? 0) - it.cantidad, 0);
        await supabase.from("negocio_carta_productos").update({ stock_cantidad: nuevoStock }).eq("id", prod.id);
      }
    }
    cerrarModalTienda();
    toast("Pedido registrado ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  });
}

// Hub de "Carta" (ver Perfil.html #contasub-carta): un solo nivel de
// navegación -- la fila de un tema oculta el hub y muestra esa sección con
// una flecha "← Carta" para volver. null/"" vuelve al hub.
function mostrarCartaSeccion(id) {
  const hub = $("#carta-hub");
  if (hub) hub.style.display = id ? "none" : "";
  $$(".carta-seccion").forEach(sec => { sec.style.display = sec.id === `carta-seccion-${id}` ? "" : "none"; });
}
function wireCartaHub() {
  $$("[data-carta-ir]").forEach(btn => btn.onclick = () => mostrarCartaSeccion(btn.dataset.cartaIr));
  $$("[data-carta-volver]").forEach(btn => btn.onclick = () => mostrarCartaSeccion(null));
}

async function guardarPersonalizacionCarta(btnDisparado) {
  // "Apariencia" y "Promociones y avisos" son dos pantallas distintas del
  // hub de Carta, pero un solo guardado -- cada una tiene su propio botón,
  // así que el que se desactiva/avisa "Guardando…" es el que de verdad se
  // tocó, no siempre el de "Apariencia".
  const btn = btnDisparado || $("#conta-carta-personalizar-guardar");
  const textoOriginalBtn = btn?.textContent;
  const color = $("#conta-carta-color")?.value || "#095544";
  const logoUrl = $("#conta-carta-logo-url")?.value || null;
  let instagram = $("#conta-carta-instagram")?.value.trim() || null;
  // Acepta "@usuario" o solo "usuario" además de la URL completa -- lo que
  // sea más natural de escribir, pero carta.js necesita un link real.
  if (instagram && !/^https?:\/\//i.test(instagram)) instagram = `https://instagram.com/${instagram.replace(/^@/, "")}`;
  const portadaUrl = $("#conta-carta-portada-url")?.value || null;
  const sellosActivo = $("#conta-carta-sellos-activo")?.checked || false;
  const sellosMeta = parseInt($("#conta-carta-sellos-meta")?.value) || 10;
  const sellosTipo = $("#conta-carta-sellos-tipo")?.value || "descuento";
  const sellosPremio = $("#conta-carta-sellos-premio")?.value.trim() || null;
  const llave = $("#conta-carta-llave")?.value.trim() || null;
  const llaveQrUrl = $("#conta-carta-llave-qr-url")?.value || null;
  const colorTarjeta = $("#conta-carta-color-tarjeta")?.value || null;
  const colorBorde = $("#conta-carta-color-borde")?.value || null;
  const colorPedido = $("#conta-carta-color-pedido")?.value || null;
  const avisoActivo = $("#conta-carta-aviso-activo")?.checked || false;
  const precioDesde = $("#conta-carta-precio-desde")?.checked || false;
  const avisoColor = $("#conta-carta-aviso-color")?.value || null;
  const avisosLimpios = _contaAvisosCarta.filter(a => a.titulo?.trim()).map(a => ({ titulo: a.titulo.trim(), subtitulo: a.subtitulo?.trim() || null, link: a.link?.trim() || null }));
  const domicilioActivo = $("#conta-carta-domicilio-activo")?.checked || false;
  const domicilioValor = valorMoneda($("#conta-carta-domicilio-valor"));
  const domicilioMinimo = valorMoneda($("#conta-carta-domicilio-minimo")) || null;
  const domicilioTiempo = $("#conta-carta-domicilio-tiempo")?.value.trim() || null;
  const bienvenidaMensaje = $("#conta-carta-bienvenida-mensaje")?.value.trim() || null;
  if (btn) { btn.disabled = true; btn.textContent = "Guardando…"; }
  const payload = {
    imagen_url: logoUrl, instagram,
    carta_color: color, carta_portada_url: portadaUrl, carta_bienvenida_mensaje: bienvenidaMensaje,
    carta_sellos_activo: sellosActivo, carta_sellos_meta: sellosMeta,
    carta_sellos_premio_tipo: sellosTipo, carta_sellos_premio_desc: sellosPremio,
    tienda_llave_pago: llave, tienda_llave_qr_url: llaveQrUrl,
    carta_color_tarjeta: colorTarjeta, carta_color_borde: colorBorde, carta_color_pedido: colorPedido,
    carta_aviso_activo: avisoActivo, carta_aviso_color: avisoColor, carta_avisos: avisosLimpios.length ? avisosLimpios : null,
    carta_precio_desde: precioDesde,
    carta_categorias_orden: _contaCategoriasOrdenCarta.length ? _contaCategoriasOrdenCarta : null,
    carta_domicilio_activo: domicilioActivo, carta_domicilio_valor: domicilioActivo ? domicilioValor : null,
    carta_domicilio_minimo: domicilioActivo ? domicilioMinimo : null, carta_domicilio_tiempo: domicilioTiempo,
  };
  const { error } = await supabase.from("aliados").update(payload).eq("id", _contaNegocioId);
  if (btn) { btn.disabled = false; btn.textContent = textoOriginalBtn; }
  if (error) { toast("Error: " + error.message); return; }
  if (_contaNegocio) Object.assign(_contaNegocio, payload);
  const logoEl = document.getElementById("contaclub-logo");
  if (logoEl) logoEl.innerHTML = logoUrl ? `<img src="${esc(logoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : "";
  toast("Carta personalizada ✓");
}

function abrirFormIngresoNegocio(i = {}) {
  const catOptions = _contaCategoriasIngreso.map(c => `<option value="${c.id}" ${i.categoria_id === c.id ? "selected" : ""}>${esc(c.nombre)}</option>`).join("");
  abrirModalTienda(i.id ? "Editar ingreso" : "Agregar ingreso", `
    <div class="cfg-campo"><label class="cfg-label">Categoría (opcional)</label>
      <select class="cfg-input" id="ci-categoria">
        <option value="">Sin categoría</option>
        ${catOptions}
        <option value="__nueva__">+ Nueva categoría…</option>
      </select>
      <input class="cfg-input" id="ci-categoria-nueva" type="text" placeholder="Nombre de la categoría nueva" style="display:none;margin-top:8px">
    </div>
    <div class="cfg-campo"><label class="cfg-label">Descripción</label><input class="cfg-input" id="ci-desc" type="text" value="${esc(i.descripcion || "")}" placeholder="Ej: Venta de mostrador"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="cfg-campo"><label class="cfg-label">Monto (COP)</label><input class="cfg-input" id="ci-monto" type="text" inputmode="numeric" value="${i.monto ? Number(i.monto).toLocaleString("es-CO") : ""}" placeholder="Ej: 62.000"></div>
      <div class="cfg-campo"><label class="cfg-label">Fecha</label><input class="cfg-input" id="ci-fecha" type="date" value="${i.fecha || new Date().toISOString().slice(0, 10)}"></div>
    </div>
    <div class="cfg-campo"><label class="cfg-label">Nota (opcional)</label><textarea class="cfg-input" id="ci-nota" rows="2">${i.nota || ""}</textarea></div>
    <button class="btn btn--primario" id="ci-save" data-id="${i.id || ""}" style="margin-top:8px">${i.id ? "Guardar cambios" : "Agregar ingreso"}</button>
  `);
  formatearInputMoneda($("#ci-monto"));
  $("#ci-categoria")?.addEventListener("change", (e) => {
    const n = $("#ci-categoria-nueva"); if (n) n.style.display = e.target.value === "__nueva__" ? "block" : "none";
  });
  $("#ci-save")?.addEventListener("click", async () => {
    const btn = $("#ci-save");
    const resetBtn = () => { btn.disabled = false; btn.textContent = i.id ? "Guardar cambios" : "Agregar ingreso"; };
    let categoriaId = $("#ci-categoria")?.value;
    const nuevaCat = $("#ci-categoria-nueva")?.value.trim();
    const monto = valorMoneda($("#ci-monto"));
    const fecha = $("#ci-fecha")?.value;
    if (!monto) { toast("Ingresa un monto válido"); return; }
    if (!fecha) { toast("Selecciona una fecha"); return; }
    btn.disabled = true; btn.textContent = "Guardando…";
    if (categoriaId === "__nueva__") {
      if (!nuevaCat) { toast("Escribe el nombre de la categoría nueva"); resetBtn(); return; }
      const { data: catData, error: catErr } = await supabase.from("negocio_categorias_ingreso").insert({ negocio_id: _contaNegocioId, nombre: nuevaCat }).select().single();
      if (catErr) { toast("Error creando categoría: " + catErr.message); resetBtn(); return; }
      categoriaId = catData.id;
    }
    const payload = { negocio_id: _contaNegocioId, origen: "manual", categoria_id: categoriaId || null, descripcion: $("#ci-desc")?.value.trim() || null, monto, fecha, nota: $("#ci-nota")?.value.trim() || null };
    const { error } = i.id ? await supabase.from("negocio_ingresos").update(payload).eq("id", i.id) : await supabase.from("negocio_ingresos").insert(payload);
    if (error) { toast("Error: " + error.message); resetBtn(); return; }
    cerrarModalTienda();
    toast(i.id ? "Ingreso actualizado ✓" : "Ingreso agregado ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  });
}

// Modal chiquito reusable para renombrar/borrar categorías de gasto o
// ingreso -- así el "100% personalizable" aplica también a las categorías
// precargadas, no solo a agregar una nueva al vuelo desde el formulario.
function gestionarCategoriasNegocio(tipo) {
  const tabla = tipo === "gasto" ? "negocio_categorias_gasto" : "negocio_categorias_ingreso";
  const cats = tipo === "gasto" ? _contaCategoriasGasto : _contaCategoriasIngreso;
  abrirModalTienda(`Categorías de ${tipo}`, `
    ${cats.length ? cats.map(c => `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <input class="cfg-input" data-cat-rename="${c.id}" type="text" value="${esc(c.nombre)}" style="flex:1">
        <button data-cat-del="${c.id}" style="border:none;background:none;cursor:pointer;color:#c0392b">${ic("trash-2")}</button>
      </div>`).join("") : `<p style="font-size:13px;color:#999;margin-bottom:10px">Todavía no tienes categorías.</p>`}
    <div style="display:flex;gap:8px;margin-top:12px">
      <input class="cfg-input" id="cat-nueva" type="text" placeholder="Nueva categoría...">
      <button class="btn btn--primario" id="cat-agregar" type="button">Agregar</button>
    </div>
  `);
  $$("[data-cat-rename]").forEach(input => {
    input.addEventListener("blur", async () => {
      const nuevo = input.value.trim();
      if (!nuevo) return;
      await supabase.from(tabla).update({ nombre: nuevo }).eq("id", input.dataset.catRename);
    });
  });
  $$("[data-cat-del]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Borrar esta categoría? Los movimientos que ya la tengan quedan sin categoría.")) return;
    await supabase.from(tabla).delete().eq("id", btn.dataset.catDel);
    await cargarContabilidadNegocio(_contaNegocioId);
    gestionarCategoriasNegocio(tipo);
  }));
  $("#cat-agregar")?.addEventListener("click", async () => {
    const input = $("#cat-nueva");
    const nombre = input?.value.trim();
    if (!nombre) return;
    await supabase.from(tabla).insert({ negocio_id: _contaNegocioId, nombre });
    await cargarContabilidadNegocio(_contaNegocioId);
    gestionarCategoriasNegocio(tipo);
  });
}

// Grupos de toppings/modificadores (ej. "Salsas", "Tamaño") -- se arman una
// sola vez por negocio y se pegan a los productos que los necesiten desde su
// propio formulario, en vez de repetir la misma lista de salsas producto por
// producto. "única" = el cliente elige exactamente 1 (obligatorio, como un
// radio); "múltiple" = marca las que quiera (opcional, como checkboxes).
function cargarModGrupos() {
  const list = $("#conta-mod-grupos-list");
  if (!list) return;
  if (!_contaModGrupos.length) { list.innerHTML = `<p style="padding:8px 0">Aún no tienes grupos de toppings. Crea uno como "Salsas" o "Tamaño".</p>`; return; }
  const filaOpcion = (o) => `
    <div style="display:flex;align-items:center;gap:12px;padding:8px 0 8px 54px;border-bottom:1px solid #f3f3f3">
      ${o.imagen_url ? `<img src="${esc(o.imagen_url)}" alt="${esc(o.nombre)}" style="width:36px;height:36px;object-fit:cover;border-radius:8px;flex-shrink:0">` : `<div style="width:36px;height:36px;border-radius:8px;background:#f0faf4;flex-shrink:0"></div>`}
      <div style="flex:1;min-width:0;font-size:13.5px;font-weight:500">${esc(o.nombre)}</div>
      <div style="font-size:12px;color:#777;white-space:nowrap">${o.precio_adicional ? "+" + COP(o.precio_adicional) : "Incluido"}</div>
    </div>`;
  list.innerHTML = _contaModGrupos.map(g => {
    const opciones = _contaModOpciones.filter(o => o.grupo_id === g.id);
    return `
    <details style="border-bottom:1px solid #ebebeb">
      <summary style="cursor:pointer;padding:12px 0;list-style:none;display:flex;align-items:center;gap:10px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px">${esc(g.nombre)}</div>
          <div style="font-size:12px;color:#777">${g.tipo === "unica" ? "Selección única · obligatorio" : "Selección múltiple · opcional"} · ${opciones.length} opción${opciones.length === 1 ? "" : "es"}</div>
        </div>
        <button data-ed-modgrupo="${g.id}" style="border:none;background:none;cursor:pointer;color:#777">${ic("pencil")}</button>
        <button data-rm-modgrupo="${g.id}" style="border:none;background:none;cursor:pointer;color:#c0392b">${ic("trash-2")}</button>
      </summary>
      <div style="padding-bottom:4px">${opciones.map(filaOpcion).join("")}</div>
    </details>`;
  }).join("");
  if (window.lucide) lucide.createIcons();
  list.querySelectorAll("[data-ed-modgrupo]").forEach(btn => btn.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    const g = _contaModGrupos.find(x => x.id === btn.dataset.edModgrupo);
    if (g) abrirFormModGrupo(g);
  }));
  list.querySelectorAll("[data-rm-modgrupo]").forEach(btn => btn.addEventListener("click", async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("¿Eliminar este grupo? Se quita de todos los productos que lo usen.")) return;
    await supabase.from("negocio_carta_grupos_mod").delete().eq("id", btn.dataset.rmModgrupo);
    toast("Grupo eliminado");
    cargarContabilidadNegocio(_contaNegocioId);
  }));
}

function abrirFormModGrupo(g = {}) {
  const opciones = g.id ? _contaModOpciones.filter(o => o.grupo_id === g.id) : [];
  const filaOpcionHtml = (o = {}) => `
    <div class="mod-opcion-fila" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
      <label style="cursor:pointer;flex-shrink:0" title="Foto de esta opción (opcional)">
        <input type="file" accept="image/*" class="mod-opcion-foto" style="display:none">
        <span class="mod-opcion-foto-preview" style="width:36px;height:36px;border-radius:8px;background:#f0faf4 center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:15px;color:#999;${o.imagen_url ? `background-image:url('${esc(o.imagen_url)}')` : ""}">${o.imagen_url ? "" : "📷"}</span>
      </label>
      <input class="cfg-input mod-opcion-nombre" type="text" value="${esc(o.nombre || "")}" placeholder="Ej: Chocolate" style="flex:1;min-width:110px">
      <input class="cfg-input mod-opcion-precio" type="text" inputmode="numeric" value="${o.precio_adicional ? Number(o.precio_adicional).toLocaleString("es-CO") : ""}" placeholder="$0 si va incluido" style="width:120px">
      <input type="hidden" class="mod-opcion-foto-url" value="${o.imagen_url || ""}">
      <button type="button" class="mod-opcion-quitar" style="border:none;background:none;cursor:pointer;color:#c0392b;font-size:16px">✕</button>
    </div>`;
  abrirModalTienda(g.id ? "Editar grupo" : "Nuevo grupo de toppings", `
    <div class="cfg-campo"><label class="cfg-label">Nombre del grupo *</label><input class="cfg-input" id="modg-nombre" type="text" value="${esc(g.nombre || "")}" placeholder="Ej: Salsas, Tamaño, Sabor de helado"></div>
    <div class="cfg-campo"><label class="cfg-label">Pregunta para el cliente <span style="font-weight:400;color:var(--tinta-45)">(opcional)</span></label><input class="cfg-input" id="modg-pregunta" type="text" value="${esc(g.pregunta || "")}" placeholder='Ej: ¿Qué salsa quieres? -- si lo dejas vacío usamos "¿Quieres agregar ${esc(g.nombre || "esto")}?"'></div>
    <div class="cfg-campo">
      <label class="cfg-label">Tipo *</label>
      <select class="cfg-input" id="modg-tipo">
        <option value="unica" ${g.tipo !== "multiple" ? "selected" : ""}>Selección única (el cliente elige exactamente 1, obligatorio)</option>
        <option value="multiple" ${g.tipo === "multiple" ? "selected" : ""}>Selección múltiple (el cliente marca las que quiera, opcional)</option>
      </select>
    </div>
    <label class="cfg-label" style="display:block;margin-top:10px">Opciones <span style="font-weight:400;color:var(--tinta-45)">(deja el precio en $0 si va incluida sin costo extra; la foto es opcional)</span></label>
    <div id="modg-opciones">${opciones.length ? opciones.map(filaOpcionHtml).join("") : filaOpcionHtml()}</div>
    <button type="button" class="btn" id="modg-opcion-add" style="margin-bottom:14px">+ Agregar opción</button>
    <button class="btn btn--primario" id="modg-save" data-id="${g.id || ""}">${g.id ? "Guardar cambios" : "Crear grupo"}</button>
  `);
  $$(".mod-opcion-precio").forEach(formatearInputMoneda);
  const reenlazarQuitar = () => {
    $$(".mod-opcion-quitar").forEach(btn => btn.onclick = () => {
      if ($$(".mod-opcion-fila").length <= 1) { btn.closest(".mod-opcion-fila").querySelectorAll("input").forEach(i => { if (i.type !== "file") i.value = ""; }); return; }
      btn.closest(".mod-opcion-fila").remove();
    });
  };
  const reenlazarFoto = () => {
    $$(".mod-opcion-foto").forEach(input => input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const preview = input.closest("label").querySelector(".mod-opcion-foto-preview");
      if (preview) { preview.style.backgroundImage = `url('${URL.createObjectURL(file)}')`; preview.textContent = ""; }
    });
  };
  reenlazarQuitar();
  reenlazarFoto();
  $("#modg-opcion-add")?.addEventListener("click", () => {
    const cont = $("#modg-opciones");
    cont.insertAdjacentHTML("beforeend", filaOpcionHtml());
    formatearInputMoneda(cont.lastElementChild.querySelector(".mod-opcion-precio"));
    reenlazarQuitar();
    reenlazarFoto();
  });
  $("#modg-save")?.addEventListener("click", async () => {
    const btn = $("#modg-save");
    const resetBtn = () => { btn.disabled = false; btn.textContent = g.id ? "Guardar cambios" : "Crear grupo"; };
    const nombre = $("#modg-nombre")?.value.trim();
    const pregunta = $("#modg-pregunta")?.value.trim() || null;
    const tipo = $("#modg-tipo")?.value;
    if (!nombre) { toast("El nombre del grupo es obligatorio"); return; }
    const filas = $$(".mod-opcion-fila").filter(fila => fila.querySelector(".mod-opcion-nombre")?.value.trim());
    if (!filas.length) { toast("Agrega al menos una opción"); return; }
    btn.disabled = true; btn.textContent = "Guardando…";
    let filasOpciones;
    try {
      filasOpciones = await Promise.all(filas.map(async (fila) => {
        let imagenUrl = fila.querySelector(".mod-opcion-foto-url")?.value || null;
        const fotoFile = fila.querySelector(".mod-opcion-foto")?.files?.[0];
        if (fotoFile) {
          const file = await comprimirImagen(fotoFile);
          const ext = file.name.split(".").pop();
          const path = `carta-topping-${_contaNegocioId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${ext}`;
          const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
          if (upErr) throw upErr;
          imagenUrl = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
        }
        return {
          nombre: fila.querySelector(".mod-opcion-nombre")?.value.trim(),
          precio_adicional: valorMoneda(fila.querySelector(".mod-opcion-precio")) || 0,
          imagen_url: imagenUrl,
        };
      }));
    } catch { toast("Error subiendo una foto"); resetBtn(); return; }
    let grupoId = g.id;
    if (grupoId) {
      const { error } = await supabase.from("negocio_carta_grupos_mod").update({ nombre, tipo, pregunta }).eq("id", grupoId);
      if (error) { toast("Error: " + error.message); resetBtn(); return; }
      await supabase.from("negocio_carta_opciones_mod").delete().eq("grupo_id", grupoId);
    } else {
      const { data: nuevo, error } = await supabase.from("negocio_carta_grupos_mod").insert({ negocio_id: _contaNegocioId, nombre, tipo, pregunta, orden: _contaModGrupos.length }).select().single();
      if (error) { toast("Error: " + error.message); resetBtn(); return; }
      grupoId = nuevo.id;
    }
    const { error: errOpc } = await supabase.from("negocio_carta_opciones_mod").insert(
      filasOpciones.map((o, i) => ({ negocio_id: _contaNegocioId, grupo_id: grupoId, nombre: o.nombre, precio_adicional: o.precio_adicional, imagen_url: o.imagen_url, orden: i }))
    );
    if (errOpc) { toast("Error: " + errOpc.message); resetBtn(); return; }
    cerrarModalTienda();
    toast(g.id ? "Grupo actualizado ✓" : "Grupo creado ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  });
}

// ============================================================
// COSTOS: insumos (materia prima) + receta por producto -> costo y margen
// automáticos. El costo de un insumo se calcula una sola vez al cargarlo
// (costo_compra / cantidad_comprada, guardado ya resuelto como
// costo_unitario -- no un valor generado en la base de datos, para no
// depender de que la vista pública tenga que exponerlo: esto vive solo en
// el dashboard del negocio). El costo de un producto es la suma de
// (cantidad_usada × costo_unitario) de cada insumo de su receta, más el %
// operativo configurable (mano de obra, arriendo...) que el negocio define
// una sola vez para todos sus productos.
function unidadLabel(u) { return { g: "g", kg: "kg", ml: "ml", l: "L", unidad: "unidad", paquete: "paquete" }[u] || u || "unidad"; }

// Costo de una receta primaria (suma de sus propios insumos) y su costo POR
// UNIDAD de lo que rinde (ej. una salsa que rinde 500g y cuesta $5.000 en
// insumos sale a $10/g) -- ese costo por unidad es lo que se usa cuando un
// producto la toma como ingrediente, igual que el costo_unitario de un
// insumo cualquiera.
function costoRecetaPrimariaTotal(recetaPrimariaId) {
  return _contaRecetasPrimariasInsumos.filter(r => r.receta_primaria_id === recetaPrimariaId).reduce((sum, r) => {
    const insumo = _contaInsumos.find(i => i.id === r.insumo_id);
    return insumo ? sum + (Number(r.cantidad_usada) || 0) * (Number(insumo.costo_unitario) || 0) : sum;
  }, 0);
}
function costoUnitarioRecetaPrimaria(recetaPrimariaId) {
  const rp = _contaRecetasPrimarias.find(x => x.id === recetaPrimariaId);
  const rendimiento = Number(rp?.rendimiento_cantidad) || 0;
  return rendimiento > 0 ? costoRecetaPrimariaTotal(recetaPrimariaId) / rendimiento : 0;
}
// El <select> de una fila de receta guarda "insumo:ID" o "primaria:ID" en
// el mismo valor -- esto resuelve cuál es y da su unidad + costo por
// unidad, sin que el resto del editor tenga que distinguir los dos casos.
function resolverIngredienteReceta(valor) {
  if (!valor) return null;
  const [tipo, id] = valor.split(":");
  if (tipo === "primaria") {
    const rp = _contaRecetasPrimarias.find(x => x.id === id);
    return rp ? { unidad: rp.rendimiento_unidad, costoUnitario: costoUnitarioRecetaPrimaria(id) } : null;
  }
  const insumo = _contaInsumos.find(x => x.id === id);
  return insumo ? { unidad: insumo.unidad, costoUnitario: Number(insumo.costo_unitario) || 0 } : null;
}

// Fila reutilizable del editor de receta (insumo o receta primaria +
// cantidad + unidad) -- la usan el modal dedicado "Receta final de..."
// (desde Costos), la sección "Receta final de este producto" embebida en
// "Agregar/editar producto" (desde Productos de mi carta), y el editor de
// una Receta primaria misma (esa última SIN la opción de volver a elegir
// otra receta primaria -- evita anidar una dentro de otra).
function filaRecetaInsumoHtml(r = {}, incluirPrimarias = false) {
  const valorActual = r.receta_primaria_id ? `primaria:${r.receta_primaria_id}` : r.insumo_id ? `insumo:${r.insumo_id}` : "";
  const opcionesInsumos = _contaInsumos.map(i => `<option value="insumo:${i.id}" ${valorActual === `insumo:${i.id}` ? "selected" : ""}>${esc(i.nombre)} (${esc(unidadLabel(i.unidad))})</option>`).join("");
  const opcionesHtml = incluirPrimarias && _contaRecetasPrimarias.length
    ? `<optgroup label="Insumos">${opcionesInsumos}</optgroup><optgroup label="Recetas primarias">${_contaRecetasPrimarias.map(rp => `<option value="primaria:${rp.id}" ${valorActual === `primaria:${rp.id}` ? "selected" : ""}>${esc(rp.nombre)} (${esc(unidadLabel(rp.rendimiento_unidad))})</option>`).join("")}</optgroup>`
    : opcionesInsumos;
  const ingActual = resolverIngredienteReceta(valorActual) || resolverIngredienteReceta(`insumo:${_contaInsumos[0]?.id}`);
  return `
    <div class="receta-fila" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
      <select class="cfg-input receta-insumo" style="flex:1;min-width:140px">
        ${opcionesHtml}
      </select>
      <input class="cfg-input receta-cantidad" type="number" min="0" step="any" value="${r.cantidad_usada || ""}" placeholder="Cantidad" style="width:90px">
      <span class="receta-unidad" style="font-size:12px;color:var(--tinta-45);min-width:34px">${esc(unidadLabel(ingActual?.unidad))}</span>
      <button type="button" class="receta-quitar" style="border:none;background:none;cursor:pointer;color:#c0392b;font-size:16px">✕</button>
    </div>`;
}

// Arma toda la interactividad del editor de receta (agregar/quitar filas,
// mostrar la unidad del ingrediente elegido, calcular costo/margen en
// vivo) -- devuelve leerFilas() para el guardado y actualizar() para
// recalcular desde afuera (ej. cuando cambia el precio en el mismo
// formulario). incluirPrimarias controla si el selector de cada fila
// también ofrece recetas primarias (ver filaRecetaInsumoHtml).
function configurarEditorReceta({ contenedorId, addId, previewId, obtenerPrecio, incluirPrimarias = false }) {
  const contenedor = $(`#${contenedorId}`);
  if (!contenedor) return null;
  const reenlazarQuitar = () => {
    $$(".receta-quitar").forEach(btn => btn.onclick = () => {
      if ($$(".receta-fila").length <= 1) return;
      btn.closest(".receta-fila").remove();
      actualizar();
    });
  };
  const actualizarUnidades = () => {
    $$(".receta-fila").forEach(fila => {
      const valor = fila.querySelector(".receta-insumo")?.value;
      const span = fila.querySelector(".receta-unidad");
      if (span) span.textContent = unidadLabel(resolverIngredienteReceta(valor)?.unidad);
    });
  };
  const actualizar = () => {
    actualizarUnidades();
    const pct = Number(_contaNegocio.carta_costo_operativo_pct) || 0;
    let costoInsumos = 0;
    $$(".receta-fila").forEach(fila => {
      const valor = fila.querySelector(".receta-insumo")?.value;
      const cantidad = parseFloat(fila.querySelector(".receta-cantidad")?.value) || 0;
      const ing = resolverIngredienteReceta(valor);
      if (ing) costoInsumos += cantidad * ing.costoUnitario;
    });
    const costoTotal = costoInsumos * (1 + pct / 100);
    const precio = obtenerPrecio();
    const margen = precio > 0 ? (((precio - costoTotal) / precio) * 100) : null;
    const preview = $(`#${previewId}`);
    if (preview) preview.textContent = `Costo: ${COP(costoTotal)}${margen != null ? ` · Margen: ${margen.toFixed(0)}%` : ""}`;
  };
  const reenlazarCambios = () => $$(".receta-insumo, .receta-cantidad").forEach(el => el.addEventListener("input", actualizar));
  reenlazarQuitar();
  reenlazarCambios();
  actualizar();
  $(`#${addId}`)?.addEventListener("click", () => {
    contenedor.insertAdjacentHTML("beforeend", filaRecetaInsumoHtml({}, incluirPrimarias));
    reenlazarQuitar();
    reenlazarCambios();
    actualizar();
  });
  return {
    actualizar,
    leerFilas: () => $$(".receta-fila").map(fila => {
      const valor = fila.querySelector(".receta-insumo")?.value || "";
      const [tipo, id] = valor.split(":");
      return {
        insumo_id: tipo === "insumo" ? id : null,
        receta_primaria_id: tipo === "primaria" ? id : null,
        cantidad_usada: parseFloat(fila.querySelector(".receta-cantidad")?.value) || 0,
      };
    }).filter(f => (f.insumo_id || f.receta_primaria_id) && f.cantidad_usada > 0),
  };
}

async function guardarCostoOperativoPct() {
  const btn = $("#costos-operativo-guardar");
  const pct = Math.max(0, parseFloat($("#costos-operativo-pct")?.value) || 0);
  if (btn) { btn.disabled = true; btn.textContent = "Guardando…"; }
  const { error } = await supabase.from("aliados").update({ carta_costo_operativo_pct: pct }).eq("id", _contaNegocioId);
  if (btn) { btn.disabled = false; btn.textContent = "Guardar"; }
  if (error) { toast("Error: " + error.message); return; }
  _contaNegocio.carta_costo_operativo_pct = pct;
  toast("Guardado ✓");
  cargarCostosProductos();
}

function cargarInsumos() {
  const list = $("#costos-insumos-list");
  if (!list) return;
  if (!_contaInsumos.length) { list.innerHTML = `<p style="padding:8px 0">Aún no tienes insumos. Agrega harina, queso, vasos... lo que uses para preparar tus productos.</p>`; return; }
  list.innerHTML = _contaInsumos.map(i => `
    <div style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #ebebeb">
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">${esc(i.nombre)}</div>
        <div style="font-size:12px;color:#777">${COP(i.costo_unitario)} / ${esc(unidadLabel(i.unidad))} · compraste ${i.cantidad_comprada} ${esc(unidadLabel(i.unidad))} por ${COP(i.costo_compra)}</div>
      </div>
      <button data-ed-insumo="${i.id}" style="border:none;background:none;cursor:pointer;color:#777">${ic("pencil")}</button>
      <button data-rm-insumo="${i.id}" style="border:none;background:none;cursor:pointer;color:#c0392b">${ic("trash-2")}</button>
    </div>`).join("");
  if (window.lucide) lucide.createIcons();
  list.querySelectorAll("[data-ed-insumo]").forEach(btn => btn.addEventListener("click", () => {
    const i = _contaInsumos.find(x => x.id === btn.dataset.edInsumo);
    if (i) abrirFormInsumo(i);
  }));
  list.querySelectorAll("[data-rm-insumo]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Eliminar este insumo? Se quita de las recetas que lo usen.")) return;
    await supabase.from("negocio_insumos").delete().eq("id", btn.dataset.rmInsumo);
    toast("Insumo eliminado");
    cargarContabilidadNegocio(_contaNegocioId);
  }));
}

function abrirFormInsumo(i = {}) {
  abrirModalTienda(i.id ? "Editar insumo" : "Nuevo insumo", `
    <div class="cfg-campo"><label class="cfg-label">Nombre *</label><input class="cfg-input" id="ins-nombre" type="text" value="${esc(i.nombre || "")}" placeholder="Ej: Harina de trigo"></div>
    <div class="cfg-campo"><label class="cfg-label">Unidad de medida *</label>
      <select class="cfg-input" id="ins-unidad">
        <option value="g" ${i.unidad === "g" ? "selected" : ""}>Gramos (g)</option>
        <option value="kg" ${i.unidad === "kg" ? "selected" : ""}>Kilogramos (kg)</option>
        <option value="ml" ${i.unidad === "ml" ? "selected" : ""}>Mililitros (ml)</option>
        <option value="l" ${i.unidad === "l" ? "selected" : ""}>Litros (L)</option>
        <option value="unidad" ${!i.unidad || i.unidad === "unidad" ? "selected" : ""}>Unidad</option>
        <option value="paquete" ${i.unidad === "paquete" ? "selected" : ""}>Paquete</option>
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="cfg-campo"><label class="cfg-label">Cantidad comprada *</label><input class="cfg-input" id="ins-cantidad" type="number" min="0" step="any" value="${i.cantidad_comprada || ""}" placeholder="Ej: 50"></div>
      <div class="cfg-campo"><label class="cfg-label">Costo de la compra *</label><input class="cfg-input" id="ins-costo" type="text" inputmode="numeric" value="${i.costo_compra ? Number(i.costo_compra).toLocaleString("es-CO") : ""}" placeholder="Ej: 150.000"></div>
    </div>
    <p id="ins-costo-unitario-preview" style="font-size:12.5px;color:var(--tinta-60);margin:-4px 0 4px">Costo por unidad: --</p>
    <p style="font-size:12px;color:var(--tinta-45);margin:0 0 14px">Esto es solo lo que te cuesta en general. Cuánto usa CADA producto (ej. cuánta crema lleva un vaso) se define en "Costo y margen por producto" → Armar receta final.</p>
    <button class="btn btn--primario" id="ins-save" data-id="${i.id || ""}">${i.id ? "Guardar cambios" : "Agregar insumo"}</button>
  `);
  formatearInputMoneda($("#ins-costo"));
  const actualizarPreviewInsumo = () => {
    const cantidad = parseFloat($("#ins-cantidad")?.value) || 0;
    const costo = valorMoneda($("#ins-costo")) || 0;
    const unidad = $("#ins-unidad")?.value;
    const preview = $("#ins-costo-unitario-preview");
    if (preview) preview.textContent = cantidad > 0 ? `Costo por unidad: ${COP(costo / cantidad)} / ${unidadLabel(unidad)}` : "Costo por unidad: --";
  };
  $("#ins-cantidad")?.addEventListener("input", actualizarPreviewInsumo);
  $("#ins-costo")?.addEventListener("input", actualizarPreviewInsumo);
  $("#ins-unidad")?.addEventListener("change", actualizarPreviewInsumo);
  actualizarPreviewInsumo();
  $("#ins-save")?.addEventListener("click", async () => {
    const btn = $("#ins-save");
    const resetBtn = () => { btn.disabled = false; btn.textContent = i.id ? "Guardar cambios" : "Agregar insumo"; };
    const nombre = $("#ins-nombre")?.value.trim();
    const unidad = $("#ins-unidad")?.value;
    const cantidad = parseFloat($("#ins-cantidad")?.value) || 0;
    const costo = valorMoneda($("#ins-costo")) || 0;
    if (!nombre) { toast("El nombre es obligatorio"); return; }
    if (!cantidad) { toast("La cantidad comprada debe ser mayor a 0"); return; }
    btn.disabled = true; btn.textContent = "Guardando…";
    const payload = { negocio_id: _contaNegocioId, nombre, unidad, cantidad_comprada: cantidad, costo_compra: costo, costo_unitario: costo / cantidad };
    const { error } = i.id
      ? await supabase.from("negocio_insumos").update(payload).eq("id", i.id)
      : await supabase.from("negocio_insumos").insert(payload);
    if (error) { toast("Error: " + error.message); resetBtn(); return; }
    cerrarModalTienda();
    toast(i.id ? "Insumo actualizado ✓" : "Insumo agregado ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  });
}

function costoInsumosProducto(productoId) {
  return _contaRecetaItems.filter(r => r.producto_id === productoId).reduce((sum, r) => {
    if (r.receta_primaria_id) return sum + (Number(r.cantidad_usada) || 0) * costoUnitarioRecetaPrimaria(r.receta_primaria_id);
    const insumo = _contaInsumos.find(i => i.id === r.insumo_id);
    return insumo ? sum + (Number(r.cantidad_usada) || 0) * (Number(insumo.costo_unitario) || 0) : sum;
  }, 0);
}

function cargarCostosProductos() {
  const list = $("#costos-productos-list");
  if (!list) return;
  if (!_contaCartaProductos.length) { list.innerHTML = `<p style="padding:8px 0">Primero agrega productos en "Productos de mi carta".</p>`; return; }
  const pct = Number(_contaNegocio.carta_costo_operativo_pct) || 0;
  list.innerHTML = _contaCartaProductos.map(p => {
    const tieneReceta = _contaRecetaItems.some(r => r.producto_id === p.id);
    const costoTotal = costoInsumosProducto(p.id) * (1 + pct / 100);
    const precio = Number(p.precio) || 0;
    const margenPct = tieneReceta && precio > 0 ? ((precio - costoTotal) / precio) * 100 : null;
    const colorMargen = margenPct == null ? "#999" : margenPct < 0 ? "#c0392b" : margenPct < 20 ? "#b45309" : "#0e7a3e";
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #ebebeb;flex-wrap:wrap">
      <div style="flex:1;min-width:160px">
        <div style="font-weight:600;font-size:14px">${esc(p.nombre)}</div>
        <div style="font-size:12px;color:#777">Precio ${COP(precio)}${tieneReceta ? ` · Costo ${COP(costoTotal)}` : ""}</div>
      </div>
      <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:${colorMargen}22;color:${colorMargen};white-space:nowrap">${margenPct != null ? `${margenPct.toFixed(0)}% margen` : "Sin receta"}</span>
      <button data-ed-receta="${p.id}" class="btn" style="padding:7px 12px;font-size:12px">${tieneReceta ? "Editar receta final" : "Armar receta final"}</button>
    </div>`;
  }).join("");
  list.querySelectorAll("[data-ed-receta]").forEach(btn => btn.addEventListener("click", () => {
    const p = _contaCartaProductos.find(x => x.id === btn.dataset.edReceta);
    if (p) abrirFormReceta(p);
  }));
}

function abrirFormReceta(p) {
  if (!_contaInsumos.length) { toast("Primero agrega al menos un insumo"); return; }
  const itemsActuales = _contaRecetaItems.filter(r => r.producto_id === p.id);
  abrirModalTienda(`Receta final de "${p.nombre}"`, `
    <p style="font-size:12.5px;color:var(--tinta-60);margin-bottom:14px">¿Qué insumos (o recetas primarias) usa este producto y cuánto de cada uno?</p>
    <div id="receta-filas">${itemsActuales.length ? itemsActuales.map(r => filaRecetaInsumoHtml(r, true)).join("") : filaRecetaInsumoHtml({}, true)}</div>
    <button type="button" class="btn" id="receta-add" style="margin-bottom:14px">+ Agregar</button>
    <div id="receta-costo-preview" style="font-size:13px;font-weight:600;color:var(--tinta);margin-bottom:14px"></div>
    <button class="btn btn--primario" id="receta-save" data-id="${p.id}">Guardar receta final</button>
  `);
  const editor = configurarEditorReceta({ contenedorId: "receta-filas", addId: "receta-add", previewId: "receta-costo-preview", obtenerPrecio: () => Number(p.precio) || 0, incluirPrimarias: true });
  $("#receta-save")?.addEventListener("click", async () => {
    const btn = $("#receta-save");
    btn.disabled = true; btn.textContent = "Guardando…";
    const filas = editor.leerFilas();
    await supabase.from("negocio_carta_producto_insumos").delete().eq("producto_id", p.id);
    if (filas.length) {
      const { error } = await supabase.from("negocio_carta_producto_insumos").insert(
        filas.map(f => ({ negocio_id: _contaNegocioId, producto_id: p.id, insumo_id: f.insumo_id, receta_primaria_id: f.receta_primaria_id, cantidad_usada: f.cantidad_usada }))
      );
      if (error) { toast("Error: " + error.message); btn.disabled = false; btn.textContent = "Guardar receta final"; return; }
    }
    cerrarModalTienda();
    toast("Receta final guardada ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  });
}

// ---------- Recetas primarias: mezclas base reusables (ej. una salsa) que
// se pueden usar como un ingrediente más dentro de la Receta final de
// cualquier producto, sin repetir sus insumos cada vez. ----------
function cargarRecetasPrimarias() {
  const list = $("#costos-primarias-list");
  if (!list) return;
  if (!_contaRecetasPrimarias.length) { list.innerHTML = `<p style="padding:8px 0">Aún no tienes recetas primarias.</p>`; return; }
  list.innerHTML = _contaRecetasPrimarias.map(rp => {
    const costoTotal = costoRecetaPrimariaTotal(rp.id);
    const costoUnit = costoUnitarioRecetaPrimaria(rp.id);
    return `
    <div style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #ebebeb">
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px">${esc(rp.nombre)}</div>
        <div style="font-size:12px;color:#777">Rinde ${rp.rendimiento_cantidad} ${esc(unidadLabel(rp.rendimiento_unidad))} · Costo total ${COP(costoTotal)} · ${COP(costoUnit)} / ${esc(unidadLabel(rp.rendimiento_unidad))}</div>
      </div>
      <button data-ed-primaria="${rp.id}" style="border:none;background:none;cursor:pointer;color:#777">${ic("pencil")}</button>
      <button data-rm-primaria="${rp.id}" style="border:none;background:none;cursor:pointer;color:#c0392b">${ic("trash-2")}</button>
    </div>`;
  }).join("");
  if (window.lucide) lucide.createIcons();
  list.querySelectorAll("[data-ed-primaria]").forEach(btn => btn.addEventListener("click", () => {
    const rp = _contaRecetasPrimarias.find(x => x.id === btn.dataset.edPrimaria);
    if (rp) abrirFormRecetaPrimaria(rp);
  }));
  list.querySelectorAll("[data-rm-primaria]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Eliminar esta receta primaria? Se quita de los productos que la usen.")) return;
    await supabase.from("negocio_recetas_primarias").delete().eq("id", btn.dataset.rmPrimaria);
    toast("Receta primaria eliminada");
    cargarContabilidadNegocio(_contaNegocioId);
  }));
}

function abrirFormRecetaPrimaria(rp = {}) {
  if (!_contaInsumos.length) { toast("Primero agrega al menos un insumo"); return; }
  const itemsActuales = _contaRecetasPrimariasInsumos.filter(r => r.receta_primaria_id === rp.id);
  abrirModalTienda(rp.id ? "Editar receta primaria" : "Nueva receta primaria", `
    <div class="cfg-campo"><label class="cfg-label">Nombre *</label><input class="cfg-input" id="rp-nombre" type="text" value="${esc(rp.nombre || "")}" placeholder="Ej: Salsa de chocolate"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="cfg-campo"><label class="cfg-label">Esta receta rinde *</label><input class="cfg-input" id="rp-rendimiento" type="number" min="0" step="any" value="${rp.rendimiento_cantidad || ""}" placeholder="Ej: 500"></div>
      <div class="cfg-campo"><label class="cfg-label">Unidad *</label>
        <select class="cfg-input" id="rp-unidad">
          <option value="g" ${rp.rendimiento_unidad === "g" ? "selected" : ""}>Gramos (g)</option>
          <option value="kg" ${rp.rendimiento_unidad === "kg" ? "selected" : ""}>Kilogramos (kg)</option>
          <option value="ml" ${rp.rendimiento_unidad === "ml" ? "selected" : ""}>Mililitros (ml)</option>
          <option value="l" ${rp.rendimiento_unidad === "l" ? "selected" : ""}>Litros (L)</option>
          <option value="unidad" ${!rp.rendimiento_unidad || rp.rendimiento_unidad === "unidad" ? "selected" : ""}>Unidad</option>
          <option value="paquete" ${rp.rendimiento_unidad === "paquete" ? "selected" : ""}>Paquete</option>
        </select>
      </div>
    </div>
    <p style="font-size:12.5px;color:var(--tinta-60);margin:4px 0 14px">¿Qué insumos usa esta receta y cuánto de cada uno?</p>
    <div id="rp-filas">${itemsActuales.length ? itemsActuales.map(r => filaRecetaInsumoHtml(r)).join("") : filaRecetaInsumoHtml()}</div>
    <button type="button" class="btn" id="rp-add" style="margin-bottom:14px">+ Agregar insumo</button>
    <div id="rp-costo-preview" style="font-size:13px;font-weight:600;color:var(--tinta);margin-bottom:14px"></div>
    <button class="btn btn--primario" id="rp-save" data-id="${rp.id || ""}">${rp.id ? "Guardar cambios" : "Agregar receta primaria"}</button>
  `);
  const editor = configurarEditorReceta({ contenedorId: "rp-filas", addId: "rp-add", previewId: "rp-costo-preview", obtenerPrecio: () => 0 });
  $("#rp-save")?.addEventListener("click", async () => {
    const btn = $("#rp-save");
    const resetBtn = () => { btn.disabled = false; btn.textContent = rp.id ? "Guardar cambios" : "Agregar receta primaria"; };
    const nombre = $("#rp-nombre")?.value.trim();
    const rendimiento = parseFloat($("#rp-rendimiento")?.value) || 0;
    const unidad = $("#rp-unidad")?.value;
    if (!nombre) { toast("El nombre es obligatorio"); return; }
    if (!rendimiento) { toast("El rendimiento debe ser mayor a 0"); return; }
    btn.disabled = true; btn.textContent = "Guardando…";
    const payload = { negocio_id: _contaNegocioId, nombre, rendimiento_cantidad: rendimiento, rendimiento_unidad: unidad };
    const { data: guardada, error } = rp.id
      ? await supabase.from("negocio_recetas_primarias").update(payload).eq("id", rp.id).select().single()
      : await supabase.from("negocio_recetas_primarias").insert(payload).select().single();
    if (error) { toast("Error: " + error.message); resetBtn(); return; }
    const filas = editor.leerFilas();
    await supabase.from("negocio_recetas_primarias_insumos").delete().eq("receta_primaria_id", guardada.id);
    if (filas.length) {
      const { error: errFilas } = await supabase.from("negocio_recetas_primarias_insumos").insert(
        filas.map(f => ({ negocio_id: _contaNegocioId, receta_primaria_id: guardada.id, insumo_id: f.insumo_id, cantidad_usada: f.cantidad_usada }))
      );
      if (errFilas) { toast("Error: " + errFilas.message); resetBtn(); return; }
    }
    cerrarModalTienda();
    toast(rp.id ? "Receta primaria actualizada ✓" : "Receta primaria agregada ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  });
}

// ============================================================
// MÉTRICAS: visitas a la carta pública (día/semana/mes), horas pico y top
// 10 productos más vendidos. Las visitas se registran desde carta.js cada
// vez que alguien abre la carta (sin login, sin dato personal -- solo
// negocio_id + hora); acá solo se leen y se resumen. "Top productos" sale
// de los pedidos ya cargados (hasta los últimos 100), agrupando por nombre
// -- no depende de que el producto siga existiendo en la carta.
function cargarMetricas() {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const diffLunes = (inicioHoy.getDay() + 6) % 7; // lunes como primer día de la semana
  const inicioSemana = new Date(inicioHoy); inicioSemana.setDate(inicioHoy.getDate() - diffLunes);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const fechas = _contaVisitas.map(v => new Date(v.created_at));
  const contarDesde = (desde) => fechas.filter(f => f >= desde).length;
  const elHoy = $("#metricas-visitas-hoy"); if (elHoy) elHoy.textContent = contarDesde(inicioHoy);
  const elSemana = $("#metricas-visitas-semana"); if (elSemana) elSemana.textContent = contarDesde(inicioSemana);
  const elMes = $("#metricas-visitas-mes"); if (elMes) elMes.textContent = contarDesde(inicioMes);

  const fmtHora = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
  const porHora = new Array(24).fill(0);
  fechas.forEach(f => { porHora[f.getHours()]++; });
  const horasConVisitas = porHora.map((n, h) => ({ h, n })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
  const horasPicoEl = $("#metricas-horas-pico");
  if (horasPicoEl) {
    if (!horasConVisitas.length) {
      horasPicoEl.innerHTML = `<p style="padding:8px 0">Todavía no hay suficientes visitas para ver un patrón.</p>`;
    } else {
      const max = horasConVisitas[0].n;
      horasPicoEl.innerHTML = `
        <p style="font-size:13px;color:var(--tinta-60);margin-bottom:14px">Tu hora pico es <strong style="color:var(--tinta)">${fmtHora(horasConVisitas[0].h)}–${fmtHora((horasConVisitas[0].h + 1) % 24)}</strong> con ${horasConVisitas[0].n} visita${horasConVisitas[0].n === 1 ? "" : "s"}.</p>
        ${horasConVisitas.slice(0, 8).map(({ h, n }) => `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;margin-bottom:4px">
            <span style="font-weight:600">${fmtHora(h)} – ${fmtHora((h + 1) % 24)}</span>
            <span style="color:var(--tinta-60)">${n} visita${n === 1 ? "" : "s"}</span>
          </div>
          <div style="background:var(--crema-2);border-radius:100px;height:10px;overflow:hidden">
            <div style="width:${(n / max) * 100}%;height:100%;background:var(--verde);border-radius:100px"></div>
          </div>
        </div>`).join("")}`;
    }
  }

  const topEl = $("#metricas-top-productos");
  if (topEl) {
    const porProducto = new Map();
    _contaCartaPedidos.filter(p => p.estado !== "cancelado").forEach(p => {
      (Array.isArray(p.items) ? p.items : []).forEach(it => {
        const nombre = it.nombre || "Producto";
        const actual = porProducto.get(nombre) || { cantidad: 0, total: 0 };
        actual.cantidad += Number(it.cantidad) || 0;
        actual.total += (Number(it.precio) || 0) * (Number(it.cantidad) || 0);
        porProducto.set(nombre, actual);
      });
    });
    const top10 = [...porProducto.entries()].sort((a, b) => b[1].cantidad - a[1].cantidad).slice(0, 10);
    if (!top10.length) {
      topEl.innerHTML = `<p style="padding:8px 0">Todavía no tienes pedidos para ver tus productos más vendidos.</p>`;
    } else {
      const max = top10[0][1].cantidad;
      topEl.innerHTML = top10.map(([nombre, d], i) => `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;margin-bottom:4px">
            <span style="font-weight:600">#${i + 1} ${esc(nombre)}</span>
            <span style="color:var(--tinta-60);white-space:nowrap">${d.cantidad} vendido${d.cantidad === 1 ? "" : "s"} · ${COP(d.total)}</span>
          </div>
          <div style="background:var(--crema-2);border-radius:100px;height:10px;overflow:hidden">
            <div style="width:${(d.cantidad / max) * 100}%;height:100%;background:var(--verde);border-radius:100px"></div>
          </div>
        </div>`).join("");
    }
  }
}

// Mesas (pedidos compartidos): cada mesa tiene su propio QR -- todo el que
// lo escanee entra a la misma "sesión de mesa" (ver RPC
// abrir_o_unir_sesion_mesa) y sus pedidos se agrupan solos en "Pedidos",
// sin que nadie tenga que pagar individual (se cobra la mesa completa).
function cargarMesas() {
  const seccion = $("#conta-mesas-seccion");
  const oculto = TIPOS_NEGOCIO_CARTA[_contaNegocio.carta_tipo_negocio]?.mesas === false || _contaClubNivel === 1;
  if (seccion) seccion.hidden = oculto;
  // La fila del hub de Carta también se oculta -- si no, el negocio entra
  // a una pantalla "Mesas" vacía. .carta-fila fija "display:flex" en su
  // propia clase, así que [hidden] (mismo peso, pero de la hoja de estilos
  // del navegador) no le gana -- hay que apagarla por display directo.
  const filaMesas = $('[data-carta-ir="mesas"]');
  if (filaMesas) filaMesas.style.display = oculto ? "none" : "";
  const list = $("#conta-mesas-list");
  if (!list) return;
  if (!_contaMesas.length) { list.innerHTML = `<p style="padding:8px 0">Aún no tienes mesas. Crea una y pega su QR en ella.</p>`; return; }
  list.innerHTML = _contaMesas.map(m => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #ebebeb">
      <div style="flex:1;font-weight:600;font-size:14px">🍽️ ${esc(m.nombre)}</div>
      <button data-ver-mesa="${m.id}" class="btn" style="padding:7px 12px;font-size:12px">Ver QR</button>
      <button data-rm-mesa="${m.id}" style="border:none;background:none;cursor:pointer;color:#c0392b">${ic("trash-2")}</button>
    </div>`).join("");
  if (window.lucide) lucide.createIcons();
  list.querySelectorAll("[data-ver-mesa]").forEach(btn => btn.addEventListener("click", () => {
    const m = _contaMesas.find(x => x.id === btn.dataset.verMesa);
    if (m) abrirQrMesa(m);
  }));
  list.querySelectorAll("[data-rm-mesa]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Eliminar esta mesa?")) return;
    await supabase.from("negocio_mesas").delete().eq("id", btn.dataset.rmMesa);
    toast("Mesa eliminada");
    cargarContabilidadNegocio(_contaNegocioId);
  }));
}

function abrirQrMesa(m) {
  const url = `${location.origin}/Carta.html?aliado=${_contaNegocioId}&mesa=${m.id}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(url)}`;
  abrirModalTienda(m.nombre, `
    <div style="text-align:center">
      <img src="${qrSrc}" alt="QR de ${esc(m.nombre)}" style="width:200px;height:200px;border-radius:10px;border:1px solid var(--linea);margin-bottom:14px">
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <a href="${qrSrc}" download="${esc(m.nombre)}-qr.png" class="btn">Descargar QR</a>
        <button class="btn" id="mesa-qr-copiar" type="button">Copiar link</button>
      </div>
    </div>
  `);
  $("#mesa-qr-copiar")?.addEventListener("click", () => copiarTextoConRespaldo(url).then(() => toast("Link copiado ✓")));
}

function abrirFormMesa() {
  abrirModalTienda("Nueva mesa", `
    <div class="cfg-campo"><label class="cfg-label">Nombre de la mesa *</label><input class="cfg-input" id="mesa-nombre" type="text" placeholder="Ej: Mesa 1"></div>
    <button class="btn btn--primario" id="mesa-save">Crear mesa</button>
  `);
  $("#mesa-save")?.addEventListener("click", async () => {
    const btn = $("#mesa-save");
    const nombre = $("#mesa-nombre")?.value.trim();
    if (!nombre) { toast("El nombre es obligatorio"); return; }
    btn.disabled = true; btn.textContent = "Creando…";
    const { error } = await supabase.from("negocio_mesas").insert({ negocio_id: _contaNegocioId, nombre, orden: _contaMesas.length });
    if (error) { toast("Error: " + error.message); btn.disabled = false; btn.textContent = "Crear mesa"; return; }
    cerrarModalTienda();
    toast("Mesa creada ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  });
}

async function cargarCartaProductos() {
  const list = $("#conta-carta-productos-list");
  if (!list) return;
  const productos = _contaCartaProductos;
  renderOrdenCategoriasCarta(); // por si cambiaron las categorías disponibles
  if (!productos.length) { list.innerHTML = `<p style="padding:8px 0">Aún no has agregado productos a tu carta.</p>`; return; }
  const STOCK_BAJO = 3; // a partir de cuántas unidades se considera "se está acabando"
  const filaProducto = (p) => {
    const stockBajo = p.stock_activo && (p.stock_cantidad ?? 0) > 0 && (p.stock_cantidad ?? 0) <= STOCK_BAJO;
    const agotado = p.stock_activo && (p.stock_cantidad ?? 0) <= 0;
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #ebebeb;flex-wrap:wrap">
      ${p.imagen_url ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0">` : `<div style="width:44px;height:44px;border-radius:8px;background:#f0faf4;flex-shrink:0"></div>`}
      <div style="flex:1;min-width:140px">
        <div style="font-weight:600;font-size:14px">${esc(p.nombre)}</div>
        <div style="font-size:12px;color:#777">${COP(p.precio)}${p.disponible ? "" : " · No disponible"}</div>
        ${p.stock_activo ? `
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:${agotado ? "#fdecea" : stockBajo ? "#fef3c7" : "var(--crema-2)"};color:${agotado ? "#c0392b" : stockBajo ? "#b45309" : "#777"}">${agotado ? "Agotado" : stockBajo ? `⚠️ Quedan ${p.stock_cantidad}` : `Stock: ${p.stock_cantidad ?? 0}`}</span>
          <input type="number" min="0" data-stock-rapido="${p.id}" value="${p.stock_cantidad ?? 0}" style="width:60px;padding:4px 6px;border:1px solid var(--linea-fuerte);border-radius:6px;font-size:12px" title="Ajustar stock rápido">
        </div>` : ""}
      </div>
      <button data-ed-ccp="${p.id}" style="border:none;background:none;cursor:pointer;color:#777">${ic("pencil")}</button>
      <button data-rm-ccp="${p.id}" style="border:none;background:none;cursor:pointer;color:#c0392b">${ic("trash-2")}</button>
    </div>`;
  };
  // Agrupados por categoría, cada una desplegable -- mismo criterio de
  // orden que ya usa la carta pública (carta_categorias_orden si el
  // negocio lo configuró, si no por primera aparición; "Sin categoría"
  // siempre al final).
  const grupos = new Map();
  productos.forEach(p => {
    const cat = (p.categoria || "").trim() || "Sin categoría";
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat).push(p);
  });
  const entradas = [...grupos.entries()];
  const ordenCfg = Array.isArray(_contaNegocio?.carta_categorias_orden) ? _contaNegocio.carta_categorias_orden : [];
  if (ordenCfg.length) {
    const nombresOrden = ordenCfg.map(catOrdenNombre);
    const indice = (cat) => { const i = nombresOrden.indexOf(cat); return i === -1 ? 999 : i; };
    entradas.sort((a, b) => indice(a[0]) - indice(b[0]));
  }
  entradas.sort((a, b) => (a[0] === "Sin categoría") - (b[0] === "Sin categoría"));
  list.innerHTML = entradas.length === 1
    ? entradas[0][1].map(filaProducto).join("")
    : entradas.map(([cat, prods]) => `
      <details style="border-bottom:1px solid #ebebeb">
        <summary style="cursor:pointer;padding:12px 0;font-weight:700;font-size:13.5px;color:var(--tinta);list-style:none;display:flex;align-items:center;justify-content:space-between">
          <span>${esc(cat)}</span>
          <span style="font-size:11.5px;font-weight:600;color:#999">${prods.length} producto${prods.length === 1 ? "" : "s"}</span>
        </summary>
        <div style="padding-bottom:4px">${prods.map(filaProducto).join("")}</div>
      </details>`).join("");
  if (window.lucide) lucide.createIcons();
  list.querySelectorAll("[data-ed-ccp]").forEach(btn => btn.addEventListener("click", () => {
    const p = productos.find(x => x.id === btn.dataset.edCcp);
    if (p) abrirFormProductoCarta(p);
  }));
  list.querySelectorAll("[data-rm-ccp]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Eliminar este producto de tu carta?")) return;
    await supabase.from("negocio_carta_productos").delete().eq("id", btn.dataset.rmCcp);
    toast("Producto eliminado");
    cargarContabilidadNegocio(_contaNegocioId);
  }));
  // Ajuste rápido de stock sin abrir "Editar producto" -- útil cuando llega
  // mercancía nueva y solo hay que actualizar el número.
  list.querySelectorAll("[data-stock-rapido]").forEach(input => input.addEventListener("change", async () => {
    const nuevo = Math.max(0, parseInt(input.value) || 0);
    input.value = nuevo;
    const { error } = await supabase.from("negocio_carta_productos").update({ stock_cantidad: nuevo }).eq("id", input.dataset.stockRapido);
    if (error) { toast("Error: " + error.message); return; }
    toast("Stock actualizado ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  }));
}

function abrirFormProductoCarta(p = {}) {
  abrirModalTienda(p.id ? "Editar producto" : "Agregar producto", `
    <div class="cfg-campo"><label class="cfg-label">Nombre *</label><input class="cfg-input" id="ccp-nombre" type="text" value="${esc(p.nombre || "")}" placeholder="Ej: Hamburguesa clásica"></div>
    <div class="cfg-campo"><label class="cfg-label">Descripción</label><textarea class="cfg-input" id="ccp-desc" rows="2">${p.descripcion || ""}</textarea></div>
    <div class="cfg-campo"><label class="cfg-label">Precio (COP) *</label><input class="cfg-input" id="ccp-precio" type="text" inputmode="numeric" value="${p.precio ? Number(p.precio).toLocaleString("es-CO") : ""}" placeholder="Ej: 18.000"></div>
    <div class="cfg-campo"><label class="cfg-label">Categoría <span style="font-weight:400;color:var(--tinta-45)">(para agrupar en la carta, ej. "Entradas", "Platos fuertes")</span></label>
      <input class="cfg-input" id="ccp-categoria" type="text" list="ccp-categorias-list" value="${esc(p.categoria || "")}" placeholder="Ej: Platos fuertes">
      <datalist id="ccp-categorias-list">${[...new Set(_contaCartaProductos.map(x => (x.categoria || "").trim()).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join("")}</datalist>
    </div>
    <div class="cfg-campo"><label class="cfg-label">Foto</label>
      <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
        <div style="width:84px;aspect-ratio:9/16;border-radius:10px;overflow:hidden;background:var(--crema-2);flex:none">
          <img id="ccp-foto-preview" src="${esc(p.imagen_url || "")}" alt="" style="width:100%;height:100%;object-fit:cover;${p.imagen_url ? "" : "display:none"}">
        </div>
        <div style="flex:1;min-width:160px">
          <input type="file" id="ccp-foto" accept="image/*">
          <input type="hidden" id="ccp-foto-url" value="${p.imagen_url || ""}">
          <span style="font-size:12px;color:var(--tinta-45);display:block;margin-top:4px">Así se ve en la carta (a pantalla completa) -- puedes mover y hacer zoom para encuadrarla antes de subirla.</span>
        </div>
      </div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--tinta-60);margin:4px 0 8px;cursor:pointer">
      <input type="checkbox" id="ccp-disponible" ${p.disponible === false ? "" : "checked"}> Disponible en la carta
    </label>
    <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--tinta-60);margin:4px 0 8px;cursor:pointer">
      <input type="checkbox" id="ccp-stock-activo" ${p.stock_activo ? "checked" : ""}> Controlar cuántos tengo disponibles (stock)
    </label>
    <div class="cfg-campo" id="ccp-stock-campo" ${p.stock_activo ? "" : "hidden"}>
      <label class="cfg-label">Cantidad disponible</label>
      <input class="cfg-input" id="ccp-stock-cantidad" type="number" min="0" value="${p.stock_cantidad ?? ""}" placeholder="Ej: 12">
      <span style="font-size:12px;color:var(--tinta-45);display:block;margin-top:4px">Baja sola cuando llega un pedido, y sube de nuevo si lo cancelas. Cuando llegue a 0, se muestra como "Agotado" y nadie lo puede pedir.</span>
    </div>
    ${_contaModGrupos.length ? `
    <div class="cfg-campo"><label class="cfg-label">Grupos de toppings que usa este producto <span style="font-weight:400;color:var(--tinta-45)">(opcional)</span></label>
      ${_contaModGrupos.map(g => `
        <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--tinta-60);margin-bottom:6px;cursor:pointer">
          <input type="checkbox" data-ccp-grupo value="${g.id}" ${p.id && _contaModProdGrupos.some(pg => pg.producto_id === p.id && pg.grupo_id === g.id) ? "checked" : ""}> ${esc(g.nombre)}
        </label>`).join("")}
    </div>` : ""}
    ${_contaInsumos.length ? `
    <details class="cfg-campo" style="margin-bottom:14px">
      <summary class="cfg-label" style="cursor:pointer">Receta final de este producto <span style="font-weight:400;color:var(--tinta-45)">(opcional -- calcula el costo y el margen de una vez)</span></summary>
      <div style="margin-top:10px">
        <div id="ccp-receta-filas">${(p.id ? _contaRecetaItems.filter(r => r.producto_id === p.id) : []).length ? _contaRecetaItems.filter(r => r.producto_id === p.id).map(r => filaRecetaInsumoHtml(r, true)).join("") : filaRecetaInsumoHtml({}, true)}</div>
        <button type="button" class="btn" id="ccp-receta-add" style="margin-bottom:10px">+ Agregar</button>
        <div id="ccp-receta-costo-preview" style="font-size:12.5px;font-weight:600;color:var(--tinta)"></div>
      </div>
    </details>` : `<p style="font-size:12px;color:var(--tinta-45);margin:-4px 0 14px">Agrega insumos en la pestaña Costos si quieres calcular el costo de este producto.</p>`}
    <button class="btn btn--primario" id="ccp-save" data-id="${p.id || ""}">${p.id ? "Guardar cambios" : "Agregar producto"}</button>
  `);
  formatearInputMoneda($("#ccp-precio"));
  const editorRecetaProducto = _contaInsumos.length ? configurarEditorReceta({
    contenedorId: "ccp-receta-filas", addId: "ccp-receta-add", previewId: "ccp-receta-costo-preview",
    obtenerPrecio: () => valorMoneda($("#ccp-precio")), incluirPrimarias: true,
  }) : null;
  $("#ccp-precio")?.addEventListener("input", () => editorRecetaProducto?.actualizar());
  const inputFotoProducto = $("#ccp-foto");
  if (inputFotoProducto) inputFotoProducto.onchange = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    abrirRecorteFoto(archivo, {
      aspectRatio: 9 / 16,
      ayuda: "Mueve y haz zoom para encuadrarla -- así es como se ve un producto en tu carta, a pantalla completa.",
      onListo: async (recortada) => {
        try {
          const comprimida = await comprimirImagen(recortada);
          const ext = comprimida.name.split(".").pop();
          const path = `carta-producto-${_contaNegocioId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${ext}`;
          const { error: upErr } = await supabase.storage.from("contenido").upload(path, comprimida, { upsert: true });
          if (upErr) throw upErr;
          const url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
          const urlInput = $("#ccp-foto-url"); if (urlInput) urlInput.value = url;
          const preview = $("#ccp-foto-preview"); if (preview) { preview.src = url; preview.style.display = ""; }
          toast("Foto lista ✓");
        } catch { toast("Error subiendo la foto"); }
      },
    });
  };
  $("#ccp-stock-activo")?.addEventListener("change", (e) => {
    const campo = $("#ccp-stock-campo"); if (campo) campo.hidden = !e.target.checked;
  });
  $("#ccp-save")?.addEventListener("click", async () => {
    const btn = $("#ccp-save");
    const resetBtn = () => { btn.disabled = false; btn.textContent = p.id ? "Guardar cambios" : "Agregar producto"; };
    const nombre = $("#ccp-nombre")?.value.trim();
    const precio = valorMoneda($("#ccp-precio"));
    if (!nombre) { toast("El nombre es obligatorio"); return; }
    if (!precio) { toast("Ingresa un precio válido"); return; }
    btn.disabled = true; btn.textContent = "Guardando…";
    // La foto ya se subió apenas se recortó (ver el listener de #ccp-foto
    // abajo) -- acá solo se lee la URL que dejó en el campo oculto.
    const imagenUrl = $("#ccp-foto-url")?.value || null;
    const stockActivo = $("#ccp-stock-activo")?.checked || false;
    const payload = {
      negocio_id: _contaNegocioId, nombre, descripcion: $("#ccp-desc")?.value.trim() || null, precio,
      categoria: $("#ccp-categoria")?.value.trim() || null, imagen_url: imagenUrl, disponible: $("#ccp-disponible")?.checked ?? true,
      stock_activo: stockActivo, stock_cantidad: stockActivo ? (parseInt($("#ccp-stock-cantidad")?.value) || 0) : null,
    };
    const { data: guardado, error } = p.id
      ? await supabase.from("negocio_carta_productos").update(payload).eq("id", p.id).select().single()
      : await supabase.from("negocio_carta_productos").insert(payload).select().single();
    if (error) { toast("Error: " + error.message); resetBtn(); return; }
    const productoId = guardado?.id || p.id;
    const gruposSeleccionados = $$("[data-ccp-grupo]:checked").map(cb => cb.value);
    await supabase.from("negocio_carta_producto_grupos").delete().eq("producto_id", productoId);
    if (gruposSeleccionados.length) {
      await supabase.from("negocio_carta_producto_grupos").insert(gruposSeleccionados.map(grupo_id => ({ negocio_id: _contaNegocioId, producto_id: productoId, grupo_id })));
    }
    if (editorRecetaProducto) {
      const filasReceta = editorRecetaProducto.leerFilas();
      await supabase.from("negocio_carta_producto_insumos").delete().eq("producto_id", productoId);
      if (filasReceta.length) {
        await supabase.from("negocio_carta_producto_insumos").insert(
          filasReceta.map(f => ({ negocio_id: _contaNegocioId, producto_id: productoId, insumo_id: f.insumo_id, receta_primaria_id: f.receta_primaria_id, cantidad_usada: f.cantidad_usada }))
        );
      }
    }
    cerrarModalTienda();
    toast(p.id ? "Producto actualizado ✓" : "Producto agregado ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  });
}

// Lista solo los pedidos "activos" -- no cancelados, y no (entregados Y ya
// pagados), que es cuando un pedido queda realmente cerrado (su ingreso ya
// quedó registrado en Balance, no hace falta seguir viéndolo acá). Estado
// operativo (cocina/mostrador) y estado de pago son independientes a
// propósito: un pedido puede estar "Entregado" sin estar pagado (fiado) o
// "Pendiente" y ya pagado (pago anticipado) -- cada botón mueve solo lo suyo.
// En mesa compartida, cada persona paga de verdad al enviar (eligió
// efectivo/transferencia igual que cualquier pedido) -- la diferencia es si
// pagó SOLO lo suyo o el total de la mesa hasta ese momento
// (cubre_mesa_completa). Por eso "Marcar pagado" individual sigue
// disponible aquí también; "Cobrar mesa completa" (en el grupo) es para
// cuando alguien ya pagó por todos y hay que saldar el resto de una vez.
function filaPedidoHtml(ped) {
  const est = ESTADO_PEDIDO_CARTA[ped.estado] || ESTADO_PEDIDO_CARTA.pendiente;
  const items = Array.isArray(ped.items) ? ped.items : [];
  const resumenItems = items.map(it => {
    const mods = Array.isArray(it.modificadores) && it.modificadores.length ? ` (${it.modificadores.map(m => esc(m.opcion)).join(", ")})` : "";
    return `${it.cantidad}× ${esc(it.nombre)}${mods}`;
  }).join(", ");
  const folio = "#" + String(ped.id).slice(0, 8).toUpperCase();
  const hora = ped.created_at ? new Date(ped.created_at).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" }) : "";
  return `
  <div style="padding:14px 0;border-bottom:1px solid #ebebeb">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:180px">
        <div style="font-weight:600;font-size:14px">${folio} · ${esc(ped.cliente_nombre)} — ${COP(ped.monto_total)}${hora ? ` <span style="font-weight:400;color:#999;font-size:12px">· ${hora}</span>` : ""}</div>
        <div style="font-size:12px;color:#777">${esc(resumenItems)}${ped.nota ? " · " + esc(ped.nota) : ""}${ped.cliente_whatsapp ? " · " + esc(ped.cliente_whatsapp) : ""}</div>
        <div style="font-size:12px;color:#777;margin-top:2px">${ped.metodo_pago === "transferencia" ? "🏦 Transferencia" : ped.metodo_pago === "efectivo" ? "💵 Efectivo" : ""}${ped.comprobante_url ? ` · <a href="${esc(ped.comprobante_url)}" target="_blank" style="color:var(--verde)">Ver comprobante ↗</a>` : ""}</div>
        ${ped.tipo_entrega === "domicilio" ? `<div style="font-size:12px;font-weight:700;color:var(--verde);margin-top:2px">🛵 Domicilio${ped.domicilio_valor ? ` (+${COP(ped.domicilio_valor)})` : ""} · ${esc(ped.domicilio_direccion || "")}</div>` : ped.tipo_entrega === "recoger" ? `<div style="font-size:12px;color:#777;margin-top:2px">🏪 Recoge en el local</div>` : ""}
        ${ped.cubre_mesa_completa ? `<div style="font-size:12px;font-weight:700;color:#b8860b;margin-top:4px">💰 Este comprobante cubre TODA la mesa -- revísalo y usa "Cobrar mesa completa"</div>` : ""}
      </div>
      <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:${ped.origen === "manual" ? "#eef2ff" : "#e8f5ee"};color:${ped.origen === "manual" ? "#4338ca" : "#095544"};white-space:nowrap">${ped.origen === "manual" ? "🧾 Manual" : "📱 Carta"}</span>
      <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:${est.bg};color:${est.c};white-space:nowrap">${est.t}</span>
      ${ped.pagado ? `<span style="font-size:11px;font-weight:700;color:#0e7a3e;white-space:nowrap">Pagado ✓</span>` : ""}
    </div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      ${est.siguiente ? `<button data-avanzar-ccped="${ped.id}" class="btn btn--primario" style="padding:8px 14px;font-size:12px">${est.siguienteLbl}</button>` : ""}
      ${ped.estado !== "cancelado" && ped.estado !== "entregado" ? `<button data-cancelar-ccped="${ped.id}" style="padding:8px 14px;font-size:12px;border:1px solid #ebebeb;border-radius:8px;background:none;cursor:pointer">Cancelar</button>` : ""}
      ${!ped.pagado ? `<button data-pagar-ccped="${ped.id}" style="padding:8px 14px;font-size:12px;border:1px solid var(--verde);border-radius:8px;background:none;color:var(--verde);cursor:pointer;font-weight:700">Marcar pagado</button>` : ""}
    </div>
  </div>`;
}

// Lista solo los pedidos "activos" -- no cancelados, y no (entregados Y ya
// pagados), que es cuando un pedido queda realmente cerrado (su ingreso ya
// quedó registrado en Balance, no hace falta seguir viéndolo acá). Estado
// operativo (cocina/mostrador) y estado de pago son independientes a
// propósito: un pedido puede estar "Entregado" sin estar pagado (fiado) o
// "Pendiente" y ya pagado (pago anticipado) -- cada botón mueve solo lo suyo.
//
// Los pedidos que vienen de una mesa compartida (varias personas escanearon
// el mismo QR de mesa) se agrupan bajo un solo encabezado con un botón único
// "Cobrar mesa completa" -- cada persona sigue viéndose por separado adentro
// (quién pidió qué), pero el cobro y el ingreso contable son UNO solo.
// Desglose tipo factura dentro de la tarjeta de mesa: una línea por producto
// (no por pedido), con cantidad, valor de esa línea y quién lo pidió -- para
// que el negocio pueda revisar/repartir la cuenta sin tener que abrir cada
// pedido individual.
function facturaMesaHtml(peds) {
  const filas = peds.flatMap(p =>
    (Array.isArray(p.items) ? p.items : []).map(it => ({ ...it, cliente: p.cliente_nombre }))
  );
  if (!filas.length) return "";
  return `
  <div style="background:#fff;border-radius:10px;padding:10px 12px;margin-bottom:10px">
    ${filas.map(it => `
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:5px 0;border-bottom:1px solid #f1f1f1;font-size:12.5px">
        <span style="flex:1;min-width:0">${it.cantidad}× ${esc(it.nombre)} <span style="color:#999">· ${esc(it.cliente)}</span></span>
        <span style="font-weight:600;white-space:nowrap">${COP(Number(it.precio || 0) * Number(it.cantidad || 0))}</span>
      </div>`).join("")}
  </div>`;
}

async function cargarCartaPedidos() {
  const list = $("#conta-carta-pedidos-list");
  if (!list) return;
  // Solo los de HOY -- antes se quedaban acumulando días si nadie le daba
  // "Marcar entregado" (el único filtro era el estado, nunca la fecha), y la
  // lista de un negocio con movimiento diario se volvía interminable. Esto
  // reinicia la vista cada día sin cambiar nada del historial (Balance/
  // Métricas siguen viendo todos los pedidos, nunca se borra nada).
  const hoy = contaFechaISO(new Date());
  const pedidos = _contaCartaPedidos.filter(p => p.estado !== "cancelado" && !(p.estado === "entregado" && p.pagado) && p.created_at?.slice(0, 10) === hoy);
  if (!pedidos.length) { list.innerHTML = `<p style="padding:8px 0">No tienes pedidos activos de hoy.</p>`; return; }

  const sueltos = pedidos.filter(p => !p.mesa_sesion_id);
  // Pendientes de pago primero (lo que todavía falta cobrar), ya pagados
  // después (solo falta entregarlos) -- antes salían mezclados, sin ningún
  // orden que ayudara a priorizar qué cobrar.
  const sueltosPendientes = sueltos.filter(p => !p.pagado);
  const sueltosPagados = sueltos.filter(p => p.pagado);
  const porSesion = new Map();
  pedidos.filter(p => p.mesa_sesion_id).forEach(p => {
    if (!porSesion.has(p.mesa_sesion_id)) porSesion.set(p.mesa_sesion_id, []);
    porSesion.get(p.mesa_sesion_id).push(p);
  });

  const gruposHtml = [...porSesion.entries()].map(([sesionId, peds]) => {
    const total = peds.reduce((s, p) => s + Number(p.monto_total || 0), 0);
    return `
    <div style="border:1.5px solid var(--verde);border-radius:12px;padding:12px 14px;margin-bottom:14px;background:var(--verde-soft)">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">
        <div style="flex:1;min-width:180px;font-weight:700;font-size:14.5px">🍽️ ${esc(peds[0].mesa_nombre || "Mesa")} · ${peds.length} pedido${peds.length === 1 ? "" : "s"} · ${COP(total)}</div>
        <button data-cobrar-mesa="${sesionId}" class="btn btn--primario" style="padding:8px 14px;font-size:12px">Cobrar mesa completa</button>
      </div>
      ${facturaMesaHtml(peds)}
      <div style="background:#fff;border-radius:10px;padding:0 12px">
        ${peds.map(p => filaPedidoHtml(p)).join("")}
      </div>
    </div>`;
  }).join("");

  const tituloSeccion = (txt) => `<div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--tinta-45);margin:4px 0 8px">${txt}</div>`;
  list.innerHTML = gruposHtml
    + (sueltosPendientes.length ? tituloSeccion(`Pendientes de pago · ${sueltosPendientes.length}`) + sueltosPendientes.map(p => filaPedidoHtml(p)).join("") : "")
    + (sueltosPagados.length ? tituloSeccion(`Pagados · ${sueltosPagados.length}`) + sueltosPagados.map(p => filaPedidoHtml(p)).join("") : "");

  list.querySelectorAll("[data-avanzar-ccped]").forEach(btn => btn.addEventListener("click", async () => {
    const id = btn.dataset.avanzarCcped;
    const ped = pedidos.find(x => x.id === id);
    const est = ped && (ESTADO_PEDIDO_CARTA[ped.estado] || ESTADO_PEDIDO_CARTA.pendiente);
    if (!ped || !est?.siguiente) return;
    btn.disabled = true;
    await supabase.from("negocio_carta_pedidos").update({ estado: est.siguiente }).eq("id", id);
    cargarContabilidadNegocio(_contaNegocioId);
  }));
  list.querySelectorAll("[data-cancelar-ccped]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Cancelar este pedido?")) return;
    await supabase.from("negocio_carta_pedidos").update({ estado: "cancelado" }).eq("id", btn.dataset.cancelarCcped);
    toast("Pedido cancelado");
    cargarContabilidadNegocio(_contaNegocioId);
  }));
  list.querySelectorAll("[data-pagar-ccped]").forEach(btn => btn.addEventListener("click", async () => {
    const id = btn.dataset.pagarCcped;
    const ped = pedidos.find(x => x.id === id);
    if (!ped) return;
    btn.disabled = true;
    const { error: errUpd } = await supabase.from("negocio_carta_pedidos").update({ pagado: true, pagado_at: new Date().toISOString() }).eq("id", id);
    if (errUpd) { toast("Error: " + errUpd.message); btn.disabled = false; return; }
    await supabase.from("negocio_ingresos").insert({
      negocio_id: _contaNegocioId, origen: "carta", pedido_id: id,
      descripcion: `Pedido carta · ${ped.cliente_nombre}`,
      items: ped.items, monto: ped.monto_total, fecha: new Date().toISOString().slice(0, 10),
    });
    toast("Pedido marcado como pagado ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  }));
  list.querySelectorAll("[data-cobrar-mesa]").forEach(btn => btn.addEventListener("click", async () => {
    const sesionId = btn.dataset.cobrarMesa;
    const todos = porSesion.get(sesionId) || [];
    // Solo cobra lo que de verdad sigue sin pagar -- si alguien ya se marcó
    // "Marcar pagado" individual antes (y ya generó su propio ingreso), no
    // hay que volver a cobrarlo ni duplicar su ingreso acá.
    const peds = todos.filter(p => !p.pagado);
    if (!peds.length) { toast("Ya no queda nada pendiente de pago en esta mesa"); return; }
    if (!confirm(`¿Cobrar lo que falta de la mesa? Se marcan ${peds.length} pedido(s) como pagados y se registra un solo ingreso.`)) return;
    btn.disabled = true;
    const ids = peds.map(p => p.id);
    const { error: errUpd } = await supabase.from("negocio_carta_pedidos").update({ pagado: true, pagado_at: new Date().toISOString() }).in("id", ids);
    if (errUpd) { toast("Error: " + errUpd.message); btn.disabled = false; return; }
    const itemsCombinados = peds.flatMap(p => (Array.isArray(p.items) ? p.items : []).map(it => ({ ...it, cliente: p.cliente_nombre })));
    const totalCombinado = peds.reduce((s, p) => s + Number(p.monto_total || 0), 0);
    await supabase.from("negocio_ingresos").insert({
      negocio_id: _contaNegocioId, origen: "carta",
      descripcion: `Mesa ${peds[0].mesa_nombre || ""} · ${peds.length} pedido(s)`,
      items: itemsCombinados, monto: totalCombinado, fecha: new Date().toISOString().slice(0, 10),
    });
    // Solo se cierra la sesión si ya no queda ningún pedido de esa mesa sin
    // pagar -- si alguien todavía no ha pagado lo suyo, la mesa sigue abierta.
    if (peds.length === todos.length) {
      await supabase.from("negocio_mesas_sesiones").update({ estado: "cerrada", cerrada_at: new Date().toISOString() }).eq("id", sesionId);
    }
    toast("Mesa cobrada ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  }));
}

// Comentarios que los clientes dejan en productos de la carta -- nadie los
// ve en público hasta que el negocio los aprueba acá (la carta pública solo
// lee los que ya tienen aprobado=true). Los pendientes se muestran primero.
function cargarComentariosCarta() {
  const list = $("#conta-carta-comentarios-list");
  if (!list) return;
  if (!_contaComentarios.length) { list.innerHTML = `<p style="padding:8px 0">Todavía no hay comentarios de clientes.</p>`; return; }
  const pendientes = _contaComentarios.filter(c => !c.aprobado);
  const aprobados = _contaComentarios.filter(c => c.aprobado);
  const filaHtml = (c) => `
    <div style="padding:12px 0;border-bottom:1px solid #ebebeb">
      <div style="font-size:12px;color:#777">${esc(c.negocio_carta_productos?.nombre || "Producto")}</div>
      <div style="font-weight:600;font-size:13.5px;margin-top:2px">${esc(c.cliente_nombre)}${!c.aprobado ? ` <span style="font-size:11px;font-weight:700;color:#b8860b">· Pendiente</span>` : ""}</div>
      <div style="font-size:13px;color:#444;margin-top:2px">${esc(c.texto)}</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        ${!c.aprobado ? `<button data-aprobar-com="${c.id}" class="btn btn--primario" style="padding:6px 14px;font-size:12px">Aprobar</button>` : ""}
        <button data-rm-com="${c.id}" style="padding:6px 14px;font-size:12px;border:1px solid #ebebeb;border-radius:8px;background:none;color:#c0392b;cursor:pointer">Eliminar</button>
      </div>
    </div>`;
  list.innerHTML = pendientes.map(filaHtml).join("") + aprobados.map(filaHtml).join("");
  list.querySelectorAll("[data-aprobar-com]").forEach(btn => btn.addEventListener("click", async () => {
    btn.disabled = true;
    await supabase.from("negocio_carta_comentarios").update({ aprobado: true }).eq("id", btn.dataset.aprobarCom);
    toast("Comentario aprobado ✓");
    cargarContabilidadNegocio(_contaNegocioId);
  }));
  list.querySelectorAll("[data-rm-com]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("¿Eliminar este comentario?")) return;
    await supabase.from("negocio_carta_comentarios").delete().eq("id", btn.dataset.rmCom);
    toast("Comentario eliminado");
    cargarContabilidadNegocio(_contaNegocioId);
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

  // Apunta a la landing de invitación (video + planes) en vez de directo
  // al registro -- el ?ref= se arrastra desde ahí hasta Registro.html
  // pase lo que pase (botón "Comprar ahora" o el modal de ClubCard).
  const base = "https://elclubdelagente.com/Invitacion.html";
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

  const [{ data: count }, { data: miPerfil }] = await Promise.all([
    supabase.rpc("contar_referidos", { p_user_id: userId, p_solo_pagantes: true }),
    supabase.from("perfiles").select("plan, vitalicia_pendiente, fecha_vencimiento").eq("id", userId).maybeSingle(),
  ]);

  const total = count || 0;
  const pct = Math.min(total / 5 * 100, 100);

  if (barra) barra.style.width = pct + "%";
  if (contador) contador.textContent = `${total} de 5`;

  if (total >= 5) {
    if (miPerfil?.vitalicia_pendiente) {
      const fechaFmt = miPerfil.fecha_vencimiento
        ? new Date(miPerfil.fecha_vencimiento + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long" })
        : "";
      if (msg) msg.textContent = `🎉 ¡Ya ganaste la membresía Vitalicia! Primero terminas tu mes pagado y se activa sola${fechaFmt ? " el " + fechaFmt : ""}.`;
    } else {
      if (msg) msg.textContent = "🎉 ¡Membresía vitalicia activada! Gracias por crecer el Club.";
    }
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

// Código dinámico de verificación (reverso de la ClubCard): un aliado tiene
// que pedírselo al miembro para pasar la puerta de seguridad de
// Verificar.html -- el QR solo ya no alcanza para evitar suplantación.
async function obtenerCodigoVerificacionFresco() {
  const { data, error } = await supabase.rpc("generar_codigo_verificacion");
  if (error || !data) return null;
  return String(data);
}
let _ultimoCodigoVerifTs = 0;
async function generarCodigoVerificacion() {
  const ahora = Date.now();
  if (ahora - _ultimoCodigoVerifTs < 10000) return; // evita pedir uno nuevo en cada flip rápido
  _ultimoCodigoVerifTs = ahora;
  const codigo = await obtenerCodigoVerificacionFresco();
  if (!codigo) return;
  document.querySelectorAll(".cc-codigo-verif").forEach(el => el.textContent = `${codigo.slice(0, 2)} ${codigo.slice(2)}`);
}

// Mismo link que ya codifica el QR, pero como texto copiable -- para pedidos
// que se hacen por WhatsApp directo al aliado (no al bot), donde mandar un
// pantallazo para que lo "escaneen" es poco práctico. Lleva el código de 4
// dígitos ya metido en la URL (recién generado, fresco) para que Verificar.html
// se salte la puerta manual mientras no haya vencido -- si venció, cae solo al
// mismo gate de siempre, sin perder la protección contra reenvíos del link.
// Insignia sobre la esquina del QR (mismo tratamiento que el copiar-código de
// al lado) -- con stopPropagation porque tocar la tarjeta normalmente la voltea.
function configurarLinkVerificacion(userId) {
  if (!userId) return;
  document.querySelectorAll("[data-copiar-link-verif]").forEach(btn => btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (btn.disabled) return;
    btn.disabled = true;
    const codigo = await obtenerCodigoVerificacionFresco();
    const link = `https://elclubdelagente.com/Verificar.html?id=${userId}${codigo ? `&codigo=${codigo}` : ""}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    btn.disabled = false;
    toast("Link de verificación copiado ✓");
  }));
}

/* ---------- MODAL ACTIVAR ---------- */
function abrirModalActivar() {
  const m = document.getElementById("modal-activar");
  if (m) { m.style.display = "flex"; bloquearScroll(); if (window.lucide) lucide.createIcons(); }
}
function cerrarModalActivar() {
  const m = document.getElementById("modal-activar");
  if (m) { m.style.display = "none"; desbloquearScroll(); }
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
// Redondeado a propósito -- sin esto, un monto con decimales (ej. un costo
// de receta que no da un número exacto) se mostraba con centavos
// ("$51.757,333"), algo que ningún banco/billetera hace con pesos
// colombianos.
const COP = n => n != null ? '$' + Math.round(Number(n)).toLocaleString('es-CO') : '';
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

// Avisa en el propio Inicio si hay un pago subido y aún sin aprobar -- sin
// esto, el miembro entraba a su cuenta, veía "Gratis" (el plan real hasta
// que se apruebe) y no tenía ningún contexto de por qué, aunque ya hubiera
// pagado Básico o Premium.
async function cargarAvisoPagoPendiente(userId) {
  const aviso = document.getElementById("aviso-pago-pendiente");
  if (!aviso) return;
  const { data: sol } = await supabase.from("solicitudes_membresia")
    .select("plan")
    .eq("miembro_id", userId)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sol) { aviso.style.display = "none"; return; }
  const planLabel = PLAN_LABEL[sol.plan] || sol.plan;
  const txt = document.getElementById("aviso-pago-pendiente-txt");
  if (txt) txt.innerHTML = `Tu pago de <b>${esc(planLabel)}</b> está en revisión. Te avisaremos por WhatsApp apenas quede verificado.`;
  aviso.style.display = "flex";
  if (window.lucide) lucide.createIcons();
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
    let file = $("#rt-comprobante")?.files?.[0];
    if (!file) { toast("Sube el comprobante de pago"); return; }
    btn.disabled = true; btn.textContent = "Enviando…";
    file = await comprimirImagen(file);
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
          body: JSON.stringify({
            to: data.valor,
            contentSid: CONTENT_SID_AVISO_COMPROBANTE_REENVIADO,
            contentVariables: { "1": planLabel, "2": COP(sol.monto) },
          }),
        }).catch(() => {});
      }).catch(() => {});

    // Verificación automática del comprobante con IA — fire-and-forget.
    fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/verificar-comprobante", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solicitud_id: sol.id }),
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

// Programas sociales que apoya el Club -- vienen de la tabla real "programas"
// (la misma que administra Admin → Programas sociales), no de contenido fijo.
let _programasCargados = false;
let _programasSociales = [];
async function cargarProgramas() {
  if (_programasCargados) return;
  _programasCargados = true;
  const grid = document.getElementById("programas-grid-dash");
  if (!grid) return;
  const { data, error } = await supabase.from("programas").select("*").eq("activo", true).order("created_at", { ascending: false });
  if (error) {
    console.error("cargarProgramas:", error);
    _programasCargados = false;
    grid.innerHTML = `<p style="font-size:13px;color:#999;padding:20px 0">No se pudieron cargar los programas. Cambia de pestaña y vuelve a intentarlo.</p>`;
    return;
  }
  _programasSociales = data || [];
  if (!_programasSociales.length) {
    grid.innerHTML = `<p style="font-size:13px;color:#999;padding:20px 0">Todavía no hay programas sociales publicados.</p>`;
    return;
  }
  grid.innerHTML = _programasSociales.map((p, i) => `
    <div style="border:1px solid #ebebeb;border-radius:12px;overflow:hidden;background:#fff">
      ${p.imagen_url
        ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" style="width:100%;height:140px;object-fit:cover;display:block">`
        : `<div style="height:140px;background:var(--verde-soft);display:flex;align-items:center;justify-content:center"><span style="display:inline-flex;width:38px;height:38px;border-radius:50%;background:#fff;color:var(--verde);align-items:center;justify-content:center">${ic("heart-handshake")}</span></div>`}
      <div style="padding:20px">
        ${p.categoria ? `<div style="font-size:11px;font-weight:700;color:var(--verde);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">${esc(p.categoria)}</div>` : ""}
        <div style="font-weight:700;font-size:15px;margin-bottom:6px">${esc(p.nombre)}</div>
        <p style="font-size:13px;color:#666;line-height:1.5;margin-bottom:14px">${esc(p.descripcion) || ""}</p>
        <button type="button" class="btn btn--secundario" data-ver-programa="${i}" style="font-size:12.5px">Ver más y postularme como voluntario &rarr;</button>
      </div>
    </div>`).join("");
  if (window.lucide) lucide.createIcons();
  grid.querySelectorAll("[data-ver-programa]").forEach(btn => btn.addEventListener("click", () => {
    const p = _programasSociales[+btn.dataset.verPrograma];
    if (!p) return;
    abrirModalTienda(p.nombre, `
      ${p.imagen_url ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin-bottom:16px">` : ""}
      <p style="font-size:14px;line-height:1.6;margin-bottom:16px">${esc(p.descripcion) || ""}</p>
      <div style="font-size:12.5px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Quiero ser voluntario</div>
      <form id="form-voluntario">
        <div class="cfg-campo"><label class="cfg-label">Tu WhatsApp</label><input class="cfg-input" id="vol-whatsapp" type="tel" required placeholder="300 000 0000"></div>
        <div class="cfg-campo"><label class="cfg-label">Motivo de participación</label><textarea class="cfg-input" id="vol-motivo" rows="3" required placeholder="Cuéntanos por qué te gustaría participar"></textarea></div>
        <div style="text-align:center;margin-top:6px"><button type="submit" class="btn btn--primario" style="display:inline-flex;width:fit-content;max-width:100%;flex:none">Quiero ser voluntario <i data-lucide="heart-handshake" style="width:15px;height:15px"></i></button></div>
      </form>
    `);
    if (window.lucide) lucide.createIcons();
    document.getElementById("form-voluntario")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn2 = e.target.querySelector("button[type=submit]");
      const u = leerPerfil();
      const whatsapp = document.getElementById("vol-whatsapp")?.value.trim() || "";
      const motivo = document.getElementById("vol-motivo")?.value.trim() || "";
      if (!whatsapp) { toast("Pon tu número de WhatsApp"); return; }
      supabase.from("configuracion").select("valor").eq("clave", "numero_admin_notificaciones").maybeSingle()
        .then(({ data }) => {
          if (!data?.valor) return;
          fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: data.valor,
              contentSid: CONTENT_SID_AVISO_VOLUNTARIADO,
              contentVariables: { "1": p.nombre, "2": u.nombre || "—", "3": whatsapp, "4": motivo },
            }),
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
// El nombre de quien escribió cada reseña se trae aparte (ese embed resolvía
// contra "perfiles", protegida por RLS, y quien ve la reseña casi nunca es
// quien la escribió) -- usado por reseñas de eventos y de productos.
async function adjuntarAutoresResenas(resenas) {
  const ids = [...new Set(resenas.map(r => r.miembro_id).filter(Boolean))];
  if (!ids.length) return resenas;
  const { data: autores } = await supabase.from("perfiles_publico").select("id, nombre").in("id", ids);
  const mapa = new Map((autores || []).map(p => [p.id, p]));
  resenas.forEach(r => { r.perfiles = mapa.get(r.miembro_id) || null; });
  return resenas;
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
        ${r.comentario ? `<p style="font-size:12.5px;color:#666;line-height:1.5;margin:0 0 6px">${esc(r.comentario)}</p>` : ''}
        ${r.foto_url ? `<img src="${esc(r.foto_url)}" alt="Foto de la reseña" style="width:64px;height:64px;object-fit:cover;border-radius:8px;cursor:pointer" data-resena-foto="${esc(r.foto_url)}">` : ''}
      </div>`).join('')
    : `<p style="font-size:12.5px;color:#999;padding:4px 0 12px">Sé el primero en dejar una reseña de este taller.</p>`;

  const form = yaReseno
    ? `<div style="font-size:12.5px;color:var(--verde);font-weight:600;padding-top:10px">✓ Ya dejaste tu reseña de este taller</div>`
    : `<div style="border-top:1px solid #f0f0f0;padding-top:12px;margin-top:4px">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:8px;color:#444">Deja tu reseña</div>
        <div data-resena-stars="${eventoId}" data-selected="0" style="display:flex;gap:4px;margin-bottom:8px">
          ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-estrella="${n}" style="background:none;border:none;cursor:pointer;padding:2px"><i data-lucide="star" style="width:22px;height:22px;color:#ccc;fill:none"></i></button>`).join('')}
        </div>
        <textarea data-resena-texto="${eventoId}" rows="2" placeholder="Cuéntanos qué te pareció (opcional)" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:8px;font-size:16px;font-family:inherit;resize:vertical;box-sizing:border-box"></textarea>
        <button data-enviar-resena="${eventoId}" class="btn btn--primario" style="font-size:12.5px;padding:8px 14px;margin-top:8px">Enviar reseña</button>
      </div>`;

  return lista + form;
}
async function cargarEducacion() {
  if (_educacionCargada) return;
  _educacionCargada = true;

  const grid = document.getElementById('educacion-grid');
  if (!grid) return;

  const { data: eventos, error } = await supabase
    .from('eventos_educacion')
    .select('*, facilitadores_educacion(nombre, foto_url), categorias_educacion(nombre)')
    .eq('activo', true)
    .order('fecha', { ascending: false });
  if (error) {
    console.error("cargarEducacion:", error);
    _educacionCargada = false;
    grid.innerHTML = `<p style="text-align:center;padding:40px 20px;color:var(--tinta-45,#888);grid-column:1/-1;font-size:13px">No se pudieron cargar los talleres. Cambia de pestaña y vuelve a intentarlo.</p>`;
    return;
  }

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

  const { data: resenasRaw0 } = await supabase
    .from('resenas_evento')
    .select('id, evento_id, estrellas, comentario, miembro_id')
    .in('evento_id', lista.map(e => e.id))
    .order('created_at', { ascending: false });
  const resenasRaw = await adjuntarAutoresResenas(resenasRaw0 || []);

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
          ${e.facilitadores_educacion.foto_url ? `<img src="${esc(e.facilitadores_educacion.foto_url)}" alt="${esc(e.facilitadores_educacion.nombre)}" style="width:22px;height:22px;border-radius:50%;object-fit:cover">` : ''}
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
      .select('id, evento_id, estrellas, comentario, miembro_id')
      .eq('evento_id', eventoId)
      .order('created_at', { ascending: false });
    const resenasEvento = await adjuntarAutoresResenas(data || []);
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
    lb.innerHTML = `<img id="img-lightbox-img" alt="Imagen ampliada" style="max-width:100%;max-height:100%;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.5)">`;
    lb.addEventListener('click', () => { lb.style.display = 'none'; });
    document.body.appendChild(lb);
  }
  document.getElementById('img-lightbox-img').src = url;
  lb.style.display = 'flex';
}

// Banner de la Tienda -- viene de "anuncios" (la misma herramienta que ya
// usa Admin → Contenido, antes no estaba conectada a ninguna pantalla). Sin
// anuncios publicados, se muestra el texto genérico de siempre como respaldo.
function renderBannerTienda(anuncios) {
  const track = document.getElementById('tienda-banner-track');
  const dotsEl = document.getElementById('tienda-banner-dots');
  if (!track) return;

  const slide = (a) => {
    const bg = a?.imagen_url
      ? `linear-gradient(0deg, rgba(5,22,13,.78), rgba(5,22,13,.35)), url('${esc(a.imagen_url)}')`
      : null;
    return `<div class="tienda-hero${bg ? ' tienda-hero--img' : ''}"${bg ? ` style="background-image:${bg}"` : ''}>
      <span class="tienda-hero__eyebrow">Tienda del Club</span>
      <h2>${a ? esc(a.titulo) : 'Todo lo que necesitas,<br>con descuento de miembro.'}</h2>
      <p>${a ? esc(a.contenido || '') : 'Productos del Club y de nuestros aliados, seleccionados para que ahorres de verdad.'}</p>
    </div>`;
  };

  const lista = anuncios && anuncios.length ? anuncios : [null];
  track.innerHTML = lista.map(slide).join('');

  if (lista.length > 1 && dotsEl) {
    dotsEl.innerHTML = lista.map((_, i) => `<span class="${i === 0 ? 'is-on' : ''}"></span>`).join('');
    dotsEl.style.display = '';
    const dots = [...dotsEl.children];
    track.addEventListener('scroll', () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((d, idx) => d.classList.toggle('is-on', idx === i));
    });
  } else if (dotsEl) {
    dotsEl.style.display = 'none';
  }
}

async function cargarTienda() {
  if (_tiendaCargada) return;
  _tiendaCargada = true;

  const grid = document.getElementById('tienda-grid');
  const catsEl = document.getElementById('tienda-cats');
  const ordenEl = document.getElementById('tienda-orden');
  if (!grid) return;

  const hoy = new Date().toISOString().slice(0, 10);
  // Si la carga inicial falla (red, timeout) se resetea la bandera -- antes
  // quedaba en "true" para siempre y el panel se veía vacío el resto de la
  // sesión, sin forma de reintentar.
  let cats, prodsClub, prodsAliado, anuncios;
  try {
    const resultados = await Promise.all([
      supabase.from('categorias_productos').select('id,nombre').eq('activa', true).order('orden'),
      supabase.from('productos').select('*, categorias_productos(nombre)').eq('activo', true).order('orden'),
      supabase.from('productos_aliado')
        .select('*, categorias_productos(nombre)')
        .eq('estado', 'aprobado').eq('activo', true)
        .or(`fecha_fin.is.null,fecha_fin.gte.${hoy}`),
      supabase.from('anuncios').select('*').order('created_at', { ascending: false }).limit(5),
    ]);
    if (resultados.some(r => r.error)) throw resultados.find(r => r.error).error;
    ({ data: cats, } = resultados[0]);
    ({ data: prodsClub } = resultados[1]);
    ({ data: prodsAliado } = resultados[2]);
    ({ data: anuncios } = resultados[3]);
  } catch (e) {
    console.error("cargarTienda:", e);
    _tiendaCargada = false;
    grid.innerHTML = `<p style="text-align:center;padding:40px 20px;color:var(--tinta-45,#888);grid-column:1/-1;font-size:13px">No se pudo cargar la tienda. Cambia de pestaña y vuelve a intentarlo.</p>`;
    return;
  }
  renderBannerTienda(anuncios || []);

  const club = (prodsClub || []).map(p => ({ ...p, _origen: 'club' }));
  const aliado = (prodsAliado || []).map(p => ({ ...p, _origen: 'aliado' }));

  // Los datos del aliado (nombre, llave de pago, ubicación...) ya no vienen
  // embebidos en la misma consulta -- ese join resuelve contra "aliados",
  // protegida por RLS, y quien compra no es dueño de esa fila. Se traen
  // aparte desde la vista pública y se cruzan por aliado_id.
  const idsAliadosTienda = [...new Set(aliado.map(p => p.aliado_id).filter(Boolean))];
  if (idsAliadosTienda.length) {
    const { data: aliadosTienda } = await supabase.from('aliados_publico')
      .select('id, nombre, tienda_nombre, whatsapp, maps_url, tienda_llave_pago, instagram, facebook, tiktok')
      .in('id', idsAliadosTienda);
    const mapaAliadosTienda = new Map((aliadosTienda || []).map(a => [a.id, a]));
    aliado.forEach(p => { p.aliados = mapaAliadosTienda.get(p.aliado_id) || null; });
  }

  const todos = [...club, ...aliado];

  if (!todos.length) {
    grid.innerHTML = `
      <div style="text-align:center;padding:48px 20px;grid-column:1/-1">
        <span style="display:inline-flex;width:38px;height:38px;border-radius:50%;background:var(--verde-soft);color:var(--verde);align-items:center;justify-content:center;margin-bottom:14px">${ic("package")}</span>
        <p style="font-size:13px;color:var(--tinta-45,#888);max-width:320px;margin:0 auto 12px;line-height:1.5">Aún no hay productos disponibles. Vuelve pronto.</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
    cargarMisPedidosClub();
    return;
  }

  // Las reseñas por ahora solo existen para productos del Club (resenas_producto
  // apunta a "productos"); los productos de aliados no muestran calificación todavía.
  const resenasPorProducto = new Map();
  if (club.length) {
    const { data: resenasRaw } = await supabase
      .from('resenas_producto')
      .select('id, producto_id, estrellas')
      .eq('estado', 'aprobado')
      .in('producto_id', club.map(p => p.id));
    (resenasRaw || []).forEach(r => {
      if (!resenasPorProducto.has(r.producto_id)) resenasPorProducto.set(r.producto_id, []);
      resenasPorProducto.get(r.producto_id).push(r);
    });
  }

  const hace14dias = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const ICON_TIENDA = `<i data-lucide="store"></i>`;
  const ICON_ALIADO = `<i data-lucide="handshake"></i>`;
  const ICONOS_CAT_TIENDA = [
    [/ropa|zapato|calzado|moda/i, 'shirt'], [/belleza|estetic|cuidado/i, 'sparkles'],
    [/bienestar|salud/i, 'heart-pulse'], [/hogar|casa/i, 'home'],
    [/tecnolog|electro/i, 'cpu'], [/deporte|gym/i, 'dumbbell'],
    [/regalo/i, 'gift'], [/mascota/i, 'paw-print'], [/juguete|niñ/i, 'baby'],
  ];
  const iconoCatTienda = (nombre) => { for (const [rx, icon] of ICONOS_CAT_TIENDA) if (rx.test(nombre || '')) return icon; return 'package'; };

  let catActiva = 'todos';
  let orden = 'relevancia';
  let queryTexto = '';

  function tarjeta(p) {
    const precioNormal = p.precio_normal != null ? COP(p.precio_normal) : '';
    const precioDesc   = p.precio_descuento != null ? COP(p.precio_descuento) : '';
    const imgSrc = (p.imagenes && p.imagenes[0]) || p.imagen_url;
    const descuentoPct = (p.precio_normal && p.precio_descuento && p.precio_normal > p.precio_descuento)
      ? Math.round((1 - p.precio_descuento / p.precio_normal) * 100) : null;
    const vendedor = p._origen === 'club' ? 'Tienda del Club' : (p.aliados?.tienda_nombre || p.aliados?.nombre || 'Aliado');
    const esNuevo = p.created_at && new Date(p.created_at) >= hace14dias;
    const resumenP = p._origen === 'club' ? resumenResenas(resenasPorProducto.get(p.id) || []) : null;
    const sinStock = p.stock != null && p.stock <= 0;
    const pocoStock = p.stock != null && p.stock > 0 && p.stock <= 5;

    return `<div class="tienda-card${sinStock ? ' tienda-card--agotado' : ''}" data-ver-prod="${p.id}" data-origen="${p._origen}">
      <div class="tienda-card__img-wrap">
        ${imgSrc ? `<img src="${imgSrc}" class="tienda-card__img" alt="${esc(p.nombre)}">` : `<div class="tienda-card__img tienda-card__img--ph"></div>`}
        ${sinStock ? `<span class="tienda-card__badge" style="background:#777">Agotado</span>`
          : descuentoPct ? `<span class="tienda-card__badge">-${descuentoPct}%</span>`
          : esNuevo ? `<span class="tienda-card__badge" style="background:var(--negro)">Nuevo</span>` : ''}
      </div>
      <div class="tienda-card__body">
        <span class="tienda-card__vendedor tienda-card__vendedor--${p._origen}">${p._origen === 'club' ? ICON_TIENDA : ICON_ALIADO}${esc(vendedor)}</span>
        ${p.categorias_productos?.nombre ? `<span class="tienda-card__cat">${esc(p.categorias_productos.nombre)}</span>` : ''}
        <div class="tienda-card__nombre">${esc(p.nombre)}</div>
        <span class="tienda-card__envio">${ic('truck')}Envío gratis</span>
        ${resumenP ? `<div class="tienda-card__rating">${estrellasHtml(resumenP.promedio, 12)}<span>${resumenP.texto}</span></div>` : ''}
        ${pocoStock ? `<div class="tienda-card__stock">Quedan ${p.stock}</div>` : ''}
        <div class="tienda-card__precios">
          <div class="tienda-card__precios-txt">
            ${precioNormal ? `<span class="tienda-card__antes">${precioNormal}</span>` : ''}
            <span class="tienda-card__precio">${precioDesc || precioNormal}</span>
          </div>
          <button class="tienda-card__cart" data-comprar="${p.id}" data-origen="${p._origen}" type="button" ${sinStock ? 'disabled' : ''} aria-label="${sinStock ? 'Agotado' : 'Comprar'}">${ic(sinStock ? 'x' : 'shopping-cart')}</button>
        </div>
      </div>
    </div>`;
  }

  function productosFiltrados() {
    let lista = catActiva === 'todos' ? todos : todos.filter(p => p.categoria_id === catActiva);
    const q = queryTexto.trim().toLowerCase();
    if (q) {
      lista = lista.filter(p => {
        const vendedor = p._origen === 'club' ? 'tienda del club' : (p.aliados?.tienda_nombre || p.aliados?.nombre || '');
        return (p.nombre || '').toLowerCase().includes(q)
          || (p.descripcion || '').toLowerCase().includes(q)
          || (p.categorias_productos?.nombre || '').toLowerCase().includes(q)
          || vendedor.toLowerCase().includes(q);
      });
    }
    if (orden === 'precio') {
      lista = [...lista].sort((a, b) => (a.precio_descuento ?? a.precio_normal ?? 0) - (b.precio_descuento ?? b.precio_normal ?? 0));
    } else if (orden === 'calificacion') {
      const prom = p => p._origen === 'club' ? resumenResenas(resenasPorProducto.get(p.id) || []).promedio : 0;
      lista = [...lista].sort((a, b) => prom(b) - prom(a));
    }
    return lista;
  }

  function renderGrid() {
    const lista = productosFiltrados();
    grid.innerHTML = lista.length ? lista.map(tarjeta).join('') : `
      <div style="text-align:center;padding:48px 20px;grid-column:1/-1">
        <span style="display:inline-flex;width:38px;height:38px;border-radius:50%;background:var(--verde-soft);color:var(--verde);align-items:center;justify-content:center;margin-bottom:14px">${ic("search-x")}</span>
        <p style="font-size:13px;color:var(--tinta-45,#888);max-width:320px;margin:0 auto;line-height:1.5">No encontramos productos para tu búsqueda. Prueba con otra palabra o categoría.</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
    grid.querySelectorAll('[data-ver-prod]').forEach(card => card.addEventListener('click', (e) => {
      if (e.target.closest('[data-comprar]')) return;
      const p = todos.find(x => x.id === card.dataset.verProd && x._origen === card.dataset.origen);
      if (!p) return;
      if (p._origen === 'club') abrirDetalleProductoClub(p); else abrirDetalleProductoAliado(p);
    }));
    grid.querySelectorAll('[data-comprar]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = todos.find(x => x.id === btn.dataset.comprar && x._origen === btn.dataset.origen);
      if (!p) return;
      if (p._origen === 'club') abrirCheckoutClub(p); else abrirCheckoutProducto(p);
    }));
  }

  function mostrarVistaTienda(vista) {
    const wrapPedidos = document.getElementById('mis-pedidos-club-wrap');
    const buscadorEl = document.querySelector('.tienda-search');
    const esPedidos = vista === 'pedidos';
    if (wrapPedidos) wrapPedidos.style.display = esPedidos ? '' : 'none';
    grid.style.display = esPedidos ? 'none' : '';
    if (ordenEl) ordenEl.style.display = esPedidos ? 'none' : '';
    if (buscadorEl) buscadorEl.style.display = esPedidos ? 'none' : '';
    if (catsEl) catsEl.style.display = esPedidos ? 'none' : '';
  }
  document.getElementById('mis-pedidos-volver')?.addEventListener('click', () => {
    catsEl?.querySelectorAll('.tienda-cat-ic').forEach(b => b.classList.toggle('is-on', b.dataset.cat === 'todos'));
    catActiva = 'todos';
    mostrarVistaTienda('productos');
    renderGrid();
  });

  if (catsEl) {
    const chip = (id, nombre, icon, activo) => `<button class="tienda-cat-ic${activo ? ' is-on' : ''}" data-cat="${id}">
      <span class="tienda-cat-ic__circle">${ic(icon)}</span>
      <span class="tienda-cat-ic__lbl">${esc(nombre)}</span>
    </button>`;
    catsEl.innerHTML = chip('todos', 'Todos', 'layout-grid', true) +
      (cats || []).map(c => chip(c.id, c.nombre, iconoCatTienda(c.nombre), false)).join('');
    if (window.lucide) lucide.createIcons();
    catsEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-cat]'); if (!btn) return;
      catsEl.querySelectorAll('.tienda-cat-ic').forEach(b => b.classList.toggle('is-on', b === btn));
      if (btn.dataset.cat === 'mis-pedidos') { mostrarVistaTienda('pedidos'); return; }
      catActiva = btn.dataset.cat;
      mostrarVistaTienda('productos');
      renderGrid();
    });
  }
  if (ordenEl) {
    const OPCIONES_ORDEN = [['relevancia', 'Relevancia'], ['calificacion', 'Mejor calificados'], ['precio', 'Más baratos']];
    ordenEl.innerHTML = OPCIONES_ORDEN.map(([val, lbl], i) => `<button class="tienda-filtro${i === 0 ? ' is-on' : ''}" data-orden="${val}">${lbl}</button>`).join('');
    ordenEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-orden]'); if (!btn) return;
      orden = btn.dataset.orden;
      ordenEl.querySelectorAll('.tienda-filtro').forEach(b => b.classList.toggle('is-on', b === btn));
      renderGrid();
    });
  }
  document.getElementById('tienda-search')?.addEventListener('input', (e) => {
    queryTexto = e.target.value;
    renderGrid();
  });
  renderGrid();
  mostrarVistaTienda('productos');
  cargarMisPedidosClub();

  // Link directo a un producto puntual (ej. "Producto destacado de hoy" en
  // Inicio) -- sin esto, ese link solo abría la Tienda en general y había
  // que buscar el mismo producto de nuevo a mano.
  const idProductoDeep = new URLSearchParams(location.search).get("producto");
  if (idProductoDeep) {
    const pDeep = todos.find(x => x.id === idProductoDeep && x._origen === "club");
    if (pDeep) abrirDetalleProductoClub(pDeep);
  }
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
  const sinStock = p.stock != null && p.stock <= 0;
  const pocoStock = p.stock != null && p.stock > 0 && p.stock <= 5;

  abrirModalTienda(p.nombre, `
    <div class="tprod-galeria">
      <div class="tprod-galeria__main" id="tpg-main">
        ${imgs[0] ? `<img src="${esc(imgs[0])}" alt="${esc(p.nombre)}">` : ''}
      </div>
      ${imgs.length > 1 ? `<div class="tprod-galeria__thumbs">
        ${imgs.map((url, i) => `<div class="tprod-galeria__thumb${i === 0 ? ' is-on' : ''}" data-tpg-thumb="${i}"><img src="${esc(url)}" alt=""></div>`).join('')}
      </div>` : ''}
    </div>
    <span class="tienda-card__vendedor tienda-card__vendedor--club" style="margin-top:16px"><i data-lucide="store"></i>Tienda del Club</span>
    ${p.categorias_productos?.nombre ? `<span class="tienda-card__cat" style="display:block;margin-top:4px">${esc(p.categorias_productos.nombre)}</span>` : ''}
    <div style="display:flex;align-items:center;gap:6px;margin:4px 0 2px" id="tpd-resumen">${estrellasHtml(0, 14)}<span style="font-size:12.5px;color:#777">Cargando reseñas…</span></div>
    <p style="font-size:14px;line-height:1.6;color:#444;margin:8px 0 16px">${p.descripcion ? descHtml(p.descripcion) : 'Sin descripción adicional.'}</p>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      ${p.precio_normal && p.precio_descuento && p.precio_normal > p.precio_descuento ? `<span style="font-size:14px;color:#999;text-decoration:line-through">${COP(p.precio_normal)}</span>` : ''}
      <span style="font-size:24px;font-weight:800;color:var(--verde)">${COP(precio)}</span>
    </div>
    ${pocoStock ? `<div class="tienda-card__stock" style="margin-bottom:14px">Quedan ${p.stock}</div>` : '<div style="margin-bottom:18px"></div>'}
    <button class="btn btn--primario" id="tpg-comprar" style="width:100%" ${sinStock ? 'disabled' : ''}>${sinStock ? 'Agotado' : 'Comprar'}</button>
    <div style="font-size:14px;font-weight:700;margin:28px 0 12px;padding-top:20px;border-top:1px solid #eee">Reseñas de miembros</div>
    <div id="tpd-resenas-lista">${listaResenasHtml([], p.id, _miembroId)}</div>
  `);
  if (imgs.length > 1) {
    document.querySelectorAll('[data-tpg-thumb]').forEach(t => t.addEventListener('click', () => {
      const i = +t.dataset.tpgThumb;
      const main = document.getElementById('tpg-main');
      if (main) main.innerHTML = `<img src="${esc(imgs[i])}" alt="${esc(p.nombre)}">`;
      document.querySelectorAll('[data-tpg-thumb]').forEach(x => x.classList.toggle('is-on', x === t));
    }));
  }
  if (!sinStock) document.getElementById('tpg-comprar')?.addEventListener('click', () => abrirCheckoutClub(p));
  cargarResenasProducto(p);
}

async function cargarResenasProducto(p) {
  const { data: resenasRaw } = await supabase
    .from('resenas_producto')
    .select('id, producto_id, estrellas, comentario, foto_url, miembro_id')
    .eq('producto_id', p.id)
    .eq('estado', 'aprobado')
    .order('created_at', { ascending: false });
  const resenas = await adjuntarAutoresResenas(resenasRaw || []);
  const resumen = resumenResenas(resenas);

  const resumenEl = document.getElementById('tpd-resumen');
  if (resumenEl) resumenEl.innerHTML = `${estrellasHtml(resumen.promedio, 14)}<span style="font-size:12.5px;color:#777">${resumen.texto}</span>`;
  const listaEl = document.getElementById('tpd-resenas-lista');
  if (listaEl) listaEl.innerHTML = listaResenasHtml(resenas, p.id, _miembroId);
  if (window.lucide) lucide.createIcons();
  wireResenasProducto(p);
}

function wireResenasProducto(p) {
  const cont = document.getElementById('tpd-resenas-lista');
  if (!cont) return;
  cont.querySelectorAll('[data-resena-foto]').forEach(img => img.addEventListener('click', () => abrirLightbox(img.dataset.resenaFoto)));
  cont.querySelectorAll('[data-estrella]').forEach(starBtn => {
    starBtn.addEventListener('click', () => {
      const starsCont = starBtn.closest('[data-resena-stars]');
      const n = +starBtn.dataset.estrella;
      starsCont.dataset.selected = n;
      [...starsCont.querySelectorAll('[data-estrella]')].forEach((b, idx) => {
        const icono = b.querySelector('svg, i');
        if (!icono) return;
        icono.style.color = idx < n ? '#EAB749' : '#ccc';
        icono.style.fill = idx < n ? '#EAB749' : 'none';
      });
    });
  });

  // Foto opcional en la reseña -- se inserta a mano junto al textarea para no
  // tocar listaResenasHtml() (la comparte Educación, que no necesita esto).
  let fotoResenaFile = null;
  const textarea = cont.querySelector(`[data-resena-texto="${p.id}"]`);
  if (textarea && !textarea.dataset.fotoWired) {
    textarea.dataset.fotoWired = '1';
    const fotoWrap = document.createElement('div');
    fotoWrap.style.cssText = 'margin-top:8px';
    fotoWrap.innerHTML = `
      <button type="button" id="rp-foto-btn" style="font-size:12px;font-weight:600;color:var(--verde);background:none;border:1px dashed #ccc;border-radius:8px;padding:6px 10px;cursor:pointer">${ic('camera')} Agregar una foto (opcional)</button>
      <input type="file" id="rp-foto-input" accept="image/*" style="display:none">
      <div id="rp-foto-preview" style="margin-top:6px"></div>`;
    textarea.insertAdjacentElement('afterend', fotoWrap);
    if (window.lucide) lucide.createIcons();
    fotoWrap.querySelector('#rp-foto-btn')?.addEventListener('click', () => fotoWrap.querySelector('#rp-foto-input')?.click());
    fotoWrap.querySelector('#rp-foto-input')?.addEventListener('change', (e) => {
      fotoResenaFile = e.target.files?.[0] || null;
      const prev = fotoWrap.querySelector('#rp-foto-preview');
      if (prev) prev.innerHTML = fotoResenaFile ? `<img src="${URL.createObjectURL(fotoResenaFile)}" alt="Vista previa de tu foto" style="width:56px;height:56px;object-fit:cover;border-radius:8px">` : '';
    });
  }

  const enviarBtn = cont.querySelector('[data-enviar-resena]');
  enviarBtn?.addEventListener('click', async () => {
    const starsCont = cont.querySelector(`[data-resena-stars="${p.id}"]`);
    const estrellas = +(starsCont?.dataset.selected || 0);
    if (!estrellas) { toast('Selecciona cuántas estrellas le das al producto'); return; }
    const comentario = cont.querySelector(`[data-resena-texto="${p.id}"]`)?.value.trim() || null;
    enviarBtn.disabled = true; enviarBtn.textContent = 'Enviando…';

    let foto_url = null;
    if (fotoResenaFile) {
      fotoResenaFile = await comprimirImagen(fotoResenaFile);
      const ext = fotoResenaFile.name.split('.').pop();
      const path = `resena-producto-${p.id}-${_miembroId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('contenido').upload(path, fotoResenaFile, { upsert: true });
      if (!upErr) foto_url = supabase.storage.from('contenido').getPublicUrl(path).data.publicUrl;
    }

    // Id generado en el navegador para disparar la verificación con IA justo
    // después de guardar. Una reseña con texto y/o foto queda "pendiente"
    // hasta que la IA (o el admin a mano) confirme que no tiene contenido
    // inapropiado -- solo una reseña de puras estrellas, sin nada que
    // moderar, se publica de inmediato.
    const necesitaRevision = !!(comentario || foto_url);
    const nuevaResenaId = crypto.randomUUID();
    const { error } = await supabase.from('resenas_producto').insert({
      id: nuevaResenaId, producto_id: p.id, miembro_id: _miembroId, estrellas, comentario, foto_url,
      estado: necesitaRevision ? 'pendiente' : 'aprobado',
    });
    if (error) {
      toast(error.code === '23505' ? 'Ya habías dejado una reseña de este producto' : 'Error: ' + error.message);
      enviarBtn.disabled = false; enviarBtn.textContent = 'Enviar reseña';
      return;
    }
    toast(necesitaRevision ? '¡Gracias por tu reseña! Está en revisión.' : '¡Gracias por tu reseña! ✓');
    cargarResenasProducto(p);

    if (necesitaRevision) {
      fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/verificar-resena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resena_id: nuevaResenaId }),
      }).then(() => cargarResenasProducto(p)).catch(() => {});
    }
  });
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
    let file = $("#pcc-comprobante")?.files?.[0];
    if (!nombre || !direccion || !telefono) { toast("Completa nombre, dirección y teléfono"); return; }
    if (!file) { toast("Sube el comprobante de pago"); return; }
    if (!precio) { toast("Este producto no tiene un precio válido"); return; }
    btn.disabled = true; btn.textContent = "Enviando…";

    const { data: { session } } = await supabase.auth.getSession();
    const miembroId = session?.user?.id;
    if (!miembroId) { toast("Debes iniciar sesión"); btn.disabled = false; return; }

    file = await comprimirImagen(file);
    const ext = file.name.split(".").pop();
    const path = `comprobante-club-${miembroId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
    if (upErr) { toast("Error subiendo el comprobante"); btn.disabled = false; btn.textContent = "Confirmar pedido"; return; }
    const comprobante_url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;

    // Id generado en el navegador para disparar la verificación con IA justo
    // después de guardar, sin depender de un SELECT post-insert.
    const nuevoPedidoClubId = crypto.randomUUID();
    const { error } = await supabase.from("pedidos_club").insert({
      id: nuevoPedidoClubId,
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
    toast("Pedido enviado — verificando tu comprobante…");
    setTimeout(cargarMisPedidosClub, 800);

    // Verificación automática del comprobante con IA -- no bloquea nada (el
    // miembro ya ve "pedido enviado"), pero si todo cuadra marca el pago
    // como confirmado solo. Se refresca "Mis pedidos" al terminar para que
    // el cambio se vea sin que el miembro tenga que hacerlo a mano.
    fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/verificar-pedido-club", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedido_id: nuevoPedidoClubId }),
    }).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (j.aprobado) toast("✅ ¡Tu pago ya quedó confirmado!");
      cargarMisPedidosClub();
    }).catch(() => {});

    supabase.from("configuracion").select("valor").eq("clave", "numero_admin_notificaciones").maybeSingle()
      .then(({ data }) => {
        if (!data?.valor) return;
        fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/whatsapp-send-3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: data.valor,
            contentSid: CONTENT_SID_AVISO_PEDIDO_TIENDA,
            contentVariables: { "1": p.nombre, "2": COP(precio) },
          }),
        }).catch(() => {});
      }).catch(() => {});
  });
}

async function cargarMisPedidosClub() {
  const list = document.getElementById("mis-pedidos-club-list");
  if (!list) return;
  const { data } = await supabase.from("pedidos_club").select("*, productos(imagen_url, imagenes)").order("created_at", { ascending: false });
  const pedidos = data || [];
  list.innerHTML = pedidos.length ? pedidos.map(p => {
    const est = ESTADO_PEDIDO_CLUB[p.estado] || ESTADO_PEDIDO_CLUB.pendiente_pago;
    const img = p.productos?.imagen_url || (p.productos?.imagenes && p.productos.imagenes[0]);
    return `<div class="pedido-card">
      ${img ? `<img src="${esc(img)}" class="pedido-card__img" alt="">` : `<div class="pedido-card__img pedido-card__img--ph">${ic("package")}</div>`}
      <div class="pedido-card__body">
        <div class="pedido-card__nombre">${esc(p.nombre_producto)}</div>
        <div class="pedido-card__precio">${COP(p.monto)}</div>
        ${p.numero_guia ? `<div class="pedido-card__guia">Guía: ${esc(p.numero_guia)}</div>` : ""}
      </div>
      <span class="pedido-card__estado" style="background:${est.bg};color:${est.c}">${est.t}</span>
    </div>`;
  }).join("") : `<p style="font-size:13px;color:#999;text-align:center;padding:24px 0">Todavía no has hecho ningún pedido.</p>`;
  const countEl = document.getElementById("mis-pedidos-count");
  if (countEl) countEl.textContent = pedidos.length ? `${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"}` : "";
  if (window.lucide) lucide.createIcons();

  // Botón "Mis pedidos" en la fila de categorías -- solo aparece si ya hizo
  // al menos un pedido, y solo se agrega una vez (no en cada refresco).
  const catsEl = document.getElementById("tienda-cats");
  if (catsEl && pedidos.length && !catsEl.querySelector('[data-cat="mis-pedidos"]')) {
    const btn = document.createElement("button");
    btn.className = "tienda-cat-ic";
    btn.dataset.cat = "mis-pedidos";
    btn.innerHTML = `<span class="tienda-cat-ic__circle">${ic("receipt")}</span><span class="tienda-cat-ic__lbl">Mis pedidos</span>`;
    catsEl.insertBefore(btn, catsEl.firstChild);
    if (window.lucide) lucide.createIcons();
  }
}

/* ---------- Tienda de aliados (vitrina + checkout) ---------- */
function abrirDetalleProductoAliado(p) {
  const imgs = (p.imagenes && p.imagenes.length) ? p.imagenes : (p.imagen_url ? [p.imagen_url] : []);
  const precioNormal = p.precio_normal != null ? COP(p.precio_normal) : '';
  const precioDesc = p.precio_descuento != null ? COP(p.precio_descuento) : '';
  const sinStock = p.stock != null && p.stock <= 0;
  const pocoStock = p.stock != null && p.stock > 0 && p.stock <= 5;
  abrirModalTienda(p.nombre, `
    <div class="tprod-galeria">
      <div class="tprod-galeria__main" id="tpg2-main">
        ${imgs[0] ? `<img src="${esc(imgs[0])}" alt="${esc(p.nombre)}">` : ''}
      </div>
      ${imgs.length > 1 ? `<div class="tprod-galeria__thumbs">
        ${imgs.map((url, i) => `<div class="tprod-galeria__thumb${i === 0 ? ' is-on' : ''}" data-tpg2-thumb="${i}"><img src="${esc(url)}" alt=""></div>`).join('')}
      </div>` : ''}
    </div>
    <span class="tienda-card__vendedor"><i data-lucide="handshake"></i>${esc(p.aliados?.tienda_nombre || p.aliados?.nombre)}</span>
    ${p.categorias_productos?.nombre ? `<span class="tienda-card__cat" style="display:block;margin-top:4px">${esc(p.categorias_productos.nombre)}</span>` : ''}
    <p style="font-size:14px;line-height:1.6;color:#444;margin:8px 0 16px">${p.descripcion ? descHtml(p.descripcion) : 'Sin descripción adicional.'}</p>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      ${precioNormal ? `<span style="font-size:14px;color:#999;text-decoration:line-through">${precioNormal}</span>` : ''}
      ${precioDesc ? `<span style="font-size:24px;font-weight:800;color:var(--verde)">${precioDesc}</span>` : ''}
    </div>
    ${pocoStock ? `<div class="tienda-card__stock" style="margin-bottom:14px">Quedan ${p.stock}</div>` : '<div style="margin-bottom:18px"></div>'}
    <button class="btn btn--primario" id="tpg2-comprar" style="width:100%" ${sinStock ? 'disabled' : ''}>${sinStock ? 'Agotado' : 'Comprar'}</button>
  `);
  if (imgs.length > 1) {
    document.querySelectorAll('[data-tpg2-thumb]').forEach(t => t.addEventListener('click', () => {
      const i = +t.dataset.tpg2Thumb;
      const main = document.getElementById('tpg2-main');
      if (main) main.innerHTML = `<img src="${esc(imgs[i])}" alt="${esc(p.nombre)}">`;
      document.querySelectorAll('[data-tpg2-thumb]').forEach(x => x.classList.toggle('is-on', x === t));
    }));
  }
  if (!sinStock) document.getElementById('tpg2-comprar')?.addEventListener('click', () => abrirCheckoutProducto(p));
  if (window.lucide) lucide.createIcons();
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
    let file = $("#pc-comprobante")?.files?.[0];
    if (!file) { toast("Sube el comprobante de pago"); return; }
    const nombre = $("#pc-nombre")?.value.trim();
    const direccion = $("#pc-direccion")?.value.trim();
    const telefono = $("#pc-telefono")?.value.trim();
    if (tipoEntrega === "envio" && (!nombre || !direccion)) { toast("Completa nombre y dirección"); return; }

    btn.disabled = true; btn.textContent = "Enviando…";
    file = await comprimirImagen(file);
    const ext = file.name.split(".").pop();
    const path = `comprobante-${_miembroId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
    if (upErr) { toast("Error subiendo el comprobante"); btn.disabled = false; btn.textContent = "Confirmar pedido"; return; }
    const comprobante_url = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;

    // Id generado en el navegador para disparar la verificación con IA justo
    // después de guardar, sin depender de un SELECT post-insert.
    const nuevoPedidoId = crypto.randomUUID();
    const payload = {
      id: nuevoPedidoId,
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
      fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/whatsapp-send-3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: wa,
          contentSid: CONTENT_SID_AVISO_ALIADO_NUEVO_PEDIDO,
          contentVariables: { "1": nombreMiembro, "2": p.nombre, "3": COP(precio) },
        }),
      }).then(async (r) => {
        if (!r.ok) console.error("whatsapp-send-3 (aviso al aliado) falló:", r.status, await r.text().catch(() => ""));
      }).catch((e) => console.error("whatsapp-send-3 (aviso al aliado) error de red:", e));
    }
    abrirModalTienda("¡Pedido enviado!", `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:44px;line-height:1">✓</div>
        <p style="font-size:14px;margin-top:12px">Gracias por tu compra en <b>${esc(p.aliados?.tienda_nombre || p.aliados?.nombre) || 'el negocio'}</b>.<br>El negocio confirmará tu pago pronto.</p>
        <p id="pc-verif-ia" style="font-size:13px;color:#777;margin-top:10px">🤖 Verificando tu comprobante automáticamente…</p>
      </div>
      ${redesSocialesHTML(p.aliados)}
      <button class="btn btn--primario" id="pc-cerrar-exito" style="margin-top:20px;width:100%">Listo</button>
    `);
    $("#pc-cerrar-exito")?.addEventListener("click", () => cerrarModalTienda());

    // Verificación automática del comprobante con IA -- no bloquea nada (el
    // miembro ya ve "pedido enviado"), pero si todo cuadra confirma el pago
    // solo y el aliado no tiene que revisarlo a mano. El aviso en vivo le
    // confirma al miembro qué pasó, sin que tenga que refrescar para verlo.
    fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/verificar-pedido-aliado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedido_id: nuevoPedidoId }),
    }).then(async (r) => {
      const verifEl = $("#pc-verif-ia");
      if (!verifEl) return;
      const j = await r.json().catch(() => ({}));
      verifEl.textContent = j.aprobado
        ? "✅ ¡Tu pago ya quedó confirmado!"
        : "👀 Tu comprobante quedó en revisión del negocio.";
    }).catch(() => {
      const verifEl = $("#pc-verif-ia");
      if (verifEl) verifEl.textContent = "👀 Tu comprobante quedó en revisión del negocio.";
    });
  });
}

/* ---------- PROFESIONALES DEL CLUB (exclusivo Premium/Vitalicia) ---------- */
async function cargarProfesionalesClub(plan) {
  const bloqueadoEl = $("#profes-club-bloqueado");
  const gridEl = $("#profes-club-grid");
  if (!bloqueadoEl || !gridEl) return;

  // Vitrina para todos los planes -- el directorio y los servicios/tarifas de
  // cada profesional se ven siempre, para generar expectativa; el candado
  // Premium solo aparece al tocar "Contactar por WhatsApp" de un profesional.
  const esPremium = plan === "premium" || plan === "vitalicia";
  bloqueadoEl.style.display = "none";
  gridEl.style.display = "grid";

  const [{ data: profs }, { data: servicios }] = await Promise.all([
    supabase.from("profesionales_publico").select("*").eq("mostrar_premium", true).order("created_at"),
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
      const ctaHtml = esPremium
        ? (waUrl ? `<a href="${waUrl}" target="_blank" rel="noopener" class="btn btn--primario btn--bloque" style="margin-top:20px;display:flex;align-items:center;justify-content:center;gap:8px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.335-1.502A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.898 0-3.67-.523-5.188-1.432l-.372-.22-3.762.892.952-3.67-.242-.383A9.937 9.937 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            Contactar por WhatsApp
          </a>` : "")
        : `<div style="text-align:center;padding:20px 0 4px;margin-top:12px;border-top:1px solid var(--linea,#eee)">
            <i data-lucide="lock" style="width:28px;height:28px;color:var(--tinta-40,#888)"></i>
            <p style="font-size:14px;font-weight:600;margin:10px 0 6px">Este beneficio es exclusivo Premium</p>
            <p style="font-size:12.5px;color:var(--tinta-60,#666);max-width:320px;margin:0 auto 16px">Sube a Premium para contactar directo a ${esc(p.nombre)} y acceder a sus tarifas con descuento.</p>
            <a href="Planes.html" class="btn btn--primario" style="width:100%;justify-content:center;display:flex;align-items:center;gap:6px">Subir a Premium <span class="ar">&rarr;</span></a>
          </div>`;
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
        ${ctaHtml}
      `);
    });
  });

  if (window.lucide) lucide.createIcons();
}

/* ---------- CARRUSEL MARCAS ---------- */
// Antes mostraba "marcas_aliadas" (marcas afiliadas, cargadas a mano desde
// Admin). Ahora muestra los aliados reales marcados como "destacado" (la
// estrella en Admin > Aliados).
async function cargarMarcasCarrusel() {
  const track = document.getElementById("marcas-track-dash");
  const wrap  = document.getElementById("marcas-carrusel-dash");
  if (!track) return;
  const { data } = await supabase.from("aliados_publico").select("nombre,imagen_url,instagram").eq("destacado", true);
  if (!data || !data.length) { if (wrap) wrap.style.display = "none"; return; }
  const items = [...data, ...data];
  track.innerHTML = items.map(m => `<div class="marcas-carrusel__item">
    <a href="${m.instagram || 'Directorio.html'}" target="_blank" rel="noopener" title="${esc(m.nombre)}">
      <img src="${m.imagen_url}" alt="${esc(m.nombre)}">
    </a>
    <span class="marcas-carrusel__sep">✷</span>
  </div>`).join("");
}

// Mismo criterio de "tipo de promo" que badgePromo() de directorio.js --
// duplicado a propósito (archivo aparte, sin import compartido).
function badgePromoDash(p) {
  if (p.tipo === "porcentaje") {
    const pct = p.descuento_pct || (p.precio_normal && p.ahorro_fijo ? Math.round((p.ahorro_fijo / p.precio_normal) * 100) : null);
    return pct != null ? `${pct}%` : "% dcto.";
  }
  if (p.tipo === "2x1") return "2×1";
  if (p.tipo === "monto_fijo") return p.ahorro_fijo ? `-${COP(p.ahorro_fijo)}` : "Descuento";
  if (p.tipo === "precio_especial") return p.precio_descuento != null ? COP(p.precio_descuento) : "Precio especial";
  if (p.tipo === "regalo") return "🎁";
  return "Promo";
}

/* ---------- PROMOCIÓN DEL DÍA (Inicio) ----------
   Promos reales vigentes hoy (dentro de fecha_inicio/fecha_fin y, si aplica
   solo ciertos días, que hoy sea uno de ellos), filtradas a los aliados de
   las categorías de interés que el miembro eligió en "Queremos conocerte
   mejor". Sin categorías elegidas, o sin ninguna promo vigente en esas
   categorías, cae a un producto al azar de la Tienda del Club -- nunca se
   queda vacío, y nunca le muestra promos sin relación con sus gustos. */
async function cargarPromoDelDia(categoriasInteres = []) {
  const wrap = document.getElementById("promo-dia-wrap");
  const tituloEl = document.getElementById("promo-dia-titulo");
  const grid = document.getElementById("promo-dia-grid");
  if (!wrap || !grid) return;

  const DIAS_SEMANA_ES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const hoy = new Date();
  const hoyISO = hoy.toISOString().slice(0, 10);
  const diaHoy = DIAS_SEMANA_ES[hoy.getDay()];

  let deHoy = [];
  let aliadosMap = new Map();

  if (categoriasInteres.length) {
    const { data: promosRaw } = await supabase.from("promociones")
      .select("id, titulo, descripcion, tipo, descuento_pct, ahorro_fijo, precio_normal, precio_descuento, fecha_inicio, fecha_fin, dias_aplica, aliado_id")
      .eq("activa", true);

    const vigentesHoy = (promosRaw || []).filter(p => {
      const enRango = (!p.fecha_inicio || p.fecha_inicio <= hoyISO) && (!p.fecha_fin || p.fecha_fin >= hoyISO);
      const aplicaHoy = !p.dias_aplica || !p.dias_aplica.length || p.dias_aplica.includes(diaHoy);
      return enRango && aplicaHoy;
    });

    if (vigentesHoy.length) {
      const idsAliados = [...new Set(vigentesHoy.map(p => p.aliado_id))];
      const { data: aliadosData } = await supabase.from("aliados_publico").select("id, nombre, imagen_url, categoria").in("id", idsAliados);
      aliadosMap = new Map((aliadosData || []).map(a => [a.id, a]));
      deHoy = vigentesHoy.filter(p => categoriasInteres.includes(aliadosMap.get(p.aliado_id)?.categoria)).slice(0, 3);
    }
  }

  wrap.hidden = false;

  if (deHoy.length) {
    tituloEl.textContent = "🎉 Promoción" + (deHoy.length > 1 ? "es" : "") + " de hoy";
    grid.innerHTML = deHoy.map(p => {
      const al = aliadosMap.get(p.aliado_id);
      return `
      <a class="aliado-mini" href="Directorio.html?abrir=${p.aliado_id}">
        ${al?.imagen_url
          ? `<img class="aliado-mini__ic" src="${esc(al.imagen_url)}" alt="" style="object-fit:cover">`
          : `<span class="aliado-mini__ic">${ic("tag")}</span>`}
        <span>
          <span class="aliado-mini__name">${esc(al?.nombre || "Aliado")}</span><br>
          <span class="aliado-mini__cat">${esc(p.titulo || p.descripcion || "")}</span>
        </span>
        <span class="aliado-mini__pct">${badgePromoDash(p)}</span>
      </a>`;
    }).join("");
  } else {
    const { data: productos } = await supabase.from("productos")
      .select("id, nombre, descripcion, imagen_url, precio_normal, precio_descuento")
      .eq("activo", true);
    if (!productos || !productos.length) { wrap.hidden = true; return; }
    const p = productos[Math.floor(Math.random() * productos.length)];
    const tieneDescuento = p.precio_descuento != null && p.precio_normal != null && p.precio_descuento < p.precio_normal;
    tituloEl.textContent = "🛍️ Producto destacado de hoy";
    grid.innerHTML = `
    <a class="aliado-mini" href="Perfil.html?panel=tienda&producto=${p.id}">
      ${p.imagen_url
        ? `<img class="aliado-mini__ic" src="${esc(p.imagen_url)}" alt="" style="object-fit:cover">`
        : `<span class="aliado-mini__ic">${ic("package")}</span>`}
      <span>
        <span class="aliado-mini__name">${esc(p.nombre)}</span><br>
        <span class="aliado-mini__cat">${esc((p.descripcion || "").slice(0, 60))}</span>
      </span>
      <span class="aliado-mini__pct">${tieneDescuento ? `<span class="aliado-mini__antes">${COP(p.precio_normal)}</span>` : ""}${COP(p.precio_descuento ?? p.precio_normal)}</span>
    </a>`;
  }
  if (window.lucide) lucide.createIcons();
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
  // Páginas de ContaClub (dominio propio, sin membresía del Club) cargan
  // este mismo dashboard.js para reusar Mi Contabilidad, pero NUNCA deben
  // disparar el bootstrap del dashboard de miembro de abajo (ClubCard,
  // segmentación, etc. -- nada de eso existe en su HTML). Se reconocen por
  // tener #contaclub-root, que Perfil.html jamás tiene.
  if (document.getElementById("contaclub-root")) { iniciarContaClubDashboard(); return; }
  render();
  const u = leerPerfil();
  // La primera pantalla reemplaza el historial (no lo agrega) para que el
  // gesto de "atrás" no deje a alguien atrapado en un "Inicio" fantasma
  // antes de salir de la página.
  // Permite enlazar directo a un panel (ej. la barra inferior de Directorio.html
  // apuntando a "Perfil.html?panel=soporte") -- si no viene o no es válido, cae
  // al de siempre ("inicio").
  const panelUrl = new URLSearchParams(location.search).get("panel");
  const panelInicial = panelUrl && TITULOS[panelUrl] ? panelUrl : "inicio";
  history.replaceState({ panel: panelInicial }, "", location.href);
  mostrarPanel(panelInicial);
  cargarPanelSiHaceFalta(panelInicial);
  // getSession() puede devolver null al reabrir la app (PWA en segundo plano)
  // -- antes eso mandaba a Login.html de una, pidiendo el código de nuevo
  // aunque la sesión siguiera siendo válida. Se reintenta varias veces (hasta
  // ~4s en total) y, si sigue sin aparecer pero SÍ hay un token guardado en
  // este navegador, se fuerza un refreshSession() antes de rendirse --
  // cubre el caso de iOS en modo "app" (ícono de pantalla de inicio), donde
  // el proceso se suspende/mata al segundo de salir y getSession() puede
  // tardar en releer lo que ya está guardado en el dispositivo.
  // Antes solo miraba localStorage directo -- en el primerísimo arranque de
  // la app recién instalada, localStorage puede seguir vacío aunque la
  // sesión SÍ esté en el respaldo de cookie (ver supabase.js), así que esto
  // decía "no hay nada guardado" y nunca llegaba a intentar recuperarla.
  function haySesionGuardadaEnStorage() {
    try {
      if (Object.keys(localStorage).some(k => k.startsWith("sb-") && k.endsWith("-auth-token"))) return true;
    } catch {}
    try {
      return document.cookie.includes("-auth-token.n=");
    } catch { return false; }
  }
  async function obtenerSesionConReintento() {
    for (const espera of [0, 400, 900, 1600, 1600, 1600]) {
      if (espera) await new Promise(r => setTimeout(r, espera));
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) return data.session;
      // Sin esto, si para este punto ya quedó claro que sí hay algo guardado
      // (cookie o localStorage) pero getSession() no lo está viendo, seguir
      // esperando el mismo getSession() no cambia nada -- hay que forzar la
      // relectura real con refreshSession().
      if (haySesionGuardadaEnStorage()) {
        try {
          const { data: refrescada } = await supabase.auth.refreshSession();
          if (refrescada.session?.user?.id) return refrescada.session;
        } catch {}
      }
    }
    return null;
  }
  obtenerSesionConReintento().then(async (session) => {
    if (!session?.user?.id) {
      // En iOS, recién instalada la app, la primera apertura a veces no
      // alcanza a leer la sesión a tiempo aunque sí esté guardada -- se
      // automatiza un solo reintento (más de uno solo suma parpadeo visible
      // sin mejorar de verdad las probabilidades).
      if (!sessionStorage.getItem("ecdlg_reload_sesion")) {
        sessionStorage.setItem("ecdlg_reload_sesion", "1");
        location.reload();
        return;
      }
      sessionStorage.removeItem("ecdlg_reload_sesion");
      location.href = "Registro.html?modo=login";
      return;
    }
    sessionStorage.removeItem("ecdlg_reload_sesion");
    const userId = session.user.id;
    _miembroId = userId;
    generarQR(userId);
    configurarLinkVerificacion(userId);
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

    const { data: perfData, error: perfError } = await supabase.from("perfiles").select("plan, nombre, fecha_nacimiento, whatsapp, rol, fecha_vencimiento, categorias_interes, respuestas_segmentacion, foto_url, tiene_mascotas, tiene_hijos, numero_miembro").eq("id", userId).maybeSingle();
    if (perfError) {
      // No mostrar "activa tu membresía" cuando en realidad es un error técnico
      // (ej. una columna que falta) — sería engañoso, parecería que no pagó.
      // Antes esto solo mostraba un toast que desaparecía en 3s y dejaba el
      // dashboard pegado en el estado inicial sin ninguna explicación visible.
      console.error("Error cargando perfil:", perfError);
      mostrarErrorCargaDash();
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
      const primerNombreGratis = (perfData.nombre || "").trim().split(" ")[0] || "";
      fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: perfData.whatsapp,
          contentSid: CONTENT_SID_BIENVENIDA_PLAN_GRATIS,
          contentVariables: { "1": primerNombreGratis, "2": `https://elclubdelagente.com/Bienvenida.html?id=${userId}` },
        }),
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
      // Número de miembro: viene de Supabase (orden real de llegada, columna
      // numero_miembro -- ver SQL de migración), nunca inventado en el navegador.
      if (perfData?.numero_miembro) {
        perfilCache.numero_miembro = perfData.numero_miembro;
        const numTxt = "Miembro #" + perfData.numero_miembro;
        const sbNumEl = $("#sb-num"); if (sbNumEl) sbNumEl.textContent = numTxt;
        const perfilNumEl = $("#perfil-num"); if (perfilNumEl) perfilNumEl.textContent = numTxt;
      }
      // Fecha de nacimiento: el render() inicial solo pinta lo que hubiera en
      // caché (vacío para quien nunca pasó por el registro normal, ej. un
      // aliado creado desde Admin) -- esto la corrige con el dato real apenas
      // llega de Supabase, mismo criterio que el número de miembro arriba.
      const perfilFechaEl = $("#perfil-fecha");
      if (perfilFechaEl) {
        if (perfData?.fecha_nacimiento) {
          perfilCache.fechaISO = perfData.fecha_nacimiento;
          const dNac = new Date(perfData.fecha_nacimiento + "T00:00:00");
          perfilFechaEl.textContent = dNac.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
        } else {
          perfilFechaEl.textContent = "—";
        }
      }
      // Código del frente de la ClubCard (= el WhatsApp): el render() inicial
      // corre ANTES de esta carga real y usaba lo que hubiera en localStorage
      // en ese momento -- si venía vacío (ej. primera vez en este navegador),
      // el código se quedaba en blanco para siempre. Acá ya hay el dato real.
      if (perfData?.whatsapp) {
        perfilCache.whatsapp = perfData.whatsapp;
        $$(".cc-card-codigo").forEach(el => el.textContent = perfData.whatsapp);
      }
      localStorage.setItem("ecdlg_perfil", JSON.stringify(perfilCache));
    }
    const plan = perfData?.plan || null;
    const nombre = perfData?.nombre || session.user.user_metadata?.nombre || session.user.user_metadata?.full_name || null;
    aplicarPlanUI(plan, perfData?.fecha_vencimiento);
    cargarAvisoPagoPendiente(userId);

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
    }

    // Rol aliado (cuenta real, no localStorage): "Mi negocio" conectado por aliado_id
    if (perfData?.rol === "aliado") {
      const { data: negocio } = await supabase.from("aliados").select("id, nombre, categoria, whatsapp, maps_url, tienda_activa, tienda_nombre, tienda_llave_pago, instagram, facebook, tiktok, fecha_inicio, fecha_fin, contrato_url, codigo_aliado").eq("user_id", userId).maybeSingle();
      if (negocio) {
        const li = $("#sb-negocio-li"); if (li) li.hidden = false;
        const negNombre = $("#negocio-nombre"); if (negNombre) negNombre.textContent = negocio.nombre;
        const negCodigo = $("#negocio-codigo"); if (negCodigo) negCodigo.value = negocio.codigo_aliado || "Pídeselo al Club";
        $("#negocio-codigo-copiar")?.addEventListener("click", () => {
          if (!negocio.codigo_aliado) return;
          navigator.clipboard.writeText(negocio.codigo_aliado).then(() => toast("Código copiado ✓"));
        });
        const negCat = $("#negocio-cat"); if (negCat && negocio.categoria) negCat.textContent = negocio.categoria;
        const fmtFechaNeg = (f) => f ? new Date(f + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : null;
        const negVigEl = $("#negocio-vigencia");
        if (negVigEl) {
          const ini = fmtFechaNeg(negocio.fecha_inicio), fin = fmtFechaNeg(negocio.fecha_fin);
          negVigEl.textContent = (ini || fin) ? `${ini || "—"} – ${fin || "—"}` : "—";
        }
        if (negocio.contrato_url) {
          const negContratoLi = $("#negocio-contrato-li"); if (negContratoLi) negContratoLi.hidden = false;
          const negContratoLink = $("#negocio-contrato-link"); if (negContratoLink) negContratoLink.href = negocio.contrato_url;
        }
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
    cargarPromoDelDia(perfData?.categorias_interes || []);
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
    cargarPanelSiHaceFalta(l.dataset.panel);
  }));

  // Avatar del topbar: acceso directo a Configuración (foto, usuario, contraseña)
  $("#topbar-avatar-btn")?.addEventListener("click", () => irPanel("config"));

  // Tarjeta "Ahorro total del mes": abre la evolución mes a mes
  $("#hero-ahorro-card")?.addEventListener("click", () => abrirAhorroMensual());
  $("#hero-ahorro-card")?.addEventListener("keydown", (e) => { if (e.key === "Enter") abrirAhorroMensual(); });

  // Burger móvil
  $("#topbar-burger")?.addEventListener("click", () => {
    const abierto = $("#dash").classList.toggle("menu-open");
    if (abierto) bloquearScroll(); else desbloquearScroll();
  });
  $("#dash-backdrop")?.addEventListener("click", () => { $("#dash").classList.remove("menu-open"); desbloquearScroll(); });

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
      // "session" del callback de arriba (obtenerSesionConReintento) ya no
      // existe acá abajo -- hay que pedir una fresca, si no esto siempre
      // tira "session is not defined" y cae directo al catch de abajo
      // (por eso nunca mandaba el código, con "Error de conexión" tapando
      // el error real).
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/cambiar-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
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
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/cambiar-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
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
      // La tarjeta es un elemento fijo del HTML (no se redibuja cada vez) --
      // si ya quedó visible de una vuelta anterior, hay que ocultarla a mano
      // cuando esta vez NO toca mostrarla (no basta con no llamar a
      // mostrarPasosInstalarApp(), eso solo la muestra, nunca la oculta).
      const elInstalar = document.getElementById("seg-final-instalar");
      if (elInstalar) elInstalar.hidden = true;
      if (_segEsPrimeraVez) mostrarPasosInstalarApp();
      if (window.lucide) lucide.createIcons();
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

  // Mientras no esté activo (recién registrado, pendiente de que el admin lo
  // apruebe/active), no debería poder editar su perfil público -- antes podía
  // entrar y cambiar área/descripción/foto desde el minuto uno, sin que
  // nadie lo hubiera revisado todavía.
  const panelProf = document.querySelector("section[data-panel='profesional']");
  let avisoPendiente = panelProf?.querySelector("#prof-pendiente-aviso");
  if (!prof.activo && !prof.es_conductor) {
    if (panelProf && !avisoPendiente) {
      avisoPendiente = document.createElement("div");
      avisoPendiente.id = "prof-pendiente-aviso";
      avisoPendiente.className = "card";
      avisoPendiente.style.cssText = "margin-bottom:20px;background:#fef9e7;border-color:#fde68a";
      avisoPendiente.innerHTML = `<p style="font-size:13px;color:#92400e;line-height:1.5;margin:0">⏳ Tu perfil todavía está pendiente de aprobación. En cuanto el Club lo active vas a poder editarlo -- mientras tanto se ve tal como lo dejaste en tu postulación.</p>`;
      panelProf.querySelector(".dash-greet")?.insertAdjacentElement("afterend", avisoPendiente);
    }
  } else if (avisoPendiente) {
    avisoPendiente.remove();
  }

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
      ? `<img src="${prof.imagen_url}" alt="${esc(prof.nombre || '')}" style="width:100%;height:100%;object-fit:cover">`
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

  // Bloqueado hasta que el admin lo active -- ver aviso más arriba.
  ["prof-edit-area", "prof-edit-desc", "prof-edit-wa", "prof-edit-img", "prof-edit-save"].forEach(id => {
    const e = $("#" + id); if (e) e.disabled = !prof.activo;
  });

  if (window.lucide) lucide.createIcons();

  // Guardar cambios
  $("#prof-edit-save")?.addEventListener("click", async () => {
    if (!prof.activo) return;
    const btn = $("#prof-edit-save");
    btn.disabled = true;

    let imagen_url = prof.imagen_url || null;
    let file = $("#prof-edit-img")?.files?.[0];
    if (file) {
      file = await comprimirImagen(file);
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
    if (fotoEl && imagen_url) fotoEl.innerHTML = `<img src="${imagen_url}" alt="${esc(prof.nombre || '')}" style="width:100%;height:100%;object-fit:cover">`;

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

  const btnMsAgregar = $("#ms-agregar");
  if (btnMsAgregar) btnMsAgregar.disabled = !prof.activo;
  btnMsAgregar?.addEventListener("click", () => abrirFormServicio());
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
  if (!session) { _sopInit = false; return; }

  const { data: historial, error } = await supabase
    .from("soporte_mensajes")
    .select("rol, mensaje, imagen_url, escalado, created_at")
    .eq("miembro_id", session.user.id)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) console.error("cargarSoporte (historial):", error);

  if (historial && historial.length) {
    chat.innerHTML = historial.map(m => sopBurbuja(m.rol, m.mensaje, m.imagen_url, m.escalado)).join("");
    chat.scrollTop = chat.scrollHeight;
  }

  imgBtn?.addEventListener("click", () => imgInput.click());
  imgInput?.addEventListener("change", async () => {
    let file = imgInput.files?.[0];
    imgInput.value = "";
    if (!file) return;
    file = await comprimirImagen(file);
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
