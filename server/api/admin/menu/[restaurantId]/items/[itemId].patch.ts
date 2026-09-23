export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  const itemId = getRouterParam(event, "itemId")
  if (!restaurantId || !itemId) {
    throw createError({ statusCode: 400, statusMessage: "Missing ids" })
  }

  const body = await readBody<Record<string, unknown>>(event)
  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const item = await updateMenuItem(client, restaurantId, itemId, {
    category_id: body?.category_id as string | undefined,
    name_en: body?.name_en as string | undefined,
    name_ar: body?.name_ar as string | undefined,
    description_en: body?.description_en as string | undefined,
    description_ar: body?.description_ar as string | undefined,
    price: body?.price as string | number | undefined,
    cost_price: body?.cost_price as string | number | undefined,
    photo_url: body?.photo_url as string | null | undefined,
    is_available: body?.is_available as boolean | undefined,
    is_vegetarian: body?.is_vegetarian as boolean | undefined,
    is_archived: body?.is_archived as boolean | undefined,
    allergens: body?.allergens as string[] | undefined,
    sort_order: body?.sort_order as number | undefined,
    modifiers: body?.modifiers as
      | import("~/types").ModifierGroupInput[]
      | undefined,
  })

  return { item }
})
