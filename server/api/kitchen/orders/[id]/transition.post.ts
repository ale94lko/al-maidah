import type { KitchenTicketAction } from "~/types"

/**
 * Move a kitchen ticket: start preparation, mark ready (sets ready_at), or deliver.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const orderId = getRouterParam(event, "id")?.trim()
  const body = await readBody<{
    restaurantId?: string
    action?: KitchenTicketAction
  }>(event)

  const restaurantId = body?.restaurantId?.trim() ?? ""
  const action = body?.action

  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "Missing order id" })
  }
  if (!restaurantId) {
    throw createError({
      statusCode: 400,
      statusMessage: "restaurantId is required",
    })
  }
  if (action !== "start" && action !== "ready" && action !== "deliver") {
    throw createError({
      statusCode: 400,
      statusMessage: "action must be start, ready, or deliver",
    })
  }

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const ticket = await transitionKitchenOrder(client, {
    orderId,
    restaurantId,
    action,
  })

  return { ticket }
})
