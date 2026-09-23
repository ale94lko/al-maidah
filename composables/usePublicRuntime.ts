/**
 * Read public runtime config for client-safe values.
 * Secret keys stay on the server (see server/utils/runtime.ts).
 */
export function usePublicRuntime() {
  const config = useRuntimeConfig()

  return {
    appUrl: computed(() => config.public.appUrl || "http://localhost:3000"),
    supabaseUrl: computed(() => config.public.supabaseUrl),
    supabaseAnonKey: computed(() => config.public.supabaseAnonKey),
    stripePublishableKey: computed(() => config.public.stripePublishableKey),
  }
}
