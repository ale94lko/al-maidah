export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  if (!restaurantId) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant id" })
  }

  const query = getQuery(event)
  const includeInactive =
    query.includeInactive === "1" || query.includeInactive === "true"

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const { data: restaurant, error } = await client
    .from("restaurants")
    .select("id, name, slug")
    .eq("id", restaurantId)
    .maybeSingle()

  if (error || !restaurant) {
    throw createError({ statusCode: 404, statusMessage: "Restaurant not found" })
  }

  const tables = await listRestaurantTables(client, restaurantId, {
    includeInactive,
  })

  return {
    restaurant,
    tables,
  }
})
