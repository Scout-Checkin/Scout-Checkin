const CACHE_NAME = "scout-scanner-v3";

const APP_FILES = [
  "./",
  "./index.html",
  "./offline.html",
  "./Scanner.html"
];

const QR_LIBRARY =
  "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await cache.addAll(APP_FILES);

    // Cache QR library for offline scanning
    try {
      const response = await fetch(QR_LIBRARY);
      if (response.ok) {
        await cache.put(QR_LIBRARY, response);
      }
    } catch (error) {
      console.log("QR library will be cached on first online use.");
    }

    await self.skipWaiting();
  })());
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith("scout-scanner-") &&
          key !== CACHE_NAME
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

// FETCH
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  const isOurPage = url.origin === self.location.origin;
  const isQRLibrary =
    url.hostname === "cdn.jsdelivr.net" &&
    url.pathname.includes("jsqr");

  if (isOurPage || isQRLibrary) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);

        if (response && response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        const cached = await cache.match(request);

        if (cached) return cached;

        if (request.mode === "navigate") {
          return await cache.match("./offline.html") ||
                 await cache.match("./index.html");
        }

        return Response.error();
      }
    })());
  }
});
