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
    class="kitchen-shell flex min-h-dvh flex-col bg-zinc-950 text-zinc-100"
  >
    <header
      class="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-6"
    >
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90">
          {{ t("kitchen.title") }}
        </p>
        <p class="truncate text-lg font-semibold tracking-tight text-zinc-50">
          {{ t("kitchen.ticketBoard") }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <LanguageSwitcher />
        <span
          v-if="user?.email"
          class="hidden max-w-[14rem] truncate text-xs text-zinc-400 sm:inline"
        >
          {{ user.email }}
        </span>
        <button
          type="button"
          class="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
          @click="onSignOut"
        >
          {{ t("common.signOut") }}
        </button>
      </div>
    </header>

    <main class="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <slot />
    </main>
  </div>
</template>
