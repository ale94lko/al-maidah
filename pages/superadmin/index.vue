<script setup lang="ts">
import { extractApiErrorMessage } from "~/utils/errors"

definePageMeta({
  layout: "superadmin",
})

type PlatformSeriesPoint = {
  key: string
  label: string
  value: number
}

type PlatformTopPath = {
  path: string
  count: number
}

type PlatformRecentError = {
  message: string
  path: string
  count: number
  last_seen_at: string
}

type PlatformStats = {
  owner_count: number
  restaurant_count: number
  owners_with_restaurant: number
  owners_without_restaurant: number
  active_users_7d: number
  active_users_30d: number
  page_views_30d: number
  unique_visitors_30d: number
  errors_30d: number
  errors_24h: number
  series_signups: PlatformSeriesPoint[]
  series_page_views: PlatformSeriesPoint[]
  series_errors: PlatformSeriesPoint[]
  top_paths: PlatformTopPath[]
  recent_errors: PlatformRecentError[]
}

const { accessToken, refreshSession } = useAuth()
const { t, locale } = useAppI18n()
const {
  errorOpen,
  errorTitle,
  errorMessage: dialogMessage,
  showError,
  dismissError,
} = useErrorDialog()

const loading = ref(true)
const stats = ref<PlatformStats | null>(null)

