/**
 * Platform health stats for superadmin (accounts, visits, errors).
 */
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const client = createServiceRoleClient()
  const stats = await getPlatformStats(client)
  return { stats }
})
