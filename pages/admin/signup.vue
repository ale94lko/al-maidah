<script setup lang="ts">
definePageMeta({
  layout: "admin",
})

const email = ref("")
const password = ref("")
const restaurantName = ref("")
const slug = ref("")
const trn = ref("")
const errorMessage = ref("")
const pending = ref(false)
const { signUp } = useAuth()

async function onSubmit() {
  errorMessage.value = ""
  pending.value = true
  try {
    await signUp({
      email: email.value.trim(),
      password: password.value,
      restaurantName: restaurantName.value.trim(),
      slug: slug.value.trim() || undefined,
      trn: trn.value.trim() || undefined,
    })
    await navigateTo("/admin")
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Could not create account"
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-12">
    <h1 class="text-3xl font-semibold text-stone-900">Owner sign up</h1>
    <p class="mt-2 text-sm text-stone-600">
      Creates your account, restaurant, and ownership link in one step.
    </p>

    <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
      <label class="block text-sm font-medium text-stone-800">
        Restaurant name
        <input
          v-model="restaurantName"
          type="text"
          required
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
      </label>
      <label class="block text-sm font-medium text-stone-800">
        Slug (optional)
        <input
          v-model="slug"
          type="text"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder="my-cafe"
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
      </label>
      <label class="block text-sm font-medium text-stone-800">
        TRN (optional)
        <input
          v-model="trn"
          type="text"
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
      </label>
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
          autocomplete="new-password"
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
        {{ pending ? "Creating…" : "Create account" }}
      </button>
    </form>

    <p class="mt-6 text-sm text-stone-600">
      Already registered?
      <NuxtLink to="/admin/login" class="font-medium text-teal-800 underline">
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>
