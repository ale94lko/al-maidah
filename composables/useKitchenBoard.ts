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

/**
 * Loads the kitchen board for the signed-in owner's restaurant,
 * keeps it fresh via Realtime plus a light poll fallback.
 */
export function useKitchenBoard() {
  const { accessToken, refreshSession } = useAuth()
  const supabase = useSupabaseClient()

  const restaurants = ref<MeResponse["restaurants"]>([])
  const restaurantId = ref<string | null>(null)
  const tickets = ref<KitchenTicket[]>([])
  const loading = ref(true)
  const errorMessage = ref("")
  const busyId = ref<string | null>(null)
  const nowMs = ref(Date.now())

  let channel: ReturnType<typeof supabase.channel> | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let clockTimer: ReturnType<typeof setInterval> | null = null
  let knownIds = new Set<string>()

  const pending = computed(() =>
    tickets.value.filter((ticket) => ticket.status === "pending"),
  )
  const preparing = computed(() =>
    tickets.value.filter((ticket) => ticket.status === "in_preparation"),
  )
  const ready = computed(() =>
    tickets.value.filter((ticket) => ticket.status === "ready"),
  )

  function playNewTicketSound() {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AudioCtx) {
        return
      }
      const ctx = new AudioCtx()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = "sine"
      oscillator.frequency.value = 880
      gain.gain.value = 0.08
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
      oscillator.stop(ctx.currentTime + 0.4)
      window.setTimeout(() => {
        void ctx.close()
      }, 500)
    } catch {
      // Audio is optional on kitchen tablets.
    }
  }

  async function authHeaders() {
    const token = await accessToken()
    if (!token) {
      throw new Error("Not signed in")
    }
    return { Authorization: `Bearer ${token}` }
  }

  async function loadTickets(options?: { announceNew?: boolean }) {
    if (!restaurantId.value) {
      return
    }
    const headers = await authHeaders()
    const response = await $fetch<KitchenListResponse>("/api/kitchen/orders", {
      query: { restaurantId: restaurantId.value },
      headers,
    })
    const next = response.tickets ?? []
    if (options?.announceNew) {
      const fresh = next.filter((ticket) => !knownIds.has(ticket.id))
      if (fresh.length > 0 && knownIds.size > 0) {
        playNewTicketSound()
      }
    }
    knownIds = new Set(next.map((ticket) => ticket.id))
    tickets.value = next
  }

  function subscribeRealtime() {
    if (!restaurantId.value) {
      return
    }
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
    if (channel) {
      void supabase.removeChannel(channel)
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
    bootstrap,
    selectRestaurant,
    transition,
    elapsedMinutes,
    ticketsFor,
    dispose,
    reload: () => loadTickets({ announceNew: true }),
  }
}
