import { markCashOrderPaid } from "~/server/utils/cash-payment"
import { getOwnerReceipt } from "~/server/utils/receipt"

/**
 * Owner marks a cash-at-table order as paid after collecting AED.
 * Scoped to the session restaurant; online orders stay on the Stripe path.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  const orderId = getRouterParam(event, "orderId")
  if (!restaurantId || !orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing restaurant or order id",
    })
  }

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const result = await markCashOrderPaid(client, restaurantId, orderId)
  if (!result.ok) {
    if (result.reason === "missing_order") {
      throw createError({ statusCode: 404, statusMessage: "Order not found" })
    }
    if (result.reason === "not_cash") {
      throw createError({
        statusCode: 400,
        statusMessage: "Only cash-at-table orders can be marked paid here",
      })
    }
    throw createError({
      statusCode: 400,
      statusMessage: "Cancelled orders cannot be marked paid",
    })
  }

  const receipt = await getOwnerReceipt(client, restaurantId, orderId)
  if (!receipt) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" })
  }

  return {
    alreadyPaid: result.alreadyPaid,
    receipt,
  }
})
