/* ============================================================
   Registro de cliente para la tarjeta de sellos del mostrador. Pública,
   sin login -- mismo motivo que Carta.html (carta.js:13-20): cliente propio
   sin sesión, para que no se cuele el token de un miembro ya logueado en
   ese mismo celular.

   El "código" del cliente es su propio WhatsApp -- no se inventa uno nuevo.
   Esto escribe en "negocio_carta_clientes" (negocio_id + whatsapp + nombre),
   la MISMA tabla que ya llena carta.js cuando alguien pide por la carta
   pública -- así un cliente que se registró acá y uno que pidió por QR de
   mesa quedan identificados igual, y "Nuevo pedido" en el mostrador
   (dashboard.js) puede usar ese mismo WhatsApp para sumarle el sello.
   ============================================================ */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const $ = (s) => document.querySelector(s);
const aliadoId = new URLSearchParams(location.search).get('aliado');

async function cargarNegocio() {
  if (!aliadoId) { mostrarErrorCarga(); return; }
  const { data } = await supabase.from('aliados_publico').select('nombre, imagen_url').eq('id', aliadoId).maybeSingle();
  if (!data) { mostrarErrorCarga(); return; }
  $('#cl-titulo').textContent = `Únete a los sellos de ${data.nombre}`;
  if (data.imagen_url) $('#cl-logo').src = data.imagen_url;
}
function mostrarErrorCarga() {
  $('#cl-titulo').textContent = 'No encontramos este negocio';
  $('#cl-sub').textContent = 'Revisa que el link/QR sea el correcto.';
  $('#cl-form-wrap').hidden = true;
}
cargarNegocio();

$('#cl-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = $('#cl-nombre').value.trim();
  const wa = $('#cl-wa').value.replace(/\D/g, '');
  const err = $('#cl-error');
  err.hidden = true;
  if (!nombre || wa.length < 7) {
    err.textContent = 'Escribe tu nombre y un WhatsApp válido.';
    err.hidden = false;
    return;
  }
  const btn = $('#cl-btn');
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  const { error } = await supabase.from('negocio_carta_clientes').upsert(
    { negocio_id: aliadoId, whatsapp: wa, nombre },
    { onConflict: 'negocio_id,whatsapp' }
  );
  btn.disabled = false;
  btn.textContent = 'Registrarme';
  if (error) {
    err.textContent = 'No se pudo guardar. Intenta de nuevo.';
    err.hidden = false;
    return;
  }
  $('#cl-form-wrap').hidden = true;
  $('#cl-exito-numero').textContent = wa;
  $('#cl-exito').hidden = false;
});
