<script setup lang="ts">
const route = useRoute()
const { user, signOut } = useAuth()
const { t } = useAppI18n()

const links = computed(() => [
  { to: "/admin", label: t("admin.statistics"), match: /^\/admin\/?$/, icon: "chart" },
  { to: "/admin/orders", label: t("admin.orders"), match: /^\/admin\/orders/, icon: "orders" },
  { to: "/admin/menu", label: t("admin.menu"), match: /^\/admin\/menu/, icon: "menu" },
  { to: "/admin/tables", label: t("admin.tables"), match: /^\/admin\/tables/, icon: "tables" },
  { to: "/admin/settings", label: t("admin.settings"), match: /^\/admin\/settings/, icon: "settings" },
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
  <div class="admin-shell min-h-dvh text-[var(--navy)]">
    <template v-if="!isAuthPage">
      <header class="no-print border-b border-[var(--navy)]/8 bg-white/70 px-4 py-3 backdrop-blur sm:px-6">
        <div class="mx-auto flex max-w-[90rem] items-center justify-between gap-4">
          <div class="flex min-w-0 items-center gap-4">
            <NuxtLink
              to="/admin"
              class="font-display border-e border-[var(--navy)]/10 pe-4 text-xl font-bold text-[var(--gold)]"
            >
              Al-Maidah
            </NuxtLink>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sage-deep)]">
                {{ t("admin.ownerPanel") }}
              </p>
              <p class="truncate text-sm font-bold text-[var(--navy)]">
                {{ pageTitle }}
              </p>
            </div>
          </div>
          <NuxtLink
            to="/kitchen"
            class="shrink-0 rounded-full border border-[var(--navy)]/10 bg-white px-3 py-1.5 text-xs font-bold text-[var(--navy)]"
          >
            {{ t("kitchen.title") }}
          </NuxtLink>
        </div>
      </header>

      <nav
        class="no-print hidden bg-[var(--nav)] px-4 py-3 md:block"
        :aria-label="t('admin.ownerPanel')"
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
    </template>

    <div
      class="mx-auto flex w-full max-w-[90rem]"
      :class="isAuthPage ? 'min-h-dvh justify-center' : ''"
    >
      <div
        class="min-w-0 flex-1"
        :class="isAuthPage ? 'w-full max-w-lg py-10' : 'px-4 py-6 pb-24 md:px-6 md:pb-8'"
      >
        <header v-if="isAuthPage" class="mb-6 flex items-center justify-between px-4">
          <NuxtLink to="/" class="font-display text-xl font-bold text-[var(--navy)]">
            Al-Maidah
          </NuxtLink>
          <NuxtLink to="/" class="text-sm font-bold text-[var(--info)]">
            {{ t("common.home") }}
          </NuxtLink>
        </header>
        <slot />
      </div>

      <aside
        v-if="!isAuthPage"
        class="no-print sticky top-6 mt-6 hidden h-fit w-52 shrink-0 flex-col gap-3 pe-4 xl:flex"
      >
        <NuxtLink
          to="/kitchen"
          class="rounded-full border border-[var(--navy)]/10 bg-white px-3 py-2 text-center text-sm font-bold text-[var(--navy)]"
        >
          {{ t("kitchen.title") }}
        </NuxtLink>
        <LanguageSwitcher />
        <p v-if="user?.email" class="truncate px-1 text-xs text-[var(--muted)]" :title="user.email">
          {{ user.email }}
        </p>
        <button
          type="button"
          class="rounded-2xl border border-[var(--navy)]/10 bg-white px-3 py-2 text-start text-sm font-bold"
          @click="onSignOut"
        >
          {{ t("common.signOut") }}
        </button>
      </aside>
    </div>

    <nav
      v-if="!isAuthPage"
      class="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[var(--navy)]/8 bg-white/95 backdrop-blur-xl md:hidden"
      style="padding-bottom: env(safe-area-inset-bottom)"
      :aria-label="t('admin.ownerPanel')"
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
