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
    class="flex min-h-[12rem] flex-col items-center justify-center gap-3 px-4 py-10 text-center"
    role="status"
    aria-live="polite"
  >
    <span
      class="h-8 w-8 animate-spin rounded-full border-2 border-current border-r-transparent opacity-70"
      aria-hidden="true"
    />
    <p class="text-sm font-medium tracking-wide">
      {{ label }}
    </p>
  </div>
</template>
