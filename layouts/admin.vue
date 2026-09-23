<script setup lang="ts">
const route = useRoute()
const { user, signOut } = useAuth()
const { t } = useAppI18n()

const links = computed(() => [
  {
    to: "/admin",
    label: t("admin.statistics"),
    match: /^\/admin\/?$/,
    icon: "chart",
  },
  {
    to: "/admin/orders",
    label: t("admin.orders"),
    match: /^\/admin\/orders/,
    icon: "orders",
  },
  {
    to: "/admin/menu",
    label: t("admin.menu"),
    match: /^\/admin\/menu/,
    icon: "menu",
  },
  {
    to: "/admin/tables",
    label: t("admin.tables"),
    match: /^\/admin\/tables/,
    icon: "tables",
  },
  {
    to: "/admin/settings",
    label: t("admin.settings"),
    match: /^\/admin\/settings/,
    icon: "settings",
  },
])

const isAuthPage = computed(
  () => route.path === "/admin/login" || route.path === "/admin/signup",
)

const pageTitle = computed(() => {
  const hit = links.value.find((link) => link.match.test(route.path))
  return hit?.label ?? t("admin.ownerPanel")
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
  <div class="admin-shell min-h-dvh text-[var(--ink)]">
    <div
      class="mx-auto flex min-h-dvh w-full max-w-[90rem]"
      :class="isAuthPage ? 'justify-center' : ''"
    >
      <aside
        v-if="!isAuthPage"
        class="no-print sticky top-0 hidden h-dvh w-[15.5rem] shrink-0 flex-col gap-6 overflow-y-auto border-e border-white/10 bg-[var(--ink)] px-4 py-5 text-[var(--paper)] md:flex lg:w-64"
      >
        <div>
          <NuxtLink
            to="/admin"
            class="font-display text-2xl font-bold tracking-tight text-white"
          >
            Al-Maidah
          </NuxtLink>
          <p class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--citrus)]">
            {{ t("admin.owner") }}
          </p>
          <div class="accent-bar mt-4 max-w-[7rem]" aria-hidden="true">
            <span /><span /><span />
          </div>
        </div>

        <nav class="flex flex-col gap-1" :aria-label="t('admin.ownerPanel')">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="admin-nav-link"
            :class="{ 'is-active': isActive(link.match) }"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              :class="
                isActive(link.match)
                  ? 'bg-white/15'
                  : 'bg-white/5 text-[var(--citrus)]'
              "
              aria-hidden="true"
            >
              <svg
                v-if="link.icon === 'chart'"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M4 19V5M10 19V9M16 19v-6M22 19H2" stroke-linecap="round" />
              </svg>
              <svg
                v-else-if="link.icon === 'orders'"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M7 7h10M7 12h10M7 17h6" stroke-linecap="round" />
                <rect x="3" y="3" width="18" height="18" rx="3" />
              </svg>
              <svg
                v-else-if="link.icon === 'menu'"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M4 7h16M4 12h16M4 17h10" stroke-linecap="round" />
              </svg>
              <svg
                v-else-if="link.icon === 'tables'"
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="5" width="18" height="6" rx="1" />
                <path d="M6 11v8M18 11v8M10 11v8M14 11v8" stroke-linecap="round" />
              </svg>
              <svg
                v-else
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" stroke-linecap="round" />
              </svg>
            </span>
            <span>{{ link.label }}</span>
          </NuxtLink>
        </nav>

        <div class="mt-auto space-y-3 border-t border-white/10 pt-4">
          <NuxtLink
            to="/kitchen"
            class="flex items-center gap-2 rounded-2xl bg-[var(--herb)]/20 px-3 py-2.5 text-sm font-bold text-[var(--citrus-soft)] transition hover:bg-[var(--herb)]/30"
          >
            <span class="h-2 w-2 rounded-sm bg-[var(--herb)]" aria-hidden="true" />
            {{ t("kitchen.title") }}
          </NuxtLink>
          <LanguageSwitcher />
          <p
            v-if="user?.email"
            class="truncate px-1 text-xs text-white/45"
            :title="user.email"
          >
            {{ user.email }}
          </p>
          <button
            type="button"
            class="w-full rounded-2xl border border-white/15 px-3 py-2.5 text-start text-sm font-semibold text-white/90 transition hover:border-[var(--citrus)]/50"
            @click="onSignOut"
          >
            {{ t("common.signOut") }}
          </button>
        </div>
      </aside>

      <div
        class="flex min-w-0 flex-1 flex-col"
        :class="isAuthPage ? 'w-full max-w-lg py-10' : 'p-3 pb-24 md:p-4 md:pb-4'"
      >
        <div
          :class="
            isAuthPage
              ? 'flex min-h-0 flex-1 flex-col'
              : 'admin-workspace'
          "
        >
          <header
            v-if="!isAuthPage"
            class="admin-topbar no-print"
          >
            <div class="min-w-0">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--herb-deep)]">
                {{ t("admin.ownerPanel") }}
              </p>
              <p class="font-display truncate text-lg font-bold text-[var(--ink)] md:hidden">
                {{ pageTitle }}
              </p>
              <p class="hidden truncate text-sm font-semibold text-[var(--ink)] md:block">
                {{ pageTitle }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <LanguageSwitcher class="md:hidden" />
              <NuxtLink
                to="/kitchen"
                class="hidden rounded-2xl border border-[var(--herb)]/25 bg-[var(--herb)]/10 px-3 py-2 text-xs font-bold text-[var(--herb-deep)] sm:inline-flex"
              >
                {{ t("kitchen.title") }}
              </NuxtLink>
              <button
                type="button"
                class="rounded-2xl border border-[var(--ink)]/10 px-3 py-2 text-xs font-bold text-[var(--ink)] md:hidden"
                @click="onSignOut"
              >
                {{ t("common.signOut") }}
              </button>
            </div>
          </header>

          <header
            v-else
            class="mb-6 flex items-center justify-between px-4"
          >
            <NuxtLink
              to="/"
              class="font-display text-xl font-bold text-[var(--ink)]"
            >
              Al-Maidah
            </NuxtLink>
            <NuxtLink
              to="/"
              class="text-sm font-bold text-[var(--herb-deep)]"
            >
              {{ t("common.home") }}
            </NuxtLink>
          </header>

          <main
            class="min-h-0 flex-1"
            :class="isAuthPage ? 'px-4' : 'overflow-auto px-5 py-6 sm:px-6 lg:px-8'"
          >
            <slot />
          </main>
        </div>
      </div>
    </div>

    <nav
      v-if="!isAuthPage"
      class="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[var(--ink)]/8 bg-white/95 backdrop-blur-xl md:hidden"
      style="padding-bottom: env(safe-area-inset-bottom)"
      :aria-label="t('admin.ownerPanel')"
    >
      <ul class="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2 py-2">
        <li v-for="link in links" :key="link.to" class="min-w-0 flex-1">
          <NuxtLink
            :to="link.to"
            class="flex flex-col items-center rounded-2xl px-1 py-2 text-center text-[11px] font-bold"
            :class="
              isActive(link.match)
                ? 'bg-[var(--chili)] text-white'
                : 'text-[var(--ink)]/75'
            "
          >
            <span class="truncate">{{ link.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
