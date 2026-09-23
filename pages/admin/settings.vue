<script setup lang="ts">
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

const restaurants = ref<MeResponse["restaurants"]>([])
const restaurantId = ref<string | null>(null)
const trnInput = ref("")
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref("")
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
  errorMessage.value = ""
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
    errorMessage.value =
      error instanceof Error ? error.message : t("admin.settingsSaveError")
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
  errorMessage.value = ""
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
    errorMessage.value =
      error instanceof Error ? error.message : t("admin.settingsSaveError")
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
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-stone-900">
          {{ t("admin.settingsTitle") }}
        </h1>
        <p class="mt-2 text-sm text-stone-600">
          {{ t("admin.settingsHint") }}
        </p>
      </div>
      <label
        v-if="restaurants.length > 1"
        class="flex flex-col gap-1 text-xs text-stone-500"
      >
        {{ t("admin.restaurant") }}
        <select
          class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
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
    <template v-else>
      <p v-if="errorMessage" class="mt-4 text-sm text-red-700">
        {{ errorMessage }}
      </p>

      <div
        v-if="trnMissing"
        class="mt-6 rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-amber-950"
      >
        <p class="font-semibold">{{ t("admin.trnMissingTitle") }}</p>
        <p class="mt-1 text-sm leading-relaxed">
          {{ t("admin.trnMissingHint") }}
        </p>
      </div>

      <form
        v-if="selected"
        class="mt-6 max-w-md space-y-4 rounded-2xl border border-teal-900/10 bg-white/80 p-4"
        @submit.prevent="onSave"
      >
        <p class="font-semibold text-stone-900">
          {{ selected.name }}
        </p>
        <label class="flex flex-col gap-1 text-sm text-stone-700">
          {{ t("admin.trnField") }}
          <input
            v-model="trnInput"
            type="text"
            autocomplete="off"
            class="rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm"
            :placeholder="t('admin.trnPlaceholder')"
          >
        </label>
        <p class="text-xs text-stone-500">
          {{ t("admin.trnFieldHint") }}
        </p>
        <p v-if="savedMessage" class="text-sm text-teal-800">
          {{ savedMessage }}
        </p>
        <button
          type="submit"
          class="rounded-xl bg-teal-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          :disabled="saving"
        >
          {{ saving ? t("admin.saving") : t("admin.save") }}
        </button>
      </form>

      <AppEmptyState
        v-else
        class="mt-8"
        :title="t('admin.noRestaurants')"
        :description="t('admin.noRestaurantsHint')"
      />
    </template>
  </div>
</template>
