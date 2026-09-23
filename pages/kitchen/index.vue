<script setup lang="ts">
definePageMeta({
  layout: "kitchen",
})

const { user, refreshSession } = useAuth()
const { t } = useAppI18n()
const ready = ref(false)

onMounted(async () => {
  const session = await refreshSession()
  if (!session) {
    await navigateTo({
      path: "/admin/login",
      query: { redirect: "/kitchen" },
    })
    return
  }
  ready.value = true
})
</script>

<template>
  <div>
    <AppLoadingState v-if="!ready" :label="t('kitchen.opening')" />
    <div v-else class="space-y-4">
      <p class="text-sm text-zinc-400">
        {{ t("kitchen.signedInAs") }}
        <span class="font-medium text-zinc-200">{{ user?.email }}</span>
      </p>
      <AppEmptyState
        class="border-zinc-700 text-zinc-200"
        :title="t('kitchen.waitingTickets')"
        :description="t('kitchen.waitingHint')"
      />
    </div>
  </div>
</template>
