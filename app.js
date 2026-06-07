/* ============================================================
   EL CLUB DE LA GENTE — Módulo 1
   Datos + interacciones
   ============================================================ */

/* ---------- DATOS: ALIADOS COMERCIALES ---------- */
const ALIADOS = [
  {
    nombre: "Sonrisa Sana",
    categoria: "Odontología",
    icon: "smile",
    pct: "25%",
    foto: "Fachada / consultorio de Sonrisa Sana",
    desc: "Odontología integral y estética dental en el centro de Fusagasugá. Limpieza, ortodoncia y blanqueamiento con tarifas preferenciales para miembros del Club.",
    descuentos: [
      { pct: "25%", nombre: "Limpieza y profilaxis", desc: "Sobre el valor regular de la consulta" },
      { pct: "15%", nombre: "Ortodoncia y brackets", desc: "Aplica al plan completo de tratamiento" },
    ],
  },
  {
    nombre: "Bienestar Integral Spa",
    categoria: "Bienestar y salud",
    icon: "heart-pulse",
    pct: "20%",
    foto: "Sala de masajes de Bienestar Integral Spa",
    desc: "Centro de relajación y terapias corporales. Masajes, faciales y rutinas de bienestar pensadas para liberar el estrés de la semana.",
    descuentos: [
      { pct: "20%", nombre: "Masaje relajante 60 min", desc: "De lunes a jueves" },
      { pct: "10%", nombre: "Paquetes de 4 sesiones", desc: "Acumulable con otras promociones" },
    ],
  },
  {
    nombre: "Fusa Aventura Tours",
    categoria: "Turismo",
    icon: "mountain-snow",
    pct: "15%",
    foto: "Plan de aventura al aire libre en Sumapaz",
    desc: "Experiencias de naturaleza y aventura en la región del Sumapaz: senderismo, cascadas y planes de fin de semana para toda la familia.",
    descuentos: [
      { pct: "15%", nombre: "Planes de día completo", desc: "Por persona, mínimo 2 cupos" },
      { pct: "12%", nombre: "Tours familiares", desc: "Grupos de 4 o más personas" },
    ],
  },
  {
    nombre: "Patitas Felices",
    categoria: "Veterinaria",
    icon: "paw-print",
    pct: "30%",
    foto: "Consultorio veterinario de Patitas Felices",
    desc: "Veterinaria y tienda de mascotas. Consulta general, vacunación, baño y guardería para que tu compañero esté siempre sano.",
    descuentos: [
      { pct: "30%", nombre: "Consulta + vacunación", desc: "Primera visita del mes" },
      { pct: "20%", nombre: "Baño y peluquería", desc: "Todos los días" },
    ],
  },
  {
    nombre: "Mercado del Campo",
    categoria: "Canasta familiar",
    icon: "shopping-basket",
    pct: "12%",
    foto: "Puesto de frutas y verduras de Mercado del Campo",
    desc: "Fruver y mercado campesino con producto fresco de la región. La canasta familiar de la semana a precio justo.",
    descuentos: [
      { pct: "12%", nombre: "Mercado superior a $80.000", desc: "Pago en efectivo o Nequi" },
      { pct: "8%", nombre: "Frutas y verduras", desc: "Todos los días" },
    ],
  },
  {
    nombre: "Estilo Propio",
    categoria: "Ropa personalizada",
    icon: "shirt",
    pct: "20%",
    foto: "Taller de estampado de Estilo Propio",
    desc: "Ropa y estampados personalizados. Camisetas, uniformes y detalles para tu marca o tu equipo, hechos en Fusagasugá.",
    descuentos: [
      { pct: "20%", nombre: "Estampado personalizado", desc: "Desde 1 prenda" },
      { pct: "15%", nombre: "Pedidos por mayor", desc: "Más de 10 unidades" },
    ],
  },
  {
    nombre: "Heladería La Sumapaz",
    categoria: "Heladería",
    icon: "ice-cream",
    pct: "2x1",
    foto: "Vitrina de helados de La Sumapaz",
    desc: "Heladería artesanal con sabores de la región. El plan perfecto para la tarde, ahora con beneficios para miembros.",
    descuentos: [
      { pct: "2x1", nombre: "Conos artesanales", desc: "Martes y miércoles" },
      { pct: "15%", nombre: "Malteadas y postres", desc: "Todos los días" },
    ],
  },
  {
    nombre: "El Buen Sabor",
    categoria: "Comida rápida",
    icon: "sandwich",
    pct: "25%",
    foto: "Mostrador de El Buen Sabor",
    desc: "Hamburguesas, perros y comida rápida casera. Porciones generosas y precios de barrio para todos los miembros.",
    descuentos: [
      { pct: "25%", nombre: "Combo del día", desc: "De domingo a jueves" },
      { pct: "10%", nombre: "Pedidos a domicilio", desc: "Dentro del casco urbano" },
    ],
  },
  {
    nombre: "Barbería Don Carlos",
    categoria: "Barbería",
    icon: "scissors",
    pct: "30%",
    foto: "Silla y espejo de Barbería Don Carlos",
    desc: "Cortes clásicos y modernos, arreglo de barba y cuidado personal. Tradición de barrio con estilo.",
    descuentos: [
      { pct: "30%", nombre: "Corte + barba", desc: "De lunes a miércoles" },
      { pct: "20%", nombre: "Corte clásico", desc: "Todos los días" },
    ],
  },
];

