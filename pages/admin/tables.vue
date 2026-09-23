<script setup lang="ts">
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
  errorMessage,
  menuUrlForTable,
  bootstrap,
  selectRestaurant,
  createTable,
  renumberTable,
  removeTable,
} = useAdminTables()

const ready = ref(false)
const newNumber = ref<number | null>(null)
const newLabel = ref("")
const formError = ref("")
const editingId = ref<string | null>(null)
const editNumber = ref<number | null>(null)

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
  } catch {
    /* errorMessage set */
  }
})

async function onRestaurantChange(event: Event) {
  await selectRestaurant((event.target as HTMLSelectElement).value)
}

async function onCreate() {
  formError.value = ""
  if (!newNumber.value || newNumber.value <= 0) {
    formError.value = t("admin.tableNumberInvalid")
    return
  }
  try {
    await createTable(newNumber.value, newLabel.value)
    newNumber.value = null
    newLabel.value = ""
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : t("admin.tablesSaveError")
  }
}

function startRenumber(tableId: string, current: number) {
  editingId.value = tableId
  editNumber.value = current
}

async function confirmRenumber() {
  if (!editingId.value || !editNumber.value || editNumber.value <= 0) {
    formError.value = t("admin.tableNumberInvalid")
    return
  }
  formError.value = ""
  try {
    await renumberTable(editingId.value, editNumber.value)
    editingId.value = null
    editNumber.value = null
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : t("admin.tablesSaveError")
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
  formError.value = ""
  try {
    await removeTable(tableId)
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : t("admin.tablesSaveError")
  }
}

function onPrint() {
  window.print()
}
</script>

<template>
  <div>
    <div class="no-print flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-stone-900">
          {{ t("admin.tablesTitle") }}
        </h1>
        <p class="mt-2 text-sm text-stone-600">
          {{ t("admin.tablesHint") }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
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
          class="rounded-lg bg-teal-900 px-4 py-2 text-sm font-medium text-white"
          @click="onPrint"
        >
          {{ t("admin.printQrCodes") }}
        </button>
      </div>
    </div>

    <AppLoadingState
      v-if="!ready || loading"
      class="no-print mt-8"
      :label="t('admin.loadingOwner')"
    />
    <template v-else>
      <p v-if="errorMessage" class="no-print mt-4 text-sm text-red-700">
        {{ errorMessage }}
      </p>
      <p v-if="formError" class="no-print mt-4 text-sm text-red-700">
        {{ formError }}
      </p>

      <AppEmptyState
        v-if="!restaurants.length"
        class="no-print mt-8"
        :title="t('admin.noRestaurants')"
        :description="t('admin.noRestaurantsHint')"
      />

      <div v-else class="mt-8 space-y-8">
        <section class="no-print rounded-2xl border border-stone-200 bg-white/80 p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-stone-500">
            {{ t("admin.addTable") }}
          </h2>
          <form
            class="mt-3 flex flex-wrap items-end gap-3"
            @submit.prevent="onCreate"
          >
            <label class="flex w-28 flex-col gap-1 text-xs text-stone-500">
              {{ t("admin.tableNumber") }}
              <input
                v-model.number="newNumber"
                required
                type="number"
                min="1"
                step="1"
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
            </label>
            <label class="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-stone-500">
              {{ t("admin.tableLabelOptional") }}
              <input
                v-model="newLabel"
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
            </label>
            <button
              type="submit"
              class="rounded-lg bg-teal-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              :disabled="saving"
            >
              {{ t("admin.addTable") }}
            </button>
          </form>
        </section>

        <section class="no-print rounded-2xl border border-stone-200 bg-white/80">
          <ul v-if="tables.length" class="divide-y divide-stone-100">
            <li
              v-for="table in tables"
              :key="table.id"
              class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="font-semibold text-stone-900">
                  {{ t("admin.tableHeading", { n: table.table_number }) }}
                  <span
                    v-if="table.label"
                    class="ms-2 text-sm font-normal text-stone-500"
                  >
                    {{ table.label }}
                  </span>
                </p>
                <p class="truncate font-mono text-xs text-teal-900/80">
                  {{ menuUrlForTable(table.table_number) }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <template v-if="editingId === table.id">
                  <input
                    v-model.number="editNumber"
                    type="number"
                    min="1"
                    class="w-20 rounded-lg border border-stone-300 px-2 py-1 text-sm"
                  >
                  <button
                    type="button"
                    class="rounded-lg bg-teal-900 px-2 py-1 text-xs text-white"
                    :disabled="saving"
                    @click="confirmRenumber"
                  >
                    {{ t("admin.save") }}
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                    @click="editingId = null"
                  >
                    {{ t("admin.cancel") }}
                  </button>
                </template>
                <template v-else>
                  <button
                    type="button"
                    class="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                    :disabled="saving"
                    @click="startRenumber(table.id, table.table_number)"
                  >
                    {{ t("admin.renumber") }}
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-700"
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
          <h2 class="no-print text-lg font-semibold text-stone-900">
            {{ t("admin.printPreview") }}
          </h2>
          <div
            v-for="table in tables"
            :key="`print-${table.id}`"
            class="print-sheet mx-auto flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-stone-300 bg-white p-8 text-center"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
              Al-Maidah
            </p>
            <h3 class="text-2xl font-semibold tracking-tight text-stone-900">
              {{ restaurant.name }}
            </h3>
            <p class="text-4xl font-bold tabular-nums text-teal-950">
              {{ t("admin.tableHeading", { n: table.table_number }) }}
            </p>
            <AdminTableQr
              :value="menuUrlForTable(table.table_number)"
              :size="220"
              class="w-56"
            />
            <div class="space-y-1 text-sm text-stone-700">
              <p>{{ t("admin.scanPromptEn") }}</p>
              <p dir="rtl" class="font-medium">
                {{ t("admin.scanPromptAr") }}
              </p>
            </div>
            <p class="break-all font-mono text-[10px] text-stone-400">
              {{ menuUrlForTable(table.table_number) }}
            </p>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
