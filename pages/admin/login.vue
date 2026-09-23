<script setup lang="ts">
definePageMeta({
  layout: "default",
})

const email = ref("")
const password = ref("")
const errorMessage = ref("")
const pending = ref(false)
const route = useRoute()
const { signIn } = useAuth()

async function onSubmit() {
  errorMessage.value = ""
  pending.value = true
  try {
    await signIn(email.value.trim(), password.value)
    const redirect =
      typeof route.query.redirect === "string"
        ? route.query.redirect
        : "/admin"
    await navigateTo(redirect)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Could not sign in"
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-12">
    <h1 class="text-3xl font-semibold text-stone-900">Owner sign in</h1>
    <p class="mt-2 text-sm text-stone-600">
      Access the kitchen board and admin panel for your restaurant.
    </p>

    <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
      <label class="block text-sm font-medium text-stone-800">
        Email
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
      </label>
      <label class="block text-sm font-medium text-stone-800">
        Password
        <input
          v-model="password"
          type="password"
          required
          minlength="8"
          autocomplete="current-password"
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
      </label>
      <p v-if="errorMessage" class="text-sm text-red-700">
        {{ errorMessage }}
      </p>
      <button
        type="submit"
        class="w-full rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        :disabled="pending"
      >
        {{ pending ? "Signing in…" : "Sign in" }}
      </button>
    </form>

    <p class="mt-6 text-sm text-stone-600">
      New restaurant?
      <NuxtLink to="/admin/signup" class="font-medium text-teal-800 underline">
        Create an owner account
      </NuxtLink>
    </p>
  </div>
</template>
