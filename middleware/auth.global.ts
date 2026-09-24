import { isSuperAdminUser } from "~/utils/roles"

const PUBLIC_AUTH_PATHS = new Set(["/admin/login", "/admin/signup"])

/**
 * Require a signed-in user for /admin/**, /kitchen/**, and /superadmin/**.
 * Role decisions prefer /api/auth/me so Firefox/stale JWT metadata cannot
 * bounce a superadmin into the restaurant owner panel.
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

  if (import.meta.server) {
    return
  }

  const { refreshSession, fetchMe, isSuperadmin } = useAuth()
  const session = await refreshSession()

  if (!session) {
    return navigateTo({
      path: "/admin/login",
      query: { redirect: to.fullPath },
    })
  }

  let superadmin =
    isSuperadmin.value === true || isSuperAdminUser(session.user)

  if (isSuperadmin.value === null) {
    try {
      const me = await fetchMe()
      superadmin = !!me?.is_superadmin
    } catch {
      superadmin = isSuperAdminUser(session.user)
    }
  }

  if (isSuperadminRoute && !superadmin) {
    // Confirmed non-superadmin only — never bounce on uncertain metadata.
    return navigateTo("/admin", { replace: true })
  }

  if (superadmin && (isAdminRoute || isKitchenRoute)) {
    return navigateTo("/superadmin", { replace: true })
  }
})
