import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

function latestRlsMigration() {
  const files = readdirSync(resolve(root, "supabase/migrations"))
    .filter((name) => name.endsWith(".sql") && name.includes("auth_rls"))
    .sort()
  assert.ok(files.length > 0, "missing auth_rls migration")
  return read(`supabase/migrations/${files[files.length - 1]}`)
}

test("RLS migration defines owner helper and tenant isolation policies", () => {
  const sql = latestRlsMigration()
  assert.match(sql, /create or replace function public\.is_restaurant_owner/)
  assert.match(sql, /restaurant_owners[\s\S]*user_id = auth\.uid\(\)/)
  assert.match(sql, /create policy menu_items_anon_select/)
  assert.match(sql, /create policy orders_owner_select/)
  assert.match(sql, /create policy orders_owner_update/)
  assert.doesNotMatch(
    sql,
    /create policy[\s\S]*on public\.orders[\s\S]*for insert[\s\S]*to anon/i,
  )
  assert.doesNotMatch(
    sql,
    /create policy[\s\S]*on public\.orders[\s\S]*for insert[\s\S]*to authenticated/i,
  )
})

test("anon cannot select cost_price on menu_items", () => {
  const sql = latestRlsMigration()
  const grants = [
    ...sql.matchAll(
      /grant select \(([\s\S]*?)\) on table public\.menu_items to ([^;]+);/gi,
    ),
  ]
  assert.ok(grants.length >= 1, "expected column grant on menu_items")
  const anonGrants = grants.filter(([, , roles]) => /\banon\b/i.test(roles))
  assert.ok(anonGrants.length >= 1, "expected anon column grant on menu_items")
  for (const grant of anonGrants) {
    assert.doesNotMatch(grant[1], /\bcost_price\b/)
  }
})

test("auth signup API creates restaurant and ownership", () => {
  assert.ok(existsSync(resolve(root, "server/api/auth/signup.post.ts")))
  const signup = read("server/api/auth/signup.post.ts")
  assert.match(signup, /auth\.admin\.createUser/)
  assert.match(signup, /from\("restaurants"\)[\s\S]*\.insert/)
  assert.match(signup, /from\("restaurant_owners"\)\.insert/)
})

test("auth middleware guards admin and kitchen routes", () => {
  assert.ok(existsSync(resolve(root, "middleware/auth.global.ts")))
  const middleware = read("middleware/auth.global.ts")
  assert.match(middleware, /\/admin/)
  assert.match(middleware, /\/kitchen/)
  assert.match(middleware, /\/admin\/login/)
  assert.match(middleware, /navigateTo/)
})

test("admin and kitchen pages exist with login and signup", () => {
  for (const path of [
    "pages/admin/login.vue",
    "pages/admin/signup.vue",
    "pages/admin/index.vue",
    "pages/kitchen/index.vue",
  ]) {
    assert.ok(existsSync(resolve(root, path)), `missing ${path}`)
  }
})

test("admin menu API requires ownership before returning cost_price", () => {
  const api = read("server/api/admin/menu/[restaurantId].get.ts")
  assert.match(api, /assertRestaurantOwner/)
  assert.match(api, /getMenuItemsForRestaurant/)
})
