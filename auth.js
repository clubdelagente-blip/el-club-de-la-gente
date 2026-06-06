/* ============================================================
   EL CLUB DE LA GENTE — Módulo 2 · Lógica de autenticación
   + Algoritmo de numerología pitagórica (silencioso)
   ============================================================ */

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- ARQUETIPOS (número de misión) ---------- */
const ARQUETIPOS = {
  1:  { nombre: "El Líder",            tono: "directo y motivador" },
  2:  { nombre: "El Diplomático",      tono: "empático y colaborativo" },
  3:  { nombre: "El Creativo",         tono: "alegre y expresivo" },
  4:  { nombre: "El Constructor",      tono: "estable y confiable" },
  5:  { nombre: "El Aventurero",       tono: "dinámico y libre" },
  6:  { nombre: "El Protector",        tono: "cálido y familiar" },
  7:  { nombre: "El Místico",          tono: "reflexivo y profundo" },
  8:  { nombre: "El Ejecutivo",        tono: "poderoso y ambicioso" },
  9:  { nombre: "El Humanista",        tono: "compasivo y universal" },
  11: { nombre: "El Iluminado",        tono: "inspirador y visionario" },
  22: { nombre: "El Maestro Constructor", tono: "transformador" },
  33: { nombre: "El Maestro Sanador",  tono: "amoroso y sanador" },
};

/* ---------- ALGORITMO PITAGÓRICO ----------
   Suma todos los dígitos de la fecha y reduce a una cifra,
   conservando los números maestros 11, 22 y 33.
   Entrada: "YYYY-MM-DD" (input date nativo)            */
function calcularMision(fechaISO) {
  if (!fechaISO) return null;
  const digitos = fechaISO.replace(/\D/g, "");        // "20010628"
  const sumar = (s) => [...s].reduce((a, d) => a + (+d), 0);
  let n = sumar(digitos);
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = sumar(String(n));
  }
  return n;
}

/* ---------- NAVEGACIÓN DE VISTAS ---------- */
function mostrarVista(id) {
  $$(".auth-view").forEach(v => v.classList.toggle("is-active", v.id === id));
}
function setTab(tab) {
  $$(".auth-tab").forEach(t => t.classList.toggle("is-active", t.dataset.tab === tab));
  mostrarVista(tab === "login" ? "view-login" : "view-registro");
  if (tab !== "login") resetRoles();
  $(".stepper").style.visibility = "visible";
}

/* ---------- REGISTRO: selección de rol ---------- */
function resetRoles() {
  const roles = $("#reg-roles"), wrap = $("#reg-form-wrap");
  if (roles) roles.hidden = false;
  if (wrap) wrap.hidden = true;
}
function elegirRol(rol) {
  localStorage.setItem("ecdlg_rol", rol);
  $("#reg-roles").hidden = true;
  $("#reg-form-wrap").hidden = false;
  const esAliado = rol === "aliado";
  $("#reg-eyebrow").textContent = esAliado ? "Crea tu cuenta · Aliado" : "Crea tu cuenta · Miembro";
  $("#reg-title").textContent = esAliado ? "Suma tu negocio." : "Únete al club.";
  $("#form-registro").hidden = esAliado;
  $("#form-aliado").hidden = !esAliado;
  if (window.lucide) lucide.createIcons();
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  // Estado inicial según parámetro ?tab= o ?plan=
  const params = new URLSearchParams(location.search);
  const planElegido = params.get("plan");
  if (planElegido) localStorage.setItem("ecdlg_plan", planElegido);
  const tabInicial = params.get("tab") === "login" ? "login" : "registro";
  setTab(tabInicial);

  // Tabs
  $$(".auth-tab").forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));

  // Switches inferiores
  $$("[data-goto]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.goto)));

  // Selección de rol (Miembro / Aliado)
  $$("[data-role]").forEach(b => b.addEventListener("click", () => elegirRol(b.dataset.role)));
  $("#reg-back")?.addEventListener("click", resetRoles);

  // Botones Google (demo → van directo a registro completado simulando OAuth)
  $$(".btn-google").forEach(b => b.addEventListener("click", () => {
    // En el prototipo, "Continuar con Google" precarga el formulario de registro
    if (b.dataset.ctx === "login") {
      // login: simulamos sesión y vamos al perfil/plan
      irAExito({ nombre: "Ana María", fechaISO: "1990-03-14", login: true });
    } else {
      // registro: enfocamos el formulario visible para completar datos
      const visible = $("#form-aliado").hidden ? $("#form-registro") : $("#form-aliado");
      const first = visible.querySelector("input");
      first?.focus();
      visible.animate(
        [{ boxShadow: "0 0 0 0 rgba(0,128,0,0)" }, { boxShadow: "0 0 0 4px rgba(0,128,0,.12)" }, { boxShadow: "0 0 0 0 rgba(0,128,0,0)" }],
        { duration: 900 }
      );
    }
  }));

  // Login con usuario y contraseña
  $("#form-login")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = $("#login-user").value.trim() || "Carlos Andrés";
    irAExito({ nombre: user, fechaISO: "", login: true });
  });

  // Postulación de aliado
  $("#form-aliado")?.addEventListener("submit", (e) => {
    e.preventDefault();
    localStorage.setItem("ecdlg_rol", "aliado");
    const negocio = $("#al-negocio").value.trim() || "Tu negocio";
    const nombre = $("#al-nombre").value.trim() || "Aliado del Club";
    localStorage.setItem("ecdlg_perfil", JSON.stringify({ nombre, primerNombre: nombre.split(" ")[0], negocio, rol: "aliado" }));
    irAExitoAliado(negocio, nombre);
  });

  // Envío del formulario de registro
  $("#form-registro").addEventListener("submit", (e) => {
    e.preventDefault();
    localStorage.setItem("ecdlg_rol", "miembro");
    const nombre = $("#campo-nombre").value.trim();
    const fechaISO = $("#campo-fecha").value;
    const whatsapp = $("#campo-wa").value.trim();
    irAExito({ nombre, fechaISO, whatsapp, login: false });
  });
});

