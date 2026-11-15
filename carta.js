/* ============================================================
   EL CLUB DE LA GENTE — Carta digital por QR (pública, sin login)
   El cliente escanea el QR de un negocio, escoge productos de su carta y
   manda el pedido -- llega "pendiente" al dashboard de Mi Contabilidad del
   negocio, que lo marca pagado cuando cobra en persona. Sin cuenta, sin
   comprobante: es independiente de Mi Tienda (esa es solo para miembros del
   Club, con comprobante y verificación IA).
   ============================================================ */
import { supabase } from './supabase.js';

const $ = (s, c = document) => c.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COP = (n) => n != null ? '$' + Number(n).toLocaleString('es-CO') : '$0';

const aliadoId = new URLSearchParams(location.search).get('aliado');
const carrito = new Map(); // producto_id -> { nombre, precio, cantidad }

function totalCarrito() {
  let total = 0, items = 0;
  carrito.forEach(it => { total += it.precio * it.cantidad; items += it.cantidad; });
  return { total, items };
}

function renderBarra() {
  const { total, items } = totalCarrito();
  const barra = $("#carta-barra");
  if (!barra) return;
  barra.hidden = items === 0;
  const elItems = $("#carta-barra-items"); if (elItems) elItems.textContent = `${items} producto${items === 1 ? '' : 's'}`;
  const elTotal = $("#carta-barra-total"); if (elTotal) elTotal.textContent = COP(total);
}

function renderQty(productoId) {
  const el = document.querySelector(`[data-qty-n="${productoId}"]`);
  if (el) el.textContent = carrito.get(productoId)?.cantidad || 0;
  const card = document.querySelector(`[data-carta-card="${productoId}"]`);
  if (card) card.classList.toggle('en-carrito', (carrito.get(productoId)?.cantidad || 0) > 0);
}

function sumarProducto(p, delta) {
  const actual = carrito.get(p.id)?.cantidad || 0;
  const nueva = Math.max(0, actual + delta);
  if (nueva === 0) carrito.delete(p.id);
  else carrito.set(p.id, { nombre: p.nombre, precio: p.precio, cantidad: nueva });
  renderQty(p.id);
  renderBarra();
}

function cardHtml(p) {
  const img = p.imagen_url
    ? `<img class="carta-card__img" src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy">`
    : `<div class="carta-card__ph"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg></div>`;
  return `
  <div class="carta-card" data-carta-card="${p.id}">
    ${img}
    <div class="carta-card__body">
      <div class="carta-card__nombre">${esc(p.nombre)}</div>
      ${p.descripcion ? `<div class="carta-card__desc">${esc(p.descripcion)}</div>` : ""}
      <div class="carta-card__fila">
        <span class="carta-card__precio">${COP(p.precio)}</span>
        <div class="carta-qty" data-qty-wrap="${p.id}">
          <button type="button" data-qty-menos="${p.id}" aria-label="Quitar uno">−</button>
          <span class="carta-qty__n" data-qty-n="${p.id}">0</span>
          <button type="button" data-qty-mas="${p.id}" aria-label="Agregar uno">+</button>
        </div>
      </div>
    </div>
  </div>`;
}

// Agrupa por categoría (texto libre que el negocio escribe por producto),
// respetando el orden de primera aparición -- "Otros" (sin categoría)
// siempre al final, para que no se vea como la categoría "principal".
function agruparPorCategoria(items) {
  const grupos = new Map();
  items.forEach(p => {
    const cat = (p.categoria || "").trim() || "Otros";
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat).push(p);
  });
  const entradas = [...grupos.entries()];
  entradas.sort((a, b) => (a[0] === "Otros") - (b[0] === "Otros"));
  return entradas;
}

