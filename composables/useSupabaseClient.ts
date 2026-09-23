import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let browserClient: SupabaseClient | null = null

/**
 * Browser / universal Supabase client using only the anon key.
 * Never reads the service role key.
 */
export function useSupabaseClient(): SupabaseClient {
  if (import.meta.server) {
    throw new Error(
      "useSupabaseClient() is for the browser. Use the server Supabase helper instead.",
    )
  }

  if (browserClient) {
    return browserClient
  }

  const { supabaseUrl, supabaseAnonKey } = usePublicRuntime()
  const url = supabaseUrl.value
  const anonKey = supabaseAnonKey.value

  if (!url || !anonKey) {
    throw new Error(
      "Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SUPABASE_ANON_KEY",
    )
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return browserClient
}
