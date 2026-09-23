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
const errorMessage = ref("")

const settingsPath = computed(() => "/admin/settings")

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
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-stone-900">
          {{ t("admin.ordersTitle") }}
        </h1>
        <p class="mt-2 text-sm text-stone-600">
          {{ t("admin.ordersHint") }}
        </p>
      </div>
      <label
        v-if="restaurants.length > 1"
        class="flex flex-col gap-1 text-xs text-stone-500"
      >
        {{ t("admin.restaurant") }}
        <select
          class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
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
    </div>

    <div
      v-if="!loading && !restaurantTrn"
      class="mt-6 rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-amber-950"
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
    <p v-else-if="errorMessage" class="mt-6 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <div v-else class="mt-6 grid gap-6 lg:grid-cols-2">
      <div class="space-y-2">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-stone-500">
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
              class="w-full rounded-xl border px-4 py-3 text-start transition"
              :class="
                selectedOrderId === order.id
                  ? 'border-teal-900 bg-teal-950 text-white'
                  : 'border-teal-900/10 bg-white/80 text-stone-900 hover:border-teal-900/30'
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
                    ? 'text-white/70'
                    : 'text-stone-500'
                "
              >
                {{ formatWhen(order.created_at) }}
                · {{ order.payment_status }}
              </p>
            </button>
          </li>
        </ul>
      </div>

      <div>
        <OrderReceipt
          v-if="receipt"
          :receipt="receipt"
          :show-trn-prompt="true"
          :settings-path="settingsPath"
        />
        <p v-else class="text-sm text-stone-500">
          {{ t("admin.selectOrderForReceipt") }}
        </p>
      </div>
    </div>
  </div>
</template>
