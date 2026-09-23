import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("tables soft-delete migration keeps history and blocks inactive scans", () => {
  const path = "supabase/migrations/20260923200000_tables_soft_delete.sql"
  assert.ok(existsSync(resolve(root, path)))
  const sql = read(path)
  assert.match(sql, /is_active/)
  assert.match(sql, /tables_restaurant_active_number_uidx/)
  assert.match(sql, /is_active = true/)
})

test("admin tables APIs require ownership and soft-remove tables", () => {
  const listApi = read("server/api/admin/tables/[restaurantId].get.ts")
  const createApi = read("server/api/admin/tables/[restaurantId].post.ts")
  const removeApi = read(
    "server/api/admin/tables/[restaurantId]/[tableId].delete.ts",
  )
  const helper = read("server/utils/admin-tables.ts")
  assert.match(listApi, /assertRestaurantOwner/)
  assert.match(listApi, /listRestaurantTables/)
  assert.match(createApi, /createRestaurantTable/)
  assert.match(removeApi, /deactivateRestaurantTable/)
  assert.match(helper, /is_active: false/)
  assert.match(helper, /deactivated_at/)
})

test("guest table lookup only resolves active tables", () => {
  const restaurant = read("server/utils/restaurant.ts")
  const orders = read("server/utils/orders.ts")
  assert.match(restaurant, /getTableByNumber/)
  assert.match(restaurant, /\.eq\("is_active", true\)/)
  assert.match(orders, /is_active === false|!table\.is_active|table\.is_active === false/)
})

test("admin tables page opens QR in a print modal", () => {
  const page = read("pages/admin/tables.vue")
  const layout = read("layouts/admin.vue")
  const css = read("assets/css/main.css")
  const composable = read("composables/useAdminTables.ts")
  assert.match(page, /window\.print/)
  assert.match(page, /menuUrlForTable/)
  assert.match(page, /scanPrompt|admin\.scanPrompt/)
  assert.match(page, /AdminTableQr/)
  assert.match(page, /viewQr|admin\.viewQr/)
  assert.match(page, /print-sheet/)
  assert.match(page, /no-print/)
  assert.doesNotMatch(page, /printPreview/)
  assert.match(layout, /no-print/)
  assert.match(css, /@media print/)
  assert.match(css, /\.no-print/)
  assert.match(composable, /menuUrlForTable/)
  assert.match(composable, /\?table=/)
  assert.match(composable, /\/m\/\$\{slug\}\?table=/)
  assert.ok(existsSync(resolve(root, "components/AdminTableQr.vue")))
  assert.match(read("package.json"), /"qrcode"/)
})
