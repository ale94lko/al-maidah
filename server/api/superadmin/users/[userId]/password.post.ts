type PasswordBody = {
  password?: string
}

/**
 * Reset an owner password (superadmin).
 */
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const userId = getRouterParam(event, "userId")
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "userId is required" })
  }

  const body = await readBody<PasswordBody>(event)
  const password = body.password ?? ""
  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password must be at least 8 characters",
    })
  }

  const admin = createServiceRoleClient()
  const { data: existing, error: getError } =
    await admin.auth.admin.getUserById(userId)
  if (getError || !existing.user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" })
  }
  if (isSuperAdmin(existing.user)) {
    throw createError({ statusCode: 404, statusMessage: "User not found" })
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message,
    })
  }

  return { ok: true }
})
