import type { DiningTable } from "~/types"
import { sha256Hex } from "~/utils/table-token"

type MeResponse = {
  user: { id: string; email?: string }
  restaurants: Array<{ id: string; name: string; slug: string }>
}

type TablesResponse = {
  restaurant: { id: string; name: string; slug: string }
  tables: DiningTable[]
}

import { extractApiErrorMessage } from "~/utils/errors"

/**
 * Owner table manager: CRUD + menu URLs for printable QR codes.
 */
export function useAdminTables() {
  const { accessToken, refreshSession } = useAuth()
  const { appUrl } = usePublicRuntime()

  const restaurants = ref<MeResponse["restaurants"]>([])
  const restaurantId = ref<string | null>(null)
  const restaurant = ref<TablesResponse["restaurant"] | null>(null)
  const tables = ref<DiningTable[]>([])
  const tableTokens = ref<Record<string, string>>({})
  const loading = ref(true)
  const saving = ref(false)
  const errorMessage = ref("")

  async function authHeaders() {
    const token = await accessToken()
    if (!token) {
      throw new Error("Not signed in")
    }
    return { Authorization: `Bearer ${token}` }
  }

  function menuUrlForTable(tableId: string): string {
    const slug = restaurant.value?.slug
    const token = tableTokens.value[tableId]
    if (!slug || !token) {
      return ""
    }
    const base = String(appUrl.value || "").replace(/\/$/, "")
    return `${base}/m/${slug}?table=${token}`
  }

  async function loadTables() {
    if (!restaurantId.value) {
      restaurant.value = null
      tables.value = []
      return
    }
    const headers = await authHeaders()
    const response = await $fetch<TablesResponse>(
      `/api/admin/tables/${restaurantId.value}`,
      { headers },
    )
    restaurant.value = response.restaurant
    const active = (response.tables ?? []).filter((table) => table.is_active)
    const tokens: Record<string, string> = {}
    await Promise.all(
      active.map(async (table) => {
        tokens[table.id] = await sha256Hex(table.id)
      }),
    )
    tableTokens.value = tokens
    tables.value = active
  }

  async function bootstrap() {
    loading.value = true
    errorMessage.value = ""
    try {
      await refreshSession()
      const headers = await authHeaders()
      const me = await $fetch<MeResponse>("/api/auth/me", { headers })
      restaurants.value = me.restaurants ?? []
      if (!restaurants.value.length) {
        restaurantId.value = null
        return
      }
      if (
        !restaurantId.value ||
        !restaurants.value.some((entry) => entry.id === restaurantId.value)
      ) {
        restaurantId.value = restaurants.value[0]?.id ?? null
      }
      await loadTables()
    } catch (error) {
      errorMessage.value = extractApiErrorMessage(error) || "Could not load tables"
      throw error
    } finally {
      loading.value = false
    }
  }

  async function selectRestaurant(id: string) {
    restaurantId.value = id
    await loadTables()
  }

  async function createTable(tableNumber: number, label?: string) {
    if (!restaurantId.value) {
      return
    }
    saving.value = true
    errorMessage.value = ""
    try {
      const headers = await authHeaders()
      await $fetch(`/api/admin/tables/${restaurantId.value}`, {
        method: "POST",
        headers,
        body: { table_number: tableNumber, label: label || null },
      })
      await loadTables()
    } catch (error) {
      throw error
    } finally {
      saving.value = false
    }
  }

  async function renumberTable(tableId: string, tableNumber: number) {
    if (!restaurantId.value) {
      return
    }
    saving.value = true
    errorMessage.value = ""
    try {
      const headers = await authHeaders()
      await $fetch(`/api/admin/tables/${restaurantId.value}/${tableId}`, {
        method: "PATCH",
        headers,
        body: { table_number: tableNumber },
      })
      await loadTables()
    } catch (error) {
      throw error
    } finally {
      saving.value = false
    }
  }

  async function removeTable(tableId: string) {
    if (!restaurantId.value) {
      return
    }
    saving.value = true
    errorMessage.value = ""
    try {
      const headers = await authHeaders()
      await $fetch(`/api/admin/tables/${restaurantId.value}/${tableId}`, {
        method: "DELETE",
        headers,
      })
      await loadTables()
    } catch (error) {
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    restaurants,
    restaurantId,
    restaurant,
    tables,
    loading,
    saving,
    errorMessage,
    menuUrlForTable,
    bootstrap,
    selectRestaurant,
    createTable,
    renumberTable,
    removeTable,
    reload: loadTables,
  }
}
