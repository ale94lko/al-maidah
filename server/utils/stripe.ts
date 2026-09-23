import Stripe from "stripe"
import type { PaymentMethod } from "~/types"
import { useServerSecrets } from "./runtime"

/**
 * Server-only Stripe client. Never import this module from Vue/client code.
 */
export function createStripeClient(): Stripe {
  const { stripeSecretKey } = useServerSecrets()
  if (!stripeSecretKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "STRIPE_SECRET_KEY is not configured",
    })
  }

  // Use the SDK's pinned default API version for this package release.
  return new Stripe(stripeSecretKey)
}

export async function attachPaymentIntentToOrder(
  orderId: string,
  paymentIntentId: string,
) {
  const client = createServiceRoleClient()
  const { error } = await client
    .from("orders")
    .update({ gateway_reference: paymentIntentId })
    .eq("id", orderId)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to store PaymentIntent on order: ${error.message}`,
    })
  }
}

/** Map Stripe card wallet / card charge to our payment_method enum. */
export function mapStripeWalletToPaymentMethod(
  walletType: string | null | undefined,
): PaymentMethod {
  if (walletType === "google_pay") {
    return "google_pay"
  }
  if (walletType === "apple_pay") {
    return "apple_pay"
  }
  return "card"
}

export async function resolveOnlinePaymentMethod(
  stripe: Stripe,
  intent: Stripe.PaymentIntent,
): Promise<PaymentMethod> {
  let paymentMethod = intent.payment_method
  if (typeof paymentMethod === "string") {
    paymentMethod = await stripe.paymentMethods.retrieve(paymentMethod)
  }
  if (paymentMethod && typeof paymentMethod !== "string") {
    return mapStripeWalletToPaymentMethod(paymentMethod.card?.wallet?.type)
  }
  return "card"
}

export type MarkOrderPaidResult =
  | { ok: true; alreadyPaid: boolean; orderId: string }
  | { ok: false; reason: "missing_order" | "cash_order" }

/**
 * Persist a successful PaymentIntent on the order.
 * Idempotent: a second success for the same paid order is a no-op.
 */
export async function markOrderPaidFromPaymentIntent(
  intent: Stripe.PaymentIntent,
  paymentMethod: PaymentMethod,
): Promise<MarkOrderPaidResult> {
  const orderId = String(intent.metadata?.order_id || "").trim()
  const client = createServiceRoleClient()

  let orderQuery = client
    .from("orders")
    .select("id, payment_status, payment_method, gateway_reference")

  if (orderId) {
    orderQuery = orderQuery.eq("id", orderId)
  } else {
    orderQuery = orderQuery.eq("gateway_reference", intent.id)
  }

  const { data: order, error } = await orderQuery.maybeSingle()
  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load order for webhook: ${error.message}`,
    })
  }
  if (!order) {
    return { ok: false, reason: "missing_order" }
  }
  if (order.payment_method === "cash_at_table") {
    return { ok: false, reason: "cash_order" }
  }

  if (order.payment_status === "paid") {
    // Already paid — still ensure gateway_reference matches (idempotent retry).
    if (order.gateway_reference !== intent.id) {
      const { error: syncError } = await client
        .from("orders")
        .update({ gateway_reference: intent.id })
        .eq("id", order.id)
      if (syncError) {
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to sync gateway reference: ${syncError.message}`,
        })
      }
    }
    await closeSessionForOrder(client, order.id)
    return { ok: true, alreadyPaid: true, orderId: order.id }
  }

  const { data: updated, error: updateError } = await client
    .from("orders")
    .update({
      payment_status: "paid",
      payment_method: paymentMethod,
      gateway_reference: intent.id,
    })
    .eq("id", order.id)
    .eq("payment_status", "pending")
    .select("id")
    .maybeSingle()

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to mark order paid: ${updateError.message}`,
    })
  }

  if (!updated) {
    const { data: again, error: againError } = await client
      .from("orders")
      .select("id, payment_status")
      .eq("id", order.id)
      .maybeSingle()
    if (againError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to re-check order after pay update: ${againError.message}`,
      })
    }
    if (again?.payment_status === "paid") {
      await closeSessionForOrder(client, order.id)
      return { ok: true, alreadyPaid: true, orderId: order.id }
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Order payment status could not be updated",
    })
  }

  await closeSessionForOrder(client, order.id)
  return { ok: true, alreadyPaid: false, orderId: order.id }
}

/**
 * payment_intent.payment_failed: keep the order unpaid.
 * Online unpaid orders must not be treated as kitchen-ready.
 */
export async function recordPaymentIntentFailure(
  intent: Stripe.PaymentIntent,
): Promise<{ orderId: string | null }> {
  const orderId = String(intent.metadata?.order_id || "").trim()
  const client = createServiceRoleClient()

  let orderQuery = client
    .from("orders")
    .select("id, payment_status, payment_method, gateway_reference")

  if (orderId) {
    orderQuery = orderQuery.eq("id", orderId)
  } else {
    orderQuery = orderQuery.eq("gateway_reference", intent.id)
  }

  const { data: order, error } = await orderQuery.maybeSingle()
  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load order for failed payment: ${error.message}`,
    })
  }
  if (!order || order.payment_method === "cash_at_table") {
    return { orderId: null }
  }
  if (order.payment_status === "paid") {
    // Do not downgrade a paid order on a late/failed event.
    return { orderId: order.id }
  }

  // Ensure reference is stored for support; leave payment_status=pending.
  if (order.gateway_reference !== intent.id) {
    const { error: updateError } = await client
      .from("orders")
      .update({ gateway_reference: intent.id })
      .eq("id", order.id)
      .eq("payment_status", "pending")
    if (updateError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to record failed PaymentIntent: ${updateError.message}`,
      })
    }
  }

  return { orderId: order.id }
}
