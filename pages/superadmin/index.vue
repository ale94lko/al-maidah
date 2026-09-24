<script setup lang="ts">
import { extractApiErrorMessage } from "~/utils/errors"

definePageMeta({
  layout: "superadmin",
})

type PlatformStats = {
  owner_count: number
  restaurant_count: number
  order_count: number
  paid_order_count: number
  revenue: string
  active_restaurants_30d: number
  orders_last_30_days: number
  revenue_last_30_days: string
}

const { accessToken, refreshSession } = useAuth()
const { t } = useAppI18n()
const {
  errorOpen,
  errorTitle,
  errorMessage: dialogMessage,
  showError,
  dismissError,
} = useErrorDialog()

const loading = ref(true)
const stats = ref<PlatformStats | null>(null)

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
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statRestaurants") }}</p>
          <p class="value">{{ stats.restaurant_count }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statActive30d") }}</p>
          <p class="value">{{ stats.active_restaurants_30d }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statPaidOrders") }}</p>
          <p class="value">{{ stats.paid_order_count }}</p>
        </div>
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statRevenue") }}</p>
          <p class="value">{{ t("guest.priceAed", { price: stats.revenue }) }}</p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statRevenue30d") }}</p>
          <p class="value">
            {{ t("guest.priceAed", { price: stats.revenue_last_30_days }) }}
          </p>
        </div>
        <div class="metric-tile">
          <p class="metric-label">{{ t("superadmin.statOrders30d") }}</p>
          <p class="value">{{ stats.orders_last_30_days }}</p>
          <p class="mt-1 text-xs text-[var(--muted)]">
            {{ t("superadmin.statOrdersTotal", { n: stats.order_count }) }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
