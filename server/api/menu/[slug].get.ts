import { parseTableToken } from "~/utils/table-token"

/**
 * Public guest menu for a restaurant slug.
 * Requires a valid ?table= so ordering is always pinned to a dining table.
 * Uses the anon key so reads respect RLS; response never includes cost_price.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant slug" })
  }

  const query = getQuery(event)
  const tableToken = parseTableToken(
    typeof query.table === "string" ? query.table : null,
  )

  if (!tableToken) {
    throw createError({
      statusCode: 400,
      statusMessage: "Table is required. Scan the QR code again.",
    })
  }

  const client = createAnonServerClient()
  const menu = await getPublicMenuBySlug(client, slug)

  if (!menu) {
    throw createError({
      statusCode: 404,
      statusMessage: "Restaurant not found. Check the QR code or venue link.",
    })
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

  const table = await getTableByToken(client, menu.restaurant.id, tableToken)
  if (!table) {
    throw createError({
      statusCode: 404,
      statusMessage: "Table not found. Scan the QR code again.",
    })
  }

  return {
    ...menu,
    table,
  }
})
