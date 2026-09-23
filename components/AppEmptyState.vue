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
  <div class="empty-panel text-[var(--ink)]" role="status">
    <div class="accent-bar max-w-[5rem]" aria-hidden="true">
      <span /><span /><span />
    </div>
    <p class="font-display text-lg font-extrabold tracking-tight">
      {{ title }}
    </p>
    <p class="max-w-sm text-sm leading-relaxed text-[var(--muted)]">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-2">
      <slot />
    </div>
  </div>
</template>
