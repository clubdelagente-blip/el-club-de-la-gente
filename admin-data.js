/* ============================================================
   EL CLUB DE LA GENTE — Módulo 6 · Datos del backoffice
   Datos de demostración (en producción vienen de Firestore)
   ============================================================ */

/* ---------- MÉTRICAS GLOBALES ---------- */
const ADM_METRICAS = {
  miembros: 2048, miembrosTrend: "+12%", miembrosNuevos: 86,
  ingresos: 31460000, ingresosTrend: "+18%",
  descuentos: 1342, descuentosSemana: 214,
  ahorroAcum: 248900000, ahorroTrend: "+9%",
};

/* ---------- INGRESOS POR MES ---------- */
const ADM_INGRESOS = [
  { mes: "Ene", valor: 18200000 },
  { mes: "Feb", valor: 21400000 },
  { mes: "Mar", valor: 23900000 },
  { mes: "Abr", valor: 26800000 },
  { mes: "May", valor: 29100000 },
  { mes: "Jun", valor: 31460000, now: true },
];
const ADM_DESGLOSE = {
  basica:  { miembros: 1318, valor: 13180000 },
  premium: { miembros: 730,  valor: 14600000 },
};

/* ---------- FEED DE ACTIVIDAD ---------- */
const ADM_FEED = [
  { tipo: "miembro",    txt: "<b>Laura Restrepo</b> se unió al plan Premium", time: "hace 4 min" },
  { tipo: "pago",       txt: "Pago recibido de <b>Andrés Gómez</b> · $20.000", time: "hace 11 min" },
  { tipo: "descuento",  txt: "<b>Patitas Felices</b> · descuento 30% aplicado · ahorro $24.000", time: "hace 23 min" },
  { tipo: "miembro",    txt: "<b>Diana Castaño</b> se unió al plan Básica", time: "hace 38 min" },
  { tipo: "renovacion", txt: "Renovación automática de <b>Carlos Pérez</b> · Premium", time: "hace 52 min" },
  { tipo: "descuento",  txt: "<b>Barbería Don Carlos</b> · descuento 30% · ahorro $7.500", time: "hace 1 h" },
  { tipo: "pago",       txt: "Pago recibido de <b>Mónica Salazar</b> · $10.000", time: "hace 1 h" },
  { tipo: "miembro",    txt: "<b>Julián Ortiz</b> se unió al plan Premium", time: "hace 2 h" },
];

/* ---------- MIEMBROS ---------- */
const ADM_MIEMBROS = [
  { nombre: "Carlos Andrés Pérez", num: "2048", plan: "premium", estado: "activo", ahorro: 76140, mision: 1, fecha: "12 jun 2026", wsp: "300 412 8890", barrio: "Centro" },
  { nombre: "Laura Restrepo Mesa", num: "2047", plan: "premium", estado: "activo", ahorro: 12400, mision: 3, fecha: "12 jun 2026", wsp: "311 556 7720", barrio: "Emilio Sierra" },
  { nombre: "Andrés Gómez Vidal", num: "2046", plan: "premium", estado: "activo", ahorro: 41800, mision: 8, fecha: "11 jun 2026", wsp: "320 778 1145", barrio: "Pekín" },
  { nombre: "Diana Castaño Ruiz", num: "2045", plan: "basica", estado: "activo", ahorro: 8900, mision: 6, fecha: "11 jun 2026", wsp: "315 220 9981", barrio: "Balmoral" },
  { nombre: "Mónica Salazar León", num: "2044", plan: "basica", estado: "activo", ahorro: 22300, mision: 2, fecha: "10 jun 2026", wsp: "301 664 3320", barrio: "Centro" },
  { nombre: "Julián Ortiz Parra", num: "2043", plan: "premium", estado: "activo", ahorro: 58600, mision: 5, fecha: "10 jun 2026", wsp: "312 998 4410", barrio: "Pekín" },
  { nombre: "Sandra Quintero Niño", num: "2042", plan: "premium", estado: "activo", ahorro: 33200, mision: 9, fecha: "9 jun 2026", wsp: "318 442 1090", barrio: "Coburgo" },
  { nombre: "Felipe Naranjo Díaz", num: "2041", plan: "basica", estado: "inactivo", ahorro: 4100, mision: 4, fecha: "2 may 2026", wsp: "300 119 7765", barrio: "Emilio Sierra" },
  { nombre: "Paola Mahecha Soto", num: "2040", plan: "premium", estado: "activo", ahorro: 67400, mision: 11, fecha: "8 jun 2026", wsp: "313 887 2204", barrio: "Centro" },
  { nombre: "Ricardo Beltrán Cruz", num: "2039", plan: "basica", estado: "activo", ahorro: 15600, mision: 7, fecha: "7 jun 2026", wsp: "317 330 5567", barrio: "Balmoral" },
  { nombre: "Camila Forero Lara", num: "2038", plan: "premium", estado: "activo", ahorro: 29800, mision: 3, fecha: "6 jun 2026", wsp: "319 774 8812", barrio: "Pekín" },
  { nombre: "Esteban Rojas Pinto", num: "2037", plan: "basica", estado: "inactivo", ahorro: 2300, mision: 1, fecha: "18 abr 2026", wsp: "302 556 1199", barrio: "Coburgo" },
];

