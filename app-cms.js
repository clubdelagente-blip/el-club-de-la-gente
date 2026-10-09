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
const ICON_WA = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 2C6.486 2 2 6.486 2 12.004c0 2.123.666 4.09 1.804 5.714L2.5 22l4.418-1.265A9.955 9.955 0 0 0 12.004 22C17.522 22 22 17.514 22 12.004 22 6.486 17.522 2 12.004 2zm0 18.18a8.14 8.14 0 0 1-4.15-1.136l-.298-.177-3.11.89.903-3.03-.194-.31a8.15 8.15 0 0 1-1.25-4.413c0-4.5 3.66-8.157 8.1-8.157 4.44 0 8.09 3.656 8.09 8.157 0 4.5-3.65 8.176-8.09 8.176z"/></svg>`;

/* Color por categoría -- mismo mapeo que directorio.js, para que el borde
   de cada tarjeta del carrusel combine con el color de su categoría. */
const COLORES_CAT = [
  [/odont/i, "#4FA8E0"], [/veterinar|mascota/i, "#F5B942"], [/turis/i, "#2FA76F"],
  [/canasta|fruver|mercado|supermercado/i, "#8BC53F"], [/ropa|moda|accesorio/i, "#9B6BD9"],
  [/helad/i, "#FF7AA8"], [/comida|restaurante|cafeter/i, "#FF9F45"], [/barber/i, "#1E88A8"],
  [/bienestar|salud|spa/i, "#FF6B5C"], [/belleza|estetic/i, "#E85D9E"],
  [/educaci|tutor/i, "#5B6EE1"], [/deporte|gym/i, "#F4511E"], [/tecnolog/i, "#00BCD4"],
  [/regalo/i, "#EAB749"],
];
function colorCategoria(categoria) {
  const c = categoria || "";
  for (const [rx, color] of COLORES_CAT) if (rx.test(c)) return color;
  return "#095544";
}

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
let PLANES_LANDING = {}; // slug -> fila de "planes", para poblar el modal de ClubCard

function tarjetaPlanHtml(p, i) {
  const esPremium = p.slug === "premium";
  const esVitalicia = p.slug === "vitalicia";
  const claseSlug = esPremium ? "plan--premium" : esVitalicia ? "plan--vitalicia" : p.slug === "gratis" ? "plan--gratis" : "plan--basica";

  return `
    <article class="plan ${claseSlug} fade-up" data-cc-modal="${p.slug}" style="--delay:${i * 60}ms;cursor:pointer">
      ${p.recomendado ? `<span class="plan__badge-rec" id="badge-rec">Recomendado</span>` : ""}
      <span class="plan__tag">${p.tag}</span>
      ${p.ribbon_texto ? `<span style="display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:#095544;color:#fff;padding:7px 14px;border-radius:100px;margin-top:12px;">${p.ribbon_texto}</span>` : ""}
      ${(p.antes_texto || p.ahorra_texto) ? `<div class="plan__precio-row">
        ${p.antes_texto ? `<span class="plan__antes">${p.antes_texto}</span>` : ""}
        ${p.ahorra_texto ? `<span class="plan__ahorra">${p.ahorra_texto}</span>` : ""}
      </div>` : ""}
      <div class="plan__precio">${p.precio_texto}<small> ${p.precio_sufijo || ""}</small></div>
      <div class="plan__ciclo">${p.ciclo_texto || ""}</div>
      <ul class="plan__beneficios">
        ${(p.beneficios || []).map(b => `<li><span class="dot"></span>${b}</li>`).join("")}
      </ul>
      <button type="button" class="plan__cc-toggle">Ver mi ClubCard ${ic('credit-card')}</button>
    </article>`;
}

