/**
 * Pure date-range helpers for owner statistics (Asia/Dubai calendar).
 * Kept free of Nuxt/server imports so Node tests can mirror the logic.
 */

export type StatsRange = "today" | "week" | "month" | "last_30_days"

export type StatsSeriesPoint = {
  key: string
  label: string
  revenue_fils: number
  cost_fils: number
  order_count: number
}

const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000

/** Instant → Dubai calendar Y-M-D parts. */
export function dubaiParts(instant: Date): {
  year: number
  month: number
  day: number
  hour: number
  weekday: number
} {
  const shifted = new Date(instant.getTime() + DUBAI_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    // 0 = Sunday … 6 = Saturday (UTC calendar of shifted instant)
    weekday: shifted.getUTCDay(),
  }
}

function dubaiMidnightUtcMs(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) - DUBAI_OFFSET_MS
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function dubaiDayKey(instant: Date): string {
  const p = dubaiParts(instant)
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

export function dubaiHourKey(instant: Date): string {
  const p = dubaiParts(instant)
  return `${dubaiDayKey(instant)}T${pad2(p.hour)}`
}

/** Inclusive start (UTC Date) and exclusive end for the selected range. */
export function resolveStatsWindow(
  range: StatsRange,
  now: Date = new Date(),
): { start: Date; end: Date; seriesKind: "hour" | "day" } {
  const end = now
  const p = dubaiParts(now)

  if (range === "today") {
    const start = new Date(dubaiMidnightUtcMs(p.year, p.month, p.day))
    return { start, end, seriesKind: "hour" }
  }

  if (range === "week") {
    // Monday-start week in Dubai
    const mondayOffset = (p.weekday + 6) % 7
    const startDay = p.day - mondayOffset
    const start = new Date(dubaiMidnightUtcMs(p.year, p.month, startDay))
    return { start, end, seriesKind: "day" }
  }

  if (range === "month") {
    const start = new Date(dubaiMidnightUtcMs(p.year, p.month, 1))
    return { start, end, seriesKind: "day" }
  }

  // last_30_days: rolling 30 calendar days including today
  const start = new Date(dubaiMidnightUtcMs(p.year, p.month, p.day - 29))
  return { start, end, seriesKind: "day" }
}

export function buildEmptySeries(
  range: StatsRange,
  now: Date = new Date(),
): StatsSeriesPoint[] {
  const { start, end, seriesKind } = resolveStatsWindow(range, now)
  const points: StatsSeriesPoint[] = []

  if (seriesKind === "hour") {
    const day = dubaiDayKey(start)
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}T${pad2(hour)}`
      points.push({
        key,
        label: `${pad2(hour)}:00`,
        revenue_fils: 0,
        cost_fils: 0,
        order_count: 0,
      })
    }
    return points
  }

  // day buckets from start date through today (Dubai)
  let cursor = new Date(start.getTime())
  const endKey = dubaiDayKey(end)
  for (let guard = 0; guard < 400; guard++) {
    const key = dubaiDayKey(cursor)
    const parts = dubaiParts(cursor)
    points.push({
      key,
      label: `${pad2(parts.month)}/${pad2(parts.day)}`,
      revenue_fils: 0,
      cost_fils: 0,
      order_count: 0,
    })
    if (key === endKey) {
      break
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }
  return points
}

export function seriesKeyForOrder(
  createdAt: Date,
  seriesKind: "hour" | "day",
): string {
  return seriesKind === "hour" ? dubaiHourKey(createdAt) : dubaiDayKey(createdAt)
}

/** Also expose long series helpers for the 12-week / 12-month charts. */
export function buildLastNMonthsSeries(now: Date = new Date(), count = 12): StatsSeriesPoint[] {
  const p = dubaiParts(now)
  const points: StatsSeriesPoint[] = []
  for (let i = count - 1; i >= 0; i--) {
    let year = p.year
    let month = p.month - i
    while (month <= 0) {
      month += 12
      year -= 1
    }
    const key = `${year}-${pad2(month)}`
    points.push({
      key,
      label: key,
      revenue_fils: 0,
      cost_fils: 0,
      order_count: 0,
    })
  }
  return points
}

export function buildLastNWeeksSeries(now: Date = new Date(), count = 12): StatsSeriesPoint[] {
  const p = dubaiParts(now)
  const mondayOffset = (p.weekday + 6) % 7
  const thisMonday = new Date(
    dubaiMidnightUtcMs(p.year, p.month, p.day - mondayOffset),
  )
  const points: StatsSeriesPoint[] = []
  for (let i = count - 1; i >= 0; i--) {
    const monday = new Date(thisMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const key = dubaiDayKey(monday)
    points.push({
      key,
      label: key,
      revenue_fils: 0,
      cost_fils: 0,
      order_count: 0,
    })
  }
  return points
}

export function weekStartKey(instant: Date): string {
  const p = dubaiParts(instant)
  const mondayOffset = (p.weekday + 6) % 7
  const monday = new Date(
    dubaiMidnightUtcMs(p.year, p.month, p.day - mondayOffset),
  )
  return dubaiDayKey(monday)
}

export function monthKey(instant: Date): string {
  const p = dubaiParts(instant)
  return `${p.year}-${pad2(p.month)}`
}
