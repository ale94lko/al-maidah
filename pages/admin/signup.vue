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
  <div class="auth-shell grid min-h-dvh lg:grid-cols-2">
    <aside class="relative hidden overflow-hidden lg:block">
      <img
        src="/images/auth-dining.jpg"
        alt=""
        class="absolute inset-0 h-full w-full object-cover"
      >
      <div class="absolute inset-0 bg-gradient-to-br from-[var(--ink)]/90 via-[var(--chili-deep)]/70 to-[var(--herb-deep)]/65" />
      <div class="relative flex h-full flex-col justify-between p-10 text-white">
        <div>
          <p class="font-display text-3xl font-extrabold">Al-Maidah</p>
          <div class="accent-bar mt-4 max-w-[7rem]" aria-hidden="true">
            <span /><span /><span />
          </div>
        </div>
        <div>
          <p class="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[var(--citrus)]">
            {{ t("admin.owner") }}
          </p>
          <p class="font-display mt-3 max-w-sm text-4xl font-extrabold leading-tight">
            {{ t("admin.signUpTitle") }}
          </p>
          <p class="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
            {{ t("admin.signUpHint") }}
          </p>
        </div>
      </div>
    </aside>

    <div class="flex flex-col bg-[var(--paper)]">
      <header class="flex items-center justify-between px-5 py-4 sm:px-8">
        <NuxtLink to="/" class="font-display text-xl font-extrabold text-[var(--ink)]">
          Al-Maidah
        </NuxtLink>
        <NuxtLink to="/admin/login" class="text-sm font-bold text-[var(--herb-deep)]">
          {{ t("common.signIn") }}
        </NuxtLink>
      </header>

      <div class="flex flex-1 items-start justify-center overflow-auto px-5 py-8 sm:px-8">
        <div class="w-full max-w-md pb-10">
          <h1 class="font-display text-3xl font-extrabold text-[var(--ink)] lg:mt-4">
            {{ t("admin.signUpTitle") }}
          </h1>
          <p class="mt-2 text-sm text-[var(--muted)]">
            {{ t("admin.signUpHint") }}
          </p>

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
                placeholder="my-cafe"
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
  </div>
</template>
