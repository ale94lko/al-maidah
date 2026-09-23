export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  const tableId = getRouterParam(event, "tableId")
  if (!restaurantId || !tableId) {
    throw createError({ statusCode: 400, statusMessage: "Missing ids" })
  }

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const session = await closeTableSession(
    client,
    restaurantId,
    tableId,
    "manual",
  )

  return { session }
})
