<script setup lang="ts">
definePageMeta({
  layout: "admin",
})

const { t } = useAppI18n()
</script>

<template>
  <div>
    <h1 class="text-3xl font-semibold tracking-tight text-stone-900">
      {{ t("admin.menuTitle") }}
    </h1>
    <p class="mt-2 text-sm text-stone-600">
      {{ t("admin.menuHint") }}
    </p>
    <AppEmptyState
      class="mt-8"
      :title="t('admin.menuEmpty')"
      :description="t('admin.menuEmptyHint')"
    />
  </div>
</template>
