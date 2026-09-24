/**
 * Send platform superadmins to /superadmin instead of owner/kitchen surfaces.
 * Returns true when a redirect was triggered.
 */
export async function redirectSuperadminAwayFromOwner(): Promise<boolean> {
  if (import.meta.server) {
    return false
  }
  const { refreshSession } = useAuth()
  const session = await refreshSession()
  if (!session?.user || !isSuperAdminUser(session.user)) {
    return false
  }
  await navigateTo("/superadmin", { replace: true })
  return true
}
