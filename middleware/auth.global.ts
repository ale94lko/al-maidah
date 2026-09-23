const PUBLIC_AUTH_PATHS = new Set(["/admin/login", "/admin/signup"])

/**
 * Require a signed-in owner for /admin/** and /kitchen/**.
 * Login and signup remain public.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const needsAuth =
    to.path === "/admin" ||
    to.path.startsWith("/admin/") ||
    to.path === "/kitchen" ||
    to.path.startsWith("/kitchen/")

  if (!needsAuth || PUBLIC_AUTH_PATHS.has(to.path)) {
    return
  }

  // Session lives in the browser client; enforce on the client navigation path.
  if (import.meta.server) {
    return
  }

  const { refreshSession } = useAuth()
  const session = await refreshSession()

  if (!session) {
    return navigateTo({
      path: "/admin/login",
      query: { redirect: to.fullPath },
    })
  }
})