/* ---------- Modal compartido de ClubCard (una sola tarjeta, misma altura siempre) ---------- */
function crearModalClubCard() {
  if (document.getElementById('cc-modal-ov')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="cc-modal-ov" id="cc-modal-ov">
      <div class="cc-modal">
        <button type="button" class="cc-modal__close" id="cc-modal-close">${ic('x')}</button>
        <div class="ccv2" id="cc-modal-ccv2">
          <div class="ccv2__flip" id="cc-modal-flip">
            <div class="ccv2-card ccv2-card--front">
              <img src="marco-card.png" class="ccv2-frame-img" alt="">
              <div class="ccv2-front__in">
                <span class="ccv2-brand">CLUBCARD</span>
                <div class="ccv2-mid"><img src="logo-club.png" class="ccv2-logo-img" alt=""></div>
                <div class="ccv2-footer">
                  <div class="ccv2-name">TU NOMBRE AQUÍ</div>
                  <div class="ccv2-codigo"><span class="ccv2-codigo__lbl">Código:</span><span class="ccv2-codigo__val">300 000 0000</span></div>
                </div>
              </div>
            </div>
            <div class="ccv2-card ccv2-card--back">
              <img src="marco-ornamento.png" class="ccv2-orn-img" alt="">
              <div class="ccv2-back__in">
                <div class="ccv2-back__qr">${ic('qr-code')}</div>
                <p class="ccv2-back__txt">Con este código QR exclusivo puedes acceder a todas las promociones que tenemos para ti y más sorpresas.</p>
              </div>
            </div>
          </div>
        </div>
        <p class="cc-modal__hint">Toca la tarjeta para voltearla</p>
        <div class="cc-modal__urgencia" id="cc-modal-urgencia" hidden>🚀 Últimos días de promo por lanzamiento</div>
        <a class="btn btn--primario" id="cc-modal-cta" href="#" style="width:100%;text-align:center">Comprar</a>
      </div>
    </div>`);
  if (window.lucide) lucide.createIcons();

  const ov = document.getElementById('cc-modal-ov');
  const cerrar = () => ov.classList.remove('is-open');
  document.getElementById('cc-modal-close')?.addEventListener('click', cerrar);
  ov.addEventListener('click', (e) => { if (e.target === ov) cerrar(); });
  document.getElementById('cc-modal-flip')?.addEventListener('click', () => {
    document.getElementById('cc-modal-flip').classList.toggle('is-back');
  });
}

function abrirModalClubCard(slug) {
  const p = PLANES_LANDING[slug];
  if (!p) return;
  crearModalClubCard();

  const ccv2 = document.getElementById('cc-modal-ccv2');
  ccv2.className = 'ccv2 ccv2--' + slug;
  document.getElementById('cc-modal-flip')?.classList.remove('is-back');

  const esPago = slug === 'basica' || slug === 'premium';
  const urgencia = document.getElementById('cc-modal-urgencia');
  if (urgencia) urgencia.hidden = !esPago;

  const cta = document.getElementById('cc-modal-cta');
  if (cta) {
    cta.textContent = esPago ? 'Comprar' : 'Unirme gratis';
    cta.href = esPago ? `Registro.html?plan=${slug}&comprar=1` : 'Registro.html?modo=registro';
  }

  document.getElementById('cc-modal-ov')?.classList.add('is-open');
}

async function cargarPlanesPub() {
  const { data, error } = await supabase.from('planes').select('*').order('orden');
  if (error || !data?.length) return; // sin datos: deja el contenido estático de respaldo tal cual

  const cont = document.querySelector('.planes');
  if (!cont) return;
  // La vitalicia no se "elige" con clic — se gana con 5 referidos, igual que en Planes.html
  const planesVisibles = data.filter(p => p.slug !== 'vitalicia');
  PLANES_LANDING = Object.fromEntries(data.map(p => [p.slug, p]));
  cont.innerHTML = planesVisibles.map(tarjetaPlanHtml).join('');
  if (window.lucide) lucide.createIcons();

  cont.querySelectorAll('[data-cc-modal]').forEach(card => {
    card.addEventListener('click', () => abrirModalClubCard(card.dataset.ccModal));
  });
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

  const LIMITE = 6;
  const tarjeta = p => `
    <div class="programa-card fade-up">
      ${p.imagen_url ? `
      <div class="programa-card__img-wrap">
        <img src="${p.imagen_url}" alt="${p.nombre}" style="width:100%;height:180px;object-fit:cover;display:block">
        ${p.categoria ? `<span class="programa-card__cat">${p.categoria}</span>` : ''}
      </div>` : ''}
      <div style="padding:20px">
        <h3 style="font-family:var(--display);font-size:20px;font-weight:600;margin-bottom:8px;color:inherit">${p.nombre}</h3>
        <p style="font-size:14px;opacity:.7;line-height:1.6">${p.descripcion || ''}</p>
      </div>
    </div>`;

  grid.innerHTML = data.slice(0, LIMITE).map(tarjeta).join('');
  if (window.lucide) lucide.createIcons();

  if (data.length > LIMITE) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'programas-ver-mas';
    btn.className = 'btn btn--secundario';
    btn.textContent = `Ver ${data.length - LIMITE} programas más`;
    btn.addEventListener('click', () => {
      grid.insertAdjacentHTML('beforeend', data.slice(LIMITE).map(tarjeta).join(''));
      if (window.lucide) lucide.createIcons();
      btn.remove();
    });
    grid.insertAdjacentElement('afterend', btn);
  }
}

/* ---------- Profesionales ---------- */
async function cargarProfesionalesPub() {
  const { data, error } = await supabase
    .from('profesionales')
    .select('*')
    .eq('activo', true)
    .eq('mostrar_landing', true)
    .order('created_at', { ascending: true });

  if (error || !data?.length) return;

  const grid = document.querySelector('#profesionales-grid');
  if (!grid) return;
  const seccion = document.querySelector('#profesionales');
  if (seccion) seccion.style.display = '';

  grid.innerHTML = data.map((p, i) => `
    <div class="profe-card fade-up" style="--delay:${i * 60}ms">
      ${p.imagen_url ? `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:12px">` : `<span style="width:72px;height:72px;border-radius:50%;background:var(--verde-soft,#e8f5ec);display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:24px;font-weight:700;color:var(--verde)">${(p.nombre||'P')[0]}</span>`}
      <div style="font-weight:600;font-size:15px;margin-bottom:4px">${p.nombre}</div>
      <div style="font-size:13px;opacity:.6;margin-bottom:8px">${p.area || ''}</div>
      <p style="font-size:13px;opacity:.6;line-height:1.5">${p.descripcion || ''}</p>
    </div>`).join('');

  if (window.lucide) lucide.createIcons();
}

/* ---------- Eventos educativos (próximos + historial) ---------- */
function tarjetaEvento(e, confirmados) {
  const fechaFmt = new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const facil = e.facilitadores_educacion;
  const cat = e.categorias_educacion?.nombre;

  let badgeCupo = '';
  if (e.cupo_maximo) {
    const restantes = e.cupo_maximo - confirmados;
    badgeCupo = restantes > 0
      ? `<span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:#fff4e5;color:#b9770e;white-space:nowrap">🔥 Quedan ${restantes} cupos</span>`
      : `<span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;background:#fdeaea;color:#c0392b;white-space:nowrap">Cupos agotados</span>`;
  }

  return `
    <div class="programa-card fade-up">
      <div class="programa-card__img-wrap">
        <img src="${e.imagen_url || 'icon-club.png'}" alt="${e.titulo}" style="width:100%;height:160px;object-fit:cover;display:block">
        ${cat ? `<span class="programa-card__cat">${cat}</span>` : ''}
      </div>
      <div style="padding:20px">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:10px">
          <span style="font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;background:var(--verde-soft,#e8f5ee);color:var(--verde,#095544)">${fechaFmt}</span>
          ${badgeCupo}
        </div>
        <h3 style="font-family:var(--display);font-size:19px;font-weight:600;margin-bottom:8px">${e.titulo}</h3>
        ${e.descripcion ? `<p style="font-size:13.5px;opacity:.7;line-height:1.6;margin-bottom:14px">${e.descripcion}</p>` : ''}
        ${facil?.nombre ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          ${facil.foto_url
            ? `<img src="${facil.foto_url}" alt="${facil.nombre}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`
            : `<span style="width:28px;height:28px;border-radius:50%;background:var(--verde-soft,#e8f5ec);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--verde)">${facil.nombre[0]}</span>`}
          <span style="font-size:13px;opacity:.6">Dictado por ${facil.nombre}</span>
        </div>` : ''}
        <a href="Registro.html?modo=registro" class="btn btn--primario" style="width:100%;justify-content:center">Únete gratis para participar &rarr;</a>
      </div>
    </div>`;
}

