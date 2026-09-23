<script setup lang="ts">
import type { AppLocale } from "~/i18n/messages"

const { locale, setLocale, t } = useAppI18n()

const options: Array<{ value: AppLocale; labelKey: string }> = [
  { value: "en", labelKey: "common.english" },
  { value: "ar", labelKey: "common.arabic" },
]

function pick(value: AppLocale) {
  setLocale(value)
}
</script>

<template>
  <div
    class="lang-segment"
    role="group"
    :aria-label="t('common.language')"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="min-w-[2.75rem]"
      :class="{ 'is-active': locale === option.value }"
      :aria-pressed="locale === option.value"
      @click="pick(option.value)"
    >
      {{ option.value === "en" ? "EN" : "AR" }}
      <span class="sr-only">{{ t(option.labelKey) }}</span>
    </button>
  </div>
</template>
