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
    ${(a.direccion || a.maps_url) ? `
    <div style="display:flex;align-items:center;gap:10px;margin:12px 0 4px;flex-wrap:wrap;">
      ${a.direccion ? `<span style="font-size:13px;color:#666;display:flex;align-items:center;gap:5px;">${ic("map-pin")}${a.direccion}</span>` : ''}
      ${a.maps_url ? `<a href="${a.maps_url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:#e8f5ee;color:#095544;border-radius:99px;font-size:12px;font-weight:600;text-decoration:none;">${ic("navigation")}Ver en mapa</a>` : ''}
    </div>` : ''}
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

/* ---------- DATOS: PREGUNTAS FRECUENTES ---------- */
const FAQ = [
  {
    grupo: "Sobre el Club",
    preguntas: [
      { q: "¿Qué es El Club de la Gente?", a: "Es una empresa triple A (Ahorra, Aprende y Ayuda) nacida en Fusagasugá. Con una membresía mensual accedes a descuentos en negocios aliados, programas educativos y una red de personas que se apoyan para crecer. Juntos ahorramos más, juntos llegamos lejos." },
      { q: "¿Qué significa que sea una empresa BIC?", a: "Somos una S.A.S. de Beneficio e Interés Colectivo. Eso quiere decir que, además de generar valor para nuestros miembros, tenemos compromisos con la comunidad: compramos a proveedores locales, apoyamos fundaciones de rescate animal, entregamos mercados a personas en condición de calle e impulsamos emprendimientos de la región." },
      { q: "¿El Club es legal y está registrado?", a: "Sí. Somos EL CLUB DE LA GENTE S.A.S. BIC, NIT 902.064.432-5, registrados en la Cámara de Comercio desde mayo de 2026." },
    ],
  },
  {
    grupo: "Membresías y pagos",
    preguntas: [
      { q: "¿Qué planes hay y cuánto cuestan?", a: "Básica ($10.000/mes): acceso a la plataforma, todos los programas educativos, descuentos limitados con aliados y voluntariado social.<br><br>Premium ($20.000/mes): todo lo de la Básica, más descuentos ilimitados, ClubCard personalizada, sorteos y accesos exclusivos.<br><br>Por menos de lo que te cuesta un tinto al día, ya eres parte del club." },
      { q: "¿Cómo me afilio?", a: "Entra con tu cuenta de Google o tu WhatsApp, completa tu perfil, elige tu plan y haz el pago. En cuanto se confirme, tu membresía queda activa y ya puedes usar tus beneficios." },
      { q: "¿Cómo puedo pagar?", a: "Los pagos se procesan de forma segura a través de la llave Bre-B del Club. Una vez envíes el comprobante, se valida tu pago y se activa tu cuenta." },
      { q: "¿El cobro es automático cada mes?", a: "No. La membresía se renueva mes a mes para que no pierdas tus beneficios. Siempre puedes ver tu próximo cobro en tu perfil, te llega un recordatorio por WhatsApp y decides voluntariamente si seguir o no." },
      { q: "¿Puedo cancelar cuando quiera?", a: "Claro. No hay permanencia mínima, ni cláusulas raras, ni letra pequeña. Cancelas y no se te vuelve a cobrar." },
      { q: "¿Puedo pasar de Básica a Premium (o al revés)?", a: "Sí, puedes cambiar de plan desde tu perfil." },
      { q: "¿Qué pasa si no uso la membresía un mes?", a: "Los beneficios de ese mes son tuyos; no se acumulan para el siguiente. Por eso te animamos a aprovecharlos al máximo." },
      { q: "¿Qué pasa si mi pago falla?", a: "Te avisaremos para que actualices tu medio de pago. Mientras el pago no se confirme, los beneficios quedan en pausa." },
    ],
  },
  {
    grupo: "Descuentos y aliados",
    preguntas: [
      { q: "¿Cómo uso mis descuentos?", a: "Busca el aliado en el directorio de la plataforma, ve al negocio y muestra tu ClubCard desde el celular. El aliado la valida y te aplica el descuento." },
      { q: "¿Qué aliados hay?", a: "Ya tenemos aliados en bienestar y salud, estética, barbería, odontología, veterinaria, turismo, ropa personalizada, publicidad, comida rápida, fruver, tienda de regalos y heladería, y cada mes se suman más. En el directorio ves el detalle de cada uno y el beneficio que ofrece." },
      { q: "¿Qué es la ClubCard?", a: "Es tu tarjeta digital personalizada de miembro (Premium, Básica o gratis). La llevas en el celular y te identifica ante los aliados." },
      { q: "¿Qué significa \"descuentos limitados\" en la Básica?", a: "Tienes 2 usos al mes por cada aliado." },
      { q: "¿Los descuentos sirven fuera de Fusagasugá?", a: "Por ahora la red de aliados está en Fusagasugá, y pronto llegaremos a más ciudades. Sin embargo, está la Tienda del Club, que opera desde cualquier parte de Colombia y es de acceso gratuito." },
      { q: "Tengo un negocio, ¿cómo me vuelvo aliado?", a: "Escríbenos por WhatsApp al 304 339 4870. Ser aliado te da visibilidad, clientes nuevos y fieles y presencia en nuestra plataforma y redes, sin costo de vinculación, y te incluye membresía vitalicia." },
    ],
  },
  {
    grupo: "Educación y comunidad",
    preguntas: [
      { q: "¿Qué son los programas educativos?", a: "Son contenidos y talleres de educación financiera, desarrollo personal y profesional, pensados para que crezcas en todos los ámbitos posibles. Está incluido de manera gratuita." },
      { q: "¿Cómo participo en el voluntariado?", a: "Te avisaremos de las actividades sociales (jornadas con fundaciones de perritos, entrega de mercados y apoyo a emprendedores) para que te sumes cuando quieras." },
    ],
  },
  {
    grupo: "Cuenta y soporte",
    preguntas: [
      { q: "¿Mis datos están seguros?", a: "Sí. Solo usamos tus datos para gestionar tu membresía y tus beneficios, conforme a la Ley 1581 de 2012 de protección de datos personales. Los pagos se hacen por transferencia Bre-B directamente a la cuenta del Club; nosotros no almacenamos ni pedimos datos de tarjetas." },
      { q: "¿Cómo me comunico con ustedes?", a: "WhatsApp: 304 339 4870<br>Correo: clubdelagente@gmail.com" },
    ],
  },
];

