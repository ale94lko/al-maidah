/* Minimal service worker so the kitchen tablet meets Chrome installability. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => {
        if (cached) {
          return cached
        }
        return new Response("", { status: 504, statusText: "Offline" })
      }),
    ),
  )
})
