import type { DiningTableWithSession } from "~/types"
import { extractApiErrorMessage } from "~/utils/errors"

type MeResponse = {
  user: { id: string; email?: string }
  restaurants: Array<{ id: string; name: string; slug: string }>
}

type TablesResponse = {
  restaurant: { id: string; name: string; slug: string }
  tables: DiningTableWithSession[]
}

type OpenSessionResponse = {
  restaurant: { id: string; name: string; slug: string }
  table: DiningTableWithSession
  session: { id: string; token: string; opened_at: string; status: string }
  menuUrl: string
}

/**
 * Owner table manager: physical tables + per-visit session QR codes.
 */
export function useAdminTables() {
  const { accessToken, refreshSession } = useAuth()
  const { appUrl } = usePublicRuntime()

  const restaurants = ref<MeResponse["restaurants"]>([])
  const restaurantId = ref<string | null>(null)
  const restaurant = ref<TablesResponse["restaurant"] | null>(null)
  const tables = ref<DiningTableWithSession[]>([])
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

  function menuUrlForSession(sessionToken: string): string {
    const slug = restaurant.value?.slug
    if (!slug || !sessionToken) {
      return ""
    }
    const base = String(appUrl.value || "").replace(/\/$/, "")
    return `${base}/m/${slug}?session=${sessionToken}`
  }

  function menuUrlForTable(tableId: string): string {
    const table = tables.value.find((entry) => entry.id === tableId)
    const token = table?.open_session?.token
    return token ? menuUrlForSession(token) : ""
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
    tables.value = (response.tables ?? []).filter((table) => table.is_active)
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

  async function openSession(tableId: string): Promise<OpenSessionResponse> {
    if (!restaurantId.value) {
      throw new Error("No restaurant selected")
    }
    saving.value = true
    errorMessage.value = ""
    try {
      const headers = await authHeaders()
      const response = await $fetch<OpenSessionResponse>(
        `/api/admin/tables/${restaurantId.value}/${tableId}/open`,
        { method: "POST", headers },
      )
      await loadTables()
      return response
    } catch (error) {
      throw error
    } finally {
      saving.value = false
    }
  }

  async function closeSession(tableId: string) {
    if (!restaurantId.value) {
      return
    }
    saving.value = true
    errorMessage.value = ""
    try {
      const headers = await authHeaders()
      await $fetch(`/api/admin/tables/${restaurantId.value}/${tableId}/close`, {
        method: "POST",
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
    menuUrlForSession,
    bootstrap,
    selectRestaurant,
    createTable,
    renumberTable,
    removeTable,
    openSession,
    closeSession,
    reload: loadTables,
  }
}
