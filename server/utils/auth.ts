import type { H3Event } from "h3"
import type { SupabaseClient, User } from "@supabase/supabase-js"

export async function requireUser(event: H3Event): Promise<User> {
  const authHeader = getHeader(event, "authorization")
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim()

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Authentication required" })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client.auth.getUser(token)

  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid or expired session" })
  }

  return data.user
}

export async function assertRestaurantOwner(
  client: SupabaseClient,
  userId: string,
  restaurantId: string,
): Promise<void> {
  const { data, error } = await client
    .from("restaurant_owners")
    .select("id")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to verify ownership: ${error.message}`,
    })
  }

  if (!data) {
    throw createError({
      statusCode: 403,
      statusMessage: "You do not own this restaurant",
    })
  }
}

export function slugifyRestaurantName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}
