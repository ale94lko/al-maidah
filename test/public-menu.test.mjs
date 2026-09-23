import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("guest session persists slug and table in sessionStorage", () => {
  assert.ok(existsSync(resolve(root, "composables/useGuestSession.ts")))
  const source = read("composables/useGuestSession.ts")
  assert.match(source, /GUEST_SESSION_STORAGE_KEY/)
  assert.match(source, /sessionStorage/)
  assert.match(source, /saveSession/)
  assert.match(source, /resolveTableToken/)
  assert.match(source, /tableToken/)
  assert.match(source, /tableNumber/)
  assert.match(source, /tableId/)
})

test("public menu API requires a valid table query", () => {
  const api = read("server/api/menu/[slug].get.ts")
  assert.match(api, /Table is required\. Scan the QR code again\./)
  assert.match(api, /Table not found\. Scan the QR code again\./)
  assert.match(api, /Restaurant not found/)
  assert.match(api, /getTableByToken/)
  assert.match(api, /parseTableToken/)
  assert.doesNotMatch(api, /table = null/)
})

test("public menu helper hides sold-out dishes and includes vegetarian flag", () => {
  const helpers = read("server/utils/restaurant.ts")
  assert.match(helpers, /is_vegetarian/)
  assert.match(helpers, /\.eq\("is_available", true\)/)
  assert.match(helpers, /\.eq\("is_archived", false\)/)
  const publicColumns = helpers.match(
    /const PUBLIC_DISH_COLUMNS =\s*\n?\s*"([^"]+)"/,
  )
  assert.ok(publicColumns)
  assert.match(publicColumns[1], /is_vegetarian/)
  assert.match(publicColumns[1], /photo_url/)
  assert.doesNotMatch(publicColumns[1], /cost_price/)
})

test("guest menu page searches, filters, and blocks ordering without a table", () => {
  const page = read("pages/m/[slug]/index.vue")
  assert.match(page, /useGuestSession/)
  assert.match(page, /scanQrAgain/)
  assert.match(page, /searchQuery/)
  assert.match(page, /vegetarianOnly/)
  assert.match(page, /excludedAllergens/)
  assert.match(page, /photo_url/)
  assert.match(page, /soldOut|is_available/)
  assert.match(page, /priceAed|AED/)
})

test("MVP-07 migration adds vegetarian column and sold-out reads for anon", () => {
  const files = readdirSync(resolve(root, "supabase/migrations"))
    .filter((name) => name.includes("public_menu_fields"))
    .sort()
  assert.ok(files.length > 0, "missing public_menu_fields migration")
  const sql = read(`supabase/migrations/${files[files.length - 1]}`)
  assert.match(sql, /is_vegetarian/)
  assert.match(sql, /drop policy if exists menu_items_anon_select/)
  assert.match(sql, /using \(true\)/)
})

test("seed marks vegetarian dishes, photos, and at least one sold-out item", () => {
  const seed = read("supabase/seed.sql")
  assert.match(seed, /is_vegetarian/)
  assert.match(seed, /photo_url/)
  assert.match(seed, /unsplash\.com|images\./)
  assert.match(seed, /false,\s*\n\s*false,\s*\n\s*'\{\}'/)
})

test("MenuItem type includes is_vegetarian", () => {
  assert.match(read("types/index.ts"), /is_vegetarian:\s*boolean/)
})
