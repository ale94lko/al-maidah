import type { SupabaseClient } from "@supabase/supabase-js"
import { isSuperAdmin } from "~/server/utils/auth"
import { listAuthUsers, restaurantsForUser } from "~/server/utils/owner-accounts"

export type PlatformSeriesPoint = {
  key: string
  label: string
  value: number
}

export type PlatformTopPath = {
  path: string
  count: number
}

export type PlatformRecentError = {
  message: string
  path: string
  count: number
  last_seen_at: string
}

export type PlatformStats = {
  owner_count: number
  restaurant_count: number
  owners_with_restaurant: number
  owners_without_restaurant: number
  active_users_7d: number
  active_users_30d: number
  page_views_30d: number
  unique_visitors_30d: number
  errors_30d: number
  errors_24h: number
  series_signups: PlatformSeriesPoint[]
  series_page_views: PlatformSeriesPoint[]
  series_errors: PlatformSeriesPoint[]
  top_paths: PlatformTopPath[]
  recent_errors: PlatformRecentError[]
}

type EventRow = {
  kind: string
  path: string
  message: string | null
  visitor_id: string | null
  created_at: string
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function buildDaySeries(
  days: number,
  now: Date,
  counts: Map<string, number>,
): PlatformSeriesPoint[] {
  const points: PlatformSeriesPoint[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now)
    day.setUTCHours(0, 0, 0, 0)
    day.setUTCDate(day.getUTCDate() - i)
    const key = dayKey(day)
    points.push({
      key,
      label: key.slice(5),
      value: counts.get(key) ?? 0,
    })
  }
  return points
}

/**
 * Account- and reliability-focused stats for the platform superadmin.
 */
export async function getPlatformStats(
  client: SupabaseClient,
  now: Date = new Date(),
): Promise<PlatformStats> {
  const users = await listAuthUsers(client)
  const owners = users.filter((user) => !isSuperAdmin(user))

  let owners_with_restaurant = 0
  for (const owner of owners) {
    const restaurants = await restaurantsForUser(client, owner.id)
    if (restaurants.length > 0) {
      owners_with_restaurant += 1
    }
  }

  const { count: restaurantCount, error: restaurantError } = await client
    .from("restaurants")
    .select("id", { count: "exact", head: true })

  if (restaurantError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to count restaurants: ${restaurantError.message}`,
    })
  }

  const window30 = new Date(now)
  window30.setUTCDate(window30.getUTCDate() - 30)
  const window7 = new Date(now)
  window7.setUTCDate(window7.getUTCDate() - 7)
  const window24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const active_users_7d = owners.filter((user) => {
    const last = user.last_sign_in_at
    return last != null && Date.parse(last) >= window7.getTime()
  }).length

  const active_users_30d = owners.filter((user) => {
    const last = user.last_sign_in_at
    return last != null && Date.parse(last) >= window30.getTime()
  }).length

  const signupCounts = new Map<string, number>()
  for (const owner of owners) {
    const created = owner.created_at ? Date.parse(owner.created_at) : NaN
    if (!Number.isFinite(created) || created < window30.getTime()) {
      continue
    }
    const key = dayKey(new Date(created))
    signupCounts.set(key, (signupCounts.get(key) ?? 0) + 1)
  }

  let events: EventRow[] = []
  const { data: eventRows, error: eventsError } = await client
    .from("platform_events")
    .select("kind, path, message, visitor_id, created_at")
    .gte("created_at", window30.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000)

  if (eventsError) {
    if (!/platform_events|schema cache/i.test(eventsError.message)) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to load platform events: ${eventsError.message}`,
      })
    }
  } else {
    events = (eventRows ?? []) as EventRow[]
  }

  const pageViews = events.filter((row) => row.kind === "page_view")
  const errors = events.filter((row) => row.kind === "error")

  const pageViewCounts = new Map<string, number>()
  const errorCounts = new Map<string, number>()
  const visitors = new Set<string>()
  const pathCounts = new Map<string, number>()
  const errorBuckets = new Map<
    string,
    { message: string; path: string; count: number; last_seen_at: string }
  >()

  for (const row of pageViews) {
    const key = dayKey(new Date(row.created_at))
    pageViewCounts.set(key, (pageViewCounts.get(key) ?? 0) + 1)
    if (row.visitor_id) {
      visitors.add(row.visitor_id)
    }
    const path = row.path || "/"
    pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1)
  }

  for (const row of errors) {
    const key = dayKey(new Date(row.created_at))
    errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1)
    const message = row.message || "Unknown error"
    const path = row.path || "/"
    const bucketKey = `${message}|${path}`
    const existing = errorBuckets.get(bucketKey)
    if (existing) {
      existing.count += 1
      if (Date.parse(row.created_at) > Date.parse(existing.last_seen_at)) {
        existing.last_seen_at = row.created_at
      }
    } else {
      errorBuckets.set(bucketKey, {
        message,
        path,
        count: 1,
        last_seen_at: row.created_at,
      })
    }
  }

  const errors_24h = errors.filter(
    (row) => Date.parse(row.created_at) >= window24h.getTime(),
  ).length

  const top_paths = [...pathCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([path, count]) => ({ path, count }))

  const recent_errors = [...errorBuckets.values()]
    .sort((a, b) => Date.parse(b.last_seen_at) - Date.parse(a.last_seen_at))
    .slice(0, 8)

  return {
    owner_count: owners.length,
    restaurant_count: restaurantCount ?? 0,
    owners_with_restaurant,
    owners_without_restaurant: Math.max(
      0,
      owners.length - owners_with_restaurant,
    ),
    active_users_7d,
    active_users_30d,
    page_views_30d: pageViews.length,
    unique_visitors_30d: visitors.size,
    errors_30d: errors.length,
    errors_24h,
    series_signups: buildDaySeries(30, now, signupCounts),
    series_page_views: buildDaySeries(30, now, pageViewCounts),
    series_errors: buildDaySeries(30, now, errorCounts),
    top_paths,
    recent_errors,
  }
}
