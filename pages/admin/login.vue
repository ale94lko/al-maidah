<script setup lang="ts">
definePageMeta({
  layout: false,
})

const email = ref("")
const password = ref("")
const errorMessage = ref("")
const pending = ref(false)
const route = useRoute()
const { signIn } = useAuth()
const { t, dir } = useAppI18n()

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
  <!--
    Keep form | photo as physical LTR columns even when the document is RTL,
    so the form stays on the left and the image on the right.
  -->
  <div class="auth-shell grid min-h-dvh lg:grid-cols-2" dir="ltr">
    <div class="flex flex-col bg-[var(--paper)]" :dir="dir">
      <header class="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <p class="font-display text-xl font-extrabold text-[var(--ink)]">
          Al-Maidah
        </p>
        <LanguageSwitcher />
      </header>

      <div class="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div class="w-full max-w-md">
          <div class="mb-8">
            <h1 class="font-display text-3xl font-extrabold text-[var(--ink)]">
              {{ t("common.signIn") }}
            </h1>
            <p class="mt-2 text-sm text-[var(--muted)]">
              {{ t("admin.signInHint") }}
            </p>
          </div>

          <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
            <label class="block">
              <span class="field-label">{{ t("admin.email") }}</span>
              <input
                v-model="email"
                type="email"
                required
                autocomplete="email"
                class="field-input"
              >
            </label>
            <label class="block">
              <span class="field-label">{{ t("admin.password") }}</span>
              <input
                v-model="password"
                type="password"
                required
                minlength="8"
                autocomplete="current-password"
                class="field-input"
              >
            </label>
            <p v-if="errorMessage" class="text-sm font-semibold text-[var(--chili)]">
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
            <NuxtLink to="/admin/signup" class="font-extrabold text-[var(--herb-deep)] underline">
              {{ t("admin.createOwnerAccount") }}
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>

    <aside class="relative hidden overflow-hidden lg:block" aria-hidden="true">
      <img
        src="/images/auth-kitchen.jpg"
        alt=""
        class="absolute inset-0 h-full w-full object-cover"
      >
      <div class="absolute inset-0 bg-gradient-to-br from-[var(--ink)]/35 via-[var(--herb-deep)]/25 to-[var(--chili)]/20" />
    </aside>
  </div>
</template>
