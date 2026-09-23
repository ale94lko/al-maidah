<script setup lang="ts">
import { extractApiErrorMessage } from "~/utils/errors"

definePageMeta({
  layout: "admin",
})

type MeResponse = {
  user: { id: string; email?: string }
  restaurants: Array<{
    id: string
    name: string
    slug: string
    trn: string | null
  }>
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

const restaurants = ref<MeResponse["restaurants"]>([])
const restaurantId = ref<string | null>(null)
const trnInput = ref("")
const loading = ref(true)
const saving = ref(false)
const savedMessage = ref("")

const selected = computed(
  () => restaurants.value.find((r) => r.id === restaurantId.value) ?? null,
)
const trnMissing = computed(() => !selected.value?.trn)

async function authHeaders() {
  const token = await accessToken()
  if (!token) {
    throw new Error("Not signed in")
  }
  return { Authorization: `Bearer ${token}` }
}

async function loadRestaurant(id: string) {
  const headers = await authHeaders()
  const result = await $fetch<{
    restaurant: { id: string; name: string; slug: string; trn: string | null }
  }>(`/api/admin/restaurants/${encodeURIComponent(id)}`, { headers })
  const idx = restaurants.value.findIndex((r) => r.id === id)
  const current = idx >= 0 ? restaurants.value[idx] : null
  if (current) {
    restaurants.value[idx] = {
      id: current.id,
      name: current.name,
      slug: current.slug,
      trn: result.restaurant.trn,
    }
  }
  trnInput.value = result.restaurant.trn || ""
}

async function bootstrap() {
  loading.value = true
  try {
    const me = await $fetch<MeResponse>("/api/auth/me", {
      headers: await authHeaders(),
    })
    restaurants.value = me.restaurants.map((r) => ({
      ...r,
      trn: r.trn ?? null,
    }))
    restaurantId.value = restaurants.value[0]?.id ?? null
    if (restaurantId.value) {
      await loadRestaurant(restaurantId.value)
    }
  } catch (error) {
    showError(
      extractApiErrorMessage(error) || t("admin.settingsSaveError"),
    )
  } finally {
    loading.value = false
  }
}

async function onRestaurantChange(event: Event) {
  restaurantId.value = (event.target as HTMLSelectElement).value
  savedMessage.value = ""
  if (restaurantId.value) {
    await loadRestaurant(restaurantId.value)
  }
}

async function onSave() {
  if (!restaurantId.value) {
    return
  }
  saving.value = true
  savedMessage.value = ""
  try {
    const result = await $fetch<{
      restaurant: { id: string; trn: string | null }
    }>(`/api/admin/restaurants/${encodeURIComponent(restaurantId.value)}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: { trn: trnInput.value },
    })
    const idx = restaurants.value.findIndex((r) => r.id === restaurantId.value)
    const current = idx >= 0 ? restaurants.value[idx] : null
    if (current) {
      restaurants.value[idx] = {
        id: current.id,
        name: current.name,
        slug: current.slug,
        trn: result.restaurant.trn,
      }
    }
    trnInput.value = result.restaurant.trn || ""
    savedMessage.value = t("admin.settingsSaved")
  } catch (error) {
    showError(
      extractApiErrorMessage(error) || t("admin.settingsSaveError"),
    )
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const session = await refreshSession()
  if (!session) {
    await navigateTo({
      path: "/admin/login",
      query: { redirect: "/admin/settings" },
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

    <header class="admin-page-hero">
      <div>
        <p class="eyebrow">{{ t("admin.owner") }}</p>
        <h1>{{ t("admin.settingsTitle") }}</h1>
        <p>{{ t("admin.settingsHint") }}</p>
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
    </header>

    <AppLoadingState
      v-if="loading"
      :label="t('admin.loadingOwner')"
    />
    <template v-else>
      <div
        v-if="trnMissing && selected"
        class="mb-5 flex flex-wrap items-start gap-3 rounded-3xl border border-[var(--citrus)]/40 bg-[color-mix(in_srgb,var(--citrus)_18%,white)] px-5 py-4"
      >
        <span
          class="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-[var(--citrus-deep)]"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p class="font-bold text-[var(--ink)]">{{ t("admin.trnMissingTitle") }}</p>
          <p class="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            {{ t("admin.trnMissingHint") }}
          </p>
        </div>
      </div>

      <div v-if="selected" class="admin-split">
        <aside class="admin-panel overflow-hidden">
          <div
            class="relative overflow-hidden bg-[var(--ink)] px-5 py-6 text-white"
          >
            <div class="accent-bar max-w-[6rem]" aria-hidden="true">
              <span /><span /><span />
            </div>
            <p class="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--citrus)]">
              {{ t("admin.restaurant") }}
            </p>
            <h2 class="font-display mt-2 text-3xl font-bold tracking-tight">
              {{ selected.name }}
            </h2>
            <p class="mt-2 font-mono text-sm text-white/55">
              /m/{{ selected.slug }}
            </p>
          </div>
          <div class="admin-panel-body space-y-4">
            <div class="flex flex-wrap gap-2">
              <span
                v-if="!trnMissing"
                class="status-chip status-chip-ok"
              >
                {{ t("admin.trnField") }}
              </span>
              <span
                v-else
                class="status-chip status-chip-warn"
              >
                {{ t("admin.trnMissingTitle") }}
              </span>
              <span class="status-chip status-chip-ok">
                {{ t("admin.owner") }}
              </span>
            </div>
            <dl class="space-y-3 text-sm">
              <div>
                <dt class="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                  {{ t("admin.trnField") }}
                </dt>
                <dd class="mt-1 font-mono text-[var(--ink)]">
                  {{ selected.trn || "—" }}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <form class="admin-panel flex flex-col" @submit.prevent="onSave">
          <div class="admin-panel-head">
            <div>
              <h2 class="font-display text-lg font-bold text-[var(--ink)]">
                {{ t("admin.trnField") }}
              </h2>
              <p class="mt-0.5 text-xs text-[var(--muted)]">
                {{ t("admin.trnFieldHint") }}
              </p>
            </div>
          </div>
          <div class="admin-panel-body flex flex-1 flex-col gap-5">
            <label class="block">
              <span class="field-label">{{ t("admin.trnField") }}</span>
              <input
                v-model="trnInput"
                type="text"
                autocomplete="off"
                class="field-input font-mono"
                :placeholder="t('admin.trnPlaceholder')"
              >
            </label>
            <p v-if="savedMessage" class="text-sm font-semibold text-[var(--herb)]">
              {{ savedMessage }}
            </p>
            <div class="mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-[var(--ink)]/6 pt-5">
              <button
                type="submit"
                class="btn-primary min-w-[8rem] disabled:opacity-60"
                :disabled="saving"
              >
                {{ saving ? t("admin.saving") : t("admin.save") }}
              </button>
            </div>
          </div>
        </form>
      </div>

      <AppEmptyState
        v-else
        class="mt-2"
        :title="t('admin.noRestaurants')"
        :description="t('admin.noRestaurantsHint')"
      />
    </template>
  </div>
</template>