function tarjetaHistorialEvento(e) {
  const fechaFmt = new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  return `
    <div class="historial-edu-card">
      ${e.imagen_url
        ? `<img src="${e.imagen_url}" alt="${e.titulo}">`
        : `<div style="height:120px;background:var(--verde-soft,#e8f5ec);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:var(--verde)">${(e.titulo || 'E')[0]}</div>`}
      <div class="historial-edu-card__body">
        <div style="font-size:11px;color:rgba(0,0,0,.45);margin-bottom:4px">${fechaFmt}</div>
        <div style="font-size:13.5px;font-weight:600;line-height:1.3">${e.titulo}</div>
      </div>
    </div>`;
}

async function cargarEventosEducativosPub() {
  const seccion = document.querySelector('#educacion');
  const grid = document.querySelector('#eventos-edu-grid');
  const histWrap = document.querySelector('#eventos-edu-historial-wrap');
  const histTrack = document.querySelector('#eventos-edu-historial');
  if (!seccion || !grid) return;

  const hoy = new Date().toISOString().slice(0, 10);
  const SEL = '*, facilitadores_educacion(nombre, foto_url), categorias_educacion(nombre)';

  const [{ data: proximos }, { data: historial }] = await Promise.all([
    supabase.from('eventos_educacion').select(SEL).eq('activo', true).gte('fecha', hoy).order('fecha', { ascending: true }).limit(6),
    supabase.from('eventos_educacion').select(SEL).eq('activo', true).lt('fecha', hoy).order('fecha', { ascending: false }).limit(8),
  ]);

  if (!proximos?.length && !historial?.length) return;

  let confirmadosMap = new Map();
  const idsConCupo = (proximos || []).filter(e => e.cupo_maximo).map(e => e.id);
  if (idsConCupo.length) {
    const { data: confs } = await supabase.from('confirmaciones_evento').select('evento_id').in('evento_id', idsConCupo);
    (confs || []).forEach(c => confirmadosMap.set(c.evento_id, (confirmadosMap.get(c.evento_id) || 0) + 1));
  }

  if (proximos?.length) {
    grid.innerHTML = proximos.map(e => tarjetaEvento(e, confirmadosMap.get(e.id) || 0)).join('');
  }

  if (historial?.length && histWrap && histTrack) {
    histTrack.innerHTML = historial.map(tarjetaHistorialEvento).join('');
    histWrap.style.display = '';
  }

  seccion.style.display = '';
  if (window.lucide) lucide.createIcons();
}

