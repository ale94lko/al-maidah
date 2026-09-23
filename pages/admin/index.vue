<script setup lang="ts">
import type { OwnerStatsResponse, StatsRange } from "~/types"
import { localizedName } from "~/utils/localize"

definePageMeta({
  layout: "admin",
})

type MeResponse = {
  user: { id: string; email?: string }
  restaurants: Array<{ id: string; name: string; slug: string }>
}

const RANGES: StatsRange[] = ["today", "week", "month", "last_30_days"]

const { user, refreshSession, accessToken } = useAuth()
const { t, locale } = useAppI18n()

const restaurants = ref<MeResponse["restaurants"]>([])
const restaurantId = ref<string | null>(null)
const range = ref<StatsRange>("last_30_days")
const stats = ref<OwnerStatsResponse | null>(null)
const loading = ref(true)
const errorMessage = ref("")

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
  errorMessage.value = ""
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
    errorMessage.value =
      error instanceof Error ? error.message : t("admin.statsLoadError")
  }
}

async function bootstrap() {
  loading.value = true
  errorMessage.value = ""
  try {
    const me = await $fetch<MeResponse>("/api/auth/me", {
      headers: await authHeaders(),
    })
    restaurants.value = me.restaurants
    restaurantId.value = me.restaurants[0]?.id ?? null
    await loadStats()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("admin.statsLoadError")
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

function barWidth(value: number, max: number): string {
  if (max <= 0) {
    return "0%"
  }
  return `${Math.max(4, Math.round((value / max) * 100))}%`
}

const seriesMax = computed(() => {
  const points = stats.value?.series ?? []
  return Math.max(0, ...points.map((point) => Number(point.revenue) || 0))
})

const peakMax = computed(() => {
  const points = stats.value?.peak_hours ?? []
  return Math.max(0, ...points.map((point) => point.order_count))
})

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
    <header class="admin-page-hero">
      <div>
        <p class="eyebrow">{{ t("admin.owner") }}</p>
        <h1>{{ t("admin.statsTitle") }}</h1>
        <p>{{ t("admin.statsHint") }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
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
    </header>

    <div
      class="mb-6 flex flex-wrap gap-2"
      role="group"
      :aria-label="t('admin.statsRangeLabel')"
    >
      <button
        v-for="option in RANGES"
        :key="option"
        type="button"
        class="rounded-2xl px-3.5 py-2 text-sm font-bold transition"
        :class="
          range === option
            ? 'bg-[var(--chili)] text-white shadow-lg shadow-[var(--chili)]/25'
            : 'border border-[var(--ink)]/10 bg-white text-[var(--ink)] hover:border-[var(--herb)]/40'
        "
        @click="onRangeChange(option)"
      >
        {{ t(`admin.statsRange.${option}`) }}
      </button>
    </div>

    <AppLoadingState
      v-if="loading"
      class="mt-8"
      :label="t('admin.loadingOwner')"
    />
    <p v-else-if="errorMessage" class="mt-8 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <AppEmptyState
      v-else-if="!restaurants.length"
      class="mt-8"
      :title="t('admin.noRestaurants')"
      :description="t('admin.noRestaurantsHint')"
    />
    <template v-else-if="stats">
      <p class="mt-4 text-xs text-[var(--muted)]">
        {{ t("admin.signedInAs") }}
        <span class="font-medium text-[var(--ink)]">{{ user?.email }}</span>
        · {{ t("admin.statsPaidOnly") }}
      </p>

      <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="metric-tile">
          <p class="metric-label">
            {{ t("admin.statsRevenue") }}
          </p>
          <p class="value" style="color: var(--herb)">
            {{ t("guest.priceAed", { price: stats.revenue }) }}
          </p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">
            {{ t("admin.statsCost") }}
          </p>
          <p class="value">
            {{ t("guest.priceAed", { price: stats.total_cost }) }}
          </p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">
            {{ t("admin.statsProfit") }}
          </p>
          <p class="value" style="color: var(--chili)">
            {{ t("guest.priceAed", { price: stats.gross_profit }) }}
          </p>
          <p class="mt-1 text-xs text-[var(--muted)]">
            {{ t("admin.statsMargin") }}: {{ formatMargin(stats.margin_bps) }}
          </p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">
            {{ t("admin.statsAvgTicket") }}
          </p>
          <p class="value" style="color: var(--citrus-deep)">
            {{ t("guest.priceAed", { price: stats.average_ticket }) }}
          </p>
          <p class="mt-1 text-xs text-[var(--muted)]">
            {{ t("admin.statsOrders", { n: stats.order_count }) }}
            · {{ t("admin.statsAvgReady") }}:
            {{ formatReady(stats.average_ready_seconds) }}
          </p>
        </div>
      </div>

      <section class="admin-panel mt-6">
        <div class="admin-panel-head">
          <div>
            <h2 class="font-display text-base font-bold text-[var(--ink)]">
              {{ t("admin.statsSeriesTitle") }}
            </h2>
            <p class="mt-0.5 text-xs text-[var(--muted)]">
              {{ t("admin.statsSeriesHint") }}
            </p>
          </div>
        </div>
        <div class="admin-panel-body">
          <ul class="space-y-2.5">
            <li
              v-for="point in stats.series"
              :key="point.key"
              class="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-sm"
            >
              <span class="font-mono text-xs text-[var(--muted)]">{{ point.label }}</span>
              <div class="h-2.5 overflow-hidden rounded-xl bg-[var(--paper-deep)]">
                <div
                  class="h-full rounded-xl bg-[var(--herb)]"
                  :style="{ width: barWidth(Number(point.revenue), seriesMax) }"
                />
              </div>
              <span class="font-mono text-xs font-bold text-[var(--ink)]">
                {{ t("guest.priceAed", { price: point.revenue }) }}
                <span class="font-normal text-[var(--muted)]">({{ point.order_count }})</span>
              </span>
            </li>
          </ul>
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
            <ul class="space-y-2">
              <li
                v-for="bucket in stats.peak_hours"
                :key="bucket.hour"
                class="grid grid-cols-[3rem_1fr_2rem] items-center gap-2 text-xs"
              >
                <span class="font-mono text-[var(--muted)]">
                  {{ String(bucket.hour).padStart(2, "0") }}:00
                </span>
                <div class="h-2 overflow-hidden rounded-xl bg-[var(--paper-deep)]">
                  <div
                    class="h-full rounded-xl bg-[var(--citrus)]"
                    :style="{ width: barWidth(bucket.order_count, peakMax) }"
                  />
                </div>
                <span class="font-mono font-bold text-[var(--ink)]">{{ bucket.order_count }}</span>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-2">
        <section class="rounded-3xl border border-[var(--ink)]/8 bg-[var(--surface)]/80 p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {{ t("admin.statsWeeksTitle") }}
          </h2>
          <ul class="mt-4 space-y-2">
            <li
              v-for="point in stats.series_by_week"
              :key="point.key"
              class="flex justify-between gap-3 text-sm"
            >
              <span class="font-mono text-xs text-[var(--muted)]">{{ point.label }}</span>
              <span class="font-mono text-[var(--espresso)]">
                {{ t("guest.priceAed", { price: point.revenue }) }}
              </span>
            </li>
          </ul>
        </section>
        <section class="rounded-3xl border border-[var(--ink)]/8 bg-[var(--surface)]/80 p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {{ t("admin.statsMonthsTitle") }}
          </h2>
          <ul class="mt-4 space-y-2">
            <li
              v-for="point in stats.series_by_month"
              :key="point.key"
              class="flex justify-between gap-3 text-sm"
            >
              <span class="font-mono text-xs text-[var(--muted)]">{{ point.label }}</span>
              <span class="font-mono text-[var(--espresso)]">
                {{ t("guest.priceAed", { price: point.revenue }) }}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
