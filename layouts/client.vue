<script setup lang="ts">
const route = useRoute()
const { venueName, tableNumber } = useClientShell()
const { t } = useAppI18n()
const { itemCount, syncFromStorage } = useCart()
const { loadFromStorage } = useGuestSession()

const tableLabel = computed(() => {
  if (tableNumber.value == null) {
    return null
  }
  return t("guest.table", { n: tableNumber.value })
})

const cartBarHidden = computed(() => {
  const path = route.path
  return (
    /\/m\/[^/]+\/cart\/?$/.test(path) ||
    /\/m\/[^/]+\/(?:pay|status)\//.test(path)
  )
})

const mainPadClass = computed(() =>
  itemCount.value > 0 && !cartBarHidden.value
    ? "pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))]"
    : "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
)

onMounted(() => {
  loadFromStorage()
  syncFromStorage()
})
</script>

<template>
  <div class="client-shell min-h-dvh bg-[var(--sand)] text-[var(--ink)]">
    <header
      class="sticky top-0 z-20 border-b border-teal-900/10 bg-[var(--sand)]/95 backdrop-blur"
    >
      <div
        class="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 py-3 safe-px"
      >
        <div class="min-w-0">
          <p class="truncate text-base font-semibold tracking-tight text-teal-950">
            {{ venueName }}
          </p>
          <p
            v-if="tableLabel"
            class="truncate text-xs font-medium uppercase tracking-[0.14em] text-teal-800/70"
          >
            {{ tableLabel }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <slot name="header-actions" />
        </div>
      </div>
    </header>

    <main
      class="mx-auto w-full max-w-lg px-4 py-4"
      :class="mainPadClass"
    >
      <slot />
    </main>

    <GuestCartBar />
  </div>
</template>
