<script setup lang="ts">
import type { KitchenTicket, KitchenTicketAction } from "~/types"

defineProps<{
  title: string
  tickets: KitchenTicket[]
  emptyLabel: string
  action: KitchenTicketAction | null
  actionLabel: string
  busyId: string | null
  elapsedMinutes: (createdAt: string) => number
}>()

const emit = defineEmits<{
  action: [ticketId: string, action: KitchenTicketAction]
}>()
</script>

<template>
  <section class="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
    <header
      class="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2"
    >
      <h2 class="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-300">
        {{ title }}
      </h2>
      <span
        class="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-300"
      >
        {{ tickets.length }}
      </span>
    </header>

    <div
      v-if="!tickets.length"
      class="rounded-xl border border-dashed border-zinc-700 px-3 py-8 text-center text-sm text-zinc-500"
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
        @action="emit('action', ticket.id, $event)"
      />
    </div>
  </section>
</template>
