import {
  getOwnerRestaurantStats,
  parseStatsRange,
} from "~/server/utils/admin-stats"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  if (!restaurantId) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant id" })
  }

  const query = getQuery(event)
  const range = parseStatsRange(query.range)

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const stats = await getOwnerRestaurantStats(client, restaurantId, range)
  return { stats }
})
