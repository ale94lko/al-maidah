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
    class="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/95 px-6 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="kitchen-start-shift-title"
  >
    <div class="w-full max-w-md space-y-6 text-center">
      <div class="space-y-2">
        <p
          class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90"
        >
          {{ t("kitchen.title") }}
        </p>
        <h2
          id="kitchen-start-shift-title"
          class="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl"
        >
          {{ t("kitchen.startShiftTitle") }}
        </h2>
        <p class="text-sm text-zinc-400">
          {{ t("kitchen.startShiftHint") }}
        </p>
      </div>
      <button
        type="button"
        class="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        :disabled="busy"
        @click="emit('start')"
      >
        {{ busy ? t("kitchen.startingShift") : t("kitchen.startShift") }}
      </button>
      <p class="text-xs text-zinc-500">
        {{ t("kitchen.startShiftSoundNote") }}
      </p>
    </div>
  </div>
</template>
