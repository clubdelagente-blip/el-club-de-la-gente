/* ============================================================
   EL CLUB DE LA GENTE — Módulo 5
   Directorio real (Supabase) · buscador · filtros por plan · calculadora
   ============================================================ */
import { supabase } from './supabase.js';

/* ---------- HELPERS ---------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const ic = (n) => `<i data-lucide="${n}"></i>`;
const ICON_WA = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.868-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 2C6.486 2 2 6.486 2 12.004c0 2.123.666 4.09 1.804 5.714L2.5 22l4.418-1.265A9.955 9.955 0 0 0 12.004 22C17.522 22 22 17.514 22 12.004 22 6.486 17.522 2 12.004 2zm0 18.18a8.14 8.14 0 0 1-4.15-1.136l-.298-.177-3.11.89.903-3.03-.194-.31a8.15 8.15 0 0 1-1.25-4.413c0-4.5 3.66-8.157 8.1-8.157 4.44 0 8.09 3.656 8.09 8.157 0 4.5-3.65 8.176-8.09 8.176z"/></svg>`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = new Intl.NumberFormat("es-CO");
const fmtCOP = (n) => "$" + nf.format(Math.max(0, Math.round(n || 0)));
function norm(s) {
  return (s || "").toLowerCase()
    .replace(/[áàäâã]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i")
    .replace(/[óòöôõ]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n");
}
// overflow:hidden en el body NO basta en iOS Safari para bloquear el scroll
// de fondo detrás de un modal/sheet -- el truco que sí funciona ahí es
// "congelar" el body con position:fixed, guardando y restaurando el scroll.
function bloquearScroll() {
  if (document.body.dataset.scrollY !== undefined) return; // ya estaba bloqueado
  const y = window.scrollY || window.pageYOffset || 0;
  document.body.dataset.scrollY = y;
  document.body.style.position = "fixed";
  document.body.style.top = `-${y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}
function desbloquearScroll() {
  if (document.body.dataset.scrollY === undefined) return; // no había bloqueo activo
  const y = parseInt(document.body.dataset.scrollY, 10);
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  delete document.body.dataset.scrollY;
  window.scrollTo(0, y);
}

/* Ícono por palabra clave de categoría (aproximado, no requiere que el admin lo elija) */
const ICONOS_CAT = [
  [/odont/i, "smile"], [/veterinar/i, "paw-print"], [/turis/i, "mountain-snow"],
  [/mascota/i, "paw-print"], [/canasta|fruver|mercado|supermercado/i, "shopping-basket"],
  [/ropa|moda|accesorio/i, "shirt"], [/helad/i, "ice-cream"], [/comida|restaurante|cafeter/i, "sandwich"],
  [/barber/i, "scissors"], [/bienestar|salud|spa/i, "heart-pulse"], [/belleza|estetic/i, "sparkles"],
  [/educaci|tutor/i, "graduation-cap"], [/deporte|gym/i, "dumbbell"], [/tecnolog/i, "laptop"],
  [/regalo/i, "gift"],
];
function iconoCategoria(categoria) {
  const c = categoria || "";
  for (const [rx, icon] of ICONOS_CAT) if (rx.test(c)) return icon;
  return "store";
}

/* Color por categoría -- le da variedad y energía visual al directorio sin
   que el admin tenga que elegir nada (se deriva del mismo texto de siempre). */
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
function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function ccVars(categoria) {
  const cc = colorCategoria(categoria);
  return `--cc:${cc};--cc-soft:${hexToRgba(cc, .14)};--cc-glow:${hexToRgba(cc, .45)}`;
}

/* ---------- CONTEXTO DEL VISITANTE ---------- */
const _p = new URLSearchParams(location.search);
const MIEMBRO_ID  = _p.get("miembro");
const MIEMBRO_WA  = _p.get("wa") || "";
const MIEMBRO_USOS = parseInt(_p.get("usos") || "0", 10);
const PLAN_URL = _p.get("plan"); // viene de Verificar.html cuando un aliado escanea a un miembro

const LIMITE_DESCUENTOS = { gratis: 0, basica: 2, premium: Infinity, vitalicia: Infinity };
let PLAN_ACTUAL = "gratis";
let LIMITE_ALCANZADO = false;
let SIN_ACCESO_ALIADOS = false; // Gratis: 0 descuentos de aliado, mensaje distinto a "llegaste al límite"

// Quién tiene el navegador abierto ahora mismo (si hay sesión). Se usa para
// distinguir "el aliado escaneó el QR de este miembro" (nadie con sesión, o
// alguien más) de "el propio miembro abrió su link" (sesión = MIEMBRO_ID) --
// la calculadora de aplicar promoción solo es para el primer caso.
let VIEWER_USER_ID = null;

