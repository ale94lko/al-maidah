/**
 * Unregister legacy root-scoped service workers that could keep serving
 * stale admin/superadmin shells (seen especially in Firefox).
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client || !("serviceWorker" in navigator)) {
    return
  }

  void (async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      let removed = false
      for (const registration of registrations) {
        const scopePath = new URL(registration.scope).pathname
        if (scopePath === "/" || scopePath === "") {
          removed = (await registration.unregister()) || removed
        }
      }
      if (removed && "caches" in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
    } catch {
      // Ignore — auth/UI must keep working even if SW cleanup fails.
    }
  })()
})
