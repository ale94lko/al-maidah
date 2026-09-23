export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  if (!restaurantId) {
    throw createError({ statusCode: 400, statusMessage: "Missing restaurant id" })
  }

  const body = await readBody<{ trn?: string | null }>(event)
  const trnRaw = typeof body?.trn === "string" ? body.trn.trim() : ""
  const trn = trnRaw || null

  if (trn && !/^[A-Za-z0-9]{5,30}$/.test(trn)) {
    throw createError({
      statusCode: 400,
      statusMessage: "TRN must be 5–30 letters or digits",
    })
  }

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const { data: restaurant, error } = await client
    .from("restaurants")
    .update({ trn, updated_at: new Date().toISOString() })
    .eq("id", restaurantId)
    .select("id, name, slug, trn, currency, created_at, updated_at")
    .maybeSingle()

  if (error || !restaurant) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || "Failed to update restaurant",
    })
  }

  return {
    restaurant: {
      ...restaurant,
      trn: restaurant.trn?.trim() || null,
    },
  }
})
