import type { CartItem, SelectedModifierOption } from "~/types"
import {
  cartItemCount,
  cartLineKey,
  cartSubtotal,
  computeUnitPrice,
} from "~/utils/cart"

export const CART_STORAGE_PREFIX = "al-maidah-cart:"

function storageKey(slug: string, tableId: string) {
  return `${CART_STORAGE_PREFIX}${slug}:${tableId}`
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") {
    return false
  }
  const row = value as Record<string, unknown>
  return (
    typeof row.menu_item_id === "string" &&
    typeof row.name_en === "string" &&
    typeof row.name_ar === "string" &&
    typeof row.unit_price === "string" &&
    typeof row.quantity === "number" &&
    Number.isInteger(row.quantity) &&
    row.quantity > 0 &&
    typeof row.notes === "string" &&
    Array.isArray(row.selected_options)
  )
}

function readCart(slug: string, tableId: string): CartItem[] {
  if (!import.meta.client) {
    return []
  }
  try {
    const raw = window.sessionStorage.getItem(storageKey(slug, tableId))
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isCartItem)
  } catch {
    return []
  }
}

function writeCart(slug: string, tableId: string, items: CartItem[]) {
  if (!import.meta.client) {
    return
  }
  const key = storageKey(slug, tableId)
  if (items.length === 0) {
    window.sessionStorage.removeItem(key)
    return
  }
  window.sessionStorage.setItem(key, JSON.stringify(items))
}

/**
 * Guest cart scoped to the pinned table session. Survives reload via sessionStorage.
 */
export function useCart() {
  const { session, loadFromStorage } = useGuestSession()
  const items = useState<CartItem[]>("guest-cart-items", () => [])
  const boundKey = useState<string | null>("guest-cart-bound-key", () => null)

  function currentScope(): { slug: string; tableId: string } | null {
    const active = session.value ?? loadFromStorage()
    if (!active?.slug || !active.tableId) {
      return null
    }
    return { slug: active.slug, tableId: active.tableId }
  }

  function syncFromStorage() {
    const scope = currentScope()
    if (!scope) {
      items.value = []
      boundKey.value = null
      return
    }
    const key = storageKey(scope.slug, scope.tableId)
    if (boundKey.value === key && items.value.length > 0) {
      // Already bound; still refresh if storage was written elsewhere in same tab via other means.
    }
    items.value = readCart(scope.slug, scope.tableId)
    boundKey.value = key
  }

  function persist() {
    const scope = currentScope()
    if (!scope) {
      return
    }
    writeCart(scope.slug, scope.tableId, items.value)
    boundKey.value = storageKey(scope.slug, scope.tableId)
  }

  function ensureBound() {
    const scope = currentScope()
    if (!scope) {
      items.value = []
      boundKey.value = null
      return false
    }
    const key = storageKey(scope.slug, scope.tableId)
    if (boundKey.value !== key) {
      items.value = readCart(scope.slug, scope.tableId)
      boundKey.value = key
    }
    return true
  }

  function addItem(input: {
    menu_item_id: string
    name_en: string
    name_ar: string
    base_price: string
    quantity?: number
    notes?: string
    selected_options: SelectedModifierOption[]
  }) {
    if (!ensureBound()) {
      return false
    }

    const quantity = Math.max(1, Math.floor(input.quantity ?? 1))
    const notes = (input.notes ?? "").trim()
    const selected_options = [...input.selected_options]
    const unit_price = computeUnitPrice(input.base_price, selected_options)
    const next: CartItem = {
      menu_item_id: input.menu_item_id,
      name_en: input.name_en,
      name_ar: input.name_ar,
      unit_price,
      quantity,
      notes,
      selected_options,
    }
    const key = cartLineKey(next)
    const existingIndex = items.value.findIndex((item) => cartLineKey(item) === key)

    if (existingIndex >= 0) {
      const existing = items.value[existingIndex]
      if (!existing) {
        items.value = [...items.value, next]
      } else {
        items.value = items.value.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        )
      }
    } else {
      items.value = [...items.value, next]
    }

    persist()
    return true
  }

  function setQuantity(lineKey: string, quantity: number) {
    if (!ensureBound()) {
      return
    }
    const nextQty = Math.floor(quantity)
    if (nextQty <= 0) {
      removeLine(lineKey)
      return
    }
    items.value = items.value.map((item) =>
      cartLineKey(item) === lineKey ? { ...item, quantity: nextQty } : item,
    )
    persist()
  }

  function removeLine(lineKey: string) {
    if (!ensureBound()) {
      return
    }
    items.value = items.value.filter((item) => cartLineKey(item) !== lineKey)
    persist()
  }

  function clearCart() {
    items.value = []
    const scope = currentScope()
    if (scope) {
      writeCart(scope.slug, scope.tableId, [])
    }
  }

  const itemCount = computed(() => cartItemCount(items.value))
  const subtotal = computed(() => cartSubtotal(items.value))
  const isEmpty = computed(() => items.value.length === 0)

  return {
    items,
    itemCount,
    subtotal,
    isEmpty,
    syncFromStorage,
    addItem,
    setQuantity,
    removeLine,
    clearCart,
    cartLineKey,
  }
}
