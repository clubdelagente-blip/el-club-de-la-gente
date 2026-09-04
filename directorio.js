/* ============================================================
   EL CLUB DE LA GENTE — Módulo 5
   Directorio real (Supabase) · buscador · filtros por plan · calculadora
   ============================================================ */
import { supabase } from './supabase.js';

/* ---------- HELPERS ---------- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const ic = (n) => `<i data-lucide="${n}"></i>`;
const nf = new Intl.NumberFormat("es-CO");
const fmtCOP = (n) => "$" + nf.format(Math.max(0, Math.round(n || 0)));
function norm(s) {
  return (s || "").toLowerCase()
    .replace(/[áàäâã]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i")
    .replace(/[óòöôõ]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n");
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

/* ---------- CONTEXTO DEL VISITANTE ---------- */
const _p = new URLSearchParams(location.search);
const MIEMBRO_ID  = _p.get("miembro");
const MIEMBRO_WA  = _p.get("wa") || "";
const MIEMBRO_USOS = parseInt(_p.get("usos") || "0", 10);
const PLAN_URL = _p.get("plan"); // viene de Verificar.html cuando un aliado escanea a un miembro

const LIMITE_DESCUENTOS = { gratis: 1, basica: 2, premium: Infinity, vitalicia: Infinity };
let PLAN_ACTUAL = "gratis";
let LIMITE_ALCANZADO = false;

/* Resuelve el plan real del visitante:
   1) ?plan= en la URL (un aliado viendo lo que le corresponde a un miembro escaneado)
   2) sesión activa de Supabase (un miembro navegando desde su propio dashboard)
   3) sin sesión ni parámetro: visitante anónimo → solo ve el nivel Gratis */
async function resolverPlanVisitante() {
  if (PLAN_URL) return PLAN_URL;
  const { data: { session } } = await supabase.auth.getSession();
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
    .select("id, nombre, categoria, descuento, descripcion, whatsapp, direccion, maps_url, imagen_url, destacado, planes_visibles")
    .eq("activo", true).order("nombre");
  const todos = data || [];
  ALIADOS = todos.filter(a => (a.planes_visibles && a.planes_visibles.length ? a.planes_visibles : ["basica", "premium"]).includes(PLAN_ACTUAL));

  const cats = new Set();
  ALIADOS.forEach(a => (a.categoria || "").split(",").map(s => s.trim()).filter(Boolean).forEach(c => cats.add(c)));
  GRUPOS = ["Todos", ...[...cats].sort()];
}

