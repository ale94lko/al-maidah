<script setup lang="ts">
import type { KitchenTicket, KitchenTicketAction } from "~/types"

const props = defineProps<{
  title: string
  hint?: string
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
  if (props.accent === "herb") return "var(--navy)"
  if (props.accent === "info") return "var(--info)"
  return "var(--warning)"
})

const badgeTextColor = computed(() => {
  if (props.accent === "citrus" || !props.accent) {
    return "var(--ink)"
  }
  return "#fff"
})
</script>

<template>
  <section
    class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-3xl border bg-white/70 p-4 shadow-sm sm:p-5"
    :style="{
      borderColor: `color-mix(in srgb, ${accentColor} 28%, transparent)`,
      boxShadow: `0 14px 36px -28px color-mix(in srgb, ${accentColor} 55%, transparent)`,
    }"
  >
    <header class="space-y-1.5 pb-1">
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <!-- Pending / clock -->
          <span
            v-if="accent === 'citrus' || !accent"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            :style="{ background: `color-mix(in srgb, ${accentColor} 18%, white)`, color: accentColor }"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
          <!-- Preparing / chef hat -->
          <span
            v-else-if="accent === 'info'"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            :style="{ background: `color-mix(in srgb, ${accentColor} 18%, white)`, color: accentColor }"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M6 14c-1.5 0-3-1.2-3-3 0-1.5 1-2.7 2.3-3.1C5.6 5.8 7.5 4 10 4c1.3 0 2.5.5 3.3 1.3C14.1 4.5 15.3 4 16.5 4 19 4 21 6 21 8.5c0 .4 0 .8-.1 1.1 1.3.5 2.1 1.7 2.1 3.1 0 1.8-1.4 3.3-3.2 3.3H6z"
                stroke-linejoin="round"
              />
              <path d="M6 14v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4" stroke-linecap="round" />
            </svg>
          </span>
          <!-- Ready / cloche -->
          <span
            v-else
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            :style="{ background: `color-mix(in srgb, ${accentColor} 18%, white)`, color: accentColor }"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 17h16M6 17a6 6 0 0 1 12 0" stroke-linecap="round" />
              <path d="M12 7v1M12 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" stroke-linecap="round" />
              <path d="M5 20h14" stroke-linecap="round" />
            </svg>
          </span>
          <h2 class="text-sm font-bold uppercase tracking-[0.16em] text-[var(--ink)]">
            {{ title }}
          </h2>
        </div>
        <span
          class="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums"
          :style="{
            background: accentColor,
            color: badgeTextColor,
          }"
        >
          {{ tickets.length }}
        </span>
      </div>
      <p v-if="hint" class="text-xs leading-relaxed text-[var(--muted)]">
        {{ hint }}
      </p>
    </header>

    <div
      v-if="!tickets.length"
      class="rounded-2xl border border-dashed border-[var(--navy)]/15 bg-[var(--paper)]/50 px-3 py-10 text-center text-sm text-[var(--muted)]"
    >
      {{ emptyLabel }}
    </div>
    <div v-else class="flex min-h-0 flex-col gap-3 overflow-y-auto pb-1">
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
