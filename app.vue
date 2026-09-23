<script setup lang="ts">
const { locale, dir, initLocale } = useAppI18n()

onMounted(() => {
  initLocale()
})

useHead(() => ({
  htmlAttrs: {
    lang: locale.value,
    dir: dir.value,
  },
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
