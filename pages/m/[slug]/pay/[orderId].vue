<script setup lang="ts">
import type { PublicOrder } from "~/types"
import { parseSessionToken } from "~/utils/session-token"

definePageMeta({
  layout: "client",
})

const route = useRoute()
const router = useRouter()
const { setShell } = useClientShell()
const { loadFromStorage, session } = useGuestSession()
const { loadActiveOrder, saveActiveOrder } = useActiveOrder()
const { appUrl } = usePublicRuntime()
const { t } = useAppI18n()

const slug = computed(() => String(route.params.slug || ""))
const orderId = computed(() => String(route.params.orderId || ""))

const loading = ref(true)
const errorMessage = ref("")
const order = ref<PublicOrder | null>(null)
const paymentNote = ref("")

const accessToken = computed(() => {
  const fromQuery = route.query.token
  if (typeof fromQuery === "string" && fromQuery) {
    return fromQuery
  }
  return loadActiveOrder(slug.value)?.accessToken || ""
})

const statusPath = computed(() => {
  const query: Record<string, string> = {}
  if (accessToken.value) {
    query.token = accessToken.value
  }
  const visit =
    parseSessionToken(route.query.session) ?? session.value?.sessionToken
  if (visit) {
    query.session = visit
  }
  return {
    path: `/m/${slug.value}/status/${orderId.value}`,
    query,
  }
})

const returnUrl = computed(() => {
  const base = (appUrl.value || "").replace(/\/$/, "")
  const params = new URLSearchParams()
  if (accessToken.value) {
    params.set("token", accessToken.value)
  }
  const visit =
    parseSessionToken(route.query.session) ?? session.value?.sessionToken
  if (visit) {
    params.set("session", visit)
  }
  const qs = params.toString()
  return `${base}/m/${slug.value}/status/${orderId.value}${qs ? `?${qs}` : ""}`
})

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

  if (!accessToken.value) {
    errorMessage.value = t("guest.orderTrackingLost")
    loading.value = false
    return
  }

  try {
    const result = await $fetch<{ order: PublicOrder }>(
      `/api/orders/${encodeURIComponent(orderId.value)}`,
      {
        query: {
          slug: slug.value,
          token: accessToken.value,
        },
      },
    )
    order.value = result.order
    saveActiveOrder({
      slug: slug.value,
      orderId: result.order.id,
      accessToken: result.order.guest_access_token,
      tableNumber: result.order.table_number,
    })

    if (result.order.payment_method === "cash_at_table") {
      await router.replace(statusPath.value)
      return
    }
    if (result.order.payment_status === "paid") {
      await router.replace(statusPath.value)
      return
    }
    if (result.order.table_number != null || result.order.restaurant_name) {
      setShell({
        venueName:
          result.order.restaurant_name ||
          active?.restaurantName ||
          slug.value,
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
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-[var(--citrus-deep)]">
          {{ t("guest.orderPending") }}
        </p>
        <h1 class="font-display mt-1 text-xl font-bold tracking-tight text-[var(--espresso)]">
          {{ t("guest.payOnline") }}
        </h1>
        <p class="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {{ t("guest.payOnlineHint") }}
        </p>
        <p class="mt-3 font-mono text-lg font-semibold text-[var(--herb)]">
          {{ t("guest.priceAed", { price: order.total }) }}
        </p>
      </div>

      <GuestStripeCheckout
        :order-id="order.id"
        :return-url="returnUrl"
        @cancelled="paymentNote = t('guest.paymentCancelled')"
      />

      <p v-if="paymentNote" class="text-sm font-medium text-amber-900">
        {{ paymentNote }}
      </p>

      <NuxtLink :to="statusPath" class="inline-flex text-sm font-medium text-[var(--herb)]">
        {{ t("guest.onlinePendingHint") }}
      </NuxtLink>
    </div>
  </div>
</template>
