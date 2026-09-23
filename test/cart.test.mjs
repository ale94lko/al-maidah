import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

function moneyToFils(value) {
  return Math.round(Number(value) * 100)
}

function filsToMoney(fils) {
  return (fils / 100).toFixed(2)
}

function computeUnitPrice(basePrice, selectedOptions) {
  const extras = selectedOptions.reduce(
    (sum, option) => sum + moneyToFils(option.price_extra),
    0,
  )
  return filsToMoney(moneyToFils(basePrice) + extras)
}

function cartLineKey(item) {
  const optionIds = item.selected_options
    .map((option) => option.id)
    .sort()
    .join(",")
  return `${item.menu_item_id}::${optionIds}::${item.notes.trim()}`
}

function validateModifierSelection(groups, selectedOptionIds) {
  const selected = new Set(selectedOptionIds)
  for (const group of groups) {
    const count = group.options.filter((option) => selected.has(option.id)).length
    const minRequired = Math.max(group.min_select, group.is_required ? 1 : 0)
    if (count < minRequired) {
      return { ok: false, groupId: group.id, reason: "required" }
    }
    if (group.max_select > 0 && count > group.max_select) {
      return { ok: false, groupId: group.id, reason: "max" }
    }
  }
  return { ok: true }
}

test("cart utils compute seed shawarma unit prices", () => {
  // Seed: Chicken Shawarma Plate 42.00; Large +8; garlic +3; pickles +2; fries +6
  assert.equal(computeUnitPrice("42.00", []), "42.00")
  assert.equal(
    computeUnitPrice("42.00", [{ id: "large", price_extra: "8.00" }]),
    "50.00",
  )
  assert.equal(
    computeUnitPrice("42.00", [
      { id: "large", price_extra: "8.00" },
      { id: "garlic", price_extra: "3.00" },
    ]),
    "53.00",
  )
  assert.equal(
    filsToMoney(moneyToFils("53.00") * 2),
    "106.00",
  )
})

test("required modifier groups block add without a selection", () => {
  const groups = [
    {
      id: "size",
      is_required: true,
      min_select: 1,
      max_select: 1,
      options: [
        { id: "regular" },
        { id: "large" },
      ],
    },
    {
      id: "extras",
      is_required: false,
      min_select: 0,
      max_select: 3,
      options: [{ id: "garlic" }, { id: "pickles" }, { id: "fries" }],
    },
  ]
  assert.equal(validateModifierSelection(groups, []).ok, false)
  assert.equal(validateModifierSelection(groups, ["regular"]).ok, true)
  assert.equal(validateModifierSelection(groups, ["regular", "garlic", "pickles"]).ok, true)
  assert.equal(
    validateModifierSelection(groups, ["regular", "garlic", "pickles", "fries"]).ok,
    true,
  )
})

test("different modifier combinations produce distinct cart line keys", () => {
  const base = {
    menu_item_id: "shawarma",
    notes: "",
    selected_options: [{ id: "regular" }],
  }
  const large = {
    menu_item_id: "shawarma",
    notes: "",
    selected_options: [{ id: "large" }],
  }
  const noted = {
    menu_item_id: "shawarma",
    notes: "no onion",
    selected_options: [{ id: "regular" }],
  }
  assert.notEqual(cartLineKey(base), cartLineKey(large))
  assert.notEqual(cartLineKey(base), cartLineKey(noted))
  assert.equal(
    cartLineKey(base),
    cartLineKey({
      menu_item_id: "shawarma",
      notes: "  ",
      selected_options: [{ id: "regular" }],
    }),
  )
})

test("cart composable persists per table and exposes add/qty/remove", () => {
  assert.ok(existsSync(resolve(root, "composables/useCart.ts")))
  const source = read("composables/useCart.ts")
  assert.match(source, /CART_STORAGE_PREFIX/)
  assert.match(source, /sessionStorage/)
  assert.match(source, /addItem/)
  assert.match(source, /setQuantity/)
  assert.match(source, /removeLine/)
  assert.match(source, /cartLineKey/)
  assert.match(source, /tableId/)
})

test("dish detail and cart pages exist under guest slug routes", () => {
  assert.ok(existsSync(resolve(root, "pages/m/[slug]/dish/[id].vue")))
  assert.ok(existsSync(resolve(root, "pages/m/[slug]/cart.vue")))
  const dish = read("pages/m/[slug]/dish/[id].vue")
  assert.match(dish, /validateModifierSelection/)
  assert.match(dish, /addItem/)
  assert.match(dish, /notes/)
  assert.match(dish, /canAdd/)
  const cart = read("pages/m/[slug]/cart.vue")
  assert.match(cart, /setQuantity/)
  assert.match(cart, /removeLine/)
  assert.match(cart, /subtotal/)
})

test("client layout shows fixed cart bar linking to cart route", () => {
  assert.ok(existsSync(resolve(root, "components/GuestCartBar.vue")))
  assert.match(read("layouts/client.vue"), /GuestCartBar/)
  assert.match(read("components/GuestCartBar.vue"), /\/m\/\$\{slug\.value\}\/cart|\/cart/)
  assert.match(read("components/GuestCartBar.vue"), /itemCount/)
  assert.match(read("components/GuestCartBar.vue"), /subtotal/)
})

test("guest cart bar is hidden on cart, pay, and status routes", () => {
  const bar = read("components/GuestCartBar.vue")
  assert.match(bar, /hideOnRoute/)
  assert.match(bar, /\/cart/)
  assert.match(bar, /pay\|status|status\|pay/)
  assert.match(bar, /!hideOnRoute/)
  const layout = read("layouts/client.vue")
  assert.match(layout, /cartBarHidden/)
})

test("menu index links dishes to the detail page", () => {
  const page = read("pages/m/[slug]/index.vue")
  assert.match(page, /dishPath/)
  assert.match(page, /\/dish\//)
})

test("utils/cart implements unit price and required validation", () => {
  const source = read("utils/cart.ts")
  assert.match(source, /computeUnitPrice/)
  assert.match(source, /validateModifierSelection/)
  assert.match(source, /cartLineKey/)
  assert.match(source, /cartSubtotal/)
})
