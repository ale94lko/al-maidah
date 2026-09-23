<script setup lang="ts">
import type { AppLocale } from "~/i18n/messages"

const { locale, setLocale, t } = useAppI18n()

const options: Array<{ value: AppLocale; labelKey: string }> = [
  { value: "en", labelKey: "common.english" },
  { value: "ar", labelKey: "common.arabic" },
]

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === "en" || value === "ar") {
    setLocale(value)
  }
}
</script>

<template>
  <label class="inline-flex items-center gap-2 text-xs font-medium">
    <span class="sr-only">{{ t("common.language") }}</span>
    <select
      class="rounded-xl border border-[var(--espresso)]/15 bg-[var(--surface)] px-2 py-1.5 text-[var(--espresso)]"
      :value="locale"
      :aria-label="t('common.language')"
      @change="onChange"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ t(option.labelKey) }}
      </option>
    </select>
  </label>
</template>
