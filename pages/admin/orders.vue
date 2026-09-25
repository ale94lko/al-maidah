<script setup lang="ts">
import type { PublicReceipt, StatsRange } from "~/types"
import { extractApiErrorMessage } from "~/utils/errors"

definePageMeta({
  layout: "admin",
})

const PAGE_SIZE = 10
const RANGES: StatsRange[] = ["today", "week", "month", "last_30_days"]

type MeResponse = {
  restaurants: Array<{ id: string; name: string; slug: string; trn: string | null }>
}

type OrderSummary = {
  id: string
  created_at: string
  payment_status: string
  payment_method: string | null
  total: string
  table_number: number | null
  guest_name: string | null
  gateway_reference: string | null
}

const route = useRoute()
const { accessToken, refreshSession } = useAuth()
const { t, locale } = useAppI18n()
const {
  errorOpen,
  errorTitle,
  errorMessage: dialogMessage,
  showError,
  dismissError,
} = useErrorDialog()

const restaurants = ref<MeResponse["restaurants"]>([])
const restaurantId = ref<string | null>(null)
const range = ref<StatsRange>("today")
const orders = ref<OrderSummary[]>([])
const receipt = ref<PublicReceipt | null>(null)
const selectedOrderId = ref<string | null>(null)
const modalOpen = ref(false)
const receiptLoading = ref(false)
const loading = ref(true)
const markingPaid = ref(false)
const page = ref(1)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(orders.value.length / PAGE_SIZE)),
)

const pagedOrders = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return orders.value.slice(start, start + PAGE_SIZE)
})

const canMarkCashPaid = computed(
  () =>
    receipt.value?.payment_method === "cash_at_table" &&
    receipt.value?.payment_status === "pending",
)

const canGoPrev = computed(() => page.value > 1)
const canGoNext = computed(() => page.value < totalPages.value)

function paymentStatusLabel(status: string) {
  if (status === "paid") {
    return t("admin.paymentPaid")
  }
  if (status === "pending") {
    return t("admin.paymentPending")
  }
  return status
}

