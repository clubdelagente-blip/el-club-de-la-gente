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

/* ---------- VENTAS (sin conectar a datos reales todavia) ---------- */
const ADM_VENTAS_METRICAS = {
  mes: 0, anterior: 0, proyeccion: 0, ticket: 0,
};
const ADM_TRANSACCIONES = [];

/* ---------- SUSCRIPCIONES (sin conectar a datos reales todavia) ---------- */
const ADM_SUSC_METRICAS = {
  activas: 0, vencen: 0, canceladas: 0, renovacion: "0%",
};
const ADM_RENOVACIONES = [];

/* ---------- ARQUETIPOS (para el modal de miembro) ---------- */
const ADM_ARQUETIPOS = {
  1: "El Líder", 2: "El Diplomático", 3: "El Creativo", 4: "El Constructor", 5: "El Aventurero",
  6: "El Protector", 7: "El Místico", 8: "El Ejecutivo", 9: "El Humanista",
  11: "El Iluminado", 22: "El Maestro Constructor", 33: "El Maestro Sanador",
};

/* ============================================================
   MÓDULO 7 — AGENTE DE WHATSAPP
   ============================================================ */

/* Plantillas de respuesta rápida del agente (texto de ejemplo reutilizable,
   no son datos de negocio -- se mantienen) */
const ADM_WA_PLANTILLAS = [
  { lbl: "Saludo", txt: "¡Hola! 👋 Soy el agente de El Club de la Gente. ¿En qué te puedo ayudar hoy?" },
  { lbl: "Resumen de ahorro", txt: "Este mes ya llevas un ahorro estupendo con tu membresía 🎉 ¿Quieres ver el detalle por aliado?" },
  { lbl: "Descuento nuevo", txt: "Tenemos un descuento nuevo que te puede interesar según tus categorías. ¿Te cuento? 👀" },
  { lbl: "Recordar renovación", txt: "Tu membresía se renueva pronto. El cobro es automático, no tienes que hacer nada 🙌" },
  { lbl: "Cómo usar", txt: "Para usar un beneficio solo muestra tu ClubCard o el QR en el local aliado. ¡Así de fácil!" },
];

