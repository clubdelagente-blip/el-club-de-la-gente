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

  grid.innerHTML = data.map((p, i) => {
    const wa = p.whatsapp ? p.whatsapp.replace(/\D/g, '') : '';
    const waUrl = wa ? `https://wa.me/57${wa}?text=${encodeURIComponent(`Hola ${p.nombre}, soy miembro de El Club de la Gente y me gustaría solicitar una cita contigo.`)}` : '';
    return `
    <div class="profe-card fade-up" style="--delay:${i * 60}ms">
      ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:12px">` : `<span style="width:72px;height:72px;border-radius:50%;background:var(--verde-soft,#e8f5ec);display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:24px;font-weight:700;color:var(--verde)">${(p.nombre||'P')[0]}</span>`}
      <div style="font-weight:600;font-size:15px;margin-bottom:4px">${p.nombre}</div>
      <div style="font-size:13px;opacity:.6;margin-bottom:8px">${p.area || ''}</div>
      <p style="font-size:13px;opacity:.6;line-height:1.5;margin-bottom:16px">${p.descripcion || ''}</p>
      ${waUrl ? `<a href="${waUrl}" target="_blank" rel="noopener" class="btn btn--primario" style="font-size:13px;padding:10px 18px;display:inline-flex;align-items:center;gap:8px;text-decoration:none">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.335-1.502A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.898 0-3.67-.523-5.188-1.432l-.372-.22-3.762.892.952-3.67-.242-.383A9.937 9.937 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        Solicitar cita
      </a>` : ''}
    </div>`;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarAliadosPub();
  cargarProgramasPub();
  cargarProfesionalesPub();
});
