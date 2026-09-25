<script setup lang="ts">
import type { DishFormState } from "~/composables/useAdminMenu"
import type { ModifierGroupInput } from "~/types"
import { extractApiErrorMessage } from "~/utils/errors"
import { localizedName } from "~/utils/localize"
import { filsToMoney, moneyToFils } from "~/utils/cart"

definePageMeta({
  layout: "admin",
})

const { refreshSession } = useAuth()
const { t, locale } = useAppI18n()
const {
  restaurants,
  restaurantId,
  loading,
  saving,
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
const {
  errorOpen,
  errorTitle,
  errorMessage: dialogMessage,
  showError,
  dismissError,
} = useErrorDialog()

const ready = ref(false)
const newCategoryEn = ref("")
const newCategoryAr = ref("")
const editingCategory = ref<{
  id: string
  name_en: string
  name_ar: string
} | null>(null)
const editingDish = ref<DishFormState | null>(null)
const pendingPhoto = ref<File | null>(null)
const pendingPhotoPreview = ref<string | null>(null)
const photoInputRef = ref<HTMLInputElement | null>(null)

const dishPhotoPreview = computed(() => {
  if (pendingPhotoPreview.value) {
    return pendingPhotoPreview.value
  }
  return editingDish.value?.photo_url || ""
})

function clearPendingPhoto() {
  if (pendingPhotoPreview.value) {
    URL.revokeObjectURL(pendingPhotoPreview.value)
  }
  pendingPhoto.value = null
  pendingPhotoPreview.value = null
}

function closeDishModal() {
  clearPendingPhoto()
  editingDish.value = null
}

function menuError(error: unknown) {
  return extractApiErrorMessage(error) || t("admin.menuSaveError")
}

function dishMargin(price: string, cost: string) {
  return filsToMoney(moneyToFils(price) - moneyToFils(cost))
}

function formatMoney(amount: string) {
  return t("guest.priceAed", { price: amount })
}

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
  } catch (error) {
    showError(menuError(error))
  }
})

async function onRestaurantChange(event: Event) {
  try {
    await selectRestaurant((event.target as HTMLSelectElement).value)
  } catch (error) {
    showError(menuError(error))
  }
}

async function onAddCategory() {
  try {
    await createCategory(newCategoryEn.value, newCategoryAr.value)
    newCategoryEn.value = ""
    newCategoryAr.value = ""
  } catch (error) {
    showError(menuError(error))
  }
}

function openEditCategory(category: { id: string; name_en: string; name_ar: string }) {
  editingCategory.value = {
    id: category.id,
    name_en: category.name_en,
    name_ar: category.name_ar,
  }
}

function cancelEditCategory() {
  editingCategory.value = null
}

async function onSaveCategory() {
  if (!editingCategory.value) {
    return
  }
  try {
    await patchCategory(editingCategory.value.id, {
      name_en: editingCategory.value.name_en.trim(),
      name_ar: editingCategory.value.name_ar.trim(),
    })
    editingCategory.value = null
  } catch (error) {
    showError(menuError(error))
  }
}

function openNewDish(categoryId: string) {
  clearPendingPhoto()
  editingDish.value = emptyDishForm(categoryId)
}

function openEditDish(itemId: string) {
  const found = visibleCategories.value
    .flatMap((category) => itemsForCategory(category.id))
    .find((dish) => dish.id === itemId)
  if (!found) {
    return
  }
  clearPendingPhoto()
  editingDish.value = dishFormFromItem(found)
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
  try {
    const saved = await saveDish(editingDish.value)
    if (pendingPhoto.value && saved?.id) {
      await uploadPhoto(saved.id, pendingPhoto.value)
    }
    closeDishModal()
  } catch (error) {
    showError(menuError(error))
  }
}

async function onPhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !editingDish.value) {
    return
  }
  try {
    if (editingDish.value.id) {
      await uploadPhoto(editingDish.value.id, file)
      openEditDish(editingDish.value.id)
    } else {
      clearPendingPhoto()
      pendingPhoto.value = file
      pendingPhotoPreview.value = URL.createObjectURL(file)
    }
  } catch (error) {
    showError(menuError(error))
  } finally {
    input.value = ""
  }
}

