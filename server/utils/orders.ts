import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  KitchenTicket,
  KitchenTicketAction,
  ModifierGroupWithOptions,
  ModifierOption,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PublicOrder,
  PublicOrderItem,
  SelectedModifierOption,
} from "~/types"
import {
  computeCheckoutTotals,
  computeUnitPrice,
  filsToMoney,
  moneyToFils,
  toSelectedOptions,
  validateModifierSelection,
} from "~/utils/cart"
import { getRestaurantBySlug } from "./restaurant"

export type CreateOrderLineInput = {
  menuItemId: string
  quantity: number
  notes?: string
  selectedOptionIds: string[]
}

export type CreateOrderInput = {
  slug: string
  tableId: string
  guestName?: string | null
  /** How the guest intends to pay. Always stored with payment_status=pending. */
  paymentMethod: PaymentMethod
  items: CreateOrderLineInput[]
}

type MenuItemRow = {
  id: string
  restaurant_id: string
  name_en: string
  name_ar: string
  price: string
  cost_price: string
  is_available: boolean
}

type PreparedLine = {
  menu_item_id: string
  name_en: string
  name_ar: string
  quantity: number
  unit_price: string
  unit_cost: string
  notes: string
  selected_options: SelectedModifierOption[]
  line_subtotal_fils: number
  line_cost_fils: number
}

/**
 * Create a pending guest order. Prices and VAT are always computed on the server
 * from current menu rows — client totals are never trusted.
 */
