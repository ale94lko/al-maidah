import { parseSessionToken } from "~/utils/session-token"

/**
 * Public guest menu for a restaurant slug.
 * Requires an open visit ?session= token from the staff-issued QR.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug")
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant slug" })
  }

  const query = getQuery(event)
  const sessionToken = parseSessionToken(
    typeof query.session === "string" ? query.session : null,
  )

  if (!sessionToken) {
    throw createError({
      statusCode: 400,
      statusMessage: "Table session is required. Ask staff for the QR code.",
    })
  }

  const anon = createAnonServerClient()
  const menu = await getPublicMenuBySlug(anon, slug)

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

  const service = createServiceRoleClient()
  const seated = await getOpenSessionByToken(
    service,
    menu.restaurant.id,
    sessionToken,
  )
  if (!seated) {
    throw createError({
      statusCode: 404,
      statusMessage:
        "This table visit is closed or invalid. Ask staff to open the table again.",
    })
  }

  return {
    ...menu,
    table: seated.table,
    session: {
      id: seated.session.id,
      token: seated.session.token,
      status: seated.session.status,
    },
  }
})
