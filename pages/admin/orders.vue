<script setup lang="ts">
import type { PublicReceipt } from "~/types"

definePageMeta({
  layout: "admin",
})

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

const restaurants = ref<MeResponse["restaurants"]>([])
const restaurantId = ref<string | null>(null)
const restaurantTrn = ref<string | null>(null)
const orders = ref<OrderSummary[]>([])
const receipt = ref<PublicReceipt | null>(null)
const selectedOrderId = ref<string | null>(null)
const loading = ref(true)
const markingPaid = ref(false)
const errorMessage = ref("")

const settingsPath = computed(() => "/admin/settings")

const canMarkCashPaid = computed(
  () =>
    receipt.value?.payment_method === "cash_at_table" &&
    receipt.value?.payment_status === "pending",
)

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
  }>(`/api/admin/orders/${encodeURIComponent(id)}`, { headers })
  restaurantTrn.value = result.restaurant.trn
  orders.value = result.orders
}

async function openReceipt(orderId: string) {
  if (!restaurantId.value) {
    return
  }
  selectedOrderId.value = orderId
  errorMessage.value = ""
  try {
    const result = await $fetch<{ receipt: PublicReceipt }>(
      `/api/admin/orders/${encodeURIComponent(restaurantId.value)}/${encodeURIComponent(orderId)}`,
      { headers: await authHeaders() },
    )
    receipt.value = result.receipt
  } catch (error) {
    receipt.value = null
    errorMessage.value =
      error instanceof Error ? error.message : t("admin.receiptLoadError")
  }
}

async function markCashPaid() {
  if (!restaurantId.value || !selectedOrderId.value || !canMarkCashPaid.value) {
    return
  }
  markingPaid.value = true
  errorMessage.value = ""
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
    errorMessage.value =
      error instanceof Error ? error.message : t("admin.markCashPaidError")
  } finally {
    markingPaid.value = false
  }
}

async function bootstrap() {
  loading.value = true
  errorMessage.value = ""
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
    errorMessage.value =
      error instanceof Error ? error.message : t("admin.receiptLoadError")
  } finally {
    loading.value = false
  }
}

async function onRestaurantChange(event: Event) {
  restaurantId.value = (event.target as HTMLSelectElement).value
  receipt.value = null
  selectedOrderId.value = null
  if (restaurantId.value) {
    await loadOrders(restaurantId.value)
  }
}

onMounted(async () => {
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
</script>

<template>
  <div>
    <header class="admin-page-hero">
      <div>
        <p class="eyebrow">{{ t("admin.owner") }}</p>
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
      v-if="!loading && !restaurantTrn"
      class="mt-6 rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-amber-950"
    >
      <p class="font-semibold">{{ t("admin.trnMissingTitle") }}</p>
      <p class="mt-1 text-sm leading-relaxed">{{ t("admin.trnMissingHint") }}</p>
      <NuxtLink
        :to="settingsPath"
        class="mt-2 inline-flex text-sm font-semibold underline"
      >
        {{ t("admin.addTrn") }}
      </NuxtLink>
    </div>

    <AppLoadingState
      v-if="loading"
      class="mt-8"
      :label="t('admin.loadingOwner')"
    />
    <p v-else-if="errorMessage" class="mt-6 text-sm text-rose-700">
      {{ errorMessage }}
    </p>
    <div v-else class="mt-6 grid gap-6 lg:grid-cols-2">
      <div class="space-y-2">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {{ t("admin.recentOrders") }}
        </h2>
        <AppEmptyState
          v-if="!orders.length"
          :title="t('admin.ordersEmpty')"
          :description="t('admin.ordersEmptyHint')"
        />
        <ul v-else class="space-y-2">
          <li v-for="order in orders" :key="order.id">
            <button
              type="button"
              class="w-full rounded-2xl border px-4 py-3 text-start transition"
              :class="
                selectedOrderId === order.id
                  ? 'border-[var(--herb)] bg-[var(--herb)] text-[var(--ivory)]'
                  : 'border-[var(--espresso)]/10 bg-[var(--surface)] text-[var(--espresso)] hover:border-[var(--espresso)]/30'
              "
              @click="openReceipt(order.id)"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-semibold">
                  <template v-if="order.table_number != null">
                    {{ t("guest.table", { n: order.table_number }) }}
                  </template>
                  <template v-else>
                    {{ t("admin.orderLabel") }}
                  </template>
                </span>
                <span class="font-mono text-sm">
                  {{ t("guest.priceAed", { price: order.total }) }}
                </span>
              </div>
              <p
                class="mt-1 text-xs"
                :class="
                  selectedOrderId === order.id
                    ? 'text-[var(--ivory)]/70'
                    : 'text-[var(--muted)]'
                "
              >
                {{ formatWhen(order.created_at) }}
                · {{ paymentStatusLabel(order.payment_status) }}
              </p>
            </button>
          </li>
        </ul>
      </div>

      <div class="space-y-4">
        <OrderReceipt
          v-if="receipt"
          :receipt="receipt"
          :show-trn-prompt="true"
          :settings-path="settingsPath"
        />
        <p v-else class="text-sm text-[var(--muted)]">
          {{ t("admin.selectOrderForReceipt") }}
        </p>
        <div
          v-if="canMarkCashPaid"
          class="rounded-2xl border border-[var(--espresso)]/15 bg-[var(--surface)] px-4 py-3"
        >
          <p class="text-sm leading-relaxed text-[var(--muted)]">
            {{ t("admin.markCashPaidHint") }}
          </p>
          <button
            type="button"
            class="btn-success mt-3 disabled:opacity-60"
            :disabled="markingPaid"
            @click="markCashPaid"
          >
            {{
              markingPaid ? t("admin.markingCashPaid") : t("admin.markCashPaid")
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
