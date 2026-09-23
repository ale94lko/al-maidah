export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  const categoryId = getRouterParam(event, "categoryId")
  if (!restaurantId || !categoryId) {
    throw createError({ statusCode: 400, statusMessage: "Missing ids" })
  }

  const body = await readBody<{
    name_en?: string
    name_ar?: string
    sort_order?: number
    is_archived?: boolean
  }>(event)

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const category = await updateCategory(client, restaurantId, categoryId, body ?? {})
  return { category }
})