/* ---------- Acordeón genérico (FAQ y Quiénes somos comparten el mismo look) ---------- */
function htmlAcordeonItem(titulo, htmlContenido) {
  return `
    <div class="faq-item">
      <button type="button" class="faq-item__q">
        <span>${titulo}</span>
        <i data-lucide="chevron-down" class="faq-item__ic"></i>
      </button>
      <div class="faq-item__a">${htmlContenido}</div>
    </div>`;
}
function htmlAcordeonGrupos(grupos) {
  return grupos.map(g => `
    <div class="faq-grupo">
      ${g.grupo ? `<div class="sheet__sub">${g.grupo}</div>` : ""}
      ${g.items.map(it => htmlAcordeonItem(it.titulo, it.html)).join("")}
    </div>
  `).join("");
}
function bindAcordeon() {
  sheetInner.querySelectorAll(".faq-item__q").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const body = item.querySelector(".faq-item__a");
      const abierto = item.classList.contains("is-open");
      item.classList.toggle("is-open", !abierto);
      body.style.maxHeight = abierto ? "0px" : body.scrollHeight + "px";
    });
  });
}

/* Sheet — Preguntas frecuentes */
function sheetFaq() {
  return `
    <div class="sheet__cat">Ayuda</div>
    <h2 class="sheet__nombre">Preguntas frecuentes</h2>
    ${htmlAcordeonGrupos(FAQ.map(g => ({ grupo: g.grupo, items: g.preguntas.map(p => ({ titulo: p.q, html: `<p>${p.a}</p>` })) })))}
  `;
}

