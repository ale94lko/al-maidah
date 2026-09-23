<script setup lang="ts">
definePageMeta({
  layout: "default",
})

const { user, refreshSession, signOut } = useAuth()

onMounted(async () => {
  const session = await refreshSession()
  if (!session) {
    await navigateTo({
      path: "/admin/login",
      query: { redirect: "/kitchen" },
    })
  }
})

async function onSignOut() {
  await signOut()
  await navigateTo("/admin/login")
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-12">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-stone-900">Kitchen</h1>
        <p class="mt-2 text-sm text-stone-600">
          Ticket board scaffold. Live order columns arrive in a later MVP issue.
        </p>
      </div>
      <button
        type="button"
        class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
        @click="onSignOut"
      >
        Sign out
      </button>
    </div>
    <p class="mt-8 text-sm text-stone-700">
      Signed in as
      <span class="font-medium">{{ user?.email || "…" }}</span>
    </p>
  </div>
</template>
