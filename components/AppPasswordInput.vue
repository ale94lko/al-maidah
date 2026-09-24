<script setup lang="ts">
const model = defineModel<string>({ default: "" })

withDefaults(
  defineProps<{
    id?: string
    name?: string
    autocomplete?: string
    required?: boolean
    minlength?: number | string
    placeholder?: string
    disabled?: boolean
    inputClass?: string
  }>(),
  {
    autocomplete: "current-password",
    required: false,
    disabled: false,
    inputClass: "",
  },
)

const visible = ref(false)
const { t } = useAppI18n()
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      v-model="model"
      :name="name"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      :required="required"
      :minlength="minlength"
      :placeholder="placeholder"
      :disabled="disabled"
      class="field-input pe-11"
      :class="inputClass"
    >
    <button
      type="button"
      class="absolute end-2.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
      :aria-label="visible ? t('common.hidePassword') : t('common.showPassword')"
      :title="visible ? t('common.hidePassword') : t('common.showPassword')"
      :disabled="disabled"
      tabindex="-1"
      @click="visible = !visible"
    >
      <svg
        v-if="!visible"
        viewBox="0 0 24 24"
        class="h-4 w-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        class="h-4 w-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22M14.12 14.12a3 3 0 1 1-4.24-4.24"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>
