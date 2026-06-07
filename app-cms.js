/* ============================================================
   EL CLUB DE LA GENTE — CMS público
   Carga aliados y anuncios reales desde Supabase
   ============================================================ */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  "https://egwaedadpqfwnbfosiao.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2FlZGFkcHFmd25iZm9zaWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njc2ODcsImV4cCI6MjA5NjM0MzY4N30.NrBPX8HhTcs_y-QG3o_GoEAednFc0TqUunkQe1dblT4"
);

const $ = (s, c = document) => c.querySelector(s);
const ic = (n) => `<i data-lucide="${n}"></i>`;

/* ---------- Cargar aliados reales ---------- */
async function cargarAliadosPub() {
  const { data, error } = await supabase
    .from('aliados')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data?.length) return;

  // Buscar el grid de aliados en la página principal
  const grid = document.querySelector('.aliados__grid, #aliados-grid, [data-aliados-grid]');
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

  // Actualizar array global ALIADOS si existe (para el sheet)
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

/* ---------- Cargar anuncios ---------- */
async function cargarAnunciosPub() {
  const { data, error } = await supabase
    .from('anuncios')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error || !data?.length) return;

  // Buscar sección de noticias/anuncios si existe
  const sec = document.querySelector('#anuncios-pub, [data-anuncios]');
  if (!sec) return;

  sec.innerHTML = data.map(a => `
    <div class="anuncio-card fade-up">
      ${a.imagen_url ? `<img src="${a.imagen_url}" alt="${a.titulo}" style="width:100%;height:180px;object-fit:cover;border-radius:10px 10px 0 0">` : ''}
      <div style="padding:20px">
        <div style="font-size:11px;color:var(--verde);font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">
          ${new Date(a.created_at).toLocaleDateString('es-CO', { day:'numeric', month:'long' })}
        </div>
        <h3 style="font-family:var(--display);font-size:20px;font-weight:600;margin-bottom:8px">${a.titulo}</h3>
        <p style="font-size:14px;color:var(--tinta-60);line-height:1.6">${a.contenido || ''}</p>
      </div>
    </div>`).join('');

  if (window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarAliadosPub();
  cargarAnunciosPub();
});
