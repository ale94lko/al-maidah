type SignupBody = {
  email?: string
  password?: string
  restaurantName?: string
  slug?: string
  trn?: string
}

/**
 * Create an owner account plus their restaurant and ownership row.
 * Uses the service role so restaurant_owners can be written securely.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<SignupBody>(event)
  const email = body.email?.trim().toLowerCase()
  const password = body.password ?? ""
  const restaurantName = body.restaurantName?.trim()
  const trn = body.trn?.trim() || null
  const slugInput = body.slug?.trim().toLowerCase()

  if (!email || !password || !restaurantName) {
    throw createError({
      statusCode: 400,
      statusMessage: "email, password, and restaurantName are required",
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password must be at least 8 characters",
    })
  }

  const slug = slugInput || slugifyRestaurantName(restaurantName)
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid restaurant slug",
    })
  }

  const admin = createServiceRoleClient()

  const { data: existing } = await admin
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: "Restaurant slug is already taken",
    })
  }

  const { data: createdUser, error: userError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

  if (userError || !createdUser.user) {
    throw createError({
      statusCode: 400,
      statusMessage: userError?.message || "Could not create user",
    })
  }

  const userId = createdUser.user.id

  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .insert({
      name: restaurantName,
      slug,
      trn,
      currency: "AED",
    })
    .select("id, name, slug, trn, currency, created_at, updated_at")
    .single()

  if (restaurantError || !restaurant) {
    await admin.auth.admin.deleteUser(userId)
    throw createError({
      statusCode: 500,
      statusMessage: restaurantError?.message || "Could not create restaurant",
    })
  }

  const { error: ownerError } = await admin.from("restaurant_owners").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
  })

  if (ownerError) {
    await admin.from("restaurants").delete().eq("id", restaurant.id)
    await admin.auth.admin.deleteUser(userId)
    throw createError({
      statusCode: 500,
      statusMessage: ownerError.message,
    })
  }

  const { data: sessionData, error: signInError } =
    await admin.auth.signInWithPassword({ email, password })

  if (signInError || !sessionData.session) {
    return {
      user: { id: userId, email },
      restaurant,
      session: null,
      message: "Account created. Please sign in.",
    }
  }

  return {
    user: { id: userId, email },
    restaurant,
    session: sessionData.session,
  }
})
