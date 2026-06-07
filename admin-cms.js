/* ============================================================
   EL CLUB DE LA GENTE — Admin CMS
   Sobreescribe funciones de admin.js para conectar Supabase
   ============================================================ */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  "https://egwaedadpqfwnbfosiao.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnd2FlZGFkcHFmd25iZm9zaWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Njc2ODcsImV4cCI6MjA5NjM0MzY4N30.NrBPX8HhTcs_y-QG3o_GoEAednFc0TqUunkQe1dblT4"
);

const $ = (s, c = document) => c.querySelector(s);
const ic = (n) => `<i data-lucide="${n}"></i>`;

let _aliados = [], _anuncios = [], _programas = [];

/* ---------- Toast ---------- */
function toast(msg) {
  const t = $("#ad-toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("is-show");
  setTimeout(() => t.classList.remove("is-show"), 3000);
}

/* ---------- Modal (usa el modal existente de admin.js) ---------- */
function abrirModal(titulo, sub, bodyHtml) {
  $("#modal-title").textContent = titulo;
  $("#modal-sub").textContent = sub;
  $("#modal-body").innerHTML = bodyHtml;
  $("#ad-modal-ov").classList.add("is-open");
  if (window.lucide) lucide.createIcons();
}

/* ---------- Subir imagen ---------- */
async function subirImagen(file) {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).substr(2,5)}.${ext}`;
  const { error } = await supabase.storage.from('contenido').upload(path, file);
  if (error) throw error;
  return supabase.storage.from('contenido').getPublicUrl(path).data.publicUrl;
}

/* ============================================================
   ALIADOS
   ============================================================ */
async function cargarAliados() {
  const { data } = await supabase.from('aliados').select('*').order('created_at', { ascending: false });
  _aliados = data || [];
  const tbody = $("#a-body");
  if (!tbody) return;
  if (!_aliados.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:rgba(242,240,234,.3)">Aún no hay aliados. Agrega el primero →</td></tr>`;
    return;
  }
  tbody.innerHTML = _aliados.map(a => `
    <tr>
      <td><div class="ad-cell-user">
        ${a.imagen_url ? `<img src="${a.imagen_url}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;flex-shrink:0">` : `<span class="ad-av">${(a.nombre||'?')[0]}</span>`}
        <div class="ad-cell-user__name">${a.nombre}</div>
      </div></td>
      <td><span class="ad-table__num">${a.categoria||'—'}</span></td>
      <td><span class="ad-num-strong verde">${a.descuento||'—'}</span></td>
      <td>${a.whatsapp||'—'}</td>
      <td style="text-align:right"><div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
        <span class="ad-pill ${a.activo?'activo':'inactivo'}" data-tog-aliado="${a.id}" data-activo="${a.activo}" style="cursor:pointer">
          <span class="d"></span>${a.activo?'Activo':'Inactivo'}</span>
        <button class="ad-btn" data-ed-aliado="${a.id}">${ic("pencil")}</button>
        <button class="ad-btn" data-rm-aliado="${a.id}">${ic("trash-2")}</button>
      </div></td>
    </tr>`).join('');
  if (window.lucide) lucide.createIcons();
}

function htmlFormAliado(a = {}) {
  return `
    <div class="ad-field"><label>Nombre del negocio *</label>
      <input id="fa-nombre" type="text" value="${(a.nombre||'').replace(/"/g,'&quot;')}" placeholder="Ej: Café del Parque"></div>
    <div class="ad-field-2">
      <div class="ad-field"><label>Categoría</label>
        <input id="fa-cat" type="text" value="${(a.categoria||'').replace(/"/g,'&quot;')}" placeholder="Ej: Restaurante"></div>
      <div class="ad-field"><label>Descuento</label>
        <input id="fa-dsc" type="text" value="${(a.descuento||'').replace(/"/g,'&quot;')}" placeholder="Ej: 20%"></div>
    </div>
    <div class="ad-field"><label>Descripción</label>
      <textarea id="fa-desc" rows="3" placeholder="Describe el negocio y sus beneficios para los miembros">${a.descripcion||''}</textarea></div>
    <div class="ad-field-2">
      <div class="ad-field"><label>WhatsApp</label>
        <input id="fa-wa" type="tel" value="${(a.whatsapp||'').replace(/"/g,'&quot;')}" placeholder="300 000 0000"></div>
      <div class="ad-field"><label>Dirección</label>
        <input id="fa-dir" type="text" value="${(a.direccion||'').replace(/"/g,'&quot;')}" placeholder="Calle, barrio"></div>
    </div>
    <div class="ad-field"><label>Foto del establecimiento</label>
      ${a.imagen_url ? `<img src="${a.imagen_url}" style="width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:10px">` : ''}
      <input id="fa-img" type="file" accept="image/*" style="font-size:13px;color:var(--txt-60)">
      <input type="hidden" id="fa-img-url" value="${a.imagen_url||''}"></div>
    <div class="ad-toolbar" style="margin:6px 0 0"><div class="ad-spacer"></div>
      <button class="ad-btn" id="fa-cancel">Cancelar</button>
      <button class="ad-btn ad-btn--verde" id="fa-save" data-id="${a.id||''}">${ic("check")} ${a.id?'Guardar cambios':'Agregar aliado'}</button>
    </div>`;
}

