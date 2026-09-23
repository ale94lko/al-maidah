<script setup lang="ts">
definePageMeta({
  layout: "kitchen",
})

const { refreshSession } = useAuth()
const { t } = useAppI18n()
const {
  restaurants,
  restaurantId,
  pending,
  preparing,
  ready,
  loading,
  errorMessage,
  busyId,
  bootstrap,
  selectRestaurant,
  transition,
  elapsedMinutes,
  dispose,
} = useKitchenBoard()

const readyGate = ref(false)

onMounted(async () => {
  const session = await refreshSession()
  if (!session) {
    await navigateTo({
      path: "/admin/login",
      query: { redirect: "/kitchen" },
    })
    return
  }
  readyGate.value = true
  try {
    await bootstrap()
  } catch {
    /* errorMessage already set */
  }
})

onBeforeUnmount(() => {
  dispose()
})

async function onRestaurantChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  await selectRestaurant(value)
}

async function onTicketAction(
  ticketId: string,
  action: "start" | "ready" | "deliver",
) {
  try {
    await transition(ticketId, action)
  } catch {
    /* surfaced via errorMessage */
  }
}
</script>

<template>
  <div>
    <AppLoadingState
      v-if="!readyGate || loading"
      :label="t('kitchen.opening')"
    />
    <div v-else class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
            {{ t("kitchen.ticketBoard") }}
          </h1>
          <p class="mt-1 text-sm text-zinc-400">
            {{ t("kitchen.boardHint") }}
          </p>
        </div>
        <label
          v-if="restaurants.length > 1"
          class="flex flex-col gap-1 text-xs text-zinc-400"
        >
          {{ t("kitchen.restaurant") }}
          <select
            class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
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
        <p
          v-else-if="restaurants[0]"
          class="text-sm font-medium text-zinc-300"
        >
          {{ restaurants[0].name }}
        </p>
      </div>

      <p v-if="errorMessage" class="text-sm text-red-400">
        {{ errorMessage }}
      </p>

      <AppEmptyState
        v-if="!restaurants.length"
        class="border-zinc-700 text-zinc-200"
        :title="t('kitchen.noRestaurant')"
        :description="t('kitchen.noRestaurantHint')"
      />
      <KitchenBoard
        v-else
        :pending="pending"
        :preparing="preparing"
        :ready="ready"
        :busy-id="busyId"
        :elapsed-minutes="elapsedMinutes"
        @action="onTicketAction"
      />
    </div>
  </div>
</template>
