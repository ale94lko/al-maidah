import { getOwnerReceipt } from "~/server/utils/receipt"

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

  const receipt = await getOwnerReceipt(client, restaurantId, orderId)
  if (!receipt) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" })
  }

  return { receipt }
})