const signupPoints = computed(
  () => stats.value?.series_signups.map(({ label, value }) => ({ label, value })) ?? [],
)
const pageViewPoints = computed(
  () =>
    stats.value?.series_page_views.map(({ label, value }) => ({ label, value })) ?? [],
)
const errorPoints = computed(
  () => stats.value?.series_errors.map(({ label, value }) => ({ label, value })) ?? [],
)

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(locale.value === "ar" ? "ar-AE" : "en-AE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

async function authHeaders() {
  const token = await accessToken()
  if (!token) {
    throw new Error("Not signed in")
  }
  return { Authorization: `Bearer ${token}` }
}

async function bootstrap() {
  loading.value = true
  try {
    const result = await $fetch<{ stats: PlatformStats }>(
      "/api/superadmin/stats",
      { headers: await authHeaders() },
    )
    stats.value = result.stats
  } catch (error) {
    showError(
      extractApiErrorMessage(error) || t("superadmin.loadError"),
    )
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const session = await refreshSession()
  if (!session) {
    await navigateTo({
      path: "/admin/login",
      query: { redirect: "/superadmin" },
    })
    return
  }
  await bootstrap()
})
</script>

<template>
  <div>
    <AppErrorDialog
      :open="errorOpen"
      :title="errorTitle"
      :message="dialogMessage"
      @dismiss="dismissError"
    />

    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-bold text-[var(--ink)]">
          {{ t("superadmin.overview") }}
        </h1>
        <p class="mt-1 text-sm text-[var(--muted)]">
          {{ t("superadmin.overviewHint") }}
        </p>
      </div>
      <NuxtLink to="/superadmin/users" class="btn-primary">
        {{ t("superadmin.manageUsers") }}
      </NuxtLink>
    </div>

    <AppLoadingState
      v-if="loading"
      class="mt-8"
      :label="t('superadmin.loading')"
    />
    <template v-else-if="stats">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statOwners") }}</p>
          <p class="value">{{ stats.owner_count }}</p>
          <p class="mt-1 text-xs text-[var(--muted)]">
            {{
              t("superadmin.statOwnersSplit", {
                with: stats.owners_with_restaurant,
                without: stats.owners_without_restaurant,
              })
            }}
          </p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statRestaurants") }}</p>
          <p class="value">{{ stats.restaurant_count }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statActiveUsers7d") }}</p>
          <p class="value">{{ stats.active_users_7d }}</p>
          <p class="mt-1 text-xs text-[var(--muted)]">
            {{ t("superadmin.statActiveUsers30d", { n: stats.active_users_30d }) }}
          </p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statVisitors30d") }}</p>
          <p class="value">{{ stats.unique_visitors_30d }}</p>
          <p class="mt-1 text-xs text-[var(--muted)]">
            {{ t("superadmin.statPageViews30d", { n: stats.page_views_30d }) }}
          </p>
        </div>
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statErrors24h") }}</p>
          <p class="value">{{ stats.errors_24h }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statErrors30d") }}</p>
          <p class="value">{{ stats.errors_30d }}</p>
        </div>
      </div>

      <section class="admin-panel mt-5">
        <div class="admin-panel-head">
          <div>
            <h2 class="text-sm font-bold text-[var(--navy)]">
              {{ t("superadmin.chartPageViews") }}
            </h2>
            <p class="mt-0.5 text-xs text-[var(--muted)]">
              {{ t("superadmin.chartLast30d") }}
            </p>
          </div>
        </div>
        <div class="admin-panel-body">
          <StatsChart mode="combo" :points="pageViewPoints" />
        </div>
      </section>

      <div class="mt-5 grid gap-5 lg:grid-cols-2">
        <section class="admin-panel">
          <div class="admin-panel-head">
            <div>
              <h2 class="text-sm font-bold text-[var(--navy)]">
                {{ t("superadmin.chartSignups") }}
              </h2>
              <p class="mt-0.5 text-xs text-[var(--muted)]">
                {{ t("superadmin.chartLast30d") }}
              </p>
            </div>
          </div>
          <div class="admin-panel-body">
            <StatsChart mode="bar" :points="signupPoints" />
          </div>
        </section>
        <section class="admin-panel">
          <div class="admin-panel-head">
            <div>
              <h2 class="text-sm font-bold text-[var(--navy)]">
                {{ t("superadmin.chartErrors") }}
              </h2>
              <p class="mt-0.5 text-xs text-[var(--muted)]">
                {{ t("superadmin.chartLast30d") }}
              </p>
            </div>
          </div>
          <div class="admin-panel-body">
            <StatsChart mode="bar" :points="errorPoints" />
          </div>
        </section>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-2">
        <section class="admin-panel">
          <div class="admin-panel-head">
            <h2 class="font-display text-base font-bold text-[var(--ink)]">
              {{ t("superadmin.topPaths") }}
            </h2>
          </div>
          <div class="admin-panel-body">
            <AppEmptyState
              v-if="!stats.top_paths.length"
              :title="t('superadmin.noVisitsYet')"
              :description="t('superadmin.noVisitsYetHint')"
            />
            <ol v-else class="space-y-2.5">
              <li
                v-for="(row, index) in stats.top_paths"
                :key="row.path"
                class="flex items-center justify-between gap-3 text-sm"
              >
                <span class="min-w-0 truncate font-semibold text-[var(--ink)]">
                  <span class="text-[var(--chili)]">{{ index + 1 }}.</span>
                  {{ row.path }}
                </span>
                <span class="shrink-0 font-mono font-bold text-[var(--herb)]">
                  ×{{ row.count }}
                </span>
              </li>
            </ol>
          </div>
        </section>

        <section class="admin-panel">
          <div class="admin-panel-head">
            <h2 class="font-display text-base font-bold text-[var(--ink)]">
              {{ t("superadmin.recentErrors") }}
            </h2>
          </div>
          <div class="admin-panel-body">
            <AppEmptyState
              v-if="!stats.recent_errors.length"
              :title="t('superadmin.noErrorsYet')"
              :description="t('superadmin.noErrorsYetHint')"
            />
            <ul v-else class="space-y-3">
              <li
                v-for="row in stats.recent_errors"
                :key="`${row.message}|${row.path}|${row.last_seen_at}`"
                class="border-b border-[rgba(27,39,64,0.08)] pb-3 last:border-0 last:pb-0"
              >
                <p class="text-sm font-semibold text-[var(--ink)]">
                  {{ row.message }}
                </p>
                <p class="mt-1 truncate text-xs text-[var(--muted)]">
                  {{ row.path }}
                  · ×{{ row.count }}
                  · {{ formatWhen(row.last_seen_at) }}
                </p>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
