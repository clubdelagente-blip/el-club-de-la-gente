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
function feedSlideHtml(p, tieneGrupos) {
  const agotado = estaAgotado(p);
  const categoria = (p.categoria || "").trim() || "Otros";
  const img = p.imagen_url
    ? `<img class="carta-card__img" src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy">`
    : `<div class="carta-card__ph"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg></div>`;
  const accion = agotado
    ? `<span class="carta-card__agotado">Agotado</span>`
    : tieneGrupos
    ? `<button type="button" class="carta-card__personalizar" data-personalizar="${p.id}">Elegir</button>`
    : `<div class="carta-qty" data-qty-wrap="${p.id}">
          <button type="button" class="carta-qty__menos" data-qty-menos="${p.id}" aria-label="Quitar uno">−</button>
          <span class="carta-qty__n" data-qty-n="${p.id}">0</span>
          <button type="button" data-qty-mas="${p.id}" aria-label="Agregar"><span class="mas-texto">Añadir</span><span class="mas-icono">+</span></button>
        </div>`;
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
        <span class="n">Comentar</span>
      </button>
      <button type="button" class="carta-rail-btn" data-compartir="${p.id}" aria-label="Compartir">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        <span class="n">Compartir</span>
      </button>
    </div>
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
    // Se muestran las cápsulas de categoría siempre que el negocio de
    // verdad las use -- solo se esconden cuando NADIE puso categoría en
    // ningún producto (ahí "Otros" sería el único grupo).
    const mostrarPills = !(grupos.length === 1 && grupos[0][0] === "Otros");
    // Un producto, una pantalla -- el feed es una lista PLANA (sin
    // encabezados de categoría visibles, no caben en una pantalla completa
    // a la vez), en el mismo orden que ya respeta la categorización del
    // negocio; las cápsulas de arriba filtran mostrando/ocultando slides.
    grid.innerHTML = grupos.map(([, prods]) => prods.map(p => feedSlideHtml(p, gruposPorProducto.has(p.id))).join("")).join("");

    // Cápsulas de categoría arriba, para filtrar de una sola vez en vez de
    // tener que ir deslizando producto por producto -- solo tiene sentido
    // mostrarlas si de verdad hay más de una categoría.
    const pillsEl = $("#carta-cat-pills");
    if (pillsEl) {
      if (mostrarPills && grupos.length > 1) {
        pillsEl.innerHTML = [`<button type="button" class="carta-cat-pill is-on" data-filtro-cat="todos">Todos</button>`]
          .concat(grupos.map(([cat]) => {
            const color = colorDeCategoria(cat);
            return `<button type="button" class="carta-cat-pill${color ? " con-color" : ""}" data-filtro-cat="${esc(cat)}"${color ? ` style="--cat-color:${esc(color)}"` : ""}>${esc(cat)}</button>`;
          }))
          .join("");
        pillsEl.querySelectorAll("[data-filtro-cat]").forEach(btn => btn.addEventListener("click", () => {
          const filtro = btn.dataset.filtroCat;
          pillsEl.querySelectorAll("[data-filtro-cat]").forEach(b => b.classList.toggle("is-on", b === btn));
          grid.querySelectorAll(".carta-slide").forEach(s => {
            s.style.display = (filtro === "todos" || s.dataset.categoria === filtro) ? "" : "none";
          });
          grid.scrollTo({ top: 0 });
        }));
      } else {
        pillsEl.innerHTML = "";
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
    const nombreInput = $("#carta-comentario-nombre"); if (nombreInput) nombreInput.value = "";
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
    const nombre = $("#carta-comentario-nombre")?.value.trim();
    const texto = $("#carta-comentario-texto")?.value.trim();
    if (!nombre || !texto) { alert("Escribe tu nombre y tu comentario"); return; }
    if (!comentarioProductoActual) return;
    btn.disabled = true;
    const { error } = await supabase.rpc("enviar_comentario_producto", {
      p_producto_id: comentarioProductoActual.id, p_negocio_id: aliadoId, p_nombre: nombre, p_texto: texto,
    });
    btn.disabled = false;
    if (error) { alert("No pudimos enviar tu comentario. Intenta de nuevo."); return; }
    const textoInput = $("#carta-comentario-texto"); if (textoInput) textoInput.value = "";
    const aviso = $("#carta-comentario-aviso"); if (aviso) aviso.classList.add("mostrar");
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
    const enviarBtn = $("#carta-enviar-pedido");
    if (enviarBtn) enviarBtn.textContent = mesaAlcance === "nadie" ? "Enviar pedido" : "Ya pagué";
    // Los sellos son una recompensa por pagar -- si alguien más va a pagar
    // por esta persona, no tiene sentido ofrecerle sellos a ella acá.
    const hintEl = $("#carta-sellos-hint");
    if (hintEl && negocio.carta_sellos_activo) hintEl.hidden = mesaAlcance === "nadie";
    actualizarTotalMesa();
  }));

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
  const abrirResumen = () => {
    const { total } = totalCarrito();
    const itemsHtml = [...carrito.values()].map(it => `
      <div class="carta-sheet__item"><span>${it.cantidad}× ${esc(it.nombre)}${it.modText ? `<br><small style="color:var(--tinta-45);font-weight:400">${esc(it.modText)}</small>` : ""}</span><span>${COP(it.precio * it.cantidad)}</span></div>`).join("");
    const cont = $("#carta-sheet-items"); if (cont) cont.innerHTML = itemsHtml;
    const totSpan = $("#carta-sheet-total"); if (totSpan) totSpan.textContent = COP(total);
    sincronizarMontoPago();
    // Reinicia la elección de método de pago (y de alcance, si hay mesa) en
    // cada pedido nuevo -- no debe quedar pegada la del pedido anterior.
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
  $("#carta-enviar-pedido")?.addEventListener("click", async () => {
    const btn = $("#carta-enviar-pedido");
    if (_cartaEnviando) return; // blindaje extra contra doble clic/doble submit, además de disabled
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
