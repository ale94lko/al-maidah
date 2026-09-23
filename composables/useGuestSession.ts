/**
 * Persists the guest venue slug + table for cart/checkout across reloads.
 * Keys are scoped per restaurant slug in sessionStorage.
 */

export const GUEST_SESSION_STORAGE_KEY = "al-maidah-guest-session"

export interface GuestSession {
  slug: string
  tableNumber: number
  tableId: string
  tableToken: string
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
    typeof row.tableToken === "string" &&
    /^[a-f0-9]{64}$/.test(row.tableToken) &&
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

  /** Prefer ?table=<sha> for this slug; otherwise reuse a stored session for the same slug. */
  function resolveTableToken(
    slug: string,
    queryToken: string | null,
  ): string | null {
    if (queryToken) {
      return queryToken
    }
    const stored = session.value ?? readStorage()
    if (stored && stored.slug === slug) {
      return stored.tableToken
    }
    return null
  }

  return {
    session,
    loadFromStorage,
    saveSession,
    clearSession,
    resolveTableToken,
  }
}
