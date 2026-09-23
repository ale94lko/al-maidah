<script setup lang="ts">
definePageMeta({
  layout: "admin",
})

const email = ref("")
const password = ref("")
const errorMessage = ref("")
const pending = ref(false)
const route = useRoute()
const { signIn } = useAuth()
const { t } = useAppI18n()

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
      error instanceof Error ? error.message : t("common.signIn")
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-12">
    <h1 class="font-display text-3xl font-semibold text-[var(--espresso)]">
      {{ t("admin.signInTitle") }}
    </h1>
    <p class="mt-2 text-sm text-[var(--muted)]">
      {{ t("admin.signInHint") }}
    </p>

    <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
      <label class="block text-sm font-medium text-[var(--espresso)]">
        {{ t("admin.email") }}
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="mt-1 w-full rounded-xl border border-[var(--espresso)]/15 bg-[var(--ivory)] px-3 py-2 text-[var(--ink)]"
        >
      </label>
      <label class="block text-sm font-medium text-[var(--espresso)]">
        {{ t("admin.password") }}
        <input
          v-model="password"
          type="password"
          required
          minlength="8"
          autocomplete="current-password"
          class="mt-1 w-full rounded-xl border border-[var(--espresso)]/15 bg-[var(--ivory)] px-3 py-2 text-[var(--ink)]"
        >
      </label>
      <p v-if="errorMessage" class="text-sm text-rose-700">
        {{ errorMessage }}
      </p>
      <button
        type="submit"
        class="btn-primary w-full disabled:opacity-60"
        :disabled="pending"
      >
        {{ pending ? t("admin.signingIn") : t("common.signIn") }}
      </button>
    </form>

    <p class="mt-6 text-sm text-[var(--muted)]">
      {{ t("admin.newRestaurant") }}
      <NuxtLink to="/admin/signup" class="font-medium text-[var(--olive)] underline">
        {{ t("admin.createOwnerAccount") }}
      </NuxtLink>
    </p>
  </div>
</template>
