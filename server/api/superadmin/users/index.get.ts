/**
 * List owner accounts with their restaurants (superadmin).
 */
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const admin = createServiceRoleClient()
  const users = await listAuthUsers(admin)

  const accounts = []
  for (const user of users) {
    if (isSuperAdmin(user)) {
      continue
    }
    const restaurants = await restaurantsForUser(admin, user.id)
    accounts.push({
      id: user.id,
      email: user.email ?? "",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      restaurants,
    })
  }

  accounts.sort((a, b) =>
    (a.email || "").localeCompare(b.email || "", undefined, {
      sensitivity: "base",
    }),
  )

  return { users: accounts }
})
