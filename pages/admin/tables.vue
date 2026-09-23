<script setup lang="ts">
import { extractApiErrorMessage } from "~/utils/errors"

definePageMeta({
  layout: "admin",
})

const { refreshSession } = useAuth()
const { t } = useAppI18n()
const {
  restaurants,
  restaurantId,
  restaurant,
  tables,
  loading,
  saving,
  menuUrlForTable,
  bootstrap,
  selectRestaurant,
  createTable,
  renumberTable,
  removeTable,
} = useAdminTables()
const {
  errorOpen,
  errorTitle,
  errorMessage,
  showError,
  dismissError,
} = useErrorDialog()

const ready = ref(false)
const newNumber = ref<number | null>(null)
const newLabel = ref("")
const editingId = ref<string | null>(null)
const editNumber = ref<number | null>(null)
const copiedId = ref<string | null>(null)

function friendlyTablesError(error: unknown) {
  const raw = (extractApiErrorMessage(error) || "").toLowerCase()
  if (
    raw.includes("already") ||
    raw.includes("in use") ||
    raw.includes("مستخدم")
  ) {
    return t("admin.tableNumberInUse")
  }
  if (raw.includes("positive") || raw.includes("موجب")) {
    return t("admin.tableNumberInvalid")
  }
  return t("admin.tablesSaveError")
}

onMounted(async () => {
  const session = await refreshSession()
  if (!session) {
    await navigateTo({
      path: "/admin/login",
      query: { redirect: "/admin/tables" },
    })
    return
  }
  ready.value = true
  try {
    await bootstrap()
  } catch (error) {
    showError(
      extractApiErrorMessage(error) || t("admin.tablesLoadError"),
    )
  }
})

async function onRestaurantChange(event: Event) {
  try {
    await selectRestaurant((event.target as HTMLSelectElement).value)
  } catch (error) {
    showError(
      extractApiErrorMessage(error) || t("admin.tablesLoadError"),
    )
  }
}

async function onCreate() {
  if (!newNumber.value || newNumber.value <= 0) {
    showError(t("admin.tableNumberInvalid"))
    return
  }
  try {
    await createTable(newNumber.value, newLabel.value)
    newNumber.value = null
    newLabel.value = ""
  } catch (error) {
    showError(friendlyTablesError(error))
  }
}

function startRenumber(tableId: string, current: number) {
  editingId.value = tableId
  editNumber.value = current
}

async function confirmRenumber() {
  if (!editingId.value || !editNumber.value || editNumber.value <= 0) {
    showError(t("admin.tableNumberInvalid"))
    return
  }
  try {
    await renumberTable(editingId.value, editNumber.value)
    editingId.value = null
    editNumber.value = null
  } catch (error) {
    showError(friendlyTablesError(error))
  }
}

async function onRemove(tableId: string, tableNumber: number) {
  if (
    !window.confirm(
      t("admin.confirmRemoveTable", { n: tableNumber }),
    )
  ) {
    return
  }
  try {
    await removeTable(tableId)
  } catch (error) {
    showError(friendlyTablesError(error))
  }
}

function onPrint() {
  window.print()
}

async function copyMenuUrl(tableId: string) {
  const url = menuUrlForTable(tableId)
  if (!url) {
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    copiedId.value = tableId
    window.setTimeout(() => {
      if (copiedId.value === tableId) {
        copiedId.value = null
      }
    }, 1600)
  } catch {
    showError(t("admin.tablesSaveError"))
  }
}
</script>

