import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  OwnerStatsBestSeller,
  OwnerStatsPeakHour,
  OwnerStatsResponse,
  OwnerStatsSeriesPoint,
  RestaurantStatistics,
  StatsRange,
} from "~/types"
import { filsToMoney, moneyToFils } from "~/utils/cart"
import {
  buildEmptySeries,
  buildLastNMonthsSeries,
  buildLastNWeeksSeries,
  dubaiParts,
  monthKey,
  resolveStatsWindow,
  seriesKeyForOrder,
  weekStartKey,
} from "~/utils/stats-range"

type OrderStatRow = {
  id: string
  payment_status: string
  status: string
  total: string | number
  total_cost: string | number
  created_at: string
  ready_at: string | null
}

type ItemStatRow = {
  order_id: string
  menu_item_id: string | null
  name_en: string
  name_ar: string
  quantity: number
}

const RANGES: StatsRange[] = ["today", "week", "month", "last_30_days"]

export function parseStatsRange(raw: unknown): StatsRange {
  if (typeof raw === "string" && (RANGES as string[]).includes(raw)) {
    return raw as StatsRange
  }
  return "today"
}

export function isEligibleStatOrder(row: {
  payment_status: string
  status: string
}): boolean {
  return row.payment_status === "paid" && row.status !== "cancelled"
}

function toPublicSeries(
  points: Array<{
    key: string
    label: string
    revenue_fils: number
    cost_fils: number
    order_count: number
  }>,
): OwnerStatsSeriesPoint[] {
  return points.map((point) => ({
    key: point.key,
    label: point.label,
    revenue: filsToMoney(point.revenue_fils),
    cost: filsToMoney(point.cost_fils),
    profit: filsToMoney(point.revenue_fils - point.cost_fils),
    order_count: point.order_count,
  }))
}

function marginBps(revenueFils: number, profitFils: number): number | null {
  if (revenueFils <= 0) {
    return null
  }
  return Math.round((profitFils * 10_000) / revenueFils)
}

/**
 * Owner dashboard stats for one restaurant and range.
 * Only paid, non-cancelled orders in the window are counted.
 */
export async function getOwnerRestaurantStats(
  client: SupabaseClient,
  restaurantId: string,
  range: StatsRange,
  now: Date = new Date(),
): Promise<OwnerStatsResponse> {
  const { start, end, seriesKind } = resolveStatsWindow(range, now)

  const { data, error } = await client
    .from("orders")
    .select("id, payment_status, status, total, total_cost, created_at, ready_at")
    .eq("restaurant_id", restaurantId)
    .eq("payment_status", "paid")
    .neq("status", "cancelled")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load statistics: ${error.message}`,
    })
  }

  const rows = ((data ?? []) as OrderStatRow[]).filter(isEligibleStatOrder)

  let revenueFils = 0
  let costFils = 0
  const readyDurations: number[] = []
  const series = buildEmptySeries(range, now)
  const seriesIndex = new Map(series.map((point, index) => [point.key, index]))
  const peak = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    order_count: 0,
  }))

  for (const row of rows) {
    const created = new Date(row.created_at)
    const totalFils = moneyToFils(row.total)
    const rowCostFils = moneyToFils(row.total_cost)
    revenueFils += totalFils
    costFils += rowCostFils

    const key = seriesKeyForOrder(created, seriesKind)
    const idx = seriesIndex.get(key)
    const bucket = idx != null ? series[idx] : undefined
    if (bucket) {
      bucket.revenue_fils += totalFils
      bucket.cost_fils += rowCostFils
      bucket.order_count += 1
    }

    const hour = dubaiParts(created).hour
    const peakBucket = peak[hour]
    if (peakBucket) {
      peakBucket.order_count += 1
    }

    if (row.ready_at) {
      const seconds =
        (Date.parse(row.ready_at) - Date.parse(row.created_at)) / 1000
      if (Number.isFinite(seconds) && seconds >= 0) {
        readyDurations.push(seconds)
      }
    }
  }

  const profitFils = revenueFils - costFils
  const paidCount = rows.length
  const orderIds = rows.map((row) => row.id)
  const bestSellers = await loadBestSellers(client, restaurantId, orderIds)

  const weeks = buildLastNWeeksSeries(now, 12)
  const months = buildLastNMonthsSeries(now, 12)
  const weekIndex = new Map(weeks.map((point, index) => [point.key, index]))
  const monthIndex = new Map(months.map((point, index) => [point.key, index]))

  // Stretch window for trailing charts: 12 weeks / 12 months
  const trailingStart = weeks[0]
    ? new Date(
        Date.parse(weeks[0].key + "T00:00:00+04:00"),
      )
    : start

  const { data: trailingRows, error: trailingError } = await client
    .from("orders")
    .select("payment_status, status, total, total_cost, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("payment_status", "paid")
    .neq("status", "cancelled")
    .gte("created_at", trailingStart.toISOString())
    .lt("created_at", end.toISOString())

  if (trailingError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load trailing statistics: ${trailingError.message}`,
    })
  }

  for (const row of (trailingRows ?? []) as OrderStatRow[]) {
    if (!isEligibleStatOrder(row)) {
      continue
    }
    const created = new Date(row.created_at)
    const totalFils = moneyToFils(row.total)
    const rowCostFils = moneyToFils(row.total_cost)
    const wKey = weekStartKey(created)
    const wIdx = weekIndex.get(wKey)
    const weekBucket = wIdx != null ? weeks[wIdx] : undefined
    if (weekBucket) {
      weekBucket.revenue_fils += totalFils
      weekBucket.cost_fils += rowCostFils
      weekBucket.order_count += 1
    }
    const mKey = monthKey(created)
    const mIdx = monthIndex.get(mKey)
    const monthBucket = mIdx != null ? months[mIdx] : undefined
    if (monthBucket) {
      monthBucket.revenue_fils += totalFils
      monthBucket.cost_fils += rowCostFils
      monthBucket.order_count += 1
    }
  }

  const averageReadySeconds =
    readyDurations.length === 0
      ? null
      : Math.round(
          readyDurations.reduce((sum, value) => sum + value, 0) /
            readyDurations.length,
        )

  return {
    restaurant_id: restaurantId,
    range,
    window: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    order_count: paidCount,
    revenue: filsToMoney(revenueFils),
    total_cost: filsToMoney(costFils),
    gross_profit: filsToMoney(profitFils),
    margin_bps: marginBps(revenueFils, profitFils),
    average_ticket:
      paidCount === 0 ? "0.00" : filsToMoney(Math.round(revenueFils / paidCount)),
    average_ready_seconds: averageReadySeconds,
    series: toPublicSeries(series),
    series_by_week: toPublicSeries(weeks),
    series_by_month: toPublicSeries(months),
    best_sellers: bestSellers,
    peak_hours: peak as OwnerStatsPeakHour[],
  }
}

