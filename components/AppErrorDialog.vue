<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message: string
    dismissLabel?: string
  }>(),
  {
    title: "",
    dismissLabel: "OK",
  },
)

const emit = defineEmits<{
  dismiss: []
}>()

const { t } = useAppI18n()

const heading = computed(
  () => props.title || t("common.errorTitle"),
)

const actionLabel = computed(
  () => props.dismissLabel || t("common.ok"),
)

function onDismiss() {
  emit("dismiss")
}

function onBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    onDismiss()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--navy)]/45 px-4 backdrop-blur-sm"
      role="presentation"
      @click="onBackdrop"
    >
      <div
        class="surface-card w-full max-w-md space-y-4 shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="'app-error-title'"
        :aria-describedby="'app-error-message'"
        @click.stop
      >
        <div class="flex items-start gap-3">
          <span
            class="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)]"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5" stroke-linecap="round" />
              <path d="M12 16h.01" stroke-linecap="round" />
            </svg>
          </span>
          <div class="min-w-0 space-y-1">
            <h2
              id="app-error-title"
              class="font-display text-xl font-bold tracking-tight text-[var(--navy)]"
            >
              {{ heading }}
            </h2>
            <p
              id="app-error-message"
              class="text-sm leading-relaxed text-[var(--muted)]"
            >
              {{ message }}
            </p>
          </div>
        </div>
        <div class="flex justify-end">
          <button type="button" class="btn-primary !px-4 !py-2.5" @click="onDismiss">
            {{ actionLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