/* ---------- RENDER FILTROS ---------- */
function renderFiltros() {
  $("#dir-filtros").innerHTML = GRUPOS.map(g =>
    `<button class="dir-chip${g === filtroActivo ? " is-on" : ""}" data-grupo="${g}">${g}</button>`
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

  cont.innerHTML = list.map(a => `
    <article class="dir-card" data-aliado="${a.id}" tabindex="0">
      <div class="dir-card__top">
        ${a.imagen_url
          ? `<img src="${a.imagen_url}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0">`
          : `<span class="dir-card__ic">${ic(iconoCategoria(a.categoria))}</span>`}
        <div>
          <div class="dir-card__cat">${a.categoria || "Aliado del Club"}</div>
          <div class="dir-card__nombre">${a.nombre}</div>
        </div>
      </div>
      <div class="dir-card__pct-row">
        <span class="dir-card__pct">${a.descuento || "Ver más"}</span>
        <span class="dir-card__pct-lbl">de descuento<br>para miembros</span>
      </div>
      <div class="dir-card__ver">
        <button class="btn btn--ghost-verde" data-aliado-btn="${a.id}">Ver establecimiento &rarr;</button>
      </div>
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

async function openSheet(aliadoId) {
  const a = ALIADOS.find(x => x.id === aliadoId);
  if (!a) return;
  aliadoActual = a;
  sheetInner.innerHTML = `<p style="text-align:center;padding:60px 0;color:#999">Cargando promociones…</p>`;
  overlay.classList.add("is-open");
  sheet.classList.add("is-open");
  document.body.style.overflow = "hidden";
  $("#sheet-scroll").scrollTop = 0;
  if (window.lucide) lucide.createIcons();

  const { data } = await supabase.from("promociones").select("*").eq("aliado_id", a.id).eq("activa", true).order("created_at", { ascending: false });
  a.promociones = data || [];
  sheetInner.innerHTML = sheetAliado(a);
  if (window.lucide) lucide.createIcons();
  wireCalc(a);
}
function closeSheet() {
  overlay.classList.remove("is-open");
  sheet.classList.remove("is-open");
  document.body.style.overflow = "";
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
  return `
    <div class="sheet__cat">${a.categoria || "Aliado del Club"}</div>
    <h2 class="sheet__nombre">${a.nombre}</h2>
    ${a.imagen_url
      ? `<img src="${a.imagen_url}" alt="${a.nombre}" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;margin:28px 0">`
      : `<div class="foto-ph"><span class="foto-ph__ic">${ic(iconoCategoria(a.categoria))}</span><span class="foto-ph__txt">${a.nombre}</span></div>`}
    <p class="sheet__desc">${a.descripcion || "Aliado de El Club de la Gente."}</p>

    ${(a.direccion || a.maps_url) ? `
    <div style="display:flex;align-items:center;gap:10px;margin:12px 0 4px;flex-wrap:wrap;">
      ${a.direccion ? `<span style="font-size:13px;color:#666;display:flex;align-items:center;gap:5px;">${ic("map-pin")}${a.direccion}</span>` : ''}
      ${a.maps_url ? `<a href="${a.maps_url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:#e8f5ee;color:#1a7a3c;border-radius:99px;font-size:12px;font-weight:600;text-decoration:none;">${ic("navigation")}Ver en mapa</a>` : ''}
    </div>` : ''}

    <div class="sheet__sub">Promociones disponibles</div>
    ${promos.length ? promos.map((p) => `
      <div class="descuento">
        <div class="descuento__pct">${badgePromo(p)}</div>
        <div class="descuento__body">
          <h4>${p.descripcion}</h4>
          <p>${beneficioTexto(p)}${detallePromo(p) ? " · " + detallePromo(p) : ""}</p>
        </div>
      </div>`).join("") : `<p style="font-size:13px;color:#888;padding:8px 0">Este aliado todavía no tiene promociones cargadas. Consulta directamente en el establecimiento.</p>`}

    ${promos.length ? `
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
      ${LIMITE_ALCANZADO
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
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;margin:10px 0 6px">¡Descuento aplicado!</div>
        <p style="font-size:13px;color:#666;line-height:1.5">Gracias por tu compra en el Club.<br>Tu ahorro ya quedó registrado.</p>
      </div>
      <p class="calc__nota" id="calc-nota"></p>
    </div>` : ""}
  `;
}

/* ---------- CALCULADORA (se adapta al tipo de promoción elegida) ---------- */
function wireCalc(a) {
  const promos = a.promociones || [];
  if (!promos.length) return;

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
  const items = (data || []).filter(a => (a.planes_visibles && a.planes_visibles.length ? a.planes_visibles : ["basica", "premium"]).includes(PLAN_ACTUAL));
  if (!items.length) return;
  const wrap = document.getElementById("dest-wrap");
  const track = document.getElementById("dest-track");
  if (!wrap || !track) return;
  const dupl = [...items, ...items];
  track.innerHTML = dupl.map(a => `
    <div class="dest-card" data-aliado-btn="${a.id}">
      <div class="dest-card__img">
        ${a.imagen_url ? `<img src="${a.imagen_url}" alt="${a.nombre}">` : `<span class="dest-card__av">${(a.nombre || '?')[0]}</span>`}
      </div>
      <div class="dest-card__body">
        ${a.categoria ? `<span class="dest-card__cat">${a.categoria}</span>` : ''}
        <div class="dest-card__nombre">${a.nombre}</div>
        ${a.descuento ? `<div class="dest-card__desc">${a.descuento}</div>` : ''}
      </div>
    </div>`).join('');
  wrap.style.display = 'block';
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  PLAN_ACTUAL = await resolverPlanVisitante();
  const limite = LIMITE_DESCUENTOS[PLAN_ACTUAL] ?? 1;
  LIMITE_ALCANZADO = !!(MIEMBRO_ID && limite !== Infinity && MIEMBRO_USOS >= limite);

  await cargarAliados();
  cargarDestacados();
  renderFiltros();
  renderGrid();
  if (window.lucide) lucide.createIcons();

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
