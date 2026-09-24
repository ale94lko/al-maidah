/**
 * Send platform superadmins to /superadmin instead of owner/kitchen surfaces.
 * Uses /api/auth/me when possible so client JWT quirks cannot hide the role.
 */
import { isSuperAdminUser } from "~/utils/roles"

export async function redirectSuperadminAwayFromOwner(): Promise<boolean> {
  if (import.meta.server) {
    return false
  }
  const { refreshSession, fetchMe, isSuperadmin } = useAuth()
  const session = await refreshSession()
  if (!session?.user) {
    return false
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

  if (!superadmin) {
    return false
  }
  await navigateTo("/superadmin", { replace: true })
  return true
}
