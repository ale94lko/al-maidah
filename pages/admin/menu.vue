<script setup lang="ts">
import type { DishFormState } from "~/composables/useAdminMenu"
import type { ModifierGroupInput } from "~/types"

definePageMeta({
  layout: "admin",
})

const { refreshSession } = useAuth()
const { t } = useAppI18n()
const {
  restaurants,
  restaurantId,
  loading,
  saving,
  errorMessage,
  showArchived,
  visibleCategories,
  itemsForCategory,
  bootstrap,
  selectRestaurant,
  createCategory,
  patchCategory,
  saveDish,
  patchDish,
  uploadPhoto,
  moveCategory,
  moveDish,
  emptyDishForm,
  dishFormFromItem,
} = useAdminMenu()

const ready = ref(false)
const newCategoryEn = ref("")
const newCategoryAr = ref("")
const editingDish = ref<DishFormState | null>(null)
const formError = ref("")

onMounted(async () => {
  const session = await refreshSession()
  if (!session) {
    await navigateTo({
      path: "/admin/login",
      query: { redirect: "/admin/menu" },
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

async function onAddCategory() {
  formError.value = ""
  try {
    await createCategory(newCategoryEn.value, newCategoryAr.value)
    newCategoryEn.value = ""
    newCategoryAr.value = ""
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : t("admin.menuSaveError")
  }
}

function openNewDish(categoryId: string) {
  editingDish.value = emptyDishForm(categoryId)
  formError.value = ""
}

function openEditDish(itemId: string) {
  const found = visibleCategories.value
    .flatMap((category) => itemsForCategory(category.id))
    .find((dish) => dish.id === itemId)
  if (!found) {
    return
  }
  editingDish.value = dishFormFromItem(found)
  formError.value = ""
}

function addModifierGroup() {
  if (!editingDish.value) {
    return
  }
  editingDish.value.modifiers.push({
    name_en: "",
    name_ar: "",
    is_required: false,
    min_select: 0,
    max_select: 1,
    options: [{ name_en: "", name_ar: "", price_extra: "0.00" }],
  })
}

function addModifierOption(group: ModifierGroupInput) {
  if (!group.options) {
    group.options = []
  }
  group.options.push({ name_en: "", name_ar: "", price_extra: "0.00" })
}

async function onSaveDish() {
  if (!editingDish.value) {
    return
  }
  formError.value = ""
  try {
    await saveDish(editingDish.value)
    editingDish.value = null
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : t("admin.menuSaveError")
  }
}

async function onPhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !editingDish.value?.id) {
    formError.value = t("admin.menuPhotoSaveFirst")
    return
  }
  formError.value = ""
  try {
    await uploadPhoto(editingDish.value.id, file)
    // Reload form from saved item
    openEditDish(editingDish.value.id)
  } catch (error) {
    formError.value =
      error instanceof Error ? error.message : t("admin.menuSaveError")
  } finally {
    input.value = ""
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-stone-900">
          {{ t("admin.menuTitle") }}
        </h1>
        <p class="mt-2 text-sm text-stone-600">
          {{ t("admin.menuHint") }}
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
              v-for="restaurant in restaurants"
              :key="restaurant.id"
              :value="restaurant.id"
            >
              {{ restaurant.name }}
            </option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-sm text-stone-600">
          <input v-model="showArchived" type="checkbox" class="rounded" >
          {{ t("admin.showArchived") }}
        </label>
      </div>
    </div>

    <AppLoadingState
      v-if="!ready || loading"
      class="mt-8"
      :label="t('admin.loadingOwner')"
    />
    <template v-else>
      <p v-if="errorMessage" class="mt-4 text-sm text-red-700">
        {{ errorMessage }}
      </p>
      <p v-if="formError" class="mt-4 text-sm text-red-700">
        {{ formError }}
      </p>

      <AppEmptyState
        v-if="!restaurants.length"
        class="mt-8"
        :title="t('admin.noRestaurants')"
        :description="t('admin.noRestaurantsHint')"
      />

      <div v-else class="mt-8 space-y-8">
        <section class="rounded-2xl border border-stone-200 bg-white/80 p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-stone-500">
            {{ t("admin.addCategory") }}
          </h2>
          <form
            class="mt-3 flex flex-wrap items-end gap-3"
            @submit.prevent="onAddCategory"
          >
            <label class="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-stone-500">
              {{ t("admin.nameEn") }}
              <input
                v-model="newCategoryEn"
                required
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
            </label>
            <label class="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-stone-500">
              {{ t("admin.nameAr") }}
              <input
                v-model="newCategoryAr"
                required
                dir="rtl"
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
            </label>
            <button
              type="submit"
              class="rounded-lg bg-teal-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              :disabled="saving"
            >
              {{ t("admin.addCategory") }}
            </button>
          </form>
        </section>

        <section
          v-for="category in visibleCategories"
          :key="category.id"
          class="rounded-2xl border border-stone-200 bg-white/80 p-4"
          :class="{ 'opacity-70': category.is_archived }"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-stone-900">
                {{ category.name_en }}
                <span class="ms-2 text-sm font-normal text-stone-500">
                  {{ category.name_ar }}
                </span>
              </h2>
              <p v-if="category.is_archived" class="text-xs text-amber-700">
                {{ t("admin.archived") }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                :disabled="saving"
                @click="moveCategory(category.id, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                :disabled="saving"
                @click="moveCategory(category.id, 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                :disabled="saving"
                @click="
                  patchCategory(category.id, {
                    is_archived: !category.is_archived,
                  })
                "
              >
                {{
                  category.is_archived
                    ? t("admin.restore")
                    : t("admin.archive")
                }}
              </button>
              <button
                type="button"
                class="rounded-lg bg-teal-900 px-3 py-1 text-xs font-medium text-white"
                @click="openNewDish(category.id)"
              >
                {{ t("admin.addDish") }}
              </button>
            </div>
          </div>

          <ul class="mt-4 divide-y divide-stone-100">
            <li
              v-for="dish in itemsForCategory(category.id)"
              :key="dish.id"
              class="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="font-medium text-stone-900">
                  {{ dish.name_en }}
                  <span
                    v-if="!dish.is_available"
                    class="ms-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800"
                  >
                    {{ t("admin.soldOut") }}
                  </span>
                  <span
                    v-if="dish.is_archived"
                    class="ms-2 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-700"
                  >
                    {{ t("admin.archived") }}
                  </span>
                </p>
                <p class="text-xs text-stone-500">
                  {{ t("admin.price") }} {{ dish.price }} AED ·
                  {{ t("admin.cost") }} {{ dish.cost_price }} AED
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                  :disabled="saving"
                  @click="moveDish(dish.id, -1)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                  :disabled="saving"
                  @click="moveDish(dish.id, 1)"
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                  :disabled="saving"
                  @click="
                    patchDish(dish.id, { is_available: !dish.is_available })
                  "
                >
                  {{
                    dish.is_available
                      ? t("admin.markSoldOut")
                      : t("admin.markAvailable")
                  }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-stone-300 px-2 py-1 text-xs"
                  :disabled="saving"
                  @click="
                    patchDish(dish.id, { is_archived: !dish.is_archived })
                  "
                >
                  {{
                    dish.is_archived ? t("admin.restore") : t("admin.archive")
                  }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-teal-800 px-2 py-1 text-xs text-teal-900"
                  @click="openEditDish(dish.id)"
                >
                  {{ t("admin.edit") }}
                </button>
              </div>
            </li>
            <li
              v-if="!itemsForCategory(category.id).length"
              class="py-4 text-sm text-stone-500"
            >
              {{ t("admin.noDishesInCategory") }}
            </li>
          </ul>
        </section>

        <AppEmptyState
          v-if="!visibleCategories.length"
          :title="t('admin.menuEmpty')"
          :description="t('admin.menuEmptyHint')"
        />
      </div>
    </template>

    <div
      v-if="editingDish"
      class="fixed inset-0 z-40 flex items-end justify-center bg-stone-950/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-xl font-semibold text-stone-900">
            {{
              editingDish.id ? t("admin.editDish") : t("admin.addDish")
            }}
          </h2>
          <button
            type="button"
            class="text-sm text-stone-500"
            @click="editingDish = null"
          >
            {{ t("admin.cancel") }}
          </button>
        </div>

        <form class="mt-4 space-y-3" @submit.prevent="onSaveDish">
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-1 text-xs text-stone-500">
              {{ t("admin.nameEn") }}
              <input
                v-model="editingDish.name_en"
                required
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
            </label>
            <label class="flex flex-col gap-1 text-xs text-stone-500">
              {{ t("admin.nameAr") }}
              <input
                v-model="editingDish.name_ar"
                required
                dir="rtl"
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
            </label>
            <label class="flex flex-col gap-1 text-xs text-stone-500 sm:col-span-2">
              {{ t("admin.descriptionEn") }}
              <textarea
                v-model="editingDish.description_en"
                rows="2"
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs text-stone-500 sm:col-span-2">
              {{ t("admin.descriptionAr") }}
              <textarea
                v-model="editingDish.description_ar"
                rows="2"
                dir="rtl"
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs text-stone-500">
              {{ t("admin.price") }} (AED)
              <input
                v-model="editingDish.price"
                required
                type="number"
                min="0"
                step="0.01"
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
            </label>
            <label class="flex flex-col gap-1 text-xs text-stone-500">
              {{ t("admin.cost") }} (AED)
              <input
                v-model="editingDish.cost_price"
                required
                type="number"
                min="0"
                step="0.01"
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
            </label>
            <label class="flex flex-col gap-1 text-xs text-stone-500 sm:col-span-2">
              {{ t("admin.allergens") }}
              <input
                v-model="editingDish.allergens"
                :placeholder="t('admin.allergensHint')"
                class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
            </label>
          </div>

          <div class="flex flex-wrap gap-4 text-sm text-stone-700">
            <label class="flex items-center gap-2">
              <input v-model="editingDish.is_available" type="checkbox" >
              {{ t("admin.available") }}
            </label>
            <label class="flex items-center gap-2">
              <input v-model="editingDish.is_vegetarian" type="checkbox" >
              {{ t("admin.vegetarian") }}
            </label>
          </div>

          <label class="flex flex-col gap-1 text-xs text-stone-500">
            {{ t("admin.photoUrl") }}
            <input
              v-model="editingDish.photo_url"
              class="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
          </label>
          <label
            v-if="editingDish.id"
            class="flex flex-col gap-1 text-xs text-stone-500"
          >
            {{ t("admin.uploadPhoto") }}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="text-sm"
              @change="onPhotoChange"
            >
          </label>

          <div class="space-y-3 border-t border-stone-100 pt-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-stone-800">
                {{ t("admin.modifiers") }}
              </h3>
              <button
                type="button"
                class="text-xs font-medium text-teal-900"
                @click="addModifierGroup"
              >
                {{ t("admin.addModifierGroup") }}
              </button>
            </div>
            <div
              v-for="(group, groupIndex) in editingDish.modifiers"
              :key="groupIndex"
              class="rounded-xl border border-stone-200 p-3"
            >
              <div class="grid gap-2 sm:grid-cols-2">
                <input
                  v-model="group.name_en"
                  :placeholder="t('admin.nameEn')"
                  class="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                >
                <input
                  v-model="group.name_ar"
                  dir="rtl"
                  :placeholder="t('admin.nameAr')"
                  class="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                >
              </div>
              <div class="mt-2 flex flex-wrap gap-3 text-xs text-stone-600">
                <label class="flex items-center gap-1">
                  <input v-model="group.is_required" type="checkbox" >
                  {{ t("admin.required") }}
                </label>
                <label class="flex items-center gap-1">
                  min
                  <input
                    v-model.number="group.min_select"
                    type="number"
                    min="0"
                    class="w-14 rounded border border-stone-300 px-1 py-0.5"
                  >
                </label>
                <label class="flex items-center gap-1">
                  max
                  <input
                    v-model.number="group.max_select"
                    type="number"
                    min="1"
                    class="w-14 rounded border border-stone-300 px-1 py-0.5"
                  >
                </label>
                <button
                  type="button"
                  class="text-teal-900"
                  @click="addModifierOption(group)"
                >
                  {{ t("admin.addOption") }}
                </button>
                <button
                  type="button"
                  class="text-red-700"
                  @click="editingDish.modifiers.splice(groupIndex, 1)"
                >
                  {{ t("admin.remove") }}
                </button>
              </div>
              <ul class="mt-2 space-y-2">
                <li
                  v-for="(option, optionIndex) in group.options || []"
                  :key="optionIndex"
                  class="grid gap-2 sm:grid-cols-[1fr_1fr_6rem_auto]"
                >
                  <input
                    v-model="option.name_en"
                    :placeholder="t('admin.nameEn')"
                    class="rounded border border-stone-300 px-2 py-1 text-sm"
                  >
                  <input
                    v-model="option.name_ar"
                    dir="rtl"
                    :placeholder="t('admin.nameAr')"
                    class="rounded border border-stone-300 px-2 py-1 text-sm"
                  >
                  <input
                    v-model="option.price_extra"
                    type="number"
                    min="0"
                    step="0.01"
                    class="rounded border border-stone-300 px-2 py-1 text-sm"
                  >
                  <button
                    type="button"
                    class="text-xs text-red-700"
                    @click="group.options?.splice(optionIndex, 1)"
                  >
                    {{ t("admin.remove") }}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="rounded-lg border border-stone-300 px-4 py-2 text-sm"
              @click="editingDish = null"
            >
              {{ t("admin.cancel") }}
            </button>
            <button
              type="submit"
              class="rounded-lg bg-teal-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              :disabled="saving"
            >
              {{ saving ? t("admin.saving") : t("admin.save") }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
