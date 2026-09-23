<script setup lang="ts">
import type { PaymentMethod, PublicOrder, PublicOrderItem } from "~/types"
import { localizedName } from "~/utils/localize"
import {
  cartLineKey,
  cartSubtotalFils,
  computeCheckoutTotals,
  lineTotal,
} from "~/utils/cart"
import { parseTableToken } from "~/utils/table-token"

definePageMeta({
  layout: "client",
})

const route = useRoute()
const router = useRouter()
const { setShell } = useClientShell()
const {
  loadFromStorage,
  resolveTableToken,
  session,
} = useGuestSession()
const {
  items,
  subtotal,
  isEmpty,
  setQuantity,
  removeLine,
  syncFromStorage,
  clearCart,
} = useCart()
const { saveActiveOrder } = useActiveOrder()
const { t, locale } = useAppI18n()

const slug = computed(() => String(route.params.slug || ""))
const tableFromQuery = computed(() => parseTableToken(route.query.table))

const ready = ref(false)
const missingTable = ref(false)
const guestName = ref("")
const submitting = ref(false)
const submitError = ref("")
const paymentMethod = ref<"cash_at_table" | "card">("cash_at_table")

const tableNumber = computed(() => session.value?.tableNumber ?? null)

const previewTotals = computed(() =>
  computeCheckoutTotals(cartSubtotalFils(items.value)),
)

const menuPath = computed(() => {
  const table = session.value?.tableToken ?? tableFromQuery.value
  return {
    path: `/m/${slug.value}`,
    query: table ? { table } : undefined,
  }
})

async function placeOrder() {
  submitError.value = ""
  if (isEmpty.value) {
    return
  }
  const active = session.value
  if (!active?.tableId) {
    submitError.value = t("guest.scanQrAgainHint")
    return
  }

  submitting.value = true
  try {
    const method: PaymentMethod = paymentMethod.value
    const result = await $fetch<{
      order: PublicOrder
      items: PublicOrderItem[]
    }>("/api/orders", {
      method: "POST",
      body: {
        slug: slug.value,
        tableId: active.tableId,
        guestName: guestName.value.trim() || undefined,
        paymentMethod: method,
        // Deliberately send a fake unit_price — server must ignore it.
        items: items.value.map((item) => ({
          menuItemId: item.menu_item_id,
          quantity: item.quantity,
          notes: item.notes,
          selectedOptionIds: item.selected_options.map((option) => option.id),
          unit_price: "0.01",
          total: "999.99",
        })),
      },
    })

    clearCart()
    saveActiveOrder({
      slug: slug.value,
      orderId: result.order.id,
      accessToken: result.order.guest_access_token,
      tableNumber: result.order.table_number,
    })
    const nextQuery: Record<string, string> = {
      token: result.order.guest_access_token,
    }
    if (session.value?.tableToken) {
      nextQuery.table = session.value.tableToken
    }

    if (method === "cash_at_table") {
      await router.push({
        path: `/m/${slug.value}/status/${result.order.id}`,
        query: nextQuery,
      })
    } else {
      await router.push({
        path: `/m/${slug.value}/pay/${result.order.id}`,
        query: nextQuery,
      })
    }
  } catch (error: unknown) {
    const message =
      error && typeof error === "object" && "data" in error
        ? String(
            (error as { data?: { statusMessage?: string; message?: string } }).data
              ?.statusMessage ||
              (error as { data?: { message?: string } }).data?.message ||
              "",
          )
        : error instanceof Error
          ? error.message
          : ""
    submitError.value = message || t("guest.checkoutError")
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadFromStorage()
  const resolved = resolveTableToken(slug.value, tableFromQuery.value)
  if (resolved == null && !session.value?.tableToken) {
    missingTable.value = true
    setShell({ venueName: slug.value || "Menu", tableNumber: null })
    ready.value = true
    return
  }

  syncFromStorage()
  const active = session.value
  if (active) {
    setShell({
      venueName: active.restaurantName,
      tableNumber: active.tableNumber,
    })
  }
  ready.value = true
})
</script>

