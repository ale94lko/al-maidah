<script setup lang="ts">
import type { OrderStatus, PublicOrder } from "~/types"
import { parseSessionToken } from "~/utils/session-token"
import type { ActiveGuestOrder } from "~/composables/useActiveOrder"

definePageMeta({
  layout: "client",
})

const route = useRoute()
const { setShell } = useClientShell()
const { loadFromStorage, session } = useGuestSession()
const { loadActiveOrders } = useActiveOrder()
const { t } = useAppI18n()

const slug = computed(() => String(route.params.slug || ""))
const loading = ref(true)

type OrderRow = ActiveGuestOrder & {
  status: OrderStatus | null
  total: string | null
  restaurantName: string | null
}

const rows = ref<OrderRow[]>([])

const menuPath = computed(() => {
  const visit =
    parseSessionToken(route.query.session) ?? session.value?.sessionToken ?? null
  const query: Record<string, string> = {}
  if (visit) {
    query.session = visit
  }
  return {
    path: `/m/${slug.value}`,
    query,
  }
})

function statusLabel(status: OrderStatus | null) {
  if (!status) {
    return t("guest.viewOrder")
  }
  if (status === "cancelled") {
    return t("guest.statusCancelled")
  }
  if (status === "completed" || status === "ready") {
    return t("guest.statusReady")
  }
  if (status === "in_preparation") {
    return t("guest.statusPreparing")
  }
  return t("guest.statusReceived")
}

function shortId(orderId: string) {
  return orderId.slice(0, 8).toUpperCase()
}

function statusPath(row: ActiveGuestOrder) {
  const visit =
    parseSessionToken(route.query.session) ?? session.value?.sessionToken ?? null
  const query: Record<string, string> = {
    token: row.accessToken,
  }
  if (visit) {
    query.session = visit
  }
  return {
    path: `/m/${slug.value}/status/${row.orderId}`,
    query,
  }
}

async function loadRows() {
  const list = loadActiveOrders(slug.value)
  if (!list.length) {
    rows.value = []
    loading.value = false
    return
  }

  const settled = await Promise.all(
    list.map(async (entry) => {
      try {
        const result = await $fetch<{ order: PublicOrder }>(
          `/api/orders/${encodeURIComponent(entry.orderId)}`,
          {
            query: {
              slug: slug.value,
              token: entry.accessToken,
            },
          },
        )
        return {
          ...entry,
          status: result.order.status,
          total: result.order.total,
          restaurantName: result.order.restaurant_name,
          tableNumber: result.order.table_number ?? entry.tableNumber,
        } satisfies OrderRow
      } catch {
        return {
          ...entry,
          status: null,
          total: null,
          restaurantName: null,
        } satisfies OrderRow
      }
    }),
  )

  rows.value = settled
  const first = settled.find((row) => row.restaurantName || row.tableNumber != null)
  if (first) {
    setShell({
      venueName:
        first.restaurantName ||
        session.value?.restaurantName ||
        slug.value,
      tableNumber: first.tableNumber,
    })
  }
  loading.value = false
}

onMounted(async () => {
  loadFromStorage()
  const active = session.value
  if (active) {
    setShell({
      venueName: active.restaurantName,
      tableNumber: active.tableNumber,
    })
  }
  await loadRows()
})
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
        {{ t("guest.yourOrders") }}
      </p>
      <h1 class="font-display text-2xl font-bold text-[var(--navy)]">
        {{ t("guest.ordersTitle") }}
      </h1>
      <p class="text-sm text-[var(--muted)]">
        {{ t("guest.ordersHint") }}
      </p>
    </div>

    <AppLoadingState v-if="loading" :label="t('common.loading')" />

    <div
      v-else-if="!rows.length"
      class="surface-card space-y-3 !p-5 text-center"
    >
      <p class="text-sm text-[var(--muted)]">
        {{ t("guest.ordersEmpty") }}
      </p>
      <NuxtLink :to="menuPath" class="btn-primary inline-flex">
        {{ t("guest.backToMenu") }}
      </NuxtLink>
    </div>

    <ul v-else class="space-y-3">
      <li v-for="row in rows" :key="row.orderId">
        <NuxtLink
          :to="statusPath(row)"
          class="surface-card flex items-center justify-between gap-3 !p-4 transition hover:border-[var(--navy)]/20"
        >
          <div class="min-w-0 space-y-1">
            <p class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              #{{ shortId(row.orderId) }}
            </p>
            <p class="truncate text-sm font-bold text-[var(--navy)]">
              {{ statusLabel(row.status) }}
            </p>
            <p v-if="row.tableNumber != null" class="text-xs text-[var(--muted)]">
              {{ t("guest.table", { n: row.tableNumber }) }}
            </p>
          </div>
          <div class="shrink-0 text-end">
            <p
              v-if="row.total"
              class="font-mono text-sm font-bold text-[var(--navy)]"
            >
              {{ t("guest.priceAed", { price: row.total }) }}
            </p>
            <p class="text-xs font-bold text-[var(--info)]">
              {{ t("guest.trackOrder") }}
            </p>
          </div>
        </NuxtLink>
      </li>
    </ul>

    <NuxtLink :to="menuPath" class="btn-secondary">
      {{ t("guest.backToMenu") }}
    </NuxtLink>
  </div>
</template>
