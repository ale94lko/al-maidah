/**
 * Kitchen ticket board for an owned restaurant.
 * Cash orders and paid online orders only; unpaid online payments stay hidden.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)
  const restaurantId =
    typeof query.restaurantId === "string" ? query.restaurantId.trim() : ""

  if (!restaurantId) {
    throw createError({
      statusCode: 400,
      statusMessage: "restaurantId is required",
    })
  }

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const tickets = await listKitchenTickets(client, restaurantId)
  return { restaurant_id: restaurantId, tickets }
})
