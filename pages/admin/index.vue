<script setup lang="ts">
definePageMeta({
  layout: "default",
})

const { user, loading, refreshSession, signOut, accessToken } = useAuth()

type MeResponse = {
  user: { id: string; email?: string }
  restaurants: Array<{ id: string; name: string; slug: string }>
}

const me = ref<MeResponse | null>(null)
const errorMessage = ref("")

onMounted(async () => {
  await refreshSession()
  const token = await accessToken()
  if (!token) {
    await navigateTo("/admin/login")
    return
  }

  try {
    me.value = await $fetch<MeResponse>("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Could not load profile"
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
        <h1 class="text-3xl font-semibold text-stone-900">Admin</h1>
        <p class="mt-2 text-sm text-stone-600">
          Owner dashboard scaffold. Menu and stats screens land in later MVP issues.
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

    <p v-if="loading" class="mt-8 text-sm text-stone-600">
      Loading session…
    </p>
    <p v-else-if="errorMessage" class="mt-8 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <div v-else class="mt-8 space-y-4">
      <p class="text-sm text-stone-700">
        Signed in as
        <span class="font-medium">{{ user?.email || me?.user.email }}</span>
      </p>
      <ul class="space-y-2">
        <li
          v-for="restaurant in me?.restaurants ?? []"
          :key="restaurant.id"
          class="rounded-xl border border-teal-900/10 bg-white/80 p-4"
        >
          <p class="font-semibold text-stone-900">
            {{ restaurant.name }}
          </p>
          <p class="mt-1 font-mono text-xs text-teal-900/80">
            /m/{{ restaurant.slug }}
          </p>
        </li>
      </ul>
      <p v-if="!(me?.restaurants?.length)" class="text-sm text-stone-600">
        No restaurants linked to this account.
      </p>
    </div>
  </div>
</template>
