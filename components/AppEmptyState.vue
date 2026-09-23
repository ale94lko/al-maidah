<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: "Nothing here yet",
    description: "Check back soon.",
  },
)
</script>

<template>
  <div
    class="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--espresso)]/20 px-6 py-10 text-center text-[var(--espresso)]"
    role="status"
  >
    <p class="font-display text-base font-bold tracking-tight">
      {{ title }}
    </p>
    <p class="max-w-sm text-sm text-[var(--muted)]">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