/* ---------- DATOS: PROGRAMAS SOCIALES ---------- */
const PROGRAMAS = [
  {
    nombre: "Patas que Rescatan",
    icon: "paw-print",
    descBreve: "Rescate, atención y adopción de animales en condición de calle en Fusagasugá y la región del Sumapaz.",
    cifras: [
      { num: "340", lbl: "Animales rescatados" },
      { num: "85", lbl: "Familias adoptantes" },
    ],
    descCompleta: "Con cada membresía financiamos jornadas de rescate, esterilización y adopción responsable. El programa conecta refugios locales con familias que quieren darle un hogar a un animal y cubre atención veterinaria de urgencia.",
    impacto: [
      { num: "340", lbl: "Animales rescatados" },
      { num: "85", lbl: "Familias adoptantes" },
      { num: "18", lbl: "Jornadas realizadas" },
    ],
    fundaciones: ["Fundación Huellas Fusa", "Refugio Sumapaz", "Red de Hogares de Paso"],
    evento: { nombre: "Gran jornada de adopción", fecha: "14 de junio de 2026", lugar: "Parque Principal, Fusagasugá" },
  },
  {
    nombre: "Mesa Compartida",
    icon: "utensils-crossed",
    descBreve: "Entrega de mercados y apoyo alimentario a familias vulnerables de la región.",
    cifras: [
      { num: "1.200", lbl: "Mercados entregados" },
      { num: "300", lbl: "Familias apoyadas" },
    ],
    descCompleta: "Un porcentaje de cada membresía se transforma en mercados para familias que más lo necesitan. Trabajamos con el banco de alimentos local para llegar a las veredas y barrios con mayor necesidad.",
    impacto: [
      { num: "1.200", lbl: "Mercados entregados" },
      { num: "300", lbl: "Familias apoyadas" },
      { num: "24", lbl: "Entregas en el año" },
    ],
    fundaciones: ["Banco de Alimentos Fusa", "Parroquia Nuestra Señora", "Juntas de Acción Comunal"],
    evento: { nombre: "Entrega de mercados de mitad de año", fecha: "28 de junio de 2026", lugar: "Salón Comunal Barrio Emilio Sierra" },
  },
  {
    nombre: "Aprende y Crece",
    icon: "graduation-cap",
    descBreve: "Talleres gratuitos de educación financiera y emprendimiento para miembros y comunidad.",
    cifras: [
      { num: "28", lbl: "Talleres dictados" },
      { num: "540", lbl: "Personas formadas" },
    ],
    descCompleta: "Creemos que ahorrar también es aprender. Ofrecemos talleres de finanzas personales, ahorro y emprendimiento dictados por aliados profesionales del Club, abiertos a toda la comunidad.",
    impacto: [
      { num: "28", lbl: "Talleres dictados" },
      { num: "540", lbl: "Personas formadas" },
      { num: "12", lbl: "Aliados docentes" },
    ],
    fundaciones: ["Cámara de Comercio Fusagasugá", "SENA Regional", "Aliados profesionales del Club"],
    evento: { nombre: "Taller: cómo organizar tus finanzas", fecha: "21 de junio de 2026", lugar: "Biblioteca Municipal" },
  },
  {
    nombre: "Manos a la Obra",
    icon: "hammer",
    descBreve: "Mejoramiento de vivienda y espacios comunitarios con voluntarios del Club.",
    cifras: [
      { num: "12", lbl: "Hogares mejorados" },
      { num: "60", lbl: "Voluntarios activos" },
    ],
    descCompleta: "Jornadas de pintura, arreglo y adecuación de hogares y espacios comunes para familias de escasos recursos. La fuerza del Club puesta al servicio de quienes más lo necesitan.",
    impacto: [
      { num: "12", lbl: "Hogares mejorados" },
      { num: "60", lbl: "Voluntarios activos" },
      { num: "6", lbl: "Jornadas comunitarias" },
    ],
    fundaciones: ["Techo Colombia", "Voluntariado El Club de la Gente", "Alcaldía de Fusagasugá"],
    evento: { nombre: "Jornada de pintura comunitaria", fecha: "5 de julio de 2026", lugar: "Vereda La Aguadita" },
  },
];

