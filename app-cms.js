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
      descuentos: [{ pct: a.descuento || '', nombre: 'Descuento para miembros', desc: '' }],
    })));
  }

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

document.addEventListener('DOMContentLoaded', () => {
  cargarAliadosPub();
  cargarProgramasPub();
  cargarProfesionalesPub();
});
