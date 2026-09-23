<script setup lang="ts">
import type { Category, Dish } from "~/types"
import { localizedDescription, localizedName } from "~/utils/localize"

definePageMeta({
  layout: "client",
})

const route = useRoute()
const { setShell } = useClientShell()
const { t, locale } = useAppI18n()

const slug = computed(() => String(route.params.slug || ""))
const tableFromQuery = computed(() => {
  const raw = route.query.table
  const value = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN
  return Number.isInteger(value) && value > 0 ? value : null
})

const loading = ref(true)
const errorMessage = ref("")
const restaurantName = ref("")
const categories = ref<Category[]>([])
const dishes = ref<Dish[]>([])

const dishesByCategory = computed(() => {
  const map = new Map<string, Dish[]>()
  for (const dish of dishes.value) {
    const list = map.get(dish.category_id) ?? []
    list.push(dish)
    map.set(dish.category_id, list)
  }
  return categories.value.map((category) => ({
    category,
    dishes: map.get(category.id) ?? [],
  }))
})

onMounted(async () => {
  loading.value = true
  errorMessage.value = ""
  try {
    const menu = await $fetch<{
      restaurant: { name: string; slug: string }
      categories: Category[]
      dishes: Dish[]
    }>(`/api/menu/${encodeURIComponent(slug.value)}`, {
      query: tableFromQuery.value ? { table: tableFromQuery.value } : undefined,
    })
    restaurantName.value = menu.restaurant.name
    categories.value = menu.categories
    dishes.value = menu.dishes
    setShell({
      venueName: menu.restaurant.name,
      tableNumber: tableFromQuery.value,
    })
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("guest.menuUnavailable")
    setShell({
      venueName: slug.value || "Menu",
      tableNumber: tableFromQuery.value,
    })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <AppLoadingState v-if="loading" :label="t('guest.loadingMenu')" />
    <AppEmptyState
      v-else-if="errorMessage"
      :title="t('guest.menuUnavailable')"
      :description="errorMessage"
    />
    <div v-else class="space-y-6">
      <p class="text-sm leading-relaxed text-stone-600">
        {{ t("guest.shellIntro", { name: restaurantName }) }}
      </p>

      <AppEmptyState
        v-if="dishes.length === 0"
        :title="t('guest.noDishes')"
        :description="t('guest.noDishesHint')"
      />

      <section
        v-for="group in dishesByCategory"
        v-else
        :key="group.category.id"
        class="space-y-3"
      >
        <h2 class="text-lg font-semibold tracking-tight text-stone-900">
          {{ localizedName(group.category, locale) }}
        </h2>
        <ul class="space-y-2">
          <li
            v-for="dish in group.dishes"
            :key="dish.id"
            class="rounded-2xl border border-teal-900/10 bg-white/80 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-stone-900">
                  {{ localizedName(dish, locale) }}
                </p>
                <p
                  v-if="localizedDescription(dish, locale)"
                  class="mt-1 text-sm text-stone-600"
                >
                  {{ localizedDescription(dish, locale) }}
                </p>
              </div>
              <p class="shrink-0 font-mono text-sm text-teal-900">
                {{ dish.price }} AED
              </p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
