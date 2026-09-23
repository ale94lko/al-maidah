/**
 * Public order summary for the guest status page.
 * Requires restaurant slug + guest_access_token so unknown/foreign ids do not leak.
 * Omits cost and gateway fields; uses service role because guests have no order SELECT policy.
 */
export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, "id")
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "Missing order id" })
  }

  const query = getQuery(event)
  const slug = typeof query.slug === "string" ? query.slug : ""
  const accessToken =
    typeof query.token === "string"
      ? query.token
      : typeof getHeader(event, "x-guest-order-token") === "string"
        ? String(getHeader(event, "x-guest-order-token"))
        : ""

  if (!slug || !accessToken) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" })
  }

  const client = createServiceRoleClient()
  const result = await getPublicOrderById(client, orderId, {
    slug,
    accessToken,
  })
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" })
  }

  return result
})
