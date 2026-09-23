import type Stripe from "stripe"

/**
 * Stripe webhook: verify signature, then mark orders paid on success.
 * Uses the raw request body — required for constructEvent.
 */
export default defineEventHandler(async (event) => {
  const { stripeWebhookSecret } = useServerSecrets()
  if (!stripeWebhookSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "STRIPE_WEBHOOK_SECRET is not configured",
    })
  }

  const signature = getHeader(event, "stripe-signature")
  if (!signature) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing Stripe-Signature header",
    })
  }

  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing webhook body",
    })
  }

  const stripe = createStripeClient()
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret,
    )
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Stripe webhook signature",
    })
  }

  if (stripeEvent.type === "payment_intent.succeeded") {
    const intent = stripeEvent.data.object as Stripe.PaymentIntent
    const paymentMethod = await resolveOnlinePaymentMethod(stripe, intent)
    const result = await markOrderPaidFromPaymentIntent(intent, paymentMethod)
    if (!result.ok && result.reason === "missing_order") {
      throw createError({
        statusCode: 404,
        statusMessage: "Order not found for PaymentIntent",
      })
    }
    // Persist completed — return 2xx so Stripe stops retrying.
    return {
      received: true,
      type: stripeEvent.type,
      orderId: result.ok ? result.orderId : null,
      alreadyPaid: result.ok ? result.alreadyPaid : false,
    }
  }

  if (stripeEvent.type === "payment_intent.payment_failed") {
    const intent = stripeEvent.data.object as Stripe.PaymentIntent
    const result = await recordPaymentIntentFailure(intent)
    return {
      received: true,
      type: stripeEvent.type,
      orderId: result.orderId,
      unpaid: true,
    }
  }

  // Acknowledge unrelated events without side effects.
  return { received: true, type: stripeEvent.type, ignored: true }
})
