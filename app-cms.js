/* ============================================================
   EL CLUB DE LA GENTE — CMS público
   Carga aliados, programas y anuncios desde Supabase
   ============================================================ */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  "https://egwaedadpqfwnbfosiao.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2FlZGFkcHFmd25iZm9zaWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njc2ODcsImV4cCI6MjA5NjM0MzY4N30.NrBPX8HhTcs_y-QG3o_GoEAednFc0TqUunkQe1dblT4"
);

const ic = (n) => `<i data-lucide="${n}"></i>`;

/* ---------- Aliados ---------- */
async function cargarAliadosPub() {
  const { data, error } = await supabase
    .from('aliados')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data?.length) return;

  const grid = document.querySelector('#aliados-grid, .aliados__grid');
  if (!grid) return;

  grid.innerHTML = data.map((a, i) => `
    <article class="aliado fade-up" data-aliado="${i}" style="--delay:${i * 60}ms">
      <div class="aliado__img">
        ${a.imagen_url
          ? `<img src="${a.imagen_url}" alt="${a.nombre}" style="width:100%;height:100%;object-fit:cover">`
          : `<span class="aliado__img-placeholder">${ic('store')}</span>`}
        <span class="aliado__pct">${a.descuento || ''}</span>
      </div>
      <div class="aliado__body">
        <div class="aliado__cat">${a.categoria || ''}</div>
        <div class="aliado__nombre">${a.nombre}</div>
        <p class="aliado__desc">${a.descripcion || ''}</p>
        <button class="aliado__cta" data-aliado-btn="${i}">Ver beneficio ${ic('arrow-right')}</button>
      </div>
    </article>`).join('');

  // Sincronizar array global para que el sheet funcione
  if (typeof ALIADOS !== 'undefined') {
    ALIADOS.splice(0, ALIADOS.length, ...data.map(a => ({
      nombre: a.nombre,
      categoria: a.categoria || '',
      icon: 'store',
      pct: a.descuento || '',
      foto: a.imagen_url || '',
      desc: a.descripcion || '',
      direccion: a.direccion || '',
      maps_url: a.maps_url || '',
      descuentos: [{ pct: a.descuento || '', nombre: 'Descuento para miembros', desc: '' }],
    })));
  }

  if (window.lucide) lucide.createIcons();
}

/* ---------- Planes (precios y beneficios editables desde Admin) ---------- */
function tarjetaPlanHtml(p, i) {
  const esVitalicia = p.slug === "vitalicia";
  const esPremium = p.slug === "premium";
  const claseSlug = esPremium ? "plan--premium" : esVitalicia ? "plan--vitalicia" : p.slug === "gratis" ? "plan--gratis" : "plan--basica";
  const colorVital = esVitalicia ? ' style="color:#1a7a3c"' : "";
  const dotVital = esVitalicia ? ' style="background:#1a7a3c"' : "";

  return `
    <article class="plan ${claseSlug} fade-up" style="--delay:${i * 60}ms">
      ${p.recomendado ? `<span class="plan__badge-rec" id="badge-rec">Recomendado</span>` : ""}
      <span class="plan__tag"${colorVital}>${p.tag}</span>
      ${p.ribbon_texto ? `<span style="display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:#1a7a3c;color:#fff;padding:7px 14px;border-radius:100px;margin-top:12px;">${p.ribbon_texto}</span>` : ""}
      ${(p.antes_texto || p.ahorra_texto) ? `<div class="plan__precio-row">
        ${p.antes_texto ? `<span class="plan__antes">${p.antes_texto}</span>` : ""}
        ${p.ahorra_texto ? `<span class="plan__ahorra">${p.ahorra_texto}</span>` : ""}
      </div>` : ""}
      <div class="plan__precio"${colorVital}>${p.precio_texto}<small> ${p.precio_sufijo || ""}</small></div>
      <div class="plan__ciclo">${p.ciclo_texto || ""}</div>
      <ul class="plan__beneficios">
        ${(p.beneficios || []).map(b => `<li><span class="dot"${dotVital}></span>${b}</li>`).join("")}
      </ul>
    </article>`;
}
async function cargarPlanesPub() {
  const { data, error } = await supabase.from('planes').select('*').order('orden');
  if (error || !data?.length) return; // sin datos: deja el contenido estático de respaldo tal cual

  const cont = document.querySelector('.planes');
  if (!cont) return;
  // La vitalicia no se "elige" con clic — se gana con 5 referidos, igual que en Planes.html
  cont.innerHTML = data.filter(p => p.slug !== 'vitalicia').map(tarjetaPlanHtml).join('');
  if (window.lucide) lucide.createIcons();
}

