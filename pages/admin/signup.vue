<script setup lang="ts">
definePageMeta({
  layout: false,
})

const email = ref("")
const password = ref("")
const restaurantName = ref("")
const slug = ref("")
const trn = ref("")
const errorMessage = ref("")
const pending = ref(false)
const { signUp } = useAuth()
const { t, dir } = useAppI18n()

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
  <!--
    Keep form | photo as physical LTR columns even when the document is RTL,
    so the form stays on the left and the image on the right.
  -->
  <div class="auth-shell grid min-h-dvh lg:grid-cols-2" dir="ltr">
    <div class="flex flex-col bg-[var(--paper)]" :dir="dir">
      <header class="flex items-center justify-end gap-3 px-5 py-4 sm:px-8">
        <NuxtLink to="/admin/login" class="text-sm font-bold text-[var(--herb-deep)]">
          {{ t("common.signIn") }}
        </NuxtLink>
        <LanguageSwitcher />
      </header>

      <div class="flex flex-1 items-start justify-center overflow-auto px-5 py-8 sm:px-8">
        <div class="w-full max-w-md rounded-3xl border border-[var(--ink)]/12 bg-white p-6 pb-10 sm:p-8">
          <div class="mb-8 text-center">
            <img
              src="/logo.png"
              alt="Al-Maidah"
              class="mx-auto h-48 w-48 object-contain sm:h-56 sm:w-56"
              width="224"
              height="224"
            >
            <h1 class="font-display mt-5 text-3xl font-extrabold text-[var(--ink)]">
              {{ t("admin.signUpTitle") }}
            </h1>
            <p class="mt-2 text-sm text-[var(--muted)]">
              {{ t("admin.signUpHint") }}
            </p>
          </div>

          <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
            <label class="block">
              <span class="field-label">{{ t("admin.restaurantName") }}</span>
              <input v-model="restaurantName" type="text" required class="field-input">
            </label>
            <label class="block">
              <span class="field-label">{{ t("admin.slugOptional") }}</span>
              <input
                v-model="slug"
                type="text"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                :placeholder="t('admin.slugPlaceholder')"
                class="field-input"
              >
            </label>
            <label class="block">
              <span class="field-label">{{ t("admin.trnOptional") }}</span>
              <input v-model="trn" type="text" class="field-input">
            </label>
            <label class="block">
              <span class="field-label">{{ t("admin.email") }}</span>
              <input v-model="email" type="email" required autocomplete="email" class="field-input">
            </label>
            <label class="block">
              <span class="field-label">{{ t("admin.password") }}</span>
              <input
                v-model="password"
                type="password"
                required
                minlength="8"
                autocomplete="new-password"
                class="field-input"
              >
            </label>
            <p v-if="errorMessage" class="text-sm font-semibold text-[var(--chili)]">
              {{ errorMessage }}
            </p>
            <button type="submit" class="btn-primary w-full disabled:opacity-60" :disabled="pending">
              {{ pending ? t("admin.creating") : t("admin.createAccount") }}
            </button>
          </form>

          <p class="mt-6 text-sm text-[var(--muted)]">
            {{ t("admin.alreadyRegistered") }}
            <NuxtLink to="/admin/login" class="font-extrabold text-[var(--herb-deep)] underline">
              {{ t("common.signIn") }}
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>

    <aside class="relative hidden overflow-hidden lg:block" aria-hidden="true">
      <img
        src="/images/auth-dining.jpg"
        alt=""
        class="absolute inset-0 h-full w-full object-cover"
      >
      <div class="absolute inset-0 bg-gradient-to-br from-[var(--ink)]/35 via-[var(--herb-deep)]/25 to-[var(--chili)]/20" />
    </aside>
  </div>
</template>