/* Resuelve el plan real del visitante:
   1) ?plan= en la URL (un aliado viendo lo que le corresponde a un miembro escaneado)
   2) sesión activa de Supabase (un miembro navegando desde su propio dashboard)
   3) sin sesión ni parámetro: visitante anónimo → solo ve el nivel Gratis */
// "planes_visibles" en Admin solo ofrece Gratis/Básica/Premium (no hay
// casilla de Vitalicia) -- así que ningún aliado podría marcarse visible
// para ese plan y a un miembro vitalicio nunca le aparecería nada. Vitalicia
// es el plan más alto que existe, así que hereda automáticamente todo lo que
// ve Premium, sin que el admin tenga que reconfigurar cada aliado.
function aliadoVisibleParaPlan(planesVisibles, plan) {
  const lista = planesVisibles && planesVisibles.length ? planesVisibles : ["basica", "premium"];
  if (plan === "vitalicia") return lista.includes("vitalicia") || lista.includes("premium");
  return lista.includes(plan);
}

async function resolverPlanVisitante() {
  const { data: { session } } = await supabase.auth.getSession();
  VIEWER_USER_ID = session?.user?.id || null;
  if (PLAN_URL) return PLAN_URL;
  if (session?.user?.id) {
    const { data } = await supabase.from("perfiles").select("plan").eq("id", session.user.id).maybeSingle();
    if (data?.plan && data.plan !== "sin_plan") return data.plan;
  }
  return "gratis";
}

async function registrarDescuento({ aliado_id, aliado_nombre, categoria, descuento_pct, compra, ahorro }) {
  if (!MIEMBRO_ID) return { ok: false, error: null };
  const { error } = await supabase.from("descuentos").insert({
    miembro_id: MIEMBRO_ID, aliado_id, aliado_nombre, categoria,
    descuento_pct, compra: compra || null, ahorro: ahorro || 0,
  });
  if (error) console.error("registrarDescuento:", error);
  return { ok: !error, error };
}

/* ---------- ESTADO ---------- */
let ALIADOS = [];
let GRUPOS = ["Todos"];
let filtroActivo = "Todos";
let query = "";

/* ---------- CARGA DE ALIADOS (filtrados por plan) ---------- */
async function cargarAliados() {
  // Nota: "codigo_aliado" NUNCA se pide acá a propósito — se valida server-side (RPC verificar_codigo_aliado)
  const { data } = await supabase.from("aliados")
    .select("id, nombre, categoria, descuento, descripcion, whatsapp, direccion, maps_url, ofrece_domicilio, ofrece_agenda, imagen_url, fotos_carrusel, destacado, planes_visibles")
    .eq("activo", true).order("nombre");
  const todos = data || [];
  // Gratis ve el directorio completo como vitrina (marcado "bloqueado" el
  // que no le corresponde) para incentivar a subir de plan, en vez de
  // simplemente no mostrarle nada -- el resto de planes sigue viendo solo
  // lo que ya le corresponde, como siempre.
  ALIADOS = PLAN_ACTUAL === "gratis"
    ? todos.map(a => ({ ...a, _bloqueado: !aliadoVisibleParaPlan(a.planes_visibles, "gratis") }))
    : todos.filter(a => aliadoVisibleParaPlan(a.planes_visibles, PLAN_ACTUAL));

  const cats = new Set();
  ALIADOS.forEach(a => (a.categoria || "").split(",").map(s => s.trim()).filter(Boolean).forEach(c => cats.add(c)));
  GRUPOS = ["Todos", ...[...cats].sort()];
}

/* ---------- RENDER FILTROS ---------- */
function renderFiltros() {
  $("#dir-filtros").innerHTML = GRUPOS.map(g =>
    `<button class="dir-chip${g === filtroActivo ? " is-on" : ""}" data-grupo="${g}" style="${g === "Todos" ? "" : ccVars(g)}">${g === "Todos" ? "" : `<span class="dir-chip__dot"></span>`}${g}</button>`
  ).join("");
}

