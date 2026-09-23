<script setup lang="ts">
import type { PaymentMethod, PublicReceipt } from "~/types"
import { localizedName } from "~/utils/localize"
import { filsToMoney, moneyToFils } from "~/utils/cart"

const props = defineProps<{
  receipt: PublicReceipt
  /** When true, show admin-only TRN missing prompt. */
  showTrnPrompt?: boolean
  settingsPath?: string
}>()

const { t, locale } = useAppI18n()

const tipFils = computed(() => moneyToFils(props.receipt.tip))
const showTip = computed(() => tipFils.value > 0)

const issuedAt = computed(() => {
  try {
    return new Intl.DateTimeFormat(locale.value === "ar" ? "ar-AE" : "en-AE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(props.receipt.created_at))
  } catch {
    return props.receipt.created_at
  }
})

function lineAmount(quantity: number, unitPrice: string) {
  return filsToMoney(moneyToFils(unitPrice) * quantity)
}

function paymentLabel(method: PaymentMethod | null): string {
  if (method === "cash_at_table") {
    return t("guest.payCash")
  }
  if (method === "google_pay") {
    return t("guest.payGooglePay")
  }
  if (method === "apple_pay") {
    return t("guest.payApplePay")
  }
  if (method === "card") {
    return t("guest.payCard")
  }
  return t("guest.paymentMethod")
}
</script>

<template>
  <article
    class="space-y-4 rounded-2xl border border-teal-900/10 bg-white/90 p-4 text-sm text-stone-800"
    :aria-label="t('guest.receiptTitle')"
  >
    <header class="space-y-1 border-b border-teal-900/10 pb-3">
      <p class="text-xs font-medium uppercase tracking-[0.14em] text-teal-800/70">
        {{ t("guest.receiptTitle") }}
      </p>
      <h2 class="text-lg font-semibold tracking-tight text-stone-900">
        {{ receipt.restaurant_name }}
      </h2>
      <p v-if="receipt.trn" class="font-mono text-xs text-stone-600">
        {{ t("guest.trnLabel", { trn: receipt.trn }) }}
      </p>
      <p v-else class="text-xs text-amber-800">
        {{ t("guest.trnNotOnFile") }}
      </p>
      <p class="text-xs text-stone-500">
        {{ issuedAt }}
      </p>
      <p v-if="receipt.table_number != null" class="text-sm font-medium text-teal-950">
        {{ t("guest.tableLabelCheckout", { n: receipt.table_number }) }}
      </p>
      <p v-if="receipt.guest_name" class="text-sm text-stone-600">
        {{ receipt.guest_name }}
      </p>
    </header>

    <div
      v-if="showTrnPrompt && !receipt.trn && settingsPath"
      class="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-amber-950"
    >
      <p class="font-medium">{{ t("admin.trnMissingTitle") }}</p>
      <p class="mt-1 text-xs leading-relaxed">{{ t("admin.trnMissingHint") }}</p>
      <NuxtLink
        :to="settingsPath"
        class="mt-2 inline-flex text-xs font-semibold underline"
      >
        {{ t("admin.addTrn") }}
      </NuxtLink>
    </div>

    <ul class="space-y-2">
      <li
        v-for="item in receipt.items"
        :key="item.id"
        class="flex items-start justify-between gap-3"
      >
        <div class="min-w-0">
          <p class="font-medium text-stone-900">
            {{ item.quantity }}× {{ localizedName(item, locale) }}
          </p>
          <ul
            v-if="item.selected_options?.length"
            class="mt-0.5 space-y-0.5 text-xs text-stone-600"
          >
            <li v-for="option in item.selected_options" :key="option.id">
              {{ localizedName(option, locale) }}
            </li>
          </ul>
        </div>
        <p class="shrink-0 font-mono text-teal-900">
          {{ t("guest.priceAed", { price: lineAmount(item.quantity, item.unit_price) }) }}
        </p>
      </li>
    </ul>

    <div class="space-y-1.5 border-t border-teal-900/10 pt-3">
      <div class="flex justify-between gap-3 text-stone-700">
        <span>{{ t("guest.subtotal") }}</span>
        <span class="font-mono">{{ t("guest.priceAed", { price: receipt.subtotal }) }}</span>
      </div>
      <div class="flex justify-between gap-3 text-stone-700">
        <span>{{ t("guest.vat") }}</span>
        <span class="font-mono">{{ t("guest.priceAed", { price: receipt.vat }) }}</span>
      </div>
      <div v-if="showTip" class="flex justify-between gap-3 text-stone-700">
        <span>{{ t("guest.tip") }}</span>
        <span class="font-mono">{{ t("guest.priceAed", { price: receipt.tip }) }}</span>
      </div>
      <div
        class="flex justify-between gap-3 border-t border-teal-900/10 pt-2 font-semibold text-teal-950"
      >
        <span>{{ t("guest.total") }}</span>
        <span class="font-mono">{{ t("guest.priceAed", { price: receipt.total }) }}</span>
      </div>
    </div>

    <footer class="space-y-1 border-t border-teal-900/10 pt-3 text-xs text-stone-600">
      <p>
        <span class="font-medium text-stone-800">{{ t("guest.paymentMethod") }}:</span>
        {{ paymentLabel(receipt.payment_method) }}
        <template v-if="receipt.payment_status === 'paid'">
          · {{ t("guest.orderPaid") }}
        </template>
      </p>
      <p v-if="receipt.gateway_reference" class="break-all font-mono">
        {{ t("guest.gatewayReference", { ref: receipt.gateway_reference }) }}
      </p>
    </footer>
  </article>
</template>