/* ---------- Bolsa de trabajo ---------- */
async function cargarVacantesPub() {
  const seccion = document.querySelector('#bolsa-trabajo');
  const grid = document.querySelector('#bolsa-grid');
  if (!seccion || !grid) return;

  const { data, error } = await supabase
    .from('vacantes')
    .select('*, aliados(nombre, imagen_url)')
    .eq('estado', 'aprobada')
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error || !data?.length) return;

  grid.innerHTML = data.map((v, i) => `
    <div class="profe-card fade-up" style="--delay:${i * 60}ms">
      ${v.aliados?.imagen_url ? `<img src="${v.aliados.imagen_url}" alt="${v.aliados.nombre || ''}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;margin-bottom:12px">` : `<span style="width:56px;height:56px;border-radius:10px;background:var(--verde-soft,#e8f5ec);display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:20px;font-weight:700;color:var(--verde)">${(v.aliados?.nombre || 'V')[0]}</span>`}
      <div style="font-weight:600;font-size:15px;margin-bottom:4px">${v.titulo}</div>
      <div style="font-size:13px;opacity:.6;margin-bottom:8px">${v.aliados?.nombre || ''}</div>
      ${v.descripcion ? `<p style="font-size:13px;opacity:.6;line-height:1.5;margin-bottom:14px">${v.descripcion}</p>` : ''}
      <a class="btn btn--primario" style="width:100%;justify-content:center" target="_blank" href="https://wa.me/57${v.whatsapp}?text=${encodeURIComponent('Hola, vi la vacante de ' + v.titulo + ' en El Club de la Gente')}">${ICON_WA}Escribir por WhatsApp</a>
    </div>`).join('');

  seccion.style.display = '';
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
    const esFlyer = (p.foto_url || '').includes('flyer=1');
    if (esFlyer) {
      return `
      <div class="promo-card" style="--pc-cc:${colorCategoria(al?.categoria)}">
        <img class="promo-card__img" src="${p.foto_url}" alt="${p.descripcion || ''}" style="height:auto;aspect-ratio:4/5;object-fit:cover">
      </div>`;
    }
    return `
    <div class="promo-card" style="--pc-cc:${colorCategoria(al?.categoria)}">
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

  // En celular: una tarjeta a todo el ancho que salta sola a la siguiente
  // cada 2s (el desfile continuo de escritorio no cabe bien en pantallas
  // chicas). Tocarla la congela para leerla, y se puede arrastrar con el
  // dedo para moverse manualmente entre promociones.
  if (window.matchMedia('(max-width: 600px)').matches) {
    let idx = 0;
    let intervalId = null;
    let pausado = false;
    let arrastrando = false;
    let startX = 0;
    let deltaX = 0;

    function irA(i, animar) {
      idx = ((i % items.length) + items.length) % items.length;
      track.style.transition = animar ? 'transform .35s ease' : 'none';
      track.style.transform = `translateX(calc(-${idx * 100}vw + ${deltaX}px))`;
    }
    function detenerAuto() { if (intervalId) clearInterval(intervalId); intervalId = null; }
    function iniciarAuto() {
      detenerAuto();
      intervalId = setInterval(() => { if (!pausado && !arrastrando) irA(idx + 1, true); }, 2000);
    }

    track.addEventListener('touchstart', (e) => {
      pausado = true;
      arrastrando = true;
      startX = e.touches[0].clientX;
      deltaX = 0;
    }, { passive: true });
    track.addEventListener('touchmove', (e) => {
      if (!arrastrando) return;
      deltaX = e.touches[0].clientX - startX;
      irA(idx, false);
    }, { passive: true });
    track.addEventListener('touchend', () => {
      arrastrando = false;
      const umbral = window.innerWidth * 0.18;
      if (deltaX < -umbral) idx += 1;
      else if (deltaX > umbral) idx -= 1;
      deltaX = 0;
      irA(idx, true);
      setTimeout(() => { pausado = false; }, 2500);
    }, { passive: true });

    irA(0, false);
    iniciarAuto();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarPlanesPub();
  cargarProgramasPub();
  cargarProfesionalesPub();
  cargarEventosEducativosPub();
  cargarVacantesPub();
  cargarCarruselPromos();
});
