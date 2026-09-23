<script setup lang="ts">
import type { KitchenTicket, KitchenTicketAction } from "~/types"
import { localizedName } from "~/utils/localize"

const props = defineProps<{
  ticket: KitchenTicket
  elapsedMinutes: number
  busy: boolean
  action: KitchenTicketAction | null
  actionLabel: string
  accent?: "citrus" | "chili" | "herb" | "info"
}>()

const emit = defineEmits<{
  action: [action: KitchenTicketAction]
}>()

const { t, locale } = useAppI18n()

const accentColor = computed(() => {
  if (props.accent === "chili") return "var(--danger)"
  if (props.accent === "herb") return "var(--success)"
  if (props.accent === "info") return "var(--info)"
  return "var(--warning)"
})

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
  <article class="kitchen-ticket">
    <div
      class="h-1 w-12 rounded-sm"
      :style="{ background: accentColor }"
      aria-hidden="true"
    />
    <header class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="font-display text-2xl font-bold tracking-tight text-[var(--navy)]">
          {{ t("kitchen.tableLabel", { n: ticket.table_number ?? "—" }) }}
        </p>
        <p v-if="ticket.guest_name" class="truncate text-sm text-[var(--muted)]">
          {{ ticket.guest_name }}
        </p>
      </div>
      <div class="shrink-0 text-end text-xs text-[var(--muted)]">
        <p>{{ placedAt }}</p>
        <p class="font-bold text-[var(--navy)]">
          {{ t("kitchen.elapsed", { n: elapsedMinutes }) }}
        </p>
        <p class="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {{ paymentHint }}
        </p>
      </div>
    </header>

    <ul class="space-y-2 border-t border-[var(--navy)]/8 pt-2">
      <li
        v-for="item in ticket.items"
        :key="item.id"
        class="text-sm text-[var(--navy)]"
      >
        <p class="font-semibold">
          <span class="tabular-nums text-[var(--navy)]">{{ item.quantity }}×</span>
          {{ localizedName(item, locale) }}
        </p>
        <ul
          v-if="item.selected_options?.length"
          class="mt-0.5 space-y-0.5 ps-4 text-xs text-[var(--muted)]"
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
          class="mt-0.5 ps-4 text-xs italic text-[var(--warning)]"
        >
          {{ item.notes }}
        </p>
      </li>
    </ul>

    <button
      v-if="action"
      type="button"
      class="mt-auto w-full rounded-2xl px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
      :style="{
        background: accentColor,
        color: accent === 'citrus' || !accent ? 'var(--ink)' : '#fff',
      }"
      :disabled="busy"
      @click="emit('action', action)"
    >
      {{ busy ? t("kitchen.updating") : actionLabel }}
    </button>
  </article>
</template>