/* ---------- DATOS: QUIÉNES SOMOS ---------- */
const QUIENES_SOMOS = [
  {
    grupo: null,
    items: [
      { titulo: "Una idea que nació de una pregunta", html: `
        <p>Hay ideas que nacen en una oficina.<br>La nuestra nació hablando con la gente.</p>
        <p>En la <strong>Casa de la Gente</strong>, en Fusagasugá, comenzamos a compartir espacios de liderazgo junto al exalcalde <strong>Jairo Hortúa</strong>. Allí hablábamos de participación, de comunidad, de emprendimiento y, sobre todo, de algo que parecía sencillo, pero que muchas veces olvidamos: <strong>el poder que tenemos cuando decidimos ayudarnos entre nosotros.</strong></p>
        <p>En esos encuentros escuchábamos historias de personas que tenían mucho para aportar, pero pocas oportunidades. Emprendedores que trabajaban incansablemente para sacar adelante sus negocios y aun así tenían dificultades para encontrar clientes. Familias que querían comprar lo necesario, pero tenían que pensar dos veces antes de gastar.</p>
        <p>Y entonces apareció una pregunta.</p>
        <p><strong>¿Qué pasaría si pudiéramos conectar esas dos realidades?</strong></p>
        <p>¿Qué pasaría si una persona pudiera ahorrar mientras compra en un negocio local?<br>¿Qué pasaría si ese negocio pudiera recibir nuevos clientes gracias a una comunidad que cree en él?<br>¿Y qué pasaría si una parte de ese movimiento pudiera convertirse también en ayuda para alguien que la necesita?</p>
        <p>De esa pregunta nació una idea que después se convirtió en un propósito.</p>
        <p><strong>El Club de la Gente.</strong></p>
      ` },
      { titulo: "El día en que entendimos que ahorrar también podía ser ayudar", html: `
        <p>La idea de Julián García fue crear un espacio donde las personas pudieran <strong>ahorrar comprando</strong>, acceder a beneficios y descuentos exclusivos en negocios aliados, continuar aprendiendo a través de talleres y, al mismo tiempo, hacer parte de una comunidad que también pensara en los demás a través de obras sociales.</p>
        <p>Porque entendimos algo:</p>
        <p>Cuando una persona decide comprarle a un negocio local, está ayudando a que un emprendedor tenga un cliente.<br>Cuando ese emprendedor crece, puede sostener su hogar, contratar a otra persona o invertir nuevamente en su negocio.<br>Cuando muchas personas hacen lo mismo, el dinero comienza a circular dentro de la comunidad.<br>Y cuando una comunidad decide destinar parte de lo que construye a ayudar a otros, el consumo puede convertirse también en una herramienta de solidaridad.</p>
        <p>Por eso quisimos construir algo diferente.</p>
        <p>No queríamos crear solamente una plataforma de descuentos.<br>Queríamos crear una <strong>comunidad con propósito</strong>.</p>
        <p>En mayo de 2026 nació <strong>El Club de la Gente S.A.S. BIC</strong>, con una idea sencilla de explicar, pero grande en lo que quiere lograr:</p>
        <p><strong>que ahorrar, aprender y ayudar puedan suceder al mismo tiempo.</strong></p>
      ` },
    ],
  },
  {
    grupo: "¿Quién está detrás?",
    items: [
      { titulo: "Julián García", html: `
        <p>Detrás de este proyecto está <strong>Julián Eduardo García Velandia</strong>, fusagasugueño por adopción, emprendedor, escritor y estudiante.</p>
        <p>Julián cree profundamente en una idea: <strong>el conocimiento puede cambiar la vida de una persona, pero una comunidad puede cambiar la vida de muchas.</strong></p>
        <p>Su historia también está marcada por la necesidad de crear oportunidades donde no siempre existen. Desde joven ha encontrado en el emprendimiento, la escritura y la participación social formas de convertir las ideas en acciones.</p>
        <p>El Club nace, en buena parte, de esa manera de entender la vida:</p>
        <p><strong>no esperar a que alguien construya el mundo que queremos, sino empezar a construirlo con las herramientas que tenemos.</strong></p>
        <img src="julian-garcia.jpg" alt="Julián García" style="width:100%;max-width:280px;border-radius:14px;display:block;margin:6px auto 4px">
      ` },
      { titulo: "Andrés Poveda", html: `
        <p>Junto a Julián está <strong>Andrés Poveda</strong>, cofundador y director estratégico.</p>
        <p>Su responsabilidad es convertir el propósito en una experiencia real: fortalecer la relación con los aliados, cuidar los beneficios ofrecidos a los miembros y ayudar a que cada parte del Club funcione de manera organizada y transparente.</p>
        <p>Porque una buena intención necesita también una buena estructura para convertirse en realidad.</p>
      ` },
    ],
  },
  {
    grupo: "Nuestro propósito",
    items: [
      { titulo: "No somos solamente una empresa", html: `
        <p>Somos una comunidad.</p>
        <p>Una comunidad formada por personas que quieren que su dinero les alcance un poco más, por emprendedores que necesitan oportunidades para crecer y por personas que todavía creen que progresar no significa necesariamente hacerlo solos.</p>
        <p>Por eso cada miembro, cada aliado y cada profesional que se suma al Club hace parte de algo más grande que una simple transacción.</p>
        <p><strong>Un miembro obtiene beneficios.<br>Un negocio obtiene oportunidades.<br>Un emprendedor encuentra una comunidad.<br>Y la sociedad recibe una parte de lo que juntos somos capaces de construir.</strong></p>
        <p>Ese es el círculo que queremos crear.</p>
      ` },
      { titulo: "Nuestra misión", html: `
        <p>Nuestra misión es <strong>ayudar a las personas y familias a ahorrar, aprender y crecer</strong>, conectándolas con negocios, profesionales y oportunidades que les permitan obtener beneficios reales.</p>
        <p>Al mismo tiempo, buscamos fortalecer el comercio local y convertir una parte de nuestro crecimiento en acciones que generen impacto positivo en la comunidad.</p>
        <p>Porque creemos que una empresa puede preguntarse no solamente:</p>
        <p><strong>"¿Cuánto podemos ganar?"</strong></p>
        <p>sino también:</p>
        <p><strong>"¿Cuánto podemos aportar mientras crecemos?"</strong></p>
      ` },
      { titulo: "Nuestra visión", html: `
        <p>Comenzamos en Fusagasugá porque creemos que los grandes cambios no siempre comienzan en los lugares más grandes.</p>
        <p>A veces comienzan en una ciudad, en un barrio, en una conversación o incluso en una pregunta.</p>
        <p>Nuestra visión es que, para 2030, <strong>El Club de la Gente sea una de las comunidades de beneficios con mayor reconocimiento en Colombia</strong>, conectando personas, negocios y oportunidades alrededor de un mismo propósito.</p>
        <p>Queremos crecer sin perder aquello que nos dio origen:</p>
        <p><strong>la cercanía.</strong></p>
        <p>Queremos que pertenecer al Club signifique mucho más que tener un descuento.</p>
        <p>Que signifique:</p>
        <p><strong>pagar menos, aprender más, apoyar lo local y saber que haces parte de una comunidad que también piensa en los demás.</strong></p>
      ` },
    ],
  },
  {
    grupo: "Lo que nos mueve",
    items: [
      { titulo: "🤝 Comunidad", html: `
        <p>Creemos que nadie debería sentir que tiene que salir adelante completamente solo.</p>
        <p>Una comunidad fuerte no es aquella donde todos tienen lo mismo.</p>
        <p>Es aquella donde <strong>cada persona puede aportar algo para que los demás tengan más oportunidades.</strong></p>
      ` },
      { titulo: "💰 Ahorro", html: `
        <p>Sabemos que detrás de cada compra hay una familia, un esfuerzo y muchas veces un presupuesto limitado.</p>
        <p>Por eso buscamos beneficios que tengan sentido en la vida cotidiana.</p>
        <p>No queremos descuentos que simplemente se vean bien.</p>
        <p><strong>Queremos beneficios que se sientan en el bolsillo.</strong></p>
      ` },
      { titulo: "📚 Aprendizaje", html: `
        <p>Creemos que una persona que aprende adquiere nuevas herramientas para transformar su realidad.</p>
        <p>Por eso el Club no solamente busca ayudarte a ahorrar dinero.</p>
        <p>También quiere ayudarte a <strong>adquirir conocimiento, desarrollar habilidades y encontrar nuevas oportunidades.</strong></p>
      ` },
      { titulo: "🤝 Confianza", html: `
        <p>Una comunidad no puede construirse sin confianza.</p>
        <p>Por eso creemos en relaciones claras, beneficios comprensibles y compromisos que puedan cumplirse.</p>
        <p>Porque detrás de cada membresía hay una persona que decidió confiar en nosotros.</p>
        <p>Y esa confianza merece respeto.</p>
      ` },
      { titulo: "❤️ Impacto social", html: `
        <p>Creemos que crecer tiene más sentido cuando el crecimiento también puede alcanzar a alguien más.</p>
        <p>Como empresa <strong>S.A.S. BIC</strong>, buscamos que nuestro propósito empresarial esté acompañado de acciones que generen valor para la sociedad.</p>
        <p>Por eso impulsamos iniciativas como el apoyo a fundaciones de rescate animal, la entrega de mercados a personas en condición de calle y el fortalecimiento de emprendimientos locales.</p>
        <p>No porque pensemos que podemos solucionar todos los problemas.</p>
        <p>Sino porque creemos que <strong>no hacer todo no significa no hacer nada.</strong></p>
      ` },
      { titulo: "🌱 Crecimiento", html: `
        <p>Queremos crecer.</p>
        <p>Pero también queremos preguntarnos <strong>para qué</strong>.</p>
        <p>Porque para nosotros el verdadero crecimiento no se mide únicamente en miembros, aliados o ingresos.</p>
        <p>También se mide en las oportunidades que ayudamos a crear, en los negocios que lograron conseguir nuevos clientes, en las personas que aprendieron algo nuevo y en las vidas que pudimos tocar.</p>
      ` },
    ],
  },
  {
    grupo: null,
    items: [
      { titulo: "Una membresía. Tres propósitos.", html: `
        <p>Al final, todo vuelve a la idea que nos dio origen.</p>
        <p><strong>Ahorra.</strong><br>Porque tu dinero merece rendir más.</p>
        <p><strong>Aprende.</strong><br>Porque el conocimiento puede abrir puertas que antes parecían cerradas.</p>
        <p><strong>Ayuda.</strong><br>Porque cuando lo que construimos también sirve para alguien más, el éxito adquiere otro significado.</p>
        <p>Eso es <strong>El Club de la Gente</strong>.</p>
        <p>Una idea que comenzó en Fusagasugá.<br>Una pregunta que se convirtió en propósito.<br>Y una comunidad que apenas está comenzando a escribir su historia.</p>
      ` },
    ],
  },
];