/* ---------- DATOS: PROFESIONALES ---------- */
const PROFESIONALES = [
  {
    area: "Asesoría jurídica",
    icon: "scale",
    profesional: "Dra. Marcela Téllez",
    titulo: "Abogada · Derecho civil y de familia",
    desc: "Orientación legal para miembros del Club: contratos, arriendos, derecho de familia y temas laborales. Primera consulta sin costo para miembros.",
    servicios: [
      { nombre: "Consulta inicial orientadora", desc: "Revisión de tu caso y ruta a seguir" },
      { nombre: "Revisión de contratos y documentos", desc: "Arriendos, compraventas y acuerdos" },
      { nombre: "Acompañamiento en derecho de familia", desc: "Cuotas, custodias y conciliaciones" },
    ],
  },
  {
    area: "Asesoría psicológica",
    icon: "brain",
    profesional: "Ps. Daniela Romero",
    titulo: "Psicóloga · Bienestar emocional",
    desc: "Acompañamiento psicológico individual y familiar. Manejo de ansiedad, estrés y relaciones, con tarifas preferenciales para miembros del Club.",
    servicios: [
      { nombre: "Primera sesión de valoración", desc: "Conocemos tu situación y objetivos" },
      { nombre: "Terapia individual", desc: "Ansiedad, estrés y crecimiento personal" },
      { nombre: "Orientación familiar y de pareja", desc: "Comunicación y resolución de conflictos" },
    ],
  },
  {
    area: "Asesoría contable",
    icon: "calculator",
    profesional: "C.P. Andrés Linares",
    titulo: "Contador público · Finanzas y tributaria",
    desc: "Apoyo contable y tributario para personas y pequeños negocios: declaración de renta, organización de finanzas y formalización de tu emprendimiento.",
    servicios: [
      { nombre: "Declaración de renta", desc: "Te ayudamos a presentarla a tiempo" },
      { nombre: "Organización de finanzas del negocio", desc: "Ingresos, gastos y proyección" },
      { nombre: "Formalización y facturación", desc: "Cámara de comercio y régimen" },
    ],
  },
];

/* ---------- HELPERS ---------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const ic = (name, cls = "") => `<i data-lucide="${name}" class="${cls}"></i>`;

/* ---------- COUNT-UP ---------- */
const nf = new Intl.NumberFormat("es-CO");
function toNum(str) { return parseInt(String(str).replace(/\D/g, ""), 10) || 0; }
function animateCount(el) {
  if (el.dataset.done) return;
  el.dataset.done = "1";
  const target = toNum(el.dataset.count);
  const dur = 1300, t0 = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);
  function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = nf.format(Math.round(target * ease(p)));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- RENDER ALIADOS (destacado + grilla) ---------- */
