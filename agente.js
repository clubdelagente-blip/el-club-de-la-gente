/* ============================================================
   EL CLUB DE LA GENTE — Módulo 7 · Agente de WhatsApp (lógica)
   Construye la vista previa del chat, los toggles de contenido
   y las preferencias de comunicación. Persiste en localStorage.
   Reutiliza helpers globales de dashboard.js ($, $$, ic, leerPerfil).
   ============================================================ */

(function () {
  const NUM_WA = "573000000028"; // número demo del Club (wa.me)

  /* ---------- contenido que puede enviar el agente ---------- */
  const TOGGLES = [
    { id: "resumen",    icon: "piggy-bank",       name: "Resumen mensual de ahorro",       desc: "El 1 de cada mes, cuánto ahorraste y con qué aliados.", on: true },
    { id: "descuentos", icon: "ticket-percent",   name: "Alertas de descuentos nuevos",     desc: "Cuando un aliado de tus categorías lanza una promo.",  on: true },
    { id: "recomienda", icon: "sparkles",         name: "Recomendaciones para ti",          desc: "Aliados cercanos según lo que más te interesa.",       on: true },
    { id: "social",     icon: "heart-handshake",  name: "Programas sociales y eventos",     desc: "Novedades de las causas que apoya el Club.",           on: false },
    { id: "renueva",    icon: "calendar-clock",   name: "Recordatorio de renovación",       desc: "Un aviso antes de que venza tu membresía.",            on: true },
  ];

  const PREFS_DEFAULT = { toggles: {}, frecuencia: "importante", canal: "wa" };
  TOGGLES.forEach(t => PREFS_DEFAULT.toggles[t.id] = t.on);

  function leerPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem("ecdlg_agente") || "{}");
      return { ...PREFS_DEFAULT, ...p, toggles: { ...PREFS_DEFAULT.toggles, ...(p.toggles || {}) } };
    } catch { return { ...PREFS_DEFAULT }; }
  }
  function guardarPrefs(p) { localStorage.setItem("ecdlg_agente", JSON.stringify(p)); }

  const prefs = leerPrefs();

  /* ---------- conversación de muestra ---------- */
  function construirChat(u) {
    const nombre = u.primerNombre || "Carlos";
    return [
      { day: "Hoy" },
      { in: true, html: `¡Hola, <b>${nombre}</b>! 👋 Soy tu agente de El Club de la Gente. Estoy aquí para ayudarte a sacarle el máximo a tu membresía.`, t: "8:01 a.m." },
      { card: true, lbl: "Tu resumen de mayo", big: "$22.140", sub: "ahorrados en 4 compras", body: "Tu mejor mes hasta ahora 🎉 Patitas Felices fue donde más ahorraste.", t: "8:01 a.m." },
      { in: true, html: `Como te interesa <b>Veterinaria</b>, te aviso: <b>Patitas Felices</b> tiene <b>30%</b> para miembros y está a 4 cuadras de ti.`, t: "8:02 a.m." },
      { quick: "Ver mis beneficios", icon: "qr-code" },
      { out: true, html: "¡Gracias! 🙌 ¿Y para mercado?", t: "8:14 a.m." },
      { in: true, html: `Claro. En <b>Canasta familiar</b>, <b>Mercado del Campo</b> te da <b>12%</b>. Escribe <b>"calcular"</b> y te digo cuánto ahorrarías. 👇`, t: "8:14 a.m." },
      { quick: "Calcular mi descuento", icon: "calculator" },
    ];
  }

  function renderChat(u) {
    const chat = $("#ag-chat");
    if (!chat) return;
    chat.innerHTML = construirChat(u).map(m => {
      if (m.day)   return `<span class="ag-daysep">${m.day}</span>`;
      if (m.quick) return `<div class="ag-quick"><button class="ag-quick__btn">${ic(m.icon)} ${m.quick}</button></div>`;
      if (m.card)  return `
        <div class="ag-card-msg">
          <div class="ag-card-msg__top">
            <div class="ag-card-msg__lbl">${m.lbl}</div>
            <div class="ag-card-msg__big">${m.big}</div>
            <div class="ag-card-msg__sub">${m.sub}</div>
          </div>
          <div class="ag-card-msg__body">${m.body}<span class="t">${m.t}</span></div>
        </div>`;
      const cls = m.out ? "ag-msg--out" : "ag-msg--in";
      const check = m.out ? ` ${ic("check-check")}` : "";
      return `<div class="ag-msg ${cls}">${m.html}<span class="t">${m.t}${check}</span></div>`;
    }).join("");
  }

  /* ---------- toggles de contenido ---------- */
  function renderToggles() {
    const ul = $("#ag-toggles");
    if (!ul) return;
    ul.innerHTML = TOGGLES.map(t => `
      <li class="ag-toggle">
        <span class="ag-toggle__ic">${ic(t.icon)}</span>
        <span class="ag-toggle__body">
          <span class="ag-toggle__name">${t.name}</span>
          <span class="ag-toggle__desc">${t.desc}</span>
        </span>
        <button class="ag-switch ${prefs.toggles[t.id] ? "is-on" : ""}" data-toggle="${t.id}" aria-label="${t.name}"></button>
      </li>`).join("");

    $$("[data-toggle]", ul).forEach(sw => sw.addEventListener("click", () => {
      const id = sw.dataset.toggle;
      prefs.toggles[id] = !prefs.toggles[id];
      sw.classList.toggle("is-on", prefs.toggles[id]);
      guardarPrefs(prefs);
    }));
  }

  /* ---------- segmentos (frecuencia / canal) ---------- */
  function renderSegs() {
    $$(".ag-seg-row[data-seg]").forEach(row => {
      const key = row.dataset.seg;
      $$(".ag-seg-btn", row).forEach(b => {
        b.classList.toggle("is-on", b.dataset.val === prefs[key]);
        b.addEventListener("click", () => {
          prefs[key] = b.dataset.val;
          $$(".ag-seg-btn", row).forEach(o => o.classList.toggle("is-on", o === b));
          guardarPrefs(prefs);
        });
      });
    });
  }

  /* ---------- toast (reutiliza patrón global) ---------- */
  function toast(msg) {
    let el = $("#ag-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ag-toast"; el.className = "toast";
      document.body.appendChild(el);
    }
    el.innerHTML = `<span class="chk">${ic("check-circle-2")}</span> ${msg}`;
    if (window.lucide) lucide.createIcons();
    requestAnimationFrame(() => el.classList.add("is-show"));
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("is-show"), 3200);
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const u = (typeof leerPerfil === "function") ? leerPerfil() : { primerNombre: "Carlos" };
    renderChat(u);
    renderToggles();
    renderSegs();
    if (window.lucide) lucide.createIcons();

    const waMsg = encodeURIComponent("Hola, soy miembro del Club y quiero ver mis beneficios.");
    $("#ag-open-wa")?.addEventListener("click", () => window.open(`https://wa.me/${NUM_WA}?text=${waMsg}`, "_blank"));
    $("#ag-test")?.addEventListener("click", () => toast("Mensaje de prueba enviado a tu WhatsApp"));
    $("#ag-edit-cats")?.addEventListener("click", () => { if (typeof irPanel === "function") irPanel("perfil"); });
  });
})();
