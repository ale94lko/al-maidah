<script setup lang="ts">
import type { KitchenTicket, KitchenTicketAction } from "~/types"

const props = defineProps<{
  title: string
  tickets: KitchenTicket[]
  emptyLabel: string
  action: KitchenTicketAction | null
  actionLabel: string
  busyId: string | null
  elapsedMinutes: (createdAt: string) => number
  accent?: "citrus" | "chili" | "herb" | "info"
}>()

const emit = defineEmits<{
  action: [ticketId: string, action: KitchenTicketAction]
}>()

const accentColor = computed(() => {
  if (props.accent === "chili") return "var(--danger)"
  if (props.accent === "herb") return "var(--success)"
  if (props.accent === "info") return "var(--info)"
  return "var(--warning)"
})
</script>

<template>
  <section class="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
    <header
      class="flex items-center justify-between gap-2 border-b pb-2"
      :style="{ borderColor: `color-mix(in srgb, ${accentColor} 35%, transparent)` }"
    >
      <h2
        class="text-sm font-bold uppercase tracking-[0.16em]"
        :style="{ color: accentColor }"
      >
        {{ title }}
      </h2>
      <span
        class="rounded-xl px-2.5 py-0.5 text-xs font-bold tabular-nums"
        :style="{
          background: accentColor,
          color: accent === 'citrus' || !accent ? 'var(--ink)' : '#fff',
        }"
      >
        {{ tickets.length }}
      </span>
    </header>

    <div
      v-if="!tickets.length"
      class="rounded-3xl border border-dashed border-[var(--navy)]/15 bg-white/60 px-3 py-10 text-center text-sm text-[var(--muted)]"
    >
      {{ emptyLabel }}
    </div>
    <div v-else class="flex flex-col gap-3 overflow-y-auto pb-2">
      <KitchenTicketCard
        v-for="ticket in tickets"
        :key="ticket.id"
        :ticket="ticket"
        :elapsed-minutes="elapsedMinutes(ticket.created_at)"
        :busy="busyId === ticket.id"
        :action="action"
        :action-label="actionLabel"
        :accent="accent"
        @action="emit('action', ticket.id, $event)"
      />
    </div>
  </section>
</template>