export async function createGuestOrder(
  client: SupabaseClient,
  input: CreateOrderInput,
): Promise<{ order: PublicOrder; items: PublicOrderItem[] }> {
  const slug = input.slug?.trim()
  const tableId = input.tableId?.trim()
  const guestName = input.guestName?.trim() || null
  const paymentMethod = input.paymentMethod
  const lines = Array.isArray(input.items) ? input.items : []

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: "Restaurant slug is required" })
  }
  if (!tableId) {
    throw createError({
      statusCode: 400,
      statusMessage: "A valid table is required to place an order",
    })
  }
  if (
    paymentMethod !== "cash_at_table" &&
    paymentMethod !== "card" &&
    paymentMethod !== "google_pay" &&
    paymentMethod !== "apple_pay"
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "paymentMethod must be cash_at_table, card, google_pay, or apple_pay",
    })
  }
  if (lines.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Cart is empty" })
  }

  for (const line of lines) {
    if (!line.menuItemId || !Number.isInteger(line.quantity) || line.quantity < 1) {
      throw createError({
        statusCode: 400,
        statusMessage: "Each cart line needs a menu item and quantity >= 1",
      })
    }
  }

  const restaurant = await getRestaurantBySlug(client, slug)
  if (!restaurant) {
    throw createError({ statusCode: 404, statusMessage: "Restaurant not found" })
  }

  const { data: table, error: tableError } = await client
    .from("tables")
    .select("id, restaurant_id, table_number, is_active")
    .eq("id", tableId)
    .maybeSingle()

  if (tableError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load table: ${tableError.message}`,
    })
  }
  if (!table || table.restaurant_id !== restaurant.id || table.is_active === false) {
    throw createError({
      statusCode: 400,
      statusMessage: "Table not found for this restaurant. Scan the QR code again.",
    })
  }

  const menuItemIds = [...new Set(lines.map((line) => line.menuItemId))]
  const optionIds = [
    ...new Set(lines.flatMap((line) => line.selectedOptionIds ?? [])),
  ]

  const { data: menuRows, error: menuError } = await client
    .from("menu_items")
    .select(
      "id, restaurant_id, name_en, name_ar, price, cost_price, is_available",
    )
    .in("id", menuItemIds)

  if (menuError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load menu items: ${menuError.message}`,
    })
  }

  const menuById = new Map<string, MenuItemRow>(
    ((menuRows ?? []) as MenuItemRow[]).map((row) => [row.id, row]),
  )

  const { data: groupRows, error: groupError } = await client
    .from("modifier_groups")
    .select(
      "id, restaurant_id, menu_item_id, name_en, name_ar, is_required, min_select, max_select, sort_order, created_at",
    )
    .eq("restaurant_id", restaurant.id)
    .in("menu_item_id", menuItemIds)
    .order("sort_order", { ascending: true })

  if (groupError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load modifiers: ${groupError.message}`,
    })
  }

  const groupIds = (groupRows ?? []).map((group) => group.id as string)
  let optionRows: ModifierOption[] = []
  if (groupIds.length > 0) {
    const { data, error } = await client
      .from("modifier_options")
      .select(
        "id, restaurant_id, modifier_group_id, name_en, name_ar, price_extra, sort_order, is_available, created_at",
      )
      .eq("restaurant_id", restaurant.id)
      .in("modifier_group_id", groupIds)
      .order("sort_order", { ascending: true })

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to load modifier options: ${error.message}`,
      })
    }
    optionRows = (data ?? []) as ModifierOption[]
  }

  const optionsByGroup = new Map<string, ModifierOption[]>()
  const optionById = new Map<string, ModifierOption>()
  for (const option of optionRows) {
    optionById.set(option.id, option)
    const list = optionsByGroup.get(option.modifier_group_id) ?? []
    list.push(option)
    optionsByGroup.set(option.modifier_group_id, list)
  }

  const groupsByDish = new Map<string, ModifierGroupWithOptions[]>()
  for (const group of groupRows ?? []) {
    const withOptions: ModifierGroupWithOptions = {
      ...(group as ModifierGroupWithOptions),
      options: optionsByGroup.get(group.id as string) ?? [],
    }
    const list = groupsByDish.get(withOptions.menu_item_id) ?? []
    list.push(withOptions)
    groupsByDish.set(withOptions.menu_item_id, list)
  }

  for (const optionId of optionIds) {
    if (!optionById.has(optionId)) {
      throw createError({
        statusCode: 400,
        statusMessage: "One or more modifier options are invalid",
      })
    }
  }

  const prepared: PreparedLine[] = []

  for (const line of lines) {
    const dish = menuById.get(line.menuItemId)
    if (!dish) {
      throw createError({
        statusCode: 400,
        statusMessage: "One or more dishes are not on this menu",
      })
    }
    if (dish.restaurant_id !== restaurant.id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Dish does not belong to this restaurant",
      })
    }
    if (!dish.is_available) {
      throw createError({
        statusCode: 409,
        statusMessage: `Sold out: ${dish.name_en}`,
      })
    }

    const groups = groupsByDish.get(dish.id) ?? []
    const selectedIds = line.selectedOptionIds ?? []

    for (const optionId of selectedIds) {
      const option = optionById.get(optionId)
      if (!option || !option.is_available) {
        throw createError({
          statusCode: 409,
          statusMessage: "A selected modifier is unavailable",
        })
      }
      const belongs = groups.some((group) =>
        group.options.some((entry) => entry.id === optionId),
      )
      if (!belongs) {
        throw createError({
          statusCode: 400,
          statusMessage: "Modifier option does not belong to this dish",
        })
      }
    }

    const validation = validateModifierSelection(groups, selectedIds)
    if (!validation.ok) {
      throw createError({
        statusCode: 400,
        statusMessage: "Required modifier options are missing",
      })
    }

    const selected_options = toSelectedOptions(groups, selectedIds)
    const unit_price = computeUnitPrice(dish.price, selected_options)
    const unit_cost = filsToMoney(moneyToFils(dish.cost_price))
    const quantity = line.quantity
    const notes = (line.notes ?? "").trim()

    prepared.push({
      menu_item_id: dish.id,
      name_en: dish.name_en,
      name_ar: dish.name_ar,
      quantity,
      unit_price,
      unit_cost,
      notes,
      selected_options,
      line_subtotal_fils: moneyToFils(unit_price) * quantity,
      line_cost_fils: moneyToFils(unit_cost) * quantity,
    })
  }

  const subtotalFils = prepared.reduce((sum, line) => sum + line.line_subtotal_fils, 0)
  const totalCostFils = prepared.reduce((sum, line) => sum + line.line_cost_fils, 0)
  const totals = computeCheckoutTotals(subtotalFils)

  const { data: orderRow, error: orderError } = await client
    .from("orders")
    .insert({
      restaurant_id: restaurant.id,
      table_id: table.id,
      guest_name: guestName,
      status: "pending",
      payment_status: "pending",
      payment_method: paymentMethod,
      subtotal: totals.subtotal,
      vat: totals.vat,
      tip: totals.tip,
      total: totals.total,
      total_cost: filsToMoney(totalCostFils),
    })
    .select(
      "id, restaurant_id, table_id, guest_name, status, payment_status, payment_method, guest_access_token, subtotal, vat, tip, total, created_at, ready_at",
    )
    .single()

  if (orderError || !orderRow) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create order: ${orderError?.message || "unknown"}`,
    })
  }

  const itemPayload = prepared.map((line) => ({
    restaurant_id: restaurant.id,
    order_id: orderRow.id,
    menu_item_id: line.menu_item_id,
    name_en: line.name_en,
    name_ar: line.name_ar,
    quantity: line.quantity,
    unit_price: line.unit_price,
    unit_cost: line.unit_cost,
    notes: line.notes,
    selected_options: line.selected_options,
  }))

  const { data: insertedItems, error: itemsError } = await client
    .from("order_items")
    .insert(itemPayload)
    .select(
      "id, menu_item_id, name_en, name_ar, quantity, unit_price, notes, selected_options",
    )

  if (itemsError || !insertedItems) {
    // Best-effort cleanup so a half-written order does not stick around.
    await client.from("orders").delete().eq("id", orderRow.id)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create order items: ${itemsError?.message || "unknown"}`,
    })
  }

  const order: PublicOrder = {
    id: orderRow.id,
    restaurant_id: orderRow.restaurant_id,
    table_id: orderRow.table_id,
    guest_name: orderRow.guest_name,
    status: orderRow.status,
    payment_status: orderRow.payment_status,
    payment_method: orderRow.payment_method,
    guest_access_token: String(orderRow.guest_access_token),
    subtotal: String(orderRow.subtotal),
    vat: String(orderRow.vat),
    tip: String(orderRow.tip),
    total: String(orderRow.total),
    created_at: orderRow.created_at,
    ready_at: orderRow.ready_at,
    table_number: table.table_number,
    restaurant_slug: restaurant.slug,
    restaurant_name: restaurant.name,
  }

  const items: PublicOrderItem[] = insertedItems.map((item) => ({
    id: item.id,
    menu_item_id: item.menu_item_id,
    name_en: item.name_en,
    name_ar: item.name_ar,
    quantity: item.quantity,
    unit_price: String(item.unit_price),
    notes: item.notes,
    selected_options: (item.selected_options ?? []) as SelectedModifierOption[],
  }))

  return { order, items }
}

