<script setup lang="ts">
import type {
  OrderStatus,
  PublicOrder,
  PublicOrderItem,
  PublicReceipt,
} from "~/types"
import { localizedName } from "~/utils/localize"
import { filsToMoney, moneyToFils } from "~/utils/cart"
import { parseSessionToken } from "~/utils/session-token"

definePageMeta({
  layout: "client",
})

const POLL_MS = 2500

const route = useRoute()
const { setShell } = useClientShell()
const { loadFromStorage, session } = useGuestSession()
const { loadActiveOrder, saveActiveOrder } = useActiveOrder()
const { t, locale } = useAppI18n()

const slug = computed(() => String(route.params.slug || ""))
const orderId = computed(() => String(route.params.orderId || ""))

const loading = ref(true)
const errorMessage = ref("")
const order = ref<PublicOrder | null>(null)
const items = ref<PublicOrderItem[]>([])
const receipt = ref<PublicReceipt | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

const accessToken = computed(() => {
  const fromQuery = route.query.token
  if (typeof fromQuery === "string" && fromQuery) {
    return fromQuery
  }
  return loadActiveOrder(slug.value)?.accessToken || ""
})

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

const kitchenSteps: Array<{
  status: OrderStatus
  labelKey: "guest.statusReceived" | "guest.statusPreparing" | "guest.statusReady"
}> = [
  { status: "pending", labelKey: "guest.statusReceived" },
  { status: "in_preparation", labelKey: "guest.statusPreparing" },
  { status: "ready", labelKey: "guest.statusReady" },
]

const statusRank: Record<OrderStatus, number> = {
  pending: 0,
  in_preparation: 1,
  ready: 2,
  completed: 3,
  cancelled: -1,
}

const currentRank = computed(() =>
  order.value ? statusRank[order.value.status] ?? 0 : 0,
)

const kitchenHeadline = computed(() => {
  if (!order.value) {
    return t("guest.orderPlaced")
  }
  if (order.value.status === "cancelled") {
    return t("guest.statusCancelled")
  }
  if (order.value.status === "completed" || order.value.status === "ready") {
    return t("guest.statusReady")
  }
  if (order.value.status === "in_preparation") {
    return t("guest.statusPreparing")
  }
  return t("guest.statusReceived")
})

const isCash = computed(() => order.value?.payment_method === "cash_at_table")
const isPaid = computed(() => order.value?.payment_status === "paid")
/** Counter and paid bills get a digital receipt. */
const showReceipt = computed(() => isPaid.value || isCash.value)

const statusEyebrow = computed(() => {
  if (isPaid.value) {
    return t("guest.orderPaid")
  }
  if (isCash.value) {
    return t("guest.payCash")
  }
  return t("guest.orderPending")
})

const statusHint = computed(() => {
  if (order.value?.status === "ready") {
    return t("guest.statusReadyHint")
  }
  if (order.value?.status === "in_preparation") {
    return t("guest.statusPreparingHint")
  }
  if (order.value?.status === "cancelled") {
    return t("guest.statusCancelledHint")
  }
  if (isPaid.value) {
    return t("guest.orderPaidHint")
  }
  if (isCash.value) {
    return t("guest.cashKitchenHint")
  }
  return t("guest.statusReceivedHint")
})

function lineAmount(item: PublicOrderItem) {
  return filsToMoney(moneyToFils(item.unit_price) * item.quantity)
}

function stepState(stepStatus: OrderStatus): "done" | "current" | "upcoming" {
  const rank = statusRank[stepStatus]
  if (currentRank.value < 0) {
    return "upcoming"
  }
  if (rank < currentRank.value) {
    return "done"
  }
  if (rank === currentRank.value || (currentRank.value >= 2 && rank === 2)) {
    return "current"
  }
  return "upcoming"
}

async function fetchReceipt() {
  if (!accessToken.value || !orderId.value) {
    receipt.value = null
    return
  }
  try {
    const result = await $fetch<{ receipt: PublicReceipt }>(
      `/api/orders/${encodeURIComponent(orderId.value)}/receipt`,
      {
        query: {
          slug: slug.value,
          token: accessToken.value,
        },
      },
    )
    receipt.value = result.receipt
  } catch {
    receipt.value = null
  }
}

async function fetchOrder(isInitial = false) {
  if (!accessToken.value) {
    errorMessage.value = t("guest.orderTrackingLost")
    if (isInitial) {
      loading.value = false
    }
    return
  }

  try {
    const result = await $fetch<{
      order: PublicOrder
      items: PublicOrderItem[]
    }>(`/api/orders/${encodeURIComponent(orderId.value)}`, {
      query: {
        slug: slug.value,
        token: accessToken.value,
      },
    })
    order.value = result.order
    items.value = result.items
    errorMessage.value = ""
    saveActiveOrder({
      slug: slug.value,
      orderId: result.order.id,
      accessToken: result.order.guest_access_token,
      tableNumber: result.order.table_number,
    })
    if (result.order.table_number != null || result.order.restaurant_name) {
      setShell({
        venueName:
          result.order.restaurant_name ||
          session.value?.restaurantName ||
          slug.value,
        tableNumber: result.order.table_number,
      })
    }
    const paidOrCash =
      result.order.payment_status === "paid" ||
      result.order.payment_method === "cash_at_table"
    if (paidOrCash) {
      await fetchReceipt()
    } else {
      receipt.value = null
    }
  } catch (error: unknown) {
    if (isInitial || !order.value) {
      errorMessage.value =
        error instanceof Error ? error.message : t("guest.menuUnavailable")
      order.value = null
      items.value = []
      receipt.value = null
    }
  } finally {
    if (isInitial) {
      loading.value = false
    }
  }
}

