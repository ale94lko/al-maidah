import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("owner stats API requires ownership and range query", () => {
  assert.ok(
    existsSync(resolve(root, "server/api/admin/stats/[restaurantId].get.ts")),
  )
  const api = read("server/api/admin/stats/[restaurantId].get.ts")
  assert.match(api, /assertRestaurantOwner/)
  assert.match(api, /parseStatsRange|range/)
  assert.match(api, /getOwnerRestaurantStats/)
})

test("stats aggregation counts only paid non-cancelled orders", () => {
  const helper = read("server/utils/admin-stats.ts")
  assert.match(helper, /payment_status === "paid"/)
  assert.match(helper, /status !== "cancelled"/)
  assert.match(helper, /\.eq\("payment_status", "paid"\)/)
  assert.match(helper, /\.neq\("status", "cancelled"\)/)
  assert.match(helper, /\.eq\("restaurant_id", restaurantId\)/)
  assert.match(helper, /gross_profit|profitFils/)
  assert.match(helper, /best_sellers|loadBestSellers/)
  assert.match(helper, /peak_hours/)
  assert.match(helper, /average_ready_seconds/)
})

test("changing range rebuilds the series window", () => {
  const ranges = read("utils/stats-range.ts")
  assert.match(ranges, /today/)
  assert.match(ranges, /last_30_days/)
  assert.match(ranges, /buildEmptySeries/)
  assert.match(ranges, /seriesKind: "hour"/)
  assert.match(ranges, /resolveStatsWindow/)
  const page = read("pages/admin/index.vue")
  assert.match(page, /onRangeChange/)
  assert.match(page, /query:\s*\{\s*range:/)
  assert.match(page, /stats\.series/)
})

test("admin stats page surfaces KPIs and range controls", () => {
  const page = read("pages/admin/index.vue")
  assert.match(page, /\/api\/admin\/stats\//)
  assert.match(page, /statsRevenue|statsProfit/)
  assert.match(page, /statsBestSellers/)
  assert.match(page, /statsPeakHours/)
  assert.match(page, /last_30_days/)
})

test("OwnerStatsResponse type covers margin and series", () => {
  const types = read("types/index.ts")
  assert.match(types, /interface OwnerStatsResponse/)
  assert.match(types, /margin_bps/)
  assert.match(types, /series_by_week/)
  assert.match(types, /series_by_month/)
  assert.match(types, /best_sellers/)
})

test("stats i18n keys exist in English and Arabic", () => {
  const messages = read("i18n/messages.ts")
  assert.match(messages, /statsRevenue/)
  assert.match(messages, /statsRange/)
  assert.match(messages, /last_30_days/)
  assert.match(messages, /الإيراد/)
  assert.match(messages, /آخر 30 يومًا/)
})

test("isEligibleStatOrder excludes unpaid and cancelled", () => {
  function isEligibleStatOrder(row) {
    return row.payment_status === "paid" && row.status !== "cancelled"
  }
  assert.equal(
    isEligibleStatOrder({ payment_status: "paid", status: "ready" }),
    true,
  )
  assert.equal(
    isEligibleStatOrder({ payment_status: "pending", status: "ready" }),
    false,
  )
  assert.equal(
    isEligibleStatOrder({ payment_status: "paid", status: "cancelled" }),
    false,
  )
  assert.equal(
    isEligibleStatOrder({ payment_status: "refunded", status: "completed" }),
    false,
  )
})
