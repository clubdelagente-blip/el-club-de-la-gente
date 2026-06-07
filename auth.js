/* ============================================================
   EL CLUB DE LA GENTE — Módulo 2 · Autenticación con Supabase
   ============================================================ */
import { supabase } from './supabase.js';

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

function calcularMision(fechaISO) {
  if (!fechaISO) return null;
  const digitos = fechaISO.replace(/\D/g, "");
  const sumar = (s) => [...s].reduce((a, d) => a + (+d), 0);
  let n = sumar(digitos);
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = sumar(String(n));
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

/* ---------- HELPERS DE UI ---------- */
function setLoading(btn, loading, texto) {
  btn.disabled = loading;
  btn.textContent = loading ? "Un momento..." : texto;
}
function mostrarError(msg) {
  let el = $("#auth-error");
  if (!el) {
    el = document.createElement("p");
    el.id = "auth-error";
    el.style.cssText = "color:#c0392b;font-size:13px;margin-top:8px;text-align:center;";
    $("#reg-form-wrap")?.appendChild(el);
  }
  el.textContent = msg;
  setTimeout(() => { if (el) el.textContent = ""; }, 5000);
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  if (window.lucide) lucide.createIcons();

  // Detectar callback de Google OAuth (token viene en el hash del URL)
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session) {
      const user = session.user;
      const proveedor = user.app_metadata?.provider;
      const nombre = user.user_metadata?.full_name || user.email || "Miembro";
      const primerNombre = nombre.split(" ")[0];

      localStorage.setItem("ecdlg_perfil", JSON.stringify({
        nombre, primerNombre, rol: "miembro", email: user.email,
      }));

      // Solo manejar el redirect si viene de Google OAuth
      if (proveedor === "google") {
        const { data: perfilExistente } = await supabase
          .from("perfiles")
          .select("id, plan")
          .eq("id", user.id)
          .single();

        if (perfilExistente?.plan) {
          // Ya eligió plan antes → va al perfil
          location.href = "Perfil.html";
        } else {
          // Usuario nuevo o sin plan → va a elegir plan
          try {
            await supabase.from("perfiles").upsert({
              id: user.id,
              nombre,
              whatsapp: "",
              rol: "miembro",
            });
          } catch (_) {}
          location.href = "Planes.html";
        }
      }
    }
  });

  const params = new URLSearchParams(location.search);
  const planElegido = params.get("plan");
  if (planElegido) localStorage.setItem("ecdlg_plan", planElegido);
  const tabInicial = params.get("tab") === "login" ? "login" : "registro";
  setTab(tabInicial);

  // Tabs
  $$(".auth-tab").forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));
  $$("[data-goto]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.goto)));

  // Selección de rol
  $$("[data-role]").forEach(b => b.addEventListener("click", () => elegirRol(b.dataset.role)));
  $("#reg-back")?.addEventListener("click", resetRoles);

  // Google auth
  $$(".btn-google").forEach(b => b.addEventListener("click", async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: "https://clubdelagente-blip.github.io/el-club-de-la-gente/Registro.html"
      }
    });
    if (error) mostrarError("Error al conectar con Google.");
  }));

  // ---------- LOGIN ----------
  $("#form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const email = $("#login-user").value.trim();
    const pass = $("#login-pass").value;
    setLoading(btn, true, "Iniciar sesión →");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(btn, false, "Iniciar sesión →");

    if (error) {
      mostrarError("Usuario o contraseña incorrectos.");
      return;
    }

    const perfil = data.user?.user_metadata || {};
    localStorage.setItem("ecdlg_perfil", JSON.stringify({
      nombre: perfil.nombre || email,
      primerNombre: (perfil.nombre || email).split(" ")[0],
      rol: perfil.rol || "miembro",
    }));
    irAExito({ nombre: perfil.nombre || email, login: true });
  });

  // ---------- REGISTRO MIEMBRO ----------
  $("#form-registro")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const nombre = $("#campo-nombre").value.trim();
    const fechaISO = $("#campo-fecha").value;
    const whatsapp = $("#campo-wa").value.trim();
    const email = whatsapp + "@clubdelagente.app";

    if (!nombre || !whatsapp) { mostrarError("Completa todos los campos."); return; }

    setLoading(btn, true, "Crear mi cuenta →");

    // Generamos password temporal con el número de WhatsApp
    const password = "Club" + whatsapp.replace(/\D/g, "") + "!";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, whatsapp, fecha_nacimiento: fechaISO, rol: "miembro" }
      }
    });

    if (error) {
      setLoading(btn, false, "Crear mi cuenta →");
      mostrarError(error.message === "User already registered"
        ? "Este WhatsApp ya tiene una cuenta. Inicia sesión."
        : "Error al crear la cuenta. Intenta de nuevo.");
      return;
    }

    const mision = calcularMision(fechaISO);
    const arquetipo = ARQUETIPOS[mision] || ARQUETIPOS[1];

    // Guardar en localStorage siempre
    localStorage.setItem("ecdlg_perfil", JSON.stringify({
      nombre, primerNombre: nombre.split(" ")[0], fechaISO, whatsapp, mision, arquetipo
    }));

    // Intentar guardar en Supabase (no bloquea el flujo si falla)
    try {
      if (data.user) {
        await supabase.from("perfiles").upsert({
          id: data.user.id,
          nombre,
          whatsapp,
          fecha_nacimiento: fechaISO || null,
          rol: "miembro",
          plan: localStorage.getItem("ecdlg_plan") || "basica",
          mision: mision || null,
        });
      }
    } catch (_) {}

    setLoading(btn, false, "Crear mi cuenta →");
    location.href = "Planes.html";
  });

  // ---------- REGISTRO ALIADO ----------
  $("#form-aliado")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const negocio = $("#al-negocio").value.trim();
    const categoria = $("#al-cat").value.trim();
    const nombre = $("#al-nombre").value.trim();
    const whatsapp = $("#al-wa").value.trim();

    if (!negocio || !nombre || !whatsapp) { mostrarError("Completa todos los campos."); return; }

    setLoading(btn, true, "Enviar postulación →");

    const { error } = await supabase.from("aliados_postulaciones").insert({
      nombre_negocio: negocio,
      categoria,
      nombre_responsable: nombre,
      whatsapp,
    });

    setLoading(btn, false, "Enviar postulación →");

    if (error) {
      mostrarError("Error al enviar. Intenta de nuevo.");
      return;
    }

    localStorage.setItem("ecdlg_rol", "aliado");
    localStorage.setItem("ecdlg_perfil", JSON.stringify({ nombre, primerNombre: nombre.split(" ")[0], negocio, rol: "aliado" }));
    irAExitoAliado(negocio, nombre);
  });
});