/* ---------- PANTALLA DE ÉXITO ---------- */
function irAExito({ nombre, fechaISO, whatsapp, login }) {
  // 1) Cálculo SILENCIOSO de numerología — se guarda, no se muestra
  const mision = calcularMision(fechaISO);
  const arquetipo = ARQUETIPOS[mision] || ARQUETIPOS[1];
  const primerNombre = (nombre || "").split(" ")[0] || "Miembro";

  localStorage.setItem("ecdlg_perfil", JSON.stringify({
    nombre, primerNombre, fechaISO, whatsapp: whatsapp || "", mision, arquetipo,
  }));

  // 2) Render de la vista de éxito (sin revelar el número — eso vive en el perfil)
  $("#exito-nombre").textContent = `¡Bienvenido al club, ${primerNombre}!`;
  $("#exito-msg").innerHTML = login
    ? `Sesión iniciada, ${primerNombre}. Tu club te está esperando.`
    : `Tu perfil ha sido creado, ${primerNombre}. Ya eres parte del club. En pocos minutos recibirás un mensaje de bienvenida personalizado en tu WhatsApp.`;

  // Login → ir al perfil; nuevo registro → elegir plan
  const cta = $("#exito-cta");
  if (login) {
    cta.setAttribute("href", "Perfil.html");
    cta.innerHTML = `Ver mi perfil <span class="ar">&rarr;</span>`;
  }

  $(".stepper").style.visibility = "hidden";
  mostrarVista("view-exito");
  if (window.lucide) lucide.createIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- ÉXITO PARA ALIADOS ---------- */
function irAExitoAliado(negocio, nombre) {
  $("#exito-eyebrow").textContent = "Postulación recibida";
  $("#exito-nombre").textContent = `¡Gracias, ${negocio}!`;
  $("#exito-msg").innerHTML = `Recibimos la postulación de <b>${negocio}</b>. Nuestro equipo revisará tu caso en particular y, una vez aprobado, tendrás acceso a tu panel de aliado con las estadísticas de tu negocio.`;
  $("#exito-wa-title").textContent = "Te contactaremos por WhatsApp";
  $("#exito-wa-msg").textContent = "En los próximos días un asesor del Club se comunicará contigo para coordinar los detalles de tu alianza y el beneficio que ofrecerás a los miembros.";
  const cta = $("#exito-cta");
  cta.setAttribute("href", "Perfil.html?rol=aliado");
  cta.innerHTML = `Ver mi panel de aliado <span class="ar">&rarr;</span>`;
  $(".stepper").style.visibility = "hidden";
  mostrarVista("view-exito");
  if (window.lucide) lucide.createIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
