type PasswordBody = {
  currentPassword?: string
  newPassword?: string
}

/**
 * Authenticated owner (or any signed-in user) changes their own password.
 * Requires the current password before applying the new one.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const email = user.email?.trim()
  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: "Account has no email",
    })
  }

  const body = await readBody<PasswordBody>(event)
  const currentPassword = body.currentPassword ?? ""
  const newPassword = body.newPassword ?? ""

  if (!currentPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: "Current password is required",
    })
  }
  if (newPassword.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password must be at least 8 characters",
    })
  }
  if (currentPassword === newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: "New password must be different",
    })
  }

  const anon = createAnonServerClient()
  const { error: verifyError } = await anon.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (verifyError) {
    throw createError({
      statusCode: 400,
      statusMessage: "Current password is incorrect",
    })
  }

  const admin = createServiceRoleClient()
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })
  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message,
    })
  }

  return { ok: true }
})
