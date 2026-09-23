import Stripe from "stripe"
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