/* ---------- PANTALLA DE ÉXITO ---------- */
function irAExito({ nombre, fechaISO, whatsapp, login }) {
  const mision = calcularMision(fechaISO);
  const arquetipo = ARQUETIPOS[mision] || ARQUETIPOS[1];
  const primerNombre = (nombre || "").split(" ")[0] || "Miembro";

  $("#exito-nombre").textContent = `¡Bienvenido al club, ${primerNombre}!`;
  $("#exito-msg").innerHTML = login
    ? `Sesión iniciada, ${primerNombre}. Tu club te está esperando.`
    : `Tu perfil ha sido creado, ${primerNombre}. Ya eres parte del club. En pocos minutos recibirás un mensaje de bienvenida en tu WhatsApp.`;

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

function irAExitoAliado(negocio, nombre) {
  $("#exito-eyebrow").textContent = "Postulación recibida";
  $("#exito-nombre").textContent = `¡Gracias, ${negocio}!`;
  $("#exito-msg").innerHTML = `Recibimos la postulación de <b>${negocio}</b>. Nuestro equipo revisará tu caso y, una vez aprobado, tendrás acceso a tu panel de aliado.`;
  $("#exito-wa-title").textContent = "Te contactaremos por WhatsApp";
  $("#exito-wa-msg").textContent = "En los próximos días un asesor del Club se comunicará contigo para coordinar los detalles de tu alianza.";
  const cta = $("#exito-cta");
  cta.setAttribute("href", "Perfil.html?rol=aliado");
  cta.innerHTML = `Ver mi panel de aliado <span class="ar">&rarr;</span>`;
  $(".stepper").style.visibility = "hidden";
  mostrarVista("view-exito");
  if (window.lucide) lucide.createIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
