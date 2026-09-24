<script setup lang="ts">
import type { KitchenTicket, KitchenTicketAction } from "~/types"

defineProps<{
  pending: KitchenTicket[]
  preparing: KitchenTicket[]
  ready: KitchenTicket[]
  busyId: string | null
  elapsedMinutes: (createdAt: string) => number
}>()

const emit = defineEmits<{
  action: [ticketId: string, action: KitchenTicketAction]
}>()

const { t } = useAppI18n()
</script>

<template>
  <div
    class="grid min-h-[70dvh] grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5"
  >
    <KitchenColumn
      :title="t('kitchen.columnPending')"
      :hint="t('kitchen.boardHint')"
      :tickets="pending"
      :empty-label="t('kitchen.columnEmpty')"
      action="start"
      :action-label="t('kitchen.actionStart')"
      :busy-id="busyId"
      :elapsed-minutes="elapsedMinutes"
      accent="citrus"
      @action="(id, action) => emit('action', id, action)"
    />
    <KitchenColumn
      :title="t('kitchen.columnPreparing')"
      :hint="t('kitchen.boardHint')"
      :tickets="preparing"
      :empty-label="t('kitchen.columnEmpty')"
      action="ready"
      :action-label="t('kitchen.actionReady')"
      :busy-id="busyId"
      :elapsed-minutes="elapsedMinutes"
      accent="info"
      @action="(id, action) => emit('action', id, action)"
    />
    <KitchenColumn
      :title="t('kitchen.columnReady')"
      :hint="t('kitchen.boardHint')"
      :tickets="ready"
      :empty-label="t('kitchen.columnEmpty')"
      action="deliver"
      :action-label="t('kitchen.actionDeliver')"
      :busy-id="busyId"
      :elapsed-minutes="elapsedMinutes"
      accent="herb"
      @action="(id, action) => emit('action', id, action)"
    />
  </div>
</template>