async function authHeaders() {
  const token = await accessToken()
  if (!token) {
    throw new Error("Not signed in")
  }
  return { Authorization: `Bearer ${token}` }
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(locale.value === "ar" ? "ar-AE" : "en-AE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

async function loadOrders(id: string) {
  const headers = await authHeaders()
  const result = await $fetch<{
    restaurant: { id: string; trn: string | null }
    orders: OrderSummary[]
  }>(`/api/admin/orders/${encodeURIComponent(id)}`, {
    headers,
    query: { range: range.value },
  })
  orders.value = result.orders
  if (page.value > totalPages.value) {
    page.value = totalPages.value
  }
}

function closeModal() {
  modalOpen.value = false
  selectedOrderId.value = null
  receipt.value = null
  receiptLoading.value = false
}

async function openReceipt(orderId: string) {
  if (!restaurantId.value) {
    return
  }
  selectedOrderId.value = orderId
  modalOpen.value = true
  receipt.value = null
  receiptLoading.value = true
  try {
    const result = await $fetch<{ receipt: PublicReceipt }>(
      `/api/admin/orders/${encodeURIComponent(restaurantId.value)}/${encodeURIComponent(orderId)}`,
      { headers: await authHeaders() },
    )
    receipt.value = result.receipt
  } catch (error) {
    receipt.value = null
    showError(
      extractApiErrorMessage(error) || t("admin.receiptLoadError"),
    )
    closeModal()
  } finally {
    receiptLoading.value = false
  }
}

async function markCashPaid() {
  if (!restaurantId.value || !selectedOrderId.value || !canMarkCashPaid.value) {
    return
  }
  markingPaid.value = true
  try {
    const result = await $fetch<{
      alreadyPaid: boolean
      receipt: PublicReceipt
    }>(
      `/api/admin/orders/${encodeURIComponent(restaurantId.value)}/${encodeURIComponent(selectedOrderId.value)}/mark-paid`,
      {
        method: "POST",
        headers: await authHeaders(),
      },
    )
    receipt.value = result.receipt
    await loadOrders(restaurantId.value)
  } catch (error) {
    showError(
      extractApiErrorMessage(error) || t("admin.markCashPaidError"),
    )
  } finally {
    markingPaid.value = false
  }
}

function goPrev() {
  if (canGoPrev.value) {
    page.value -= 1
  }
}

function goNext() {
  if (canGoNext.value) {
    page.value += 1
  }
}

async function onRangeChange(next: StatsRange) {
  range.value = next
  page.value = 1
  closeModal()
  if (restaurantId.value) {
    await loadOrders(restaurantId.value)
  }
}

async function bootstrap() {
  loading.value = true
  try {
    const me = await $fetch<MeResponse>("/api/auth/me", {
      headers: await authHeaders(),
    })
    restaurants.value = me.restaurants
    const fromQuery =
      typeof route.query.restaurantId === "string"
        ? route.query.restaurantId
        : null
    restaurantId.value =
      fromQuery && me.restaurants.some((r) => r.id === fromQuery)
        ? fromQuery
        : (me.restaurants[0]?.id ?? null)
    if (restaurantId.value) {
      await loadOrders(restaurantId.value)
      const orderFromQuery =
        typeof route.query.orderId === "string" ? route.query.orderId : null
      if (orderFromQuery) {
        await openReceipt(orderFromQuery)
      }
    }
  } catch (error) {
    showError(
      extractApiErrorMessage(error) || t("admin.receiptLoadError"),
    )
  } finally {
    loading.value = false
  }
}

async function onRestaurantChange(event: Event) {
  restaurantId.value = (event.target as HTMLSelectElement).value
  closeModal()
  page.value = 1
  if (restaurantId.value) {
    await loadOrders(restaurantId.value)
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && modalOpen.value) {
    closeModal()
  }
}

onMounted(async () => {
  window.addEventListener("keydown", onKeydown)
  const session = await refreshSession()
  if (!session) {
    await navigateTo({
      path: "/admin/login",
      query: { redirect: "/admin/orders" },
    })
    return
  }
  await bootstrap()
})

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown)
})
</script>

