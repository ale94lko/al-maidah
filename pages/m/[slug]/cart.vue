<script setup lang="ts">
import type { PublicOrder, PublicOrderItem } from "~/types"
import { localizedName } from "~/utils/localize"
import {
  cartLineKey,
  cartSubtotalFils,
  computeCheckoutTotals,
  lineTotal,
} from "~/utils/cart"

definePageMeta({
  layout: "client",
})

const route = useRoute()
const router = useRouter()
const { setShell } = useClientShell()
const {
  loadFromStorage,
  resolveTableNumber,
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
const { t, locale } = useAppI18n()

const slug = computed(() => String(route.params.slug || ""))
const tableFromQuery = computed(() => {
  const raw = route.query.table
  const value = typeof raw === "string" || typeof raw === "number" ? Number(raw) : NaN
  return Number.isInteger(value) && value > 0 ? value : null
})

const ready = ref(false)
const missingTable = ref(false)
const guestName = ref("")
const submitting = ref(false)
const submitError = ref("")

const tableNumber = computed(
  () =>
    session.value?.tableNumber ??
    tableFromQuery.value ??
    null,
)

const previewTotals = computed(() =>
  computeCheckoutTotals(cartSubtotalFils(items.value)),
)

const menuPath = computed(() => {
  const table = tableNumber.value
  return {
    path: `/m/${slug.value}`,
    query: table != null ? { table: String(table) } : undefined,
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
    const result = await $fetch<{
      order: PublicOrder
      items: PublicOrderItem[]
    }>("/api/orders", {
      method: "POST",
      body: {
        slug: slug.value,
        tableId: active.tableId,
        guestName: guestName.value.trim() || undefined,
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
    await router.push({
      path: `/m/${slug.value}/status/${result.order.id}`,
      query: tableNumber.value != null ? { table: String(tableNumber.value) } : undefined,
    })
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
  const resolved = resolveTableNumber(slug.value, tableFromQuery.value)
  if (resolved == null && !session.value) {
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
          <h1 class="text-xl font-semibold tracking-tight text-stone-900">
            {{ t("guest.cartTitle") }}
          </h1>
          <p
            v-if="tableNumber != null"
            class="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-teal-800/70"
          >
            {{ t("guest.tableLabelCheckout", { n: tableNumber }) }}
          </p>
        </div>
        <NuxtLink :to="menuPath" class="text-sm font-medium text-teal-900">
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
            class="rounded-2xl border border-teal-900/10 bg-white/80 p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-stone-900">
                  {{ localizedName(item, locale) }}
                </p>
                <ul
                  v-if="item.selected_options.length"
                  class="mt-1 space-y-0.5 text-sm text-stone-600"
                >
                  <li
                    v-for="option in item.selected_options"
                    :key="option.id"
                  >
                    {{ localizedName(option, locale) }}
                    <span
                      v-if="Number(option.price_extra) > 0"
                      class="font-mono text-xs text-stone-500"
                    >
                      (+{{ t("guest.priceAed", { price: option.price_extra }) }})
                    </span>
                  </li>
                </ul>
                <p
                  v-if="item.notes"
                  class="mt-1 text-sm italic text-stone-500"
                >
                  {{ item.notes }}
                </p>
              </div>
              <p class="shrink-0 font-mono text-sm text-teal-900">
                {{ t("guest.priceAed", { price: lineTotal(item) }) }}
              </p>
            </div>

            <div class="mt-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="h-9 w-9 rounded-lg border border-teal-900/20 bg-white text-base font-semibold"
                  :aria-label="t('guest.decreaseQty')"
                  @click="setQuantity(cartLineKey(item), item.quantity - 1)"
                >
                  −
                </button>
                <span class="min-w-8 text-center font-mono text-sm">
                  {{ item.quantity }}
                </span>
                <button
                  type="button"
                  class="h-9 w-9 rounded-lg border border-teal-900/20 bg-white text-base font-semibold"
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
          <span class="text-sm font-semibold text-stone-900">
            {{ t("guest.guestName") }}
          </span>
          <input
            v-model="guestName"
            type="text"
            :placeholder="t('guest.guestNamePlaceholder')"
            class="w-full rounded-xl border border-teal-900/15 bg-white px-3 py-2 text-sm text-stone-900 outline-none ring-teal-800/30 placeholder:text-stone-400 focus:ring-2"
            autocomplete="name"
          />
        </label>

        <div class="space-y-2 rounded-2xl border border-teal-900/10 bg-white/80 p-4 text-sm">
          <div class="flex items-center justify-between gap-3 text-stone-700">
            <span>{{ t("guest.subtotal") }}</span>
            <span class="font-mono">{{ t("guest.priceAed", { price: subtotal }) }}</span>
          </div>
          <div class="flex items-center justify-between gap-3 text-stone-700">
            <span>{{ t("guest.vat") }}</span>
            <span class="font-mono">
              {{ t("guest.priceAed", { price: previewTotals.vat }) }}
            </span>
          </div>
          <div
            class="flex items-center justify-between gap-3 border-t border-teal-900/10 pt-2 font-semibold text-teal-950"
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
          class="w-full rounded-2xl bg-teal-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
