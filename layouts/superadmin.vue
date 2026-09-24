<script setup lang="ts">
const route = useRoute()
const { signOut } = useAuth()
const { t } = useAppI18n()

const links = computed(() => [
  {
    to: "/superadmin",
    label: t("superadmin.overview"),
    match: /^\/superadmin\/?$/,
  },
  {
    to: "/superadmin/users",
    label: t("superadmin.users"),
    match: /^\/superadmin\/users/,
  },
])

const pageTitle = computed(() => {
  const hit = links.value.find((link) => link.match.test(route.path))
  return hit?.label ?? t("superadmin.panel")
})

function isActive(match: RegExp) {
  return match.test(route.path)
}

async function onSignOut() {
  await signOut()
  await navigateTo("/admin/login")
}
</script>

<template>
  <div class="admin-shell min-h-dvh text-[var(--navy)]">
    <header class="no-print border-b border-[var(--navy)]/8 bg-white/70 px-4 py-3 backdrop-blur sm:px-6">
      <div class="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-4">
          <NuxtLink
            to="/superadmin"
            class="font-display border-e border-[var(--navy)]/10 pe-4 text-xl font-bold text-[var(--gold)]"
          >
            Al-Maidah
          </NuxtLink>
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sage-deep)]">
              {{ t("superadmin.panel") }}
            </p>
            <p class="truncate text-sm font-bold text-[var(--navy)]">
              {{ pageTitle }}
            </p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            class="rounded-full border border-[var(--navy)]/10 bg-white px-3 py-1.5 text-xs font-bold text-[var(--navy)]"
            @click="onSignOut"
          >
            {{ t("common.signOut") }}
          </button>
        </div>
      </div>
    </header>

    <nav
      class="no-print hidden bg-[var(--nav)] px-4 py-3 md:block"
      :aria-label="t('superadmin.panel')"
    >
      <ul class="mx-auto flex max-w-[90rem] gap-2 overflow-x-auto">
        <li v-for="link in links" :key="link.to">
          <NuxtLink
            :to="link.to"
            class="admin-pill"
            :class="{ 'is-active': isActive(link.match) }"
          >
            {{ link.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <div class="mx-auto flex w-full max-w-[90rem]">
      <div class="min-w-0 flex-1 px-4 py-6 pb-24 md:px-6 md:pb-8">
        <slot />
      </div>
    </div>

    <nav
      class="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[var(--navy)]/8 bg-white/95 backdrop-blur-xl md:hidden"
      style="padding-bottom: env(safe-area-inset-bottom)"
      :aria-label="t('superadmin.panel')"
    >
      <ul class="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2 py-2">
        <li v-for="link in links" :key="link.to" class="min-w-0 flex-1">
          <NuxtLink
            :to="link.to"
            class="flex flex-col items-center rounded-2xl px-1 py-2 text-center text-[11px] font-bold"
            :class="isActive(link.match) ? 'bg-[var(--info)] text-white' : 'text-[var(--navy)]/75'"
          >
            <span class="truncate">{{ link.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
