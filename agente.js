/* ============================================================
   EL CLUB DE LA GENTE — Módulo 7 · Agente de WhatsApp (lógica)
   Abre el chat real de WhatsApp con el Agente del Club.
   ============================================================ */

(function () {
  const NUM_WA = "573170142609"; // número real del Club en WhatsApp (wa.me)

  document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) lucide.createIcons();
    const waMsg = encodeURIComponent("Hola, soy miembro del Club y quiero ver mis beneficios.");
    document.getElementById("ag-open-wa")?.addEventListener("click", () => window.open(`https://wa.me/${NUM_WA}?text=${waMsg}`, "_blank"));
  });
})();
