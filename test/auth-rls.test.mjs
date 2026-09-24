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

test("auth signup API is superadmin-only and creates restaurant ownership", () => {
  assert.ok(existsSync(resolve(root, "server/api/auth/signup.post.ts")))
  const signup = read("server/api/auth/signup.post.ts")
  assert.match(signup, /requireSuperAdmin/)
  assert.match(signup, /createOwnerAccount/)
  const helper = read("server/utils/owner-accounts.ts")
  assert.match(helper, /auth\.admin\.createUser/)
  assert.match(helper, /from\("restaurants"\)[\s\S]*\.insert/)
  assert.match(helper, /from\("restaurant_owners"\)\.insert/)
})

test("auth middleware guards admin, kitchen, and superadmin routes", () => {
  assert.ok(existsSync(resolve(root, "middleware/auth.global.ts")))
  const middleware = read("middleware/auth.global.ts")
  assert.match(middleware, /\/admin/)
  assert.match(middleware, /\/kitchen/)
  assert.match(middleware, /\/superadmin/)
  assert.match(middleware, /\/admin\/login/)
  assert.match(middleware, /navigateTo/)
  assert.match(middleware, /isSuperAdminUser/)
})

test("admin and kitchen pages exist; public signup redirects to login", () => {
  for (const path of [
    "pages/admin/login.vue",
    "pages/admin/signup.vue",
    "pages/admin/index.vue",
    "pages/kitchen/index.vue",
    "pages/superadmin/index.vue",
    "pages/superadmin/users/index.vue",
    "pages/superadmin/users/[id].vue",
  ]) {
    assert.ok(existsSync(resolve(root, path)), `missing ${path}`)
  }
  const login = read("pages/admin/login.vue")
  assert.doesNotMatch(login, /\/admin\/signup/)
  const signup = read("pages/admin/signup.vue")
  assert.match(signup, /navigateTo\("\/admin\/login"/)
})

test("superadmin APIs require elevated access", () => {
  for (const path of [
    "server/api/superadmin/stats.get.ts",
    "server/api/superadmin/users/index.get.ts",
    "server/api/superadmin/users/index.post.ts",
    "server/api/superadmin/users/[userId].get.ts",
    "server/api/superadmin/users/[userId].patch.ts",
    "server/api/superadmin/users/[userId].delete.ts",
    "server/api/superadmin/users/[userId]/password.post.ts",
  ]) {
    assert.ok(existsSync(resolve(root, path)), `missing ${path}`)
    assert.match(read(path), /requireSuperAdmin/)
  }
})

test("admin menu API requires ownership before returning cost_price", () => {
  const api = read("server/api/admin/menu/[restaurantId].get.ts")
  assert.match(api, /assertRestaurantOwner/)
  assert.match(api, /getAdminMenu|getMenuItemsForRestaurant/)
  assert.match(api, /cost_price|getAdminMenu/)
})