function renderAliados() {
  const f = ALIADOS[0];
  $("#aliado-feat").innerHTML = `
    <article class="aliado-feat" data-aliado="0" tabindex="0">
      <div class="aliado-feat__foto">
        <span class="fic">${ic(f.icon)}</span>
        <span class="ftxt">FOTO · ${f.foto}</span>
      </div>
      <div class="aliado-feat__body">
        <span class="aliado-feat__cat">Aliado destacado · ${f.categoria}</span>
        <h3 class="aliado-feat__nombre">${f.nombre}</h3>
        <p class="aliado-feat__desc">${f.desc}</p>
        <div class="aliado-feat__pct-row">
          <div class="aliado-feat__pct">${f.pct}<small>de descuento</small></div>
          <span class="btn btn--secundario">Ver establecimiento &rarr;</span>
        </div>
      </div>
    </article>`;

  $("#aliados-grid").innerHTML = ALIADOS.slice(1).map((a, k) => {
    const i = k + 1;
    return `
    <article class="aliado" data-aliado="${i}" tabindex="0">
      <div class="aliado__top">
        <span class="aliado__ic">${ic(a.icon)}</span>
        <div>
          <div class="aliado__nombre">${a.nombre}</div>
          <div class="aliado__cat">${a.categoria}</div>
        </div>
      </div>
      <div class="aliado__pct-row">
        <span class="aliado__pct">${a.pct}</span>
        <span class="aliado__pct-lbl">de descuento<br>para miembros</span>
      </div>
      <span class="aliado__ver">Ver establecimiento &rarr;</span>
    </article>`;
  }).join("");
}

/* ---------- RENDER PROFESIONALES ---------- */
function renderProfesionales() {
  const cont = $("#profesionales-grid");
  if (!cont) return;
  cont.innerHTML = PROFESIONALES.map((p, i) => `
    <article class="profe" data-profesional="${i}" tabindex="0">
      <span class="profe__ic">${ic(p.icon)}</span>
      <div class="profe__body">
        <span class="profe__area">${p.area}</span>
        <h3 class="profe__nombre">${p.profesional}</h3>
        <p class="profe__titulo">${p.titulo}</p>
        <p class="profe__desc">${p.desc}</p>
      </div>
      <span class="profe__ver">Ver y solicitar asesoría <i data-lucide="arrow-right"></i></span>
    </article>`).join("");
}

/* ---------- RENDER PROGRAMAS ---------- */
function renderProgramas() {
  const cont = $("#programas-grid");
  cont.innerHTML = PROGRAMAS.map((p, i) => `
    <article class="programa">
      <div class="programa__ic">${ic(p.icon)}</div>
      <h3 class="programa__nombre">${p.nombre}</h3>
      <p class="programa__desc">${p.descBreve}</p>
      <div class="programa__cifras">
        ${p.cifras.map(c => `
          <div class="cifra">
            <div class="cifra__num" data-count="${c.num}">0</div>
            <div class="cifra__lbl">${c.lbl}</div>
          </div>`).join("")}
      </div>
      <a class="programa__link" data-programa="${i}">Ver más + postularse &rarr;</a>
    </article>
  `).join("");
}

/* ---------- SHEET ---------- */
const overlay = $("#sheet-overlay");
const sheet = $("#sheet");
const sheetInner = $("#sheet-inner");

function openSheet(html) {
  sheetInner.innerHTML = html;
  overlay.classList.add("is-open");
  sheet.classList.add("is-open");
  document.body.style.overflow = "hidden";
  if (window.lucide) lucide.createIcons();
  $("#sheet-scroll").scrollTop = 0;
  $$(".impacto__num[data-count]", sheetInner).forEach(animateCount);
}
function closeSheet() {
  overlay.classList.remove("is-open");
  sheet.classList.remove("is-open");
  document.body.style.overflow = "";
}

