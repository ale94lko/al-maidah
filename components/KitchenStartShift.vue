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
    class="fixed inset-0 z-40 flex items-center justify-center bg-[var(--espresso)]/95 px-6 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="kitchen-start-shift-title"
  >
    <div class="w-full max-w-md space-y-6 text-center">
      <div class="space-y-2">
        <p
          class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brass)]"
        >
          {{ t("kitchen.title") }}
        </p>
        <h2
          id="kitchen-start-shift-title"
          class="font-display text-2xl font-semibold tracking-tight text-[var(--ivory)] sm:text-3xl"
        >
          {{ t("kitchen.startShiftTitle") }}
        </h2>
        <p class="text-sm text-[var(--brass-soft)]/80">
          {{ t("kitchen.startShiftHint") }}
        </p>
      </div>
      <button
        type="button"
        class="w-full rounded-xl bg-[var(--olive)] px-4 py-3.5 text-base font-semibold text-[var(--ivory)] hover:bg-[var(--olive-deep)] disabled:opacity-60"
        :disabled="busy"
        @click="emit('start')"
      >
        {{ busy ? t("kitchen.startingShift") : t("kitchen.startShift") }}
      </button>
      <p class="text-xs text-[var(--brass-soft)]/50">
        {{ t("kitchen.startShiftSoundNote") }}
      </p>
    </div>
  </div>
</template>