/* ---------- RENDER GRID ---------- */
function aliadosFiltrados() {
  const q = norm(query.trim());
  return ALIADOS.filter(a => {
    const cats = (a.categoria || "").split(",").map(s => s.trim());
    const okGrupo = filtroActivo === "Todos" || cats.includes(filtroActivo);
    const okQ = !q || norm(a.nombre).includes(q) || norm(a.categoria).includes(q);
    return okGrupo && okQ;
  });
}
function renderGrid() {
  const list = aliadosFiltrados();
  const cont = $("#dir-grid");
  $("#dir-count").innerHTML = `<b>${list.length}</b> ${list.length === 1 ? "aliado" : "aliados"}${filtroActivo !== "Todos" ? " · " + filtroActivo : ""}`;

  if (!list.length) {
    cont.innerHTML = `<div class="dir-empty">${ic("search-x")}<h3>Sin resultados</h3><p>No encontramos aliados para tu búsqueda. Prueba con otra categoría.</p></div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  cont.innerHTML = list.map((a, i) => `
    <article class="dir-card${a._bloqueado ? " dir-card--bloqueada" : ""}" data-aliado="${a.id}" tabindex="0" style="${ccVars(a.categoria)};animation-delay:${Math.min(i * 45, 400)}ms">
      ${a._bloqueado ? `<div class="dir-card__lock">${ic("lock")}<span>Mejora tu plan</span></div>` : ""}
      <div class="dir-card__logo">
        ${a.imagen_url
          ? `<img src="${a.imagen_url}" alt="">`
          : `<span class="dir-card__logo-ic">${ic(iconoCategoria(a.categoria))}</span>`}
      </div>
      <div class="dir-card__nombre">${a.nombre}</div>
      <div class="dir-card__cat">${a.categoria || "Aliado del Club"}</div>
      <div class="dir-card__badge">${ic("flame")}<span>${a.descuento || "Beneficio especial"}</span></div>
    </article>`).join("");
  if (window.lucide) lucide.createIcons();
}

/* ============================================================
   SHEET (detalle del aliado + sus promociones reales)
   ============================================================ */
const overlay = $("#sheet-overlay");
const sheet = $("#sheet");
const sheetInner = $("#sheet-inner");
let aliadoActual = null;
let carruselInterval = null;

function wireCarrusel() {
  if (carruselInterval) { clearInterval(carruselInterval); carruselInterval = null; }
  const cont = sheetInner.querySelector(".aliado-carrusel");
  if (!cont) return;
  const imgs = cont.querySelectorAll("img");
  if (imgs.length < 2) return;
  const dots = [...sheetInner.querySelectorAll(".aliado-carrusel-dot")];
  let idx = 0;
  const irA = (i) => {
    idx = i;
    cont.scrollTo({ left: cont.clientWidth * idx, behavior: "smooth" });
    dots.forEach((d, di) => d.classList.toggle("is-on", di === idx));
  };
  carruselInterval = setInterval(() => irA((idx + 1) % imgs.length), 2000);
  // Si el miembro desliza con el dedo, se respeta su control y se detiene el auto-avance
  cont.addEventListener("touchstart", () => {
    if (carruselInterval) { clearInterval(carruselInterval); carruselInterval = null; }
  }, { passive: true, once: true });
  dots.forEach((dot) => dot.addEventListener("click", () => {
    if (carruselInterval) { clearInterval(carruselInterval); carruselInterval = null; }
    irA(+dot.dataset.dot);
  }));
}

async function openSheet(aliadoId) {
  const a = ALIADOS.find(x => x.id === aliadoId);
  if (!a) return;
  if (a._bloqueado) { abrirModalMejorarPlan(a); return; }
  aliadoActual = a;
  sheetInner.innerHTML = `<p style="text-align:center;padding:60px 0"><span class="brand-loader"><img src="icon-club.png" alt=""></span></p>`;
  overlay.classList.add("is-open");
  sheet.classList.add("is-open");
  bloquearScroll();
  $("#sheet-scroll").scrollTop = 0;
  if (window.lucide) lucide.createIcons();

  const { data } = await supabase.from("promociones").select("*").eq("aliado_id", a.id).eq("activa", true).order("created_at", { ascending: false });
  a.promociones = data || [];
  sheetInner.innerHTML = sheetAliado(a);
  if (window.lucide) lucide.createIcons();
  wireCalc(a);
  wireCarrusel();
}
function closeSheet() {
  overlay.classList.remove("is-open");
  sheet.classList.remove("is-open");
  desbloquearScroll();
  if (carruselInterval) { clearInterval(carruselInterval); carruselInterval = null; }
}

/* ---------- Mejorar plan (vitrina para Gratis) ---------- */
let _planesCache = null;
async function abrirModalMejorarPlan(aliado) {
  const ov = document.createElement("div");
  ov.className = "mp-ov";
  ov.style.cssText = "position:fixed;inset:0;z-index:300;background:rgba(2,27,26,.6);display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto";
  ov.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:28px 24px;max-width:480px;width:100%;position:relative;margin:auto">
      <button type="button" id="mp-close" style="position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;border:none;background:#f1f1ee;display:flex;align-items:center;justify-content:center;cursor:pointer">${ic("x")}</button>
      <div style="text-align:center;margin-bottom:20px">
        <span style="display:inline-flex;width:40px;height:40px;border-radius:50%;background:#fef3c7;color:#b45309;align-items:center;justify-content:center;margin-bottom:12px">${ic("lock")}</span>
        <h2 style="font-family:'Fraunces',serif;font-size:22px;font-weight:700;margin-bottom:6px">Desbloquea ${esc(aliado.nombre)}</h2>
        <p style="font-size:13.5px;color:#666;line-height:1.5">El plan Gratis no incluye descuentos de aliados. Sube de plan para acceder a este y a todos los demás.</p>
      </div>
      <div id="mp-planes" style="display:flex;flex-direction:column;gap:12px">
        <p style="text-align:center;padding:20px 0;color:#999;font-size:13px">Cargando planes…</p>
      </div>
    </div>`;
  document.body.appendChild(ov);
  bloquearScroll();
  if (window.lucide) lucide.createIcons();
  const cerrar = () => { ov.remove(); desbloquearScroll(); };
  ov.querySelector("#mp-close").addEventListener("click", cerrar);
  ov.addEventListener("click", (e) => { if (e.target === ov) cerrar(); });

  if (!_planesCache) {
    const { data } = await supabase.from("planes").select("slug, tag, precio_texto, precio_sufijo, beneficios").in("slug", ["basica", "premium"]).order("orden");
    _planesCache = data || [];
  }
  const cont = ov.querySelector("#mp-planes");
  if (!_planesCache.length) { cont.innerHTML = `<p style="text-align:center;padding:20px 0;color:#999;font-size:13px">No pudimos cargar los planes. Intenta de nuevo en un momento.</p>`; return; }
  cont.innerHTML = _planesCache.map(p => `
    <div style="border:1.5px solid #ebebeb;border-radius:14px;padding:18px">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px">
        <span style="font-weight:700;font-size:15px">${esc(p.tag)}</span>
        <span style="font-weight:700;font-size:17px;color:var(--verde,#095544)">${esc(p.precio_texto)}<small style="font-weight:500;font-size:11px;color:#999"> ${esc(p.precio_sufijo || "")}</small></span>
      </div>
      <ul style="list-style:none;padding:0;margin:0 0 14px;display:flex;flex-direction:column;gap:6px">
        ${(p.beneficios || []).slice(0, 3).map(b => `<li style="font-size:12.5px;color:#555;display:flex;gap:8px"><span style="color:var(--verde,#095544)">•</span>${esc(b)}</li>`).join("")}
      </ul>
      <a class="btn btn--primario" style="width:100%;text-align:center;display:block" href="Planes.html?renovar=${p.slug}">Comprar ${esc(p.tag)}</a>
    </div>`).join("");
  if (window.lucide) lucide.createIcons();
}

/* ---------- Lectura de promociones (tipos heterogéneos) ---------- */
const DIAS_TXT = { lunes: "lun", martes: "mar", miercoles: "mié", jueves: "jue", viernes: "vie", sabado: "sáb", domingo: "dom" };

function pctDerivada(p) {
  if (p.tipo !== "porcentaje" || !p.precio_normal || !p.ahorro_fijo) return null;
  return Math.round((p.ahorro_fijo / p.precio_normal) * 100);
}
function badgePromo(p) {
  const pct = pctDerivada(p);
  if (p.tipo === "porcentaje") return pct != null ? `${pct}%` : "% dcto.";
  if (p.tipo === "2x1") return "2×1";
  if (p.tipo === "monto_fijo") return p.ahorro_fijo ? `-${fmtCOP(p.ahorro_fijo)}` : "Descuento";
  if (p.tipo === "precio_especial") return p.precio_descuento != null ? fmtCOP(p.precio_descuento) : "Precio especial";
  if (p.tipo === "regalo") return "🎁";
  return "Promo";
}
function beneficioTexto(p) {
  if (p.tipo === "porcentaje") { const pct = pctDerivada(p); return pct != null ? `Ahorras ${pct}% (${fmtCOP(p.ahorro_fijo)} sobre ${fmtCOP(p.precio_normal)})` : "Descuento porcentual — consulta el % con el establecimiento."; }
  if (p.tipo === "2x1") return "Paga 1 y recibe 2.";
  if (p.tipo === "monto_fijo") return p.ahorro_fijo ? `Ahorras ${fmtCOP(p.ahorro_fijo)} fijo.` : "Descuento de monto fijo.";
  if (p.tipo === "precio_especial") return (p.precio_normal && p.precio_descuento) ? `Precio especial: ${fmtCOP(p.precio_descuento)} en vez de ${fmtCOP(p.precio_normal)}.` : "Precio especial para miembros.";
  if (p.tipo === "regalo") return "Regalo o beneficio adicional para miembros.";
  return "Beneficio especial para miembros del Club.";
}
function detallePromo(p) {
  const partes = [];
  if (p.dias_aplica && p.dias_aplica.length && p.dias_aplica.length < 7) partes.push(p.dias_aplica.map(d => DIAS_TXT[d] || d).join("/"));
  if (p.hora_inicio && p.hora_fin) partes.push(`${p.hora_inicio.slice(0, 5)}–${p.hora_fin.slice(0, 5)}`);
  if (p.monto_minimo) partes.push(`Compra mínima ${fmtCOP(p.monto_minimo)}`);
  if (p.aplica_a === "producto_especifico" && p.producto_especifico) partes.push(`Solo en ${p.producto_especifico}`);
  return partes.join(" · ");
}

function sheetAliado(a) {
  const promos = a.promociones || [];
  const cc = colorCategoria(a.categoria);
  return `
    <div style="${ccVars(a.categoria)}">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">
      <div style="width:60px;height:60px;border-radius:50%;flex:none;overflow:hidden;display:grid;place-items:center;background:#fff;box-shadow:0 0 0 4px var(--cc-soft)">
        ${a.imagen_url ? `<img src="${a.imagen_url}" alt="" style="width:100%;height:100%;object-fit:cover">` : `<span style="color:${cc}">${ic(iconoCategoria(a.categoria))}</span>`}
      </div>
      <div>
        <div class="sheet__cat" style="color:${cc}">${a.categoria || "Aliado del Club"}</div>
        <h2 class="sheet__nombre" style="margin-top:2px">${a.nombre}</h2>
      </div>
    </div>
    ${(() => {
      const fotos = (Array.isArray(a.fotos_carrusel) && a.fotos_carrusel.length) ? a.fotos_carrusel : (a.imagen_url ? [a.imagen_url] : []);
      if (!fotos.length) return `<div class="foto-ph" style="background:var(--cc-soft);color:${cc}"><span class="foto-ph__ic">${ic(iconoCategoria(a.categoria))}</span><span class="foto-ph__txt">${a.nombre}</span></div>`;
      return `
        <div class="aliado-carrusel-wrap">
          <div class="aliado-carrusel">${fotos.map(url => `<img src="${url}" alt="${a.nombre}">`).join("")}</div>
          ${fotos.length > 1 ? `<div class="aliado-carrusel-dots">${fotos.map((_, i) => `<span class="aliado-carrusel-dot${i === 0 ? " is-on" : ""}" data-dot="${i}" style="--cc:${cc}"></span>`).join("")}</div>` : ""}
        </div>`;
    })()}

    <div class="sheet__sub">Sobre este aliado</div>
    <p class="sheet__desc">${a.descripcion || "Aliado de El Club de la Gente."}</p>

    ${(a.direccion || a.maps_url) ? `
    <div class="sheet__sub">Cómo llegar</div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:var(--cc-soft);border-radius:12px;padding:14px 16px;margin-bottom:4px">
      ${a.direccion ? `<span style="font-size:13.5px;color:var(--tinta);display:flex;align-items:center;gap:7px;font-weight:600">${ic("map-pin")}${a.direccion}</span>` : '<span></span>'}
      ${a.maps_url ? `<a href="${a.maps_url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;padding:8px 14px;background:${cc};color:#fff;border-radius:99px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap">${ic("navigation")}Ver en mapa</a>` : ''}
    </div>` : ''}

    ${(a.whatsapp && (a.ofrece_domicilio || a.ofrece_agenda)) ? `
    <div class="sheet__sub">Contacta al negocio</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${a.ofrece_domicilio ? `<a class="btn btn--primario btn--bloque" target="_blank" href="https://wa.me/57${String(a.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent('Hola, soy miembro de El Club de la Gente y quiero hacer un pedido en ' + (a.nombre || ''))}">${ICON_WA}Pedir a domicilio</a>` : ''}
      ${a.ofrece_agenda ? `<a class="btn btn--primario btn--bloque" target="_blank" href="https://wa.me/57${String(a.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent('Hola, soy miembro de El Club de la Gente y quiero agendar una cita en ' + (a.nombre || ''))}">${ICON_WA}Agendar cita</a>` : ''}
    </div>
    ${a.ofrece_domicilio ? `<p style="font-size:12px;color:#888;margin:10px 0 0;line-height:1.4">¿Pides a domicilio? Comparte con el negocio la clave dinámica que aparece al voltear tu ClubCard, para que pueda validar tu descuento sin que estés presencialmente.</p>` : ''}
    ` : ''}

    <div class="sheet__sub">Promociones disponibles</div>
    ${promos.length ? promos.map((p) => {
      const fotos = (Array.isArray(p.fotos_urls) && p.fotos_urls.length) ? p.fotos_urls : (p.foto_url ? [p.foto_url] : []);
      const esFlyer = fotos.length === 1 && fotos[0].includes('flyer=1');
      if (esFlyer) {
        return `
        <div class="promo-card">
          <img src="${fotos[0]}" style="width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;border-radius:10px">
        </div>`;
      }
      return `
      <div class="promo-card">
        ${fotos.length ? `
        <div class="promo-card__fotos">
          ${fotos.map(url => `<img src="${url}">`).join("")}
        </div>` : ""}
        <span class="promo-card__badge">${ic("flame")}${badgePromo(p)}</span>
        <p class="promo-card__desc">${p.descripcion}</p>
        <span class="promo-card__meta">${beneficioTexto(p)}${detallePromo(p) ? " · " + detallePromo(p) : ""}</span>
      </div>`;
    }).join("") : `<p style="font-size:13px;color:#888;padding:8px 0">Este aliado todavía no tiene promociones cargadas. Consulta directamente en el establecimiento.</p>`}

    ${(promos.length && MIEMBRO_ID && VIEWER_USER_ID !== MIEMBRO_ID) ? `
    <div class="sheet__sub" style="margin-top:34px">Aplicar promoción</div>
    <div class="calc">
      <span class="calc__lbl">Tu beneficio en vivo</span>
      <div class="calc__title">¿Cuánto ahorras hoy?</div>
      <div class="calc__grid">
        <div class="calc__field" id="calc-monto-wrap">
          <label>Valor de tu compra</label>
          <div class="calc__input-wrap">
            <span class="peso">$</span>
            <input type="text" inputmode="numeric" id="calc-monto" placeholder="0" autocomplete="off">
          </div>
        </div>
        <div class="calc__field">
          <label>Promoción a aplicar</label>
          <select id="calc-desc">
            ${promos.map((p, pi) => `<option value="${pi}">${badgePromo(p)} · ${p.descripcion}</option>`).join("")}
          </select>
        </div>
      </div>
      <p id="calc-fijo" style="display:none;font-size:13px;color:#555;background:#f5f4f0;border-radius:8px;padding:12px 14px;margin:4px 0 0"></p>
      <div class="calc__result" id="calc-result">
        <div class="calc__cel">
          <small>Pagas</small>
          <div class="calc__cel-num" id="calc-pagas">$0</div>
        </div>
        <div class="calc__cel calc__cel--ahorro">
          <small>Ahorraste</small>
          <div class="calc__cel-num" id="calc-ahorro">$0</div>
        </div>
      </div>
      ${SIN_ACCESO_ALIADOS
        ? `<div style="margin-top:16px;padding:16px;background:#fef3c7;border-radius:12px;text-align:center">
            <div style="font-weight:700;color:#b45309;font-size:14px;margin-bottom:4px">⚠ Exclusivo desde el plan Básica</div>
            <p style="font-size:12px;color:#92400e;line-height:1.4">El plan Gratis no incluye descuentos de aliados. Este miembro puede actualizar su membresía para desbloquearlos.</p>
           </div>`
        : LIMITE_ALCANZADO
        ? `<div style="margin-top:16px;padding:16px;background:#fef3c7;border-radius:12px;text-align:center">
            <div style="font-weight:700;color:#b45309;font-size:14px;margin-bottom:4px">⚠ Límite mensual alcanzado</div>
            <p style="font-size:12px;color:#92400e;line-height:1.4">Este miembro ya usó los descuentos disponibles de su plan este mes.</p>
           </div>`
        : `<button class="btn btn--primario btn--bloque" id="calc-aplicar" style="margin-top:16px">Aplicar descuento &rarr;</button>
           <div id="calc-codigo-wrap" style="display:none;margin-top:16px">
             <label style="font-size:12px;color:#666;display:block;margin-bottom:6px">Pídele al negocio su código de aliado para confirmar</label>
             <input type="text" id="calc-codigo" placeholder="Código" inputmode="numeric" autocomplete="off" style="width:100%;padding:12px 14px;border:1px solid #ddd;border-radius:10px;font-size:18px;letter-spacing:.1em;text-align:center">
             <button class="btn btn--primario btn--bloque" id="calc-confirmar" style="margin-top:10px">Confirmar y aplicar &rarr;</button>
             <p id="calc-codigo-error" style="display:none;color:#c0392b;font-size:12px;margin-top:8px;text-align:center">Código incorrecto. Pídeselo de nuevo al negocio.</p>
           </div>`
      }
      <div id="calc-exito" style="display:none;text-align:center;padding:24px 0 8px">
        <div style="font-size:48px;line-height:1">✓</div>
        <div style="font-family:'Fraunces',serif;font-size:24px;font-weight:700;margin:10px 0 6px">¡Descuento aplicado!</div>
        <p style="font-size:13px;color:#666;line-height:1.5">Gracias por tu compra en el Club.<br>Tu ahorro ya quedó registrado.</p>
      </div>
      <p class="calc__nota" id="calc-nota"></p>
    </div>` : ""}
    </div>
  `;
}

/* ---------- CALCULADORA (se adapta al tipo de promoción elegida) ---------- */
function wireCalc(a) {
  const promos = a.promociones || [];
  if (!promos.length || !MIEMBRO_ID || VIEWER_USER_ID === MIEMBRO_ID) return;

  const montoWrap = $("#calc-monto-wrap");
  const resultWrap = $("#calc-result");
  const fijoEl = $("#calc-fijo");
  const inMonto = $("#calc-monto");
  const selDesc = $("#calc-desc");
  const elPagas = $("#calc-pagas");
  const elAhorro = $("#calc-ahorro");
  const notaEl = $("#calc-nota");
  let monto = 0;

  function esPorcentajeUsable(p) { return p.tipo === "porcentaje" && pctDerivada(p) != null; }

  function actualizarModo() {
    const p = promos[+selDesc.value];
    const usaPorcentaje = esPorcentajeUsable(p);
    montoWrap.style.display = usaPorcentaje ? "" : "none";
    resultWrap.style.display = usaPorcentaje ? "" : "none";
    fijoEl.style.display = usaPorcentaje ? "none" : "block";
    if (!usaPorcentaje) fijoEl.textContent = beneficioTexto(p);
    notaEl.textContent = usaPorcentaje
      ? "Ingresa el valor de la compra y toca el botón para aplicar el descuento y notificar al miembro."
      : "Toca el botón para aplicar este beneficio y notificar al miembro.";
    recalc();
  }

  function recalc() {
    const p = promos[+selDesc.value];
    if (!esPorcentajeUsable(p)) return;
    const pct = pctDerivada(p) / 100;
    const ahorro = monto * pct;
    elAhorro.textContent = fmtCOP(ahorro);
    elPagas.textContent = fmtCOP(monto - ahorro);
  }
  inMonto?.addEventListener("input", () => {
    const raw = inMonto.value.replace(/\D/g, "");
    monto = parseInt(raw, 10) || 0;
    inMonto.value = monto ? nf.format(monto) : "";
    recalc();
  });
  selDesc.addEventListener("change", actualizarModo);

  const btnAplicar = $("#calc-aplicar");
  const exitoEl = $("#calc-exito");
  const codigoWrap = $("#calc-codigo-wrap");
  const inCodigo = $("#calc-codigo");
  const btnConfirmar = $("#calc-confirmar");
  const codigoError = $("#calc-codigo-error");

  async function finalizarAplicacion(p, usaPorcentaje, ahorro) {
    if (MIEMBRO_ID) {
      const { ok, error } = await registrarDescuento({
        aliado_id: a.id, aliado_nombre: a.nombre, categoria: a.categoria,
        descuento_pct: badgePromo(p), compra: usaPorcentaje ? monto : null, ahorro,
      });
      if (!ok) {
        toast("Error: " + (error?.message || "desconocido"), false);
        if (btnConfirmar) {
          btnConfirmar.disabled = false;
          btnConfirmar.textContent = "Confirmar y aplicar →";
        }
        return;
      }
    }

    if (MIEMBRO_WA) {
      const msg = usaPorcentaje
        ? `¡Hola! 🎉 Tu descuento en ${a.nombre} ya quedó registrado.\n\nAhorraste ${fmtCOP(ahorro)} en una compra de ${fmtCOP(monto)}. 💳\n\n🌿 Con esta compra contribuyes al impacto social del Club en Fusagasugá.\n\nEl Club de la Gente`
        : `¡Hola! 🎉 Tu beneficio en ${a.nombre} ya quedó registrado: ${p.descripcion}.\n\n🌿 Con esta compra contribuyes al impacto social del Club en Fusagasugá.\n\nEl Club de la Gente`;
      fetch("https://egwaedadpqfwnbfosiao.supabase.co/functions/v1/whatsapp-send-3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: MIEMBRO_WA, body: msg }),
      }).catch(() => {});
    }

    if (codigoWrap) codigoWrap.style.display = "none";
    if (notaEl) notaEl.style.display = "none";
    exitoEl.style.display = "block";
    if (window.lucide) lucide.createIcons();
  }

  btnAplicar?.addEventListener("click", () => {
    const p = promos[+selDesc.value];
    const usaPorcentaje = esPorcentajeUsable(p);
    if (usaPorcentaje && !monto) { toast("Ingresa el valor de la compra primero", false); inMonto.focus(); return; }

    // Sin miembro identificado no hay nada real que proteger (es solo vista previa)
    if (!MIEMBRO_ID) {
      const ahorro = usaPorcentaje ? Math.round(monto * (pctDerivada(p) / 100)) : (p.ahorro_fijo || 0);
      finalizarAplicacion(p, usaPorcentaje, ahorro);
      return;
    }

    // Con miembro identificado: el negocio debe confirmar con su código antes de registrar nada
    btnAplicar.style.display = "none";
    if (codigoWrap) codigoWrap.style.display = "block";
    if (codigoError) codigoError.style.display = "none";
    inCodigo?.focus();
  });

  btnConfirmar?.addEventListener("click", async () => {
    const codigo = (inCodigo?.value || "").trim();
    if (!codigo) { toast("Escribe el código del negocio", false); inCodigo?.focus(); return; }

    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "Verificando...";
    if (codigoError) codigoError.style.display = "none";

    const { data: valido, error } = await supabase.rpc("verificar_codigo_aliado", {
      p_aliado_id: a.id, p_codigo: codigo,
    });

    if (error || !valido) {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = "Confirmar y aplicar →";
      if (codigoError) codigoError.style.display = "block";
      inCodigo?.focus();
      return;
    }

    const p = promos[+selDesc.value];
    const usaPorcentaje = esPorcentajeUsable(p);
    const ahorro = usaPorcentaje ? Math.round(monto * (pctDerivada(p) / 100)) : (p.ahorro_fijo || 0);
    await finalizarAplicacion(p, usaPorcentaje, ahorro);
  });

  actualizarModo();
}