<template>
  <div>
    <AppErrorDialog
      :open="errorOpen"
      :title="errorTitle"
      :message="dialogMessage"
      @dismiss="dismissError"
    />

    <header class="admin-page-hero">
      <div>
        <h1>{{ t("admin.ordersTitle") }}</h1>
        <p>{{ t("admin.ordersHint") }}</p>
      </div>
      <label
        v-if="restaurants.length > 1"
        class="flex min-w-[12rem] flex-col gap-1 text-xs font-bold text-[var(--muted)]"
      >
        {{ t("admin.restaurant") }}
        <select
          class="field-input"
          :value="restaurantId ?? undefined"
          @change="onRestaurantChange"
        >
          <option
            v-for="restaurant in restaurants"
            :key="restaurant.id"
            :value="restaurant.id"
          >
            {{ restaurant.name }}
          </option>
        </select>
      </label>
    </header>

    <div
      class="mb-4 inline-flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-sm"
      role="group"
      :aria-label="t('admin.statsRangeLabel')"
    >
      <button
        v-for="option in RANGES"
        :key="option"
        type="button"
        class="rounded-full px-3.5 py-1.5 text-sm font-bold transition"
        :class="
          range === option
            ? 'bg-[var(--navy)] text-white'
            : 'text-[var(--navy)]/70 hover:bg-[var(--paper)]'
        "
        @click="onRangeChange(option)"
      >
        {{ t(`admin.statsRange.${option}`) }}
      </button>
    </div>

    <AppLoadingState
      v-if="loading"
      class="mt-4"
      :label="t('admin.loadingOwner')"
    />
    <div v-else class="mt-2 space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2 class="text-sm font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
          {{ t("admin.recentOrders") }}
        </h2>
        <p
          v-if="orders.length"
          class="text-xs font-semibold text-[var(--muted)]"
        >
          {{ t("admin.ordersPageOf", { page, pages: totalPages }) }}
        </p>
      </div>

      <AppEmptyState
        v-if="!orders.length"
        :title="t('admin.ordersEmpty')"
        :description="t('admin.ordersEmptyHint')"
      />

      <ul v-else class="space-y-2">
        <li v-for="order in pagedOrders" :key="order.id">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--navy)]/10 bg-white px-4 py-3.5 text-start shadow-sm transition hover:border-[var(--navy)]/25 hover:shadow-md"
            @click="openReceipt(order.id)"
          >
            <div class="min-w-0">
              <p class="text-sm font-bold text-[var(--navy)]">
                <template v-if="order.table_number != null">
                  {{ t("guest.table", { n: order.table_number }) }}
                </template>
                <template v-else>
                  {{ t("admin.orderLabel") }}
                </template>
                <span
                  v-if="order.guest_name"
                  class="ms-2 font-normal text-[var(--muted)]"
                >
                  · {{ order.guest_name }}
                </span>
              </p>
              <p class="mt-1 text-xs text-[var(--muted)]">
                {{ formatWhen(order.created_at) }}
                · {{ paymentStatusLabel(order.payment_status) }}
              </p>
            </div>
            <span class="shrink-0 font-mono text-sm font-bold text-[var(--navy)]">
              {{ t("guest.priceAed", { price: order.total }) }}
            </span>
          </button>
        </li>
      </ul>

      <div
        v-if="orders.length > PAGE_SIZE"
        class="flex flex-wrap items-center justify-between gap-3 pt-1"
      >
        <button
          type="button"
          class="table-icon-btn table-icon-btn--neutral !h-auto !w-auto !px-4 !py-2 !text-xs font-bold"
          :disabled="!canGoPrev"
          @click="goPrev"
        >
          {{ t("admin.ordersPrevPage") }}
        </button>
        <p class="text-xs font-semibold text-[var(--muted)]">
          {{ t("admin.ordersPageOf", { page, pages: totalPages }) }}
        </p>
        <button
          type="button"
          class="table-icon-btn table-icon-btn--neutral !h-auto !w-auto !px-4 !py-2 !text-xs font-bold"
          :disabled="!canGoNext"
          @click="goNext"
        >
          {{ t("admin.ordersNextPage") }}
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="modalOpen"
        class="fixed inset-0 z-[70] flex items-end justify-center px-4 py-6 sm:items-center"
        role="dialog"
        aria-modal="true"
        :aria-label="t('guest.receiptTitle')"
      >
        <button
          type="button"
          class="absolute inset-0 bg-[var(--navy)]/45 backdrop-blur-sm"
          :aria-label="t('common.close')"
          @click="closeModal"
        />
        <div
          class="relative z-10 flex max-h-[min(92dvh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--navy)]/10 bg-[var(--paper)] shadow-2xl"
        >
          <div class="flex items-center justify-between gap-3 border-b border-[var(--navy)]/8 bg-white px-4 py-3">
            <h2 class="font-display text-lg font-bold text-[var(--navy)]">
              {{ t("guest.receiptTitle") }}
            </h2>
            <button
              type="button"
              class="table-icon-btn table-icon-btn--neutral !h-9 !w-9"
              :aria-label="t('common.close')"
              @click="closeModal"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <AppLoadingState
              v-if="receiptLoading"
              :label="t('common.loading')"
            />
            <template v-else-if="receipt">
              <OrderReceipt :receipt="receipt" />
              <div
                v-if="canMarkCashPaid"
                class="rounded-2xl border border-[var(--navy)]/10 bg-white px-4 py-3"
              >
                <p class="text-sm leading-relaxed text-[var(--muted)]">
                  {{ t("admin.markCashPaidHint") }}
                </p>
                <button
                  type="button"
                  class="btn-primary mt-3 w-full !rounded-xl disabled:opacity-60"
                  :disabled="markingPaid"
                  @click="markCashPaid"
                >
                  {{
                    markingPaid
                      ? t("admin.markingCashPaid")
                      : t("admin.markCashPaid")
                  }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