/* ---------- Programas ---------- */
async function cargarProgramasPub() {
  const { data, error } = await supabase
    .from('programas')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data?.length) return;

  const grid = document.querySelector('#programas-grid');
  if (!grid) return;

  grid.innerHTML = data.map(p => `
    <div class="programa-card fade-up">
      ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:100%;height:180px;object-fit:cover;border-radius:10px 10px 0 0">` : ''}
      <div style="padding:20px">
        <h3 style="font-family:var(--display);font-size:20px;font-weight:600;margin-bottom:8px;color:inherit">${p.nombre}</h3>
        <p style="font-size:14px;opacity:.7;line-height:1.6">${p.descripcion || ''}</p>
      </div>
    </div>`).join('');

  if (window.lucide) lucide.createIcons();
}

/* ---------- Profesionales ---------- */
async function cargarProfesionalesPub() {
  const { data, error } = await supabase
    .from('profesionales')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: true });

  if (error || !data?.length) return;

  const grid = document.querySelector('#profesionales-grid');
  if (!grid) return;

  grid.innerHTML = data.map((p, i) => `
    <div class="profe-card fade-up" style="--delay:${i * 60}ms">
      ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:12px">` : `<span style="width:72px;height:72px;border-radius:50%;background:var(--verde-soft,#e8f5ec);display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:24px;font-weight:700;color:var(--verde)">${(p.nombre||'P')[0]}</span>`}
      <div style="font-weight:600;font-size:15px;margin-bottom:4px">${p.nombre}</div>
      <div style="font-size:13px;opacity:.6;margin-bottom:8px">${p.area || ''}</div>
      <p style="font-size:13px;opacity:.6;line-height:1.5">${p.descripcion || ''}</p>
    </div>`).join('');

  if (window.lucide) lucide.createIcons();
}

/* ---------- Carrusel de promociones destacadas (solo visual) ---------- */
async function cargarCarruselPromos() {
  const { data: promos, error } = await supabase
    .from('promociones')
    .select('*')
    .eq('en_carrusel', true)
    .eq('activa', true)
    .not('foto_url', 'is', null)
    .order('created_at', { ascending: false });

  if (error || !promos?.length) return;

  const aliadoIds = [...new Set(promos.map(p => p.aliado_id))];
  const { data: aliadosData } = await supabase
    .from('aliados')
    .select('id, nombre, categoria')
    .in('id', aliadoIds);
  const aliadosMap = new Map((aliadosData || []).map(a => [a.id, a]));

  const wrap = document.getElementById('promo-carrusel-wrap');
  const track = document.getElementById('promo-carrusel-track');
  if (!wrap || !track) return;

  const items = [...promos, ...promos];
  track.innerHTML = items.map(p => {
    const al = aliadosMap.get(p.aliado_id);
    return `
    <div class="promo-card">
      <img class="promo-card__img" src="${p.foto_url}" alt="${p.descripcion || ''}">
      <div class="promo-card__body">
        ${al?.categoria ? `<div class="promo-card__cat">${al.categoria}</div>` : ''}
        <div class="promo-card__nombre">${al?.nombre || ''}</div>
        <p class="promo-card__desc">${p.descripcion || ''}</p>
      </div>
    </div>`;
  }).join('');
  wrap.style.display = 'block';
  // El elemento estaba display:none al cargar la página, así que el
  // IntersectionObserver de fade-up nunca lo pudo "ver" a tiempo -- se
  // revela directo, igual que el hero, en vez de depender del scroll.
  requestAnimationFrame(() => wrap.classList.add('is-in'));

  // En celular: una tarjeta a todo el ancho, avanzando sola (el desfile
  // continuo de escritorio no cabe bien en pantallas chicas).
  if (window.matchMedia('(max-width: 600px)').matches) {
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % items.length;
      track.style.transform = `translateX(-${idx * 100}vw)`;
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarPlanesPub();
  cargarProgramasPub();
  cargarProfesionalesPub();
  cargarCarruselPromos();
});