function clearSelectedPhoto() {
  clearPendingPhoto()
  if (editingDish.value) {
    editingDish.value.photo_url = ""
  }
}
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
        <h1>{{ t("admin.menuTitle") }}</h1>
        <p>{{ t("admin.menuHint") }}</p>
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
              v-for="restaurant in restaurants"
              :key="restaurant.id"
              :value="restaurant.id"
            >
              {{ restaurant.name }}
            </option>
          </select>
        </label>
        <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--navy)]/10 bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--navy)] shadow-sm">
          <span>{{ t("admin.showArchived") }}</span>
          <span
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition"
            :class="showArchived ? 'bg-[var(--info)]' : 'bg-[var(--paper-deep)]'"
          >
            <input
              v-model="showArchived"
              type="checkbox"
              class="peer sr-only"
            >
            <span
              class="inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition peer-checked:translate-x-[1.35rem]"
              :class="showArchived ? 'translate-x-[1.35rem]' : 'translate-x-0.5'"
            />
          </span>
        </label>
      </div>
    </header>

    <AppLoadingState
      v-if="!ready || loading"
      class="mt-8"
      :label="t('admin.loadingOwner')"
    />
    <template v-else>
      <AppEmptyState
        v-if="!restaurants.length"
        class="mt-8"
        :title="t('admin.noRestaurants')"
        :description="t('admin.noRestaurantsHint')"
      />

      <div v-else class="mt-2 space-y-5">
        <section class="rounded-2xl border border-[var(--navy)]/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 class="mb-4 text-base font-bold text-[var(--navy)]">
            {{ t("admin.addCategory") }}
          </h2>
          <form
            class="flex flex-wrap items-end gap-3"
            @submit.prevent="onAddCategory"
          >
            <label class="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-xs font-semibold text-[var(--muted)]">
              {{ t("admin.nameEn") }}
              <input
                v-model="newCategoryEn"
                required
                class="field-input !rounded-xl"
              >
            </label>
            <label class="flex min-w-[10rem] flex-1 flex-col gap-1.5 text-xs font-semibold text-[var(--muted)]">
              {{ t("admin.nameAr") }}
              <input
                v-model="newCategoryAr"
                required
                dir="rtl"
                class="field-input !rounded-xl"
              >
            </label>
            <button
              type="submit"
              class="admin-chip-btn admin-chip-btn--primary !px-4 !py-2.5 !text-sm disabled:opacity-60"
              :disabled="saving"
            >
              + {{ t("admin.addCategory") }}
            </button>
          </form>
        </section>

        <section
          v-for="category in visibleCategories"
          :key="category.id"
          class="rounded-3xl border border-[var(--navy)]/10 p-4 sm:p-5"
          :class="
            category.is_archived
              ? 'bg-[var(--paper-deep)]/70 opacity-80'
              : 'bg-[color-mix(in_srgb,var(--paper)_72%,white)]'
          "
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <form
                v-if="editingCategory?.id === category.id"
                class="flex flex-wrap items-end gap-2"
                @submit.prevent="onSaveCategory"
              >
                <label class="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs text-[var(--muted)]">
                  {{ t("admin.nameEn") }}
                  <input
                    v-model="editingCategory.name_en"
                    required
                    class="field-input !rounded-xl"
                  >
                </label>
                <label class="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs text-[var(--muted)]">
                  {{ t("admin.nameAr") }}
                  <input
                    v-model="editingCategory.name_ar"
                    required
                    dir="rtl"
                    class="field-input !rounded-xl"
                  >
                </label>
                <button
                  type="submit"
                  class="admin-chip-btn admin-chip-btn--primary disabled:opacity-60"
                  :disabled="saving"
                >
                  {{ saving ? t("admin.saving") : t("admin.save") }}
                </button>
                <button
                  type="button"
                  class="table-icon-btn table-icon-btn--neutral !h-auto !w-auto !px-3 !py-2 !text-xs font-bold"
                  @click="cancelEditCategory"
                >
                  {{ t("admin.cancel") }}
                </button>
              </form>
              <div v-else class="flex items-center gap-2">
                <h2 class="font-display text-xl font-bold text-[var(--navy)]">
                  {{ localizedName(category, locale) }}
                </h2>
                <button
                  type="button"
                  class="table-icon-btn table-icon-btn--neutral !h-8 !w-8"
                  :aria-label="t('admin.editCategory')"
                  :title="t('admin.editCategory')"
                  @click="openEditCategory(category)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z"
                    />
                  </svg>
                </button>
              </div>
              <p v-if="category.is_archived" class="mt-1 text-xs font-semibold text-amber-700">
                {{ t("admin.archived") }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="table-icon-btn table-icon-btn--neutral"
                :disabled="saving"
                :aria-label="t('admin.moveUp')"
                :title="t('admin.moveUp')"
                @click="moveCategory(category.id, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="table-icon-btn table-icon-btn--neutral"
                :disabled="saving"
                :aria-label="t('admin.moveDown')"
                :title="t('admin.moveDown')"
                @click="moveCategory(category.id, 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="admin-chip-btn"
                :class="category.is_archived ? 'admin-chip-btn--success' : 'admin-chip-btn--archive'"
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
                class="admin-chip-btn admin-chip-btn--primary"
                @click="openNewDish(category.id)"
              >
                {{ t("admin.addDish") }}
              </button>
            </div>
          </div>

          <ul class="mt-4 space-y-3">
            <li
              v-for="dish in itemsForCategory(category.id)"
              :key="dish.id"
              class="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--navy)]/10 bg-white p-3.5 shadow-sm sm:p-4"
            >
              <div
                class="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--chili)]/12 via-[var(--herb)]/12 to-[var(--citrus)]/18 sm:h-24 sm:w-24"
              >
                <img
                  v-if="dish.photo_url"
                  :src="dish.photo_url"
                  :alt="localizedName(dish, locale)"
                  class="h-full w-full object-cover"
                >
                <div
                  v-else
                  class="font-display flex h-full w-full items-center justify-center text-[11px] font-extrabold text-[var(--herb)]/45"
                  aria-hidden="true"
                >
                  Al-Maidah
                </div>
              </div>

              <div class="min-w-0 flex-1 space-y-2.5">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-base font-bold text-[var(--navy)]">
                    {{ localizedName(dish, locale) }}
                  </p>
                  <span
                    v-if="!dish.is_available"
                    class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800"
                  >
                    {{ t("admin.soldOut") }}
                  </span>
                  <span
                    v-if="dish.is_archived"
                    class="rounded-full bg-[var(--paper-deep)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--muted)]"
                  >
                    {{ t("admin.archived") }}
                  </span>
                </div>

                <div
                  class="grid max-w-md grid-cols-3 overflow-hidden rounded-xl border border-[var(--navy)]/12 bg-[color-mix(in_srgb,var(--paper)_55%,white)]"
                >
                  <div class="border-e border-[var(--navy)]/12 px-3 py-2">
                    <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                      {{ t("admin.price") }}
                    </p>
                    <p class="mt-0.5 font-mono text-sm font-bold text-[var(--navy)]">
                      {{ formatMoney(dish.price) }}
                    </p>
                  </div>
                  <div class="border-e border-[var(--navy)]/12 px-3 py-2">
                    <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                      {{ t("admin.cost") }}
                    </p>
                    <p class="mt-0.5 font-mono text-sm font-bold text-[var(--navy)]">
                      {{ formatMoney(dish.cost_price) }}
                    </p>
                  </div>
                  <div class="px-3 py-2">
                    <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                      {{ t("admin.margin") }}
                    </p>
                    <p class="mt-0.5 font-mono text-sm font-bold text-[var(--navy)]">
                      {{ formatMoney(dishMargin(dish.price, dish.cost_price)) }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="flex w-full flex-wrap items-center gap-2 sm:ms-auto sm:w-auto sm:justify-end">
                <button
                  type="button"
                  class="table-icon-btn table-icon-btn--neutral"
                  :disabled="saving"
                  :aria-label="t('admin.moveUp')"
                  :title="t('admin.moveUp')"
                  @click="moveDish(dish.id, -1)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="table-icon-btn table-icon-btn--neutral"
                  :disabled="saving"
                  :aria-label="t('admin.moveDown')"
                  :title="t('admin.moveDown')"
                  @click="moveDish(dish.id, 1)"
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="admin-chip-btn"
                  :class="
                    dish.is_available
                      ? 'admin-chip-btn--warning'
                      : 'admin-chip-btn--success'
                  "
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
                  class="admin-chip-btn"
                  :class="dish.is_archived ? 'admin-chip-btn--success' : 'admin-chip-btn--archive'"
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
                  class="admin-chip-btn admin-chip-btn--primary"
                  @click="openEditDish(dish.id)"
                >
                  {{ t("admin.edit") }}
                </button>
              </div>
            </li>
            <li
              v-if="!itemsForCategory(category.id).length"
              class="rounded-2xl border border-dashed border-[var(--navy)]/15 bg-white/50 px-4 py-8 text-center text-sm text-[var(--muted)]"
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
      class="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-[var(--ink)]/45 p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--ink)]/15 bg-[var(--ivory)] shadow-xl"
      >
        <div class="max-h-[min(90dvh,52rem)] overflow-y-auto p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-xl font-semibold text-[var(--espresso)]">
            {{
              editingDish.id ? t("admin.editDish") : t("admin.addDish")
            }}
          </h2>
          <button
            type="button"
            class="text-sm text-[var(--muted)]"
            @click="closeDishModal"
          >
            {{ t("admin.cancel") }}
          </button>
        </div>

        <form class="mt-4 space-y-3" @submit.prevent="onSaveDish">
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-1 text-xs text-[var(--muted)]">
              {{ t("admin.nameEn") }}
              <input
                v-model="editingDish.name_en"
                required
                class="rounded-2xl border border-[var(--espresso)]/15 px-3 py-2 text-sm"
              >
            </label>
            <label class="flex flex-col gap-1 text-xs text-[var(--muted)]">
              {{ t("admin.nameAr") }}
              <input
                v-model="editingDish.name_ar"
                required
                dir="rtl"
                class="rounded-2xl border border-[var(--espresso)]/15 px-3 py-2 text-sm"
              >
            </label>
            <label class="flex flex-col gap-1 text-xs text-[var(--muted)] sm:col-span-2">
              {{ t("admin.descriptionEn") }}
              <textarea
                v-model="editingDish.description_en"
                rows="2"
                class="rounded-2xl border border-[var(--espresso)]/15 px-3 py-2 text-sm"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs text-[var(--muted)] sm:col-span-2">
              {{ t("admin.descriptionAr") }}
              <textarea
                v-model="editingDish.description_ar"
                rows="2"
                dir="rtl"
                class="rounded-2xl border border-[var(--espresso)]/15 px-3 py-2 text-sm"
              />
            </label>
            <label class="flex flex-col gap-1 text-xs text-[var(--muted)]">
              {{ t("admin.price") }} ({{ t("common.currencyAed") }})
              <input
                v-model="editingDish.price"
                required
                type="number"
                min="0"
                step="0.01"
                class="rounded-2xl border border-[var(--espresso)]/15 px-3 py-2 text-sm"
              >
            </label>
            <label class="flex flex-col gap-1 text-xs text-[var(--muted)]">
              {{ t("admin.cost") }} ({{ t("common.currencyAed") }})
              <input
                v-model="editingDish.cost_price"
                required
                type="number"
                min="0"
                step="0.01"
                class="rounded-2xl border border-[var(--espresso)]/15 px-3 py-2 text-sm"
              >
            </label>
            <label class="flex flex-col gap-1 text-xs text-[var(--muted)] sm:col-span-2">
              {{ t("admin.allergens") }}
              <input
                v-model="editingDish.allergens"
                :placeholder="t('admin.allergensHint')"
                class="rounded-2xl border border-[var(--espresso)]/15 px-3 py-2 text-sm"
              >
            </label>
          </div>

          <div class="flex flex-wrap gap-4 text-sm text-[var(--ink)]">
            <label class="flex items-center gap-2">
              <input v-model="editingDish.is_available" type="checkbox" >
              {{ t("admin.available") }}
            </label>
            <label class="flex items-center gap-2">
              <input v-model="editingDish.is_vegetarian" type="checkbox" >
              {{ t("admin.vegetarian") }}
            </label>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-bold text-[var(--muted)]">
              {{ t("admin.uploadPhoto") }}
            </p>
            <div
              class="flex flex-col gap-3 rounded-2xl border border-dashed border-[var(--espresso)]/20 bg-white/60 p-3 sm:flex-row sm:items-center"
            >
              <div
                class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--espresso)]/10 bg-[var(--paper)]"
              >
                <img
                  v-if="dishPhotoPreview"
                  :src="dishPhotoPreview"
                  alt=""
                  class="h-full w-full object-cover"
                >
                <span v-else class="px-2 text-center text-[10px] text-[var(--muted)]">
                  {{ t("admin.photoHint") }}
                </span>
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  ref="photoInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  class="sr-only"
                  @change="onPhotoChange"
                >
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-2xl border border-[var(--espresso)]/15 bg-white px-3 py-2 text-sm font-bold text-[var(--ink)]"
                    @click="photoInputRef?.click()"
                  >
                    {{ dishPhotoPreview ? t("admin.changePhoto") : t("admin.uploadPhoto") }}
                  </button>
                  <button
                    v-if="dishPhotoPreview"
                    type="button"
                    class="rounded-2xl px-3 py-2 text-sm font-bold text-rose-700"
                    @click="clearSelectedPhoto"
                  >
                    {{ t("admin.removePhoto") }}
                  </button>
                </div>
                <label class="flex flex-col gap-1 text-xs text-[var(--muted)]">
                  {{ t("admin.photoUrl") }}
                  <input
                    v-model="editingDish.photo_url"
                    class="rounded-2xl border border-[var(--espresso)]/15 px-3 py-2 text-sm"
                  >
                </label>
              </div>
            </div>
          </div>

          <div class="space-y-3 border-t border-[var(--espresso)]/10 pt-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-[var(--espresso)]">
                {{ t("admin.modifiers") }}
              </h3>
              <button
                type="button"
                class="text-xs font-medium text-[var(--herb)]"
                @click="addModifierGroup"
              >
                {{ t("admin.addModifierGroup") }}
              </button>
            </div>
            <div
              v-for="(group, groupIndex) in editingDish.modifiers"
              :key="groupIndex"
              class="rounded-3xl border border-[var(--ink)]/8 p-3"
            >
              <div class="grid gap-2 sm:grid-cols-2">
                <input
                  v-model="group.name_en"
                  :placeholder="t('admin.nameEn')"
                  class="rounded-2xl border border-[var(--espresso)]/15 px-2 py-1.5 text-sm"
                >
                <input
                  v-model="group.name_ar"
                  dir="rtl"
                  :placeholder="t('admin.nameAr')"
                  class="rounded-2xl border border-[var(--espresso)]/15 px-2 py-1.5 text-sm"
                >
              </div>
              <div class="mt-2 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
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
                    class="w-14 rounded border border-[var(--espresso)]/15 px-1 py-0.5"
                  >
                </label>
                <label class="flex items-center gap-1">
                  max
                  <input
                    v-model.number="group.max_select"
                    type="number"
                    min="1"
                    class="w-14 rounded border border-[var(--espresso)]/15 px-1 py-0.5"
                  >
                </label>
                <button
                  type="button"
                  class="text-[var(--info)]"
                  @click="addModifierOption(group)"
                >
                  {{ t("admin.addOption") }}
                </button>
                <button
                  type="button"
                  class="text-rose-700"
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
                    class="rounded border border-[var(--espresso)]/15 px-2 py-1 text-sm"
                  >
                  <input
                    v-model="option.name_ar"
                    dir="rtl"
                    :placeholder="t('admin.nameAr')"
                    class="rounded border border-[var(--espresso)]/15 px-2 py-1 text-sm"
                  >
                  <input
                    v-model="option.price_extra"
                    type="number"
                    min="0"
                    step="0.01"
                    class="rounded border border-[var(--espresso)]/15 px-2 py-1 text-sm"
                  >
                  <button
                    type="button"
                    class="text-xs text-rose-700"
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
              class="rounded-2xl border border-[var(--espresso)]/15 px-4 py-2 text-sm"
              @click="closeDishModal"
            >
              {{ t("admin.cancel") }}
            </button>
            <button
              type="submit"
              class="btn-primary disabled:opacity-60"
              :disabled="saving"
            >
              {{ saving ? t("admin.saving") : t("admin.save") }}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  </div>
</template>