<template>
  <div>
    <AppErrorDialog
      :open="errorOpen"
      :title="errorTitle"
      :message="errorMessage"
      @dismiss="dismissError"
    />

    <header class="admin-page-hero no-print">
      <div>
        <p class="eyebrow">{{ t("admin.owner") }}</p>
        <h1>{{ t("admin.tablesTitle") }}</h1>
        <p>{{ t("admin.tablesHint") }}</p>
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
              v-for="entry in restaurants"
              :key="entry.id"
              :value="entry.id"
            >
              {{ entry.name }}
            </option>
          </select>
        </label>
        <button
          v-if="tables.length"
          type="button"
          class="btn-primary"
          @click="onPrint"
        >
          {{ t("admin.printQrCodes") }}
        </button>
      </div>
    </header>

    <AppLoadingState
      v-if="!ready || loading"
      class="no-print mt-8"
      :label="t('admin.loadingOwner')"
    />
    <template v-else>
      <AppEmptyState
        v-if="!restaurants.length"
        class="no-print mt-8"
        :title="t('admin.noRestaurants')"
        :description="t('admin.noRestaurantsHint')"
      />

      <div v-else class="mt-2 space-y-5">
        <section class="admin-panel no-print">
          <div class="admin-panel-head">
            <h2 class="font-display text-base font-bold text-[var(--ink)]">
              {{ t("admin.addTable") }}
            </h2>
          </div>
          <div class="admin-panel-body">
            <form
              class="flex flex-wrap items-end gap-3"
              @submit.prevent="onCreate"
            >
              <label class="flex w-28 flex-col gap-1 text-xs font-bold text-[var(--muted)]">
                {{ t("admin.tableNumber") }}
                <input
                  v-model.number="newNumber"
                  required
                  type="number"
                  min="1"
                  step="1"
                  class="field-input"
                >
              </label>
              <label class="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-bold text-[var(--muted)]">
                {{ t("admin.tableLabelOptional") }}
                <input
                  v-model="newLabel"
                  class="field-input"
                >
              </label>
              <button
                type="submit"
                class="btn-primary disabled:opacity-60"
                :disabled="saving"
              >
                {{ t("admin.addTable") }}
              </button>
            </form>
          </div>
        </section>

        <section class="admin-panel no-print !p-0">
          <ul v-if="tables.length" class="divide-y divide-[var(--espresso)]/10">
            <li
              v-for="table in tables"
              :key="table.id"
              class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="font-semibold text-[var(--espresso)]">
                  {{ t("admin.tableHeading", { n: table.table_number }) }}
                  <span
                    v-if="table.label"
                    class="ms-2 text-sm font-normal text-[var(--muted)]"
                  >
                    {{ table.label }}
                  </span>
                </p>
                <div class="mt-1 flex min-w-0 items-center gap-2">
                  <p class="truncate font-mono text-xs text-[var(--muted)]">
                    {{ menuUrlForTable(table.id) }}
                  </p>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--navy)]/10 bg-white text-[var(--navy)]"
                    :aria-label="copiedId === table.id ? t('admin.copiedUrl') : t('admin.copyUrl')"
                    @click="copyMenuUrl(table.id)"
                  >
                    <svg
                      v-if="copiedId === table.id"
                      viewBox="0 0 24 24"
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <svg
                      v-else
                      viewBox="0 0 24 24"
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke-linecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <template v-if="editingId === table.id">
                  <input
                    v-model.number="editNumber"
                    type="number"
                    min="1"
                    class="w-20 rounded-2xl border border-[var(--espresso)]/15 px-2 py-1 text-sm"
                  >
                  <button
                    type="button"
                    class="btn-primary !px-2 !py-1 !text-xs"
                    :disabled="saving"
                    @click="confirmRenumber"
                  >
                    {{ t("admin.save") }}
                  </button>
                  <button
                    type="button"
                    class="rounded-2xl border border-[var(--espresso)]/15 px-2 py-1 text-xs"
                    @click="editingId = null"
                  >
                    {{ t("admin.cancel") }}
                  </button>
                </template>
                <template v-else>
                  <button
                    type="button"
                    class="rounded-2xl border border-[var(--espresso)]/15 px-2 py-1 text-xs"
                    :disabled="saving"
                    @click="startRenumber(table.id, table.table_number)"
                  >
                    {{ t("admin.renumber") }}
                  </button>
                  <button
                    type="button"
                    class="btn-danger !px-2 !py-1 !text-xs"
                    :disabled="saving"
                    @click="onRemove(table.id, table.table_number)"
                  >
                    {{ t("admin.removeTable") }}
                  </button>
                </template>
              </div>
            </li>
          </ul>
          <AppEmptyState
            v-else
            class="border-0"
            :title="t('admin.tablesEmpty')"
            :description="t('admin.tablesEmptyHint')"
          />
        </section>

        <!-- Printable QR sheets: visible on screen as preview and used by window.print() -->
        <section
          v-if="tables.length && restaurant"
          class="space-y-6"
          aria-label="Printable QR codes"
        >
          <h2 class="no-print text-lg font-semibold text-[var(--espresso)]">
            {{ t("admin.printPreview") }}
          </h2>
          <div
            v-for="table in tables"
            :key="`print-${table.id}`"
            class="print-sheet mx-auto flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-[var(--espresso)]/15 bg-[var(--ivory)] p-8 text-center"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--herb)]">
              Al-Maidah
            </p>
            <h3 class="text-2xl font-bold tracking-tight text-[var(--espresso)]">
              {{ restaurant.name }}
            </h3>
            <p class="text-4xl font-bold tabular-nums text-[var(--herb)]">
              {{ t("admin.tableHeading", { n: table.table_number }) }}
            </p>
            <AdminTableQr
              :value="menuUrlForTable(table.id)"
              :size="220"
              class="w-56"
            />
            <div class="space-y-1 text-sm text-[var(--ink)]">
              <p>{{ t("admin.scanPromptEn") }}</p>
              <p dir="rtl" class="font-medium">
                {{ t("admin.scanPromptAr") }}
              </p>
            </div>
            <p class="break-all font-mono text-[10px] text-[var(--muted)]">
              {{ menuUrlForTable(table.id) }}
            </p>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
