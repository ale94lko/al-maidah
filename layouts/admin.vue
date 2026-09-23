<script setup lang="ts">
const route = useRoute()
const { user, signOut } = useAuth()
const { t } = useAppI18n()

const links = computed(() => [
  { to: "/admin", label: t("admin.statistics"), match: /^\/admin\/?$/ },
  { to: "/admin/orders", label: t("admin.orders"), match: /^\/admin\/orders/ },
  { to: "/admin/menu", label: t("admin.menu"), match: /^\/admin\/menu/ },
  { to: "/admin/tables", label: t("admin.tables"), match: /^\/admin\/tables/ },
  {
    to: "/admin/settings",
    label: t("admin.settings"),
    match: /^\/admin\/settings/,
  },
])

const isAuthPage = computed(
  () => route.path === "/admin/login" || route.path === "/admin/signup",
)

function isActive(match: RegExp) {
  return match.test(route.path)
}

async function onSignOut() {
  await signOut()
  await navigateTo("/admin/login")
}
</script>

<template>
  <div class="admin-shell min-h-dvh bg-[var(--sand)] text-[var(--ink)]">
    <div class="mx-auto flex min-h-dvh w-full max-w-6xl">
      <aside
        v-if="!isAuthPage"
        class="no-print hidden w-56 shrink-0 flex-col border-e border-teal-900/10 bg-white/70 p-4 md:flex lg:w-64"
      >
        <NuxtLink
          to="/admin"
          class="text-lg font-semibold tracking-tight text-teal-950"
        >
          Al-Maidah
        </NuxtLink>
        <p class="mt-1 text-xs uppercase tracking-[0.16em] text-teal-800/60">
          {{ t("admin.owner") }}
        </p>
        <nav class="mt-8 flex flex-col gap-1" :aria-label="t('admin.ownerPanel')">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="rounded-lg px-3 py-2 text-sm font-medium transition"
            :class="
              isActive(link.match)
                ? 'bg-teal-900 text-white'
                : 'text-teal-950/80 hover:bg-teal-900/5'
            "
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
        <div class="mt-auto space-y-2 pt-8">
          <LanguageSwitcher />
          <p
            v-if="user?.email"
            class="truncate text-xs text-stone-500"
            :title="user.email"
          >
            {{ user.email }}
          </p>
          <button
            type="button"
            class="w-full rounded-lg border border-stone-300 px-3 py-2 text-start text-sm"
            @click="onSignOut"
          >
            {{ t("common.signOut") }}
          </button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <header
          class="no-print sticky top-0 z-20 border-b border-teal-900/10 bg-[var(--sand)]/95 px-4 py-3 backdrop-blur md:px-6"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0 md:hidden">
              <p class="text-base font-semibold text-teal-950">
                {{ isAuthPage ? "Al-Maidah" : t("admin.ownerPanel") }}
              </p>
            </div>
            <p class="hidden text-sm text-stone-600 md:block">
              {{ t("admin.desktopReady") }}
            </p>
            <div class="flex items-center gap-3">
              <LanguageSwitcher class="md:hidden" />
              <NuxtLink
                v-if="isAuthPage"
                to="/"
                class="text-sm font-medium text-teal-800"
              >
                {{ t("common.home") }}
              </NuxtLink>
            </div>
          </div>
        </header>

        <main class="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <slot />
        </main>
      </div>
    </div>

    <nav
      v-if="!isAuthPage"
      class="no-print fixed inset-x-0 bottom-0 z-30 border-t border-teal-900/10 bg-white/95 backdrop-blur md:hidden"
      style="padding-bottom: env(safe-area-inset-bottom)"
      :aria-label="t('admin.ownerPanel')"
    >
      <ul class="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2 py-2">
        <li v-for="link in links" :key="link.to" class="min-w-0 flex-1">
          <NuxtLink
            :to="link.to"
            class="flex flex-col items-center rounded-lg px-2 py-2 text-center text-xs font-semibold"
            :class="
              isActive(link.match)
                ? 'bg-teal-900 text-white'
                : 'text-teal-950/80'
            "
          >
            <span class="truncate">{{ link.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
