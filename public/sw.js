const CACHE_NAME = "pangolin-x-v3";
const APP_SHELL = ["/manifest.webmanifest", "/Pangolin-x.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  // Browser extensions and non-web schemes cannot be stored by Cache Storage.
  if (!/^https?:$/.test(requestUrl.protocol) || requestUrl.origin !== self.location.origin) return;

  // Always fetch pages and Next.js bundles from the network first. This keeps
  // content and language updates from being trapped behind a stale PWA cache.
  if (event.request.mode === "navigate" || event.request.url.includes("/_next/")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match(event.request));
    })
  );
});
