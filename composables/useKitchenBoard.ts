import type { KitchenTicket, KitchenTicketAction, OrderStatus } from "~/types"

type MeResponse = {
  user: { id: string; email?: string }
  restaurants: Array<{ id: string; name: string; slug: string }>
}

type KitchenListResponse = {
  restaurant_id: string
  tickets: KitchenTicket[]
}

const POLL_FALLBACK_MS = 15_000

type KitchenBoardOptions = {
  onNewTickets?: (tickets: KitchenTicket[]) => void
}

/**
 * Loads the kitchen board for the signed-in owner's restaurant,
 * keeps it fresh via Realtime plus a light poll fallback.
 */
export function useKitchenBoard(options: KitchenBoardOptions = {}) {
  const { accessToken, refreshSession } = useAuth()

  const restaurants = ref<MeResponse["restaurants"]>([])
  const restaurantId = ref<string | null>(null)
  const tickets = ref<KitchenTicket[]>([])
  const loading = ref(true)
  const errorMessage = ref("")
  const busyId = ref<string | null>(null)
  const nowMs = ref(Date.now())
  /** When false, new tickets are tracked silently (before Start shift). */
  const alertsEnabled = ref(false)

  type RealtimeChannel = ReturnType<
    ReturnType<typeof useSupabaseClient>["channel"]
  >
  let channel: RealtimeChannel | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let clockTimer: ReturnType<typeof setInterval> | null = null
  let knownIds = new Set<string>()

  function browserSupabase() {
    return useSupabaseClient()
  }

  const pending = computed(() =>
    tickets.value.filter((ticket) => ticket.status === "pending"),
  )
  const preparing = computed(() =>
    tickets.value.filter((ticket) => ticket.status === "in_preparation"),
  )
  const ready = computed(() =>
    tickets.value.filter((ticket) => ticket.status === "ready"),
  )

  async function authHeaders() {
    const token = await accessToken()
    if (!token) {
      throw new Error("Not signed in")
    }
    return { Authorization: `Bearer ${token}` }
  }

  async function loadTickets(optionsLoad?: { announceNew?: boolean }) {
    if (!restaurantId.value) {
      return
    }
    const headers = await authHeaders()
    const response = await $fetch<KitchenListResponse>("/api/kitchen/orders", {
      query: { restaurantId: restaurantId.value },
      headers,
    })
    const next = response.tickets ?? []
    if (optionsLoad?.announceNew && alertsEnabled.value) {
      const fresh = next.filter((ticket) => !knownIds.has(ticket.id))
      if (fresh.length > 0 && knownIds.size > 0) {
        options.onNewTickets?.(fresh)
      }
    }
    knownIds = new Set(next.map((ticket) => ticket.id))
    tickets.value = next
  }

  function subscribeRealtime() {
    if (!restaurantId.value || import.meta.server) {
      return
    }
    const supabase = browserSupabase()
    if (channel) {
      void supabase.removeChannel(channel)
      channel = null
    }
    channel = supabase
      .channel(`kitchen-orders-${restaurantId.value}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId.value}`,
        },
        () => {
          void loadTickets({ announceNew: true }).catch(() => {
            /* keep last good board */
          })
        },
      )
      .subscribe()
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
        tickets.value = []
        return
      }
      if (
        !restaurantId.value ||
        !restaurants.value.some((entry) => entry.id === restaurantId.value)
      ) {
        const first = restaurants.value[0]
        restaurantId.value = first?.id ?? null
      }
      if (!restaurantId.value) {
        tickets.value = []
        return
      }
      await loadTickets()
      subscribeRealtime()
      if (pollTimer) {
        clearInterval(pollTimer)
      }
      pollTimer = setInterval(() => {
        void loadTickets({ announceNew: true }).catch(() => {
          /* keep last good board */
        })
      }, POLL_FALLBACK_MS)
      if (clockTimer) {
        clearInterval(clockTimer)
      }
      clockTimer = setInterval(() => {
        nowMs.value = Date.now()
      }, 30_000)
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Could not open kitchen board"
      throw error
    } finally {
      loading.value = false
    }
  }

  async function selectRestaurant(id: string) {
    restaurantId.value = id
    knownIds = new Set()
    await loadTickets()
    subscribeRealtime()
  }

  /**
   * Arm alerts after Start shift: existing tickets are baseline (no false beep).
   */
  function enableAlerts() {
    knownIds = new Set(tickets.value.map((ticket) => ticket.id))
    alertsEnabled.value = true
  }

  async function transition(ticketId: string, action: KitchenTicketAction) {
    if (!restaurantId.value || busyId.value) {
      return
    }
    busyId.value = ticketId
    errorMessage.value = ""
    try {
      const headers = await authHeaders()
      await $fetch(`/api/kitchen/orders/${ticketId}/transition`, {
        method: "POST",
        headers,
        body: { restaurantId: restaurantId.value, action },
      })
      await loadTickets()
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Could not update ticket"
      throw error
    } finally {
      busyId.value = null
    }
  }

  function elapsedMinutes(createdAt: string): number {
    const created = Date.parse(createdAt)
    if (!Number.isFinite(created)) {
      return 0
    }
    return Math.max(0, Math.floor((nowMs.value - created) / 60_000))
  }

  function ticketsFor(status: OrderStatus) {
    if (status === "pending") {
      return pending.value
    }
    if (status === "in_preparation") {
      return preparing.value
    }
    if (status === "ready") {
      return ready.value
    }
    return []
  }

  function dispose() {
    if (channel && import.meta.client) {
      void browserSupabase().removeChannel(channel)
      channel = null
    }
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    if (clockTimer) {
      clearInterval(clockTimer)
      clockTimer = null
    }
  }

  return {
    restaurants,
    restaurantId,
    tickets,
    pending,
    preparing,
    ready,
    loading,
    errorMessage,
    busyId,
    nowMs,
    alertsEnabled,
    bootstrap,
    selectRestaurant,
    enableAlerts,
    transition,
    elapsedMinutes,
    ticketsFor,
    dispose,
    reload: () => loadTickets({ announceNew: true }),
  }
}
