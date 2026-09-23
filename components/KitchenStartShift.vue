<script setup lang="ts">
const { t } = useAppI18n()

defineProps<{
  busy?: boolean
}>()

const emit = defineEmits<{
  start: []
}>()
</script>

<template>
  <div
    class="fixed inset-0 z-40 flex items-center justify-center bg-[var(--paper)]/95 px-6 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="kitchen-start-shift-title"
  >
    <div class="surface-card w-full max-w-md space-y-6 text-center">
      <div class="space-y-2">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
          {{ t("kitchen.title") }}
        </p>
        <h2
          id="kitchen-start-shift-title"
          class="font-display text-2xl font-bold tracking-tight text-[var(--navy)] sm:text-3xl"
        >
          {{ t("kitchen.startShiftTitle") }}
        </h2>
        <p class="text-sm text-[var(--muted)]">
          {{ t("kitchen.startShiftHint") }}
        </p>
      </div>
      <button
        type="button"
        class="btn-success w-full disabled:opacity-60"
        :disabled="busy"
        @click="emit('start')"
      >
        {{ busy ? t("kitchen.startingShift") : t("kitchen.startShift") }}
      </button>
      <p class="text-xs text-[var(--muted)]">
        {{ t("kitchen.startShiftSoundNote") }}
      </p>
    </div>
  </div>
</template>