/* ---------- ALIADOS (gestión) ---------- */
const ADM_ALIADOS = [
  { nombre: "Patitas Felices", cat: "Veterinaria", icon: "paw-print", usos: 184, pct: "30%", estado: "activo" },
  { nombre: "Barbería Don Carlos", cat: "Barbería", icon: "scissors", usos: 161, pct: "30%", estado: "activo" },
  { nombre: "Sonrisa Sana", cat: "Odontología", icon: "smile", usos: 142, pct: "25%", estado: "activo" },
  { nombre: "Mercado del Campo", cat: "Canasta familiar", icon: "shopping-basket", usos: 138, pct: "12%", estado: "activo" },
  { nombre: "Heladería La Sumapaz", cat: "Heladería", icon: "ice-cream", usos: 119, pct: "2x1", estado: "activo" },
  { nombre: "El Buen Sabor", cat: "Comida rápida", icon: "sandwich", usos: 96, pct: "25%", estado: "activo" },
  { nombre: "Bienestar Integral Spa", cat: "Bienestar y salud", icon: "heart-pulse", usos: 74, pct: "20%", estado: "activo" },
  { nombre: "Estilo Propio", cat: "Ropa personalizada", icon: "shirt", usos: 53, pct: "20%", estado: "activo" },
  { nombre: "Fusa Aventura Tours", cat: "Turismo", icon: "mountain-snow", usos: 41, pct: "15%", estado: "inactivo" },
];

/* ---------- PROFESIONALES ---------- */
const ADM_PROFESIONALES = [
  { nombre: "Dra. Marcela Téllez", area: "Asesoría jurídica", icon: "scale", consultas: 64, estado: "activo" },
  { nombre: "Ps. Daniela Romero", area: "Asesoría psicológica", icon: "brain", consultas: 48, estado: "activo" },
  { nombre: "C.P. Andrés Linares", area: "Asesoría contable", icon: "calculator", consultas: 37, estado: "activo" },
];

/* ---------- CONTENIDO (galería) ---------- */
const ADM_CONTENIDO = [
  { nombre: "Banner hero junio", tipo: "Banner", icon: "image", fecha: "1 jun 2026" },
  { nombre: "Foto Patitas Felices", tipo: "Aliado", icon: "image", fecha: "30 may 2026" },
  { nombre: "Video bienvenida", tipo: "Video", icon: "video", fecha: "28 may 2026" },
  { nombre: "Jornada de adopción", tipo: "Social", icon: "image", fecha: "26 may 2026" },
  { nombre: "Foto Barbería Don Carlos", tipo: "Aliado", icon: "image", fecha: "24 may 2026" },
  { nombre: "Programa Mesa Compartida", tipo: "Programa", icon: "image", fecha: "22 may 2026" },
  { nombre: "Reel aliados nuevos", tipo: "Video", icon: "video", fecha: "20 may 2026" },
  { nombre: "Banner membresías", tipo: "Banner", icon: "image", fecha: "18 may 2026" },
];

/* ---------- PROGRAMAS SOCIALES ---------- */
const ADM_PROGRAMAS = [
  {
    nombre: "Patas que Rescatan", icon: "paw-print",
    desc: "Rescate, atención y adopción de animales en condición de calle en Fusagasugá y el Sumapaz.",
    cifras: [{ n: "340", l: "Animales rescatados" }, { n: "85", l: "Familias adoptantes" }, { n: "18", l: "Jornadas" }],
    voluntarios: [{ nombre: "María Páez", wsp: "300 441 2290" }, { nombre: "Juan Cárdenas", wsp: "312 778 5510" }, { nombre: "Lucía Romero", wsp: "319 220 8841" }],
  },
  {
    nombre: "Mesa Compartida", icon: "utensils-crossed",
    desc: "Entrega de mercados y apoyo alimentario a familias vulnerables de la región.",
    cifras: [{ n: "1.200", l: "Mercados entregados" }, { n: "300", l: "Familias apoyadas" }, { n: "24", l: "Entregas" }],
    voluntarios: [{ nombre: "Pedro Niño", wsp: "315 664 3301" }, { nombre: "Ana Suárez", wsp: "301 990 4412" }],
  },
  {
    nombre: "Aprende y Crece", icon: "graduation-cap",
    desc: "Talleres gratuitos de educación financiera y emprendimiento para la comunidad.",
    cifras: [{ n: "28", l: "Talleres dictados" }, { n: "540", l: "Personas formadas" }, { n: "12", l: "Aliados docentes" }],
    voluntarios: [{ nombre: "Diego Mora", wsp: "318 112 7780" }],
  },
  {
    nombre: "Manos a la Obra", icon: "hammer",
    desc: "Mejoramiento de vivienda y espacios comunitarios con voluntarios del Club.",
    cifras: [{ n: "12", l: "Hogares mejorados" }, { n: "60", l: "Voluntarios activos" }, { n: "6", l: "Jornadas" }],
    voluntarios: [{ nombre: "Sofía Vargas", wsp: "313 556 9920" }, { nombre: "Mateo Gil", wsp: "300 887 1123" }, { nombre: "Karen Díaz", wsp: "317 442 6650" }],
  },
];

