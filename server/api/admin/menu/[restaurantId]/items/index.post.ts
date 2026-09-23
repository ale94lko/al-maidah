export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  if (!restaurantId) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant id" })
  }

  const body = await readBody<Record<string, unknown>>(event)
  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const item = await createMenuItem(client, restaurantId, {
    category_id: String(body?.category_id ?? ""),
    name_en: String(body?.name_en ?? ""),
    name_ar: String(body?.name_ar ?? ""),
    description_en: String(body?.description_en ?? ""),
    description_ar: String(body?.description_ar ?? ""),
    price: body?.price as string | number,
    cost_price: body?.cost_price as string | number,
    photo_url: (body?.photo_url as string | null | undefined) ?? null,
    is_available: body?.is_available as boolean | undefined,
    is_vegetarian: body?.is_vegetarian as boolean | undefined,
    allergens: body?.allergens as string[] | undefined,
    sort_order: body?.sort_order as number | undefined,
    modifiers: body?.modifiers as
      | import("~/types").ModifierGroupInput[]
      | undefined,
  })

  return { item }
})
