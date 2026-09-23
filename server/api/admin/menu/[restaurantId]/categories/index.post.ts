export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  if (!restaurantId) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant id" })
  }

  const body = await readBody<{
    name_en?: string
    name_ar?: string
    sort_order?: number
  }>(event)

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const category = await createCategory(client, restaurantId, {
    name_en: body?.name_en ?? "",
    name_ar: body?.name_ar ?? "",
    sort_order: body?.sort_order,
  })

  return { category }
})
