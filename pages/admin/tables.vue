<script setup lang="ts">
definePageMeta({
  layout: "admin",
})
</script>

<template>
  <div>
    <h1 class="text-3xl font-semibold tracking-tight text-stone-900">
      Tables
    </h1>
    <p class="mt-2 text-sm text-stone-600">
      Table numbers and printable QR codes will live here.
    </p>
    <AppEmptyState
      class="mt-8"
      title="No tables configured in the UI yet"
      description="This admin layout is ready for table and QR management."
    />
  </div>
</template>
