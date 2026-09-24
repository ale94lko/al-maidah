import type { SupabaseClient } from "@supabase/supabase-js"
import { isSuperAdmin } from "~/server/utils/auth"
import { listAuthUsers } from "~/server/utils/owner-accounts"
import { filsToMoney, moneyToFils } from "~/utils/cart"

export type PlatformStats = {
  owner_count: number
  restaurant_count: number
  order_count: number
  paid_order_count: number
  revenue: string
  active_restaurants_30d: number
  orders_last_30_days: number
  revenue_last_30_days: string
}

/**
 * Cross-tenant usage stats for the platform superadmin dashboard.
 */
export async function getPlatformStats(
  client: SupabaseClient,
  now: Date = new Date(),
): Promise<PlatformStats> {
  const users = await listAuthUsers(client)
  const owner_count = users.filter((user) => !isSuperAdmin(user)).length

  const { count: restaurantCount, error: restaurantError } = await client
    .from("restaurants")
    .select("id", { count: "exact", head: true })

  if (restaurantError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to count restaurants: ${restaurantError.message}`,
    })
  }

  const { data: orders, error: ordersError } = await client
    .from("orders")
    .select("id, restaurant_id, payment_status, status, total, created_at")

  if (ordersError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load orders: ${ordersError.message}`,
    })
  }

  const rows = orders ?? []
  const paid = rows.filter(
    (row) => row.payment_status === "paid" && row.status !== "cancelled",
  )

  let revenueFils = 0
  for (const row of paid) {
    revenueFils += moneyToFils(row.total)
  }

  const windowStart = new Date(now)
  windowStart.setUTCDate(windowStart.getUTCDate() - 30)

  const paidRecent = paid.filter(
    (row) => Date.parse(row.created_at) >= windowStart.getTime(),
  )
  let recentRevenueFils = 0
  const activeRestaurantIds = new Set<string>()
  for (const row of paidRecent) {
    recentRevenueFils += moneyToFils(row.total)
    if (row.restaurant_id) {
      activeRestaurantIds.add(row.restaurant_id)
    }
  }

  return {
    owner_count,
    restaurant_count: restaurantCount ?? 0,
    order_count: rows.length,
    paid_order_count: paid.length,
    revenue: filsToMoney(revenueFils),
    active_restaurants_30d: activeRestaurantIds.size,
    orders_last_30_days: paidRecent.length,
    revenue_last_30_days: filsToMoney(recentRevenueFils),
  }
}
