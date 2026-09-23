<script setup lang="ts">
definePageMeta({
  layout: "kitchen",
})

const { user, refreshSession } = useAuth()
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
    <AppLoadingState v-if="!ready" label="Opening kitchen…" />
    <div v-else class="space-y-4">
      <p class="text-sm text-zinc-400">
        Signed in as
        <span class="font-medium text-zinc-200">{{ user?.email }}</span>
      </p>
      <AppEmptyState
        class="border-zinc-700 text-zinc-200"
        title="Waiting for tickets"
        description="Live pending / preparing / ready columns arrive in a later MVP issue."
      />
    </div>
  </div>
</template>
