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
  if (props.accent === "herb") return "var(--navy)"
  if (props.accent === "info") return "var(--info)"
  return "var(--warning)"
})

const buttonTextColor = computed(() => {
  if (props.accent === "citrus" || !props.accent) {
    return "var(--ink)"
  }
  return "#fff"
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
  <article class="kitchen-ticket overflow-hidden !p-0">
    <div
      class="h-1.5 w-full"
      :style="{ background: accentColor }"
      aria-hidden="true"
    />

    <div class="flex flex-col gap-3 p-4">
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

      <ul class="divide-y divide-[var(--navy)]/8 border-t border-[var(--navy)]/8">
        <li
          v-for="item in ticket.items"
          :key="item.id"
          class="flex items-start gap-3 py-2.5 text-sm text-[var(--navy)]"
        >
          <div
            class="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[var(--chili)]/12 via-[var(--herb)]/12 to-[var(--citrus)]/18"
          >
            <img
              v-if="item.photo_url"
              :src="item.photo_url"
              :alt="localizedName(item, locale)"
              class="h-full w-full object-cover"
              loading="lazy"
            >
            <div
              v-else
              class="font-display flex h-full w-full items-center justify-center text-[9px] font-extrabold text-[var(--herb)]/50"
              aria-hidden="true"
            >
              AM
            </div>
          </div>
          <div class="min-w-0 flex-1 pt-0.5">
            <p class="font-semibold leading-snug">
              <span class="tabular-nums text-[var(--navy)]">{{ item.quantity }} ×</span>
              {{ localizedName(item, locale) }}
            </p>
            <ul
              v-if="item.selected_options?.length"
              class="mt-0.5 space-y-0.5 text-xs text-[var(--muted)]"
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
              class="mt-0.5 text-xs italic text-[var(--warning)]"
            >
              {{ item.notes }}
            </p>
          </div>
        </li>
      </ul>

      <button
        v-if="action"
        type="button"
        class="mt-auto w-full rounded-2xl px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
        :style="{
          background: accentColor,
          color: buttonTextColor,
        }"
        :disabled="busy"
        @click="emit('action', action)"
      >
        {{ busy ? t("kitchen.updating") : actionLabel }}
      </button>
    </div>
  </article>
</template>
