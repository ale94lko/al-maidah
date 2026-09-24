import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("receipt helper exposes TRN and gateway without cost fields", () => {
  assert.ok(existsSync(resolve(root, "server/utils/receipt.ts")))
  const helper = read("server/utils/receipt.ts")
  assert.match(helper, /getGuestReceipt/)
  assert.match(helper, /getOwnerReceipt/)
  assert.match(helper, /gateway_reference/)
  assert.match(helper, /\btrn\b/)
  assert.match(helper, /ORDER_RECEIPT_SELECT/)
  assert.doesNotMatch(helper, /ORDER_RECEIPT_SELECT[\s\S]*total_cost/)
  assert.doesNotMatch(
    helper,
    /ITEM_RECEIPT_SELECT[\s\S]*unit_cost/,
  )
  assert.doesNotMatch(helper, /cost_price/)
})

test("guest receipt API requires slug and token", () => {
  const api = read("server/api/orders/[id]/receipt.get.ts")
  assert.match(api, /getGuestReceipt/)
  assert.match(api, /slug/)
  assert.match(api, /token|accessToken/)
  assert.match(api, /Order not found/)
})

test("admin receipt and TRN settings APIs require ownership", () => {
  assert.match(
    read("server/api/admin/orders/[restaurantId]/[orderId].get.ts"),
    /assertRestaurantOwner/,
  )
  assert.match(
    read("server/api/admin/orders/[restaurantId]/[orderId].get.ts"),
    /getOwnerReceipt/,
  )
  assert.match(
    read("server/api/admin/restaurants/[restaurantId].patch.ts"),
    /assertRestaurantOwner/,
  )
  assert.match(
    read("server/api/admin/restaurants/[restaurantId].patch.ts"),
    /\btrn\b/,
  )
  assert.doesNotMatch(
    read("server/api/admin/orders/[restaurantId]/[orderId].get.ts"),
    /total_cost/,
  )
})

test("PublicReceipt includes TRN and gateway_reference but not costs", () => {
  const types = read("types/index.ts")
  assert.match(types, /export interface PublicReceipt \{/)
  const start = types.indexOf("export interface PublicReceipt")
  assert.ok(start >= 0)
  const close = types.indexOf("\n}", start)
  assert.ok(close > start)
  const block = types.slice(start, close + 2)
  assert.match(block, /\btrn:/)
  assert.match(block, /gateway_reference:/)
  assert.match(block, /\bvat:/)
  assert.doesNotMatch(block, /total_cost/)
  assert.doesNotMatch(block, /unit_cost/)
})

test("status page mounts digital receipt for paid or cash orders", () => {
  const page = read("pages/m/[slug]/status/[orderId].vue")
  assert.match(page, /OrderReceipt/)
  assert.match(page, /\/receipt/)
  assert.match(page, /showReceipt/)
  assert.match(page, /payment_status === "paid"/)
})

test("admin settings and orders surfaces expose TRN prompt", () => {
  assert.ok(existsSync(resolve(root, "pages/admin/settings.vue")))
  assert.ok(existsSync(resolve(root, "pages/admin/orders.vue")))
  assert.ok(existsSync(resolve(root, "components/OrderReceipt.vue")))
  assert.match(read("pages/admin/settings.vue"), /trnMissingTitle|trnField/)
  assert.match(read("pages/admin/settings.vue"), /changePassword|\/api\/auth\/password/)
  assert.ok(existsSync(resolve(root, "server/api/auth/password.post.ts")))
  assert.match(read("server/api/auth/password.post.ts"), /requireUser/)
  assert.match(read("server/api/auth/password.post.ts"), /currentPassword/)
  assert.match(read("pages/admin/orders.vue"), /trnMissingTitle|OrderReceipt/)
  assert.match(read("components/OrderReceipt.vue"), /trnNotOnFile/)
  assert.match(read("layouts/admin.vue"), /\/admin\/settings/)
  assert.match(read("layouts/admin.vue"), /\/admin\/orders/)
})

test("receipt i18n keys exist in English and Arabic", () => {
  const messages = read("i18n/messages.ts")
  assert.match(messages, /receiptTitle/)
  assert.match(messages, /trnMissingTitle/)
  assert.match(messages, /gatewayReference/)
  assert.match(messages, /إيصال رقمي/)
  assert.match(messages, /الرقم الضريبي/)
})
