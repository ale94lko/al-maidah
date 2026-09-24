import type { Session, User } from "@supabase/supabase-js"
import { isSuperAdminUser, setSuperadminCookie } from "~/utils/roles"

export type AuthMeResponse = {
  user: { id: string; email?: string }
  is_superadmin: boolean
  restaurants: Array<{
    id: string
    name: string
    slug: string
    trn?: string | null
    currency?: string
    created_at?: string
    updated_at?: string
  }>
}

/**
 * Owner auth helpers. Safe to call during SSR: session state is read/written
 * only in the browser, where the Supabase anon client exists.
 */
export function useAuth() {
  const user = useState<User | null>("auth-user", () => null)
  const session = useState<Session | null>("auth-session", () => null)
  const loading = useState("auth-loading", () => true)
  const isSuperadmin = useState<boolean | null>("auth-is-superadmin", () => null)

  function browserClient() {
    return useSupabaseClient()
  }

  async function refreshSession() {
    if (import.meta.server) {
      loading.value = false
      return null
    }
    const { data, error } = await browserClient().auth.getSession()
    if (error) {
      user.value = null
      session.value = null
      isSuperadmin.value = null
      loading.value = false
      return null
    }
    session.value = data.session
    user.value = data.session?.user ?? null
    loading.value = false
    return data.session
  }

  async function fetchMe(): Promise<AuthMeResponse | null> {
    const token = await accessToken()
    if (!token) {
      isSuperadmin.value = null
      setSuperadminCookie(false)
      return null
    }
    const me = await $fetch<AuthMeResponse>("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
    isSuperadmin.value = !!me.is_superadmin
    setSuperadminCookie(!!me.is_superadmin)
    return me
  }

  async function signIn(email: string, password: string) {
    if (import.meta.server) {
      throw new Error("Sign in is only available in the browser")
    }
    const { data, error } = await browserClient().auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      throw error
    }
    session.value = data.session
    user.value = data.user
    isSuperadmin.value = isSuperAdminUser(data.user)
    return data
  }

  async function signUp(payload: {
    email: string
    password: string
    restaurantName: string
    slug?: string
    trn?: string
  }) {
    try {
      const response = await $fetch<{
        user: { id: string; email?: string }
        restaurant: { id: string; slug: string; name: string }
        session: Session | null
      }>("/api/auth/signup", {
        method: "POST",
        body: payload,
      })

      if (response.session && import.meta.client) {
        await browserClient().auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        })
        session.value = response.session
        user.value = response.session.user
        isSuperadmin.value = false
        setSuperadminCookie(false)
      }

      return response
    } catch (error) {
      const message =
        typeof error === "object" &&
        error &&
        "data" in error &&
        typeof (error as { data?: { statusMessage?: string } }).data
          ?.statusMessage === "string"
          ? (error as { data: { statusMessage: string } }).data.statusMessage
          : error instanceof Error
            ? error.message
            : "Could not create account"
      throw new Error(message)
    }
  }

  async function signOut() {
    if (import.meta.client) {
      await browserClient().auth.signOut()
    }
    session.value = null
    user.value = null
    isSuperadmin.value = null
    setSuperadminCookie(false)
  }

  async function accessToken() {
    const current = await refreshSession()
    return current?.access_token ?? null
  }

  return {
    user,
    session,
    loading,
    isSuperadmin,
    refreshSession,
    fetchMe,
    signIn,
    signUp,
    signOut,
    accessToken,
  }
}
