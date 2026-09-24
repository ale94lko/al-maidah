/* Kitchen-only SW for PWA installability. Version bump forces clients to refresh. */
const SW_VERSION = "al-maidah-kitchen-sw-v2"

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key !== SW_VERSION)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  // Never intercept admin/superadmin/auth — always hit the network.
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/superadmin") ||
    url.pathname.startsWith("/_nuxt") ||
    url.pathname.startsWith("/api")
  ) {
    return
  }

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
