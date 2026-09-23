import { listOwnerOrders } from "~/server/utils/receipt"

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  if (!restaurantId) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant id" })
  }

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const { data: restaurant, error } = await client
    .from("restaurants")
    .select("id, name, slug, trn")
    .eq("id", restaurantId)
    .maybeSingle()

  if (error || !restaurant) {
    throw createError({ statusCode: 404, statusMessage: "Restaurant not found" })
  }

  const orders = await listOwnerOrders(client, restaurantId)

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      trn: restaurant.trn?.trim() || null,
    },
    orders,
  }
})