export async function getPublicOrderById(
  client: SupabaseClient,
  orderId: string,
  options: { slug: string; accessToken: string },
): Promise<{ order: PublicOrder; items: PublicOrderItem[] } | null> {
  const slug = options.slug.trim()
  const accessToken = options.accessToken.trim()
  if (!slug || !accessToken) {
    return null
  }

  const { data: orderRow, error } = await client
    .from("orders")
    .select(
      "id, restaurant_id, table_id, guest_name, status, payment_status, payment_method, guest_access_token, subtotal, vat, tip, total, created_at, ready_at",
    )
    .eq("id", orderId)
    .eq("guest_access_token", accessToken)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load order: ${error.message}`,
    })
  }
  if (!orderRow) {
    return null
  }

  const { data: restaurant, error: restaurantError } = await client
    .from("restaurants")
    .select("id, slug, name")
    .eq("id", orderRow.restaurant_id)
    .maybeSingle()

  if (restaurantError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load restaurant for order: ${restaurantError.message}`,
    })
  }
  if (!restaurant || restaurant.slug !== slug) {
    // Same opaque 404 whether the order is missing or belongs to another venue.
    return null
  }

  const { data: table } = await client
    .from("tables")
    .select("table_number")
    .eq("id", orderRow.table_id)
    .maybeSingle()

  const { data: itemRows, error: itemsError } = await client
    .from("order_items")
    .select(
      "id, menu_item_id, name_en, name_ar, quantity, unit_price, notes, selected_options",
    )
    .eq("order_id", orderId)

  if (itemsError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load order items: ${itemsError.message}`,
    })
  }

  return {
    order: {
      id: orderRow.id,
      restaurant_id: orderRow.restaurant_id,
      table_id: orderRow.table_id,
      guest_name: orderRow.guest_name,
      status: orderRow.status,
      payment_status: orderRow.payment_status,
      payment_method: orderRow.payment_method,
      guest_access_token: String(orderRow.guest_access_token),
      subtotal: String(orderRow.subtotal),
      vat: String(orderRow.vat),
      tip: String(orderRow.tip),
      total: String(orderRow.total),
      created_at: orderRow.created_at,
      ready_at: orderRow.ready_at,
      table_number: table?.table_number ?? null,
      restaurant_slug: restaurant.slug,
      restaurant_name: restaurant.name,
    },
    items: (itemRows ?? []).map((item) => ({
      id: item.id,
      menu_item_id: item.menu_item_id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      quantity: item.quantity,
      unit_price: String(item.unit_price),
      notes: item.notes,
      selected_options: (item.selected_options ?? []) as SelectedModifierOption[],
    })),
  }
}

const KITCHEN_BOARD_STATUSES: OrderStatus[] = [
  "pending",
  "in_preparation",
  "ready",
]

type KitchenOrderRow = {
  id: string
  restaurant_id: string
  table_id: string
  guest_name: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  created_at: string
  ready_at: string | null
  tables:
    | { table_number: number }
    | { table_number: number }[]
    | null
  order_items:
    | Array<{
        id: string
        menu_item_id: string | null
        name_en: string
        name_ar: string
        quantity: number
        unit_price: string | number
        notes: string
        selected_options: SelectedModifierOption[] | null
      }>
    | null
}

/**
 * Cash at the table always appears on the kitchen board.
 * Online orders appear only after payment_status is paid.
 */
export function isKitchenVisibleOrder(order: {
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  status: OrderStatus
}): boolean {
  if (!KITCHEN_BOARD_STATUSES.includes(order.status)) {
    return false
  }
  if (order.payment_method === "cash_at_table") {
    return true
  }
  return order.payment_status === "paid"
}

function mapKitchenTicket(row: KitchenOrderRow): KitchenTicket {
  const tableRel = Array.isArray(row.tables) ? row.tables[0] : row.tables
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    table_id: row.table_id,
    table_number: tableRel?.table_number ?? null,
    guest_name: row.guest_name,
    status: row.status,
    payment_status: row.payment_status,
    payment_method: row.payment_method,
    created_at: row.created_at,
    ready_at: row.ready_at,
    items: (row.order_items ?? []).map((item) => ({
      id: item.id,
      menu_item_id: item.menu_item_id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      quantity: item.quantity,
      unit_price: String(item.unit_price),
      notes: item.notes ?? "",
      selected_options: (item.selected_options ?? []) as SelectedModifierOption[],
    })),
  }
}

const KITCHEN_ORDER_SELECT = `
  id,
  restaurant_id,
  table_id,
  guest_name,
  status,
  payment_status,
  payment_method,
  created_at,
  ready_at,
  tables ( table_number ),
  order_items (
    id,
    menu_item_id,
    name_en,
    name_ar,
    quantity,
    unit_price,
    notes,
    selected_options
  )
`

export async function listKitchenTickets(
  client: SupabaseClient,
  restaurantId: string,
): Promise<KitchenTicket[]> {
  const { data, error } = await client
    .from("orders")
    .select(KITCHEN_ORDER_SELECT)
    .eq("restaurant_id", restaurantId)
    .in("status", KITCHEN_BOARD_STATUSES)
    .or("payment_method.eq.cash_at_table,payment_status.eq.paid")
    .order("created_at", { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load kitchen tickets: ${error.message}`,
    })
  }

  return ((data ?? []) as unknown as KitchenOrderRow[])
    .map(mapKitchenTicket)
    .filter(isKitchenVisibleOrder)
}

