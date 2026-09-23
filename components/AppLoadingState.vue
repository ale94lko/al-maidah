<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
  }>(),
  {
    label: "Loading…",
  },
)
</script>

<template>
  <div
    class="flex min-h-[14rem] flex-col items-center justify-center gap-4 px-4 py-12 text-center"
    role="status"
    aria-live="polite"
  >
    <span
      class="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--paper-deep)] border-t-[var(--chili)]"
      aria-hidden="true"
    />
    <p class="text-sm font-bold tracking-wide text-[var(--muted)]">
      {{ label }}
    </p>
  </div>
</template>
