import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("API error helper strips ofetch method noise", () => {
  assert.ok(existsSync(resolve(root, "utils/errors.ts")))
  const source = read("utils/errors.ts")
  assert.match(source, /extractApiErrorMessage/)
  assert.match(source, /statusMessage/)
  assert.match(source, /\[A-Z\]\+/)
})

test("admin tables page shows errors in AppErrorDialog", () => {
  assert.ok(existsSync(resolve(root, "components/AppErrorDialog.vue")))
  const page = read("pages/admin/tables.vue")
  assert.match(page, /AppErrorDialog/)
  assert.match(page, /tableNumberInUse/)
  assert.match(page, /useErrorDialog/)
  assert.doesNotMatch(page, /text-rose-700/)
})