/* Sheet de aliado (Sección D / 5.3) */
function sheetAliado(i) {
  const a = ALIADOS[i];
  return `
    <div class="sheet__cat">${a.categoria}</div>
    <h2 class="sheet__nombre">${a.nombre}</h2>
    <div class="foto-ph">
      <span class="foto-ph__ic">${ic(a.icon)}</span>
      <span class="foto-ph__txt">FOTO · ${a.foto}</span>
    </div>
    <p class="sheet__desc">${a.desc}</p>
    <div class="sheet__sub">Descuentos disponibles</div>
    ${a.descuentos.map((d, di) => `
      <div class="descuento">
        <div class="descuento__pct">${d.pct}</div>
        <div class="descuento__body">
          <h4>${d.nombre}</h4>
          <p>${d.desc}</p>
        </div>
        <button class="btn btn--ghost-verde" data-aplicar="${di}">Aplicar</button>
      </div>
    `).join("")}
  `;
}

/* Sheet de programa (Sección E) */
function sheetPrograma(i) {
  const p = PROGRAMAS[i];
  return `
    <div class="sheet__cat">Programa social</div>
    <h2 class="sheet__nombre">${p.nombre}</h2>
    <p class="sheet__desc" style="margin-top:22px">${p.descCompleta}</p>
    <div class="sheet__sub">Impacto social</div>
    <div class="impacto">
      ${p.impacto.map(c => `
        <div class="impacto__cel">
          <div class="impacto__num" data-count="${c.num}">0</div>
          <div class="impacto__lbl">${c.lbl}</div>
        </div>`).join("")}
    </div>
    <div class="sheet__sub">Fundaciones y organizaciones apoyadas</div>
    <ul class="fundaciones">
      ${p.fundaciones.map(f => `<li><span class="dot"></span>${f}</li>`).join("")}
    </ul>
    <div class="evento">
      <div class="evento__lbl">Próximo evento</div>
      <div class="evento__nombre">${p.evento.nombre}</div>
      <div class="evento__meta">${p.evento.fecha} · ${p.evento.lugar}</div>
    </div>
    <div class="sheet__sub">Quiero ser voluntario</div>
    <form class="form" data-voluntario>
      <div class="campo">
        <label>Nombre completo</label>
        <input type="text" required placeholder="Tu nombre y apellido">
      </div>
      <div class="campo">
        <label>WhatsApp</label>
        <input type="tel" required placeholder="300 000 0000">
      </div>
      <div class="campo">
        <label>Motivo de participación</label>
        <textarea required placeholder="Cuéntanos por qué te gustaría ser voluntario"></textarea>
      </div>
      <button type="submit" class="btn btn--primario btn--bloque">Quiero ser voluntario &rarr;</button>
    </form>
  `;
}

/* Sheet de profesional (Sección D2) */
function sheetProfesional(i) {
  const p = PROFESIONALES[i];
  return `
    <div class="sheet__cat">${p.area}</div>
    <h2 class="sheet__nombre">${p.profesional}</h2>
    <p class="sheet__profe-titulo">${p.titulo}</p>
    <p class="sheet__desc" style="margin-top:18px">${p.desc}</p>
    <div class="sheet__sub">En qué te puede ayudar</div>
    ${p.servicios.map(s => `
      <div class="descuento">
        <div class="descuento__ic">${ic(p.icon)}</div>
        <div class="descuento__body">
          <h4>${s.nombre}</h4>
          <p>${s.desc}</p>
        </div>
      </div>
    `).join("")}
    <div class="sheet__sub">Solicitar asesoría</div>
    <form class="form" data-asesoria>
      <div class="campo">
        <label>Nombre completo</label>
        <input type="text" required placeholder="Tu nombre y apellido">
      </div>
      <div class="campo">
        <label>WhatsApp</label>
        <input type="tel" required placeholder="300 000 0000">
      </div>
      <div class="campo">
        <label>Cuéntanos brevemente tu caso</label>
        <textarea required placeholder="Describe en qué necesitas ayuda para conectarte con ${p.profesional.split(" ").slice(0,2).join(" ")}"></textarea>
      </div>
      <button type="submit" class="btn btn--primario btn--bloque">Solicitar mi cita &rarr;</button>
      <p class="sheet__nota">Un asesor del Club te contactará por WhatsApp para coordinar tu cita.</p>
    </form>
  `;
}

