<script setup lang="ts">
import type {
  DiningTable,
  Dish,
  ModifierGroupWithOptions,
} from "~/types"
import { localizedDescription, localizedName } from "~/utils/localize"
import {
  computeUnitPrice,
  toSelectedOptions,
  validateModifierSelection,
} from "~/utils/cart"
import { parseSessionToken } from "~/utils/session-token"

definePageMeta({
  layout: "client",
})

const route = useRoute()
const router = useRouter()
const { setShell } = useClientShell()
const {
  loadFromStorage,
  saveSession,
  clearSession,
  resolveSessionToken,
  session,
} = useGuestSession()
const { addItem, syncFromStorage } = useCart()
const { t, locale } = useAppI18n()

const slug = computed(() => String(route.params.slug || ""))
const dishId = computed(() => String(route.params.id || ""))
const sessionFromQuery = computed(() => parseSessionToken(route.query.session))

const loading = ref(true)
const errorKind = ref<"none" | "missing-table" | "session-closed" | "not-found" | "dish" | "generic">(
  "none",
)
const errorMessage = ref("")
const dish = ref<Dish | null>(null)
const groups = ref<ModifierGroupWithOptions[]>([])
const selectedIds = ref<string[]>([])
const notes = ref("")
const quantity = ref(1)
const submitError = ref("")

const menuPath = computed(() => {
  const token = sessionFromQuery.value ?? session.value?.sessionToken
  return {
    path: `/m/${slug.value}`,
    query: token ? { session: token } : undefined,
  }
})

const previewUnitPrice = computed(() => {
  if (!dish.value) {
    return "0.00"
  }
  const selected = toSelectedOptions(groups.value, selectedIds.value)
  return computeUnitPrice(dish.value.price, selected)
})

const validation = computed(() =>
  validateModifierSelection(groups.value, selectedIds.value),
)

const canAdd = computed(
  () =>
    Boolean(dish.value?.is_available) &&
    validation.value.ok &&
    quantity.value >= 1,
)

function isSingleSelect(group: ModifierGroupWithOptions) {
  return group.max_select === 1
}

function isSelected(optionId: string) {
  return selectedIds.value.includes(optionId)
}

function toggleOption(group: ModifierGroupWithOptions, optionId: string) {
  submitError.value = ""
  if (isSingleSelect(group)) {
    const withoutGroup = selectedIds.value.filter(
      (id) => !group.options.some((option) => option.id === id),
    )
    selectedIds.value = [...withoutGroup, optionId]
    return
  }

  if (isSelected(optionId)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== optionId)
    return
  }

  const groupSelectedCount = group.options.filter((option) =>
    selectedIds.value.includes(option.id),
  ).length
  if (group.max_select > 0 && groupSelectedCount >= group.max_select) {
    return
  }
  selectedIds.value = [...selectedIds.value, optionId]
}

function onAddToCart() {
  submitError.value = ""
  if (!dish.value) {
    return
  }
  if (!dish.value.is_available) {
    submitError.value = t("guest.soldOutCannotAdd")
    return
  }
  const check = validateModifierSelection(groups.value, selectedIds.value)
  if (!check.ok) {
    const group = groups.value.find((item) => item.id === check.groupId)
    submitError.value = group
      ? t("guest.selectRequired", { group: localizedName(group, locale.value) })
      : t("guest.requiredOption")
    return
  }

  const selected_options = toSelectedOptions(groups.value, selectedIds.value)
  const ok = addItem({
    menu_item_id: dish.value.id,
    name_en: dish.value.name_en,
    name_ar: dish.value.name_ar,
    base_price: dish.value.price,
    quantity: quantity.value,
    notes: notes.value,
    selected_options,
  })
  if (!ok) {
    submitError.value = t("guest.scanQrAgainHint")
    return
  }
  void router.push(menuPath.value)
}

