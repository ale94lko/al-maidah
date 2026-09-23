<script setup lang="ts">
import { extractApiErrorMessage } from "~/utils/errors"

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
const {
  errorOpen,
  errorTitle,
  errorMessage: dialogMessage,
  showError,
  dismissError,
} = useErrorDialog()

const readyGate = ref(false)
const startingShift = ref(false)

function kitchenError(error: unknown, fallback: string) {
  const raw = (extractApiErrorMessage(error) || "").toLowerCase()
  if (raw.includes("postgres_changes") || raw.includes("realtime") || raw.includes("subscribe")) {
    return t("kitchen.boardLoadError")
  }
  return extractApiErrorMessage(error) || fallback
}

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
  } catch (error) {
    showError(kitchenError(error, t("kitchen.boardLoadError")))
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
  try {
    await selectRestaurant(value)
    if (shiftStarted.value) {
      enableAlerts()
    }
  } catch (error) {
    showError(kitchenError(error, t("kitchen.boardLoadError")))
  }
}

async function onTicketAction(
  ticketId: string,
  action: "start" | "ready" | "deliver",
) {
  try {
    await transition(ticketId, action)
  } catch (error) {
    showError(kitchenError(error, t("kitchen.ticketUpdateError")))
  }
}

async function onInstall() {
  await promptInstall()
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
          <h1 class="font-display text-xl font-bold tracking-tight text-[var(--navy)] sm:text-2xl">
            {{ t("kitchen.ticketBoard") }}
          </h1>
          <p class="mt-1 text-sm text-[var(--muted)]">
            {{ t("kitchen.boardHint") }}
          </p>
          <p
            v-if="shiftStarted && audioBlocked"
            class="mt-1 text-xs text-[var(--warning)]"
          >
            {{ t("kitchen.alertSoundBlockedHint") }}
          </p>
        </div>
        <div class="flex flex-wrap items-end gap-3">
          <button
            v-if="installAvailable && !installed"
            type="button"
            class="btn-success !px-3 !py-2"
            @click="onInstall"
          >
            {{ t("kitchen.installApp") }}
          </button>
          <label
            v-if="restaurants.length > 1"
            class="flex flex-col gap-1 text-xs text-[var(--muted)]"
          >
            {{ t("kitchen.restaurant") }}
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
          <p
            v-else-if="restaurants[0]"
            class="text-sm font-bold text-[var(--gold)]"
          >
            {{ restaurants[0].name }}
          </p>
        </div>
      </div>

      <AppEmptyState
        v-if="!restaurants.length"
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
