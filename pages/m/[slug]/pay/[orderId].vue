<script setup lang="ts">
import { parseSessionToken } from "~/utils/session-token"

definePageMeta({
  layout: "client",
})

/**
 * Online Stripe checkout is disabled: guests only pay at the counter.
 * Keep this route as a redirect so old payment links still resolve.
 */
const route = useRoute()
const router = useRouter()
const { setShell } = useClientShell()
const { loadFromStorage, session } = useGuestSession()
const { loadActiveOrder } = useActiveOrder()
const { t } = useAppI18n()

const slug = computed(() => String(route.params.slug || ""))
const orderId = computed(() => String(route.params.orderId || ""))

onMounted(async () => {
  loadFromStorage()
  const saved = loadActiveOrder(slug.value, orderId.value)
  const active = session.value
  if (active) {
    setShell({
      venueName: active.restaurantName,
      tableNumber: active.tableNumber,
    })
  }

  const query: Record<string, string> = {}
  const token =
    (typeof route.query.token === "string" && route.query.token) ||
    saved?.accessToken ||
    ""
  if (token) {
    query.token = token
  }
  const visit =
    parseSessionToken(route.query.session) ?? session.value?.sessionToken
  if (visit) {
    query.session = visit
  }

  await router.replace({
    path: `/m/${slug.value}/status/${orderId.value}`,
    query,
  })
})
</script>

<template>
  <AppLoadingState :label="t('common.loading')" />
</template>
