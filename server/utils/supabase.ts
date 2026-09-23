import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Server-only Supabase client with the service role key.
 * Lives under server/ so Nuxt never ships it to the browser bundle.
 */
export function createServiceRoleClient(): SupabaseClient {
  if (import.meta.client) {
    throw new Error(
      "createServiceRoleClient() must not run in the browser",
    )
  }

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const serviceRoleKey = config.supabaseServiceRoleKey

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
