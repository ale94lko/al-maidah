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
const loading = ref(true)

const currentPassword = ref("")
const newPassword = ref("")
const confirmPassword = ref("")
const savingPassword = ref(false)
const passwordMessage = ref("")

const selected = computed(
  () => restaurants.value.find((r) => r.id === restaurantId.value) ?? null,
)

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
    const me = await $fetch<MeResponse>("/api/auth/me", {
      headers: await authHeaders(),
    })
    restaurants.value = me.restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
    }))
    restaurantId.value = restaurants.value[0]?.id ?? null
  } catch (error) {
    showError(
      extractApiErrorMessage(error) || t("admin.settingsSaveError"),
    )
  } finally {
    loading.value = false
  }
}

function onRestaurantChange(event: Event) {
  restaurantId.value = (event.target as HTMLSelectElement).value
}

async function onPassword() {
  passwordMessage.value = ""
  if (newPassword.value !== confirmPassword.value) {
    showError(t("admin.passwordMismatch"))
    return
  }
  savingPassword.value = true
  try {
    await $fetch("/api/auth/password", {
      method: "POST",
      headers: await authHeaders(),
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    })
    currentPassword.value = ""
    newPassword.value = ""
    confirmPassword.value = ""
    passwordMessage.value = t("admin.passwordUpdated")
  } catch (error) {
    showError(extractApiErrorMessage(error) || t("admin.passwordError"))
  } finally {
    savingPassword.value = false
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
      <div v-if="selected" class="admin-split">
        <aside class="admin-panel overflow-hidden">
          <div
            class="relative overflow-hidden bg-[var(--ink)] px-5 py-6 text-white"
          >
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--citrus)]">
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
              <span class="status-chip status-chip-ok">
                {{ t("admin.owner") }}
              </span>
            </div>
            <dl class="space-y-3 text-sm">
              <div>
                <dt class="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
                  {{ t("admin.menuPath") }}
                </dt>
                <dd class="mt-1 font-mono text-[var(--ink)]">
                  /m/{{ selected.slug }}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        <section class="admin-panel">
          <div class="admin-panel-head">
            <div>
              <h2 class="font-display text-lg font-bold text-[var(--ink)]">
                {{ t("admin.changePassword") }}
              </h2>
              <p class="mt-0.5 text-xs text-[var(--muted)]">
                {{ t("admin.changePasswordHint") }}
              </p>
            </div>
          </div>
          <div class="admin-panel-body">
            <form class="grid gap-3" @submit.prevent="onPassword">
              <label class="block">
                <span class="field-label">{{ t("admin.currentPassword") }}</span>
                <AppPasswordInput
                  v-model="currentPassword"
                  required
                  minlength="8"
                  autocomplete="current-password"
                />
              </label>
              <label class="block">
                <span class="field-label">{{ t("admin.newPassword") }}</span>
                <AppPasswordInput
                  v-model="newPassword"
                  required
                  minlength="8"
                  autocomplete="new-password"
                />
              </label>
              <label class="block">
                <span class="field-label">{{ t("admin.confirmPassword") }}</span>
                <AppPasswordInput
                  v-model="confirmPassword"
                  required
                  minlength="8"
                  autocomplete="new-password"
                />
              </label>
              <p
                v-if="passwordMessage"
                class="text-sm font-semibold text-[var(--herb)]"
              >
                {{ passwordMessage }}
              </p>
              <div class="flex justify-end pt-1">
                <button
                  type="submit"
                  class="btn-primary min-w-[10rem] disabled:opacity-60"
                  :disabled="savingPassword"
                >
                  {{
                    savingPassword
                      ? t("admin.saving")
                      : t("admin.updatePassword")
                  }}
                </button>
              </div>
            </form>
          </div>
        </section>
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