/* Sheet — Postulación “Quiero ser aliado” */
function sheetAliadoForm() {
  return `
    <div class="sheet__cat">Aliados comerciales</div>
    <h2 class="sheet__nombre">Quiero ser aliado</h2>
    <p class="sheet__desc" style="margin-top:18px">Suma tu negocio a El Club de la Gente y llégales a miles de miembros en Fusagasúgá. Cuéntanos sobre tu negocio y revisamos tu caso en particular.</p>
    <div class="sheet__sub">Datos de tu negocio</div>
    <form class="form" data-aliado-postular>
      <div class="campo">
        <label>Nombre del negocio</label>
        <input type="text" required placeholder="Ej: Café del Parque">
      </div>
      <div class="campo">
        <label>Categoría o tipo de negocio</label>
        <div class="cat-grid">
          <button type="button" class="cat-opt" data-cat="Restaurante / Cafetería">Restaurante / Cafetería</button>
          <button type="button" class="cat-opt" data-cat="Salud y bienestar">Salud y bienestar</button>
          <button type="button" class="cat-opt" data-cat="Belleza y estética">Belleza y estética</button>
          <button type="button" class="cat-opt" data-cat="Barbería">Barbería</button>
          <button type="button" class="cat-opt" data-cat="Odontología">Odontología</button>
          <button type="button" class="cat-opt" data-cat="Veterinaria">Veterinaria</button>
          <button type="button" class="cat-opt" data-cat="Ropa y accesorios">Ropa y accesorios</button>
          <button type="button" class="cat-opt" data-cat="Supermercado / Tienda">Supermercado / Tienda</button>
          <button type="button" class="cat-opt" data-cat="Educación">Educación</button>
          <button type="button" class="cat-opt" data-cat="Deporte y gym">Deporte y gym</button>
          <button type="button" class="cat-opt" data-cat="Tecnología">Tecnología</button>
          <button type="button" class="cat-opt cat-opt--otra" data-cat="Otra">Otra</button>
        </div>
        <input type="text" class="cat-otra-input" placeholder="Describe la categoría de tu negocio" style="display:none;margin-top:10px">
        <input type="hidden" class="cat-hidden">
      </div>
      <div class="campo">
        <label>Nombre del responsable</label>
        <input type="text" required placeholder="Tu nombre y apellido">
      </div>
      <div class="campo">
        <label>WhatsApp de contacto</label>
        <input type="tel" required placeholder="300 000 0000">
      </div>
      <div class="campo">
        <label>Cuéntanos sobre tu negocio y el beneficio que ofrecerías</label>
        <textarea required placeholder="Qué vendes, dónde estás y qué descuento te gustaría dar a los miembros"></textarea>
      </div>
      <button type="submit" class="btn btn--primario btn--bloque">Enviar postulación &rarr;</button>
      <p class="sheet__nota">Revisaremos tu caso en particular y te contactaremos por WhatsApp en pocos días.</p>
    </form>
  `;
}