<template>
  <div>
    <AppEmptyState
      v-if="ready && missingTable"
      :title="t('guest.scanQrAgain')"
      :description="t('guest.scanQrAgainHint')"
    />
    <div v-else-if="ready" class="space-y-5">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <h1 class="font-display text-xl font-bold tracking-tight text-[var(--espresso)]">
            {{ t("guest.cartTitle") }}
          </h1>
          <p
            v-if="tableNumber != null"
            class="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--citrus-deep)]"
          >
            {{ t("guest.tableLabelCheckout", { n: tableNumber }) }}
          </p>
        </div>
        <NuxtLink :to="menuPath" class="text-sm font-medium text-[var(--herb)]">
          {{ t("guest.browseMenu") }}
        </NuxtLink>
      </div>

      <AppEmptyState
        v-if="isEmpty"
        :title="t('guest.emptyCart')"
        :description="t('guest.emptyCartHint')"
      />

      <template v-else>
        <ul class="space-y-3">
          <li
            v-for="item in items"
            :key="cartLineKey(item)"
            class="surface-card !p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-[var(--espresso)]">
                  {{ localizedName(item, locale) }}
                </p>
                <ul
                  v-if="item.selected_options.length"
                  class="mt-1 space-y-0.5 text-sm text-[var(--muted)]"
                >
                  <li
                    v-for="option in item.selected_options"
                    :key="option.id"
                  >
                    {{ localizedName(option, locale) }}
                    <span
                      v-if="Number(option.price_extra) > 0"
                      class="font-mono text-xs text-[var(--muted)]"
                    >
                      (+{{ t("guest.priceAed", { price: option.price_extra }) }})
                    </span>
                  </li>
                </ul>
                <p
                  v-if="item.notes"
                  class="mt-1 text-sm italic text-[var(--muted)]"
                >
                  {{ item.notes }}
                </p>
              </div>
              <p class="shrink-0 font-mono text-sm text-[var(--herb)]">
                {{ t("guest.priceAed", { price: lineTotal(item) }) }}
              </p>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="h-9 w-9 rounded-2xl border border-[var(--espresso)]/20 bg-[var(--ivory)] text-base font-semibold text-[var(--espresso)]"
                  :aria-label="t('guest.decreaseQty')"
                  @click="setQuantity(cartLineKey(item), item.quantity - 1)"
                >
                  −
                </button>
                <span class="min-w-8 text-center font-mono text-sm text-[var(--espresso)]">
                  {{ item.quantity }}
                </span>
                <button
                  type="button"
                  class="h-9 w-9 rounded-2xl border border-[var(--espresso)]/20 bg-[var(--ivory)] text-base font-semibold text-[var(--espresso)]"
                  :aria-label="t('guest.increaseQty')"
                  @click="setQuantity(cartLineKey(item), item.quantity + 1)"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                class="text-sm font-medium text-rose-800"
                @click="removeLine(cartLineKey(item))"
              >
                {{ t("guest.remove") }}
              </button>
            </div>
          </li>
        </ul>

        <label class="block space-y-2">
          <span class="text-sm font-semibold text-[var(--espresso)]">
            {{ t("guest.guestName") }}
          </span>
          <input
            v-model="guestName"
            type="text"
            :placeholder="t('guest.guestNamePlaceholder')"
            class="w-full rounded-2xl border border-[var(--espresso)]/15 bg-[var(--ivory)] px-3 py-2 text-sm text-[var(--ink)] outline-none ring-[var(--herb)]/30 placeholder:text-[var(--muted)] focus:ring-2"
            autocomplete="name"
          />
        </label>

        <fieldset class="space-y-2">
          <legend class="text-sm font-semibold text-[var(--espresso)]">
            {{ t("guest.paymentMethod") }}
          </legend>
          <label
            class="flex cursor-pointer gap-3 rounded-2xl border px-3 py-3"
            :class="
              paymentMethod === 'cash_at_table'
                ? 'border-[var(--herb)] bg-[var(--herb)] text-[var(--ivory)]'
                : 'border-[var(--espresso)]/15 bg-[var(--ivory)] text-[var(--espresso)]'
            "
          >
            <input
              v-model="paymentMethod"
              class="mt-1"
              type="radio"
              value="cash_at_table"
            />
            <span>
              <span class="block text-sm font-semibold">{{ t("guest.payCash") }}</span>
              <span class="mt-0.5 block text-xs opacity-80">{{ t("guest.payCashHint") }}</span>
            </span>
          </label>
          <label
            class="flex cursor-pointer gap-3 rounded-2xl border px-3 py-3"
            :class="
              paymentMethod === 'card'
                ? 'border-[var(--herb)] bg-[var(--herb)] text-[var(--ivory)]'
                : 'border-[var(--espresso)]/15 bg-[var(--ivory)] text-[var(--espresso)]'
            "
          >
            <input
              v-model="paymentMethod"
              class="mt-1"
              type="radio"
              value="card"
            />
            <span>
              <span class="block text-sm font-semibold">{{ t("guest.payOnline") }}</span>
              <span class="mt-0.5 block text-xs opacity-80">{{ t("guest.payOnlineHint") }}</span>
            </span>
          </label>
        </fieldset>

        <div class="surface-card space-y-2 !p-4 text-sm">
          <div class="flex items-center justify-between gap-3 text-[var(--ink)]">
            <span>{{ t("guest.subtotal") }}</span>
            <span class="font-mono">{{ t("guest.priceAed", { price: subtotal }) }}</span>
          </div>
          <div class="flex items-center justify-between gap-3 text-[var(--ink)]">
            <span>{{ t("guest.vat") }}</span>
            <span class="font-mono">
              {{ t("guest.priceAed", { price: previewTotals.vat }) }}
            </span>
          </div>
          <div
            class="flex items-center justify-between gap-3 border-t border-[var(--espresso)]/10 pt-2 font-semibold text-[var(--espresso)]"
          >
            <span>{{ t("guest.total") }}</span>
            <span class="font-mono">
              {{ t("guest.priceAed", { price: previewTotals.total }) }}
            </span>
          </div>
        </div>

        <p v-if="submitError" class="text-sm font-medium text-rose-800">
          {{ submitError }}
        </p>

        <button
          type="button"
          class="btn-primary w-full !rounded-2xl !py-3 disabled:cursor-not-allowed"
          :disabled="submitting || !session?.tableId"
          @click="placeOrder"
        >
          {{ submitting ? t("guest.placingOrder") : t("guest.placeOrder") }}
          ·
          {{ t("guest.priceAed", { price: previewTotals.total }) }}
        </button>
      </template>
    </div>
  </div>
</template>
