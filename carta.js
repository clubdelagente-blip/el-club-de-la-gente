/* ============================================================
   EL CLUB DE LA GENTE — Carta digital por QR (pública, sin login)
   El cliente escanea el QR de un negocio, escoge productos de su carta y
   manda el pedido -- llega "pendiente" al dashboard de Mi Contabilidad del
   negocio, que lo marca pagado cuando cobra en persona. Sin cuenta, sin
   comprobante: es independiente de Mi Tienda (esa es solo para miembros del
   Club, con comprobante y verificación IA).
   ============================================================ */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase.js';
import { comprimirImagen } from './imagen.js';

// Esta carta es pública, sin login -- a propósito NO usa el cliente
// compartido de supabase.js (ese guarda sesión en localStorage/cookies para
// que un miembro no tenga que volver a loguearse en el resto del sitio). Si
// en el celular ya hay una sesión de miembro guardada, ese cliente la
// recoge sola y manda ese token en vez del acceso público normal -- rompía
// la carta justo en los celulares donde alguien ya había iniciado sesión
// como miembro. Con su propio cliente (sin guardar ni leer sesión de
// nadie), la carta siempre pide los datos como lo que es: pública.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COP = (n) => n != null ? '$' + Number(n).toLocaleString('es-CO') : '$0';

// Mismo respaldo que ya hizo falta en otras copias de "Copiar" de este sitio
// (navigator.clipboard puede fallar o no existir) -- sin esto el botón
// podía no copiar nada y quedarse callado, sin avisar.
function copiarTextoConRespaldo(texto) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(texto).catch(() => copiarFallback(texto));
  return Promise.resolve(copiarFallback(texto));
}
function copiarFallback(texto) {
  const ta = document.createElement("textarea");
  ta.value = texto; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch {}
  document.body.removeChild(ta);
}

let _toastTimer = null;
function mostrarToast(msg) {
  const el = document.getElementById("carta-toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("mostrar");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("mostrar"), 2600);
}

const aliadoId = new URLSearchParams(location.search).get('aliado');
// Si el link trae ?mesa=, varias personas en la misma mesa escanean el MISMO
// QR y todas se unen a la misma "sesión de mesa" (ver abrirSesionMesa más
// abajo) -- cada quien manda su propio pedido, pero nadie paga individual:
// el negocio cobra la mesa completa cuando termina.
const mesaId = new URLSearchParams(location.search).get('mesa');
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
  const cantidad = carrito.get(productoId)?.cantidad || 0;
  const el = document.querySelector(`[data-qty-n="${productoId}"]`);
  if (el) el.textContent = cantidad;
  const card = document.querySelector(`[data-carta-card="${productoId}"]`);
  if (card) card.classList.toggle('en-carrito', cantidad > 0);
  const qtyWrap = document.querySelector(`[data-qty-wrap="${productoId}"]`);
  if (qtyWrap) qtyWrap.classList.toggle('en-uso', cantidad > 0);
  const gridN = document.querySelector(`[data-gridview-qty-n="${productoId}"]`);
  if (gridN) { gridN.textContent = cantidad; gridN.hidden = cantidad === 0; }
}

// Cuando el negocio activó control de stock para un producto, no se puede
// agregar más unidades de las que de verdad quedan -- el stock real lo cuida
// un trigger en la base de datos (se descuenta solo al llegar el pedido, se
// devuelve si se cancela), esto de acá es solo para no dejar que el cliente
// intente pedir de más desde su lado.
function stockDisponible(p) { return p.stock_activo ? Math.max(0, p.stock_cantidad ?? 0) : Infinity; }
function estaAgotado(p) { return p.stock_activo && (p.stock_cantidad ?? 0) <= 0; }

function sumarProducto(p, delta) {
  const actual = carrito.get(p.id)?.cantidad || 0;
  const nueva = Math.min(Math.max(0, actual + delta), stockDisponible(p));
  if (nueva === 0) carrito.delete(p.id);
  else carrito.set(p.id, { producto_id: p.id, nombre: p.nombre, precio: p.precio, cantidad: nueva });
  renderQty(p.id);
  renderBarra();
}

// Si el producto tiene grupos de toppings/modificadores configurados (ej.
// "Salsas"), no se puede sumar directo con un +/- en la tarjeta -- primero
// hay que elegir, así que la tarjeta muestra un botón "Elegir" que abre el
// modal de personalización en vez del stepper de siempre. Si está agotado,
// ninguna de las dos formas aparece -- solo el aviso.
//
// Una tarjeta = una pantalla completa del feed (tipo Reels/TikTok): la foto
// de fondo, un riel de me-gusta/comentar/compartir a la derecha, y el
// nombre/precio/botón de agregar flotando abajo sobre un degradado.
function feedSlideHtml(p, tieneGrupos, categoria, modoDesde) {
  const agotado = estaAgotado(p);
  const img = p.imagen_url
    ? `<img class="carta-card__img" src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy">`
    : `<div class="carta-card__ph"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg></div>`;
  const iconoCarrito = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
  // Modo "Desde $precio" (opcional, por negocio): siempre el botón "Elegir"
  // -- tenga o no toppings -- en vez del stepper +/- de siempre; si no tiene
  // toppings, "Elegir" agrega 1 directo (ver el binding en iniciar()).
  const accion = agotado
    ? `<span class="carta-card__agotado">Agotado</span>`
    : (modoDesde || tieneGrupos)
    ? `<button type="button" class="carta-card__personalizar" data-personalizar="${p.id}">Elegir ${iconoCarrito}</button>`
    : `<div class="carta-qty" data-qty-wrap="${p.id}">
          <button type="button" class="carta-qty__menos" data-qty-menos="${p.id}" aria-label="Quitar uno">−</button>
          <span class="carta-qty__n" data-qty-n="${p.id}">0</span>
          <button type="button" data-qty-mas="${p.id}" aria-label="Agregar"><span class="mas-texto">Añadir ${iconoCarrito}</span><span class="mas-icono">+</span></button>
        </div>`;
  const precioTxt = modoDesde ? `Desde ${COP(p.precio)}` : COP(p.precio);
  return `
  <div class="carta-slide${agotado ? " agotada" : ""}" data-carta-card="${p.id}" data-categoria="${esc(categoria)}">
    ${img}
    <div class="carta-slide__scrim"></div>
    <div class="carta-slide__rail">
      <button type="button" class="carta-rail-btn" data-like="${p.id}" aria-label="Me gusta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        <span class="n" data-like-n="${p.id}">${Number(p.contador_likes) || 0}</span>
      </button>
      <button type="button" class="carta-rail-btn" data-comentar="${p.id}" aria-label="Comentar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      </button>
      <button type="button" class="carta-rail-btn" data-compartir="${p.id}" aria-label="Compartir">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      </button>
    </div>
    <div class="carta-card__body">
      <div class="carta-card__fila${modoDesde ? " carta-card__fila--desde" : ""}">
        ${modoDesde ? `${accion}<span class="carta-card__precio">${precioTxt}</span>` : `<span class="carta-card__precio">${precioTxt}</span>${accion}`}
      </div>
      <div class="carta-card__nombre">${esc(p.nombre)}</div>
      ${p.descripcion ? `<div class="carta-card__desc">${esc(p.descripcion)}</div>` : ""}
    </div>
  </div>`;
}

// Celda de la vista de cuadrícula (toggle debajo del logo): foto + precio
// para hojear rápido, y un botón de agregar/elegir que reusa exactamente la
// misma lógica de carrito que el feed (abrirModalProducto/sumarProducto) --
// no hay un segundo carrito ni una segunda fuente de verdad, solo otra forma
// de llegar a la misma acción.
function gridItemHtml(p, tieneGrupos) {
  const agotado = estaAgotado(p);
  const img = p.imagen_url ? `<img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy">` : "";
  const iconoAdd = tieneGrupos
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
  return `
  <div class="carta-gridview-item">
    <button type="button" class="carta-gridview-item__foto" data-gridview-foto="${p.id}">
      ${img}
      <span class="carta-gridview-item__nombre">${esc(p.nombre)}</span>
      <span class="carta-gridview-item__precio">${COP(p.precio)}</span>
      ${agotado ? `<span class="carta-gridview-item__agotado">Agotado</span>` : ""}
    </button>
    ${agotado ? "" : `
    <button type="button" class="carta-gridview-item__add" data-gridview-add="${p.id}" aria-label="${tieneGrupos ? "Elegir" : "Añadir"}">
      ${iconoAdd}
      <span class="carta-gridview-item__n" data-gridview-qty-n="${p.id}" hidden>0</span>
    </button>`}
  </div>`;
}

