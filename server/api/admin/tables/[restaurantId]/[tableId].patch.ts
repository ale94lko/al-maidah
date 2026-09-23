export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  const tableId = getRouterParam(event, "tableId")
  if (!restaurantId || !tableId) {
    throw createError({ statusCode: 400, statusMessage: "Missing ids" })
  }

  const body = await readBody<{ table_number?: number; label?: string | null }>(
    event,
  )
  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const table = await updateRestaurantTable(client, restaurantId, tableId, {
    table_number: body?.table_number,
    label: body?.label,
  })

  return { table }
})
