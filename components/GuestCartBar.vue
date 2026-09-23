<script setup lang="ts">
const route = useRoute()
const { itemCount, subtotal, syncFromStorage } = useCart()
const { session, loadFromStorage } = useGuestSession()
const { t } = useAppI18n()

const slug = computed(() => String(route.params.slug || session.value?.slug || ""))

const tableQuery = computed(() => {
  const fromRoute = route.query.table
  if (typeof fromRoute === "string" && fromRoute) {
    return fromRoute
  }
  const stored = session.value ?? loadFromStorage()
  return stored?.tableNumber != null ? String(stored.tableNumber) : undefined
})

const cartTo = computed(() => {
  if (!slug.value) {
    return "/m"
  }
  return {
    path: `/m/${slug.value}/cart`,
    query: tableQuery.value ? { table: tableQuery.value } : undefined,
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
      class="pointer-events-auto mx-auto flex w-full max-w-lg items-center justify-between gap-3 rounded-2xl bg-teal-950 px-4 py-3 text-white shadow-lg shadow-teal-950/25"
    >
      <div class="min-w-0">
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-teal-100/80">
          {{ t("guest.cartBarItems", { count: itemCount }) }}
        </p>
        <p class="truncate text-sm font-semibold">
          {{ t("guest.viewCart") }}
        </p>
      </div>
      <p class="shrink-0 font-mono text-sm font-semibold">
        {{ t("guest.priceAed", { price: subtotal }) }}
      </p>
    </NuxtLink>
  </div>
</template>
