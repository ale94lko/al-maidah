<script setup lang="ts">
import type { Category, DiningTable, Dish } from "~/types"
import { localizedDescription, localizedName } from "~/utils/localize"

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
  resolveTableNumber,
} = useGuestSession()
const { syncFromStorage } = useCart()
const { t, locale } = useAppI18n()

const slug = computed(() => String(route.params.slug || ""))
const tableFromQuery = computed(() => {
  const raw = route.query.table
  const value = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN
  return Number.isInteger(value) && value > 0 ? value : null
})

const loading = ref(true)
const errorKind = ref<"none" | "missing-table" | "not-found" | "generic">("none")
const errorMessage = ref("")
const restaurantName = ref("")
const categories = ref<Category[]>([])
const dishes = ref<Dish[]>([])
const pinnedTable = ref<DiningTable | null>(null)

const searchQuery = ref("")
const vegetarianOnly = ref(false)
const excludedAllergens = ref<string[]>([])

const allergenOptions = computed(() => {
  const set = new Set<string>()
  for (const dish of dishes.value) {
    for (const allergen of dish.allergens ?? []) {
      if (allergen) {
        set.add(allergen)
      }
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
})

const hasActiveFilters = computed(
  () =>
    searchQuery.value.trim().length > 0 ||
    vegetarianOnly.value ||
    excludedAllergens.value.length > 0,
)

const filteredDishes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return dishes.value.filter((dish) => {
    if (vegetarianOnly.value && !dish.is_vegetarian) {
      return false
    }
    if (
      excludedAllergens.value.some((allergen) =>
        (dish.allergens ?? []).includes(allergen),
      )
    ) {
      return false
    }
    if (!q) {
      return true
    }
    const name = localizedName(dish, locale.value).toLowerCase()
    const description = (localizedDescription(dish, locale.value) || "").toLowerCase()
    return name.includes(q) || description.includes(q)
  })
})

const dishesByCategory = computed(() => {
  const map = new Map<string, Dish[]>()
  for (const dish of filteredDishes.value) {
    const list = map.get(dish.category_id) ?? []
    list.push(dish)
    map.set(dish.category_id, list)
  }
  return categories.value
    .map((category) => ({
      category,
      dishes: map.get(category.id) ?? [],
    }))
    .filter((group) => group.dishes.length > 0)
})

const errorTitle = computed(() => {
  if (errorKind.value === "missing-table") {
    return t("guest.scanQrAgain")
  }
  if (errorKind.value === "not-found") {
    return t("guest.restaurantNotFound")
  }
  return t("guest.menuUnavailable")
})

const errorDescription = computed(() => {
  if (errorKind.value === "missing-table") {
    return t("guest.scanQrAgainHint")
  }
  if (errorKind.value === "not-found") {
    return errorMessage.value || t("guest.restaurantNotFoundHint")
  }
  return errorMessage.value || t("guest.menuUnavailable")
})

function toggleAllergen(allergen: string) {
  const current = excludedAllergens.value
  if (current.includes(allergen)) {
    excludedAllergens.value = current.filter((item) => item !== allergen)
  } else {
    excludedAllergens.value = [...current, allergen]
  }
}

function clearFilters() {
  searchQuery.value = ""
  vegetarianOnly.value = false
  excludedAllergens.value = []
}

function formatPrice(price: string) {
  return t("guest.priceAed", { price })
}

function dishPath(dishId: string) {
  return {
    path: `/m/${slug.value}/dish/${dishId}`,
    query: tableFromQuery.value
      ? { table: String(tableFromQuery.value) }
      : pinnedTable.value
        ? { table: String(pinnedTable.value.table_number) }
        : undefined,
  }
}

async function ensureTableInUrl(tableNumber: number) {
  if (tableFromQuery.value === tableNumber) {
    return
  }
  await router.replace({
    path: route.path,
    query: { ...route.query, table: String(tableNumber) },
  })
}

