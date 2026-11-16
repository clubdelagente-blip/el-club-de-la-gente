/* ============================================================
   EL CLUB DE LA GENTE — Carta digital por QR (pública, sin login)
   El cliente escanea el QR de un negocio, escoge productos de su carta y
   manda el pedido -- llega "pendiente" al dashboard de Mi Contabilidad del
   negocio, que lo marca pagado cuando cobra en persona. Sin cuenta, sin
   comprobante: es independiente de Mi Tienda (esa es solo para miembros del
   Club, con comprobante y verificación IA).
   ============================================================ */
import { supabase } from './supabase.js';
import { comprimirImagen } from './imagen.js';

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
}

function sumarProducto(p, delta) {
  const actual = carrito.get(p.id)?.cantidad || 0;
  const nueva = Math.max(0, actual + delta);
  if (nueva === 0) carrito.delete(p.id);
  else carrito.set(p.id, { producto_id: p.id, nombre: p.nombre, precio: p.precio, cantidad: nueva });
  renderQty(p.id);
  renderBarra();
}

// Si el producto tiene grupos de toppings/modificadores configurados (ej.
// "Salsas"), no se puede sumar directo con un +/- en la tarjeta -- primero
// hay que elegir, así que la tarjeta muestra un botón "Elegir" que abre el
// modal de personalización en vez del stepper de siempre.
function cardHtml(p, tieneGrupos) {
  const img = p.imagen_url
    ? `<img class="carta-card__img" src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy" data-ver-foto="${p.id}">`
    : `<div class="carta-card__ph"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg></div>`;
  const accion = tieneGrupos
    ? `<button type="button" class="carta-card__personalizar" data-personalizar="${p.id}">Elegir</button>`
    : `<div class="carta-qty" data-qty-wrap="${p.id}">
          <button type="button" class="carta-qty__menos" data-qty-menos="${p.id}" aria-label="Quitar uno">−</button>
          <span class="carta-qty__n" data-qty-n="${p.id}">0</span>
          <button type="button" data-qty-mas="${p.id}" aria-label="Agregar uno">+</button>
        </div>`;
  return `
  <div class="carta-card" data-carta-card="${p.id}">
    ${img}
    <div class="carta-card__body">
      <div class="carta-card__nombre">${esc(p.nombre)}</div>
      ${p.descripcion ? `<div class="carta-card__desc">${esc(p.descripcion)}</div>` : ""}
      <div class="carta-card__fila">
        <span class="carta-card__precio">${COP(p.precio)}</span>
        ${accion}
      </div>
    </div>
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
    const indice = (cat) => { const i = ordenConfig.indexOf(cat); return i === -1 ? 999 : i; };
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
    const subEl = document.querySelector(".carta-top__sub");
    if (subEl) subEl.textContent = `Pedido para ${mesaNombre}`;
  }

  if (nombreEl) nombreEl.textContent = negocio.nombre;
  document.title = `Carta de ${negocio.nombre} — El Club de la Gente`;
  if (logoEl && negocio.imagen_url) logoEl.innerHTML = `<img src="${esc(negocio.imagen_url)}" alt="">`;
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

  if (grid) {
    const grupos = agruparPorCategoria(items, negocio.carta_categorias_orden);
    // Se muestra el título de cada categoría (Malteadas, Wafles, Obleas...)
    // siempre que el negocio de verdad las use -- solo se esconde cuando
    // NADIE puso categoría en ningún producto (ahí "Otros" sería el único
    // grupo y se vería raro como si fuera el nombre real de una sección).
    const mostrarTitulos = !(grupos.length === 1 && grupos[0][0] === "Otros");
    grid.innerHTML = grupos.map(([cat, prods]) => `
      <div class="carta-grupo" data-categoria="${esc(cat)}">
        ${mostrarTitulos ? `<h2 class="carta-grupo__titulo">${esc(cat)}</h2>` : ""}
        <div class="carta-grid">${prods.map(p => cardHtml(p, gruposPorProducto.has(p.id))).join("")}</div>
      </div>`).join("");

    // Cápsulas de categoría arriba, para filtrar de una sola vez en vez de
    // tener que ir bajando a pulso -- solo tiene sentido mostrarlas si de
    // verdad hay más de una categoría.
    const pillsEl = $("#carta-cat-pills");
    if (pillsEl) {
      if (mostrarTitulos && grupos.length > 1) {
        pillsEl.innerHTML = [`<button type="button" class="carta-cat-pill is-on" data-filtro-cat="todos">Todos</button>`]
          .concat(grupos.map(([cat]) => `<button type="button" class="carta-cat-pill" data-filtro-cat="${esc(cat)}">${esc(cat)}</button>`))
          .join("");
        pillsEl.querySelectorAll("[data-filtro-cat]").forEach(btn => btn.addEventListener("click", () => {
          const filtro = btn.dataset.filtroCat;
          pillsEl.querySelectorAll("[data-filtro-cat]").forEach(b => b.classList.toggle("is-on", b === btn));
          grid.querySelectorAll(".carta-grupo").forEach(g => {
            g.style.display = (filtro === "todos" || g.dataset.categoria === filtro) ? "" : "none";
          });
        }));
      } else {
        pillsEl.innerHTML = "";
      }
    }
    items.forEach(p => {
      const grupos = gruposPorProducto.get(p.id);
      if (grupos && grupos.length) {
        grid.querySelector(`[data-personalizar="${p.id}"]`)?.addEventListener("click", () => abrirModalProducto(p, grupos));
      } else {
        grid.querySelector(`[data-qty-mas="${p.id}"]`)?.addEventListener("click", () => sumarProducto(p, 1));
        grid.querySelector(`[data-qty-menos="${p.id}"]`)?.addEventListener("click", () => sumarProducto(p, -1));
      }
      grid.querySelector(`[data-ver-foto="${p.id}"]`)?.addEventListener("click", () => abrirFotoGrande(p.imagen_url));
    });
  }

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
  let modProductoActual = null;
  let modGruposActual = [];
  let modSeleccion = new Map(); // grupo_id -> Set(opcion_id)
  let modQty = 1;

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
    modGruposEl.innerHTML = modGruposActual.map(g => `
      <div class="carta-mod-grupo">
        <div class="carta-mod-grupo__head">
          <span class="carta-mod-grupo__titulo">${esc(g.nombre)}</span>
          <span class="carta-mod-grupo__tag">${g.tipo === "unica" ? "1 de 1 · obligatorio" : "Opcional"}</span>
        </div>
        ${g.opciones.map(o => `
          <div class="carta-mod-opcion ${g.tipo === "unica" ? "es-radio" : "es-check"}" data-mod-opcion="${o.id}" data-mod-grupo="${g.id}">
            ${o.imagen_url ? `<img class="carta-mod-opcion__foto" src="${esc(o.imagen_url)}" alt="">` : ""}
            <span class="carta-mod-opcion__marca">✓</span>
            <span class="carta-mod-opcion__nombre">${esc(o.nombre)}</span>
            ${Number(o.precio_adicional) > 0 ? `<span class="carta-mod-opcion__precio">+${COP(o.precio_adicional)}</span>` : ""}
          </div>`).join("")}
      </div>`).join("");
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
    }));
  }
  function abrirModalProducto(p, grupos) {
    if (!modOverlay) return;
    modProductoActual = p;
    modGruposActual = grupos;
    modSeleccion = new Map();
    modQty = 1;
    if (modNombreEl) modNombreEl.textContent = p.nombre;
    if (modDescEl) { modDescEl.textContent = p.descripcion || ""; modDescEl.hidden = !p.descripcion; }
    renderModGrupos();
    pintarModal();
    modOverlay.hidden = false;
  }
  function cerrarModalProducto() { if (modOverlay) modOverlay.hidden = true; }
  $("#carta-mod-cerrar")?.addEventListener("click", cerrarModalProducto);
  modOverlay?.addEventListener("click", (e) => { if (e.target === modOverlay) cerrarModalProducto(); });
  $("#carta-mod-qty-mas")?.addEventListener("click", () => { modQty++; pintarModal(); });
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
  let metodoPago = null;
  $$(".carta-metodo-btn[data-metodo]").forEach(b => b.addEventListener("click", () => {
    metodoPago = b.dataset.metodo;
    $$(".carta-metodo-btn[data-metodo]").forEach(x => x.classList.toggle("is-on", x === b));
    const efEl = $("#carta-pago-efectivo"); if (efEl) efEl.hidden = metodoPago !== "efectivo";
    const trEl = $("#carta-pago-transferencia"); if (trEl) trEl.hidden = metodoPago !== "transferencia";
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

  // ---------- Mesa compartida: elegir si se paga solo lo propio o el total
  // de la mesa (lo propio + lo que los demás ya pidieron y no han pagado).
  // En ambos casos se paga de verdad con la misma pasarela de arriba -- la
  // única diferencia es el monto que se muestra y que se le avisa al negocio
  // con "cubre_mesa_completa" para que sepa si debe usar "Marcar pagado" (un
  // pedido) o "Cobrar mesa completa" (toda la mesa) al revisar el comprobante. ----------
  let mesaAlcance = null;
  async function actualizarTotalMesa() {
    const { total: totalMio } = totalCarrito();
    const totSpan = $("#carta-sheet-total");
    const notaEl = $("#carta-mesa-alcance-total");
    if (mesaAlcance !== "mesa") {
      if (totSpan) totSpan.textContent = COP(totalMio);
      if (notaEl) notaEl.textContent = "";
      return;
    }
    let totalMesa = totalMio;
    try {
      const { data: pendientes } = await supabase.from("negocio_carta_pedidos").select("monto_total").eq("mesa_sesion_id", mesaSesionId).eq("pagado", false);
      totalMesa += (pendientes || []).reduce((s, p) => s + Number(p.monto_total || 0), 0);
    } catch {}
    if (totSpan) totSpan.textContent = COP(totalMesa);
    if (notaEl) notaEl.textContent = `Pagas el total de la mesa: ${COP(totalMesa)} (lo tuyo + lo que ya pidieron y no han pagado).`;
  }
  $$("#carta-campo-mesa-alcance [data-alcance]").forEach(b => b.addEventListener("click", () => {
    mesaAlcance = b.dataset.alcance;
    $$("#carta-campo-mesa-alcance [data-alcance]").forEach(x => x.classList.toggle("is-on", x === b));
    actualizarTotalMesa();
  }));

  // ---------- Resumen / checkout ----------
  const overlay = $("#carta-overlay");
  const abrirResumen = () => {
    const { total } = totalCarrito();
    const itemsHtml = [...carrito.values()].map(it => `
      <div class="carta-sheet__item"><span>${it.cantidad}× ${esc(it.nombre)}${it.modText ? `<br><small style="color:var(--tinta-45);font-weight:400">${esc(it.modText)}</small>` : ""}</span><span>${COP(it.precio * it.cantidad)}</span></div>`).join("");
    const cont = $("#carta-sheet-items"); if (cont) cont.innerHTML = itemsHtml;
    const totSpan = $("#carta-sheet-total"); if (totSpan) totSpan.textContent = COP(total);
    // Reinicia la elección de método de pago (y de alcance, si hay mesa) en
    // cada pedido nuevo -- no debe quedar pegada la del pedido anterior.
    metodoPago = null;
    mesaAlcance = null;
    $$(".carta-metodo-btn[data-metodo]").forEach(x => x.classList.remove("is-on"));
    $$("#carta-campo-mesa-alcance [data-alcance]").forEach(x => x.classList.remove("is-on"));
    const notaAlcance = $("#carta-mesa-alcance-total"); if (notaAlcance) notaAlcance.textContent = "";
    const efEl = $("#carta-pago-efectivo"); if (efEl) efEl.hidden = true;
    const trEl = $("#carta-pago-transferencia"); if (trEl) trEl.hidden = true;
    const compInput = $("#carta-comprobante"); if (compInput) compInput.value = "";
    const campoAlcance = $("#carta-campo-mesa-alcance"); if (campoAlcance) campoAlcance.hidden = !mesaSesionId;
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
    if (mesaSesionId && !mesaAlcance) { alert("Elige si pagas solo lo tuyo o toda la mesa"); return; }
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

    const { total } = totalCarrito();
    const payload = {
      negocio_id: aliadoId,
      cliente_nombre: nombre,
      cliente_whatsapp: wa || null,
      nota: nota || null,
      items: [...carrito.values()].map(it => ({
        producto_id: it.producto_id, nombre: it.nombre, precio: it.precio, cantidad: it.cantidad,
        ...(it.modificadores?.length ? { modificadores: it.modificadores } : {}),
      })),
      monto_total: total,
      estado: "pendiente",
      metodo_pago: metodoPago,
      comprobante_url: comprobanteUrl,
      ...(mesaSesionId ? { mesa_id: mesaId, mesa_sesion_id: mesaSesionId, mesa_nombre: mesaNombre, cubre_mesa_completa: mesaAlcance === "mesa" } : {}),
    };
    const { error } = await supabase.from("negocio_carta_pedidos").insert(payload);
    btn.disabled = false; btn.textContent = "Ya pagué";
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
        : `Se sumó a ${mesaNombre || "tu mesa"}. El negocio ya lo está preparando.`;
    } else {
      if (tituloExito) tituloExito.textContent = "¡Pedido enviado!";
      if (textoExito) textoExito.textContent = "El negocio lo confirmará pronto. Gracias por tu compra.";
    }

    // Tarjeta de sellos del negocio (si la activó) -- se deriva de contar
    // pedidos reales con ese mismo WhatsApp (nunca un contador que se
    // pudiera inflar a mano), vía una función segura en la base de datos
    // que además reinicia el ciclo sola en cuanto se completa.
    const resultadoEl = $("#carta-sellos-resultado");
    if (wa && negocio.carta_sellos_activo && resultadoEl) {
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
