/**
 * Persists the guest venue slug + open table visit for cart/checkout across reloads.
 */

export const GUEST_SESSION_STORAGE_KEY = "al-maidah-guest-session"

export interface GuestSession {
  slug: string
  tableNumber: number
  tableId: string
  /** Open visit token from ?session= (staff QR). */
  sessionToken: string
  restaurantName: string
}

function isGuestSession(value: unknown): value is GuestSession {
  if (!value || typeof value !== "object") {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    typeof row.slug === "string" &&
    row.slug.length > 0 &&
    typeof row.tableNumber === "number" &&
    Number.isInteger(row.tableNumber) &&
    row.tableNumber > 0 &&
    typeof row.tableId === "string" &&
    typeof row.sessionToken === "string" &&
    /^[a-f0-9]{64}$/.test(row.sessionToken) &&
    typeof row.restaurantName === "string"
  )
}

export function useGuestSession() {
  const session = useState<GuestSession | null>("guest-session", () => null)

  function readStorage(): GuestSession | null {
    if (!import.meta.client) {
      return null
    }
    try {
      const raw = window.sessionStorage.getItem(GUEST_SESSION_STORAGE_KEY)
      if (!raw) {
        return null
      }
      const parsed: unknown = JSON.parse(raw)
      return isGuestSession(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  function writeStorage(next: GuestSession | null) {
    if (!import.meta.client) {
      return
    }
    if (!next) {
      window.sessionStorage.removeItem(GUEST_SESSION_STORAGE_KEY)
      return
    }
    window.sessionStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(next))
  }

  function loadFromStorage() {
    const stored = readStorage()
    session.value = stored
    return stored
  }

  function saveSession(next: GuestSession) {
    session.value = next
    writeStorage(next)
  }

  function clearSession() {
    session.value = null
    writeStorage(null)
  }

  /** Prefer ?session=<token> for this slug; otherwise reuse a stored open visit. */
  function resolveSessionToken(
    slug: string,
    queryToken: string | null,
  ): string | null {
    if (queryToken) {
      return queryToken
    }
    const stored = session.value ?? readStorage()
    if (stored && stored.slug === slug) {
      return stored.sessionToken
    }
    return null
  }

  return {
    session,
    loadFromStorage,
    saveSession,
    clearSession,
    resolveSessionToken,
  }
}
