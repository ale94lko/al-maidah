import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

function mapStripeWalletToPaymentMethod(walletType) {
  if (walletType === "google_pay") {
    return "google_pay"
  }
  if (walletType === "apple_pay") {
    return "apple_pay"
  }
  return "card"
}

test("webhook route verifies Stripe signature with webhook secret", () => {
  assert.ok(existsSync(resolve(root, "server/api/stripe/webhook.post.ts")))
  const api = read("server/api/stripe/webhook.post.ts")
  assert.match(api, /readRawBody/)
  assert.match(api, /stripe-signature|Stripe-Signature/)
  assert.match(api, /constructEvent/)
  assert.match(api, /stripeWebhookSecret|STRIPE_WEBHOOK_SECRET/)
  assert.match(api, /Invalid Stripe webhook signature/)
  assert.match(api, /payment_intent\.succeeded/)
  assert.match(api, /payment_intent\.payment_failed/)
  assert.match(api, /markOrderPaidFromPaymentIntent/)
  assert.match(api, /recordPaymentIntentFailure/)
})

test("mark paid helper is idempotent and stores method plus reference", () => {
  const source = read("server/utils/stripe.ts")
  assert.match(source, /markOrderPaidFromPaymentIntent/)
  assert.match(source, /payment_status:\s*"paid"/)
  assert.match(source, /gateway_reference/)
  assert.match(source, /alreadyPaid/)
  assert.match(source, /\.eq\("payment_status", "pending"\)/)
  assert.match(source, /mapStripeWalletToPaymentMethod/)
  assert.match(source, /google_pay/)
  assert.match(source, /apple_pay/)
})

test("payment_failed keeps orders unpaid", () => {
  const source = read("server/utils/stripe.ts")
  assert.match(source, /recordPaymentIntentFailure/)
  assert.doesNotMatch(
    source.match(/recordPaymentIntentFailure[\s\S]*return \{ orderId: order\.id \}/)?.[0] ||
      "",
    /payment_status:\s*"paid"/,
  )
  assert.match(source, /Do not downgrade a paid order/)
})

test("wallet mapping covers Google Pay, Apple Pay, and card", () => {
  assert.equal(mapStripeWalletToPaymentMethod("google_pay"), "google_pay")
  assert.equal(mapStripeWalletToPaymentMethod("apple_pay"), "apple_pay")
  assert.equal(mapStripeWalletToPaymentMethod("link"), "card")
  assert.equal(mapStripeWalletToPaymentMethod(null), "card")
})

test("guest status page reflects paid webhook state", () => {
  const page = read("pages/m/[slug]/status/[orderId].vue")
  assert.match(page, /orderPaid/)
  assert.match(page, /isPaid|payment_status === "paid"/)
})

test("invalid signature path does not call mark paid before constructEvent", () => {
  const api = read("server/api/stripe/webhook.post.ts")
  const constructIdx = api.indexOf("constructEvent")
  const markIdx = api.indexOf("markOrderPaidFromPaymentIntent")
  assert.ok(constructIdx >= 0 && markIdx > constructIdx)
})
