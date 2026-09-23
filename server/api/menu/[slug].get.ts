/**
 * Public guest menu for a restaurant slug.
 * Uses the anon key so reads respect RLS; response never includes cost_price.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant slug" })
  }

  const query = getQuery(event)
  const tableNumberRaw = query.table
  const tableNumber =
    typeof tableNumberRaw === "string" || typeof tableNumberRaw === "number"
      ? Number(tableNumberRaw)
      : NaN

  const client = createAnonServerClient()
  const menu = await getPublicMenuBySlug(client, slug)

  if (!menu) {
    throw createError({ statusCode: 404, statusMessage: "Restaurant not found" })
  }

  const foreign = menu.dishes.find(
    (dish: { restaurant_id: string }) =>
      dish.restaurant_id !== menu.restaurant.id,
  )
  if (foreign) {
    throw createError({
      statusCode: 500,
      statusMessage: "Menu query returned a dish from another restaurant",
    })
  }

  let table = null
  if (Number.isInteger(tableNumber) && tableNumber > 0) {
    table = await getTableByNumber(client, menu.restaurant.id, tableNumber)
  }

  return {
    ...menu,
    table,
  }
})
