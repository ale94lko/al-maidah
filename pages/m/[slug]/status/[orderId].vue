<script setup lang="ts">
import type { PublicOrder, PublicOrderItem } from "~/types"
import { localizedName } from "~/utils/localize"
import { filsToMoney, moneyToFils } from "~/utils/cart"

definePageMeta({
  layout: "client",
})

const route = useRoute()
const { setShell } = useClientShell()
const { loadFromStorage, session } = useGuestSession()
const { t, locale } = useAppI18n()

const slug = computed(() => String(route.params.slug || ""))
const orderId = computed(() => String(route.params.orderId || ""))

const loading = ref(true)
const errorMessage = ref("")
const order = ref<PublicOrder | null>(null)
const items = ref<PublicOrderItem[]>([])

const menuPath = computed(() => {
  const table =
    order.value?.table_number ??
    session.value?.tableNumber ??
    (typeof route.query.table === "string" ? Number(route.query.table) : null)
  return {
    path: `/m/${slug.value}`,
    query:
      table != null && Number.isFinite(table)
        ? { table: String(table) }
        : undefined,
  }
})

const payPath = computed(() => ({
  path: `/m/${slug.value}/pay/${orderId.value}`,
  query: menuPath.value.query,
}))

const isCash = computed(() => order.value?.payment_method === "cash_at_table")
const needsOnlinePayment = computed(
  () =>
    Boolean(order.value) &&
    order.value!.payment_status !== "paid" &&
    order.value!.payment_method !== "cash_at_table",
)

const statusHint = computed(() => {
  if (isCash.value) {
    return t("guest.cashKitchenHint")
  }
  if (needsOnlinePayment.value) {
    return t("guest.onlinePendingHint")
  }
  return t("guest.orderStatusHint")
})

function lineAmount(item: PublicOrderItem) {
  return filsToMoney(moneyToFils(item.unit_price) * item.quantity)
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

  try {
    const result = await $fetch<{
      order: PublicOrder
      items: PublicOrderItem[]
    }>(`/api/orders/${encodeURIComponent(orderId.value)}`)
    order.value = result.order
    items.value = result.items
    if (result.order.table_number != null) {
      setShell({
        venueName: active?.restaurantName || slug.value,
        tableNumber: result.order.table_number,
      })
    }
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error ? error.message : t("guest.menuUnavailable")
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <AppLoadingState v-if="loading" :label="t('common.loading')" />
    <AppEmptyState
      v-else-if="errorMessage || !order"
      :title="t('guest.menuUnavailable')"
      :description="errorMessage"
    />
    <div v-else class="space-y-5">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-teal-800/70">
          {{ t("guest.orderPending") }}
        </p>
        <h1 class="mt-1 text-xl font-semibold tracking-tight text-stone-900">
          {{ t("guest.orderPlaced") }}
        </h1>
        <p class="mt-2 text-sm leading-relaxed text-stone-600">
          {{ statusHint }}
        </p>
        <p
          v-if="order.table_number != null"
          class="mt-2 text-sm font-medium text-teal-950"
        >
          {{ t("guest.tableLabelCheckout", { n: order.table_number }) }}
        </p>
        <p v-if="order.guest_name" class="text-sm text-stone-600">
          {{ order.guest_name }}
        </p>
        <NuxtLink
          v-if="needsOnlinePayment"
          :to="payPath"
          class="mt-3 inline-flex rounded-xl bg-teal-950 px-4 py-2 text-sm font-semibold text-white"
        >
          {{ t("guest.payNow") }}
        </NuxtLink>
      </div>

      <ul class="space-y-3">
        <li
          v-for="item in items"
          :key="item.id"
          class="rounded-2xl border border-teal-900/10 bg-white/80 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-stone-900">
                {{ item.quantity }}× {{ localizedName(item, locale) }}
              </p>
              <ul
                v-if="item.selected_options?.length"
                class="mt-1 space-y-0.5 text-sm text-stone-600"
              >
                <li
                  v-for="option in item.selected_options"
                  :key="option.id"
                >
                  {{ localizedName(option, locale) }}
                </li>
              </ul>
            </div>
            <p class="shrink-0 font-mono text-sm text-teal-900">
              {{ t("guest.priceAed", { price: lineAmount(item) }) }}
            </p>
          </div>
        </li>
      </ul>

      <div class="space-y-2 rounded-2xl border border-teal-900/10 bg-white/80 p-4 text-sm">
        <div class="flex justify-between gap-3 text-stone-700">
          <span>{{ t("guest.subtotal") }}</span>
          <span class="font-mono">{{ t("guest.priceAed", { price: order.subtotal }) }}</span>
        </div>
        <div class="flex justify-between gap-3 text-stone-700">
          <span>{{ t("guest.vat") }}</span>
          <span class="font-mono">{{ t("guest.priceAed", { price: order.vat }) }}</span>
        </div>
        <div
          class="flex justify-between gap-3 border-t border-teal-900/10 pt-2 font-semibold text-teal-950"
        >
          <span>{{ t("guest.total") }}</span>
          <span class="font-mono">{{ t("guest.priceAed", { price: order.total }) }}</span>
        </div>
      </div>

      <NuxtLink
        :to="menuPath"
        class="inline-flex text-sm font-medium text-teal-900"
      >
        {{ t("guest.browseMenu") }}
      </NuxtLink>
    </div>
  </div>
</template>
