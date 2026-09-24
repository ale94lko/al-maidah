<script setup lang="ts">
import { extractApiErrorMessage } from "~/utils/errors"

definePageMeta({
  layout: "superadmin",
})

type OwnerRestaurant = {
  id: string
  name: string
  slug: string
  trn: string | null
}

type DetailResponse = {
  user: {
    id: string
    email: string
    created_at: string
    last_sign_in_at: string | null
  }
  restaurants: OwnerRestaurant[]
}

const route = useRoute()
const { accessToken, refreshSession } = useAuth()
const { t } = useAppI18n()
const {
  errorOpen,
  errorTitle,
  errorMessage: dialogMessage,
  showError,
  dismissError,
} = useErrorDialog()

const userId = computed(() => String(route.params.id || ""))
const loading = ref(true)
const saving = ref(false)
const savingPassword = ref(false)
const deleting = ref(false)
const deleteConfirmOpen = ref(false)
const savedMessage = ref("")
const passwordMessage = ref("")

const email = ref("")
const restaurantId = ref<string | null>(null)
const restaurantName = ref("")
const slug = ref("")
const trn = ref("")
const newPassword = ref("")
const confirmPassword = ref("")

async function authHeaders() {
  const token = await accessToken()
  if (!token) {
    throw new Error("Not signed in")
  }
  return { Authorization: `Bearer ${token}` }
}

async function load() {
  loading.value = true
  savedMessage.value = ""
  passwordMessage.value = ""
  try {
    const result = await $fetch<DetailResponse>(
      `/api/superadmin/users/${encodeURIComponent(userId.value)}`,
      { headers: await authHeaders() },
    )
    email.value = result.user.email
    const first = result.restaurants[0]
    restaurantId.value = first?.id ?? null
    restaurantName.value = first?.name ?? ""
    slug.value = first?.slug ?? ""
    trn.value = first?.trn ?? ""
  } catch (error) {
    showError(extractApiErrorMessage(error) || t("superadmin.loadError"))
  } finally {
    loading.value = false
  }
}

