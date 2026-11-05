/* ============================================================
   EL CLUB DE LA GENTE — Carruseles movidos por JS (marcas y promos)
   Antes era una animación CSS pura (@keyframes) -- se quedaba
   congelada en algunos celulares. El intento con scroll nativo
   tampoco sirvió (necesita que el contenido desborde el contenedor
   lo suficiente, y no siempre pasa). Esto mueve el track con
   transform: translateX directo por JS, igual que hacía el CSS
   original, sin depender de overflow/scroll -- así se ve exactamente
   igual sin importar cuánto contenido haya.

   También se puede arrastrar manualmente (dedo o mouse) para ver las
   marcas a su propio ritmo -- al soltar, el auto-avance se reactiva
   solo después de una pausa breve.
   ============================================================ */
(function () {
  function iniciarCarrusel(wrap) {
    const track = wrap.querySelector('[class$="__track"]');
    if (!track || wrap.dataset.carruselAuto) return;
    wrap.dataset.carruselAuto = "1";

    let x = 0;
    let mitad = 0;
    let pausado = false;
    let arrastrando = false;
    let startX = 0;
    let startXVal = 0;
    let distanciaArrastrada = 0;

    function asegurarMitad() {
      if (!mitad && track.children.length) mitad = track.scrollWidth / 2;
    }
    function normalizar() {
      if (!mitad) return;
      x = ((x % mitad) + mitad) % mitad;
    }
    function moverA(nuevaX) {
      x = nuevaX;
      normalizar();
      track.style.transform = `translateX(${-x}px)`;
    }
    // Si el arrastre movió de verdad el carrusel, se bloquea el próximo
    // click para que soltar el dedo/mouse no dispare el link de la marca.
    function bloquearClickSiguiente() {
      const bloquear = (e) => { e.preventDefault(); e.stopPropagation(); };
      wrap.addEventListener("click", bloquear, { capture: true, once: true });
      setTimeout(() => wrap.removeEventListener("click", bloquear, { capture: true }), 300);
    }

    const iniciarArrastre = (clientX) => {
      asegurarMitad();
      pausado = true;
      arrastrando = true;
      distanciaArrastrada = 0;
      startX = clientX;
      startXVal = x;
    };
    const moverArrastre = (clientX) => {
      if (!arrastrando) return;
      const dx = clientX - startX;
      distanciaArrastrada = Math.max(distanciaArrastrada, Math.abs(dx));
      moverA(startXVal - dx);
    };
    const soltarArrastre = () => {
      if (!arrastrando) return;
      arrastrando = false;
      wrap.style.cursor = "";
      if (distanciaArrastrada > 6) bloquearClickSiguiente();
      setTimeout(() => { pausado = false; }, 2500);
    };

    // Dedo (celular)
    wrap.addEventListener("touchstart", (e) => iniciarArrastre(e.touches[0].clientX), { passive: true });
    wrap.addEventListener("touchmove", (e) => moverArrastre(e.touches[0].clientX), { passive: true });
    wrap.addEventListener("touchend", soltarArrastre, { passive: true });

    // Mouse (escritorio)
    wrap.style.cursor = "grab";
    wrap.addEventListener("mousedown", (e) => {
      iniciarArrastre(e.clientX);
      wrap.style.cursor = "grabbing";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => moverArrastre(e.clientX));
    window.addEventListener("mouseup", soltarArrastre);
    wrap.addEventListener("mouseenter", () => { pausado = true; });
    wrap.addEventListener("mouseleave", () => { if (!arrastrando) pausado = false; });

    function paso() {
      if (!pausado && !arrastrando && track.children.length) {
        asegurarMitad();
        if (mitad) moverA(x + 0.6);
      }
      requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".marcas-carrusel, .promo-carrusel").forEach(iniciarCarrusel);
  });
})();