/* ---------- TOAST ---------- */
let toastT;
function toast(msg, check = true) {
  const t = $("#toast");
  t.innerHTML = (check ? `<span class="chk">${ic("check")}</span>` : "") + `<span>${msg}</span>`;
  if (window.lucide) lucide.createIcons();
  t.classList.add("is-show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("is-show"), 3400);
}

/* ---------- CARRUSEL DESTACADOS (respeta el filtro de plan) ---------- */
async function cargarDestacados() {
  const { data } = await supabase.from("aliados").select("id,nombre,categoria,descuento,imagen_url,planes_visibles").eq("destacado", true).eq("activo", true).order("nombre");
  const items = (data || []).filter(a => aliadoVisibleParaPlan(a.planes_visibles, PLAN_ACTUAL));
  if (!items.length) return;
  const wrap = document.getElementById("dest-wrap");
  const track = document.getElementById("dest-track");
  if (!wrap || !track) return;
  const dupl = [...items, ...items];
  track.innerHTML = dupl.map(a => `
    <div class="dest-card" data-aliado-btn="${a.id}" style="${ccVars(a.categoria)}">
      <div class="dest-card__img">
        ${a.imagen_url ? `<img src="${a.imagen_url}" alt="${a.nombre}">` : `<span class="dest-card__av">${(a.nombre || '?')[0]}</span>`}
      </div>
      <div class="dest-card__body">
        ${a.categoria ? `<span class="dest-card__cat">${a.categoria}</span>` : ''}
        <div class="dest-card__nombre">${a.nombre}</div>
        ${a.descuento ? `<div class="dest-card__desc">${ic("flame")}${a.descuento}</div>` : ''}
      </div>
    </div>`).join('');
  wrap.style.display = 'block';
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  PLAN_ACTUAL = await resolverPlanVisitante();
  const limite = LIMITE_DESCUENTOS[PLAN_ACTUAL] ?? 1;
  LIMITE_ALCANZADO = !!(MIEMBRO_ID && limite !== Infinity && MIEMBRO_USOS >= limite);
  SIN_ACCESO_ALIADOS = limite === 0;

  await cargarAliados();
  cargarDestacados();
  renderFiltros();
  renderGrid();
  if (window.lucide) lucide.createIcons();

  // Si se llega con ?abrir=<id> (ej. desde "Aliados para ti" del Inicio del
  // miembro), se abre la ficha de ese aliado directo, sin que tenga que
  // buscarlo de nuevo en la grilla.
  const abrirId = _p.get("abrir");
  if (abrirId) {
    history.replaceState({}, "", location.pathname + location.search.replace(/[?&]abrir=[^&]*/, "").replace(/^&/, "?"));
    if (ALIADOS.some(a => a.id === abrirId)) openSheet(abrirId);
  }

  // Buscador en vivo
  $("#dir-search").addEventListener("input", (e) => { query = e.target.value; renderGrid(); });

  // Filtros
  $("#dir-filtros").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-grupo]");
    if (!chip) return;
    filtroActivo = chip.dataset.grupo;
    renderFiltros();
    renderGrid();
  });

  // Clicks globales (abrir sheet, cerrar)
  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-aliado-btn], [data-aliado]");
    if (card) { openSheet(card.dataset.aliadoBtn ?? card.dataset.aliado); return; }
    if (e.target.closest("#sheet-close") || e.target === overlay) closeSheet();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (e.key === "Enter") {
      const card = e.target.closest(".dir-card[data-aliado]");
      if (card) openSheet(card.dataset.aliado);
    }
  });
});
