/**
 * Delete an owner account (superadmin).
 */
export default defineEventHandler(async (event) => {
  const actor = await requireSuperAdmin(event)
  const userId = getRouterParam(event, "userId")
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "userId is required" })
  }

  const admin = createServiceRoleClient()
  const result = await deleteOwnerAccount(admin, userId, actor.id)
  return { ok: true, ...result }
})
