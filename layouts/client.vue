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
  <div class="client-shell min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
    <header class="guest-header sticky top-0 z-20 shadow-lg shadow-black/20">
      <div
        class="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 py-4 safe-px"
      >
        <div class="min-w-0">
          <p class="font-display truncate text-xl font-extrabold tracking-tight text-white">
            {{ venueName }}
          </p>
          <div class="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              v-if="tableLabel"
              class="inline-flex rounded-xl bg-[var(--chili)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white"
            >
              {{ tableLabel }}
            </span>
            <span class="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--citrus)]">
              Al-Maidah
            </span>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <slot name="header-actions" />
        </div>
      </div>
      <div class="accent-bar" aria-hidden="true">
        <span /><span /><span />
      </div>
    </header>

    <main
      class="mx-auto w-full max-w-lg px-4 py-5"
      :class="mainPadClass"
    >
      <slot />
    </main>

    <GuestCartBar />
  </div>
</template>
