import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("kitchen Start shift unlocks audio after a user gesture", () => {
  assert.ok(existsSync(resolve(root, "composables/useKitchenAudio.ts")))
  const audio = read("composables/useKitchenAudio.ts")
  assert.match(audio, /startShift/)
  assert.match(audio, /AudioContext|webkitAudioContext/)
  assert.match(audio, /kitchen-new-order\.wav/)
  assert.match(audio, /audioBlocked/)
  assert.match(audio, /alertNewOrder/)
  assert.match(audio, /visualAlertActive/)

  const page = read("pages/kitchen/index.vue")
  assert.match(page, /KitchenStartShift/)
  assert.match(page, /shiftStarted/)
  assert.match(page, /enableAlerts/)
  assert.match(page, /KitchenNewOrderAlert/)

  assert.ok(existsSync(resolve(root, "components/KitchenStartShift.vue")))
  assert.ok(existsSync(resolve(root, "components/KitchenNewOrderAlert.vue")))
  assert.ok(
    existsSync(resolve(root, "public/sounds/kitchen-new-order.wav")),
  )
})

test("kitchen PWA manifest starts at /kitchen standalone", () => {
  assert.ok(existsSync(resolve(root, "public/kitchen.webmanifest")))
  const manifest = JSON.parse(read("public/kitchen.webmanifest"))
  assert.equal(manifest.start_url, "/kitchen")
  assert.equal(manifest.display, "standalone")
  assert.ok(
    Array.isArray(manifest.icons) && manifest.icons.length >= 2,
    "needs 192 and 512 icons",
  )
  assert.ok(existsSync(resolve(root, "public/icons/kitchen-192.png")))
  assert.ok(existsSync(resolve(root, "public/icons/kitchen-512.png")))
  assert.ok(existsSync(resolve(root, "public/sw.js")))
  assert.match(read("public/sw.js"), /addEventListener\(["']fetch["']/)

  const pwa = read("composables/useKitchenPwa.ts")
  assert.match(pwa, /kitchen\.webmanifest/)
  assert.match(pwa, /serviceWorker\.register/)
  assert.match(pwa, /\/sw\.js/)

  const page = read("pages/kitchen/index.vue")
  assert.match(page, /applyKitchenHead|useKitchenPwa/)
  assert.match(page, /registerServiceWorker/)
})

test("kitchen sound and PWA i18n keys exist in English and Arabic", () => {
  const messages = read("i18n/messages.ts")
  for (const key of [
    "startShift",
    "startShiftHint",
    "alertNewOrder",
    "alertSoundBlocked",
    "installApp",
  ]) {
    assert.match(messages, new RegExp(`${key}:`))
  }
})
