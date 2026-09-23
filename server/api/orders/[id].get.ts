/**
 * Public order summary for the guest status page.
 * Omits cost fields; uses service role because guests have no order SELECT policy.
 */
export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, "id")
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "Missing order id" })
  }

  const client = createServiceRoleClient()
  const result = await getPublicOrderById(client, orderId)
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" })
  }

  return result
})
