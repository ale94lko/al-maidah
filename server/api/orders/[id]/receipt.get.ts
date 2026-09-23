import { getGuestReceipt } from "~/server/utils/receipt"

/**
 * Guest digital receipt for a single order (slug + guest_access_token).
 */
export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, "id")
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "Missing order id" })
  }

  const query = getQuery(event)
  const slug = typeof query.slug === "string" ? query.slug : ""
  const token =
    (typeof query.token === "string" && query.token) ||
    getHeader(event, "x-guest-order-token") ||
    ""

  const client = createServiceRoleClient()
  const receipt = await getGuestReceipt(client, orderId, {
    slug,
    accessToken: token,
  })

  if (!receipt) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" })
  }

  return { receipt }
})
