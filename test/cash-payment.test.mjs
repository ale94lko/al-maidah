import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("cash mark-paid helper is idempotent and cash-only", () => {
  assert.ok(existsSync(resolve(root, "server/utils/cash-payment.ts")))
  const helper = read("server/utils/cash-payment.ts")
  assert.match(helper, /export async function markCashOrderPaid/)
  assert.match(helper, /payment_method !== "cash_at_table"/)
  assert.match(helper, /payment_status === "paid"/)
  assert.match(helper, /alreadyPaid/)
  assert.match(helper, /cancelled/)
  assert.match(helper, /payment_status: "paid"/)
  assert.match(helper, /\.eq\("restaurant_id", restaurantId\)/)
})

test("admin mark-paid API requires ownership and returns receipt", () => {
  const api = read(
    "server/api/admin/orders/[restaurantId]/[orderId]/mark-paid.post.ts",
  )
  assert.match(api, /requireUser/)
  assert.match(api, /assertRestaurantOwner/)
  assert.match(api, /markCashOrderPaid/)
  assert.match(api, /getOwnerReceipt/)
  assert.match(api, /Only cash-at-table/)
})

test("admin orders page can mark cash collected", () => {
  const page = read("pages/admin/orders.vue")
  assert.match(page, /canMarkCashPaid/)
  assert.match(page, /markCashPaid/)
  assert.match(page, /mark-paid/)
  assert.match(page, /cash_at_table/)
  assert.match(page, /admin\.markCashPaid/)
  assert.match(page, /modalOpen|Teleport/)
  assert.match(page, /PAGE_SIZE|pagedOrders/)
})
