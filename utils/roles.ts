export const SUPERADMIN_COOKIE = "alma_is_superadmin"
export const SUPERADMIN_ROLE = "superadmin"

import type { User } from "@supabase/supabase-js"

/**
 * Platform superadmin detection. Prefer app_role; keep legacy app_metadata.role.
 */
export function isSuperAdminUser(user: User | null | undefined): boolean {
  if (!user) {
    return false
  }
  const meta = user.app_metadata ?? {}
  return (
    meta.app_role === SUPERADMIN_ROLE || meta.role === SUPERADMIN_ROLE
  )
}

export function postLoginPath(user: User | null | undefined): string {
  return isSuperAdminUser(user) ? "/superadmin" : "/admin"
}

export function setSuperadminCookie(isSuperadmin: boolean) {
  if (!import.meta.client) {
    return
  }
  const maxAge = 60 * 60 * 24 * 30
  if (isSuperadmin) {
    document.cookie = `${SUPERADMIN_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  } else {
    document.cookie = `${SUPERADMIN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  }
}
