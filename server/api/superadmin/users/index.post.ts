type CreateBody = {
  email?: string
  password?: string
  restaurantName?: string
  slug?: string
  trn?: string
}

/**
 * Create a restaurant owner account (superadmin).
 */
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = await readBody<CreateBody>(event)
  const admin = createServiceRoleClient()

  const result = await createOwnerAccount(admin, {
    email: body.email ?? "",
    password: body.password ?? "",
    restaurantName: body.restaurantName ?? "",
    slug: body.slug,
    trn: body.trn,
  })

  return result
})
