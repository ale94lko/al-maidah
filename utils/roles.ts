import type { User } from "@supabase/supabase-js"

export const SUPERADMIN_ROLE = "superadmin"

export function isSuperAdminUser(user: User | null | undefined): boolean {
  if (!user) {
    return false
  }
  return user.app_metadata?.role === SUPERADMIN_ROLE
}

export function postLoginPath(user: User | null | undefined): string {
  return isSuperAdminUser(user) ? "/superadmin" : "/admin/orders"
}
