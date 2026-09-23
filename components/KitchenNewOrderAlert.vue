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
      class="flex w-full max-w-3xl items-start justify-between gap-3 rounded-2xl border border-[var(--warning)]/40 bg-[color-mix(in_srgb,var(--warning)_16%,white)] px-4 py-3 text-[var(--ink)] shadow-lg"
    >
      <div class="min-w-0">
        <p class="text-sm font-semibold tracking-tight">
          {{ title }}
        </p>
        <p class="mt-0.5 text-xs text-[var(--muted)]">
          {{ hint }}
        </p>
      </div>
      <button
        type="button"
        class="btn-warning !px-2.5 !py-1 !text-xs"
        @click="emit('dismiss')"
      >
        {{ t("kitchen.alertDismiss") }}
      </button>
    </div>
  </div>
</template>
