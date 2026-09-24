<script setup lang="ts">
const route = useRoute()
const { venueName, tableNumber } = useClientShell()
const { t } = useAppI18n()
const { itemCount, syncFromStorage } = useCart()
const { loadFromStorage } = useGuestSession()
const { orders, loadActiveOrders } = useActiveOrder()

const slug = computed(() => String(route.params.slug || ""))

const tableLabel = computed(() => {
  if (tableNumber.value == null) {
    return null
  }
  return t("guest.table", { n: tableNumber.value })
})

const barsHidden = computed(() => {
  const path = route.path
  return (
    /\/m\/[^/]+\/cart\/?$/.test(path) ||
    /\/m\/[^/]+\/orders\/?$/.test(path) ||
    /\/m\/[^/]+\/(?:pay|status)\//.test(path)
  )
})

const showCartBar = computed(
  () => itemCount.value > 0 && !barsHidden.value,
)
const showOrdersBar = computed(
  () => orders.value.length > 0 && !barsHidden.value,
)

const barCount = computed(
  () => (showCartBar.value ? 1 : 0) + (showOrdersBar.value ? 1 : 0),
)

const mainPadClass = computed(() => {
  if (barCount.value >= 2) {
    return "pb-[max(11.5rem,calc(env(safe-area-inset-bottom)+10rem))]"
  }
  if (barCount.value === 1) {
    return "pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))]"
  }
  return "pb-[max(1.5rem,env(safe-area-inset-bottom))]"
})

onMounted(() => {
  loadFromStorage()
  syncFromStorage()
  if (slug.value) {
    loadActiveOrders(slug.value)
  }
})

watch(slug, (next) => {
  if (next) {
    loadActiveOrders(next)
  }
})
</script>

<template>
  <div class="client-shell min-h-dvh text-[var(--navy)]">
    <header class="sticky top-0 z-20 border-b border-[var(--navy)]/8 bg-white/70 px-4 py-3 backdrop-blur">
      <div class="mx-auto flex w-full max-w-lg items-center justify-between gap-3 safe-px">
        <div class="flex min-w-0 items-center gap-4">
          <span class="font-display shrink-0 border-e border-[var(--navy)]/10 pe-4 text-xl font-bold text-[var(--gold)]">
            Al-Maidah
          </span>
          <div class="min-w-0">
            <p
              v-if="tableLabel"
              class="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sage-deep)]"
            >
              {{ tableLabel }}
            </p>
            <p class="truncate text-sm font-bold text-[var(--navy)]">
              {{ venueName }}
            </p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <slot name="header-actions" />
        </div>
      </div>
    </header>

    <main
      class="mx-auto w-full max-w-lg px-4 py-5"
      :class="mainPadClass"
    >
      <slot />
    </main>

    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <GuestOrdersBar raised />
      <GuestCartBar stacked />
    </div>
  </div>
</template>
