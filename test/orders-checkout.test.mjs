import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

function moneyToFils(value) {
  return Math.round(Number(value) * 100)
}

function filsToMoney(fils) {
  return (fils / 100).toFixed(2)
}

function computeVatFils(subtotalFils) {
  return Math.round((subtotalFils * 5) / 100)
}

function computeCheckoutTotals(subtotalFils) {
  const vatFils = computeVatFils(subtotalFils)
  return {
    subtotal: filsToMoney(subtotalFils),
    vat: filsToMoney(vatFils),
    total: filsToMoney(subtotalFils + vatFils),
  }
}

test("UAE 5% VAT matches the 20.00 + 1.00 = 21.00 example", () => {
  const totals = computeCheckoutTotals(moneyToFils("20.00"))
  assert.equal(totals.subtotal, "20.00")
  assert.equal(totals.vat, "1.00")
  assert.equal(totals.total, "21.00")
})

test("seed coffee 12.00 VAT is 0.60 and total 12.60", () => {
  const totals = computeCheckoutTotals(moneyToFils("12.00"))
  assert.equal(totals.vat, "0.60")
  assert.equal(totals.total, "12.60")
})

test("checkout helpers live in cart utils", () => {
  const source = read("utils/cart.ts")
  assert.match(source, /UAE_VAT_RATE_BPS/)
  assert.match(source, /computeVatFils/)
  assert.match(source, /computeCheckoutTotals/)
})

test("orders API uses service role and ignores client prices", () => {
  assert.ok(existsSync(resolve(root, "server/api/orders/index.post.ts")))
  assert.ok(existsSync(resolve(root, "server/utils/orders.ts")))
  const api = read("server/api/orders/index.post.ts")
  const helper = read("server/utils/orders.ts")
  assert.match(api, /createServiceRoleClient/)
  assert.match(api, /createGuestOrder/)
  assert.match(api, /Ignored|unit_price/)
  assert.match(helper, /payment_status:\s*"pending"/)
  assert.match(helper, /computeCheckoutTotals/)
  assert.match(helper, /cost_price/)
  assert.match(helper, /is_available/)
  assert.match(helper, /Dish does not belong to this restaurant/)
  assert.match(helper, /Sold out/)
  assert.match(helper, /A valid open table session is required|valid open table session/)
  assert.doesNotMatch(helper, /body\.total|input\.total|clientTotal/)
})

test("public order GET omits cost fields", () => {
  assert.ok(existsSync(resolve(root, "server/api/orders/[id].get.ts")))
  const getApi = read("server/api/orders/[id].get.ts")
  const helper = read("server/utils/orders.ts")
  assert.match(getApi, /getPublicOrderById/)
  assert.match(getApi, /slug/)
  assert.match(getApi, /token/)
  assert.match(helper, /PublicOrder/)
  assert.doesNotMatch(
    helper.match(/\.select\(\s*"id, menu_item_id[\s\S]*?"/)?.[0] || "",
    /unit_cost/,
  )
})

test("cart page shows VAT breakdown and confirms order", () => {
  const page = read("pages/m/[slug]/cart.vue")
  assert.match(page, /guestName/)
  assert.match(page, /previewTotals|computeCheckoutTotals/)
  assert.match(page, /placeOrder/)
  assert.match(page, /\/api\/orders/)
  assert.match(page, /unit_price:\s*"0\.01"/)
  assert.match(page, /tableLabelCheckout/)
  assert.match(page, /guest\.vat/)
  assert.match(page, /guest\.total/)
})

test("guest status page exists for placed orders", () => {
  assert.ok(existsSync(resolve(root, "pages/m/[slug]/status/[orderId].vue")))
  assert.match(read("pages/m/[slug]/status/[orderId].vue"), /orderPlaced/)
})

test("guest_name migration exists for checkout", () => {
  assert.ok(
    existsSync(
      resolve(root, "supabase/migrations/20260923160000_order_guest_name.sql"),
    ),
  )
  assert.match(
    read("supabase/migrations/20260923160000_order_guest_name.sql"),
    /guest_name/,
  )
})

test("Order type includes guest_name and PublicOrder", () => {
  const types = read("types/index.ts")
  assert.match(types, /guest_name/)
  assert.match(types, /interface PublicOrder/)
  assert.match(types, /interface PublicOrderItem/)
})
