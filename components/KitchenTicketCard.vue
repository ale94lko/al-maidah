<script setup lang="ts">
import type { KitchenTicket, KitchenTicketAction } from "~/types"
import { localizedName } from "~/utils/localize"

const props = defineProps<{
  ticket: KitchenTicket
  elapsedMinutes: number
  busy: boolean
  action: KitchenTicketAction | null
  actionLabel: string
}>()

const emit = defineEmits<{
  action: [action: KitchenTicketAction]
}>()

const { t, locale } = useAppI18n()

const placedAt = computed(() => {
  const date = new Date(props.ticket.created_at)
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return new Intl.DateTimeFormat(locale.value === "ar" ? "ar-AE" : "en-AE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
})

const paymentHint = computed(() => {
  if (props.ticket.payment_method === "cash_at_table") {
    return t("kitchen.payCash")
  }
  return t("kitchen.payOnline")
})
</script>

<template>
  <article
    class="flex flex-col gap-3 rounded-2xl border border-[var(--brass)]/20 bg-[color-mix(in_srgb,var(--espresso)_88%,#2a241c)] p-4"
  >
    <header class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="font-display text-xl font-semibold tracking-tight text-[var(--ivory)]">
          {{ t("kitchen.tableLabel", { n: ticket.table_number ?? "—" }) }}
        </p>
        <p v-if="ticket.guest_name" class="truncate text-sm text-[var(--brass-soft)]/80">
          {{ ticket.guest_name }}
        </p>
      </div>
      <div class="shrink-0 text-end text-xs text-[var(--brass-soft)]/70">
        <p>{{ placedAt }}</p>
        <p class="font-medium text-[var(--brass)]">
          {{ t("kitchen.elapsed", { n: elapsedMinutes }) }}
        </p>
        <p class="mt-0.5 text-[11px] uppercase tracking-wide text-[var(--brass-soft)]/50">
          {{ paymentHint }}
        </p>
      </div>
    </header>

    <ul class="space-y-2 border-t border-[var(--brass)]/15 pt-2">
      <li
        v-for="item in ticket.items"
        :key="item.id"
        class="text-sm text-[var(--ivory)]/95"
      >
        <p class="font-medium">
          <span class="tabular-nums text-[var(--brass)]">{{ item.quantity }}×</span>
          {{ localizedName(item, locale) }}
        </p>
        <ul
          v-if="item.selected_options?.length"
          class="mt-0.5 space-y-0.5 ps-4 text-xs text-[var(--brass-soft)]/70"
        >
          <li
            v-for="option in item.selected_options"
            :key="option.id"
          >
            + {{ localizedName(option, locale) }}
          </li>
        </ul>
        <p
          v-if="item.notes"
          class="mt-0.5 ps-4 text-xs italic text-[var(--brass)]/90"
        >
          {{ item.notes }}
        </p>
      </li>
    </ul>

    <button
      v-if="action"
      type="button"
      class="mt-auto w-full rounded-xl bg-[var(--olive)] px-3 py-2.5 text-sm font-semibold text-[var(--ivory)] hover:bg-[var(--olive-deep)] disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="busy"
      @click="emit('action', action)"
    >
      {{ busy ? t("kitchen.updating") : actionLabel }}
    </button>
  </article>
</template>
