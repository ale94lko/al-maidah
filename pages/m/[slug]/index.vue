<script setup lang="ts">
definePageMeta({
  layout: "client",
})

const route = useRoute()
const { setShell } = useClientShell()

const slug = computed(() => String(route.params.slug || ""))
const tableFromQuery = computed(() => {
  const raw = route.query.table
  const value = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN
  return Number.isInteger(value) && value > 0 ? value : null
})

const loading = ref(true)
const errorMessage = ref("")
const restaurantName = ref("")
const dishCount = ref(0)

onMounted(async () => {
  loading.value = true
  errorMessage.value = ""
  try {
    const menu = await $fetch<{
      restaurant: { name: string; slug: string }
      dishes: unknown[]
    }>(`/api/menu/${encodeURIComponent(slug.value)}`, {
      query: tableFromQuery.value ? { table: tableFromQuery.value } : undefined,
    })
    restaurantName.value = menu.restaurant.name
    dishCount.value = menu.dishes.length
    setShell({
      venueName: menu.restaurant.name,
      tableNumber: tableFromQuery.value,
    })
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Could not load menu"
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
    <AppLoadingState v-if="loading" label="Loading menu…" />
    <AppEmptyState
      v-else-if="errorMessage"
      title="Menu unavailable"
      :description="errorMessage"
    />
    <div v-else class="space-y-4">
      <p class="text-sm leading-relaxed text-stone-600">
        Guest menu shell for
        <span class="font-medium text-stone-900">{{ restaurantName }}</span>.
        Category browsing arrives in the next MVP issues.
      </p>
      <AppEmptyState
        v-if="dishCount === 0"
        title="No dishes listed yet"
        description="This layout is ready for the QR menu screens."
      />
      <p
        v-else
        class="rounded-2xl border border-teal-900/10 bg-white/70 px-4 py-3 text-sm text-stone-700"
      >
        {{ dishCount }} available dishes loaded for this venue.
      </p>
    </div>
  </div>
</template>
