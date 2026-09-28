/* ============================================================
   EL CLUB DE LA GENTE — Carrusel de marcas, movido por JS
   Antes era una animación CSS pura (@keyframes). En iPhone con Modo
   de Bajo Consumo, iOS pausa animaciones CSS continuas para ahorrar
   batería -- el carrusel se quedaba congelado. Esto lo reemplaza por
   un scroll nativo movido con requestAnimationFrame, que no se ve
   afectado de la misma forma, y de paso permite que la persona lo
   deslice con el dedo (se pausa mientras toca, y retoma solo después).
   ============================================================ */
(function () {
  function iniciarCarrusel(wrap) {
    const track = wrap.querySelector(".marcas-carrusel__track");
    if (!track || wrap.dataset.carruselAuto) return;
    wrap.dataset.carruselAuto = "1";

    let pausado = false;
    let mitad = 0;

    wrap.addEventListener("touchstart", () => { pausado = true; }, { passive: true });
    wrap.addEventListener("touchend", () => { setTimeout(() => { pausado = false; }, 2500); }, { passive: true });
    wrap.addEventListener("mouseenter", () => { pausado = true; });
    wrap.addEventListener("mouseleave", () => { pausado = false; });

    function paso() {
      if (!pausado && track.children.length) {
        if (!mitad) mitad = wrap.scrollWidth / 2;
        if (mitad) {
          wrap.scrollLeft += 0.6;
          if (wrap.scrollLeft >= mitad) wrap.scrollLeft = 0;
        }
      }
      requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  // El wrapper (.marcas-carrusel) ya existe en el HTML desde el inicio; lo
  // único que llega después (fetch a Supabase) es el contenido del track,
  // y paso() ya espera a que track.children.length tenga algo -- no hace
  // falta reintentar buscar el wrapper.
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".marcas-carrusel").forEach(iniciarCarrusel);
  });
})();
