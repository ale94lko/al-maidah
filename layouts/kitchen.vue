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
    class="kitchen-shell flex min-h-dvh flex-col bg-[var(--espresso)] text-[var(--ivory)]"
  >
    <header
      class="shell-header flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6"
    >
      <div class="min-w-0">
        <p class="eyebrow text-[var(--brass)]">
          {{ t("kitchen.title") }}
        </p>
        <p class="font-display truncate text-xl font-semibold tracking-tight text-[var(--ivory)]">
          {{ t("kitchen.ticketBoard") }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <LanguageSwitcher />
        <span
          v-if="user?.email"
          class="hidden max-w-[14rem] truncate text-xs text-[var(--brass-soft)]/70 sm:inline"
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

    <main class="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <slot />
    </main>
  </div>
</template>
