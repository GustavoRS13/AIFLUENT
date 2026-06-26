// Service worker mínimo do AIFLUENT PWA.
// Objetivo: habilitar instalação como app + fallback de navegação offline.
// NUNCA cacheia /api (dados dinâmicos, em tempo real) nem requisições não-GET.
const CACHE = "aifluent-shell-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // não mexe em POST/PUT/DELETE
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // só same-origin
  if (url.pathname.startsWith("/api/")) return; // API sempre da rede (live)

  // Navegação (abrir páginas): rede primeiro, cai pro cache se offline.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Estáticos (_next, ícones, fontes): cache-first p/ velocidade.
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icon") ||
    /\.(png|svg|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      })(),
    );
  }
});
