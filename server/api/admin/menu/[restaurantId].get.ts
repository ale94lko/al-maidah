/**
 * Admin menu including cost_price for an owned restaurant only.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")

  if (!restaurantId) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant id" })
  }

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const items = await getMenuItemsForRestaurant(client, restaurantId)
  return { restaurant_id: restaurantId, items }
})
