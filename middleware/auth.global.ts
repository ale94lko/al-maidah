import { isSuperAdminUser } from "~/utils/roles"

const PUBLIC_AUTH_PATHS = new Set(["/admin/login", "/admin/signup"])

/**
 * Require a signed-in user for /admin/**, /kitchen/**, and /superadmin/**.
 * Superadmins land on /superadmin; restaurant owners stay on /admin.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const isSuperadminRoute =
    to.path === "/superadmin" || to.path.startsWith("/superadmin/")
  const isAdminRoute =
    to.path === "/admin" || to.path.startsWith("/admin/")
  const isKitchenRoute =
    to.path === "/kitchen" || to.path.startsWith("/kitchen/")

  const needsAuth = isSuperadminRoute || isAdminRoute || isKitchenRoute

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

  const superadmin = isSuperAdminUser(session.user)

  if (isSuperadminRoute && !superadmin) {
    return navigateTo("/admin")
  }

  if (superadmin && (isAdminRoute || isKitchenRoute)) {
    return navigateTo("/superadmin", { replace: true })
  }
})
