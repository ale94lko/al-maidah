<script setup lang="ts">
const { user, signOut } = useAuth()
const { t } = useAppI18n()

async function onSignOut() {
  await signOut()
  await navigateTo("/admin/login")
}
</script>

<template>
  <div
    class="kitchen-shell flex min-h-dvh flex-col bg-[var(--kitchen)] text-[var(--paper)]"
  >
    <header
      class="shell-header flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6"
    >
      <div class="min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--citrus)]">
          {{ t("kitchen.title") }}
        </p>
        <p class="font-display truncate text-2xl font-bold tracking-tight text-white">
          {{ t("kitchen.ticketBoard") }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <LanguageSwitcher />
        <span
          v-if="user?.email"
          class="hidden max-w-[14rem] truncate text-xs text-white/45 sm:inline"
        >
          {{ user.email }}
        </span>
        <button
          type="button"
          class="btn-ghost"
          @click="onSignOut"
        >
          {{ t("common.signOut") }}
        </button>
      </div>
    </header>
    <div class="accent-bar shrink-0" aria-hidden="true">
      <span /><span /><span />
    </div>

    <main class="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <slot />
    </main>
  </div>
</template>
