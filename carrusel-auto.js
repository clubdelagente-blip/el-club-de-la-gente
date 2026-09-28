/* ============================================================
   EL CLUB DE LA GENTE — Carrusel de marcas, movido por JS
   Antes era una animación CSS pura (@keyframes) -- se quedaba
   congelada en algunos celulares. El intento con scroll nativo
   tampoco sirvió (necesita que el contenido desborde el contenedor
   lo suficiente, y no siempre pasa). Esto mueve el track con
   transform: translateX directo por JS, igual que hacía el CSS
   original, sin depender de overflow/scroll -- así se ve exactamente
   igual sin importar cuánto contenido haya.
   ============================================================ */
(function () {
  function iniciarCarrusel(wrap) {
    const track = wrap.querySelector(".marcas-carrusel__track");
    if (!track || wrap.dataset.carruselAuto) return;
    wrap.dataset.carruselAuto = "1";

    let x = 0;
    let mitad = 0;
    let pausado = false;

    wrap.addEventListener("touchstart", () => { pausado = true; }, { passive: true });
    wrap.addEventListener("touchend", () => { setTimeout(() => { pausado = false; }, 2500); }, { passive: true });
    wrap.addEventListener("mouseenter", () => { pausado = true; });
    wrap.addEventListener("mouseleave", () => { pausado = false; });

    function paso() {
      if (!pausado && track.children.length) {
        if (!mitad) mitad = track.scrollWidth / 2;
        if (mitad) {
          x += 0.6;
          if (x >= mitad) x = 0;
          track.style.transform = `translateX(${-x}px)`;
        }
      }
      requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".marcas-carrusel").forEach(iniciarCarrusel);
  });
})();