/* ---------- TOAST ---------- */
let toastT;
function toast(msg, check = true) {
  const t = $("#toast");
  t.innerHTML = (check ? `<span class="chk">${ic("check")}</span>` : "") + `<span>${msg}</span>`;
  if (window.lucide) lucide.createIcons();
  t.classList.add("is-show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("is-show"), 3400);
}

/* ---------- INTERSECTION (fadeUp) ---------- */
function observeFade() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  $$(".fade-up").forEach(el => obs.observe(el));

  // contadores de cifras
  const cObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); cObs.unobserve(e.target); } });
  }, { threshold: 0.5 });
  $$(".cifra__num[data-count]").forEach(el => cObs.observe(el));
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderAliados();
  renderProfesionales();
  renderProgramas();
  if (window.lucide) lucide.createIcons();

  // Hero entra de inmediato
  $("#hero").classList.add("is-in");
  observeFade();

  // Nav scroll state
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Hamburguesa
  $("#burger").addEventListener("click", () => nav.classList.toggle("is-open"));
  $$(".nav__mobile a").forEach(a => a.addEventListener("click", () => nav.classList.remove("is-open")));

  // Delegación de clicks
  document.addEventListener("click", (e) => {
    const aliadoCard = e.target.closest("[data-aliado], [data-aliado-btn]");
    if (aliadoCard) {
      const i = aliadoCard.dataset.aliadoBtn ?? aliadoCard.dataset.aliado;
      openSheet(sheetAliado(+i));
      return;
    }
    const prog = e.target.closest("[data-programa]");
    if (prog) { openSheet(sheetPrograma(+prog.dataset.programa)); return; }

    // Profesional
    const profe = e.target.closest("[data-profesional]");
    if (profe) { openSheet(sheetProfesional(+profe.dataset.profesional)); return; }

    // Quiero ser aliado
    if (e.target.closest("[data-aliado-form]")) {
      openSheet(sheetAliadoForm());
      sheetInner.querySelectorAll(".cat-opt").forEach(btn => {
        btn.addEventListener("click", () => {
          btn.classList.toggle("is-on");
          const form = btn.closest("form");
          const otraInput = form.querySelector(".cat-otra-input");
          const otraOn = form.querySelector(".cat-opt--otra")?.classList.contains("is-on");
          if (otraInput) otraInput.style.display = otraOn ? "block" : "none";
          const sel = [...form.querySelectorAll(".cat-opt.is-on:not(.cat-opt--otra)")].map(b => b.dataset.cat);
          if (otraOn && otraInput?.value.trim()) sel.push(otraInput.value.trim());
          const hidden = form.querySelector(".cat-hidden");
          if (hidden) hidden.value = sel.join(", ");
        });
      });
      sheetInner.querySelector(".cat-otra-input")?.addEventListener("input", (ev) => {
        const form = ev.target.closest("form");
        const sel = [...form.querySelectorAll(".cat-opt.is-on:not(.cat-opt--otra)")].map(b => b.dataset.cat);
        if (ev.target.value.trim()) sel.push(ev.target.value.trim());
        const hidden = form.querySelector(".cat-hidden");
        if (hidden) hidden.value = sel.join(", ");
      });
      return;
    }

    // Aplicar descuento
    const apBtn = e.target.closest("[data-aplicar]");
    if (apBtn && !apBtn.classList.contains("is-aplicado")) {
      apBtn.classList.add("is-aplicado");
      apBtn.innerHTML = `${ic("check")} Aplicado`;
      if (window.lucide) lucide.createIcons();
      toast("Descuento aplicado · muéstralo en el establecimiento");
      return;
    }

    // Cerrar sheet
    if (e.target.closest("#sheet-close") || e.target === overlay) closeSheet();

    // CTA de planes / membresía → Módulo 2 (registro) con plan preseleccionado
    const plan = e.target.closest("[data-plan]");
    if (plan) { location.href = "Registro.html?plan=" + encodeURIComponent(plan.dataset.plan); return; }
  });

  // Teclado: enter en tarjeta de aliado
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (e.key === "Enter") {
      const card = e.target.closest("[data-aliado]");
      if (card) openSheet(sheetAliado(+card.dataset.aliado));
    }
  });

  // Envío formulario de voluntariado
  document.addEventListener("submit", (e) => {
    if (e.target.matches("[data-voluntario]")) {
      e.preventDefault();
      const btn = e.target.querySelector("button[type=submit]");
      btn.classList.add("is-aplicado");
      btn.innerHTML = `${ic("check")} Enviado — te contactamos por WhatsApp`;
      if (window.lucide) lucide.createIcons();
    }
    if (e.target.matches("[data-asesoria]")) {
      e.preventDefault();
      const btn = e.target.querySelector("button[type=submit]");
      btn.classList.add("is-aplicado");
      btn.innerHTML = `${ic("check")} Solicitud enviada — te contactamos por WhatsApp`;
      if (window.lucide) lucide.createIcons();
    }
    if (e.target.matches("[data-aliado-postular]")) {
      e.preventDefault();
      const form = e.target;
      const inputs = form.querySelectorAll("input[type=text], input[type=tel], textarea");
      const categoria = form.querySelector(".cat-hidden")?.value || "";
      if (!categoria) { toast("Selecciona al menos una categoría", false); return; }
      const btn = form.querySelector("button[type=submit]");
      btn.classList.add("is-aplicado");
      btn.innerHTML = `${ic("check")} Postulación enviada — revisaremos tu caso`;
      if (window.lucide) lucide.createIcons();
    }
  });
});
