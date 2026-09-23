import type { Session, User } from "@supabase/supabase-js"

export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useState<User | null>("auth-user", () => null)
  const session = useState<Session | null>("auth-session", () => null)
  const loading = useState("auth-loading", () => true)

  async function refreshSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      user.value = null
      session.value = null
      loading.value = false
      return null
    }
    session.value = data.session
    user.value = data.session?.user ?? null
    loading.value = false
    return data.session
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      throw error
    }
    session.value = data.session
    user.value = data.user
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

      if (response.session) {
        await supabase.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        })
        session.value = response.session
        user.value = response.session.user
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
    await supabase.auth.signOut()
    session.value = null
    user.value = null
  }

  async function accessToken() {
    const current = await refreshSession()
    return current?.access_token ?? null
  }

  return {
    user,
    session,
    loading,
    refreshSession,
    signIn,
    signUp,
    signOut,
    accessToken,
  }
}
