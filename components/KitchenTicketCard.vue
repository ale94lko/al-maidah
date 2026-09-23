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
    class="flex flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900/80 p-3 shadow-sm"
  >
    <header class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-lg font-semibold tracking-tight text-zinc-50">
          {{ t("kitchen.tableLabel", { n: ticket.table_number ?? "—" }) }}
        </p>
        <p v-if="ticket.guest_name" class="truncate text-sm text-zinc-400">
          {{ ticket.guest_name }}
        </p>
      </div>
      <div class="shrink-0 text-end text-xs text-zinc-400">
        <p>{{ placedAt }}</p>
        <p class="font-medium text-amber-300/90">
          {{ t("kitchen.elapsed", { n: elapsedMinutes }) }}
        </p>
        <p class="mt-0.5 text-[11px] uppercase tracking-wide text-zinc-500">
          {{ paymentHint }}
        </p>
      </div>
    </header>

    <ul class="space-y-2 border-t border-zinc-800 pt-2">
      <li
        v-for="item in ticket.items"
        :key="item.id"
        class="text-sm text-zinc-200"
      >
        <p class="font-medium">
          <span class="tabular-nums text-emerald-400">{{ item.quantity }}×</span>
          {{ localizedName(item, locale) }}
        </p>
        <ul
          v-if="item.selected_options?.length"
          class="mt-0.5 space-y-0.5 ps-4 text-xs text-zinc-400"
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
          class="mt-0.5 ps-4 text-xs italic text-amber-200/80"
        >
          {{ item.notes }}
        </p>
      </li>
    </ul>

    <button
      v-if="action"
      type="button"
      class="mt-auto w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="busy"
      @click="emit('action', action)"
    >
      {{ busy ? t("kitchen.updating") : actionLabel }}
    </button>
  </article>
</template>
