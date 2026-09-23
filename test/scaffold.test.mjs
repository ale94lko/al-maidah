import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

test("package scripts expose Nuxt dev and build", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
  assert.equal(pkg.scripts.dev, "nuxt dev")
  assert.equal(pkg.scripts.build, "nuxt build")
})

test("runtimeConfig wires Supabase, Stripe, and app URL", () => {
  const config = readFileSync(resolve(root, "nuxt.config.ts"), "utf8")
  assert.match(config, /supabaseUrl/)
  assert.match(config, /stripeSecretKey/)
  assert.match(config, /appUrl/)
  assert.match(config, /STRIPE_SECRET_KEY/)
  assert.match(config, /SUPABASE_SERVICE_ROLE_KEY/)
})

test("PWA manifest is named Al-Maidah and standalone", () => {
  const manifest = JSON.parse(
    readFileSync(resolve(root, "public/manifest.webmanifest"), "utf8"),
  )
  assert.equal(manifest.name, "Al-Maidah")
  assert.equal(manifest.display, "standalone")
})

test("scaffold folders required by MVP-01 exist", () => {
  for (const path of [
    "pages",
    "layouts",
    "components",
    "composables",
    "server/api",
    "types",
    "public",
  ]) {
    assert.ok(existsSync(resolve(root, path)), `missing ${path}`)
  }
})

test("root redirects to owner login instead of a marketing landing", () => {
  const page = readFileSync(resolve(root, "pages/index.vue"), "utf8")
  const config = readFileSync(resolve(root, "nuxt.config.ts"), "utf8")
  assert.doesNotMatch(page, /Scaffold ready/)
  assert.doesNotMatch(page, /landing-shell/)
  assert.match(page, /\/admin\/login/)
  assert.match(page, /navigateTo/)
  assert.match(config, /["']\/["']\s*:\s*\{\s*redirect:\s*["']\/admin\/login["']/)
})
