<script setup lang="ts">
definePageMeta({
  layout: "admin",
})

const { user, loading, refreshSession, signOut, accessToken } = useAuth()
const { t } = useAppI18n()

type MeResponse = {
  user: { id: string; email?: string }
  restaurants: Array<{ id: string; name: string; slug: string }>
}

const me = ref<MeResponse | null>(null)
const errorMessage = ref("")
const pageLoading = ref(true)

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
  } finally {
    pageLoading.value = false
  }
})

async function onSignOut() {
  await signOut()
  await navigateTo("/admin/login")
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-stone-900">
          {{ t("admin.statsTitle") }}
        </h1>
        <p class="mt-2 text-sm text-stone-600">
          {{ t("admin.statsHint") }}
        </p>
      </div>
      <button
        type="button"
        class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm md:hidden"
        @click="onSignOut"
      >
        {{ t("common.signOut") }}
      </button>
    </div>

    <AppLoadingState
      v-if="loading || pageLoading"
      class="mt-8"
      :label="t('admin.loadingOwner')"
    />
    <p v-else-if="errorMessage" class="mt-8 text-sm text-red-700">
      {{ errorMessage }}
    </p>
    <div v-else class="mt-8 space-y-4">
      <p class="text-sm text-stone-700">
        {{ t("admin.signedInAs") }}
        <span class="font-medium">{{ user?.email || me?.user.email }}</span>
      </p>
      <ul v-if="me?.restaurants?.length" class="space-y-2">
        <li
          v-for="restaurant in me.restaurants"
          :key="restaurant.id"
          class="rounded-xl border border-teal-900/10 bg-white/80 p-4"
        >
          <p class="font-semibold text-stone-900">
            {{ restaurant.name }}
          </p>
          <NuxtLink
            :to="`/m/${restaurant.slug}`"
            class="mt-1 inline-block font-mono text-xs text-teal-900/80 underline"
          >
            /m/{{ restaurant.slug }}
          </NuxtLink>
        </li>
      </ul>
      <AppEmptyState
        v-else
        :title="t('admin.noRestaurants')"
        :description="t('admin.noRestaurantsHint')"
      />
    </div>
  </div>
</template>