/* Sheet — Quiénes somos */
function sheetQuienesSomos() {
  return `
    <div class="sheet__cat">El Club de la Gente</div>
    <h2 class="sheet__nombre">Quiénes somos</h2>
    ${htmlAcordeonGrupos(QUIENES_SOMOS)}
  `;
}

/* ---------- DATOS: VALORES (hero — Ahorra / Aprende / Apoya) ---------- */
const VALORES = [
  {
    grupo: null,
    items: [
      { titulo: "💰 Ahorra de verdad", html: `
        <p style="font-weight:600;margin-bottom:10px">Tu ahorro también mueve la economía</p>
        <p>Ahorrar no significa solamente gastar menos. Cuando consigues un mejor precio, liberas dinero que puedes utilizar en otras cosas que necesitas o disfrutas.</p>
        <p>Los descuentos también pueden incentivar el consumo y fortalecer la conexión entre clientes y comercios. Cuando compras en un negocio local, tu dinero se convierte en ingresos para ese negocio y puede volver a circular entre trabajadores, proveedores y otras empresas.</p>
        <p><strong>¿Qué hay detrás?</strong><br>La economía estudia cómo los precios y los incentivos influyen en nuestras decisiones de consumo. Además, el llamado efecto multiplicador explica cómo un gasto puede convertirse en ingreso para otras personas dentro de la economía.</p>
        <p><strong>Por eso creemos en ahorrar:</strong><br>Tu beneficio no termina cuando pagas menos. Puede comenzar una nueva oportunidad.</p>
        <p>💡 <strong>Dato interesante:</strong> si ahorras $20.000 en una compra, esos $20.000 no desaparecen. Puedes destinarlos a otra necesidad, ahorrar, invertir o incluso aprender algo nuevo.</p>
        <p><strong>En el Club:</strong> ahorras mientras apoyas a los comercios que hacen parte de nuestra comunidad.</p>
      ` },
      { titulo: "🎓 Aprende cosas nuevas", html: `
        <p style="font-weight:600;margin-bottom:10px">Aprender es invertir en ti</p>
        <p>El conocimiento tiene algo especial: puedes compartirlo sin perderlo y utilizarlo durante toda la vida.</p>
        <p>La teoría del capital humano, desarrollada entre otros por el economista Gary Becker, plantea que la educación y las habilidades pueden aumentar las capacidades y oportunidades de las personas.</p>
        <p>Y hoy aprender es más importante que nunca. La tecnología, la inteligencia artificial y los cambios en el mundo laboral hacen que muchas habilidades deban actualizarse constantemente.</p>
        <p>Por eso queremos que aprender en el Club no sea solamente acumular certificados. Queremos ayudarte a desarrollar habilidades para la vida real:</p>
        <p>🧠 Pensamiento crítico<br>💡 Creatividad y resolución de problemas<br>💻 Habilidades digitales e inteligencia artificial<br>💰 Finanzas personales y emprendimiento<br>🗣️ Comunicación y liderazgo<br>🚀 Adaptación y aprendizaje permanente</p>
        <p>Porque aprender puede cambiar tus posibilidades. Lo que hoy aprendes puede convertirse mañana en una oportunidad.</p>
        <p><strong>En el Club:</strong> no solamente queremos que ahorres dinero. Queremos que aumentes tu valor, tus capacidades y tus oportunidades.</p>
      ` },
      { titulo: "❤️ Apoya lo que importa", html: `
        <p style="font-weight:600;margin-bottom:10px">Cuando una comunidad se une, puede hacer mucho más</p>
        <p>El desarrollo de una sociedad no depende únicamente del dinero que produce. También depende de su capacidad para cooperar, crear redes, confiar y ayudar a quienes lo necesitan.</p>
        <p>Por eso el Club busca apoyar programas sociales que generen beneficios reales para la comunidad y para otros seres sintientes.</p>
        <p>Esto se relaciona con el concepto de capital social: las redes, la confianza y la cooperación pueden convertirse en una fuerza para resolver problemas y generar bienestar.</p>
        <p><strong>¿Y qué significa esto para ti?</strong><br>Que pertenecer al Club no tiene que significar únicamente recibir beneficios. También puede significar ser parte de algo que ayuda a otros.</p>
        <p>🤝 Una comunidad que coopera.<br>💙 Personas que aportan.<br>🌱 Proyectos que generan oportunidades.<br>🐾 Iniciativas que protegen y ayudan a otros seres sintientes.</p>
        <p>Porque el verdadero valor de una comunidad no está solamente en lo que recibe, sino también en lo que es capaz de hacer por los demás.</p>
        <p><strong>En el Club:</strong><br>Ahorras para beneficiarte.<br>Aprendes para crecer.<br>Y ayudas para transformar.</p>
      ` },
    ],
  },
];

