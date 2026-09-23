<script setup lang="ts">
definePageMeta({
  layout: "admin",
})

const { t } = useAppI18n()
</script>

<template>
  <div>
    <h1 class="text-3xl font-semibold tracking-tight text-stone-900">
      {{ t("admin.tablesTitle") }}
    </h1>
    <p class="mt-2 text-sm text-stone-600">
      {{ t("admin.tablesHint") }}
    </p>
    <AppEmptyState
      class="mt-8"
      :title="t('admin.tablesEmpty')"
      :description="t('admin.tablesEmptyHint')"
    />
  </div>
</template>