/* ---------- VENTAS ---------- */
const ADM_VENTAS_METRICAS = {
  mes: 31460000, anterior: 29100000, proyeccion: 392000000, ticket: 15360,
};
const ADM_TRANSACCIONES = [
  { nombre: "Laura Restrepo Mesa", num: "2047", plan: "premium", fecha: "12 jun 2026", valor: 20000 },
  { nombre: "Andrés Gómez Vidal", num: "2046", plan: "premium", fecha: "11 jun 2026", valor: 20000 },
  { nombre: "Diana Castaño Ruiz", num: "2045", plan: "basica", fecha: "11 jun 2026", valor: 10000 },
  { nombre: "Mónica Salazar León", num: "2044", plan: "basica", fecha: "10 jun 2026", valor: 10000 },
  { nombre: "Julián Ortiz Parra", num: "2043", plan: "premium", fecha: "10 jun 2026", valor: 20000 },
  { nombre: "Sandra Quintero Niño", num: "2042", plan: "premium", fecha: "9 jun 2026", valor: 20000 },
  { nombre: "Paola Mahecha Soto", num: "2040", plan: "premium", fecha: "8 jun 2026", valor: 20000 },
  { nombre: "Ricardo Beltrán Cruz", num: "2039", plan: "basica", fecha: "7 jun 2026", valor: 10000 },
];

/* ---------- SUSCRIPCIONES ---------- */
const ADM_SUSC_METRICAS = {
  activas: 1962, vencen: 47, canceladas: 38, renovacion: "94%",
};
const ADM_RENOVACIONES = [
  { nombre: "Carlos Andrés Pérez", num: "2048", plan: "premium", fecha: "1 jul 2026", cobro: "auto" },
  { nombre: "Sandra Quintero Niño", num: "2042", plan: "premium", fecha: "2 jul 2026", cobro: "auto" },
  { nombre: "Ricardo Beltrán Cruz", num: "2039", plan: "basica", fecha: "3 jul 2026", cobro: "pend" },
  { nombre: "Camila Forero Lara", num: "2038", plan: "premium", fecha: "4 jul 2026", cobro: "auto" },
  { nombre: "Felipe Naranjo Díaz", num: "2041", plan: "basica", fecha: "5 jul 2026", cobro: "fallido" },
  { nombre: "Paola Mahecha Soto", num: "2040", plan: "premium", fecha: "6 jul 2026", cobro: "auto" },
  { nombre: "Mónica Salazar León", num: "2044", plan: "basica", fecha: "7 jul 2026", cobro: "pend" },
];

/* ---------- ARQUETIPOS (para el modal de miembro) ---------- */
const ADM_ARQUETIPOS = {
  1: "El Líder", 2: "El Diplomático", 3: "El Creativo", 4: "El Constructor", 5: "El Aventurero",
  6: "El Protector", 7: "El Místico", 8: "El Ejecutivo", 9: "El Humanista",
  11: "El Iluminado", 22: "El Maestro Constructor", 33: "El Maestro Sanador",
};

/* ============================================================
   MÓDULO 7 — AGENTE DE WHATSAPP
   Conversaciones del agente con los miembros (demo)
   ============================================================ */

/* Plantillas de respuesta rápida del agente */
const ADM_WA_PLANTILLAS = [
  { lbl: "Saludo", txt: "¡Hola! 👋 Soy el agente de El Club de la Gente. ¿En qué te puedo ayudar hoy?" },
  { lbl: "Resumen de ahorro", txt: "Este mes ya llevas un ahorro estupendo con tu membresía 🎉 ¿Quieres ver el detalle por aliado?" },
  { lbl: "Descuento nuevo", txt: "Tenemos un descuento nuevo que te puede interesar según tus categorías. ¿Te cuento? 👀" },
  { lbl: "Recordar renovación", txt: "Tu membresía se renueva pronto. El cobro es automático, no tienes que hacer nada 🙌" },
  { lbl: "Cómo usar", txt: "Para usar un beneficio solo muestra tu ClubCard o el QR en el local aliado. ¡Así de fácil!" },
];

