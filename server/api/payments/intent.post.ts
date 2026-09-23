import { moneyToFils } from "~/utils/cart"

type IntentBody = {
  orderId?: string
}

/**
 * Create a Stripe PaymentIntent in AED fils for an existing pending online order.
 * Does not mark the order paid — that waits for the webhook (MVP-11).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<IntentBody>(event)
  const orderId = String(body.orderId || "").trim()
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: "orderId is required" })
  }

  const db = createServiceRoleClient()
  const { data: order, error } = await db
    .from("orders")
    .select(
      "id, restaurant_id, table_id, payment_status, payment_method, total, gateway_reference",
    )
    .eq("id", orderId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load order: ${error.message}`,
    })
  }
  if (!order) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" })
  }
  if (order.payment_status === "paid") {
    throw createError({ statusCode: 409, statusMessage: "Order is already paid" })
  }
  if (order.payment_method === "cash_at_table") {
    throw createError({
      statusCode: 400,
      statusMessage: "Cash orders do not use Stripe",
    })
  }
  if (
    order.payment_method !== "card" &&
    order.payment_method !== "google_pay" &&
    order.payment_method !== "apple_pay"
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Order is not set up for online payment",
    })
  }

  const amountFils = moneyToFils(order.total)
  if (amountFils < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: "Order total must be at least 0.01 AED",
    })
  }

  const stripe = createStripeClient()

  // Reuse an existing unfinished PaymentIntent when possible.
  if (order.gateway_reference) {
    try {
      const existing = await stripe.paymentIntents.retrieve(order.gateway_reference)
      if (
        existing.status === "requires_payment_method" ||
        existing.status === "requires_confirmation" ||
        existing.status === "requires_action"
      ) {
        return {
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
          amountFils: existing.amount,
          currency: existing.currency,
        }
      }
    } catch {
      // Fall through and create a fresh PaymentIntent.
    }
  }

  const intent = await stripe.paymentIntents.create({
    amount: amountFils,
    currency: "aed",
    automatic_payment_methods: { enabled: true },
    metadata: {
      order_id: order.id,
      restaurant_id: order.restaurant_id,
      table_id: order.table_id,
    },
  })

  await attachPaymentIntentToOrder(order.id, intent.id)

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amountFils: intent.amount,
    currency: intent.currency,
  }
})
