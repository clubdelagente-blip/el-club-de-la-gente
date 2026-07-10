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

  const eyebrow = { miembro: "Crea tu cuenta · Miembro", aliado: "Crea tu cuenta · Aliado", profesional: "Crea tu cuenta · Profesional" };
  const title   = { miembro: "Únete al club.", aliado: "Suma tu negocio.", profesional: "Conecta con tus clientes." };
  $("#reg-eyebrow").textContent = eyebrow[rol] || eyebrow.miembro;
  $("#reg-title").textContent   = title[rol]   || title.miembro;

  $("#form-registro").hidden    = rol !== "miembro";
  $("#form-aliado").hidden      = rol !== "aliado";
  $("#form-profesional").hidden = rol !== "profesional";

  // Google no aplica para aliado / profesional
  const gBtn = $(".btn-google[data-ctx='registro']");
  const dividerEl = gBtn?.nextElementSibling;
  const showGoogle = rol === "miembro";
  if (gBtn) gBtn.style.display = showGoogle ? "" : "none";
  if (dividerEl?.classList.contains("auth-divider")) dividerEl.style.display = showGoogle ? "" : "none";

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

  supabase.auth.onAuthStateChange(async (event, session) => {
    // Recuperación de contraseña — llega desde el link del email
    if (event === "PASSWORD_RECOVERY") {
      mostrarVista("view-recovery");
      $(".stepper").style.visibility = "hidden";
      return;
    }

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
        try {
          // Ver si ya tenía perfil antes (usuario existente)
          const { data: perfilExistente } = await supabase
            .from("perfiles").select("id, plan").eq("id", user.id).single();

          if (perfilExistente) {
            // Ya es miembro → ir al perfil
            const rol = perfilExistente.rol || "miembro";
            localStorage.setItem("ecdlg_perfil", JSON.stringify({
              nombre, primerNombre, rol, email: user.email,
            }));
            location.href = "Perfil.html";
          } else {
            // Usuario nuevo → crear perfil y mostrar dashboard bloqueado
            await supabase.from("perfiles").insert({
              id: user.id, nombre, whatsapp: "", rol: "miembro", plan: "sin_plan",
            });
            location.href = "Perfil.html";
          }
        } catch (_) {
          location.href = "Perfil.html";
        }
      }
    }
  });

  const params = new URLSearchParams(location.search);
  const planElegido = params.get("plan");
  if (planElegido) localStorage.setItem("ecdlg_plan", planElegido);
  const refId = params.get("ref");
  if (refId) localStorage.setItem("ecdlg_ref", refId);
  const tabInicial = params.get("tab") === "login" ? "login" : "registro";
  setTab(tabInicial);

  // Ocultar tabs según el modo de entrada
  const modo = params.get("modo");
  if (modo === "registro" || modo === "login") {
    const tabs = $("#auth-tabs");
    if (tabs) tabs.style.display = "none";
  }
  if (modo === "login") {
    // Ocultar "¿No tienes cuenta? Regístrate gratis"
    const switchLink = $("#view-login .auth-switch");
    if (switchLink) switchLink.style.display = "none";
  }

  // Tabs
  $$(".auth-tab").forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));
  $$("[data-goto]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.goto)));

  // Selección de rol
  $$("[data-role]").forEach(b => b.addEventListener("click", () => elegirRol(b.dataset.role)));
  $("#reg-back")?.addEventListener("click", resetRoles);

  // Categorías aliado — selección múltiple
  $$(".cat-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      const esOtra = btn.id === "cat-otra-btn";
      btn.classList.toggle("is-on");
      const otraInput = $("#al-cat-otra");
      const alguienEsOtra = $("#cat-otra-btn")?.classList.contains("is-on");
      if (otraInput) otraInput.style.display = alguienEsOtra ? "block" : "none";
      const seleccionadas = $$(".cat-opt.is-on:not(#cat-otra-btn)").map(b => b.dataset.cat);
      if (alguienEsOtra && otraInput?.value.trim()) seleccionadas.push(otraInput.value.trim());
      const hidden = $("#al-cat");
      if (hidden) hidden.value = seleccionadas.join(", ");
    });
  });
  $("#al-cat-otra")?.addEventListener("input", (e) => {
    const seleccionadas = $$(".cat-opt.is-on:not(#cat-otra-btn)").map(b => b.dataset.cat);
    if (e.target.value.trim()) seleccionadas.push(e.target.value.trim());
    const hidden = $("#al-cat");
    if (hidden) hidden.value = seleccionadas.join(", ");
  });

  // Área profesional — mostrar campo libre si elige "Otra"
  $("#prof-area")?.addEventListener("change", (e) => {
    const otraInput = $("#prof-area-otra");
    if (otraInput) otraInput.style.display = e.target.value === "Otra" ? "block" : "none";
  });

  // Google auth
  $$(".btn-google").forEach(b => b.addEventListener("click", async () => {
    const emailHint = $("#login-user")?.value.trim();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: "https://clubdelagente-blip.github.io/el-club-de-la-gente/Registro.html",
        queryParams: emailHint ? { login_hint: emailHint } : {},
      }
    });
    if (error) mostrarError("Error al conectar con Google.");
  }));

  // ---------- LOGIN (2 pasos: teléfono → OTP) ----------
  let _loginPhone = "";

  function mostrarErrorLogin(msg) {
    const el = $("#login-error");
    if (!el) return;
    el.textContent = msg;
    setTimeout(() => { if (el) el.textContent = ""; }, 6000);
  }

  // Paso 1: número WhatsApp
  $("#form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const raw = $("#login-user").value.trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 7) { mostrarErrorLogin("Ingresa un número de WhatsApp válido."); return; }
    _loginPhone = digits;

    setLoading(btn, true, "Continuar");
    let sendData;
    try {
      const res = await fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: digits }),
      });
      sendData = await res.json();
    } catch (_) {
      setLoading(btn, false, "Continuar");
      mostrarErrorLogin("Error de conexión. Intenta de nuevo.");
      return;
    }
    setLoading(btn, false, "Continuar");

    if (sendData?.error) {
      mostrarErrorLogin(sendData.error);
      return;
    }

    // Mostrar paso 2
    const last4  = digits.slice(-4);
    const masked = "•".repeat(Math.max(0, digits.length - 4)) + last4;
    $("#login-otp-msg").textContent = `Enviamos un código al ${masked}. Ingrésalo aquí.`;
    $("#login-step-1").style.display = "none";
    $("#login-step-2").style.display = "";
    const gDiv = $("#login-google-divider"), gBtn = $("#login-google-btn");
    if (gDiv) gDiv.style.display = "none";
    if (gBtn) gBtn.style.display = "none";
    setTimeout(() => $("#login-otp")?.focus(), 50);
  });

  // Paso 2: verificar OTP
  $("#btn-verify-otp")?.addEventListener("click", async () => {
    const btn = $("#btn-verify-otp");
    const code = ($("#login-otp")?.value || "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) { mostrarErrorLogin("El código debe tener 6 dígitos."); return; }

    setLoading(btn, true, "Ingresar al club →");
    let verifyData;
    try {
      const res = await fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/auth-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: _loginPhone, code }),
      });
      verifyData = await res.json();
    } catch (_) {
      setLoading(btn, false, "Ingresar al club →");
      mostrarErrorLogin("Error de conexión. Intenta de nuevo.");
      return;
    }
    setLoading(btn, false, "Ingresar al club →");

    if (verifyData?.error) {
      mostrarErrorLogin(verifyData.error);
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: verifyData.hashed_token,
      type: "email",
    });

    if (error || !data?.user) {
      mostrarErrorLogin("Error al iniciar sesión. Intenta de nuevo.");
      return;
    }

    const { data: perfil } = await supabase
      .from("perfiles").select("nombre, rol").eq("id", data.user.id).maybeSingle();
    localStorage.setItem("ecdlg_perfil", JSON.stringify({
      nombre: perfil?.nombre || data.user.user_metadata?.nombre || "Miembro",
      primerNombre: (perfil?.nombre || data.user.user_metadata?.nombre || "Miembro").split(" ")[0],
      rol: perfil?.rol || "miembro",
    }));
    location.href = "Perfil.html";
  });

  // Volver al paso 1
  $("#btn-back-login")?.addEventListener("click", () => {
    _loginPhone = "";
    $("#login-step-1").style.display = "";
    $("#login-step-2").style.display = "none";
    const gDiv = $("#login-google-divider"), gBtn = $("#login-google-btn");
    if (gDiv) gDiv.style.display = "";
    if (gBtn) gBtn.style.display = "";
    if ($("#login-otp")) $("#login-otp").value = "";
  });

  // Reenviar código
  $("#btn-resend-otp")?.addEventListener("click", async () => {
    const btn = $("#btn-resend-otp");
    btn.disabled = true;
    btn.textContent = "Enviando…";
    await fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/auth-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", phone: _loginPhone }),
    });
    btn.textContent = "Código reenviado ✓";
    setTimeout(() => { btn.disabled = false; btn.textContent = "Reenviar código"; }, 30000);
  });

  // ---------- REGISTRO MIEMBRO ----------
  $("#form-registro")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const nombre = $("#campo-nombre").value.trim();
    const fechaISO = $("#campo-fecha").value;
    const whatsapp = $("#campo-wa").value.trim();
    const waDigits = whatsapp.replace(/\D/g, "");
    const email = waDigits + "@clubdelagente.app";   // siempre solo dígitos

    if (!nombre || !whatsapp) { mostrarError("Completa todos los campos."); return; }

    setLoading(btn, true, "Crear mi cuenta →");

    const rnd = new Uint8Array(32);
    crypto.getRandomValues(rnd);
    const password = Array.from(rnd).map(b => b.toString(16).padStart(2, "0")).join("");

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
        const refPor = localStorage.getItem("ecdlg_ref") || null;
        await supabase.from("perfiles").upsert({
          id: data.user.id,
          nombre,
          whatsapp,
          fecha_nacimiento: fechaISO || null,
          rol: "miembro",
          plan: "sin_plan",
          mision: mision || null,
          referido_por: refPor,
        });
        localStorage.removeItem("ecdlg_ref");
      }
    } catch (_) {}

    // Mensaje de bienvenida por WhatsApp (fire and forget)
    if (whatsapp) {
      const primerNombre = nombre.split(" ")[0];
      const msgBienvenida = `¡Hola ${primerNombre}! 🌿 Bienvenido/a a El Club de la Gente.\n\nYa eres parte de una comunidad que ahorra, aprende y apoya a Fusagasugá. 🎉\n\nDesde aquí recibirás confirmaciones de tus descuentos y novedades del Club.\n\nEl Club de la Gente`;
      supabase.functions.invoke("whatsapp-send", {
        body: { to: whatsapp, body: msgBienvenida }
      }).catch(() => {});
    }

    setLoading(btn, false, "Crear mi cuenta →");
    location.href = "Perfil.html";
  });

  // ---------- OLVIDÉ MI CONTRASEÑA ----------
  // Solo aplica para profesionales/aliados (email+contraseña). Los miembros
  // ingresan con código OTP enviado a su WhatsApp — no tienen contraseña que olvidar.
  $("#login-forgot-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarVista("view-forgot");
    $(".stepper").style.visibility = "hidden";
  });
  $("#forgot-back")?.addEventListener("click", () => setTab("login"));

  $("#form-forgot")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const email = $("#forgot-email").value.trim();
    if (!email) return;
    setLoading(btn, true, "Enviar enlace →");
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://clubdelagente-blip.github.io/el-club-de-la-gente/Registro.html",
    });
    setLoading(btn, false, "Enviar enlace →");
    // Mostramos éxito siempre (Supabase no revela si el email existe o no)
    btn.style.display = "none";
    $("#forgot-ok").style.display = "block";
  });

  // ---------- NUEVA CONTRASEÑA (desde el link del email) ----------
  $("#form-recovery")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const pass  = $("#recovery-pass").value;
    const pass2 = $("#recovery-pass2").value;
    if (pass.length < 8) { mostrarError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (pass !== pass2)  { mostrarError("Las contraseñas no coinciden."); return; }
    setLoading(btn, true, "Guardar contraseña →");
    const { error } = await supabase.auth.updateUser({ password: pass });
    setLoading(btn, false, "Guardar contraseña →");
    if (error) { mostrarError("Error al guardar: " + error.message); return; }
    location.href = "Perfil.html";
  });

  // ---------- REGISTRO PROFESIONAL ----------
  $("#form-profesional")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const nombre   = $("#prof-nombre").value.trim();
    const areaBase = $("#prof-area").value;
    const area     = areaBase === "Otra" ? $("#prof-area-otra").value.trim() : areaBase;
    const desc     = $("#prof-desc").value.trim();
    const wa       = $("#prof-wa").value.trim();
    const email    = $("#prof-email").value.trim();
    const pass     = $("#prof-pass").value;

    if (!nombre || !area || !wa || !email || !pass) {
      mostrarError("Completa todos los campos obligatorios."); return;
    }
    if (pass.length < 8) { mostrarError("La contraseña debe tener al menos 8 caracteres."); return; }

    setLoading(btn, true, "Registrarme como profesional →");

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { nombre, rol: "profesional" } }
    });

    if (error) {
      setLoading(btn, false, "Registrarme como profesional →");
      mostrarError(error.message === "User already registered"
        ? "Este correo ya tiene cuenta. Inicia sesión."
        : "Error al crear la cuenta. Intenta de nuevo.");
      return;
    }

    try {
      if (data.user) {
        await supabase.from("profesionales").insert({
          user_id: data.user.id,
          nombre,
          area,
          descripcion: desc,
          whatsapp: wa,
          activo: false,
        });
        await supabase.from("perfiles").upsert({
          id: data.user.id,
          nombre,
          whatsapp: wa,
          rol: "profesional",
        });
      }
    } catch (_) {}

    setLoading(btn, false, "Registrarme como profesional →");
    localStorage.setItem("ecdlg_perfil", JSON.stringify({ nombre, primerNombre: nombre.split(" ")[0], rol: "profesional" }));
    irAExitoProfesional(nombre);
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

function irAExitoProfesional(nombre) {
  const primerNombre = (nombre || "").split(" ")[0] || "Profesional";
  $("#exito-eyebrow").textContent = "Registro recibido";
  $("#exito-nombre").textContent = `¡Gracias, ${primerNombre}!`;
  $("#exito-msg").innerHTML = `Tu cuenta ha sido creada. En cuanto nuestro equipo revise y apruebe tu perfil, aparecerás en el directorio de profesionales del Club.`;
  $("#exito-wa-title").textContent = "Mientras tanto, prepara tu perfil";
  $("#exito-wa-msg").textContent = "Puedes acceder ya a tu panel de profesional e ingresar tu foto, descripción y datos de contacto antes de que sea publicado.";
  const cta = $("#exito-cta");
  cta.setAttribute("href", "Perfil.html");
  cta.innerHTML = `Ir a mi consultorio <span class="ar">&rarr;</span>`;
  $(".stepper").style.visibility = "hidden";
  mostrarVista("view-exito");
  if (window.lucide) lucide.createIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
