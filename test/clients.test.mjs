import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("domain types cover restaurant through statistics", () => {
  const types = read("types/index.ts")
  for (const name of [
    "Restaurant",
    "DiningTable",
    "Category",
    "MenuItem",
    "Dish",
    "ModifierGroup",
    "ModifierOption",
    "CartItem",
    "Order",
    "OrderItem",
    "RestaurantStatistics",
    "PublicMenu",
  ]) {
    assert.match(types, new RegExp(`(interface|type) ${name}\\b`))
  }
  assert.match(types, /Omit<MenuItem, "cost_price">/)
})

test("browser client uses anon key only", () => {
  const client = read("composables/useSupabaseClient.ts")
  assert.match(client, /supabaseAnonKey/)
  assert.doesNotMatch(client, /SERVICE_ROLE|serviceRole|service_role/)
  assert.match(client, /import\.meta\.server/)
})

test("service role client lives only under server/", () => {
  assert.ok(existsSync(resolve(root, "server/utils/supabase.ts")))
  const server = read("server/utils/supabase.ts")
  assert.match(server, /supabaseServiceRoleKey/)
  assert.match(server, /import\.meta\.client/)
  assert.match(server, /createServiceRoleClient/)

  const composables = readdirSync(resolve(root, "composables"))
  for (const file of composables) {
    const source = read(`composables/${file}`)
    assert.doesNotMatch(
      source,
      /SERVICE_ROLE|serviceRoleKey|from ["'].*server\/utils\/supabase/,
      `client composable leaked service role: ${file}`,
    )
  }
})

test("restaurant helpers resolve slug, table, and scoped menu", () => {
  const helpers = read("server/utils/restaurant.ts")
  assert.match(helpers, /export async function getRestaurantBySlug/)
  assert.match(helpers, /export async function getTableByNumber/)
  assert.match(helpers, /export async function getPublicMenuBySlug/)
  assert.match(helpers, /\.eq\("restaurant_id", restaurantId\)/)
  assert.match(helpers, /const PUBLIC_DISH_COLUMNS =/)
  assert.match(helpers, /assertNoCostPrice/)
  const publicColumns = helpers.match(
    /const PUBLIC_DISH_COLUMNS =\s*\n?\s*"([^"]+)"/,
  )
  assert.ok(publicColumns, "PUBLIC_DISH_COLUMNS constant missing")
  assert.doesNotMatch(publicColumns[1], /cost_price/)
})

test("public menu API scopes dishes to the requested restaurant", () => {
  assert.ok(existsSync(resolve(root, "server/api/menu/[slug].get.ts")))
  const api = read("server/api/menu/[slug].get.ts")
  assert.match(api, /getPublicMenuBySlug/)
  assert.match(api, /createAnonServerClient/)
  assert.match(api, /dish\.restaurant_id !== menu\.restaurant\.id/)
})

test("package depends on @supabase/supabase-js", () => {
  const pkg = JSON.parse(read("package.json"))
  assert.ok(pkg.dependencies["@supabase/supabase-js"])
})
