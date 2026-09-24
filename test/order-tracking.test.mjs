import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("guest_access_token migration exists for live tracking", () => {
  assert.ok(
    existsSync(
      resolve(root, "supabase/migrations/20260923170000_order_guest_tracking.sql"),
    ),
  )
  assert.match(
    read("supabase/migrations/20260923170000_order_guest_tracking.sql"),
    /guest_access_token/,
  )
})

test("public order GET requires slug and token and hides costs", () => {
  const api = read("server/api/orders/[id].get.ts")
  const helper = read("server/utils/orders.ts")
  assert.match(api, /slug/)
  assert.match(api, /token|accessToken/)
  assert.match(api, /Order not found/)
  assert.match(helper, /guest_access_token/)
  assert.match(helper, /restaurant\.slug !== slug/)
  const getFn = helper.match(
    /export async function getPublicOrderById[\s\S]*?(?=export async function|$)/,
  )?.[0]
  assert.ok(getFn)
  assert.doesNotMatch(getFn, /total_cost/)
  assert.doesNotMatch(getFn, /gateway_reference/)
  assert.doesNotMatch(getFn, /unit_cost/)
})

test("active order is persisted on the device", () => {
  assert.ok(existsSync(resolve(root, "composables/useActiveOrder.ts")))
  const source = read("composables/useActiveOrder.ts")
  assert.match(source, /localStorage/)
  assert.match(source, /ACTIVE_ORDER_STORAGE_PREFIX/)
  assert.match(source, /accessToken/)
  assert.match(read("pages/m/[slug]/cart.vue"), /saveActiveOrder/)
})

test("status page live-updates kitchen statuses and keeps the table", () => {
  const page = read("pages/m/[slug]/status/[orderId].vue")
  assert.match(page, /POLL_MS|setInterval/)
  assert.match(page, /statusReceived|in_preparation/)
  assert.match(page, /statusPreparing/)
  assert.match(page, /statusReady/)
  assert.match(page, /orderSomethingElse/)
  assert.match(page, /query:\s*\{[\s\S]*table/)
  assert.match(page, /slug:\s*slug\.value/)
  assert.match(page, /token:\s*accessToken/)
})

test("PublicOrder exposes guest_access_token not gateway_reference", () => {
  const types = read("types/index.ts")
  assert.match(types, /interface PublicOrder/)
  assert.match(types, /guest_access_token/)
  const publicBlock = types.match(
    /interface PublicOrder \{([\s\S]*?)\n\}/,
  )?.[1]
  assert.ok(publicBlock)
  assert.match(publicBlock, /restaurant_name/)
  assert.doesNotMatch(publicBlock, /gateway_reference/)
  assert.doesNotMatch(publicBlock, /total_cost/)
})

test("status and pay pages prefer restaurant_name for the guest header", () => {
  const status = read("pages/m/[slug]/status/[orderId].vue")
  const pay = read("pages/m/[slug]/pay/[orderId].vue")
  assert.match(status, /restaurant_name/)
  assert.match(pay, /\/status\//)
  assert.match(read("server/utils/orders.ts"), /restaurant_name: restaurant\.name/)
})