function startLiveUpdates() {
  stopLiveUpdates()
  pollTimer = setInterval(() => {
    void fetchOrder(false)
  }, POLL_MS)
}

function stopLiveUpdates() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  loadFromStorage()
  loadActiveOrder(slug.value)
  const active = session.value
  if (active) {
    setShell({
      venueName: active.restaurantName,
      tableNumber: active.tableNumber,
    })
  }
  await fetchOrder(true)
  if (order.value) {
    startLiveUpdates()
  }
})

onBeforeUnmount(() => {
  stopLiveUpdates()
})
</script>

<template>
  <div>
    <AppLoadingState v-if="loading" :label="t('common.loading')" />
    <AppEmptyState
      v-else-if="errorMessage || !order"
      :title="t('guest.orderNotFound')"
      :description="errorMessage || t('guest.orderNotFoundHint')"
    />
    <div v-else class="space-y-5">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-[var(--citrus-deep)]">
          {{ statusEyebrow }}
        </p>
        <h1 class="font-display mt-1 text-xl font-bold tracking-tight text-[var(--espresso)]">
          {{ kitchenHeadline }}
        </h1>
        <p class="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {{ statusHint }}
        </p>
        <p
          v-if="order.table_number != null"
          class="mt-2 text-sm font-medium text-[var(--herb)]"
        >
          {{ t("guest.tableLabelCheckout", { n: order.table_number }) }}
        </p>
        <p v-if="order.guest_name" class="text-sm text-[var(--muted)]">
          {{ order.guest_name }}
        </p>
      </div>

      <ol class="surface-card space-y-3 !p-4">
        <li
          v-for="step in kitchenSteps"
          :key="step.status"
          class="flex items-center gap-3"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-xs font-bold"
            :class="{
              'bg-[var(--info)] text-white': stepState(step.status) === 'current',
              'bg-[var(--success)]/15 text-[var(--success-deep)]': stepState(step.status) === 'done',
              'bg-[var(--ink)]/5 text-[var(--muted)]': stepState(step.status) === 'upcoming',
            }"
            aria-hidden="true"
          >
            <template v-if="stepState(step.status) === 'done'">✓</template>
            <template v-else>•</template>
          </span>
          <span
            class="text-sm font-semibold"
            :class="
              stepState(step.status) === 'upcoming'
                ? 'text-[var(--muted)]'
                : 'text-[var(--espresso)]'
            "
          >
            {{ t(step.labelKey) }}
          </span>
        </li>
      </ol>

      <template v-if="!(showReceipt && receipt)">
        <ul class="space-y-3">
          <li
            v-for="item in items"
            :key="item.id"
            class="surface-card !p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-[var(--espresso)]">
                  {{ item.quantity }}× {{ localizedName(item, locale) }}
                </p>
                <ul
                  v-if="item.selected_options?.length"
                  class="mt-1 space-y-0.5 text-sm text-[var(--muted)]"
                >
                  <li
                    v-for="option in item.selected_options"
                    :key="option.id"
                  >
                    {{ localizedName(option, locale) }}
                  </li>
                </ul>
              </div>
              <p class="shrink-0 font-mono text-sm text-[var(--herb)]">
                {{ t("guest.priceAed", { price: lineAmount(item) }) }}
              </p>
            </div>
          </li>
        </ul>

        <div class="surface-card space-y-2 !p-4 text-sm">
          <div class="flex justify-between gap-3 text-[var(--ink)]">
            <span>{{ t("guest.subtotal") }}</span>
            <span class="font-mono">{{ t("guest.priceAed", { price: order.subtotal }) }}</span>
          </div>
          <div class="flex justify-between gap-3 text-[var(--ink)]">
            <span>{{ t("guest.vat") }}</span>
            <span class="font-mono">{{ t("guest.priceAed", { price: order.vat }) }}</span>
          </div>
          <div
            class="flex justify-between gap-3 border-t border-[var(--espresso)]/10 pt-2 font-semibold text-[var(--espresso)]"
          >
            <span>{{ t("guest.total") }}</span>
            <span class="font-mono">{{ t("guest.priceAed", { price: order.total }) }}</span>
          </div>
        </div>
      </template>

      <OrderReceipt v-else :receipt="receipt" />

      <NuxtLink
        :to="menuPath"
        class="btn-secondary"
      >
        {{ t("guest.orderSomethingElse") }}
      </NuxtLink>
    </div>
  </div>
</template>
