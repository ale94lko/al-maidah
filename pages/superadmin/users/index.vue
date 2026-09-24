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

type OwnerAccount = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  restaurants: OwnerRestaurant[]
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
const users = ref<OwnerAccount[]>([])
const showCreate = ref(false)
const creating = ref(false)
const createError = ref("")

const passwordTarget = ref<OwnerAccount | null>(null)
const newPassword = ref("")
const confirmPassword = ref("")
const savingPassword = ref(false)
const passwordError = ref("")
const passwordSuccess = ref("")

const deleteTarget = ref<OwnerAccount | null>(null)
const deleting = ref(false)

const form = reactive({
  email: "",
  password: "",
  restaurantName: "",
  slug: "",
  trn: "",
})

async function authHeaders() {
  const token = await accessToken()
  if (!token) {
    throw new Error("Not signed in")
  }
  return { Authorization: `Bearer ${token}` }
}

async function loadUsers() {
  loading.value = true
  try {
    const result = await $fetch<{ users: OwnerAccount[] }>(
      "/api/superadmin/users",
      { headers: await authHeaders() },
    )
    users.value = result.users
  } catch (error) {
    showError(extractApiErrorMessage(error) || t("superadmin.loadError"))
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.email = ""
  form.password = ""
  form.restaurantName = ""
  form.slug = ""
  form.trn = ""
  createError.value = ""
}

async function onCreate() {
  creating.value = true
  createError.value = ""
  try {
    await $fetch("/api/superadmin/users", {
      method: "POST",
      headers: await authHeaders(),
      body: {
        email: form.email.trim(),
        password: form.password,
        restaurantName: form.restaurantName.trim(),
        slug: form.slug.trim() || undefined,
        trn: form.trn.trim() || undefined,
      },
    })
    showCreate.value = false
    resetForm()
    await loadUsers()
  } catch (error) {
    createError.value =
      extractApiErrorMessage(error) || t("superadmin.createError")
  } finally {
    creating.value = false
  }
}

function restaurantLabel(account: OwnerAccount) {
  if (!account.restaurants.length) {
    return t("superadmin.noRestaurant")
  }
  return account.restaurants.map((r) => r.name).join(", ")
}

function openPassword(account: OwnerAccount) {
  passwordTarget.value = account
  newPassword.value = ""
  confirmPassword.value = ""
  passwordError.value = ""
  passwordSuccess.value = ""
}

function closePassword() {
  if (savingPassword.value) {
    return
  }
  passwordTarget.value = null
}

async function onPassword() {
  passwordError.value = ""
  passwordSuccess.value = ""
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = t("superadmin.passwordMismatch")
    return
  }
  const account = passwordTarget.value
  if (!account) {
    return
  }
  savingPassword.value = true
  try {
    await $fetch(
      `/api/superadmin/users/${encodeURIComponent(account.id)}/password`,
      {
        method: "POST",
        headers: await authHeaders(),
        body: { password: newPassword.value },
      },
    )
    passwordSuccess.value = t("superadmin.passwordUpdated")
    newPassword.value = ""
    confirmPassword.value = ""
  } catch (error) {
    passwordError.value =
      extractApiErrorMessage(error) || t("superadmin.passwordError")
  } finally {
    savingPassword.value = false
  }
}

function openDelete(account: OwnerAccount) {
  deleteTarget.value = account
}

function closeDelete() {
  if (deleting.value) {
    return
  }
  deleteTarget.value = null
}