// Agrupa por categoría (texto libre que el negocio escribe por producto).
// Si el negocio definió un orden propio (carta_categorias_orden, desde Mi
// Contabilidad), se respeta ese orden; si no, cae al orden de primera
// aparición. "Otros" (sin categoría) siempre al final en cualquier caso,
// para que no se vea como la categoría "principal".
function agruparPorCategoria(items, ordenConfig) {
  const grupos = new Map();
  items.forEach(p => {
    const cat = (p.categoria || "").trim() || "Otros";
    if (!grupos.has(cat)) grupos.set(cat, []);
    grupos.get(cat).push(p);
  });
  const entradas = [...grupos.entries()];
  if (Array.isArray(ordenConfig) && ordenConfig.length) {
    // Cada entrada puede ser un string (negocios viejos, antes de poder
    // personalizar el color) o un {nombre, color} -- se compara por nombre
    // en los dos casos.
    const nombres = ordenConfig.map(c => (typeof c === "string" ? c : c?.nombre));
    const indice = (cat) => { const i = nombres.indexOf(cat); return i === -1 ? 999 : i; };
    entradas.sort((a, b) => indice(a[0]) - indice(b[0]));
  } else {
    entradas.sort((a, b) => (a[0] === "Otros") - (b[0] === "Otros"));
  }
  entradas.sort((a, b) => (a[0] === "Otros") - (b[0] === "Otros")); // "Otros" siempre al final, pase lo que pase arriba
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
  const [{ data: negocio }, { data: productos }, { data: modGrupos }, { data: modOpciones }, { data: modProdGrupos }] = await Promise.all([
    supabase.from("aliados_publico").select("*").eq("id", aliadoId).maybeSingle(),
    supabase.from("negocio_carta_productos").select("*").eq("negocio_id", aliadoId).eq("disponible", true).order("orden"),
    supabase.from("negocio_carta_grupos_mod").select("*").eq("negocio_id", aliadoId).order("orden"),
    supabase.from("negocio_carta_opciones_mod").select("*").eq("negocio_id", aliadoId).order("orden"),
    supabase.from("negocio_carta_producto_grupos").select("*").eq("negocio_id", aliadoId),
  ]);

  // Grupos de toppings por producto (ej. "Salsas" -> Chocolate/Arequipe/...),
  // armados una sola vez acá para no repetir filtros en cada tarjeta.
  const gruposById = new Map((modGrupos || []).map(g => [g.id, { ...g, opciones: (modOpciones || []).filter(o => o.grupo_id === g.id) }]));
  const gruposPorProducto = new Map();
  (modProdGrupos || []).forEach(pg => {
    const g = gruposById.get(pg.grupo_id);
    if (!g) return;
    if (!gruposPorProducto.has(pg.producto_id)) gruposPorProducto.set(pg.producto_id, []);
    gruposPorProducto.get(pg.producto_id).push(g);
  });

  if (!negocio) {
    if (nombreEl) nombreEl.textContent = "Carta no encontrada";
    if (vacio) { vacio.hidden = false; vacio.querySelector("p").textContent = "No encontramos este negocio."; }
    return;
  }

  // Bienvenida (nombre+WhatsApp) antes que cualquier otra cosa -- el
  // overlay tapa toda la pantalla, así que no hace falta pausar el resto
  // de esta función: si hace falta, bloquea la interacción sola hasta que
  // se resuelva; si no, aplicarIdentidadConocida() ya deja todo listo.
  mostrarBienvenidaSiHaceFalta();
  aplicarIdentidadConocida();

  // Métricas del negocio (pestaña "Métricas" en Mi Contabilidad): una visita
  // = una carga de esta página, sin dato personal -- solo negocio_id + hora.
  // "Fire and forget": si falla (ej. sin internet), la carta sigue
  // funcionando igual, nunca bloquea nada.
  supabase.from("negocio_carta_visitas").insert({ negocio_id: aliadoId }).then(() => {}, () => {});

  // Estilo "Desde $precio" + botón "Elegir" siempre visible (en vez del
  // stepper +/- para productos sin toppings) -- opcional, el negocio lo
  // prende desde "Personalizar mi carta".
  const modoDesde = !!negocio.carta_precio_desde;

  // Si el link trae ?mesa=, se abre (o se une a) la sesión de esa mesa --
  // abrir_o_unir_sesion_mesa es una función segura en la base de datos que
  // evita que dos celulares escaneando al mismo tiempo creen 2 sesiones
  // distintas para la misma mesa vacía (ver comentario de la función en la
  // migración SQL). Si algo falla (mesa inválida, de otro negocio, etc.) la
  // carta sigue funcionando normal, solo que sin agrupar por mesa.
  let mesaSesionId = null;
  let mesaNombre = null;
  if (mesaId) {
    try {
      const { data: mesa } = await supabase.from("negocio_mesas").select("*").eq("id", mesaId).eq("negocio_id", aliadoId).maybeSingle();
      if (mesa) {
        mesaNombre = mesa.nombre;
        const { data: sesionId } = await supabase.rpc("abrir_o_unir_sesion_mesa", { p_mesa_id: mesaId });
        if (sesionId) mesaSesionId = sesionId;
      }
    } catch {}
  }
  if (mesaNombre) {
    const mesaEl = $("#carta-mesa-indicador");
    if (mesaEl) { mesaEl.textContent = `🍽️ ${mesaNombre}`; mesaEl.hidden = false; }
  }

  if (nombreEl) nombreEl.textContent = negocio.nombre;
  document.title = `Carta de ${negocio.nombre} — El Club de la Gente`;
  if (logoEl && negocio.imagen_url) { logoEl.innerHTML = `<img src="${esc(negocio.imagen_url)}" alt="">`; logoEl.hidden = false; }
  if (negocio.instagram) {
    const igEl = $("#carta-instagram");
    if (igEl) { igEl.href = negocio.instagram; igEl.hidden = false; }
  }
  if (negocio.carta_color) document.documentElement.style.setProperty('--verde', negocio.carta_color);
  if (negocio.carta_color_tarjeta) document.documentElement.style.setProperty('--carta-tarjeta-bg', negocio.carta_color_tarjeta);
  if (negocio.carta_color_borde) document.documentElement.style.setProperty('--carta-tarjeta-borde', negocio.carta_color_borde);
  if (negocio.carta_color_pedido) document.documentElement.style.setProperty('--carta-pedido-bg', negocio.carta_color_pedido);
  if (negocio.carta_portada_url) {
    // La foto del negocio pasa a ser el fondo fijo de TODA la carta (no una
    // tira chica arriba) -- full prevalencia a la foto, con el mismo efecto
    // de fondo estático que ya usa el resto de la plataforma.
    const fondoFijo = $("#fondo-fijo");
    if (fondoFijo) {
      fondoFijo.classList.add("con-portada");
      fondoFijo.style.backgroundImage = `linear-gradient(rgba(241,247,246,.45), rgba(241,247,246,.88) 340px), url("${negocio.carta_portada_url}")`;
    }
  }
  if (negocio.carta_sellos_activo) {
    const hint = $("#carta-sellos-hint");
    if (hint) {
      hint.hidden = false;
      const premio = negocio.carta_sellos_premio_desc || (negocio.carta_sellos_premio_tipo === "gratis" ? "un premio gratis" : "un descuento");
      hint.textContent = `🎟️ Este negocio tiene tarjeta de sellos -- escribe tu WhatsApp para sumar puntos y ganar: ${premio}`;
    }
  }
  // Carrusel de avisos -- mismo patrón que renderBannerTienda() de
  // dashboard.js (reutiliza .tienda-hero/.tienda-banner-track/
  // .tienda-banner-dots de styles.css), con el color de base que el
  // negocio haya elegido.
  const avisosValidos = (Array.isArray(negocio.carta_avisos) ? negocio.carta_avisos : []).filter(a => a?.titulo?.trim());
  if (negocio.carta_aviso_activo && avisosValidos.length) {
    const avisoWrap = $("#carta-aviso-wrap");
    const avisoTrack = $("#carta-aviso-track");
    const avisoDots = $("#carta-aviso-dots");
    if (avisoWrap && avisoTrack) {
      avisoWrap.hidden = false;
      const colorBase = negocio.carta_aviso_color || "#164a2c";
      avisoTrack.innerHTML = avisosValidos.map(a => {
        const bg = `radial-gradient(120% 140% at 15% 0%, ${esc(colorBase)} 0%, #0c2e1b 55%, #05160d 100%)`;
        const contenido = `<span class="tienda-hero__eyebrow">Aviso</span><h2>${esc(a.titulo)}</h2>${a.subtitulo ? `<p>${esc(a.subtitulo)}</p>` : ""}`;
        // Si el negocio le puso un link, toda la tarjeta es tocable y abre
        // ese link (ej. una promo, su Instagram, un WhatsApp) en pestaña nueva.
        return a.link
          ? `<a class="tienda-hero" href="${esc(a.link)}" target="_blank" rel="noopener" style="background:${bg};text-decoration:none">${contenido}</a>`
          : `<div class="tienda-hero" style="background:${bg}">${contenido}</div>`;
      }).join("");
      if (avisosValidos.length > 1 && avisoDots) {
        avisoDots.innerHTML = avisosValidos.map((_, i) => `<span class="${i === 0 ? "is-on" : ""}"></span>`).join("");
        avisoDots.style.display = "";
        const dots = [...avisoDots.children];
        avisoTrack.addEventListener("scroll", () => {
          const i = Math.round(avisoTrack.scrollLeft / avisoTrack.clientWidth);
          dots.forEach((d, idx) => d.classList.toggle("is-on", idx === i));
        });
      } else if (avisoDots) avisoDots.style.display = "none";
    }
  }

  const items = productos || [];
  if (!items.length) {
    if (vacio) vacio.hidden = false;
    return;
  }

  // Color personalizado por categoría (ej. "Bananos" en amarillo, "Hamburguesas"
  // en rojo) -- se guarda junto con el orden (carta_categorias_orden), igual
  // sirve para negocios viejos que todavía tengan ahí solo el nombre sin color.
  function colorDeCategoria(cat) {
    const cfg = Array.isArray(negocio.carta_categorias_orden) ? negocio.carta_categorias_orden : [];
    const entry = cfg.find(c => (typeof c === "string" ? c : c?.nombre) === cat);
    return (entry && typeof entry !== "string" && entry.color) || null;
  }

  if (grid) {
    const grupos = agruparPorCategoria(items, negocio.carta_categorias_orden);

    // "Los más destacados": los productos con más likes se SACAN de su
    // categoría de siempre y se reubican juntos, primero en el feed -- no
    // se duplican (cada producto vive en un solo lugar a la vez), así que
    // un producto deja de verse en su categoría normal apenas entra acá.
    const TOPE_DESTACADOS = 5;
    const destacados = items
      .filter(p => Number(p.contador_likes) > 0)
      .sort((a, b) => Number(b.contador_likes) - Number(a.contador_likes))
      .slice(0, TOPE_DESTACADOS);
    if (destacados.length) {
      const destacadosIds = new Set(destacados.map(p => p.id));
      for (let i = grupos.length - 1; i >= 0; i--) {
        const prods = grupos[i][1];
        for (let j = prods.length - 1; j >= 0; j--) if (destacadosIds.has(prods[j].id)) prods.splice(j, 1);
        if (!prods.length) grupos.splice(i, 1);
      }
      grupos.unshift(["Los más destacados", destacados]);
    }

    // Se muestran las cápsulas de categoría siempre que el negocio de
    // verdad las use -- solo se esconden cuando NADIE puso categoría en
    // ningún producto (ahí "Otros" sería el único grupo, sin contar
    // "Los más destacados", que no cuenta como categoría real del negocio).
    const gruposReales = grupos.filter(([cat]) => cat !== "Los más destacados");
    const mostrarPills = !(gruposReales.length === 1 && gruposReales[0][0] === "Otros");
    // Un producto, una pantalla -- el feed es una lista PLANA (sin
    // encabezados de categoría visibles, no caben en una pantalla completa
    // a la vez), en el mismo orden que ya respeta la categorización del
    // negocio; las cápsulas de arriba saltan a la categoría elegida, pero
    // el scroll sigue corriendo natural hacia las siguientes -- nunca se
    // "acaba" de golpe al terminar una categoría.
    grid.innerHTML = grupos.map(([cat, prods]) => prods.map(p => feedSlideHtml(p, gruposPorProducto.has(p.id), cat, modoDesde)).join("")).join("");

    // Cápsulas de categoría arriba -- saltan a la primera tarjeta de esa
    // categoría (scrollIntoView, no esconden nada) y se resaltan solas
    // según qué categoría esté en pantalla en cada momento del scroll.
    const pillsEl = $("#carta-cat-pills");
    if (pillsEl) {
      if (mostrarPills && grupos.length > 1) {
        pillsEl.innerHTML = grupos.map(([cat]) => {
          const color = colorDeCategoria(cat);
          return `<button type="button" class="carta-cat-pill${color ? " con-color" : ""}" data-filtro-cat="${esc(cat)}"${color ? ` style="--cat-color:${esc(color)}"` : ""}>${esc(cat)}</button>`;
        }).join("");
        pillsEl.querySelectorAll("[data-filtro-cat]").forEach(btn => btn.addEventListener("click", () => {
          grid.querySelector(`.carta-slide[data-categoria="${CSS.escape(btn.dataset.filtroCat)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }));
        pillsEl.querySelector("[data-filtro-cat]")?.classList.add("is-on");
        const observerCat = new IntersectionObserver((entries) => {
          const visible = entries.find(e => e.isIntersecting);
          if (!visible) return;
          const cat = visible.target.dataset.categoria;
          pillsEl.querySelectorAll("[data-filtro-cat]").forEach(b => b.classList.toggle("is-on", b.dataset.filtroCat === cat));
        }, { root: grid, threshold: 0.6 });
        grid.querySelectorAll(".carta-slide").forEach(s => observerCat.observe(s));
      } else {
        pillsEl.innerHTML = "";
      }
    }

    // Scroll infinito: al llegar al final del feed, vuelve al principio.
    // Se clona la PRIMERA tarjeta y se pega al final como "centinela" -- en
    // cuanto esa copia queda asentada a pantalla completa (scroll-snap ya
    // terminó), se salta sin animación al inicio real del feed. Como el
    // centinela es idéntico a la primera tarjeta de verdad (misma foto,
    // mismo texto), el salto es imperceptible -- sus botones no tienen
    // listeners propios (los selectores por id ya apuntan a la tarjeta real,
    // que va primero en el DOM), pero eso no importa porque nunca se queda
    // ahí el tiempo suficiente para tocarlos.
    if (items.length > 1) {
      const primeraSlide = grid.querySelector(".carta-slide");
      if (primeraSlide) {
        const centinela = primeraSlide.cloneNode(true);
        centinela.setAttribute("data-carta-sentinel", "1");
        grid.appendChild(centinela);
        const observerLoop = new IntersectionObserver((entries) => {
          entries.forEach(entry => { if (entry.isIntersecting) grid.scrollTop = 0; });
        }, { root: grid, threshold: 0.98 });
        observerLoop.observe(centinela);
      }
    }

    // "Me gusta" ya dados desde este celular (por negocio) -- para no dejar
    // que el mismo aparato infle el contador a punta de toques repetidos, y
    // para que el corazón salga lleno de entrada si ya le dio like antes.
    let likesDados;
    try { likesDados = new Set(JSON.parse(localStorage.getItem(`carta_likes_${aliadoId}`) || "[]")); } catch { likesDados = new Set(); }

    items.forEach(p => {
      const gruposProd = gruposPorProducto.get(p.id);
      if (gruposProd && gruposProd.length) {
        grid.querySelector(`[data-personalizar="${p.id}"]`)?.addEventListener("click", () => abrirModalProducto(p, gruposProd));
      } else if (modoDesde) {
        // Sin toppings que elegir -- el botón "Elegir" agrega 1 directo,
        // igual que hacía el "+" del stepper de siempre.
        grid.querySelector(`[data-personalizar="${p.id}"]`)?.addEventListener("click", () => {
          const eraNuevo = !carrito.get(p.id)?.cantidad;
          sumarProducto(p, 1);
          if (eraNuevo) preguntarAlgoMas();
        });
      } else {
        grid.querySelector(`[data-qty-mas="${p.id}"]`)?.addEventListener("click", () => {
          // Solo pregunta "¿algo más?" cuando de verdad se agrega un
          // producto NUEVO al pedido -- no en cada toque de "+" para pedir
          // una segunda unidad del mismo, que sería molesto.
          const eraNuevo = !carrito.get(p.id)?.cantidad;
          sumarProducto(p, 1);
          if (eraNuevo) preguntarAlgoMas();
        });
        grid.querySelector(`[data-qty-menos="${p.id}"]`)?.addEventListener("click", () => sumarProducto(p, -1));
      }
      const likeBtn = grid.querySelector(`[data-like="${p.id}"]`);
      if (likeBtn) {
        if (likesDados.has(p.id)) likeBtn.classList.add("is-liked");
        likeBtn.addEventListener("click", () => darLike(p));
      }
      grid.querySelector(`[data-comentar="${p.id}"]`)?.addEventListener("click", () => abrirComentarios(p));
      grid.querySelector(`[data-compartir="${p.id}"]`)?.addEventListener("click", () => compartirProducto(p));
    });

    // Vista de cuadrícula (toggle debajo del logo): mismo catálogo que el
    // feed pero como grilla tipo Instagram para hojear rápido -- cada celda
    // deja elegir/agregar directo sin salir de la grilla; tocar la foto en
    // cambio cierra la grilla y lleva a ese producto en el feed a pantalla
    // completa.
    const gridToggleBtn = $("#carta-grid-toggle");
    const gridViewOverlay = $("#carta-gridview-overlay");
    const gridViewGrid = $("#carta-gridview-grid");
    if (gridToggleBtn && gridViewOverlay && gridViewGrid) {
      gridViewGrid.innerHTML = items.map(p => gridItemHtml(p, gruposPorProducto.has(p.id))).join("");
      const cerrarGridView = () => { gridViewOverlay.hidden = true; gridToggleBtn.classList.remove("is-on"); };
      gridToggleBtn.addEventListener("click", () => { gridViewOverlay.hidden = false; gridToggleBtn.classList.add("is-on"); });
      $("#carta-gridview-cerrar")?.addEventListener("click", cerrarGridView);
      gridViewOverlay.addEventListener("click", (e) => { if (e.target === gridViewOverlay) cerrarGridView(); });
      items.forEach(p => {
        gridViewGrid.querySelector(`[data-gridview-foto="${p.id}"]`)?.addEventListener("click", () => {
          cerrarGridView();
          grid.querySelector(`[data-carta-card="${p.id}"]`)?.scrollIntoView({ block: "start" });
        });
        const addBtn = gridViewGrid.querySelector(`[data-gridview-add="${p.id}"]`);
        if (!addBtn) return;
        const gruposProd = gruposPorProducto.get(p.id);
        if (gruposProd && gruposProd.length) {
          addBtn.addEventListener("click", () => abrirModalProducto(p, gruposProd));
        } else {
          addBtn.addEventListener("click", () => {
            const eraNuevo = !carrito.get(p.id)?.cantidad;
            sumarProducto(p, 1);
            if (eraNuevo) preguntarAlgoMas();
          });
        }
      });
    }
  }

  // ---------- "Me gusta" real por producto: un toque suma 1 en la base de
  // datos vía una función segura (dar_like_producto) y queda marcado en
  // este celular para no dejar sumar de nuevo por accidente. ----------
  function darLike(p) {
    const likeBtn = grid.querySelector(`[data-like="${p.id}"]`);
    if (!likeBtn || likeBtn.classList.contains("is-liked")) return;
    likeBtn.classList.add("is-liked");
    const nEl = likeBtn.querySelector("[data-like-n]");
    if (nEl) nEl.textContent = String((Number(nEl.textContent) || 0) + 1);
    try {
      const key = `carta_likes_${aliadoId}`;
      const dados = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
      dados.add(p.id);
      localStorage.setItem(key, JSON.stringify([...dados]));
    } catch {}
    supabase.rpc("dar_like_producto", { p_producto_id: p.id }).catch(() => {});
    pedirWhatsAppPuntos((wa) => sumarPuntos(wa, "like"));
  }

  // ---------- Puntos por like/comentario -- independiente de la tarjeta de
  // sellos (esa premia compras pagadas). Cada negocio tiene su propia meta;
  // la primera vez que se gana un punto se pide el WhatsApp (se guarda en
  // este celular para no volver a pedirlo) -- sin eso no hay a nombre de
  // quién anotarlo. Por ahora solo se acumulan: todavía no hay panel para
  // que el negocio vea quién ya puede participar. ----------
  const META_PUNTOS = 30;
  const puntosOverlay = $("#carta-puntos-overlay");
  let _accionPuntosPendiente = null;
  function obtenerWhatsAppGuardado() {
    try { return localStorage.getItem("carta_mi_whatsapp") || null; } catch { return null; }
  }
  function pedirWhatsAppPuntos(onListo) {
    const guardado = obtenerWhatsAppGuardado();
    if (guardado) { onListo(guardado); return; }
    _accionPuntosPendiente = onListo;
    if (puntosOverlay) puntosOverlay.hidden = false;
  }
  $("#carta-puntos-guardar")?.addEventListener("click", () => {
    const wa = $("#carta-puntos-whatsapp")?.value.trim();
    if (!wa) { alert("Escribe tu WhatsApp"); return; }
    try { localStorage.setItem("carta_mi_whatsapp", wa); } catch {}
    if (puntosOverlay) puntosOverlay.hidden = true;
    const cb = _accionPuntosPendiente; _accionPuntosPendiente = null;
    if (cb) cb(wa);
  });
  $("#carta-puntos-ahora-no")?.addEventListener("click", () => {
    if (puntosOverlay) puntosOverlay.hidden = true;
    _accionPuntosPendiente = null;
  });
  async function sumarPuntos(wa, tipo) {
    try {
      await supabase.rpc("sumar_punto_carta", { p_negocio_id: aliadoId, p_whatsapp: wa, p_tipo: tipo });
      const { data: total } = await supabase.rpc("mis_puntos_carta", { p_negocio_id: aliadoId, p_whatsapp: wa });
      const puntos = Number(total) || 0;
      mostrarToast(puntos >= META_PUNTOS ? `🎉 ¡Llegaste a ${puntos} puntos! Ya puedes participar por premios.` : `+5 puntos · llevas ${puntos} de ${META_PUNTOS} para participar`);
    } catch {}
  }

  // ---------- Bienvenida: resuelve nombre+WhatsApp UNA sola vez por
  // negocio en este celular, antes de dejar hacer nada más -- después ni el
  // pago ni los comentarios lo vuelven a pedir (ver aplicarIdentidadConocida
  // y el comentario-form más abajo). El WhatsApp mismo ES el "código" de
  // "Ya la he usado": se busca en negocio_carta_clientes (negocio_id +
  // whatsapp) en vez de inventar un código aparte que haya que anotar. ----------
  function claveIdentidad() { return `carta_identidad_${aliadoId}`; }
  function obtenerIdentidad() {
    try { return JSON.parse(localStorage.getItem(claveIdentidad()) || "null"); } catch { return null; }
  }
  function guardarIdentidad(nombre, whatsapp) {
    try { localStorage.setItem(claveIdentidad(), JSON.stringify({ nombre, whatsapp })); } catch {}
    try { localStorage.setItem("carta_mi_whatsapp", whatsapp); } catch {}
  }
  // El pago ya no vuelve a pedir nombre/WhatsApp -- los inputs de siempre
  // (#carta-cliente-nombre/#carta-cliente-wa) se rellenan solos y se
  // esconden; el resto de la lectura/el envío del pedido sigue leyendo esos
  // mismos inputs sin cambios.
  function aplicarIdentidadConocida() {
    const identidad = obtenerIdentidad();
    if (!identidad) return;
    const nombreEl = $("#carta-cliente-nombre"); if (nombreEl) nombreEl.value = identidad.nombre;
    const waEl = $("#carta-cliente-wa"); if (waEl) waEl.value = identidad.whatsapp;
    const wrapEl = $("#carta-sheet-identidad"); if (wrapEl) wrapEl.hidden = true;
  }
  function mostrarBienvenidaSiHaceFalta() {
    if (obtenerIdentidad()) return;
    const overlay = $("#carta-bienvenida-overlay");
    if (!overlay) return;
    const logoEl = $("#carta-bienvenida-logo");
    if (logoEl) logoEl.innerHTML = negocio.imagen_url ? `<img src="${esc(negocio.imagen_url)}" alt="">` : "";
    const nombreNegocioEl = $("#carta-bienvenida-nombre-negocio"); if (nombreNegocioEl) nombreNegocioEl.textContent = negocio.nombre;
    const msgEl = $("#carta-bienvenida-msg");
    if (msgEl) msgEl.textContent = (negocio.carta_bienvenida_mensaje && negocio.carta_bienvenida_mensaje.trim()) || `¡Bienvenido a la carta de ${negocio.nombre}!`;
    overlay.hidden = false;

    const botones = $("#carta-bienvenida-botones");
    const formNueva = $("#carta-bienvenida-form-nueva");
    const formVolver = $("#carta-bienvenida-form-volver");
    const volverAOpciones = () => {
      if (botones) botones.hidden = false;
      if (formNueva) formNueva.hidden = true;
      if (formVolver) formVolver.hidden = true;
    };
    const cerrarConIdentidad = (nombre, whatsapp) => {
      guardarIdentidad(nombre, whatsapp);
      overlay.hidden = true;
      aplicarIdentidadConocida();
    };

    $("#carta-bienvenida-nueva")?.addEventListener("click", () => {
      if (botones) botones.hidden = true;
      if (formNueva) formNueva.hidden = false;
    });
    $("#carta-bienvenida-volver")?.addEventListener("click", () => {
      if (botones) botones.hidden = true;
      if (formVolver) formVolver.hidden = false;
    });
    $$("[data-bienvenida-atras]").forEach(btn => btn.addEventListener("click", volverAOpciones));

    $("#carta-bienvenida-nueva-confirmar")?.addEventListener("click", async () => {
      const btn = $("#carta-bienvenida-nueva-confirmar");
      const nombre = $("#carta-bienvenida-nombre")?.value.trim();
      const wa = $("#carta-bienvenida-wa-nueva")?.value.trim();
      if (!nombre) { alert("Escribe tu nombre"); return; }
      if (!wa) { alert("Escribe tu WhatsApp"); return; }
      btn.disabled = true; btn.textContent = "Entrando…";
      await supabase.from("negocio_carta_clientes").upsert(
        { negocio_id: aliadoId, whatsapp: wa, nombre }, { onConflict: "negocio_id,whatsapp" }
      );
      btn.disabled = false; btn.textContent = "Entrar";
      cerrarConIdentidad(nombre, wa);
    });

    // "Ya la he usado" busca por WhatsApp -- si no está registrado en ESTE
    // negocio (ej. celular nuevo y nunca lo había dado acá), deja
    // registrarse ahí mismo en vez de dejarlo en un callejón sin salida.
    $("#carta-bienvenida-volver-confirmar")?.addEventListener("click", async () => {
      const btn = $("#carta-bienvenida-volver-confirmar");
      const wa = $("#carta-bienvenida-wa-volver")?.value.trim();
      if (!wa) { alert("Escribe tu WhatsApp"); return; }
      const campoNombreEl = $("#carta-bienvenida-campo-nombre-fallback");
      const modoRegistro = campoNombreEl && !campoNombreEl.hidden;
      if (modoRegistro) {
        const nombre = $("#carta-bienvenida-nombre-fallback")?.value.trim();
        if (!nombre) { alert("Escribe tu nombre"); return; }
        btn.disabled = true; btn.textContent = "Entrando…";
        await supabase.from("negocio_carta_clientes").upsert(
          { negocio_id: aliadoId, whatsapp: wa, nombre }, { onConflict: "negocio_id,whatsapp" }
        );
        btn.disabled = false; btn.textContent = "Entrar";
        cerrarConIdentidad(nombre, wa);
        return;
      }
      btn.disabled = true; btn.textContent = "Buscando…";
      const { data } = await supabase.from("negocio_carta_clientes").select("nombre").eq("negocio_id", aliadoId).eq("whatsapp", wa).maybeSingle();
      btn.disabled = false; btn.textContent = "Entrar";
      if (data?.nombre) { cerrarConIdentidad(data.nombre, wa); return; }
      const avisoEl = $("#carta-bienvenida-no-encontrado"); if (avisoEl) avisoEl.hidden = false;
      if (campoNombreEl) campoNombreEl.hidden = false;
    });
  }

  function compartirProducto(p) {
    const url = `${location.origin}${location.pathname}?aliado=${aliadoId}`;
    const texto = `${p.nombre} -- ${COP(p.precio)} en ${negocio.nombre}`;
    if (navigator.share) {
      navigator.share({ title: p.nombre, text: texto, url }).catch(() => {});
    } else {
      copiarTextoConRespaldo(url).then(() => alert("Enlace copiado"));
    }
  }

  // ---------- Comentarios: solo se ven los que el negocio ya aprobó desde
  // su panel -- enviar uno nuevo siempre pasa por una función segura que lo
  // deja sin aprobar, nunca visible de una vez. ----------
  const comentariosOverlay = $("#carta-comentarios-overlay");
  const comentariosLista = $("#carta-comentarios-lista");
  const comentariosTitulo = $("#carta-comentarios-titulo");
  let comentarioProductoActual = null;
  async function abrirComentarios(p) {
    if (!comentariosOverlay) return;
    comentarioProductoActual = p;
    if (comentariosTitulo) comentariosTitulo.textContent = `Comentarios de ${p.nombre}`;
    if (comentariosLista) comentariosLista.innerHTML = `<p class="carta-comentarios-vacio">Cargando…</p>`;
    const aviso = $("#carta-comentario-aviso"); if (aviso) aviso.classList.remove("mostrar");
    const textoInput = $("#carta-comentario-texto"); if (textoInput) textoInput.value = "";
    comentariosOverlay.hidden = false;
    const { data } = await supabase.from("negocio_carta_comentarios").select("cliente_nombre, texto").eq("producto_id", p.id).eq("aprobado", true).order("created_at", { ascending: false });
    if (comentariosLista) {
      comentariosLista.innerHTML = (data && data.length)
        ? data.map(c => `<div class="carta-comentario"><div class="carta-comentario__nombre">${esc(c.cliente_nombre)}</div><div class="carta-comentario__texto">${esc(c.texto)}</div></div>`).join("")
        : `<p class="carta-comentarios-vacio">Sé el primero en comentar.</p>`;
    }
  }
  $("#carta-comentarios-cerrar")?.addEventListener("click", () => { if (comentariosOverlay) comentariosOverlay.hidden = true; });
  comentariosOverlay?.addEventListener("click", (e) => { if (e.target === comentariosOverlay) comentariosOverlay.hidden = true; });
  $("#carta-comentario-enviar")?.addEventListener("click", async () => {
    const btn = $("#carta-comentario-enviar");
    // Estilo Instagram: sin campo de nombre -- ya se sabe quién es por la
    // bienvenida (ver obtenerIdentidad más arriba), nunca hace falta
    // volver a preguntarlo acá.
    const nombre = obtenerIdentidad()?.nombre || "Cliente";
    const texto = $("#carta-comentario-texto")?.value.trim();
    if (!texto) { alert("Escribe tu comentario"); return; }
    if (!comentarioProductoActual) return;
    btn.disabled = true;
    const { error } = await supabase.rpc("enviar_comentario_producto", {
      p_producto_id: comentarioProductoActual.id, p_negocio_id: aliadoId, p_nombre: nombre, p_texto: texto,
    });
    btn.disabled = false;
    if (error) { alert("No pudimos enviar tu comentario. Intenta de nuevo."); return; }
    const textoInput = $("#carta-comentario-texto"); if (textoInput) textoInput.value = "";
    const aviso = $("#carta-comentario-aviso"); if (aviso) aviso.classList.add("mostrar");
    pedirWhatsAppPuntos((wa) => sumarPuntos(wa, "comentario"));
  });

  // ---------- Modal de personalización: toppings/salsas/tamaño antes de
  // agregar un producto que los tenga configurados. Cada "Añadir" crea una
  // línea NUEVA en el carrito (no se suma a otra con distinta elección), así
  // que dos churros con salsas distintas aparecen como 2 líneas separadas en
  // "Tu pedido" -- igual a como se ve en cualquier app de pedidos real. ----------
  const modOverlay = $("#carta-mod-overlay");
  const modNombreEl = $("#carta-mod-nombre");
  const modDescEl = $("#carta-mod-desc");
  const modGruposEl = $("#carta-mod-grupos");
  const modQtyNEl = $("#carta-mod-qty-n");
  const modAgregarBtn = $("#carta-mod-agregar");
  const modResumenEl = $("#carta-mod-resumen");
  let modProductoActual = null;
  let modGruposActual = [];
  let modSeleccion = new Map(); // grupo_id -> Set(opcion_id)
  let modQty = 1;
  // Los grupos (salsas, toppings...) no se muestran todos de una -- se
  // preguntan uno por sesión, como una conversación: el primero abierto de
  // una vez, y debajo un botón con la pregunta del siguiente ("¿Quieres
  // agregar toppings?") que al tocarlo revela ESE grupo y deja ver el botón
  // del que sigue, así sucesivamente. modAbiertos cuenta cuántos grupos
  // (en orden) ya están revelados.
  let modAbiertos = 1;

  // Si el negocio escribió una pregunta propia para el grupo (ej. "¿Qué
  // salsa quieres?"), se usa esa -- si no, cae a una por defecto con el
  // nombre del grupo.
  function preguntaGrupo(g) { return (g.pregunta && g.pregunta.trim()) || `¿Quieres agregar ${g.nombre}?`; }

  function modCalcularTotal() {
    let extra = 0;
    modGruposActual.forEach(g => {
      const sel = modSeleccion.get(g.id);
      if (!sel) return;
      g.opciones.forEach(o => { if (sel.has(o.id)) extra += Number(o.precio_adicional) || 0; });
    });
    return (Number(modProductoActual.precio) + extra) * modQty;
  }
  function modGrupoCompleto(g) {
    if (g.tipo !== "unica") return true;
    const sel = modSeleccion.get(g.id);
    return !!sel && sel.size === 1;
  }
  function pintarModal() {
    if (modQtyNEl) modQtyNEl.textContent = String(modQty);
    const faltante = modGruposActual.find(g => !modGrupoCompleto(g));
    if (!modAgregarBtn) return;
    if (faltante) {
      modAgregarBtn.disabled = true;
      modAgregarBtn.textContent = `Elige "${faltante.nombre}" para continuar`;
    } else {
      modAgregarBtn.disabled = false;
      modAgregarBtn.textContent = `Añadir ${COP(modCalcularTotal())}`;
    }
  }
  function renderModGrupos() {
    if (!modGruposEl) return;
    const abiertos = modGruposActual.slice(0, modAbiertos);
    const siguiente = modGruposActual[modAbiertos];
    modGruposEl.innerHTML = abiertos.map((g, i) => `
      <div class="carta-mod-grupo${i === abiertos.length - 1 && modAbiertos > 1 ? " carta-mod-grupo--entra" : ""}" data-mod-grupo-box="${g.id}">
        <div class="carta-mod-grupo__head">
          <span class="carta-mod-grupo__titulo">${esc(preguntaGrupo(g))}</span>
          <span class="carta-mod-grupo__tag">${g.tipo === "unica" ? "1 de 1 · obligatorio" : "Opcional"}</span>
        </div>
        ${g.opciones.map(o => `
          <div class="carta-mod-opcion ${g.tipo === "unica" ? "es-radio" : "es-check"}" data-mod-opcion="${o.id}" data-mod-grupo="${g.id}">
            ${o.imagen_url ? `<img class="carta-mod-opcion__foto" src="${esc(o.imagen_url)}" alt="">` : ""}
            <span class="carta-mod-opcion__marca">✓</span>
            <span class="carta-mod-opcion__nombre">${esc(o.nombre)}</span>
            ${Number(o.precio_adicional) > 0 ? `<span class="carta-mod-opcion__precio">+${COP(o.precio_adicional)}</span>` : ""}
          </div>`).join("")}
      </div>`).join("")
      + (siguiente ? `
      <button type="button" class="carta-mod-reveal carta-mod-grupo--entra" data-mod-reveal="1">
        <span>${esc(preguntaGrupo(siguiente))}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>` : "");
    modGruposEl.querySelectorAll("[data-mod-opcion]").forEach(row => row.addEventListener("click", () => {
      const grupoId = row.dataset.modGrupo;
      const opcionId = row.dataset.modOpcion;
      const g = modGruposActual.find(x => x.id === grupoId);
      if (!g) return;
      if (g.tipo === "unica") {
        modSeleccion.set(grupoId, new Set([opcionId]));
      } else {
        const sel = modSeleccion.get(grupoId) || new Set();
        if (sel.has(opcionId)) sel.delete(opcionId); else sel.add(opcionId);
        modSeleccion.set(grupoId, sel);
      }
      const activos = modSeleccion.get(grupoId) || new Set();
      modGruposEl.querySelectorAll(`[data-mod-grupo="${grupoId}"]`).forEach(r => {
        r.classList.toggle("is-on", activos.has(r.dataset.modOpcion));
      });
      pintarModal();
      renderModResumen();
    }));
    modGruposEl.querySelector("[data-mod-reveal]")?.addEventListener("click", () => {
      modAbiertos++;
      renderModGrupos();
      pintarModal();
      requestAnimationFrame(() => {
        modGruposEl.querySelector(".carta-mod-grupo--entra")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  // Resumen de lo elegido hasta el momento -- vive justo antes del botón de
  // "Añadir", para que el cliente vea de un vistazo qué quedó seleccionado
  // antes de confirmar (se actualiza solo con cada toque, no hace falta un
  // paso aparte).
  function renderModResumen() {
    if (!modResumenEl) return;
    const filas = modGruposActual.map(g => {
      const sel = modSeleccion.get(g.id);
      if (!sel || !sel.size) return null;
      const nombres = g.opciones.filter(o => sel.has(o.id)).map(o => o.nombre);
      return nombres.length ? `<div class="carta-mod-resumen__fila"><span>${esc(g.nombre)}</span><span>${esc(nombres.join(", "))}</span></div>` : null;
    }).filter(Boolean);
    if (!filas.length) { modResumenEl.hidden = true; modResumenEl.innerHTML = ""; return; }
    modResumenEl.hidden = false;
    modResumenEl.innerHTML = `<div class="carta-mod-resumen__titulo">Tu pedido hasta ahora</div>${filas.join("")}`;
  }
  function abrirModalProducto(p, grupos) {
    if (!modOverlay) return;
    modProductoActual = p;
    modGruposActual = grupos;
    modSeleccion = new Map();
    modQty = 1;
    modAbiertos = 1;
    if (modNombreEl) modNombreEl.textContent = p.nombre;
    if (modDescEl) { modDescEl.textContent = p.descripcion || ""; modDescEl.hidden = !p.descripcion; }
    renderModGrupos();
    renderModResumen();
    pintarModal();
    modOverlay.hidden = false;
  }
  function cerrarModalProducto() { if (modOverlay) modOverlay.hidden = true; }
  $("#carta-mod-cerrar")?.addEventListener("click", cerrarModalProducto);
  modOverlay?.addEventListener("click", (e) => { if (e.target === modOverlay) cerrarModalProducto(); });
  $("#carta-mod-qty-mas")?.addEventListener("click", () => {
    if (modQty < stockDisponible(modProductoActual)) { modQty++; pintarModal(); }
  });
  $("#carta-mod-qty-menos")?.addEventListener("click", () => { if (modQty > 1) { modQty--; pintarModal(); } });
  modAgregarBtn?.addEventListener("click", () => {
    if (!modProductoActual) return;
    const modificadores = [];
    let extra = 0;
    modGruposActual.forEach(g => {
      const sel = modSeleccion.get(g.id) || new Set();
      g.opciones.forEach(o => {
        if (sel.has(o.id)) {
          modificadores.push({ grupo: g.nombre, opcion: o.nombre, precio_adicional: Number(o.precio_adicional) || 0 });
          extra += Number(o.precio_adicional) || 0;
        }
      });
    });
    const lineKey = `${modProductoActual.id}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    carrito.set(lineKey, {
      producto_id: modProductoActual.id,
      nombre: modProductoActual.nombre,
      precio: Number(modProductoActual.precio) + extra,
      cantidad: modQty,
      modificadores,
      modText: modificadores.map(m => m.opcion).join(", "),
    });
    renderBarra();
    cerrarModalProducto();
    preguntarAlgoMas();
  });

  // ---------- Foto en grande con efecto "se sale de la pantalla" (no es un
  // 360 real -- eso necesitaría varias fotos del producto desde distintos
  // ángulos, que el negocio no tiene). El truco: el marco (.carta-foto-marco)
  // se queda quieto en el plano de la pantalla (Z=0) mientras la foto se
  // empuja hacia adelante en el eje Z -- bajo la perspectiva 3D, lo que está
  // más cerca del espectador se ve más grande, así que la foto "crece" y
  // sobresale del marco. Al inclinar (rotateX/rotateY) ese desfase de
  // profundidad se nota más, como si la foto flotara por delante del marco.
  // La sombra del piso (#carta-foto-piso) se mueve/agranda junto con la
  // inclinación para vender la sensación de que está flotando en el aire. ----------
  const fotoOverlay = $("#carta-foto-overlay");
  const fotoWrap = $("#carta-foto-wrap");
  const fotoGrande = $("#carta-foto-grande");
  const fotoGlare = $("#carta-foto-glare");
  const fotoPiso = $("#carta-foto-piso");
  let tiltTarget = { x: 0, y: 0 };
  let tiltActual = { x: 0, y: 0 };
  let tiltRAF = null;
  let tiltDemoTimers = [];
  // Además de arrastrar con el dedo, si el celular tiene giroscopio la foto
  // también se inclina al mover el celular hacia un lado (como la foto de
  // apertura de las apps de clima). "arrastrando" le da prioridad al dedo
  // sobre el giroscopio cuando se usan los dos a la vez.
  let arrastrando = false;
  let orientacionActiva = false;
  let orientacionBase = null;
  let permisoOrientacionConcedido = typeof DeviceOrientationEvent === "undefined" || typeof DeviceOrientationEvent.requestPermission !== "function";

  function manejarOrientacion(e) {
    if (arrastrando || e.gamma == null || e.beta == null) return;
    if (!orientacionBase) { orientacionBase = { gamma: e.gamma, beta: e.beta }; return; }
    const dx = e.gamma - orientacionBase.gamma; // izquierda/derecha
    const dy = e.beta - orientacionBase.beta;   // adelante/atrás
    tiltTarget = {
      x: Math.max(-20, Math.min(20, dx)),
      y: Math.max(-20, Math.min(20, -dy)),
    };
  }
  function activarOrientacion() {
    if (typeof DeviceOrientationEvent === "undefined" || orientacionActiva) return;
    orientacionBase = null;
    const encender = () => { orientacionActiva = true; window.addEventListener("deviceorientation", manejarOrientacion); };
    if (permisoOrientacionConcedido) { encender(); return; }
    // iOS 13+ exige pedir permiso, y solo funciona si se pide como reacción
    // directa a un toque -- abrirFotoGrande ya se dispara desde un click.
    DeviceOrientationEvent.requestPermission().then((r) => {
      if (r === "granted") { permisoOrientacionConcedido = true; encender(); }
    }).catch(() => {});
  }
  function desactivarOrientacion() {
    if (!orientacionActiva) return;
    window.removeEventListener("deviceorientation", manejarOrientacion);
    orientacionActiva = false;
  }

  function pintarTilt() {
    // Interpolación simple hacia el objetivo -- más fluido que mover el
    // transform pegado 1:1 al dedo, se siente con algo de "peso".
    tiltActual.x += (tiltTarget.x - tiltActual.x) * 0.14;
    tiltActual.y += (tiltTarget.y - tiltActual.y) * 0.14;
    const mag = Math.min(Math.abs(tiltActual.x) + Math.abs(tiltActual.y), 22);
    const pop = 46 + mag * 2.6; // cuánto se "empuja" la foto hacia el espectador
    if (fotoWrap) fotoWrap.style.transform = `rotateY(${tiltActual.x}deg) rotateX(${tiltActual.y}deg)`;
    if (fotoGrande) {
      fotoGrande.style.transform = `translateZ(${pop}px)`;
      fotoGrande.style.boxShadow = `${-tiltActual.x * 1.8}px ${24 + tiltActual.y * 1.8}px 50px -14px rgba(0,0,0,.65)`;
    }
    if (fotoGlare) {
      fotoGlare.style.transform = `translateZ(${pop + 1}px)`;
      fotoGlare.style.background = `radial-gradient(circle at ${50 - tiltActual.x * 2.4}% ${50 + tiltActual.y * 2.4}%, rgba(255,255,255,.55), transparent 55%)`;
    }
    if (fotoPiso) {
      fotoPiso.style.transform = `translateX(calc(-50% + ${tiltActual.x * -2.4}px)) scaleX(${1 + mag / 55})`;
      fotoPiso.style.opacity = String(Math.max(0.2, 0.6 - mag / 45));
    }
    tiltRAF = requestAnimationFrame(pintarTilt);
  }
  function limpiarDemoTilt() { tiltDemoTimers.forEach(clearTimeout); tiltDemoTimers = []; }
  function demoTilt() {
    // Barrido corto al abrir, para que se note el efecto aunque nadie
    // mueva el dedo (sobre todo en celular, donde no hay "hover" que lo
    // revele solo).
    limpiarDemoTilt();
    [[-9, 5], [8, -6], [0, 0]].forEach(([x, y], i) => {
      tiltDemoTimers.push(setTimeout(() => { tiltTarget = { x, y }; }, 260 + i * 420));
    });
  }
  function abrirFotoGrande(src) {
    if (!src || !fotoOverlay || !fotoGrande) return;
    fotoGrande.src = src;
    fotoOverlay.hidden = false;
    tiltTarget = { x: 0, y: 0 }; tiltActual = { x: 0, y: 0 };
    if (!tiltRAF) pintarTilt();
    demoTilt();
    activarOrientacion();
  }
  function cerrarFotoGrande() {
    if (!fotoOverlay) return;
    limpiarDemoTilt();
    desactivarOrientacion();
    fotoOverlay.hidden = true;
    if (tiltRAF) { cancelAnimationFrame(tiltRAF); tiltRAF = null; }
    tiltTarget = { x: 0, y: 0 }; tiltActual = { x: 0, y: 0 };
    if (fotoWrap) fotoWrap.style.transform = "";
    if (fotoGrande) fotoGrande.style.transform = "";
    if (fotoGlare) fotoGlare.style.transform = "";
  }
  function inclinarFoto(clientX, clientY) {
    if (!fotoWrap) return;
    limpiarDemoTilt(); // si ya está moviendo el dedo, se cancela el barrido de demostración
    const r = fotoWrap.getBoundingClientRect();
    const px = (clientX - r.left) / r.width - 0.5;
    const py = (clientY - r.top) / r.height - 0.5;
    tiltTarget = { x: px * 20, y: -py * 20 };
  }
  $("#carta-foto-cerrar")?.addEventListener("click", cerrarFotoGrande);
  fotoOverlay?.addEventListener("click", (e) => { if (e.target === fotoOverlay) cerrarFotoGrande(); });
  fotoOverlay?.addEventListener("mousemove", (e) => inclinarFoto(e.clientX, e.clientY));
  fotoOverlay?.addEventListener("mouseleave", () => { tiltTarget = { x: 0, y: 0 }; });
  fotoOverlay?.addEventListener("touchstart", (e) => {
    arrastrando = true;
    const t = e.touches[0];
    if (t) inclinarFoto(t.clientX, t.clientY);
  }, { passive: true });
  fotoOverlay?.addEventListener("touchmove", (e) => {
    arrastrando = true;
    const t = e.touches[0];
    if (t) inclinarFoto(t.clientX, t.clientY);
  }, { passive: true });
  fotoOverlay?.addEventListener("touchend", () => {
    arrastrando = false;
    // si hay giroscopio activo, se deja que retome el control en vez de
    // volver siempre al centro -- si no, se comporta como antes.
    if (!orientacionActiva) tiltTarget = { x: 0, y: 0 };
  });

  // ---------- Mini pasarela de pago: efectivo (pagar en caja) o
  // transferencia (llave del negocio + comprobante) ----------
  const llaveInput = $("#carta-pago-llave");
  if (llaveInput) llaveInput.value = negocio.tienda_llave_pago || "Este negocio no configuró su llave -- paga en efectivo";
  // Si el negocio subió una foto de su QR real (Nequi/Daviplata...), se
  // muestra tal cual -- mucho más rápido de escanear que copiar la llave.
  // También se puede descargar: el atributo "download" de un link no
  // funciona cuando el archivo está en otro dominio (Supabase Storage), así
  // que se baja por JS y se arma un blob URL antes de guardarlo.
  const pagoQrEl = $("#carta-pago-qr");
  const pagoQrDescargarBtn = $("#carta-pago-qr-descargar");
  if (pagoQrEl) {
    if (negocio.tienda_llave_qr_url) {
      pagoQrEl.src = negocio.tienda_llave_qr_url; pagoQrEl.hidden = false;
      if (pagoQrDescargarBtn) pagoQrDescargarBtn.hidden = false;
    } else {
      pagoQrEl.hidden = true;
      if (pagoQrDescargarBtn) pagoQrDescargarBtn.hidden = true;
    }
  }
  pagoQrDescargarBtn?.addEventListener("click", async () => {
    const url = negocio.tienda_llave_qr_url;
    // En iPhone, Safari no respeta el atributo "download" para imágenes --
    // en vez de guardarla, abre una vista previa rara. Lo que sí funciona en
    // cualquier celular moderno es el botón nativo de "compartir" (deja
    // guardar en Fotos con un toque); si el navegador no lo soporta, se abre
    // la imagen sola para guardarla manteniéndola presionada, como siempre.
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const file = new File([blob], `qr-de-pago.${ext}`, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch {}
    window.open(url, "_blank");
  });
  // Muestra el monto exacto a pagar/transferir dentro del propio recuadro de
  // efectivo/transferencia (grande, con botón de copiar) -- antes solo se
  // veía chiquito arriba de todo el resumen, lejos de donde de verdad hace
  // falta a la hora de pagar.
  function sincronizarMontoPago() {
    const montoTxt = $("#carta-sheet-total")?.textContent || "$0";
    const efMonto = $("#carta-pago-efectivo-monto"); if (efMonto) efMonto.textContent = montoTxt;
    const trMonto = $("#carta-pago-transferencia-monto"); if (trMonto) trMonto.textContent = montoTxt;
  }
  $$(".carta-pago-monto-copiar").forEach(btn => btn.addEventListener("click", () => {
    const montoEl = $(`#carta-pago-${btn.dataset.copiarMonto}-monto`);
    const digitos = (montoEl?.textContent || "").replace(/\D/g, "");
    if (!digitos) return;
    copiarTextoConRespaldo(digitos).then(() => {
      const orig = btn.textContent;
      btn.textContent = "Copiado";
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  }));
  let metodoPago = null;
  $$(".carta-metodo-btn[data-metodo]").forEach(b => b.addEventListener("click", () => {
    metodoPago = b.dataset.metodo;
    $$(".carta-metodo-btn[data-metodo]").forEach(x => x.classList.toggle("is-on", x === b));
    const efEl = $("#carta-pago-efectivo"); if (efEl) efEl.hidden = metodoPago !== "efectivo";
    const trEl = $("#carta-pago-transferencia"); if (trEl) trEl.hidden = metodoPago !== "transferencia";
    sincronizarMontoPago();
  }));
  $("#carta-pago-llave-copiar")?.addEventListener("click", () => {
    const btnCopiar = $("#carta-pago-llave-copiar");
    copiarTextoConRespaldo(llaveInput?.value || "").then(() => {
      if (!btnCopiar) return;
      const orig = btnCopiar.textContent;
      btnCopiar.textContent = "Copiada";
      setTimeout(() => { btnCopiar.textContent = orig; }, 1500);
    });
  });

  // ---------- Mesa compartida: 3 formas de mandar el pedido --
  // "mio" (paga solo lo suyo, pasarela normal), "mesa" (paga el total
  // acumulado de la mesa hasta ese momento -- lo suyo + lo que los demás ya
  // pidieron y no han pagado) o "nadie" (alguien más de la mesa va a pagar
  // por esta persona, así que su pedido se manda SIN pasar por la pasarela
  // -- queda sin pagar, pero cuenta en el acumulado que ve quien sí paga). ----------
  let mesaAlcance = null;
  async function actualizarTotalMesa() {
    const { total: totalMio } = totalCarrito();
    const totSpan = $("#carta-sheet-total");
    const notaEl = $("#carta-mesa-alcance-total");
    const facturaEl = $("#carta-mesa-factura");
    const campoPago = $("#carta-campo-pago");
    if (campoPago) campoPago.hidden = mesaAlcance === "nadie";
    if (mesaAlcance === "nadie") {
      if (totSpan) totSpan.textContent = COP(totalMio);
      if (notaEl) notaEl.textContent = "Tu pedido se agrega a la mesa sin que pagues ahora -- alguien más de la mesa paga todo al final.";
      if (facturaEl) facturaEl.innerHTML = "";
      sincronizarMontoPago();
      return;
    }
    if (mesaAlcance !== "mesa") {
      if (totSpan) totSpan.textContent = COP(totalMio);
      if (notaEl) notaEl.textContent = "";
      if (facturaEl) facturaEl.innerHTML = "";
      sincronizarMontoPago();
      return;
    }
    let totalMesa = totalMio;
    try {
      // negocio_carta_pedidos no tiene lectura pública en general -- pero
      // quien elige "pago toda la mesa" sí necesita ver qué está pagando,
      // así que detalle_pendiente_mesa() expone SOLO items+nombre (nunca
      // WhatsApp ni comprobante) de los pedidos sin pagar de esa mesa.
      const [{ data: sumaPendiente }, { data: detalle }] = await Promise.all([
        supabase.rpc("total_pendiente_mesa", { p_mesa_sesion_id: mesaSesionId }),
        supabase.rpc("detalle_pendiente_mesa", { p_mesa_sesion_id: mesaSesionId }),
      ]);
      totalMesa += Number(sumaPendiente || 0);
      if (facturaEl) {
        const filas = [
          ...[...carrito.values()].map(it => ({ ...it, cliente: "Tú" })),
          ...(detalle || []).flatMap(p => (Array.isArray(p.items) ? p.items : []).map(it => ({ ...it, cliente: p.cliente_nombre }))),
        ];
        facturaEl.innerHTML = filas.map(it => `
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--tinta-45);padding:2px 0">
            <span>${it.cantidad}× ${esc(it.nombre)} · ${esc(it.cliente)}</span>
            <span>${COP(Number(it.precio || 0) * Number(it.cantidad || 0))}</span>
          </div>`).join("");
      }
    } catch {}
    if (totSpan) totSpan.textContent = COP(totalMesa);
    if (notaEl) notaEl.textContent = `Pagas el total de la mesa: ${COP(totalMesa)} (lo tuyo + lo que ya pidieron y no han pagado).`;
    sincronizarMontoPago();
  }
  $$("#carta-campo-mesa-alcance [data-alcance]").forEach(b => b.addEventListener("click", () => {
    mesaAlcance = b.dataset.alcance;
    $$("#carta-campo-mesa-alcance [data-alcance]").forEach(x => x.classList.toggle("is-on", x === b));
    if (mesaAlcance === "azar") { activarRetoAzar(); return; }
    // Si veníamos de un reto (lo lancé, o lo acepté, o me lo propusieron) y
    // se elige otra opción, se cancela/limpia -- este botón ya no aplica.
    if (retoActual) {
      if (retoActual.creado_whatsapp === miWhatsAppOCreado()) {
        supabase.from("negocio_mesas_retos").update({ estado: "cancelado" }).eq("id", retoActual.id).then(() => {}, () => {});
      }
      limpiarReto();
    }
    const enviarBtn = $("#carta-enviar-pedido");
    mostrar(enviarBtn);
    if (enviarBtn) enviarBtn.textContent = mesaAlcance === "nadie" ? "Enviar pedido" : "Ya pagué";
    // Los sellos son una recompensa por pagar -- si alguien más va a pagar
    // por esta persona, no tiene sentido ofrecerle sellos a ella acá.
    const hintEl = $("#carta-sellos-hint");
    if (hintEl && negocio.carta_sellos_activo) hintEl.hidden = mesaAlcance === "nadie";
    actualizarTotalMesa();
  }));

  // ---------- Reto de pago al azar: solo en mesa compartida. La primera
  // persona que lo activa "lanza" el reto (fila en negocio_mesas_retos);
  // los demás ven "Acepto el reto"/"Yo pago lo mío" en vez del selector
  // normal. Con 2+ aceptados, quien lo lanzó gira una ruleta (con los
  // nombres de quienes aceptaron) deslizándola con el dedo -- todos los que
  // aceptaron la ven girar EN VIVO: Supabase Realtime manda el ángulo final
  // y la hora exacta de inicio, así que cada celular anima la MISMA vuelta,
  // aunque el gesto lo haga solo quien lanzó el reto. A quien le toque paga
  // el total de todos juntos en un solo pedido. ----------
  const COLORES_RULETA = ["#095544", "#EAB749", "#D97757", "#4F46E5", "#DB2777", "#059669", "#C2410C", "#7C3AED"];
  function mostrar(el, display = "") { if (el) { el.hidden = false; el.style.display = display; } }
  function ocultar(el) { if (el) { el.hidden = true; el.style.display = "none"; } }
  let retoActual = null; // fila de negocio_mesas_retos
  let retoParticipantes = []; // filas de negocio_mesas_retos_participantes (respuesta='acepto')
  let retoCanal = null;
  let retoTimerInterval = null;
  let retoGanadorPendiente = null; // { items, monto } cuando YO soy quien tiene que pagar
  let _girandoLocal = false;

  function miWhatsAppOCreado() { return obtenerIdentidad()?.whatsapp || $("#carta-cliente-wa")?.value.trim() || null; }
  function miNombreOCreado() { return obtenerIdentidad()?.nombre || $("#carta-cliente-nombre")?.value.trim() || "Alguien"; }

  function mostrarVistaReto(vista) {
    mostrar($("#carta-reto-panel"), vista ? "" : "none");
    ["responder", "esperando", "resultado"].forEach(v => {
      const el = $(`#carta-reto-${v}`);
      if (v === vista) mostrar(el); else ocultar(el);
    });
    // Cada vez que se ENTRA a "esperando" de cero (lanzar o aceptar) el
    // link de cancelar vuelve a verse -- animarRuletaSincronizada lo
    // esconde mientras gira, sin pasar por acá de nuevo.
    if (vista === "esperando") mostrar($("#carta-reto-cancelar"));
    mostrar($("#carta-campo-mesa-alcance"), vista ? "none" : "");
    if (vista) {
      ocultar($("#carta-campo-pago")); ocultar($("#carta-pago-efectivo")); ocultar($("#carta-pago-transferencia"));
      ocultar($("#carta-enviar-pedido"));
    } else {
      mostrar($("#carta-enviar-pedido"));
    }
  }
  function limpiarReto() {
    if (retoCanal) { supabase.removeChannel(retoCanal); retoCanal = null; }
    if (retoTimerInterval) { clearInterval(retoTimerInterval); retoTimerInterval = null; }
    retoActual = null; retoParticipantes = []; retoGanadorPendiente = null; _girandoLocal = false;
    mostrarVistaReto(null);
  }
  async function cancelarReto(mensaje) {
    if (retoActual && retoActual.creado_whatsapp === miWhatsAppOCreado()) {
      await supabase.from("negocio_mesas_retos").update({ estado: "cancelado" }).eq("id", retoActual.id);
    }
    limpiarReto();
    mesaAlcance = null;
    $$("#carta-campo-mesa-alcance [data-alcance]").forEach(x => x.classList.remove("is-on"));
    if (mensaje) alert(mensaje);
  }
  async function cargarParticipantesReto() {
    if (!retoActual) return;
    const { data } = await supabase.from("negocio_mesas_retos_participantes").select("*").eq("reto_id", retoActual.id).eq("respuesta", "acepto");
    retoParticipantes = data || [];
    pintarEsperando();
  }
  function pintarEsperando() {
    if (!retoActual) return;
    const cont = $("#carta-reto-participantes");
    if (cont) cont.innerHTML = retoParticipantes.map(p => `<span class="carta-reto-chip">${esc(p.cliente_nombre)}${p.cliente_whatsapp === miWhatsAppOCreado() ? " (tú)" : ""}</span>`).join("");
    const soyLanzador = retoActual.creado_whatsapp === miWhatsAppOCreado();
    const listo = retoParticipantes.length >= 2;
    const wheelWrap = $("#carta-reto-wheel-wrap");
    const girarBtn = $("#carta-reto-girar");
    const hintEl = $("#carta-reto-hint");
    // La ruleta recién aparece (quieta, deslizable por quien la lanzó) en
    // cuanto hay 2+ aceptados -- antes no tiene sentido pintarla.
    if (listo) { pintarSegmentosRuleta(); mostrar(wheelWrap); } else { ocultar(wheelWrap); }
    if (soyLanzador && listo) mostrar(girarBtn); else ocultar(girarBtn);
    if (!listo) {
      if (hintEl) hintEl.textContent = "Esperando que al menos una persona más acepte (mínimo 2)...";
    } else if (soyLanzador) {
      if (hintEl) hintEl.textContent = "¡Ya pueden girar! Desliza la ruleta con el dedo (o toca el botón).";
    } else if (hintEl) {
      hintEl.textContent = `Esperando a que ${esc(retoActual.creado_nombre)} gire la ruleta...`;
    }
  }
  function actualizarTimerReto() {
    if (!retoActual) return;
    const restanteMs = new Date(retoActual.expira_at).getTime() - Date.now();
    const timerEl = $("#carta-reto-timer");
    if (restanteMs <= 0) {
      if (retoParticipantes.length < 2) { cancelarReto("Se acabó el tiempo y no hubo suficientes personas -- cada quien paga lo suyo."); return; }
      if (timerEl) timerEl.textContent = "¡Tiempo cumplido!";
      return;
    }
    const m = Math.floor(restanteMs / 60000), s = Math.floor((restanteMs % 60000) / 1000);
    if (timerEl) timerEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
  }
  // Suscripción a nivel de MESA (no de un reto puntual) -- así, si alguien
  // abre su hoja de pago y todavía no hay reto, igual se entera apenas otro
  // de la mesa lo lanza, sin tener que tocar "Dejarlo al azar" él mismo.
  function suscribirMesaReto() {
    if (!mesaSesionId) return;
    if (retoCanal) { supabase.removeChannel(retoCanal); retoCanal = null; }
    retoCanal = supabase.channel(`mesa-reto-${mesaSesionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "negocio_mesas_retos", filter: `mesa_sesion_id=eq.${mesaSesionId}` }, (payload) => {
        if (retoActual || payload.new.creado_whatsapp === miWhatsAppOCreado()) return;
        retoActual = payload.new;
        mostrarVistaReto("responder");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "negocio_mesas_retos", filter: `mesa_sesion_id=eq.${mesaSesionId}` }, (payload) => {
        if (!retoActual || payload.new.id !== retoActual.id) return;
        retoActual = payload.new;
        manejarCambioReto();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "negocio_mesas_retos_participantes", filter: `mesa_sesion_id=eq.${mesaSesionId}` }, (payload) => {
        if (!retoActual || payload.new.reto_id !== retoActual.id) return;
        cargarParticipantesReto();
      })
      .subscribe();
  }
  // ¿Ya hay un reto activo en esta mesa cuando se abre la hoja de pago? (lo
  // lanzó o lo aceptó alguien antes de que yo abriera, o yo mismo lo había
  // aceptado y volví a entrar) -- se muestra de una vez en vez del selector.
  async function revisarRetoAlAbrir() {
    if (!mesaSesionId) return;
    const { data: existente } = await supabase.from("negocio_mesas_retos")
      .select("*").eq("mesa_sesion_id", mesaSesionId).in("estado", ["esperando", "girando"])
      .gt("expira_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!existente) return;
    retoActual = existente;
    const miWa = miWhatsAppOCreado();
    let yaDentro = existente.creado_whatsapp === miWa;
    if (!yaDentro && miWa) {
      const { data: miFila } = await supabase.from("negocio_mesas_retos_participantes")
        .select("respuesta").eq("reto_id", existente.id).eq("cliente_whatsapp", miWa).maybeSingle();
      yaDentro = miFila?.respuesta === "acepto";
    }
    if (yaDentro) {
      await cargarParticipantesReto();
      mostrarVistaReto("esperando");
      if (existente.estado === "girando") { animarRuletaSincronizada(); return; }
      retoTimerInterval = setInterval(actualizarTimerReto, 1000);
      actualizarTimerReto();
      mesaAlcance = "azar";
      $$("#carta-campo-mesa-alcance [data-alcance]").forEach(x => x.classList.toggle("is-on", x.dataset.alcance === "azar"));
    } else {
      mostrarVistaReto("responder");
    }
  }
  function manejarCambioReto() {
    if (!retoActual) return;
    if (retoActual.estado === "cancelado") {
      limpiarReto();
      mesaAlcance = null;
      $$("#carta-campo-mesa-alcance [data-alcance]").forEach(x => x.classList.remove("is-on"));
      alert("Se canceló el reto de pago al azar -- cada quien paga lo suyo.");
      return;
    }
    if (retoActual.estado === "girando" && !_girandoLocal) animarRuletaSincronizada();
  }

  function pintarSegmentosRuleta() {
    const wheelEl = $("#carta-reto-wheel");
    if (!wheelEl || !retoParticipantes.length) return;
    const n = retoParticipantes.length, porcion = 360 / n;
    wheelEl.style.background = `conic-gradient(${retoParticipantes.map((p, i) => `${COLORES_RULETA[i % COLORES_RULETA.length]} ${i * porcion}deg ${(i + 1) * porcion}deg`).join(", ")})`;
    wheelEl.innerHTML = retoParticipantes.map((p, i) => `<div class="carta-reto-wheel__seg" style="transform:rotate(${i * porcion + porcion / 2}deg)"><span>${esc(p.cliente_nombre)}</span></div>`).join("");
  }
  function anguloGanador(ganadorWhatsapp) {
    const n = retoParticipantes.length;
    const idx = retoParticipantes.findIndex(p => p.cliente_whatsapp === ganadorWhatsapp);
    if (idx < 0) return 0;
    const porcion = 360 / n;
    // El puntero apunta hacia arriba (0deg) -- la rueda tiene que girar
    // hasta que la MITAD del segmento ganador quede justo ahí.
    return 360 - (idx * porcion + porcion / 2);
  }
  function reproducirSonidoRuleta(tipo) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const tono = (freq, inicio, dur, vol = 0.15) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + inicio);
        gain.gain.setValueAtTime(vol, ctx.currentTime + inicio);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + dur);
        osc.start(ctx.currentTime + inicio); osc.stop(ctx.currentTime + inicio + dur);
      };
      if (tipo === "giro") { tono(520, 0, 0.18); tono(420, 0.12, 0.18); tono(520, 0.24, 0.18); }
      else { tono(660, 0, 0.14); tono(880, 0.12, 0.16); tono(1100, 0.26, 0.3); }
    } catch {}
  }
  async function animarRuletaSincronizada() {
    _girandoLocal = true;
    // La ruleta ya está quieta y pintada en pantalla desde que hubo 2+
    // aceptados (ver pintarEsperando) -- acá solo se anima el MISMO
    // elemento en su sitio, nada de cambiar de vista. Mientras gira, no se
    // puede volver a tocar ni cancelar.
    mostrarVistaReto("esperando");
    ocultar($("#carta-reto-girar"));
    ocultar($("#carta-reto-cancelar"));
    reproducirSonidoRuleta("giro");
    const wheelEl = $("#carta-reto-wheel");
    const inicio = new Date(retoActual.giro_inicio_at).getTime();
    const duracion = retoActual.giro_duracion_ms || 7000;
    const restante = Math.max(300, duracion - (Date.now() - inicio));
    const vueltas = 6;
    const anguloTotal = vueltas * 360 + (retoActual.angulo_final || 0);
    if (wheelEl) {
      wheelEl.style.transition = `transform ${restante}ms cubic-bezier(.17,.67,.21,1)`;
      requestAnimationFrame(() => { wheelEl.style.transform = `rotate(${anguloTotal}deg)`; });
    }
    setTimeout(() => mostrarResultadoReto(), restante);
  }
  async function mostrarResultadoReto() {
    _girandoLocal = false;
    reproducirSonidoRuleta("resultado");
    const soyGanador = retoActual.ganador_whatsapp === miWhatsAppOCreado();
    const ganadorNombre = retoParticipantes.find(p => p.cliente_whatsapp === retoActual.ganador_whatsapp)?.cliente_nombre || "Alguien";
    const total = retoParticipantes.reduce((s, p) => s + Number(p.monto || 0), 0);
    mostrarVistaReto("resultado");
    const icEl = $("#carta-reto-resultado-ic"), tituloEl = $("#carta-reto-resultado-titulo"), textoEl = $("#carta-reto-resultado-texto");
    if (soyGanador) {
      if (icEl) icEl.textContent = "💸";
      if (tituloEl) tituloEl.textContent = "¡Te tocó pagar!";
      if (textoEl) textoEl.textContent = `Perdiste la ruleta -- te toca pagar el total de todos: ${COP(total)}`;
      retoGanadorPendiente = {
        items: retoParticipantes.flatMap(p => (Array.isArray(p.items) ? p.items : []).map(it => ({ ...it, cliente: p.cliente_nombre }))),
        monto: total,
      };
      setTimeout(() => continuarPagoGanadorReto(), 4000);
    } else {
      if (icEl) icEl.textContent = "😅";
      if (tituloEl) tituloEl.textContent = "¡Te salvaste!";
      if (textoEl) textoEl.textContent = `${esc(ganadorNombre)} pagó la ruleta -- tu pedido ya quedó cubierto, no tienes que hacer nada más.`;
      carrito.clear();
      items.forEach(p => renderQty(p.id));
      renderBarra();
      setTimeout(() => { if (overlay) overlay.hidden = true; limpiarReto(); }, 4000);
    }
  }
  function continuarPagoGanadorReto() {
    if (!retoGanadorPendiente) return;
    mostrarVistaReto(null);
    mostrar($("#carta-campo-mesa-alcance"), "none");
    const cont = $("#carta-sheet-items");
    if (cont) cont.innerHTML = retoGanadorPendiente.items.map(it => `
      <div class="carta-sheet__item"><span>${it.cantidad}× ${esc(it.nombre)} <small style="color:var(--tinta-45)">· ${esc(it.cliente)}</small></span><span>${COP(it.precio * it.cantidad)}</span></div>`).join("");
    const totSpan = $("#carta-sheet-total"); if (totSpan) totSpan.textContent = COP(retoGanadorPendiente.monto);
    sincronizarMontoPago();
    mostrar($("#carta-campo-pago"));
    mostrar($("#carta-enviar-pedido"));
    const enviarBtn = $("#carta-enviar-pedido"); if (enviarBtn) enviarBtn.textContent = "Ya pagué";
  }

  $("#carta-reto-girar")?.addEventListener("click", () => lanzarGiro());
  // Deslizar la ruleta con el dedo también la lanza -- basta con soltar
  // para que gire, no hace falta medir la fuerza del gesto: el resultado ya
  // está decidido antes de animarse (es al azar de verdad, no depende de
  // qué tan fuerte deslizaron).
  let _arrastreInicioX = null;
  $("#carta-reto-wheel")?.addEventListener("pointerdown", (e) => {
    if (!retoActual || retoActual.creado_whatsapp !== miWhatsAppOCreado() || retoParticipantes.length < 2 || _girandoLocal) return;
    _arrastreInicioX = e.clientX;
  });
  $("#carta-reto-wheel")?.addEventListener("pointerup", (e) => {
    if (_arrastreInicioX == null) return;
    const delta = Math.abs(e.clientX - _arrastreInicioX);
    _arrastreInicioX = null;
    if (delta > 10) lanzarGiro();
  });
  async function lanzarGiro() {
    if (!retoActual || _girandoLocal || retoParticipantes.length < 2) return;
    const ganador = retoParticipantes[Math.floor(Math.random() * retoParticipantes.length)];
    const angulo = anguloGanador(ganador.cliente_whatsapp);
    await supabase.from("negocio_mesas_retos").update({
      estado: "girando", ganador_whatsapp: ganador.cliente_whatsapp,
      giro_inicio_at: new Date().toISOString(), giro_duracion_ms: 7000, angulo_final: angulo,
    }).eq("id", retoActual.id);
  }

  async function activarRetoAzar() {
    // ¿Ya hay un reto activo (esperando o girando, sin vencer) en esta
    // mesa? Entonces esta persona se une a ÉSE en vez de lanzar uno nuevo.
    const { data: existente } = await supabase.from("negocio_mesas_retos")
      .select("*").eq("mesa_sesion_id", mesaSesionId).in("estado", ["esperando", "girando"])
      .gt("expira_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existente) { retoActual = existente; mostrarVistaReto("responder"); return; }
    const miWa = miWhatsAppOCreado(), miNombre = miNombreOCreado();
    if (!miWa) { alert("Escribe tu WhatsApp arriba para poder participar en el reto"); return; }
    const { data: nuevo, error } = await supabase.from("negocio_mesas_retos").insert({
      negocio_id: aliadoId, mesa_sesion_id: mesaSesionId, estado: "esperando",
      creado_whatsapp: miWa, creado_nombre: miNombre, expira_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    }).select().single();
    if (error || !nuevo) { alert("No pudimos lanzar el reto. Intenta de nuevo."); return; }
    retoActual = nuevo;
    const { total } = totalCarrito();
    await supabase.from("negocio_mesas_retos_participantes").insert({
      reto_id: nuevo.id, mesa_sesion_id: mesaSesionId, cliente_nombre: miNombre, cliente_whatsapp: miWa,
      respuesta: "acepto", items: [...carrito.values()], monto: total,
    });
    suscribirMesaReto();
    await cargarParticipantesReto();
    mostrarVistaReto("esperando");
    retoTimerInterval = setInterval(actualizarTimerReto, 1000);
    actualizarTimerReto();
  }
  $("#carta-reto-aceptar")?.addEventListener("click", async () => {
    if (!retoActual) return;
    const miWa = miWhatsAppOCreado(), miNombre = miNombreOCreado();
    if (!miWa) { alert("Escribe tu WhatsApp arriba para poder participar en el reto"); return; }
    const { total } = totalCarrito();
    await supabase.from("negocio_mesas_retos_participantes").upsert({
      reto_id: retoActual.id, mesa_sesion_id: mesaSesionId, cliente_nombre: miNombre, cliente_whatsapp: miWa,
      respuesta: "acepto", items: [...carrito.values()], monto: total,
    }, { onConflict: "reto_id,cliente_whatsapp" });
    suscribirMesaReto();
    await cargarParticipantesReto();
    mostrarVistaReto("esperando");
    retoTimerInterval = setInterval(actualizarTimerReto, 1000);
    actualizarTimerReto();
  });
  $("#carta-reto-rechazar")?.addEventListener("click", () => {
    limpiarReto();
    mesaAlcance = "mio";
    $$("#carta-campo-mesa-alcance [data-alcance]").forEach(x => x.classList.toggle("is-on", x.dataset.alcance === "mio"));
    const enviarBtn = $("#carta-enviar-pedido"); if (enviarBtn) enviarBtn.textContent = "Ya pagué";
    actualizarTotalMesa();
  });
  $("#carta-reto-cancelar")?.addEventListener("click", () => cancelarReto(null));

  // ---------- Recoger o domicilio (solo cuando NO es pedido de mesa -- si
  // ya estás comiendo en el local, no aplica). Si el negocio no activó
  // domicilio, no se pregunta nada: se manda como "recoger" sin más. ----------
  let tipoEntrega = null;
  function actualizarTotalEntrega() {
    const { total: totalMio } = totalCarrito();
    const fee = tipoEntrega === "domicilio" ? Number(negocio.carta_domicilio_valor) || 0 : 0;
    const totSpan = $("#carta-sheet-total"); if (totSpan) totSpan.textContent = COP(totalMio + fee);
    sincronizarMontoPago();
    const campoDireccion = $("#carta-campo-direccion"); if (campoDireccion) campoDireccion.hidden = tipoEntrega !== "domicilio";
    const infoEl = $("#carta-entrega-info");
    if (infoEl) {
      const partes = [];
      if (tipoEntrega === "domicilio" && fee > 0) partes.push(`Domicilio: ${COP(fee)}`);
      if (tipoEntrega === "recoger" && /^https?:\/\//i.test(negocio.maps_url || "")) partes.push(`<a href="${esc(negocio.maps_url)}" target="_blank" rel="noopener" style="color:var(--verde)">Ver ubicación ↗</a>`);
      if (negocio.carta_domicilio_tiempo) partes.push(`Tiempo estimado: ${esc(negocio.carta_domicilio_tiempo)}`);
      infoEl.innerHTML = partes.join(" · ");
    }
  }
  $$("#carta-campo-entrega [data-entrega]").forEach(b => b.addEventListener("click", () => {
    tipoEntrega = b.dataset.entrega;
    $$("#carta-campo-entrega [data-entrega]").forEach(x => x.classList.toggle("is-on", x === b));
    actualizarTotalEntrega();
  }));

  // ---------- Resumen / checkout ----------
  const overlay = $("#carta-overlay");
  const abrirResumen = async () => {
    const { total } = totalCarrito();
    const itemsHtml = [...carrito.values()].map(it => `
      <div class="carta-sheet__item"><span>${it.cantidad}× ${esc(it.nombre)}${it.modText ? `<br><small style="color:var(--tinta-45);font-weight:400">${esc(it.modText)}</small>` : ""}</span><span>${COP(it.precio * it.cantidad)}</span></div>`).join("");
    const cont = $("#carta-sheet-items"); if (cont) cont.innerHTML = itemsHtml;
    const totSpan = $("#carta-sheet-total"); if (totSpan) totSpan.textContent = COP(total);
    sincronizarMontoPago();
    // Reinicia la elección de método de pago (y de alcance, si hay mesa) en
    // cada pedido nuevo -- no debe quedar pegada la del pedido anterior.
    // Si había un reto de pago al azar en pantalla, también se limpia (no
    // se cancela en el servidor: puede que otros de la mesa lo sigan
    // viendo, solo se deja de mostrar acá).
    limpiarReto();
    metodoPago = null;
    mesaAlcance = null;
    $$(".carta-metodo-btn[data-metodo]").forEach(x => x.classList.remove("is-on"));
    $$("#carta-campo-mesa-alcance [data-alcance]").forEach(x => x.classList.remove("is-on"));
    const notaAlcance = $("#carta-mesa-alcance-total"); if (notaAlcance) notaAlcance.textContent = "";
    const facturaAlcance = $("#carta-mesa-factura"); if (facturaAlcance) facturaAlcance.innerHTML = "";
    const efEl = $("#carta-pago-efectivo"); if (efEl) efEl.hidden = true;
    const trEl = $("#carta-pago-transferencia"); if (trEl) trEl.hidden = true;
    const compInput = $("#carta-comprobante"); if (compInput) compInput.value = "";
    const campoAlcance = $("#carta-campo-mesa-alcance"); if (campoAlcance) campoAlcance.hidden = !mesaSesionId;
    // El recoger/domicilio no aplica en mesa (ya se está comiendo en el
    // local), y tampoco se pregunta si el negocio no activó domicilio.
    tipoEntrega = null;
    $$("#carta-campo-entrega [data-entrega]").forEach(x => x.classList.remove("is-on"));
    const infoEntregaEl = $("#carta-entrega-info"); if (infoEntregaEl) infoEntregaEl.innerHTML = "";
    const direccionInput = $("#carta-cliente-direccion"); if (direccionInput) direccionInput.value = "";
    const campoDireccion = $("#carta-campo-direccion"); if (campoDireccion) campoDireccion.hidden = true;
    const campoEntrega = $("#carta-campo-entrega"); if (campoEntrega) campoEntrega.hidden = !!mesaSesionId || !negocio.carta_domicilio_activo;
    // En mesa, la pasarela de pago se queda oculta hasta que elija "pago lo
    // mío" o "pago toda la mesa" -- si no hay mesa, se ve siempre de una vez.
    const campoPago = $("#carta-campo-pago"); if (campoPago) campoPago.hidden = !!mesaSesionId;
    const enviarBtn = $("#carta-enviar-pedido"); if (enviarBtn) enviarBtn.textContent = "Ya pagué";
    const hintEl = $("#carta-sellos-hint"); if (hintEl && negocio.carta_sellos_activo) hintEl.hidden = false;
    $("#carta-sheet-form").hidden = false;
    $("#carta-sheet-exito").hidden = true;
    overlay.hidden = false;
    // Si estamos en mesa, de una vez se escucha por si alguien lanza el
    // reto de pago al azar mientras esta hoja está abierta, y se revisa si
    // ya había uno activo antes de abrirla (lo lanzó o lo aceptó alguien).
    if (mesaSesionId) { suscribirMesaReto(); await revisarRetoAlAbrir(); }
  };
  $("#carta-ver-pedido")?.addEventListener("click", abrirResumen);
  $("#carta-sheet-cerrar")?.addEventListener("click", () => { overlay.hidden = true; });
  overlay?.addEventListener("click", (e) => { if (e.target === overlay) overlay.hidden = true; });

  // ---------- "¿Deseas agregar algo más?": sale cada vez que se agrega un
  // producto nuevo (ver preguntarAlgoMas() más arriba, llamada desde los
  // handlers de +/Añadir y del modal de toppings). Sí vuelve al feed tal
  // cual estaba; No abre directo el resumen de pago -- la barra de abajo
  // con el total sigue disponible igual, por si prefiere seguir por ahí. ----------
  const masAlgoOverlay = $("#carta-masalgo-overlay");
  $("#carta-masalgo-si")?.addEventListener("click", () => { if (masAlgoOverlay) masAlgoOverlay.hidden = true; });
  $("#carta-masalgo-no")?.addEventListener("click", () => { if (masAlgoOverlay) masAlgoOverlay.hidden = true; abrirResumen(); });
  function preguntarAlgoMas() { if (masAlgoOverlay) masAlgoOverlay.hidden = false; }

  let _cartaEnviando = false;
  // Si perdí la ruleta, este mismo botón ("Ya pagué") manda UN pedido
  // combinado con los ítems de todos los que aceptaron el reto, en vez del
  // carrito propio -- ver continuarPagoGanadorReto() más arriba.
  async function enviarPagoGanadorReto() {
    const btn = $("#carta-enviar-pedido");
    if (_cartaEnviando || !retoGanadorPendiente) return;
    if (!metodoPago) { alert("Elige cómo vas a pagar"); return; }
    const comprobanteFile = $("#carta-comprobante")?.files?.[0];
    if (metodoPago === "transferencia" && !comprobanteFile) { alert("Sube el comprobante de pago"); return; }
    _cartaEnviando = true;
    btn.disabled = true; btn.textContent = "Enviando…";
    let comprobanteUrl = null;
    if (metodoPago === "transferencia" && comprobanteFile) {
      try {
        const file = await comprimirImagen(comprobanteFile);
        const ext = file.name.split(".").pop();
        const path = `comprobante-carta-${aliadoId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        comprobanteUrl = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
      } catch {
        _cartaEnviando = false; btn.disabled = false; btn.textContent = "Ya pagué";
        alert("No pudimos subir el comprobante. Intenta de nuevo.");
        return;
      }
    }
    const miNombre = miNombreOCreado(), miWa = miWhatsAppOCreado();
    const payload = {
      negocio_id: aliadoId, cliente_nombre: miNombre, cliente_whatsapp: miWa || null,
      nota: "🎲 Pago de la ruleta -- cubre los pedidos de todos los que aceptaron el reto.",
      items: retoGanadorPendiente.items, monto_total: retoGanadorPendiente.monto, estado: "pendiente",
      metodo_pago: metodoPago, comprobante_url: comprobanteUrl,
      mesa_id: mesaId, mesa_sesion_id: mesaSesionId, mesa_nombre: mesaNombre,
    };
    const { error } = await supabase.from("negocio_carta_pedidos").insert(payload);
    btn.disabled = false; btn.textContent = "Ya pagué";
    _cartaEnviando = false;
    if (error) { alert("No pudimos enviar el pago. Intenta de nuevo."); return; }
    if (retoActual) supabase.from("negocio_mesas_retos").update({ estado: "terminado" }).eq("id", retoActual.id).then(() => {}, () => {});
    carrito.clear();
    items.forEach(p => renderQty(p.id));
    renderBarra();
    limpiarReto();
    $("#carta-sheet-form").hidden = true;
    $("#carta-sheet-exito").hidden = false;
    const tituloExito = $("#carta-sheet-exito h3"); if (tituloExito) tituloExito.textContent = "¡Pago enviado!";
    const textoExito = $("#carta-sheet-exito p"); if (textoExito) textoExito.textContent = "Pagaste por todos los que aceptaron el reto -- el negocio lo confirma al revisar tu comprobante.";
  }
  $("#carta-enviar-pedido")?.addEventListener("click", async () => {
    const btn = $("#carta-enviar-pedido");
    if (_cartaEnviando) return; // blindaje extra contra doble clic/doble submit, además de disabled
    if (retoGanadorPendiente) { await enviarPagoGanadorReto(); return; }
    const nombre = $("#carta-cliente-nombre")?.value.trim();
    const wa = $("#carta-cliente-wa")?.value.trim();
    const nota = $("#carta-cliente-nota")?.value.trim();
    if (!nombre) { alert("Escribe tu nombre para enviar el pedido"); return; }
    if (!carrito.size) { alert("Agrega al menos un producto"); return; }
    if (mesaSesionId && !mesaAlcance) { alert("Elige si vas a pagar tú o alguien más de la mesa"); return; }
    const sinPagoPropio = mesaSesionId && mesaAlcance === "nadie";
    if (!sinPagoPropio && !metodoPago) { alert("Elige cómo vas a pagar"); return; }
    const entregaAplica = !mesaSesionId && negocio.carta_domicilio_activo;
    if (entregaAplica && !tipoEntrega) { alert("Elige si recoges o pides domicilio"); return; }
    const direccion = $("#carta-cliente-direccion")?.value.trim();
    if (tipoEntrega === "domicilio" && !direccion) { alert("Escribe tu dirección de entrega"); return; }
    const { total: totalItems } = totalCarrito();
    if (tipoEntrega === "domicilio" && negocio.carta_domicilio_minimo && totalItems < Number(negocio.carta_domicilio_minimo)) {
      alert(`El pedido mínimo para domicilio es ${COP(negocio.carta_domicilio_minimo)}`);
      return;
    }
    const comprobanteFile = $("#carta-comprobante")?.files?.[0];
    if (!sinPagoPropio && metodoPago === "transferencia" && !comprobanteFile) { alert("Sube el comprobante de pago"); return; }
    _cartaEnviando = true;
    btn.disabled = true; btn.textContent = "Enviando…";

    let comprobanteUrl = null;
    if (!sinPagoPropio && metodoPago === "transferencia" && comprobanteFile) {
      try {
        const file = await comprimirImagen(comprobanteFile);
        const ext = file.name.split(".").pop();
        const path = `comprobante-carta-${aliadoId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("contenido").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        comprobanteUrl = supabase.storage.from("contenido").getPublicUrl(path).data.publicUrl;
      } catch {
        _cartaEnviando = false; btn.disabled = false; btn.textContent = "Ya pagué";
        alert("No pudimos subir el comprobante. Intenta de nuevo.");
        return;
      }
    }

    const feeDomicilio = tipoEntrega === "domicilio" ? Number(negocio.carta_domicilio_valor) || 0 : 0;
    const payload = {
      negocio_id: aliadoId,
      cliente_nombre: nombre,
      cliente_whatsapp: wa || null,
      nota: nota || null,
      items: [...carrito.values()].map(it => ({
        producto_id: it.producto_id, nombre: it.nombre, precio: it.precio, cantidad: it.cantidad,
        ...(it.modificadores?.length ? { modificadores: it.modificadores } : {}),
      })),
      monto_total: totalItems + feeDomicilio,
      estado: "pendiente",
      metodo_pago: sinPagoPropio ? null : metodoPago,
      comprobante_url: comprobanteUrl,
      ...(mesaSesionId ? { mesa_id: mesaId, mesa_sesion_id: mesaSesionId, mesa_nombre: mesaNombre, cubre_mesa_completa: mesaAlcance === "mesa" } : {}),
      ...(entregaAplica ? { tipo_entrega: tipoEntrega, domicilio_direccion: tipoEntrega === "domicilio" ? direccion : null, domicilio_valor: feeDomicilio || null } : {}),
    };
    const { error } = await supabase.from("negocio_carta_pedidos").insert(payload);
    btn.disabled = false; btn.textContent = sinPagoPropio ? "Enviar pedido" : "Ya pagué";
    _cartaEnviando = false;
    if (error) { alert("No pudimos enviar tu pedido. Intenta de nuevo."); return; }
    carrito.clear();
    items.forEach(p => renderQty(p.id));
    renderBarra();
    $("#carta-sheet-form").hidden = true;
    $("#carta-sheet-exito").hidden = false;
    const tituloExito = $("#carta-sheet-exito h3");
    const textoExito = $("#carta-sheet-exito p");
    if (mesaSesionId) {
      if (tituloExito) tituloExito.textContent = "¡Pedido enviado!";
      if (textoExito) textoExito.textContent = mesaAlcance === "mesa"
        ? `Pagaste por ${mesaNombre || "toda la mesa"} -- el negocio lo confirma al revisar tu comprobante.`
        : mesaAlcance === "nadie"
        ? `Se sumó a ${mesaNombre || "tu mesa"} sin que pagaras ahora. El negocio ya lo está preparando.`
        : `Se sumó a ${mesaNombre || "tu mesa"}. El negocio ya lo está preparando.`;
    } else {
      if (tituloExito) tituloExito.textContent = "¡Pedido enviado!";
      if (textoExito) textoExito.textContent = "El negocio lo confirmará pronto. Gracias por tu compra.";
    }

    // Tarjeta de sellos del negocio (si la activó) -- se deriva de contar
    // pedidos reales con ese mismo WhatsApp (nunca un contador que se
    // pudiera inflar a mano), vía una función segura en la base de datos
    // que además reinicia el ciclo sola en cuanto se completa. Si alguien
    // más va a pagar por esta persona (sinPagoPropio), no se le suma sello
    // -- es una recompensa para quien paga, no para cualquiera que escanee.
    const resultadoEl = $("#carta-sellos-resultado");
    if (wa && negocio.carta_sellos_activo && resultadoEl && !sinPagoPropio) {
      try {
        const { data: estado } = await supabase.rpc("sellos_carta_estado", { p_negocio_id: aliadoId, p_whatsapp: wa });
        if (estado?.activo) {
          resultadoEl.hidden = false;
          resultadoEl.textContent = estado.completado
            ? `🎉 ¡Completaste tu tarjeta de sellos! Premio: ${estado.premio_desc || (estado.premio_tipo === "gratis" ? "Gratis" : "Descuento")}. Muéstrale esto al negocio.`
            : `🎟️ Llevas ${estado.sellos} de ${estado.meta} sellos en este negocio.`;
        }
      } catch {} // si falla, no pasa nada -- el pedido ya quedó guardado igual
    }
  });
}

iniciar();
