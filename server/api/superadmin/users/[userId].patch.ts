type PatchBody = {
  email?: string
  restaurantName?: string
  slug?: string
  trn?: string | null
  restaurantId?: string
}

/**
 * Update owner email and/or primary restaurant fields (superadmin).
 */
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const userId = getRouterParam(event, "userId")
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: "userId is required" })
  }

  const body = await readBody<PatchBody>(event)
  const admin = createServiceRoleClient()

  const { data: existing, error: getError } =
    await admin.auth.admin.getUserById(userId)
  if (getError || !existing.user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" })
  }
  if (isSuperAdmin(existing.user)) {
    throw createError({ statusCode: 404, statusMessage: "User not found" })
  }

  let email = existing.user.email ?? ""
  if (typeof body.email === "string" && body.email.trim()) {
    const nextEmail = body.email.trim().toLowerCase()
    if (nextEmail !== email) {
      const { data: updated, error: emailError } =
        await admin.auth.admin.updateUserById(userId, { email: nextEmail })
      if (emailError || !updated.user) {
        throw createError({
          statusCode: 400,
          statusMessage: emailError?.message || "Could not update email",
        })
      }
      email = updated.user.email ?? nextEmail
    }
  }

  const restaurants = await restaurantsForUser(admin, userId)
  let restaurant = restaurants[0] ?? null

  const restaurantId =
    body.restaurantId?.trim() || restaurant?.id || null

  if (
    restaurantId &&
    (body.restaurantName !== undefined ||
      body.slug !== undefined ||
      body.trn !== undefined)
  ) {
    const owned = restaurants.find((row) => row.id === restaurantId)
    if (!owned) {
      throw createError({
        statusCode: 403,
        statusMessage: "Restaurant is not owned by this user",
      })
    }

    const patch: Record<string, string | null> = {}
    if (typeof body.restaurantName === "string" && body.restaurantName.trim()) {
      patch.name = body.restaurantName.trim()
    }
    if (typeof body.slug === "string" && body.slug.trim()) {
      const slug = body.slug.trim().toLowerCase()
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid restaurant slug",
        })
      }
      const { data: clash } = await admin
        .from("restaurants")
        .select("id")
        .eq("slug", slug)
        .neq("id", restaurantId)
        .maybeSingle()
      if (clash) {
        throw createError({
          statusCode: 409,
          statusMessage: "Restaurant slug is already taken",
        })
      }
      patch.slug = slug
    }
    if (body.trn !== undefined) {
      patch.trn =
        typeof body.trn === "string" ? body.trn.trim() || null : null
    }

    if (Object.keys(patch).length > 0) {
      const { data: updatedRest, error: restError } = await admin
        .from("restaurants")
        .update(patch)
        .eq("id", restaurantId)
        .select("id, name, slug, trn, currency, created_at, updated_at")
        .single()

      if (restError || !updatedRest) {
        throw createError({
          statusCode: 500,
          statusMessage: restError?.message || "Could not update restaurant",
        })
      }
      restaurant = updatedRest
    }
  }

  return {
    user: {
      id: userId,
      email,
      created_at: existing.user.created_at,
      last_sign_in_at: existing.user.last_sign_in_at ?? null,
    },
    restaurants: restaurantId
      ? (await restaurantsForUser(admin, userId))
      : restaurants,
  }
})