/* Sheet — Valores (Ahorra / Aprende / Apoya) */
function sheetValores() {
  return `
    <div class="sheet__cat">El Club de la Gente</div>
    <h2 class="sheet__nombre">Por qué existe el Club</h2>
    ${htmlAcordeonGrupos(VALORES)}
  `;
}
function abrirAcordeonItem(idx) {
  const item = sheetInner.querySelectorAll(".faq-item")[idx];
  if (!item) return;
  const body = item.querySelector(".faq-item__a");
  item.classList.add("is-open");
  body.style.maxHeight = body.scrollHeight + "px";
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

  // Hamburguesa (el panel vive fuera de <nav>, se controla con su propia clase)
  const navMobile = $("#nav-mobile");
  $("#burger").addEventListener("click", () => {
    nav.classList.toggle("is-open");
    navMobile?.classList.toggle("is-open");
  });
  $$(".nav__mobile a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navMobile?.classList.remove("is-open");
  }));

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

    // Valores del hero (Ahorra / Aprende / Apoya)
    const valor = e.target.closest("[data-valor]");
    if (valor) {
      openSheet(sheetValores());
      bindAcordeon();
      abrirAcordeonItem(+valor.dataset.valor);
      return;
    }

    // Preguntas frecuentes
    if (e.target.closest("[data-faq-btn]")) {
      openSheet(sheetFaq());
      bindAcordeon();
      return;
    }

    // Quiénes somos
    if (e.target.closest("[data-quienes-btn]")) {
      openSheet(sheetQuienesSomos());
      bindAcordeon();
      return;
    }

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
