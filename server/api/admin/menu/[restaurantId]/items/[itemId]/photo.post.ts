/**
 * Upload a dish photo into menu-photos/{restaurantId}/… (never an unscoped path).
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const restaurantId = getRouterParam(event, "restaurantId")
  const itemId = getRouterParam(event, "itemId")
  if (!restaurantId || !itemId) {
    throw createError({ statusCode: 400, statusMessage: "Missing ids" })
  }

  const form = await readMultipartFormData(event)
  const filePart = form?.find((part) => part.name === "file" && part.data)
  if (!filePart?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: "file is required" })
  }

  const client = createServiceRoleClient()
  await assertRestaurantOwner(client, user.id, restaurantId)

  const item = await uploadMenuPhoto(client, restaurantId, itemId, {
    data: Buffer.from(filePart.data),
    type: filePart.type || "image/jpeg",
    filename: filePart.filename || "photo.jpg",
  })

  return { item }
})
