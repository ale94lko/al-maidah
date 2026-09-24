<script setup lang="ts">
const { signOut } = useAuth()
const { t } = useAppI18n()

async function onSignOut() {
  await signOut()
  await navigateTo("/admin/login")
}
</script>

<template>
  <div
    class="kitchen-shell flex min-h-dvh flex-col text-[var(--navy)]"
  >
    <header class="shrink-0 border-b border-[var(--navy)]/8 bg-white/70 px-4 py-3 backdrop-blur sm:px-6">
      <div class="mx-auto flex max-w-[90rem] items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-4">
          <NuxtLink
            to="/admin/orders"
            class="font-display border-e border-[var(--navy)]/10 pe-4 text-xl font-bold text-[var(--gold)]"
          >
            Al-Maidah
          </NuxtLink>
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sage-deep)]">
              {{ t("kitchen.title") }}
            </p>
            <p class="truncate text-sm font-bold text-[var(--navy)]">
              {{ t("kitchen.ticketBoard") }}
            </p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            class="shrink-0 rounded-full border border-[var(--navy)]/10 bg-white px-3 py-1.5 text-xs font-bold text-[var(--navy)]"
            @click="onSignOut"
          >
            {{ t("common.signOut") }}
          </button>
        </div>
      </div>
    </header>

    <main class="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <slot />
    </main>
  </div>
</template>
