import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("surface layouts exist for client, kitchen, and admin", () => {
  for (const path of [
    "layouts/client.vue",
    "layouts/kitchen.vue",
    "layouts/admin.vue",
  ]) {
    assert.ok(existsSync(resolve(root, path)), `missing ${path}`)
  }
})

test("client layout shows venue name and table", () => {
  const layout = read("layouts/client.vue")
  assert.match(layout, /venueName/)
  assert.match(layout, /tableNumber|tableLabel/)
  assert.match(layout, /max-w-lg/)
})

test("kitchen layout is full-screen dark without marketing chrome", () => {
  const layout = read("layouts/kitchen.vue")
  assert.match(layout, /kitchen-shell/)
  assert.match(layout, /kitchen|--kitchen|bg-\[var\(--kitchen\)\]/)
  assert.doesNotMatch(layout, /Owner|UAE table ordering/)
  assert.match(layout, /min-h-dvh|min-h-screen/)
})

test("admin layout navigates to statistics, menu, and tables", () => {
  const layout = read("layouts/admin.vue")
  assert.match(layout, /\/admin\/?['"]/)
  assert.match(layout, /\/admin\/menu/)
  assert.match(layout, /\/admin\/tables/)
  assert.match(layout, /admin\.statistics|admin\.menu|admin\.tables/)
  // Mobile bottom nav + desktop sidebar so nav is not clipped.
  assert.match(layout, /md:hidden|md:flex/)
  assert.match(layout, /fixed inset-x-0 bottom-0|bottom-0/)
  assert.match(layout, /no-print/)
})

test("shared loading and empty states exist", () => {
  assert.ok(existsSync(resolve(root, "components/AppLoadingState.vue")))
  assert.ok(existsSync(resolve(root, "components/AppEmptyState.vue")))
  assert.ok(existsSync(resolve(root, "components/AppPasswordInput.vue")))
  assert.match(read("components/AppPasswordInput.vue"), /showPassword|hidePassword/)
  assert.match(read("pages/admin/login.vue"), /AppPasswordInput/)
  assert.match(read("pages/admin/settings.vue"), /AppPasswordInput/)
})

test("route groups declare the matching layout", () => {
  assert.match(read("pages/m/[slug]/index.vue"), /layout:\s*["']client["']/)
  assert.match(read("pages/kitchen/index.vue"), /layout:\s*["']kitchen["']/)
  assert.match(read("pages/admin/index.vue"), /layout:\s*["']admin["']/)
  assert.match(read("pages/admin/menu.vue"), /layout:\s*["']admin["']/)
  assert.match(read("pages/admin/tables.vue"), /layout:\s*["']admin["']/)
  assert.match(read("pages/admin/login.vue"), /layout:\s*(?:false|["']admin["'])/)
})
