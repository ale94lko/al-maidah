/** Server-only runtime secrets. Never import this into client code. */
export function useServerSecrets() {
  const config = useRuntimeConfig()

  return {
    stripeSecretKey: config.stripeSecretKey,
    stripeWebhookSecret: config.stripeWebhookSecret,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey,
  }
}
