<script setup lang="ts">
import { parseSessionToken } from "~/utils/session-token"

const route = useRoute()
const { itemCount, subtotal, syncFromStorage } = useCart()
const { session, loadFromStorage } = useGuestSession()
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

const cartTo = computed(() => {
  if (!slug.value) {
    return "/m"
  }
  return {
    path: `/m/${slug.value}/cart`,
    query: sessionQuery.value ? { session: sessionQuery.value } : undefined,
  }
})

/** Hide on cart itself and on post-checkout surfaces (pay / status). */
const hideOnRoute = computed(() => {
  const path = route.path
  return (
    /\/m\/[^/]+\/cart\/?$/.test(path) ||
    /\/m\/[^/]+\/(?:pay|status)\//.test(path)
  )
})

const visible = computed(
  () => itemCount.value > 0 && Boolean(slug.value) && !hideOnRoute.value,
)

onMounted(() => {
  loadFromStorage()
  syncFromStorage()
})
</script>

<template>
  <div
    v-if="visible"
    class="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
  >
    <NuxtLink
      :to="cartTo"
      class="pointer-events-auto mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-3xl bg-[var(--info)] px-5 py-3.5 text-white shadow-xl shadow-[var(--info)]/35"
    >
      <div class="min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
          {{ t("guest.cartBarItems", { count: itemCount }) }}
        </p>
        <p class="truncate text-sm font-bold">
          {{ t("guest.viewCart") }}
        </p>
      </div>
      <p class="shrink-0 rounded-2xl bg-white/15 px-3 py-1.5 font-mono text-sm font-bold">
        {{ t("guest.priceAed", { price: subtotal }) }}
      </p>
    </NuxtLink>
  </div>
</template>