async function onDeleteConfirm() {
  const account = deleteTarget.value
  if (!account) {
    return
  }
  deleting.value = true
  try {
    await $fetch(`/api/superadmin/users/${encodeURIComponent(account.id)}`, {
      method: "DELETE",
      headers: await authHeaders(),
    })
    deleteTarget.value = null
    await loadUsers()
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
      query: { redirect: "/superadmin/users" },
    })
    return
  }
  await loadUsers()
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
          {{ t("superadmin.users") }}
        </h1>
        <p class="mt-1 text-sm text-[var(--muted)]">
          {{ t("superadmin.usersHint") }}
        </p>
      </div>
      <button
        type="button"
        class="btn-primary"
        @click="showCreate = true; resetForm()"
      >
        {{ t("superadmin.createOwner") }}
      </button>
    </div>

    <AppLoadingState
      v-if="loading"
      class="mt-8"
      :label="t('superadmin.loading')"
    />
    <AppEmptyState
      v-else-if="!users.length"
      class="mt-8"
      :title="t('superadmin.usersEmpty')"
      :description="t('superadmin.usersEmptyHint')"
    />
    <section v-else class="admin-panel">
      <div class="admin-panel-body overflow-x-auto p-0">
        <table class="w-full min-w-[40rem] text-start text-sm">
          <thead class="border-b border-[var(--navy)]/8 bg-[var(--paper)]/80 text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th class="px-4 py-3 font-bold">{{ t("admin.email") }}</th>
              <th class="px-4 py-3 font-bold">{{ t("admin.restaurant") }}</th>
              <th class="px-4 py-3 font-bold">{{ t("superadmin.lastSignIn") }}</th>
              <th class="px-4 py-3 font-bold">{{ t("superadmin.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="account in users"
              :key="account.id"
              class="border-b border-[var(--navy)]/6 last:border-0"
            >
              <td class="px-4 py-3 font-semibold text-[var(--ink)]">
                {{ account.email }}
              </td>
              <td class="px-4 py-3 text-[var(--muted)]">
                {{ restaurantLabel(account) }}
              </td>
              <td class="px-4 py-3 text-[var(--muted)]">
                {{
                  account.last_sign_in_at
                    ? new Date(account.last_sign_in_at).toLocaleString()
                    : "—"
                }}
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <NuxtLink
                    :to="`/superadmin/users/${account.id}`"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--espresso)]/15 bg-white text-[var(--navy)] transition hover:bg-[var(--paper)]"
                    :aria-label="t('superadmin.edit')"
                    :title="t('superadmin.edit')"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </NuxtLink>
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--espresso)]/15 bg-white text-[var(--navy)] transition hover:bg-[var(--paper)]"
                    :aria-label="t('superadmin.changePassword')"
                    :title="t('superadmin.changePassword')"
                    @click="openPassword(account)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path
                        d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="btn-danger inline-flex !h-9 !w-9 !items-center !justify-center !rounded-xl !p-0"
                    :aria-label="t('superadmin.deleteUser')"
                    :title="t('superadmin.deleteUser')"
                    @click="openDelete(account)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path d="M10 11v6M14 11v6" stroke-linecap="round" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div
      v-if="showCreate"
      class="fixed inset-0 z-40 flex items-end justify-center bg-[var(--ink)]/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      @click.self="showCreate = false"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 class="font-display text-xl font-bold text-[var(--ink)]">
          {{ t("superadmin.createOwner") }}
        </h2>
        <p class="mt-1 text-sm text-[var(--muted)]">
          {{ t("superadmin.createOwnerHint") }}
        </p>
        <form class="mt-5 space-y-3" @submit.prevent="onCreate">
          <label class="block">
            <span class="field-label">{{ t("admin.restaurantName") }}</span>
            <input v-model="form.restaurantName" type="text" required class="field-input">
          </label>
          <label class="block">
            <span class="field-label">{{ t("admin.slugOptional") }}</span>
            <input
              v-model="form.slug"
              type="text"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              :placeholder="t('admin.slugPlaceholder')"
              class="field-input"
            >
          </label>
          <label class="block">
            <span class="field-label">{{ t("admin.trnOptional") }}</span>
            <input v-model="form.trn" type="text" class="field-input">
          </label>
          <label class="block">
            <span class="field-label">{{ t("admin.email") }}</span>
            <input v-model="form.email" type="email" required autocomplete="off" class="field-input">
          </label>
          <label class="block">
            <span class="field-label">{{ t("admin.password") }}</span>
            <AppPasswordInput
              v-model="form.password"
              required
              minlength="8"
              autocomplete="new-password"
            />
          </label>
          <p v-if="createError" class="text-sm font-semibold text-[var(--chili)]">
            {{ createError }}
          </p>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="rounded-full border border-[var(--navy)]/12 px-4 py-2 text-sm font-bold"
              @click="showCreate = false"
            >
              {{ t("common.cancel") }}
            </button>
            <button
              type="submit"
              class="btn-primary disabled:opacity-60"
              :disabled="creating"
            >
              {{ creating ? t("admin.creating") : t("admin.createAccount") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="passwordTarget"
      class="fixed inset-0 z-40 flex items-end justify-center bg-[var(--ink)]/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      @click.self="closePassword"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 class="font-display text-xl font-bold text-[var(--ink)]">
          {{ t("superadmin.changePassword") }}
        </h2>
        <p class="mt-1 truncate text-sm text-[var(--muted)]">
          {{ passwordTarget.email }}
        </p>
        <form class="mt-5 space-y-3" @submit.prevent="onPassword">
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
            v-if="passwordError"
            class="text-sm font-semibold text-[var(--chili)]"
          >
            {{ passwordError }}
          </p>
          <p
            v-else-if="passwordSuccess"
            class="text-sm font-semibold text-[var(--herb)]"
          >
            {{ passwordSuccess }}
          </p>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="rounded-full border border-[var(--navy)]/12 px-4 py-2 text-sm font-bold"
              :disabled="savingPassword"
              @click="closePassword"
            >
              {{ t("common.cancel") }}
            </button>
            <button
              type="submit"
              class="btn-primary disabled:opacity-60"
              :disabled="savingPassword"
            >
              {{
                savingPassword
                  ? t("superadmin.saving")
                  : t("superadmin.updatePassword")
              }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="deleteTarget"
      class="fixed inset-0 z-40 flex items-end justify-center bg-[var(--ink)]/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      @click.self="closeDelete"
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
          {{ deleteTarget.email }}
        </p>
        <p class="mt-2 text-xs text-[var(--muted)]">
          {{ t("superadmin.deleteHint") }}
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-full border border-[var(--navy)]/12 px-4 py-2 text-sm font-bold"
            :disabled="deleting"
            @click="closeDelete"
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
