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
const { t } = useAppI18n()

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
      error instanceof Error ? error.message : t("admin.createAccount")
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-12">
    <h1 class="text-3xl font-semibold text-stone-900">
      {{ t("admin.signUpTitle") }}
    </h1>
    <p class="mt-2 text-sm text-stone-600">
      {{ t("admin.signUpHint") }}
    </p>

    <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
      <label class="block text-sm font-medium text-stone-800">
        {{ t("admin.restaurantName") }}
        <input
          v-model="restaurantName"
          type="text"
          required
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
      </label>
      <label class="block text-sm font-medium text-stone-800">
        {{ t("admin.slugOptional") }}
        <input
          v-model="slug"
          type="text"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          placeholder="my-cafe"
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
      </label>
      <label class="block text-sm font-medium text-stone-800">
        {{ t("admin.trnOptional") }}
        <input
          v-model="trn"
          type="text"
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
      </label>
      <label class="block text-sm font-medium text-stone-800">
        {{ t("admin.email") }}
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
      </label>
      <label class="block text-sm font-medium text-stone-800">
        {{ t("admin.password") }}
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
        {{ pending ? t("admin.creating") : t("admin.createAccount") }}
      </button>
    </form>

    <p class="mt-6 text-sm text-stone-600">
      {{ t("admin.alreadyRegistered") }}
      <NuxtLink to="/admin/login" class="font-medium text-teal-800 underline">
        {{ t("common.signIn") }}
      </NuxtLink>
    </p>
  </div>
</template>
