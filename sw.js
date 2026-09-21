// El Club de la Gente — Service Worker básico
// Objetivo: que las páginas carguen más rápido en visitas repetidas y que
// haya algo mínimo que mostrar sin conexión. No es una app nativa ni
// pretende serlo -- solo cache-first para assets estáticos.
//
// IMPORTANTE sobre el caché: CSS/JS del sitio usan "?v=N" para forzar que el
// navegador pida la versión nueva cuando se edita un archivo (ver commits de
// este repo). El Cache API por defecto compara la URL completa, incluido el
// query string, así que cachear por URL exacta es seguro: al subir "?v=N" el
// Service Worker simplemente ve una URL nueva y no sirve nada viejo.

const CACHE_NAME = "ecdlg-static-v1";

// Extensiones que vale la pena cachear -- nunca HTML (las páginas cambian
// seguido y deben pedirse siempre a la red primero) ni llamadas a Supabase.
const EXTENSIONES_CACHEABLES = /\.(css|js|png|jpg|jpeg|svg|webp|woff2?)$/i;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // nunca Supabase, Twilio, CDNs externos, etc.

  // Páginas (navegación): red primero, para que nunca se quede pegado en una
  // versión vieja del HTML -- si no hay red, se sirve lo último que sí cargó.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then((res) => {
        const copia = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copia));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (!EXTENSIONES_CACHEABLES.test(url.pathname)) return;

  // Assets estáticos: caché primero (rápido), y de paso se refresca en
  // segundo plano para la próxima visita.
  event.respondWith(
    caches.match(req).then((cacheado) => {
      const enRed = fetch(req).then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copia));
        }
        return res;
      }).catch(() => cacheado);
      return cacheado || enRed;
    })
  );
});
