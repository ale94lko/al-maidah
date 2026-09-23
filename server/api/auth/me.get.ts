/**
 * Current owner profile + owned restaurants (Bearer access token required).
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const client = createServiceRoleClient()

  const { data: ownerships, error } = await client
    .from("restaurant_owners")
    .select("restaurant_id, restaurants(id, name, slug, trn, currency, created_at, updated_at)")
    .eq("user_id", user.id)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load ownerships: ${error.message}`,
    })
  }

  const restaurants = (ownerships ?? []).flatMap((row) => {
    const linked = row.restaurants
    if (!linked) {
      return []
    }
    return Array.isArray(linked) ? linked : [linked]
  })

  return {
    user: { id: user.id, email: user.email },
    restaurants,
  }
})