onMounted(async () => {
  loading.value = true
  errorKind.value = "none"
  errorMessage.value = ""
  loadFromStorage()
  syncFromStorage()

  const token = resolveSessionToken(slug.value, sessionFromQuery.value)
  if (token == null) {
    clearSession()
    setShell({ venueName: slug.value || "Menu", tableNumber: null })
    errorKind.value = "missing-table"
    loading.value = false
    return
  }

  try {
    const menu = await $fetch<{
      restaurant: { name: string; slug: string }
      dishes: Dish[]
      modifiers: ModifierGroupWithOptions[]
      table: DiningTable
      session: { id: string; token: string; status: string }
    }>(`/api/menu/${encodeURIComponent(slug.value)}`, {
      query: { session: token },
    })

    saveSession({
      slug: menu.restaurant.slug,
      tableNumber: menu.table.table_number,
      tableId: menu.table.id,
      sessionToken: menu.session.token,
      restaurantName: menu.restaurant.name,
    })
    setShell({
      venueName: menu.restaurant.name,
      tableNumber: menu.table.table_number,
    })
    syncFromStorage()

    const found = menu.dishes.find((item) => item.id === dishId.value) ?? null
    if (!found) {
      errorKind.value = "dish"
      errorMessage.value = t("guest.dishNotFoundHint")
      loading.value = false
      return
    }

    dish.value = found
    groups.value = menu.modifiers
      .filter((group) => group.menu_item_id === found.id)
      .sort((a, b) => a.sort_order - b.sort_order)

    // Pre-select sole required single-option groups? Leave empty so required check works.
  } catch (error: unknown) {
    clearSession()
    setShell({ venueName: slug.value || "Menu", tableNumber: null })
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : NaN
    const message =
      error instanceof Error ? error.message : t("guest.menuUnavailable")
    if (/closed|ask staff to open/i.test(message)) {
      errorKind.value = "session-closed"
    } else if (status === 404 && /restaurant/i.test(message)) {
      errorKind.value = "not-found"
    } else if (status === 400 || status === 404 || /session|table|qr|staff/i.test(message)) {
      errorKind.value = "missing-table"
    } else {
      errorKind.value = "generic"
    }
    errorMessage.value = message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <AppLoadingState v-if="loading" :label="t('guest.loadingMenu')" />
    <AppEmptyState
      v-else-if="errorKind === 'missing-table' || errorKind === 'session-closed'"
      :title="t('guest.scanQrAgain')"
      :description="
        errorKind === 'session-closed'
          ? t('guest.sessionClosedHint')
          : t('guest.scanQrAgainHint')
      "
    />
    <AppEmptyState
      v-else-if="errorKind === 'not-found'"
      :title="t('guest.restaurantNotFound')"
      :description="errorMessage || t('guest.restaurantNotFoundHint')"
    />
    <AppEmptyState
      v-else-if="errorKind === 'dish'"
      :title="t('guest.dishNotFound')"
      :description="errorMessage || t('guest.dishNotFoundHint')"
    />
    <AppEmptyState
      v-else-if="errorKind !== 'none' || !dish"
      :title="t('guest.menuUnavailable')"
      :description="errorMessage"
    />
    <div v-else class="space-y-5">
      <NuxtLink
        :to="menuPath"
        class="inline-flex text-sm font-medium text-[var(--herb)]"
      >
        ← {{ t("guest.backToMenu") }}
      </NuxtLink>

      <div class="overflow-hidden rounded-3xl border border-[var(--ink)]/8 bg-[var(--surface)]">
        <div class="aspect-[16/10] bg-[var(--herb)]/10">
          <img
            v-if="dish.photo_url"
            :src="dish.photo_url"
            :alt="localizedName(dish, locale)"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="space-y-2 p-4">
          <div class="flex items-start justify-between gap-3">
            <h1 class="font-display text-xl font-bold tracking-tight text-[var(--espresso)]">
              {{ localizedName(dish, locale) }}
            </h1>
            <p class="shrink-0 font-mono text-sm text-[var(--herb)]">
              {{ t("guest.priceAed", { price: dish.price }) }}
            </p>
          </div>
          <p
            v-if="localizedDescription(dish, locale)"
            class="text-sm leading-relaxed text-[var(--muted)]"
          >
            {{ localizedDescription(dish, locale) }}
          </p>
          <p
            v-if="!dish.is_available"
            class="text-sm font-semibold text-rose-800"
          >
            {{ t("guest.soldOutCannotAdd") }}
          </p>
        </div>
      </div>

      <section
        v-for="group in groups"
        :key="group.id"
        class="surface-card space-y-2 !p-4"
      >
        <div class="flex items-baseline justify-between gap-2">
          <h2 class="font-display text-sm font-semibold text-[var(--espresso)]">
            {{ localizedName(group, locale) }}
            <span v-if="group.is_required || group.min_select > 0" class="text-rose-700">
              *
            </span>
          </h2>
          <p class="text-xs text-[var(--muted)]">
            <template v-if="group.is_required || group.min_select > 0">
              {{ t("guest.selectRequired", { group: localizedName(group, locale) }) }}
            </template>
            <template v-else-if="group.max_select > 0">
              {{ t("guest.maxOptions", { max: group.max_select }) }}
            </template>
          </p>
        </div>
        <ul class="space-y-2">
          <li v-for="option in group.options" :key="option.id">
            <label
              class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm transition"
              :class="
                isSelected(option.id)
                  ? 'border-[var(--herb)] bg-[var(--herb)] text-[var(--ivory)]'
                  : 'border-[var(--espresso)]/15 bg-[var(--ivory)] text-[var(--espresso)]'
              "
            >
              <span class="flex min-w-0 items-center gap-2">
                <input
                  class="sr-only"
                  :type="isSingleSelect(group) ? 'radio' : 'checkbox'"
                  :name="group.id"
                  :checked="isSelected(option.id)"
                  @change="toggleOption(group, option.id)"
                />
                <span class="truncate font-medium">
                  {{ localizedName(option, locale) }}
                </span>
              </span>
              <span class="shrink-0 font-mono text-xs opacity-90">
                <template v-if="Number(option.price_extra) > 0">
                  +{{ t("guest.priceAed", { price: option.price_extra }) }}
                </template>
                <template v-else>
                  {{ t("guest.priceAed", { price: "0.00" }) }}
                </template>
              </span>
            </label>
          </li>
        </ul>
      </section>

      <label class="block space-y-2">
        <span class="text-sm font-semibold text-[var(--espresso)]">{{ t("guest.notes") }}</span>
        <textarea
          v-model="notes"
          rows="3"
          :placeholder="t('guest.notesPlaceholder')"
          class="w-full rounded-2xl border border-[var(--espresso)]/15 bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none ring-[var(--herb)]/30 placeholder:text-[var(--muted)] focus:ring-2"
        />
      </label>

      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="h-10 w-10 rounded-2xl border border-[var(--espresso)]/20 bg-[var(--ivory)] text-lg font-semibold text-[var(--espresso)]"
            :aria-label="t('guest.decreaseQty')"
            @click="quantity = Math.max(1, quantity - 1)"
          >
            −
          </button>
          <span class="min-w-8 text-center font-mono text-sm text-[var(--espresso)]">{{ quantity }}</span>
          <button
            type="button"
            class="h-10 w-10 rounded-2xl border border-[var(--espresso)]/20 bg-[var(--ivory)] text-lg font-semibold text-[var(--espresso)]"
            :aria-label="t('guest.increaseQty')"
            @click="quantity += 1"
          >
            +
          </button>
        </div>
        <p class="font-mono text-sm font-semibold text-[var(--herb)]">
          {{ t("guest.priceAed", { price: previewUnitPrice }) }}
        </p>
      </div>

      <p v-if="submitError" class="text-sm font-medium text-rose-800">
        {{ submitError }}
      </p>

      <button
        type="button"
        class="btn-primary w-full !rounded-2xl !py-3 disabled:cursor-not-allowed"
        :disabled="!canAdd"
        @click="onAddToCart"
      >
        {{ t("guest.addToCart") }}
        ·
        {{ t("guest.priceAed", { price: previewUnitPrice }) }}
      </button>
    </div>
  </div>
</template>
