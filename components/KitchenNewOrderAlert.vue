<script setup lang="ts">
const props = defineProps<{
  active: boolean
  messageKey: string
  audioBlocked: boolean
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const { t } = useAppI18n()

const title = computed(() => {
  if (props.messageKey === "new-orders") {
    return t("kitchen.alertNewOrders")
  }
  if (props.messageKey === "sound-blocked") {
    return t("kitchen.alertSoundBlocked")
  }
  return t("kitchen.alertNewOrder")
})

const hint = computed(() => {
  if (props.audioBlocked || props.messageKey === "sound-blocked") {
    return t("kitchen.alertSoundBlockedHint")
  }
  return t("kitchen.alertNewOrderHint")
})
</script>

<template>
  <div
    v-if="active"
    class="kitchen-new-order-alert fixed inset-x-0 top-0 z-30 flex justify-center px-4 pt-3 sm:px-6"
    role="alert"
  >
    <div
      class="flex w-full max-w-3xl items-start justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-amber-100 shadow-lg backdrop-blur"
    >
      <div class="min-w-0">
        <p class="text-sm font-semibold tracking-tight">
          {{ title }}
        </p>
        <p class="mt-0.5 text-xs text-amber-100/80">
          {{ hint }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-amber-300/30 px-2.5 py-1 text-xs font-medium text-amber-50 hover:bg-amber-400/20"
        @click="emit('dismiss')"
      >
        {{ t("kitchen.alertDismiss") }}
      </button>
    </div>
  </div>
</template>
