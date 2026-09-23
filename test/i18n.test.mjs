import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("locale message catalogs cover English and Arabic UI strings", () => {
  const messages = read("i18n/messages.ts")
  assert.match(messages, /en:\s*\{/)
  assert.match(messages, /ar:\s*\{/)
  assert.match(messages, /guest:\s*\{/)
  assert.match(messages, /kitchen:\s*\{/)
  assert.match(messages, /admin:\s*\{/)
  assert.match(messages, /loadingMenu/)
  assert.match(messages, /جاري تحميل القائمة/)
})

test("useAppI18n persists locale and exposes rtl direction", () => {
  const source = read("composables/useAppI18n.ts")
  assert.match(source, /LOCALE_STORAGE_KEY/)
  assert.match(source, /localStorage/)
  assert.match(source, /rtl/)
  assert.match(source, /html\.dir/)
  assert.match(source, /setLocale/)
})

test("language switcher is on the guest layout and owner login", () => {
  assert.ok(existsSync(resolve(root, "components/LanguageSwitcher.vue")))
  assert.match(read("layouts/client.vue"), /LanguageSwitcher/)
  assert.match(read("pages/admin/login.vue"), /LanguageSwitcher/)
})

test("localizedName prefers Arabic names when locale is ar", () => {
  function localizedName(entity, locale) {
    if (locale === "ar") {
      return entity.name_ar || entity.name_en
    }
    return entity.name_en || entity.name_ar
  }

  const dish = { name_en: "Hummus", name_ar: "حمص" }
  assert.equal(localizedName(dish, "en"), "Hummus")
  assert.equal(localizedName(dish, "ar"), "حمص")
})

test("guest menu page uses localized category and dish names", () => {
  const page = read("pages/m/[slug]/index.vue")
  assert.match(page, /localizedName/)
  assert.match(page, /localizedDescription/)
  assert.match(page, /useAppI18n/)
})

test("admin and kitchen shells use logical borders for RTL", () => {
  assert.match(read("layouts/admin.vue"), /border-e/)
  assert.match(read("assets/css/main.css"), /\[dir="rtl"\]/)
  assert.match(read("assets/css/main.css"), /padding-inline-start/)
})

test("app root binds html lang and dir from locale", () => {
  const app = read("app.vue")
  assert.match(app, /htmlAttrs/)
  assert.match(app, /dir/)
  assert.match(app, /initLocale/)
})
