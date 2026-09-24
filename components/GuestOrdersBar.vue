<script setup lang="ts">
import { parseSessionToken } from "~/utils/session-token"

const props = withDefaults(
  defineProps<{
    /** When true, sit above the cart bar in the shared bottom stack. */
    raised?: boolean
  }>(),
  { raised: false },
)

const route = useRoute()
const { session, loadFromStorage } = useGuestSession()
const { orders, loadActiveOrders } = useActiveOrder()
const { t } = useAppI18n()

const slug = computed(() => String(route.params.slug || session.value?.slug || ""))

const sessionQuery = computed(() => {
  const fromRoute = parseSessionToken(route.query.session)
  if (fromRoute) {
    return fromRoute
  }
  const stored = session.value ?? loadFromStorage()
  return stored?.sessionToken || undefined
})

const hideOnRoute = computed(() => {
  const path = route.path
  return (
    /\/m\/[^/]+\/cart\/?$/.test(path) ||
    /\/m\/[^/]+\/orders\/?$/.test(path) ||
    /\/m\/[^/]+\/(?:pay|status)\//.test(path)
  )
})

const count = computed(() => orders.value.length)

const target = computed(() => {
  if (!slug.value || !count.value) {
    return null
  }
  const query = sessionQuery.value ? { session: sessionQuery.value } : undefined
  if (count.value === 1) {
    const only = orders.value[0]!
    return {
      path: `/m/${slug.value}/status/${only.orderId}`,
      query: {
        ...(query || {}),
        token: only.accessToken,
      },
    }
  }
  return {
    path: `/m/${slug.value}/orders`,
    query,
  }
})

const visible = computed(
  () => count.value > 0 && Boolean(slug.value) && Boolean(target.value) && !hideOnRoute.value,
)

const label = computed(() =>
  count.value === 1
    ? t("guest.viewOrder")
    : t("guest.viewOrders", { n: count.value }),
)

onMounted(() => {
  loadFromStorage()
  if (slug.value) {
    loadActiveOrders(slug.value)
  }
})

watch(slug, (next) => {
  if (next) {
    loadActiveOrders(next)
  }
})

defineExpose({ visible })
</script>

<template>
  <div
    v-if="visible && target"
    class="pointer-events-none w-full"
    :class="
      props.raised
        ? ''
        : 'fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
    "
  >
    <NuxtLink
      :to="target"
      class="pointer-events-auto mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-3xl border border-[var(--navy)]/10 bg-white px-5 py-3.5 text-[var(--navy)] shadow-xl shadow-[var(--navy)]/15"
    >
      <div class="min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
          {{ t("guest.yourOrders") }}
        </p>
        <p class="truncate text-sm font-bold">
          {{ label }}
        </p>
      </div>
      <span
        class="shrink-0 rounded-2xl bg-[var(--navy)] px-3 py-1.5 text-xs font-bold text-white"
      >
        {{ count }}
      </span>
    </NuxtLink>
  </div>
</template>
