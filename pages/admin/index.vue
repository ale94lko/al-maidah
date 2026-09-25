<script setup lang="ts">
import type { OwnerStatsResponse, StatsRange } from "~/types"
import { localizedName } from "~/utils/localize"
import { extractApiErrorMessage } from "~/utils/errors"

definePageMeta({
  layout: "admin",
})

type MeResponse = {
  user: { id: string; email?: string }
  is_superadmin?: boolean
  restaurants: Array<{ id: string; name: string; slug: string }>
}

const RANGES: StatsRange[] = ["today", "week", "month", "last_30_days"]

const { refreshSession, accessToken } = useAuth()
const { t, locale } = useAppI18n()
const {
  errorOpen,
  errorTitle,
  errorMessage: dialogMessage,
  showError,
  dismissError,
} = useErrorDialog()

const restaurants = ref<MeResponse["restaurants"]>([])
const restaurantId = ref<string | null>(null)
const range = ref<StatsRange>("today")
const stats = ref<OwnerStatsResponse | null>(null)
const loading = ref(true)

async function authHeaders() {
  const token = await accessToken()
  if (!token) {
    throw new Error("Not signed in")
  }
  return { Authorization: `Bearer ${token}` }
}

async function loadStats() {
  if (!restaurantId.value) {
    stats.value = null
    return
  }
  try {
    const result = await $fetch<{ stats: OwnerStatsResponse }>(
      `/api/admin/stats/${encodeURIComponent(restaurantId.value)}`,
      {
        headers: await authHeaders(),
        query: { range: range.value },
      },
    )
    stats.value = result.stats
  } catch (error) {
    stats.value = null
    showError(
      extractApiErrorMessage(error) || t("admin.statsLoadError"),
    )
  }
}

async function bootstrap() {
  loading.value = true
  try {
    const me = await $fetch<MeResponse>("/api/auth/me", {
      headers: await authHeaders(),
    })
    if (me.is_superadmin) {
      await navigateTo("/superadmin", { replace: true })
      return
    }
    restaurants.value = me.restaurants
    restaurantId.value = me.restaurants[0]?.id ?? null
    await loadStats()
  } catch (error) {
    showError(
      extractApiErrorMessage(error) || t("admin.statsLoadError"),
    )
  } finally {
    loading.value = false
  }
}

async function onRestaurantChange(event: Event) {
  restaurantId.value = (event.target as HTMLSelectElement).value
  await loadStats()
}

async function onRangeChange(next: StatsRange) {
  range.value = next
  await loadStats()
}

function formatMargin(bps: number | null): string {
  if (bps == null) {
    return "—"
  }
  return `${(bps / 100).toFixed(1)}%`
}

function formatReady(seconds: number | null): string {
  if (seconds == null) {
    return "—"
  }
  if (seconds < 60) {
    return t("admin.statsReadySeconds", { n: seconds })
  }
  const minutes = Math.round(seconds / 60)
  return t("admin.statsReadyMinutes", { n: minutes })
}

const seriesPoints = computed(() =>
  (stats.value?.series ?? []).map((point) => ({
    label: point.label,
    value: Number(point.revenue) || 0,
  })),
)

const weekPoints = computed(() =>
  (stats.value?.series_by_week ?? []).map((point) => ({
    label: point.label,
    value: Number(point.revenue) || 0,
  })),
)

const monthPoints = computed(() =>
  (stats.value?.series_by_month ?? []).map((point) => ({
    label: point.label,
    value: Number(point.revenue) || 0,
  })),
)

const peakPoints = computed(() =>
  (stats.value?.peak_hours ?? []).map((bucket) => ({
    label: `${String(bucket.hour).padStart(2, "0")}`,
    value: bucket.order_count,
  })),
)

