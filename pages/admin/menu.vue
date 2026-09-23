<script setup lang="ts">
definePageMeta({
  layout: "admin",
})
</script>

<template>
  <div>
    <h1 class="text-3xl font-semibold tracking-tight text-stone-900">
      Menu
    </h1>
    <p class="mt-2 text-sm text-stone-600">
      Categories, dishes, and modifiers will be managed here.
    </p>
    <AppEmptyState
      class="mt-8"
      title="Menu editor coming soon"
      description="This admin layout is ready for the menu management screens."
    />
  </div>
</template>
