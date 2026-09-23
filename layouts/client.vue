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
  <div class="client-shell min-h-dvh text-[var(--ink)]">
    <header class="shell-header">
      <div
        class="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 py-3.5 safe-px"
      >
        <div class="min-w-0">
          <p
            class="font-display truncate text-xl font-bold tracking-tight text-[var(--ink)]"
          >
            {{ venueName }}
          </p>
          <p
            v-if="tableLabel"
            class="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--chili)]"
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
      class="mx-auto w-full max-w-lg px-4 py-5"
      :class="mainPadClass"
    >
      <slot />
    </main>

    <GuestCartBar />
  </div>
</template>
