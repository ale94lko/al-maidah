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
                <NuxtLink
                  :to="`/superadmin/users/${account.id}`"
                  class="font-extrabold text-[var(--herb-deep)] underline"
                >
                  {{ t("superadmin.edit") }}
                </NuxtLink>
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
            <input
              v-model="form.password"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
              class="field-input"
            >
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
  </div>
</template>