async function iniciar() {
  const nombreEl = $("#carta-nombre");
  const logoEl = $("#carta-logo");
  const grid = $("#carta-grid");
  const vacio = $("#carta-estado-vacio");

  if (!aliadoId) {
    if (nombreEl) nombreEl.textContent = "Carta no encontrada";
    if (vacio) { vacio.hidden = false; vacio.querySelector("p").textContent = "Este link no es válido."; }
    return;
  }

  // select('*') a propósito (no una lista fija de columnas): así esta
  // página sigue funcionando aunque "carta_color"/"carta_portada_url"
  // todavía no existan en la vista pública (se agregan en una migración
  // aparte) -- si faltan, simplemente no hay personalización, en vez de
  // que toda la carta se rompa por una columna que no existe aún.
  const [{ data: negocio }, { data: productos }] = await Promise.all([
    supabase.from("aliados_publico").select("*").eq("id", aliadoId).maybeSingle(),
    supabase.from("negocio_carta_productos").select("*").eq("negocio_id", aliadoId).eq("disponible", true).order("orden"),
  ]);

  if (!negocio) {
    if (nombreEl) nombreEl.textContent = "Carta no encontrada";
    if (vacio) { vacio.hidden = false; vacio.querySelector("p").textContent = "No encontramos este negocio."; }
    return;
  }

  if (nombreEl) nombreEl.textContent = negocio.nombre;
  document.title = `Carta de ${negocio.nombre} — El Club de la Gente`;
  if (logoEl && negocio.imagen_url) logoEl.innerHTML = `<img src="${esc(negocio.imagen_url)}" alt="">`;
  if (negocio.carta_color) document.documentElement.style.setProperty('--verde', negocio.carta_color);
  if (negocio.carta_portada_url) {
    const portada = $("#carta-portada");
    if (portada) { portada.hidden = false; portada.innerHTML = `<img src="${esc(negocio.carta_portada_url)}" alt="">`; }
  }

  const items = productos || [];
  if (!items.length) {
    if (vacio) vacio.hidden = false;
    return;
  }

  if (grid) {
    const grupos = agruparPorCategoria(items);
    grid.innerHTML = grupos.map(([cat, prods]) => `
      <div class="carta-grupo">
        ${grupos.length > 1 ? `<h2 class="carta-grupo__titulo">${esc(cat)}</h2>` : ""}
        <div class="carta-grid">${prods.map(cardHtml).join("")}</div>
      </div>`).join("");
    items.forEach(p => {
      grid.querySelector(`[data-qty-mas="${p.id}"]`)?.addEventListener("click", () => sumarProducto(p, 1));
      grid.querySelector(`[data-qty-menos="${p.id}"]`)?.addEventListener("click", () => sumarProducto(p, -1));
    });
  }

  // ---------- Resumen / checkout ----------
  const overlay = $("#carta-overlay");
  const abrirResumen = () => {
    const { total } = totalCarrito();
    const itemsHtml = [...carrito.values()].map(it => `
      <div class="carta-sheet__item"><span>${it.cantidad}× ${esc(it.nombre)}</span><span>${COP(it.precio * it.cantidad)}</span></div>`).join("");
    const cont = $("#carta-sheet-items"); if (cont) cont.innerHTML = itemsHtml;
    const totSpan = $("#carta-sheet-total"); if (totSpan) totSpan.textContent = COP(total);
    $("#carta-sheet-form").hidden = false;
    $("#carta-sheet-exito").hidden = true;
    overlay.hidden = false;
  };
  $("#carta-ver-pedido")?.addEventListener("click", abrirResumen);
  $("#carta-sheet-cerrar")?.addEventListener("click", () => { overlay.hidden = true; });
  overlay?.addEventListener("click", (e) => { if (e.target === overlay) overlay.hidden = true; });

  let _cartaEnviando = false;
  $("#carta-enviar-pedido")?.addEventListener("click", async () => {
    const btn = $("#carta-enviar-pedido");
    if (_cartaEnviando) return; // blindaje extra contra doble clic/doble submit, además de disabled
    const nombre = $("#carta-cliente-nombre")?.value.trim();
    const wa = $("#carta-cliente-wa")?.value.trim();
    const nota = $("#carta-cliente-nota")?.value.trim();
    if (!nombre) { alert("Escribe tu nombre para enviar el pedido"); return; }
    if (!carrito.size) { alert("Agrega al menos un producto"); return; }
    _cartaEnviando = true;
    btn.disabled = true; btn.textContent = "Enviando…";
    const { total } = totalCarrito();
    const payload = {
      negocio_id: aliadoId,
      cliente_nombre: nombre,
      cliente_whatsapp: wa || null,
      nota: nota || null,
      items: [...carrito.entries()].map(([producto_id, it]) => ({ producto_id, nombre: it.nombre, precio: it.precio, cantidad: it.cantidad })),
      monto_total: total,
      estado: "pendiente",
    };
    const { error } = await supabase.from("negocio_carta_pedidos").insert(payload);
    btn.disabled = false; btn.textContent = "Enviar pedido";
    _cartaEnviando = false;
    if (error) { alert("No pudimos enviar tu pedido. Intenta de nuevo."); return; }
    carrito.clear();
    items.forEach(p => renderQty(p.id));
    renderBarra();
    $("#carta-sheet-form").hidden = true;
    $("#carta-sheet-exito").hidden = false;
  });
}

iniciar();
