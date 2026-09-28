/* ============================================================
   EL CLUB DE LA GENTE — Gesto de "deslizar para volver atrás"
   La app instalada (PWA en pantalla de inicio) no tiene la barra de
   Safari/Chrome, así que el gesto nativo de borde no existe ahí.
   Esto lo reemplaza: detecta un swipe desde el borde izquierdo y
   llama history.back(), igual que el botón "Atrás" del navegador.
   ============================================================ */
(function () {
  const BORDE = 24, UMBRAL = 70;
  let startX = 0, startY = 0, activo = false;
  document.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    activo = t.clientX <= BORDE;
    startX = t.clientX; startY = t.clientY;
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!activo) return;
    activo = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX, dy = t.clientY - startY;
    if (dx > UMBRAL && Math.abs(dx) > Math.abs(dy) * 1.5) history.back();
  }, { passive: true });
})();
