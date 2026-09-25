import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("menu management migration archives dishes and scopes photo storage", () => {
  const path = "supabase/migrations/20260923190000_menu_management.sql"
  assert.ok(existsSync(resolve(root, path)))
  const sql = read(path)
  assert.match(sql, /is_archived/)
  assert.match(sql, /menu-photos/)
  assert.match(sql, /storage\.foldername\(name\)\)\[1\]/)
  assert.match(sql, /is_available = true and is_archived = false/)
})

test("admin menu APIs require ownership and never skip restaurant id", () => {
  const getApi = read("server/api/admin/menu/[restaurantId].get.ts")
  const createItem = read(
    "server/api/admin/menu/[restaurantId]/items/index.post.ts",
  )
  const photo = read(
    "server/api/admin/menu/[restaurantId]/items/[itemId]/photo.post.ts",
  )
  const helper = read("server/utils/admin-menu.ts")
  assert.match(getApi, /assertRestaurantOwner/)
  assert.match(getApi, /getAdminMenu/)
  assert.match(createItem, /assertRestaurantOwner/)
  assert.match(createItem, /createMenuItem/)
  assert.match(photo, /assertRestaurantOwner/)
  assert.match(photo, /uploadMenuPhoto/)
  assert.match(helper, /\$\{restaurantId\}\//)
  assert.match(helper, /cost_price/)
  assert.match(helper, /is_archived/)
})

test("admin menu page supports categories dishes sold-out and archive", () => {
  const page = read("pages/admin/menu.vue")
  const composable = read("composables/useAdminMenu.ts")
  assert.match(page, /useAdminMenu/)
  assert.match(page, /addCategory|createCategory/)
  assert.match(page, /markSoldOut|is_available/)
  assert.match(page, /archive|is_archived/)
  assert.match(page, /cost_price|admin\.cost/)
  assert.match(page, /admin\.margin|dishMargin/)
  assert.match(page, /uploadPhoto|photo/)
  assert.match(page, /border-e border-\[var\(--navy\)\]\/12|grid-cols-3/)
  assert.match(page, /table-icon-btn/)
  assert.doesNotMatch(page, /admin-chip-btn/)
  assert.match(composable, /saveDish/)
  assert.match(composable, /uploadPhoto/)
  assert.match(composable, /assertRestaurantOwner|\/api\/admin\/menu\//)
})

test("MenuItem and Category expose archive fields", () => {
  const types = read("types/index.ts")
  assert.match(types, /interface Category \{[\s\S]*is_archived/)
  assert.match(types, /interface MenuItem \{[\s\S]*is_archived/)
  assert.match(types, /interface MenuItem \{[\s\S]*cost_price/)
})
