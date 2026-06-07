/* ============================================================
   EL CLUB DE LA GENTE — Admin CMS
   CRUD para aliados, anuncios y programas con Supabase Storage
   ============================================================ */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  "https://egwaedadpqfwnbfosiao.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2FlZGFkcHFmd25iZm9zaWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njc2ODcsImV4cCI6MjA5NjM0MzY4N30.NrBPX8HhTcs_y-QG3o_GoEAednFc0TqUunkQe1dblT4"
);

const $ = (s, c = document) => c.querySelector(s);
const ic = (n) => `<i data-lucide="${n}"></i>`;

let _aliados = [];
let _anuncios = [];
let _programas = [];

/* ---------- Toast ---------- */
function adToast(msg) {
  const t = $("#ad-toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("is-show");
  setTimeout(() => t.classList.remove("is-show"), 3000);
}

/* ---------- Subir imagen a Storage ---------- */
async function subirImagen(file) {
  const ext = file.name.split('.').pop();
  const nombre = `${Date.now()}-${Math.random().toString(36).substr(2,6)}.${ext}`;
  const { error } = await supabase.storage.from('contenido').upload(nombre, file, { cacheControl: '3600' });
  if (error) throw error;
  const { data } = supabase.storage.from('contenido').getPublicUrl(nombre);
  return data.publicUrl;
}

/* ---------- Modal ---------- */
function abrirModal(titulo, sub, bodyHtml) {
  $("#modal-title").textContent = titulo;
  $("#modal-sub").textContent = sub;
  $("#modal-body").innerHTML = bodyHtml;
  $("#ad-modal-ov").classList.add("is-open");
  if (window.lucide) lucide.createIcons();
}
function cerrarModal() {
  $("#ad-modal-ov").classList.remove("is-open");
}

/* ============================================================
   ALIADOS
   ============================================================ */
async function cargarAliados() {
  const { data } = await supabase.from('aliados').select('*').order('orden').order('created_at');
  _aliados = data || [];
  const tbody = $("#a-body");
  if (!tbody) return;

  if (!_aliados.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:rgba(242,240,234,.35)">No hay aliados. Agrega el primero con el botón verde.</td></tr>`;
    return;
  }

  tbody.innerHTML = _aliados.map(a => `
    <tr>
      <td>
        <div class="ad-cell-user">
          ${a.imagen_url
            ? `<img src="${a.imagen_url}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0">`
            : `<span class="ad-av">${(a.nombre||'?')[0].toUpperCase()}</span>`}
          <div class="ad-cell-user__name">${a.nombre}</div>
        </div>
      </td>
      <td><span class="ad-table__num">${a.categoria || '—'}</span></td>
      <td><span class="ad-num-strong verde">${a.descuento || '—'}</span></td>
      <td>${a.whatsapp || '—'}</td>
      <td style="text-align:right">
        <div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
          <span class="ad-pill ${a.activo ? 'activo' : 'inactivo'}" data-toggle-aliado="${a.id}" data-activo="${a.activo}" style="cursor:pointer">
            <span class="d"></span>${a.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button class="ad-btn" data-edit-aliado="${a.id}">${ic("pencil")}</button>
          <button class="ad-btn" data-del-aliado="${a.id}">${ic("trash-2")}</button>
        </div>
      </td>
    </tr>`).join('');
  if (window.lucide) lucide.createIcons();
}

function formAliado(a = {}) {
  return `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="ad-field"><label>Nombre del negocio *</label>
        <input id="cms-nombre" type="text" value="${a.nombre||''}" placeholder="Ej: Café del Parque"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="ad-field"><label>Categoría</label>
          <input id="cms-cat" type="text" value="${a.categoria||''}" placeholder="Ej: Restaurante"></div>
        <div class="ad-field"><label>Descuento</label>
          <input id="cms-dsc" type="text" value="${a.descuento||''}" placeholder="Ej: 20%"></div>
      </div>
      <div class="ad-field"><label>Descripción</label>
        <textarea id="cms-desc" rows="3" placeholder="Describe el negocio y sus beneficios">${a.descripcion||''}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="ad-field"><label>WhatsApp</label>
          <input id="cms-wa" type="tel" value="${a.whatsapp||''}" placeholder="300 000 0000"></div>
        <div class="ad-field"><label>Dirección</label>
          <input id="cms-dir" type="text" value="${a.direccion||''}" placeholder="Calle, barrio"></div>
      </div>
      <div class="ad-field"><label>Imagen</label>
        ${a.imagen_url ? `<img src="${a.imagen_url}" style="width:100%;max-height:130px;object-fit:cover;border-radius:8px;margin-bottom:8px">` : ''}
        <input id="cms-img" type="file" accept="image/*" style="font-size:13px">
        <input type="hidden" id="cms-img-url" value="${a.imagen_url||''}"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
        <button class="ad-btn" id="cms-cancel">Cancelar</button>
        <button class="ad-btn ad-btn--verde" id="cms-save" data-id="${a.id||''}">
          ${ic("save")} ${a.id ? 'Guardar cambios' : 'Agregar aliado'}
        </button>
      </div>
    </div>`;
}

function bindAliado() {
  setTimeout(() => {
    $("#cms-cancel")?.addEventListener('click', cerrarModal);
    $("#cms-save")?.addEventListener('click', async () => {
      const nombre = $("#cms-nombre")?.value.trim();
      if (!nombre) { adToast('El nombre es obligatorio'); return; }
      const btn = $("#cms-save");
      const id = btn.dataset.id;
      btn.disabled = true; btn.innerHTML = `${ic("loader")} Guardando…`;
      if (window.lucide) lucide.createIcons();

      let imagen_url = $("#cms-img-url")?.value || null;
      const file = $("#cms-img")?.files?.[0];
      if (file) { try { imagen_url = await subirImagen(file); } catch(_) { adToast('Error al subir imagen'); } }

      const payload = {
        nombre,
        categoria: $("#cms-cat")?.value.trim() || null,
        descuento: $("#cms-dsc")?.value.trim() || null,
        descripcion: $("#cms-desc")?.value.trim() || null,
        whatsapp: $("#cms-wa")?.value.trim() || null,
        direccion: $("#cms-dir")?.value.trim() || null,
        imagen_url,
      };

      if (id) await supabase.from('aliados').update(payload).eq('id', id);
      else await supabase.from('aliados').insert(payload);

      cerrarModal();
      cargarAliados();
      adToast(id ? 'Aliado actualizado ✓' : 'Aliado agregado ✓');
    });
    if (window.lucide) lucide.createIcons();
  }, 50);
}

/* ============================================================
   ANUNCIOS
   ============================================================ */
async function cargarAnuncios() {
  const { data } = await supabase.from('anuncios').select('*').order('created_at', { ascending: false });
  _anuncios = data || [];
  const panel = $("#p-contenido");
  if (!panel) return;

  const lista = _anuncios.length
    ? _anuncios.map(a => `
        <div style="display:flex;align-items:flex-start;gap:14px;padding:16px;background:rgba(242,240,234,.04);border:1px solid rgba(242,240,234,.08);border-radius:10px;margin-bottom:10px">
          ${a.imagen_url ? `<img src="${a.imagen_url}" style="width:70px;height:70px;object-fit:cover;border-radius:6px;flex-shrink:0">` : ''}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:15px;margin-bottom:4px">${a.titulo}</div>
            <div style="font-size:13px;color:rgba(242,240,234,.5);line-height:1.5;white-space:pre-line">${a.contenido||''}</div>
            <div style="font-size:11px;color:rgba(242,240,234,.3);margin-top:6px">${new Date(a.created_at).toLocaleDateString('es-CO')}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="ad-btn" data-edit-an="${a.id}">${ic("pencil")}</button>
            <button class="ad-btn" data-del-an="${a.id}">${ic("trash-2")}</button>
          </div>
        </div>`).join('')
    : `<p style="text-align:center;padding:40px;color:rgba(242,240,234,.35)">No hay anuncios. Crea el primero.</p>`;

  panel.innerHTML = `
    <div class="ad-toolbar"><div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="an-add">${ic("plus")} Nuevo anuncio</button>
    </div>
    <div id="anuncios-lista">${lista}</div>`;
  if (window.lucide) lucide.createIcons();
}

function formAnuncio(a = {}) {
  return `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="ad-field"><label>Título *</label>
        <input id="an-titulo" type="text" value="${a.titulo||''}" placeholder="Ej: Nuevo aliado esta semana"></div>
      <div class="ad-field"><label>Contenido</label>
        <textarea id="an-cont" rows="4" placeholder="Describe la novedad">${a.contenido||''}</textarea></div>
      <div class="ad-field"><label>Imagen (opcional)</label>
        ${a.imagen_url ? `<img src="${a.imagen_url}" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px">` : ''}
        <input id="an-img" type="file" accept="image/*" style="font-size:13px">
        <input type="hidden" id="an-img-url" value="${a.imagen_url||''}"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
        <button class="ad-btn" id="an-cancel">Cancelar</button>
        <button class="ad-btn ad-btn--verde" id="an-save" data-id="${a.id||''}">
          ${ic("save")} ${a.id ? 'Guardar cambios' : 'Publicar anuncio'}
        </button>
      </div>
    </div>`;
}

function bindAnuncio() {
  setTimeout(() => {
    $("#an-cancel")?.addEventListener('click', cerrarModal);
    $("#an-save")?.addEventListener('click', async () => {
      const titulo = $("#an-titulo")?.value.trim();
      if (!titulo) { adToast('El título es obligatorio'); return; }
      const btn = $("#an-save");
      const id = btn.dataset.id;
      btn.disabled = true;

      let imagen_url = $("#an-img-url")?.value || null;
      const file = $("#an-img")?.files?.[0];
      if (file) { try { imagen_url = await subirImagen(file); } catch(_) { adToast('Error al subir imagen'); } }

      const payload = { titulo, contenido: $("#an-cont")?.value.trim() || null, imagen_url };

      if (id) await supabase.from('anuncios').update(payload).eq('id', id);
      else await supabase.from('anuncios').insert(payload);

      cerrarModal();
      cargarAnuncios();
      adToast(id ? 'Anuncio actualizado ✓' : 'Anuncio publicado ✓');
    });
    if (window.lucide) lucide.createIcons();
  }, 50);
}

/* ============================================================
   PROGRAMAS
   ============================================================ */
async function cargarProgramas() {
  const { data } = await supabase.from('programas').select('*').order('orden').order('created_at');
  _programas = data || [];
  const panel = $("#p-programas");
  if (!panel) return;

  const lista = _programas.length
    ? _programas.map(p => `
        <div style="display:flex;align-items:flex-start;gap:14px;padding:16px;background:rgba(242,240,234,.04);border:1px solid rgba(242,240,234,.08);border-radius:10px;margin-bottom:10px">
          ${p.imagen_url
            ? `<img src="${p.imagen_url}" style="width:70px;height:70px;object-fit:cover;border-radius:6px;flex-shrink:0">`
            : `<span class="ad-av">${(p.nombre||'P')[0].toUpperCase()}</span>`}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:15px;margin-bottom:4px">${p.nombre}</div>
            <div style="font-size:13px;color:rgba(242,240,234,.5);line-height:1.5">${p.descripcion||''}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            <span class="ad-pill ${p.activo ? 'activo' : 'inactivo'}" data-toggle-prog="${p.id}" data-activo="${p.activo}" style="cursor:pointer">
              <span class="d"></span>${p.activo ? 'Activo' : 'Inactivo'}
            </span>
            <button class="ad-btn" data-edit-prog="${p.id}">${ic("pencil")}</button>
            <button class="ad-btn" data-del-prog="${p.id}">${ic("trash-2")}</button>
          </div>
        </div>`).join('')
    : `<p style="text-align:center;padding:40px;color:rgba(242,240,234,.35)">No hay programas. Crea el primero.</p>`;

  panel.innerHTML = `
    <div class="ad-toolbar"><div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="prog-cms-add">${ic("plus")} Nuevo programa</button>
    </div>
    <div id="programas-lista">${lista}</div>`;
  if (window.lucide) lucide.createIcons();
}

function formProg(p = {}) {
  return `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="ad-field"><label>Nombre del programa *</label>
        <input id="prog-nombre" type="text" value="${p.nombre||''}" placeholder="Ej: Rescate Animal Fusagasugá"></div>
      <div class="ad-field"><label>Descripción</label>
        <textarea id="prog-desc" rows="4" placeholder="Describe el programa social">${p.descripcion||''}</textarea></div>
      <div class="ad-field"><label>Imagen (opcional)</label>
        ${p.imagen_url ? `<img src="${p.imagen_url}" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px">` : ''}
        <input id="prog-img" type="file" accept="image/*" style="font-size:13px">
        <input type="hidden" id="prog-img-url" value="${p.imagen_url||''}"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:4px">
        <button class="ad-btn" id="prog-cancel">Cancelar</button>
        <button class="ad-btn ad-btn--verde" id="prog-save" data-id="${p.id||''}">
          ${ic("save")} ${p.id ? 'Guardar cambios' : 'Crear programa'}
        </button>
      </div>
    </div>`;
}

function bindProg() {
  setTimeout(() => {
    $("#prog-cancel")?.addEventListener('click', cerrarModal);
    $("#prog-save")?.addEventListener('click', async () => {
      const nombre = $("#prog-nombre")?.value.trim();
      if (!nombre) { adToast('El nombre es obligatorio'); return; }
      const btn = $("#prog-save");
      const id = btn.dataset.id;
      btn.disabled = true;

      let imagen_url = $("#prog-img-url")?.value || null;
      const file = $("#prog-img")?.files?.[0];
      if (file) { try { imagen_url = await subirImagen(file); } catch(_) { adToast('Error al subir imagen'); } }

      const payload = { nombre, descripcion: $("#prog-desc")?.value.trim() || null, imagen_url };

      if (id) await supabase.from('programas').update(payload).eq('id', id);
      else await supabase.from('programas').insert(payload);

      cerrarModal();
      cargarProgramas();
      adToast(id ? 'Programa actualizado ✓' : 'Programa creado ✓');
    });
    if (window.lucide) lucide.createIcons();
  }, 50);
}

/* ============================================================
   EVENT DELEGATION GLOBAL
   ============================================================ */
document.addEventListener('click', async (e) => {
  // Modal cerrar
  if (e.target.closest('#modal-close') || e.target.id === 'ad-modal-ov') { cerrarModal(); return; }

  // ---- ALIADOS ----
  if (e.target.closest('#a-add')) { abrirModal('Nuevo aliado', 'Agrega un negocio a la red del Club', formAliado()); bindAliado(); return; }

  const editA = e.target.closest('[data-edit-aliado]');
  if (editA) {
    const a = _aliados.find(x => x.id === editA.dataset.editAliado);
    if (a) { abrirModal('Editar aliado', a.nombre, formAliado(a)); bindAliado(); }
    return;
  }

  const togA = e.target.closest('[data-toggle-aliado]');
  if (togA) {
    const activo = togA.dataset.activo === 'true';
    await supabase.from('aliados').update({ activo: !activo }).eq('id', togA.dataset.toggleAliado);
    cargarAliados();
    return;
  }

  const delA = e.target.closest('[data-del-aliado]');
  if (delA && confirm('¿Eliminar este aliado?')) {
    await supabase.from('aliados').delete().eq('id', delA.dataset.delAliado);
    cargarAliados(); adToast('Aliado eliminado'); return;
  }

  // ---- ANUNCIOS ----
  if (e.target.closest('#an-add')) { abrirModal('Nuevo anuncio', 'Publica una novedad', formAnuncio()); bindAnuncio(); return; }

  const editAn = e.target.closest('[data-edit-an]');
  if (editAn) {
    const a = _anuncios.find(x => x.id === editAn.dataset.editAn);
    if (a) { abrirModal('Editar anuncio', a.titulo, formAnuncio(a)); bindAnuncio(); }
    return;
  }

  const delAn = e.target.closest('[data-del-an]');
  if (delAn && confirm('¿Eliminar este anuncio?')) {
    await supabase.from('anuncios').delete().eq('id', delAn.dataset.delAn);
    cargarAnuncios(); adToast('Anuncio eliminado'); return;
  }

  // ---- PROGRAMAS ----
  if (e.target.closest('#prog-cms-add')) { abrirModal('Nuevo programa', 'Agrega un programa social', formProg()); bindProg(); return; }

  const editP = e.target.closest('[data-edit-prog]');
  if (editP) {
    const p = _programas.find(x => x.id === editP.dataset.editProg);
    if (p) { abrirModal('Editar programa', p.nombre, formProg(p)); bindProg(); }
    return;
  }

  const togP = e.target.closest('[data-toggle-prog]');
  if (togP) {
    const activo = togP.dataset.activo === 'true';
    await supabase.from('programas').update({ activo: !activo }).eq('id', togP.dataset.toggleProg);
    cargarProgramas();
    return;
  }

  const delP = e.target.closest('[data-del-prog]');
  if (delP && confirm('¿Eliminar este programa?')) {
    await supabase.from('programas').delete().eq('id', delP.dataset.delProg);
    cargarProgramas(); adToast('Programa eliminado'); return;
  }
});

/* ============================================================
   INIT — escuchar navegación del admin
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ad-link[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      if (panel === 'aliados')   setTimeout(cargarAliados,  100);
      if (panel === 'contenido') setTimeout(cargarAnuncios, 100);
      if (panel === 'programas') setTimeout(cargarProgramas, 100);
    });
  });
});
