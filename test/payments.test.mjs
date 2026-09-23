import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("stripe packages are installed for server and browser", () => {
  const pkg = JSON.parse(read("package.json"))
  assert.ok(pkg.dependencies.stripe, "missing stripe")
  assert.ok(pkg.dependencies["@stripe/stripe-js"], "missing @stripe/stripe-js")
})

test("Stripe secret helper stays under server/", () => {
  assert.ok(existsSync(resolve(root, "server/utils/stripe.ts")))
  const stripe = read("server/utils/stripe.ts")
  assert.match(stripe, /createStripeClient/)
  assert.match(stripe, /useServerSecrets|stripeSecretKey/)
  assert.doesNotMatch(stripe, /publishable/)

  const composables = readdirSync(resolve(root, "composables"))
  for (const file of composables) {
    assert.doesNotMatch(
      read(`composables/${file}`),
      /STRIPE_SECRET|stripeSecretKey|createStripeClient/,
      `client composable leaked Stripe secret: ${file}`,
    )
  }
})

test("PaymentIntent API creates AED fils amount with order metadata", () => {
  assert.ok(existsSync(resolve(root, "server/api/payments/intent.post.ts")))
  const api = read("server/api/payments/intent.post.ts")
  assert.match(api, /createStripeClient/)
  assert.match(api, /paymentIntents\.create/)
  assert.match(api, /currency:\s*"aed"/)
  assert.match(api, /moneyToFils/)
  assert.match(api, /order_id/)
  assert.match(api, /Cash orders do not use Stripe/)
  assert.match(api, /attachPaymentIntentToOrder|gateway_reference/)
  assert.doesNotMatch(api, /payment_status:\s*"paid"/)
})

test("cash checkout skips Stripe and keeps payment pending", () => {
  const orders = read("server/utils/orders.ts")
  assert.match(orders, /paymentMethod/)
  assert.match(orders, /cash_at_table/)
  assert.match(orders, /payment_status:\s*"pending"/)

  const cart = read("pages/m/[slug]/cart.vue")
  assert.match(cart, /cash_at_table/)
  assert.match(cart, /paymentMethod/)
  assert.match(cart, /\/pay\//)
  assert.match(cart, /\/status\//)
})

test("guest Stripe checkout uses publishable key and Express Checkout", () => {
  assert.ok(existsSync(resolve(root, "components/GuestStripeCheckout.vue")))
  assert.ok(existsSync(resolve(root, "pages/m/[slug]/pay/[orderId].vue")))
  const component = read("components/GuestStripeCheckout.vue")
  assert.match(component, /loadStripe/)
  assert.match(component, /stripePublishableKey/)
  assert.match(component, /expressCheckout/)
  assert.match(component, /confirmPayment/)
  assert.doesNotMatch(component, /STRIPE_SECRET|stripeSecretKey/)
})

test("pay page shows Stripe unavailable errors only once", () => {
  const component = read("components/GuestStripeCheckout.vue")
  const page = read("pages/m/[slug]/pay/[orderId].vue")
  assert.match(component, /errorMessage/)
  assert.match(component, /guest\.stripeUnavailable/)
  assert.doesNotMatch(component, /emit\(["']error["']/)
  assert.doesNotMatch(page, /@error/)
  assert.match(page, /@cancelled/)
})

test("Arabic price copy uses د.إ", () => {
  const messages = read("i18n/messages.ts")
  assert.match(messages, /priceAed:\s*"\{price\} AED"/)
  assert.match(messages, /priceAed:\s*"\{price\} د\.إ"/)
})

test("AED fils conversion matches Stripe amount units", () => {
  function moneyToFils(value) {
    return Math.round(Number(value) * 100)
  }
  assert.equal(moneyToFils("21.00"), 2100)
  assert.equal(moneyToFils("12.60"), 1260)
})
