<script setup lang="ts">
import { localizedName } from "~/utils/localize"
import { cartLineKey, lineTotal } from "~/utils/cart"

definePageMeta({
  layout: "client",
})

const route = useRoute()
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

const menuPath = computed(() => {
  const table =
    tableFromQuery.value ??
    session.value?.tableNumber ??
    null
  return {
    path: `/m/${slug.value}`,
    query: table != null ? { table: String(table) } : undefined,
  }
})

onMounted(() => {
  loadFromStorage()
  const tableNumber = resolveTableNumber(slug.value, tableFromQuery.value)
  if (tableNumber == null && !session.value) {
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
        <h1 class="text-xl font-semibold tracking-tight text-stone-900">
          {{ t("guest.cartTitle") }}
        </h1>
        <NuxtLink :to="menuPath" class="text-sm font-medium text-teal-900">
          {{ t("guest.browseMenu") }}
        </NuxtLink>
      </div>

      <AppEmptyState
        v-if="isEmpty"
        :title="t('guest.emptyCart')"
        :description="t('guest.emptyCartHint')"
      />

      <ul v-else class="space-y-3">
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

      <div
        v-if="!isEmpty"
        class="flex items-center justify-between rounded-2xl border border-teal-900/10 bg-teal-950 px-4 py-3 text-white"
      >
        <span class="text-sm font-medium">{{ t("guest.subtotal") }}</span>
        <span class="font-mono text-sm font-semibold">
          {{ t("guest.priceAed", { price: subtotal }) }}
        </span>
      </div>
    </div>
  </div>
</template>
