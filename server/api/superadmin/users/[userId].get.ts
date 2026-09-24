/**
 * Owner account detail (superadmin).
 */
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const userId = getRouterParam(event, "userId")
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "userId is required" })
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" })
  }

  if (isSuperAdmin(data.user)) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    })
  }

  const restaurants = await restaurantsForUser(admin, userId)

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      created_at: data.user.created_at,
      last_sign_in_at: data.user.last_sign_in_at ?? null,
    },
    restaurants,
  }
})
