/**
 * Persists guest order tracking links so status can be reopened after
 * "Order something else" or closing the tab. Scoped per restaurant slug.
 */

export const ACTIVE_ORDER_STORAGE_PREFIX = "al-maidah-active-order:"

export interface ActiveGuestOrder {
  slug: string
  orderId: string
  accessToken: string
  tableNumber: number | null
  /** ISO timestamp used to keep newest orders first. */
  placedAt?: string
}

type StoredOrders = {
  orders: ActiveGuestOrder[]
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
        row.tableNumber > 0)) &&
    (row.placedAt === undefined || typeof row.placedAt === "string")
  )
}

function normalizeList(value: unknown, slug: string): ActiveGuestOrder[] {
  if (!value) {
    return []
  }
  // Legacy single-order shape.
  if (isActiveGuestOrder(value) && value.slug === slug) {
    return [value]
  }
  if (typeof value === "object" && Array.isArray((value as StoredOrders).orders)) {
    return (value as StoredOrders).orders.filter(
      (row) => isActiveGuestOrder(row) && row.slug === slug,
    )
  }
  return []
}

function sortNewestFirst(orders: ActiveGuestOrder[]): ActiveGuestOrder[] {
  return [...orders].sort((a, b) => {
    const aTime = a.placedAt ? Date.parse(a.placedAt) : 0
    const bTime = b.placedAt ? Date.parse(b.placedAt) : 0
    return bTime - aTime
  })
}

export function useActiveOrder() {
  const active = useState<ActiveGuestOrder | null>("guest-active-order", () => null)
  const orders = useState<ActiveGuestOrder[]>("guest-active-orders", () => [])

  function writeStorage(slug: string, next: ActiveGuestOrder[]) {
    if (!import.meta.client || !slug) {
      return
    }
    const sorted = sortNewestFirst(next)
    if (!sorted.length) {
      window.localStorage.removeItem(storageKey(slug))
      return
    }
    const payload: StoredOrders = { orders: sorted }
    window.localStorage.setItem(storageKey(slug), JSON.stringify(payload))
  }

  function readStorage(slug: string): ActiveGuestOrder[] {
    if (!import.meta.client || !slug) {
      return []
    }
    try {
      const raw = window.localStorage.getItem(storageKey(slug))
      if (!raw) {
        return []
      }
      return sortNewestFirst(normalizeList(JSON.parse(raw), slug))
    } catch {
      return []
    }
  }

  function syncState(slug: string, next: ActiveGuestOrder[]) {
    const sorted = sortNewestFirst(next)
    orders.value = sorted
    active.value = sorted[0] ?? null
    writeStorage(slug, sorted)
  }

  function saveActiveOrder(next: ActiveGuestOrder) {
    const existing = readStorage(next.slug)
    const previous = existing.find((row) => row.orderId === next.orderId)
    const withTime: ActiveGuestOrder = {
      ...next,
      placedAt:
        next.placedAt || previous?.placedAt || new Date().toISOString(),
    }
    const rest = existing.filter((row) => row.orderId !== withTime.orderId)
    syncState(withTime.slug, [withTime, ...rest])
  }

  function loadActiveOrders(slug: string) {
    const stored = readStorage(slug)
    orders.value = stored
    active.value = stored[0] ?? null
    return stored
  }

  function loadActiveOrder(slug: string, orderId?: string) {
    const stored = loadActiveOrders(slug)
    if (orderId) {
      return stored.find((row) => row.orderId === orderId) ?? null
    }
    return stored[0] ?? null
  }

  function clearActiveOrder(slug: string, orderId?: string) {
    if (!orderId) {
      syncState(slug, [])
      return
    }
    const remaining = readStorage(slug).filter((row) => row.orderId !== orderId)
    syncState(slug, remaining)
  }

  return {
    active,
    orders,
    saveActiveOrder,
    loadActiveOrder,
    loadActiveOrders,
    clearActiveOrder,
  }
}
