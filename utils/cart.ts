import type {
  CartItem,
  ModifierGroupWithOptions,
  SelectedModifierOption,
} from "~/types"

/** Convert AED string/number to integer fils (1 AED = 100 fils). */
export function moneyToFils(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) {
    return 0
  }
  return Math.round(n * 100)
}

export function filsToMoney(fils: number): string {
  return (fils / 100).toFixed(2)
}

export function sumExtrasFils(options: SelectedModifierOption[]): number {
  return options.reduce((sum, option) => sum + moneyToFils(option.price_extra), 0)
}

/** unit_price = base dish price + sum of selected option extras. */
export function computeUnitPrice(
  basePrice: string | number,
  selectedOptions: SelectedModifierOption[],
): string {
  return filsToMoney(moneyToFils(basePrice) + sumExtrasFils(selectedOptions))
}

export function lineTotalFils(item: CartItem): number {
  return moneyToFils(item.unit_price) * item.quantity
}

export function lineTotal(item: CartItem): string {
  return filsToMoney(lineTotalFils(item))
}

export function cartSubtotalFils(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + lineTotalFils(item), 0)
}

export function cartSubtotal(items: CartItem[]): string {
  return filsToMoney(cartSubtotalFils(items))
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

/**
 * Stable identity for a cart line: same dish + same options + same notes merge;
 * different modifier combo or notes → separate lines.
 */
export function cartLineKey(
  item: Pick<CartItem, "menu_item_id" | "notes" | "selected_options">,
): string {
  const optionIds = item.selected_options
    .map((option) => option.id)
    .sort()
    .join(",")
  return `${item.menu_item_id}::${optionIds}::${item.notes.trim()}`
}

export function validateModifierSelection(
  groups: ModifierGroupWithOptions[],
  selectedOptionIds: Iterable<string>,
): { ok: true } | { ok: false; groupId: string; reason: "required" | "max" } {
  const selected = new Set(selectedOptionIds)

  for (const group of groups) {
    const count = group.options.filter((option) => selected.has(option.id)).length
    const minRequired = Math.max(
      group.min_select,
      group.is_required ? 1 : 0,
    )
    if (count < minRequired) {
      return { ok: false, groupId: group.id, reason: "required" }
    }
    if (group.max_select > 0 && count > group.max_select) {
      return { ok: false, groupId: group.id, reason: "max" }
    }
  }

  return { ok: true }
}

export function toSelectedOptions(
  groups: ModifierGroupWithOptions[],
  selectedOptionIds: Iterable<string>,
): SelectedModifierOption[] {
  const selected = new Set(selectedOptionIds)
  const result: SelectedModifierOption[] = []

  for (const group of groups) {
    for (const option of group.options) {
      if (!selected.has(option.id)) {
        continue
      }
      result.push({
        id: option.id,
        name_en: option.name_en,
        name_ar: option.name_ar,
        price_extra: option.price_extra,
      })
    }
  }

  return result
}
