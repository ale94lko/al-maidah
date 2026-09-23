<script setup lang="ts">
import type { DiningTableWithSession } from "~/types"
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
  openSession,
  closeSession,
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
const viewingTable = ref<DiningTableWithSession | null>(null)
const viewingUrlOverride = ref("")

const viewingUrl = computed(() => {
  if (viewingUrlOverride.value) {
    return viewingUrlOverride.value
  }
  return viewingTable.value ? menuUrlForTable(viewingTable.value.id) : ""
})

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
    if (viewingTable.value?.id === tableId) {
      viewingTable.value = null
      viewingUrlOverride.value = ""
    }
  } catch (error) {
    showError(friendlyTablesError(error))
  }
}

async function onSeat(table: DiningTableWithSession) {
  try {
    const response = await openSession(table.id)
    const refreshed = tables.value.find((entry) => entry.id === table.id) ?? {
      ...table,
      open_session: {
        id: response.session.id,
        token: response.session.token,
        opened_at: response.session.opened_at,
      },
    }
    viewingTable.value = refreshed as DiningTableWithSession
    viewingUrlOverride.value = response.menuUrl
  } catch (error) {
    showError(friendlyTablesError(error))
  }
}

async function onCloseSession(table: DiningTableWithSession) {
  try {
    await closeSession(table.id)
    if (viewingTable.value?.id === table.id) {
      viewingTable.value = null
      viewingUrlOverride.value = ""
    }
  } catch (error) {
    showError(friendlyTablesError(error))
  }
}

function openQr(table: DiningTableWithSession) {
  if (!table.open_session) {
    return
  }
  viewingTable.value = table
  viewingUrlOverride.value = menuUrlForTable(table.id)
}

function closeQr() {
  viewingTable.value = null
  viewingUrlOverride.value = ""
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
        <h1>{{ t("admin.tablesTitle") }}</h1>
        <p>{{ t("admin.tablesHint") }}</p>
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
            v-for="entry in restaurants"
            :key="entry.id"
            :value="entry.id"
          >
            {{ entry.name }}
          </option>
        </select>
      </label>
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
                  <span
                    class="ms-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    :class="
                      table.open_session
                        ? 'bg-[color-mix(in_srgb,var(--herb)_18%,white)] text-[var(--herb-deep)]'
                        : 'bg-[var(--paper-deep)] text-[var(--muted)]'
                    "
                  >
                    {{
                      table.open_session
                        ? t("admin.tableSessionOpen")
                        : t("admin.tableSessionClosed")
                    }}
                  </span>
                </p>
                <div
                  v-if="table.open_session"
                  class="mt-1 flex min-w-0 items-center gap-2"
                >
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
                <p
                  v-else
                  class="mt-1 text-xs text-[var(--muted)]"
                >
                  {{ t("admin.tableSessionClosedHint") }}
                </p>
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
                    v-if="!table.open_session"
                    type="button"
                    class="btn-primary !px-2 !py-1 !text-xs"
                    :disabled="saving"
                    @click="onSeat(table)"
                  >
                    {{ t("admin.seatTable") }}
                  </button>
                  <template v-else>
                    <button
                      type="button"
                      class="rounded-2xl border border-[var(--espresso)]/15 px-2 py-1 text-xs font-bold"
                      @click="openQr(table)"
                    >
                      {{ t("admin.viewQr") }}
                    </button>
                    <button
                      type="button"
                      class="btn-warning !px-2 !py-1 !text-xs"
                      :disabled="saving"
                      @click="onCloseSession(table)"
                    >
                      {{ t("admin.closeTableSession") }}
                    </button>
                  </template>
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
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="viewingTable && restaurant && viewingUrl"
        class="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8"
        role="dialog"
        aria-modal="true"
        :aria-label="t('admin.tableHeading', { n: viewingTable.table_number })"
      >
        <button
          type="button"
          class="no-print absolute inset-0 bg-[var(--navy)]/45 backdrop-blur-sm"
          :aria-label="t('admin.closeQr')"
          @click="closeQr"
        />
        <div class="relative z-10 w-full max-w-md space-y-4">
          <div class="no-print flex justify-end gap-2">
            <button
              type="button"
              class="btn-primary !px-4 !py-2.5"
              @click="onPrint"
            >
              {{ t("admin.printQrCodes") }}
            </button>
            <button
              type="button"
              class="rounded-2xl border border-[var(--navy)]/10 bg-white px-4 py-2.5 text-sm font-bold text-[var(--navy)]"
              @click="closeQr"
            >
              {{ t("admin.closeQr") }}
            </button>
          </div>
          <div
            class="print-sheet mx-auto flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-[var(--espresso)]/15 bg-[var(--ivory)] p-8 text-center shadow-2xl"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--herb)]">
              Al-Maidah
            </p>
            <h3 class="text-2xl font-bold tracking-tight text-[var(--espresso)]">
              {{ restaurant.name }}
            </h3>
            <p class="text-4xl font-bold tabular-nums text-[var(--herb)]">
              {{ t("admin.tableHeading", { n: viewingTable.table_number }) }}
            </p>
            <AdminTableQr
              :value="viewingUrl"
              :size="220"
              class="w-56"
            />
            <p class="text-sm text-[var(--ink)]">
              {{ t("admin.scanPrompt") }}
            </p>
            <p class="break-all font-mono text-[10px] text-[var(--muted)]">
              {{ viewingUrl }}
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
