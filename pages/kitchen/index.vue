<script setup lang="ts">
definePageMeta({
  layout: "kitchen",
})

const { refreshSession } = useAuth()
const { t } = useAppI18n()
const {
  shiftStarted,
  audioBlocked,
  visualAlertActive,
  visualAlertMessage,
  startShift,
  alertNewOrder,
  dismissVisualAlert,
  disposeAudio,
} = useKitchenAudio()
const {
  installAvailable,
  installed,
  applyKitchenHead,
  registerServiceWorker,
  listenForInstall,
  stopListening,
  promptInstall,
} = useKitchenPwa()

applyKitchenHead()

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
  enableAlerts,
  transition,
  elapsedMinutes,
  dispose,
} = useKitchenBoard({
  onNewTickets: (fresh) => {
    void alertNewOrder(fresh.length)
  },
})

const readyGate = ref(false)
const startingShift = ref(false)

onMounted(async () => {
  listenForInstall()
  await registerServiceWorker()

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
  disposeAudio()
  stopListening()
})

async function onStartShift() {
  startingShift.value = true
  try {
    await startShift()
    enableAlerts()
  } finally {
    startingShift.value = false
  }
}

async function onRestaurantChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  await selectRestaurant(value)
  if (shiftStarted.value) {
    enableAlerts()
  }
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

async function onInstall() {
  await promptInstall()
}
</script>

<template>
  <div>
    <KitchenNewOrderAlert
      :active="visualAlertActive"
      :message-key="visualAlertMessage"
      :audio-blocked="audioBlocked"
      @dismiss="dismissVisualAlert"
    />

    <KitchenStartShift
      v-if="readyGate && !loading && !shiftStarted"
      :busy="startingShift"
      @start="onStartShift"
    />

    <AppLoadingState
      v-if="!readyGate || loading"
      :label="t('kitchen.opening')"
    />
    <div v-else class="space-y-4" :class="{ 'pt-14': visualAlertActive }">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
            {{ t("kitchen.ticketBoard") }}
          </h1>
          <p class="mt-1 text-sm text-zinc-400">
            {{ t("kitchen.boardHint") }}
          </p>
          <p
            v-if="shiftStarted && audioBlocked"
            class="mt-1 text-xs text-amber-300/90"
          >
            {{ t("kitchen.alertSoundBlockedHint") }}
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <button
            v-if="installAvailable && !installed"
            type="button"
            class="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20"
            @click="onInstall"
          >
            {{ t("kitchen.installApp") }}
          </button>
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
