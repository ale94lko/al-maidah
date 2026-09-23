/**
 * Persists the guest venue slug + table for cart/checkout across reloads.
 * Keys are scoped per restaurant slug in sessionStorage.
 */

export const GUEST_SESSION_STORAGE_KEY = "al-maidah-guest-session"

export interface GuestSession {
  slug: string
  tableNumber: number
  tableId: string
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

  /** Prefer ?table= for this slug; otherwise reuse a stored session for the same slug. */
  function resolveTableNumber(
    slug: string,
    queryTable: number | null,
  ): number | null {
    if (queryTable != null) {
      return queryTable
    }
    const stored = session.value ?? readStorage()
    if (stored && stored.slug === slug) {
      return stored.tableNumber
    }
    return null
  }

  return {
    session,
    loadFromStorage,
    saveSession,
    clearSession,
    resolveTableNumber,
  }
}
