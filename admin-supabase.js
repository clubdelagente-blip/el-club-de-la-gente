/* ============================================================
   EL CLUB DE LA GENTE — Admin · Integración Supabase
   Carga datos reales y actualiza el panel de administración
   ============================================================ */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = "https://egwaedadpqfwnbfosiao.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2FlZGFkcHFmd25iZm9zaWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njc2ODcsImV4cCI6MjA5NjM0MzY4N30.NrBPX8HhTcs_y-QG3o_GoEAednFc0TqUunkQe1dblT4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const nf = new Intl.NumberFormat("es-CO");
const ini = (n) => n.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const planLbl = (p) => p === "premium" ? "Premium" : "Básica";
const ic = (n) => `<i data-lucide="${n}"></i>`;

/* ---------- Cargar miembros reales ---------- */
async function cargarMiembros() {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return;

  // Actualizar el array global de miembros
  const reales = data.map((u, i) => ({
    nombre: u.nombre || "Miembro",
    num: String(data.length - i).padStart(4, "0"),
    plan: u.plan || "basica",
    estado: "activo",
    ahorro: 0,
    mision: 1,
    fecha: new Date(u.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }),
    wsp: u.whatsapp || "—",
    barrio: "—",
    id: u.id,
  }));

  // Reemplazar datos ficticios con reales
  ADM_MIEMBROS.splice(0, ADM_MIEMBROS.length, ...reales);
  ADM_METRICAS.miembros = reales.length;
  ADM_METRICAS.miembrosNuevos = reales.filter(u => {
    const d = new Date(data.find(x => x.id === u.id)?.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Actualizar métricas visibles
  actualizarMetricaMiembros(reales.length);
  actualizarTablaMiembros(reales);
}

/* ---------- Cargar postulaciones de aliados ---------- */
async function cargarPostulaciones() {
  const { data, error } = await supabase
    .from("aliados_postulaciones")
    .select("*")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return;
  mostrarPostulacionesPendientes(data);
}

/* ---------- Actualizar métricas en el DOM ---------- */
function actualizarMetricaMiembros(total) {
  const els = document.querySelectorAll(".ad-metric__val");
  if (els[0]) els[0].textContent = nf.format(total);
}

function actualizarTablaMiembros(miembros) {
  // Actualizar tabla del dashboard (últimos 4)
  const tablaHome = document.querySelector("#p-dashboard .ad-table tbody");
  if (tablaHome) {
    tablaHome.innerHTML = miembros.slice(0, 4).map(u => `
      <tr data-miembro="${u.num}">
        <td><div class="ad-cell-user"><span class="ad-av">${ini(u.nombre)}</span>
          <div><div class="ad-cell-user__name">${u.nombre}</div><div class="ad-table__num">#${u.num}</div></div></div></td>
        <td><span class="ad-pill ${u.plan}"><span class="d"></span>${planLbl(u.plan)}</span></td>
        <td style="text-align:right"><span class="ad-pill activo"><span class="d"></span>Activo</span></td>
      </tr>`).join("");
  }

  // Actualizar panel de miembros si está activo
  const tablaMiembros = document.querySelector("#p-miembros .ad-table tbody");
  if (tablaMiembros) {
    tablaMiembros.innerHTML = miembros.map(u => `
      <tr data-miembro="${u.num}">
        <td><div class="ad-cell-user"><span class="ad-av">${ini(u.nombre)}</span>
          <div><div class="ad-cell-user__name">${u.nombre}</div><div class="ad-table__num">#${u.num}</div></div></div></td>
        <td><span class="ad-pill ${u.plan}"><span class="d"></span>${planLbl(u.plan)}</span></td>
        <td>${u.wsp}</td>
        <td>${u.fecha}</td>
        <td><span class="ad-pill activo"><span class="d"></span>Activo</span></td>
        <td><button class="ad-btn" data-miembro="${u.num}">${ic("eye")} Ver</button></td>
      </tr>`).join("");
    if (window.lucide) lucide.createIcons();
  }
}

/* ---------- Mostrar postulaciones pendientes ---------- */
function mostrarPostulacionesPendientes(postulaciones) {
  const feed = document.querySelector(".ad-feed");
  if (!feed) return;

  const items = postulaciones.map(p => `
    <li>
      <span class="ad-feed__dot miembro"></span>
      <div class="ad-feed__body">
        <div class="ad-feed__txt">Nueva postulación de aliado: <b>${p.nombre_negocio}</b> · ${p.categoria}</div>
        <div class="ad-feed__time">${new Date(p.created_at).toLocaleDateString("es-CO")}</div>
      </div>
    </li>`).join("");

  feed.insertAdjacentHTML("afterbegin", items);
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    cargarMiembros();
    cargarPostulaciones();
  }, 500);
});
