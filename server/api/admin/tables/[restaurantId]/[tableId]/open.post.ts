export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  const tableId = getRouterParam(event, "tableId")
  if (!restaurantId || !tableId) {
    throw createError({ statusCode: 400, statusMessage: "Missing ids" })
  }

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

  const opened = await openTableSession(client, restaurantId, tableId)
  const { appUrl } = useRuntimeConfig().public
  const base = String(appUrl || "").replace(/\/$/, "")
  const menuUrl = `${base}/m/${restaurant.slug}?session=${opened.session.token}`

  return {
    restaurant,
    table: opened.table,
    session: opened.session,
    menuUrl,
  }
})