onMounted(async () => {
  const session = await refreshSession()
  if (!session) {
    await navigateTo({
      path: "/admin/login",
      query: { redirect: "/admin" },
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

    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div
        class="inline-flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-sm"
        role="group"
        :aria-label="t('admin.statsRangeLabel')"
      >
        <button
          v-for="option in RANGES"
          :key="option"
          type="button"
          class="rounded-full px-3.5 py-1.5 text-sm font-bold transition"
          :class="
            range === option
              ? 'bg-[var(--navy)] text-white'
              : 'text-[var(--navy)]/70 hover:bg-[var(--paper)]'
          "
          @click="onRangeChange(option)"
        >
          {{ t(`admin.statsRange.${option}`) }}
        </button>
      </div>
      <label
        v-if="restaurants.length > 1"
        class="flex min-w-[12rem] flex-col gap-1 text-xs font-bold text-[var(--muted)]"
      >
        {{ t("admin.restaurant") }}
        <select
          class="field-input"
          :value="restaurantId ?? undefined"
          @change="onRestaurantChange"
        >
          <option
            v-for="restaurant in restaurants"
            :key="restaurant.id"
            :value="restaurant.id"
          >
            {{ restaurant.name }}
          </option>
        </select>
      </label>
    </div>

    <AppLoadingState
      v-if="loading"
      class="mt-8"
      :label="t('admin.loadingOwner')"
    />
    <AppEmptyState
      v-else-if="!restaurants.length"
      class="mt-8"
      :title="t('admin.noRestaurants')"
      :description="t('admin.noRestaurantsHint')"
    />
    <template v-else-if="stats">
      <p class="mt-4 text-xs text-[var(--muted)]">
        {{ t("admin.statsPaidOnly") }}
      </p>

      <div class="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="metric-tile">
          <p class="metric-label">{{ t("admin.statsRevenue") }}</p>
          <p class="value">{{ t("guest.priceAed", { price: stats.revenue }) }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("admin.statsCost") }}</p>
          <p class="value">{{ t("guest.priceAed", { price: stats.total_cost }) }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("admin.statsProfit") }}</p>
          <p class="value">{{ t("guest.priceAed", { price: stats.gross_profit }) }}</p>
          <p class="mt-1 text-xs text-[var(--muted)]">
            {{ t("admin.statsMargin") }}: {{ formatMargin(stats.margin_bps) }}
          </p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("admin.statsAvgTicket") }}</p>
          <p class="value">{{ t("guest.priceAed", { price: stats.average_ticket }) }}</p>
          <p class="mt-1 text-xs text-[var(--muted)]">
            {{ t("admin.statsOrders", { n: stats.order_count }) }}
            · {{ t("admin.statsAvgReady") }}:
            {{ formatReady(stats.average_ready_seconds) }}
          </p>
        </div>
      </div>

      <section class="admin-panel mt-5">
        <div class="admin-panel-head">
          <div>
            <h2 class="text-sm font-bold text-[var(--navy)]">
              {{ t("admin.statsSeriesTitle") }}
            </h2>
            <p class="mt-0.5 text-xs text-[var(--muted)]">
              {{ t("admin.statsSeriesHint") }}
            </p>
          </div>
        </div>
        <div class="admin-panel-body">
          <StatsChart mode="combo" :points="seriesPoints" />
        </div>
      </section>

      <div class="mt-5 grid gap-5 lg:grid-cols-2">
        <section class="admin-panel">
          <div class="admin-panel-head">
            <h2 class="font-display text-base font-bold text-[var(--ink)]">
              {{ t("admin.statsBestSellers") }}
            </h2>
          </div>
          <div class="admin-panel-body">
            <AppEmptyState
              v-if="!stats.best_sellers.length"
              :title="t('admin.statsEmpty')"
              :description="t('admin.statsEmptyHint')"
            />
            <ol v-else class="space-y-2.5">
              <li
                v-for="(dish, index) in stats.best_sellers"
                :key="dish.menu_item_id || dish.name_en"
                class="flex items-center justify-between gap-3 text-sm"
              >
                <span class="min-w-0 truncate font-semibold text-[var(--ink)]">
                  <span class="text-[var(--chili)]">{{ index + 1 }}.</span>
                  {{ localizedName(dish, locale) }}
                </span>
                <span class="shrink-0 font-mono font-bold text-[var(--herb)]">
                  ×{{ dish.quantity_sold }}
                </span>
              </li>
            </ol>
          </div>
        </section>

        <section class="admin-panel">
          <div class="admin-panel-head">
            <h2 class="font-display text-base font-bold text-[var(--ink)]">
              {{ t("admin.statsPeakHours") }}
            </h2>
          </div>
          <div class="admin-panel-body">
            <StatsChart mode="bar" :points="peakPoints" />
          </div>
        </section>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-2">
        <section class="admin-panel">
          <div class="admin-panel-head">
            <h2 class="text-sm font-bold text-[var(--navy)]">
              {{ t("admin.statsWeeksTitle") }}
            </h2>
          </div>
          <div class="admin-panel-body">
            <StatsChart mode="bar" :points="weekPoints" />
          </div>
        </section>
        <section class="admin-panel">
          <div class="admin-panel-head">
            <h2 class="text-sm font-bold text-[var(--navy)]">
              {{ t("admin.statsMonthsTitle") }}
            </h2>
          </div>
          <div class="admin-panel-body">
            <StatsChart mode="bar" :points="monthPoints" />
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