export async function transitionKitchenOrder(
  client: SupabaseClient,
  options: {
    orderId: string
    restaurantId: string
    action: KitchenTicketAction
  },
): Promise<KitchenTicket> {
  const action = options.action
  if (action !== "start" && action !== "ready" && action !== "deliver") {
    throw createError({
      statusCode: 400,
      statusMessage: "action must be start, ready, or deliver",
    })
  }

  const { data: orderRow, error: loadError } = await client
    .from("orders")
    .select(
      "id, restaurant_id, status, payment_status, payment_method, ready_at",
    )
    .eq("id", options.orderId)
    .maybeSingle()

  if (loadError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load order: ${loadError.message}`,
    })
  }
  if (!orderRow || orderRow.restaurant_id !== options.restaurantId) {
    throw createError({ statusCode: 404, statusMessage: "Order not found" })
  }

  if (
    !isKitchenVisibleOrder({
      payment_method: orderRow.payment_method,
      payment_status: orderRow.payment_status,
      status: orderRow.status,
    }) &&
    !(action === "deliver" && orderRow.status === "ready")
  ) {
    throw createError({
      statusCode: 409,
      statusMessage: "Order is not visible on the kitchen board",
    })
  }

  let nextStatus: OrderStatus
  const patch: Record<string, string> = {}

  if (action === "start") {
    if (orderRow.status !== "pending") {
      throw createError({
        statusCode: 409,
        statusMessage: "Only pending tickets can start preparation",
      })
    }
    nextStatus = "in_preparation"
  } else if (action === "ready") {
    if (orderRow.status !== "in_preparation") {
      throw createError({
        statusCode: 409,
        statusMessage: "Only preparing tickets can be marked ready",
      })
    }
    nextStatus = "ready"
    if (!orderRow.ready_at) {
      patch.ready_at = new Date().toISOString()
    }
  } else {
    if (orderRow.status !== "ready") {
      throw createError({
        statusCode: 409,
        statusMessage: "Only ready tickets can be marked delivered",
      })
    }
    nextStatus = "completed"
  }

  patch.status = nextStatus

  const { error: updateError } = await client
    .from("orders")
    .update(patch)
    .eq("id", options.orderId)
    .eq("restaurant_id", options.restaurantId)

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update order: ${updateError.message}`,
    })
  }

  if (nextStatus === "completed") {
    // Delivered tickets leave the board; return a minimal ticket snapshot.
    return {
      id: orderRow.id,
      restaurant_id: options.restaurantId,
      table_id: "",
      table_number: null,
      guest_name: null,
      status: "completed",
      payment_status: orderRow.payment_status,
      payment_method: orderRow.payment_method,
      created_at: "",
      ready_at: patch.ready_at ?? orderRow.ready_at,
      items: [],
    }
  }

  const { data: refreshed, error: refreshError } = await client
    .from("orders")
    .select(KITCHEN_ORDER_SELECT)
    .eq("id", options.orderId)
    .eq("restaurant_id", options.restaurantId)
    .maybeSingle()

  if (refreshError || !refreshed) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to reload ticket: ${refreshError?.message || "unknown"}`,
    })
  }

  return mapKitchenTicket(refreshed as unknown as KitchenOrderRow)
}