function bindFormAliado() {
  setTimeout(() => {
    $("#fa-cancel")?.addEventListener('click', () => window.cerrarModal?.());
    const btn = $("#fa-save");
    btn?.addEventListener('click', async () => {
      const nombre = $("#fa-nombre")?.value.trim();
      if (!nombre) { toast('El nombre es obligatorio'); return; }
      btn.disabled = true; btn.innerHTML = `${ic("loader")} Guardando…`;
      if (window.lucide) lucide.createIcons();

      let imagen_url = $("#fa-img-url")?.value || null;
      const file = $("#fa-img")?.files?.[0];
      if (file) try { imagen_url = await subirImagen(file); } catch(_) { toast('Error al subir imagen'); }

      const payload = {
        nombre,
        categoria:   $("#fa-cat")?.value.trim()  || null,
        descuento:   $("#fa-dsc")?.value.trim()  || null,
        descripcion: $("#fa-desc")?.value.trim() || null,
        whatsapp:    $("#fa-wa")?.value.trim()   || null,
        direccion:   $("#fa-dir")?.value.trim()  || null,
        imagen_url,
        activo: true,
      };

      const id = btn.dataset.id;
      const { error } = id
        ? await supabase.from('aliados').update(payload).eq('id', id)
        : await supabase.from('aliados').insert(payload);

      if (error) { toast('Error: ' + error.message); btn.disabled = false; return; }
      window.cerrarModal?.();
      cargarAliados();
      toast(id ? 'Aliado actualizado ✓' : 'Aliado agregado ✓');
    });
    if (window.lucide) lucide.createIcons();
  }, 80);
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
        <div style="display:flex;gap:14px;padding:16px;background:rgba(242,240,234,.04);border:1px solid rgba(242,240,234,.08);border-radius:10px;margin-bottom:10px">
          ${a.imagen_url ? `<img src="${a.imagen_url}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;flex-shrink:0">` : ''}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;margin-bottom:4px">${a.titulo}</div>
            <div style="font-size:13px;color:rgba(242,240,234,.5)">${a.contenido||''}</div>
            <div style="font-size:11px;color:rgba(242,240,234,.3);margin-top:6px">${new Date(a.created_at).toLocaleDateString('es-CO')}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="ad-btn" data-ed-an="${a.id}">${ic("pencil")}</button>
            <button class="ad-btn" data-rm-an="${a.id}">${ic("trash-2")}</button>
          </div>
        </div>`).join('')
    : `<p style="text-align:center;padding:40px;color:rgba(242,240,234,.3)">No hay anuncios aún.</p>`;

  panel.innerHTML = `
    <div class="ad-toolbar"><div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="btn-an-add">${ic("plus")} Nuevo anuncio</button>
    </div>${lista}`;
  if (window.lucide) lucide.createIcons();
}

function htmlFormAnuncio(a = {}) {
  return `
    <div class="ad-field"><label>Título *</label>
      <input id="an-tit" type="text" value="${(a.titulo||'').replace(/"/g,'&quot;')}" placeholder="Ej: Nuevo aliado esta semana"></div>
    <div class="ad-field"><label>Contenido</label>
      <textarea id="an-cont" rows="4" placeholder="Describe la novedad">${a.contenido||''}</textarea></div>
    <div class="ad-field"><label>Imagen (opcional)</label>
      ${a.imagen_url ? `<img src="${a.imagen_url}" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-bottom:10px">` : ''}
      <input id="an-img" type="file" accept="image/*" style="font-size:13px;color:var(--txt-60)">
      <input type="hidden" id="an-img-url" value="${a.imagen_url||''}"></div>
    <div class="ad-toolbar" style="margin:6px 0 0"><div class="ad-spacer"></div>
      <button class="ad-btn" id="an-cancel">Cancelar</button>
      <button class="ad-btn ad-btn--verde" id="an-save" data-id="${a.id||''}">${ic("check")} ${a.id?'Guardar cambios':'Publicar'}</button>
    </div>`;
}

function bindFormAnuncio() {
  setTimeout(() => {
    $("#an-cancel")?.addEventListener('click', () => window.cerrarModal?.());
    const btn = $("#an-save");
    btn?.addEventListener('click', async () => {
      const titulo = $("#an-tit")?.value.trim();
      if (!titulo) { toast('El título es obligatorio'); return; }
      btn.disabled = true;
      let imagen_url = $("#an-img-url")?.value || null;
      const file = $("#an-img")?.files?.[0];
      if (file) try { imagen_url = await subirImagen(file); } catch(_) {}
      const payload = { titulo, contenido: $("#an-cont")?.value.trim()||null, imagen_url };
      const id = btn.dataset.id;
      id ? await supabase.from('anuncios').update(payload).eq('id', id)
         : await supabase.from('anuncios').insert(payload);
      window.cerrarModal?.();
      cargarAnuncios();
      toast(id ? 'Anuncio actualizado ✓' : 'Anuncio publicado ✓');
    });
    if (window.lucide) lucide.createIcons();
  }, 80);
}

/* ============================================================
   PROGRAMAS
   ============================================================ */
async function cargarProgramas() {
  const { data } = await supabase.from('programas').select('*').order('created_at', { ascending: false });
  _programas = data || [];
  const panel = $("#p-programas");
  if (!panel) return;

  const lista = _programas.length
    ? _programas.map(p => `
        <div style="display:flex;gap:14px;padding:16px;background:rgba(242,240,234,.04);border:1px solid rgba(242,240,234,.08);border-radius:10px;margin-bottom:10px">
          ${p.imagen_url ? `<img src="${p.imagen_url}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;flex-shrink:0">` : `<span class="ad-av">${(p.nombre||'P')[0]}</span>`}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;margin-bottom:4px">${p.nombre}</div>
            <div style="font-size:13px;color:rgba(242,240,234,.5)">${p.descripcion||''}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            <span class="ad-pill ${p.activo?'activo':'inactivo'}" data-tog-prog="${p.id}" data-activo="${p.activo}" style="cursor:pointer">
              <span class="d"></span>${p.activo?'Activo':'Inactivo'}</span>
            <button class="ad-btn" data-ed-prog="${p.id}">${ic("pencil")}</button>
            <button class="ad-btn" data-rm-prog="${p.id}">${ic("trash-2")}</button>
          </div>
        </div>`).join('')
    : `<p style="text-align:center;padding:40px;color:rgba(242,240,234,.3)">No hay programas aún.</p>`;

  panel.innerHTML = `
    <div class="ad-toolbar"><div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="btn-prog-add">${ic("plus")} Nuevo programa</button>
    </div>${lista}`;
  if (window.lucide) lucide.createIcons();
}

function htmlFormProg(p = {}) {
  return `
    <div class="ad-field"><label>Nombre del programa *</label>
      <input id="pg-nom" type="text" value="${(p.nombre||'').replace(/"/g,'&quot;')}" placeholder="Ej: Rescate Animal Fusagasugá"></div>
    <div class="ad-field"><label>Descripción</label>
      <textarea id="pg-desc" rows="4" placeholder="Describe el programa social">${p.descripcion||''}</textarea></div>
    <div class="ad-field"><label>Imagen (opcional)</label>
      ${p.imagen_url ? `<img src="${p.imagen_url}" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-bottom:10px">` : ''}
      <input id="pg-img" type="file" accept="image/*" style="font-size:13px;color:var(--txt-60)">
      <input type="hidden" id="pg-img-url" value="${p.imagen_url||''}"></div>
    <div class="ad-toolbar" style="margin:6px 0 0"><div class="ad-spacer"></div>
      <button class="ad-btn" id="pg-cancel">Cancelar</button>
      <button class="ad-btn ad-btn--verde" id="pg-save" data-id="${p.id||''}">${ic("check")} ${p.id?'Guardar cambios':'Crear programa'}</button>
    </div>`;
}

function bindFormProg() {
  setTimeout(() => {
    $("#pg-cancel")?.addEventListener('click', () => window.cerrarModal?.());
    const btn = $("#pg-save");
    btn?.addEventListener('click', async () => {
      const nombre = $("#pg-nom")?.value.trim();
      if (!nombre) { toast('El nombre es obligatorio'); return; }
      btn.disabled = true;
      let imagen_url = $("#pg-img-url")?.value || null;
      const file = $("#pg-img")?.files?.[0];
      if (file) try { imagen_url = await subirImagen(file); } catch(_) {}
      const payload = { nombre, descripcion: $("#pg-desc")?.value.trim()||null, imagen_url };
      const id = btn.dataset.id;
      id ? await supabase.from('programas').update(payload).eq('id', id)
         : await supabase.from('programas').insert(payload);
      window.cerrarModal?.();
      cargarProgramas();
      toast(id ? 'Programa actualizado ✓' : 'Programa creado ✓');
    });
    if (window.lucide) lucide.createIcons();
  }, 80);
}

/* ============================================================
   PROFESIONALES
   ============================================================ */
let _profesionales = [];

async function cargarProfesionales() {
  const { data } = await supabase.from('profesionales').select('*').order('created_at', { ascending: false });
  _profesionales = data || [];
  const panel = $("#p-profesionales");
  if (!panel) return;

  const lista = _profesionales.length
    ? _profesionales.map(p => `
        <div style="display:flex;gap:14px;padding:16px;background:rgba(242,240,234,.04);border:1px solid rgba(242,240,234,.08);border-radius:10px;margin-bottom:10px">
          ${p.imagen_url ? `<img src="${p.imagen_url}" style="width:52px;height:52px;object-fit:cover;border-radius:50%;flex-shrink:0">` : `<span class="ad-av">${(p.nombre||'P')[0]}</span>`}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;margin-bottom:2px">${p.nombre}</div>
            <div style="font-size:12px;color:rgba(242,240,234,.4);margin-bottom:4px">${p.area||''}</div>
            <div style="font-size:13px;color:rgba(242,240,234,.5)">${p.descripcion||''}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            <span class="ad-pill ${p.activo?'activo':'inactivo'}" data-tog-prof="${p.id}" data-activo="${p.activo}" style="cursor:pointer">
              <span class="d"></span>${p.activo?'Activo':'Inactivo'}</span>
            <button class="ad-btn" data-ed-prof="${p.id}">${ic("pencil")}</button>
            <button class="ad-btn" data-rm-prof="${p.id}">${ic("trash-2")}</button>
          </div>
        </div>`).join('')
    : `<p style="text-align:center;padding:40px;color:rgba(242,240,234,.3)">No hay profesionales aún.</p>`;

  panel.innerHTML = `
    <div class="ad-toolbar"><div class="ad-spacer"></div>
      <button class="ad-btn ad-btn--verde" id="btn-prof-add">${ic("plus")} Agregar profesional</button>
    </div>${lista}`;
  if (window.lucide) lucide.createIcons();
}

function htmlFormProf(p = {}) {
  return `
    <div class="ad-field"><label>Nombre completo *</label>
      <input id="pf-nom" type="text" value="${(p.nombre||'').replace(/"/g,'&quot;')}" placeholder="Ej: Dr. Carlos Pérez"></div>
    <div class="ad-field-2">
      <div class="ad-field"><label>Área / Especialidad</label>
        <input id="pf-area" type="text" value="${(p.area||'').replace(/"/g,'&quot;')}" placeholder="Ej: Medicina general"></div>
      <div class="ad-field"><label>WhatsApp</label>
        <input id="pf-wa" type="tel" value="${(p.whatsapp||'').replace(/"/g,'&quot;')}" placeholder="300 000 0000"></div>
    </div>
    <div class="ad-field"><label>Descripción / Servicios</label>
      <textarea id="pf-desc" rows="3" placeholder="Describe los servicios y beneficios para los miembros">${p.descripcion||''}</textarea></div>
    <div class="ad-field"><label>Foto de perfil (opcional)</label>
      ${p.imagen_url ? `<img src="${p.imagen_url}" style="width:72px;height:72px;object-fit:cover;border-radius:50%;margin-bottom:10px">` : ''}
      <input id="pf-img" type="file" accept="image/*" style="font-size:13px;color:var(--txt-60)">
      <input type="hidden" id="pf-img-url" value="${p.imagen_url||''}"></div>
    <div class="ad-toolbar" style="margin:6px 0 0"><div class="ad-spacer"></div>
      <button class="ad-btn" id="pf-cancel">Cancelar</button>
      <button class="ad-btn ad-btn--verde" id="pf-save" data-id="${p.id||''}">${ic("check")} ${p.id?'Guardar cambios':'Agregar profesional'}</button>
    </div>`;
}

function bindFormProf() {
  setTimeout(() => {
    $("#pf-cancel")?.addEventListener('click', () => window.cerrarModal?.());
    const btn = $("#pf-save");
    btn?.addEventListener('click', async () => {
      const nombre = $("#pf-nom")?.value.trim();
      if (!nombre) { toast('El nombre es obligatorio'); return; }
      btn.disabled = true;
      let imagen_url = $("#pf-img-url")?.value || null;
      const file = $("#pf-img")?.files?.[0];
      if (file) try { imagen_url = await subirImagen(file); } catch(_) {}
      const payload = {
        nombre,
        area:        $("#pf-area")?.value.trim() || null,
        whatsapp:    $("#pf-wa")?.value.trim()   || null,
        descripcion: $("#pf-desc")?.value.trim() || null,
        imagen_url,
        activo: true,
      };
      const id = btn.dataset.id;
      id ? await supabase.from('profesionales').update(payload).eq('id', id)
         : await supabase.from('profesionales').insert(payload);
      window.cerrarModal?.();
      cargarProfesionales();
      toast(id ? 'Profesional actualizado ✓' : 'Profesional agregado ✓');
    });
    if (window.lucide) lucide.createIcons();
  }, 80);
}

/* ============================================================
   SOBREESCRIBIR FUNCIONES DE admin.js
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // Sobreescribir renderAliados para mostrar datos reales
  window.renderAliados = function() {
    const ic2 = (n) => `<i data-lucide="${n}"></i>`;
    $("#p-aliados").innerHTML = `
      <div class="ad-toolbar">
        <div class="ad-search-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="a-search" placeholder="Buscar aliado…" autocomplete="off"></div>
        <div class="ad-spacer"></div>
        <button class="ad-btn ad-btn--verde" id="a-add">${ic2("plus")} Agregar aliado</button>
      </div>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead><tr><th>Establecimiento</th><th>Categoría</th><th>Descuento</th><th>WhatsApp</th><th style="text-align:right">Estado</th></tr></thead>
          <tbody id="a-body"><tr><td colspan="5" style="text-align:center;padding:30px;color:rgba(242,240,234,.3)">Cargando…</td></tr></tbody>
        </table>
      </div>`;
    cargarAliados();
  };

  // Sobreescribir abrirAgregarAliado para conectar con Supabase
  window.abrirAgregarAliado = function() {
    abrirModal('Agregar aliado', 'Se publicará en el directorio', htmlFormAliado());
    bindFormAliado();
  };

  // Sobreescribir renderContenido para mostrar anuncios reales
  window.renderContenido = function() {
    $("#p-contenido").innerHTML = `<div style="text-align:center;padding:40px;color:rgba(242,240,234,.3)">Cargando…</div>`;
    cargarAnuncios();
  };

  // Sobreescribir renderProgramas para mostrar programas reales
  window.renderProgramas = function() {
    $("#p-programas").innerHTML = `<div style="text-align:center;padding:40px;color:rgba(242,240,234,.3)">Cargando…</div>`;
    cargarProgramas();
  };

  // Sobreescribir renderProfesionales para conectar con Supabase
  window.renderProfesionales = function() {
    $("#p-profesionales").innerHTML = `<div style="text-align:center;padding:40px;color:rgba(242,240,234,.3)">Cargando…</div>`;
    cargarProfesionales();
  };

  // Sobreescribir abrirAgregarProfesional
  window.abrirAgregarProfesional = function() {
    abrirModal('Agregar profesional', 'Se publicará en el directorio', htmlFormProf());
    bindFormProf();
  };

  // Delegación de clicks para CMS (toggling, edit, delete, new)
  document.addEventListener('click', async (e) => {

    // Nuevo anuncio
    if (e.target.closest('#btn-an-add')) {
      abrirModal('Nuevo anuncio', 'Publica una novedad en la plataforma', htmlFormAnuncio());
      bindFormAnuncio(); return;
    }
    // Editar anuncio
    const edAn = e.target.closest('[data-ed-an]');
    if (edAn) {
      const a = _anuncios.find(x => x.id === edAn.dataset.edAn);
      if (a) { abrirModal('Editar anuncio', a.titulo, htmlFormAnuncio(a)); bindFormAnuncio(); }
      return;
    }
    // Eliminar anuncio
    const rmAn = e.target.closest('[data-rm-an]');
    if (rmAn && confirm('¿Eliminar este anuncio?')) {
      await supabase.from('anuncios').delete().eq('id', rmAn.dataset.rmAn);
      cargarAnuncios(); toast('Anuncio eliminado'); return;
    }

    // Nuevo programa
    if (e.target.closest('#btn-prog-add')) {
      abrirModal('Nuevo programa', 'Se publicará en la web pública', htmlFormProg());
      bindFormProg(); return;
    }
    // Editar programa
    const edProg = e.target.closest('[data-ed-prog]');
    if (edProg) {
      const p = _programas.find(x => x.id === edProg.dataset.edProg);
      if (p) { abrirModal('Editar programa', p.nombre, htmlFormProg(p)); bindFormProg(); }
      return;
    }
    // Toggle programa activo
    const togProg = e.target.closest('[data-tog-prog]');
    if (togProg) {
      const activo = togProg.dataset.activo === 'true';
      await supabase.from('programas').update({ activo: !activo }).eq('id', togProg.dataset.togProg);
      cargarProgramas(); return;
    }
    // Eliminar programa
    const rmProg = e.target.closest('[data-rm-prog]');
    if (rmProg && confirm('¿Eliminar este programa?')) {
      await supabase.from('programas').delete().eq('id', rmProg.dataset.rmProg);
      cargarProgramas(); toast('Programa eliminado'); return;
    }

    // Nuevo profesional
    if (e.target.closest('#btn-prof-add')) {
      abrirModal('Agregar profesional', 'Se publicará en el directorio', htmlFormProf());
      bindFormProf(); return;
    }
    // Editar profesional
    const edProf = e.target.closest('[data-ed-prof]');
    if (edProf) {
      const p = _profesionales.find(x => x.id === edProf.dataset.edProf);
      if (p) { abrirModal('Editar profesional', p.nombre, htmlFormProf(p)); bindFormProf(); }
      return;
    }
    // Toggle profesional activo
    const togProf = e.target.closest('[data-tog-prof]');
    if (togProf) {
      const activo = togProf.dataset.activo === 'true';
      await supabase.from('profesionales').update({ activo: !activo }).eq('id', togProf.dataset.togProf);
      cargarProfesionales(); return;
    }
    // Eliminar profesional
    const rmProf = e.target.closest('[data-rm-prof]');
    if (rmProf && confirm('¿Eliminar este profesional?')) {
      await supabase.from('profesionales').delete().eq('id', rmProf.dataset.rmProf);
      cargarProfesionales(); toast('Profesional eliminado'); return;
    }

    // Editar aliado
    const edAl = e.target.closest('[data-ed-aliado]');
    if (edAl) {
      const a = _aliados.find(x => x.id === edAl.dataset.edAliado);
      if (a) { abrirModal('Editar aliado', a.nombre, htmlFormAliado(a)); bindFormAliado(); }
      return;
    }
    // Toggle aliado activo
    const togAl = e.target.closest('[data-tog-aliado]');
    if (togAl) {
      const activo = togAl.dataset.activo === 'true';
      await supabase.from('aliados').update({ activo: !activo }).eq('id', togAl.dataset.togAliado);
      cargarAliados(); return;
    }
    // Eliminar aliado
    const rmAl = e.target.closest('[data-rm-aliado]');
    if (rmAl && confirm('¿Eliminar este aliado?')) {
      await supabase.from('aliados').delete().eq('id', rmAl.dataset.rmAliado);
      cargarAliados(); toast('Aliado eliminado'); return;
    }
  });
});
