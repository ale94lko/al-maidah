/**
 * Persists the guest's active order so status can be reopened after closing the browser.
 * Uses localStorage (survives tab close); scoped per restaurant slug.
 */

export const ACTIVE_ORDER_STORAGE_PREFIX = "al-maidah-active-order:"

export interface ActiveGuestOrder {
  slug: string
  orderId: string
  accessToken: string
  tableNumber: number | null
}

function storageKey(slug: string) {
  return `${ACTIVE_ORDER_STORAGE_PREFIX}${slug}`
}

function isActiveGuestOrder(value: unknown): value is ActiveGuestOrder {
  if (!value || typeof value !== "object") {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    typeof row.slug === "string" &&
    typeof row.orderId === "string" &&
    typeof row.accessToken === "string" &&
    row.slug.length > 0 &&
    row.orderId.length > 0 &&
    row.accessToken.length > 0 &&
    (row.tableNumber === null ||
      (typeof row.tableNumber === "number" &&
        Number.isInteger(row.tableNumber) &&
        row.tableNumber > 0))
  )
}

export function useActiveOrder() {
  const active = useState<ActiveGuestOrder | null>("guest-active-order", () => null)

  function readStorage(slug: string): ActiveGuestOrder | null {
    if (!import.meta.client || !slug) {
      return null
    }
    try {
      const raw = window.localStorage.getItem(storageKey(slug))
      if (!raw) {
        return null
      }
      const parsed: unknown = JSON.parse(raw)
      if (!isActiveGuestOrder(parsed) || parsed.slug !== slug) {
        return null
      }
      return parsed
    } catch {
      return null
    }
  }

  function saveActiveOrder(next: ActiveGuestOrder) {
    active.value = next
    if (!import.meta.client) {
      return
    }
    window.localStorage.setItem(storageKey(next.slug), JSON.stringify(next))
  }

  function loadActiveOrder(slug: string) {
    const stored = readStorage(slug)
    active.value = stored
    return stored
  }

  function clearActiveOrder(slug: string) {
    if (active.value?.slug === slug) {
      active.value = null
    }
    if (!import.meta.client) {
      return
    }
    window.localStorage.removeItem(storageKey(slug))
  }

  return {
    active,
    saveActiveOrder,
    loadActiveOrder,
    clearActiveOrder,
  }
}
