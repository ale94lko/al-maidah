export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  if (!restaurantId) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant id" })
  }

  const body = await readBody<{ table_number?: number; label?: string | null }>(
    event,
  )
  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const table = await createRestaurantTable(client, restaurantId, {
    table_number: Number(body?.table_number),
    label: body?.label,
  })

  return { table }
})