async function onSave() {
  saving.value = true
  savedMessage.value = ""
  try {
    await $fetch(`/api/superadmin/users/${encodeURIComponent(userId.value)}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: {
        email: email.value.trim(),
        restaurantId: restaurantId.value ?? undefined,
        restaurantName: restaurantName.value.trim(),
        slug: slug.value.trim(),
        trn: trn.value.trim() || null,
      },
    })
    savedMessage.value = t("superadmin.saved")
    await load()
  } catch (error) {
    showError(extractApiErrorMessage(error) || t("superadmin.saveError"))
  } finally {
    saving.value = false
  }
}

async function onPassword() {
  passwordMessage.value = ""
  if (newPassword.value !== confirmPassword.value) {
    showError(t("superadmin.passwordMismatch"))
    return
  }
  savingPassword.value = true
  try {
    await $fetch(
      `/api/superadmin/users/${encodeURIComponent(userId.value)}/password`,
      {
        method: "POST",
        headers: await authHeaders(),
        body: { password: newPassword.value },
      },
    )
    newPassword.value = ""
    confirmPassword.value = ""
    passwordMessage.value = t("superadmin.passwordUpdated")
  } catch (error) {
    showError(extractApiErrorMessage(error) || t("superadmin.passwordError"))
  } finally {
    savingPassword.value = false
  }
}

async function onDelete() {
  deleteConfirmOpen.value = true
}

async function onDeleteConfirm() {
  deleting.value = true
  try {
    await $fetch(`/api/superadmin/users/${encodeURIComponent(userId.value)}`, {
      method: "DELETE",
      headers: await authHeaders(),
    })
    deleteConfirmOpen.value = false
    await navigateTo("/superadmin/users")
  } catch (error) {
    showError(extractApiErrorMessage(error) || t("superadmin.deleteError"))
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  const session = await refreshSession()
  if (!session) {
    await navigateTo({
      path: "/admin/login",
      query: { redirect: `/superadmin/users/${userId.value}` },
    })
    return
  }
  await load()
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

    <div class="mb-5">
      <NuxtLink
        to="/superadmin/users"
        class="text-sm font-bold text-[var(--herb-deep)]"
      >
        ← {{ t("superadmin.users") }}
      </NuxtLink>
      <h1 class="font-display mt-2 text-2xl font-bold text-[var(--ink)]">
        {{ t("superadmin.editUser") }}
      </h1>
    </div>

    <AppLoadingState
      v-if="loading"
      class="mt-8"
      :label="t('superadmin.loading')"
    />
    <template v-else>
      <section class="admin-panel">
        <div class="admin-panel-head">
          <h2 class="text-sm font-bold text-[var(--navy)]">
            {{ t("superadmin.accountDetails") }}
          </h2>
        </div>
        <div class="admin-panel-body">
          <form class="grid max-w-xl gap-3" @submit.prevent="onSave">
            <label class="block">
              <span class="field-label">{{ t("admin.email") }}</span>
              <input v-model="email" type="email" required class="field-input">
            </label>
            <label class="block">
              <span class="field-label">{{ t("admin.restaurantName") }}</span>
              <input
                v-model="restaurantName"
                type="text"
                :disabled="!restaurantId"
                class="field-input"
              >
            </label>
            <label class="block">
              <span class="field-label">{{ t("admin.slugOptional") }}</span>
              <input
                v-model="slug"
                type="text"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                :disabled="!restaurantId"
                class="field-input"
              >
            </label>
            <label class="block">
              <span class="field-label">{{ t("admin.trnOptional") }}</span>
              <input
                v-model="trn"
                type="text"
                :disabled="!restaurantId"
                class="field-input"
              >
            </label>
            <p v-if="savedMessage" class="text-sm font-semibold text-[var(--herb)]">
              {{ savedMessage }}
            </p>
            <button
              type="submit"
              class="btn-primary w-fit disabled:opacity-60"
              :disabled="saving"
            >
              {{ saving ? t("superadmin.saving") : t("superadmin.save") }}
            </button>
          </form>
        </div>
      </section>

      <section class="admin-panel mt-5">
        <div class="admin-panel-head">
          <h2 class="text-sm font-bold text-[var(--navy)]">
            {{ t("superadmin.changePassword") }}
          </h2>
        </div>
        <div class="admin-panel-body">
          <form class="grid max-w-xl gap-3" @submit.prevent="onPassword">
            <label class="block">
              <span class="field-label">{{ t("superadmin.newPassword") }}</span>
              <AppPasswordInput
                v-model="newPassword"
                required
                minlength="8"
                autocomplete="new-password"
              />
            </label>
            <label class="block">
              <span class="field-label">{{ t("superadmin.confirmPassword") }}</span>
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
            <button
              type="submit"
              class="btn-primary w-fit disabled:opacity-60"
              :disabled="savingPassword"
            >
              {{
                savingPassword
                  ? t("superadmin.saving")
                  : t("superadmin.updatePassword")
              }}
            </button>
          </form>
        </div>
      </section>

      <section class="admin-panel mt-5 border-[var(--chili)]/30">
        <div class="admin-panel-head">
          <h2 class="text-sm font-bold text-[var(--chili)]">
            {{ t("superadmin.dangerZone") }}
          </h2>
        </div>
        <div class="admin-panel-body">
          <p class="text-sm text-[var(--muted)]">
            {{ t("superadmin.deleteHint") }}
          </p>
          <button
            type="button"
            class="mt-3 rounded-full bg-[var(--chili)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            :disabled="deleting"
            @click="onDelete"
          >
            {{ deleting ? t("superadmin.deleting") : t("superadmin.deleteUser") }}
          </button>
        </div>
      </section>
    </template>

    <div
      v-if="deleteConfirmOpen"
      class="fixed inset-0 z-40 flex items-end justify-center bg-[var(--ink)]/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      @click.self="deleteConfirmOpen = false"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2
          id="delete-account-title"
          class="font-display text-xl font-bold text-[var(--chili)]"
        >
          {{ t("superadmin.deleteUser") }}
        </h2>
        <p class="mt-2 text-sm text-[var(--ink)]">
          {{ t("superadmin.confirmDelete") }}
        </p>
        <p class="mt-2 truncate text-sm font-semibold text-[var(--muted)]">
          {{ email }}
        </p>
        <p class="mt-2 text-xs text-[var(--muted)]">
          {{ t("superadmin.deleteHint") }}
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-full border border-[var(--navy)]/12 px-4 py-2 text-sm font-bold"
            :disabled="deleting"
            @click="deleteConfirmOpen = false"
          >
            {{ t("common.cancel") }}
          </button>
          <button
            type="button"
            class="rounded-full bg-[var(--chili)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            :disabled="deleting"
            @click="onDeleteConfirm"
          >
            {{ deleting ? t("superadmin.deleting") : t("superadmin.deleteUser") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
