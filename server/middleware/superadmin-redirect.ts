/**
 * Server-side redirect so superadmins never receive the owner panel HTML.
 * Cookie is set after login from /api/auth/me (alma_is_superadmin=1).
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const flag = getCookie(event, "alma_is_superadmin")

  if (flag !== "1") {
    return
  }

  const isOwnerSurface =
    (path === "/admin" || path.startsWith("/admin/")) &&
    path !== "/admin/login" &&
    path !== "/admin/signup"
  const isKitchenSurface =
    path === "/kitchen" || path.startsWith("/kitchen/")

  if (isOwnerSurface || isKitchenSurface) {
    return sendRedirect(event, "/superadmin", 302)
  }
})