/* Audiencias para difusión masiva */
const ADM_WA_AUDIENCIAS = [
  { id: "todos",    lbl: "Todos los miembros",   n: 2048 },
  { id: "premium",  lbl: "Solo Premium",          n: 730 },
  { id: "basica",   lbl: "Solo Básica",           n: 1318 },
  { id: "vencen",   lbl: "Vencen esta semana",    n: 47 },
  { id: "inactivos",lbl: "Miembros inactivos",    n: 86 },
];

/* Hilos de conversación. from: "user" (miembro) | "agent" (Club).
   estado de cada msg del agente: "auto" (enviado por el bot) o normal. */
const ADM_CONVERS = [
  {
    num: "2048", nombre: "Carlos Andrés Pérez", plan: "premium", wsp: "300 412 8890",
    online: true, unread: 1, time: "8:14 a.m.",
    msgs: [
      { from: "agent", auto: true, txt: "¡Hola, Carlos! 👋 Aquí tu resumen de mayo: ahorraste $22.140 en 4 compras. ¡Tu mejor mes! 🎉", time: "8:01 a.m." },
      { from: "agent", auto: true, txt: "Como te interesa Veterinaria, te recuerdo: Patitas Felices tiene 30% para miembros, a 4 cuadras de ti.", time: "8:01 a.m." },
      { from: "user", txt: "¡Gracias! 🙌 ¿Y para mercado qué aliado me recomiendas?", time: "8:14 a.m." },
    ],
  },
  {
    num: "2047", nombre: "Laura Restrepo Mesa", plan: "premium", wsp: "311 556 7720",
    online: false, unread: 2, time: "Ayer",
    msgs: [
      { from: "agent", auto: true, txt: "¡Bienvenida al Club, Laura! 🌿 Soy tu agente personal. Escríbeme cuando quieras ver tus beneficios.", time: "Ayer · 9:30 a.m." },
      { from: "user", txt: "Hola! ¿La barbería tiene descuento también para corte de niños?", time: "Ayer · 6:02 p.m." },
      { from: "user", txt: "Es para mi hijo 🙂", time: "Ayer · 6:02 p.m." },
    ],
  },
  {
    num: "2046", nombre: "Andrés Gómez Vidal", plan: "premium", wsp: "320 778 1145",
    online: false, unread: 0, time: "Ayer",
    msgs: [
      { from: "user", txt: "Cuánto me ahorro si compro $80.000 en Patitas Felices?", time: "Ayer · 3:10 p.m." },
      { from: "agent", txt: "Con el 30% de Patitas Felices, en $80.000 te ahorras $24.000 y pagas $56.000 ✅", time: "Ayer · 3:11 p.m." },
      { from: "user", txt: "Buenísimo, gracias!", time: "Ayer · 3:12 p.m." },
    ],
  },
  {
    num: "2044", nombre: "Mónica Salazar León", plan: "basica", wsp: "301 664 3320",
    online: true, unread: 1, time: "9:48 a.m.",
    msgs: [
      { from: "user", txt: "Hola, quiero postularme como voluntaria en Mesa Compartida 🙋‍♀️", time: "9:48 a.m." },
    ],
  },
  {
    num: "2045", nombre: "Diana Castaño Ruiz", plan: "basica", wsp: "315 220 9981",
    online: false, unread: 0, time: "2 jun",
    msgs: [
      { from: "agent", auto: true, txt: "Hola Diana, tu membresía se renueva el 11 de junio. El cobro es automático, no tienes que hacer nada 🙌", time: "2 jun · 10:00 a.m." },
      { from: "user", txt: "Perfecto, gracias por avisar", time: "2 jun · 11:20 a.m." },
      { from: "agent", txt: "¡Con gusto! Cualquier cosa aquí estoy 🌿", time: "2 jun · 11:21 a.m." },
    ],
  },
  {
    num: "2043", nombre: "Julián Ortiz Parra", plan: "premium", wsp: "312 998 4410",
    online: false, unread: 0, time: "1 jun",
    msgs: [
      { from: "agent", auto: true, txt: "¡Bienvenido al Club, Julián! 🎉 Ya eres parte de la familia. Tu ClubCard física llega en 5 días hábiles.", time: "1 jun · 4:00 p.m." },
      { from: "user", txt: "Excelente! ya quiero usarla 😄", time: "1 jun · 4:45 p.m." },
    ],
  },
];