async function loadBestSellers(
  client: SupabaseClient,
  restaurantId: string,
  orderIds: string[],
): Promise<OwnerStatsBestSeller[]> {
  if (orderIds.length === 0) {
    return []
  }

  const { data, error } = await client
    .from("order_items")
    .select("order_id, menu_item_id, name_en, name_ar, quantity")
    .eq("restaurant_id", restaurantId)
    .in("order_id", orderIds)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load best sellers: ${error.message}`,
    })
  }

  const totals = new Map<
    string,
    { menu_item_id: string | null; name_en: string; name_ar: string; quantity: number }
  >()

  for (const row of (data ?? []) as ItemStatRow[]) {
    const key = row.menu_item_id || `${row.name_en}|${row.name_ar}`
    const current = totals.get(key) ?? {
      menu_item_id: row.menu_item_id,
      name_en: row.name_en,
      name_ar: row.name_ar,
      quantity: 0,
    }
    current.quantity += Number(row.quantity) || 0
    totals.set(key, current)
  }

  return [...totals.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8)
    .map((row) => ({
      menu_item_id: row.menu_item_id,
      name_en: row.name_en,
      name_ar: row.name_ar,
      quantity_sold: row.quantity,
    }))
}

/** Legacy all-time summary used by older callers / type checks. */
export async function computeAllTimeRestaurantStatistics(
  client: SupabaseClient,
  restaurantId: string,
): Promise<RestaurantStatistics> {
  const { data, error } = await client
    .from("orders")
    .select("payment_status, status, total, total_cost, created_at, ready_at")
    .eq("restaurant_id", restaurantId)
    .eq("payment_status", "paid")
    .neq("status", "cancelled")

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load statistics: ${error.message}`,
    })
  }

  const paid = ((data ?? []) as OrderStatRow[]).filter(isEligibleStatOrder)
  let revenueFils = 0
  let costFils = 0
  const readyDurations: number[] = []

  for (const row of paid) {
    revenueFils += moneyToFils(row.total)
    costFils += moneyToFils(row.total_cost)
    if (row.ready_at) {
      const seconds =
        (Date.parse(row.ready_at) - Date.parse(row.created_at)) / 1000
      if (Number.isFinite(seconds) && seconds >= 0) {
        readyDurations.push(seconds)
      }
    }
  }

  const averageReadySeconds =
    readyDurations.length === 0
      ? null
      : Math.round(
          readyDurations.reduce((sum, value) => sum + value, 0) /
            readyDurations.length,
        )

  return {
    restaurant_id: restaurantId,
    order_count: paid.length,
    paid_order_count: paid.length,
    revenue: filsToMoney(revenueFils),
    total_cost: filsToMoney(costFils),
    gross_profit: filsToMoney(revenueFils - costFils),
    average_ticket:
      paid.length === 0
        ? "0.00"
        : filsToMoney(Math.round(revenueFils / paid.length)),
    average_ready_seconds: averageReadySeconds,
  }
}
