/**
 * Current profile + owned restaurants (Bearer access token required).
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const client = createServiceRoleClient()
  const superadmin = isSuperAdmin(user)

  if (superadmin) {
    return {
      user: { id: user.id, email: user.email },
      is_superadmin: true,
      restaurants: [],
    }
  }

  const restaurants = await restaurantsForUser(client, user.id)

  return {
    user: { id: user.id, email: user.email },
    is_superadmin: false,
    restaurants,
  }
})