onMounted(async () => {
  loading.value = true
  errorKind.value = "none"
  errorMessage.value = ""
  loadFromStorage()

  const tableNumber = resolveTableNumber(slug.value, tableFromQuery.value)
  if (tableNumber == null) {
    clearSession()
    setShell({ venueName: slug.value || "Menu", tableNumber: null })
    errorKind.value = "missing-table"
    loading.value = false
    return
  }

  try {
    const menu = await $fetch<{
      restaurant: { id: string; name: string; slug: string }
      categories: Category[]
      dishes: Dish[]
      table: DiningTable
    }>(`/api/menu/${encodeURIComponent(slug.value)}`, {
      query: { table: tableNumber },
    })

    restaurantName.value = menu.restaurant.name
    categories.value = menu.categories
    dishes.value = menu.dishes
    pinnedTable.value = menu.table

    saveSession({
      slug: menu.restaurant.slug,
      tableNumber: menu.table.table_number,
      tableId: menu.table.id,
      restaurantName: menu.restaurant.name,
    })
    setShell({
      venueName: menu.restaurant.name,
      tableNumber: menu.table.table_number,
    })
    syncFromStorage()
    await ensureTableInUrl(menu.table.table_number)
  } catch (error: unknown) {
    clearSession()
    setShell({
      venueName: slug.value || "Menu",
      tableNumber: null,
    })

    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : error && typeof error === "object" && "status" in error
          ? Number((error as { status?: number }).status)
          : NaN
    const message =
      error && typeof error === "object" && "data" in error
        ? String(
            (error as { data?: { statusMessage?: string; message?: string } }).data
              ?.statusMessage ||
              (error as { data?: { message?: string } }).data?.message ||
              "",
          )
        : error instanceof Error
          ? error.message
          : ""

    if (status === 404 && /restaurant/i.test(message)) {
      errorKind.value = "not-found"
      errorMessage.value = message || t("guest.restaurantNotFoundHint")
    } else if (
      status === 400 ||
      status === 404 ||
      /table/i.test(message) ||
      /scan the qr/i.test(message)
    ) {
      errorKind.value = "missing-table"
      errorMessage.value = message || t("guest.scanQrAgainHint")
    } else {
      errorKind.value = "generic"
      errorMessage.value = message || t("guest.menuUnavailable")
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <AppLoadingState v-if="loading" :label="t('guest.loadingMenu')" />
    <AppEmptyState
      v-else-if="errorKind !== 'none'"
      :title="errorTitle"
      :description="errorDescription"
    />
    <div v-else class="space-y-6">
      <p class="text-sm leading-relaxed text-[var(--muted)]">
        {{ t("guest.shellIntro", { name: restaurantName }) }}
      </p>

      <div class="surface-card space-y-3 !rounded-3xl !p-4">
        <label class="block">
          <span class="sr-only">{{ t("guest.searchPlaceholder") }}</span>
          <input
            v-model="searchQuery"
            type="search"
            :placeholder="t('guest.searchPlaceholder')"
            class="w-full rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] px-4 py-2.5 text-sm text-[var(--ink)] outline-none ring-[var(--herb)]/25 placeholder:text-[var(--muted)] focus:ring-2"
          />
        </label>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-2xl border px-3 py-1.5 text-xs font-bold transition"
            :class="
              vegetarianOnly
                ? 'border-[var(--herb)] bg-[var(--herb)] text-white'
                : 'border-[var(--ink)]/10 bg-white text-[var(--ink)]'
            "
            @click="vegetarianOnly = !vegetarianOnly"
          >
            {{ t("guest.vegetarianOnly") }}
          </button>
          <button
            v-for="allergen in allergenOptions"
            :key="allergen"
            type="button"
            class="rounded-2xl border px-3 py-1.5 text-xs font-bold capitalize transition"
            :class="
              excludedAllergens.includes(allergen)
                ? 'border-[var(--chili)] bg-[var(--chili)] text-white'
                : 'border-[var(--ink)]/10 bg-white text-[var(--ink)]'
            "
            :aria-pressed="excludedAllergens.includes(allergen)"
            @click="toggleAllergen(allergen)"
          >
            {{ t("guest.excludeAllergen", { allergen }) }}
          </button>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="rounded-2xl border border-[var(--ink)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--muted)]"
            @click="clearFilters"
          >
            {{ t("guest.clearFilters") }}
          </button>
        </div>
      </div>

      <AppEmptyState
        v-if="dishes.length === 0"
        :title="t('guest.noDishes')"
        :description="t('guest.noDishesHint')"
      />
      <AppEmptyState
        v-else-if="dishesByCategory.length === 0"
        :title="t('guest.noMatches')"
        :description="t('guest.noMatchesHint')"
      />

      <section
        v-for="group in dishesByCategory"
        :key="group.category.id"
        class="space-y-3"
      >
        <h2 class="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
          {{ localizedName(group.category, locale) }}
        </h2>
        <ul class="space-y-3">
          <li
            v-for="dish in group.dishes"
            :key="dish.id"
            class="dish-row"
            :class="{ 'opacity-70': !dish.is_available }"
          >
            <NuxtLink
              :to="dishPath(dish.id)"
              class="flex"
            >
              <div
                class="relative h-28 w-28 shrink-0 overflow-hidden bg-[var(--herb)]/10 sm:h-32 sm:w-32"
              >
                <img
                  v-if="dish.photo_url"
                  :src="dish.photo_url"
                  :alt="localizedName(dish, locale)"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div
                  v-else
                  class="font-display flex h-full w-full items-center justify-center text-xs font-bold text-[var(--herb)]/40"
                  aria-hidden="true"
                >
                  Al-Maidah
                </div>
                <span
                  v-if="!dish.is_available"
                  class="absolute inset-x-2 bottom-2 rounded-xl bg-[var(--ink)]/90 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-white"
                >
                  {{ t("guest.soldOut") }}
                </span>
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-2 p-3.5">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-bold text-[var(--ink)]">
                      {{ localizedName(dish, locale) }}
                    </p>
                    <p
                      v-if="localizedDescription(dish, locale)"
                      class="mt-1 line-clamp-2 text-sm text-[var(--muted)]"
                    >
                      {{ localizedDescription(dish, locale) }}
                    </p>
                  </div>
                  <p class="shrink-0 font-mono text-sm font-bold text-[var(--chili)]">
                    {{ formatPrice(dish.price) }}
                  </p>
                </div>
                <div class="mt-auto flex flex-wrap gap-1.5">
                  <span
                    v-if="dish.is_vegetarian"
                    class="rounded-xl bg-[var(--herb)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--herb-deep)]"
                  >
                    {{ t("guest.vegetarian") }}
                  </span>
                  <span
                    v-for="allergen in dish.allergens"
                    :key="`${dish.id}-${allergen}`"
                    class="rounded-xl bg-[var(--citrus)]/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ink)]"
                  >
                    {{ allergen }}
                  </span>
                  <span
                    v-if="!dish.is_available"
                    class="rounded-xl bg-[var(--ink)]/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--ink)]"
                  >
                    {{ t("guest.soldOut") }}
                  </span>
                </div>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
