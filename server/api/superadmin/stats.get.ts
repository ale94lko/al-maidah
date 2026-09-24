/**
 * Platform-wide usage statistics (superadmin).
 */
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const client = createServiceRoleClient()
  const stats = await getPlatformStats(client)
  return { stats }
})
