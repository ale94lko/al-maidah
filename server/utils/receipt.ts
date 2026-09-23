import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  PaymentMethod,
  PaymentStatus,
  PublicOrderItem,
  PublicReceipt,
  SelectedModifierOption,
} from "~/types"

type ReceiptOrderRow = {
  id: string
  restaurant_id: string
  table_id: string
  guest_name: string | null
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  guest_access_token: string
  subtotal: string | number
  vat: string | number
  tip: string | number
  total: string | number
  gateway_reference: string | null
  created_at: string
}

type ReceiptItemRow = {
  id: string
  menu_item_id: string | null
  name_en: string
  name_ar: string
  quantity: number
  unit_price: string | number
  notes: string
  selected_options: SelectedModifierOption[] | null
}

function mapItems(rows: ReceiptItemRow[] | null): PublicOrderItem[] {
  return (rows ?? []).map((item) => ({
    id: item.id,
    menu_item_id: item.menu_item_id,
    name_en: item.name_en,
    name_ar: item.name_ar,
    quantity: item.quantity,
    unit_price: String(item.unit_price),
    notes: item.notes,
    selected_options: (item.selected_options ?? []) as SelectedModifierOption[],
  }))
}

function buildReceipt(input: {
  order: ReceiptOrderRow
  restaurant: { id: string; name: string; slug: string; trn: string | null }
  tableNumber: number | null
  items: PublicOrderItem[]
}): PublicReceipt {
  return {
    order_id: input.order.id,
    restaurant_id: input.restaurant.id,
    restaurant_name: input.restaurant.name,
    restaurant_slug: input.restaurant.slug,
    trn: input.restaurant.trn?.trim() || null,
    table_number: input.tableNumber,
    guest_name: input.order.guest_name,
    created_at: input.order.created_at,
    payment_status: input.order.payment_status,
    payment_method: input.order.payment_method,
    gateway_reference: input.order.gateway_reference,
    subtotal: String(input.order.subtotal),
    vat: String(input.order.vat),
    tip: String(input.order.tip),
    total: String(input.order.total),
    currency: "AED",
    items: input.items,
  }
}

const ORDER_RECEIPT_SELECT =
  "id, restaurant_id, table_id, guest_name, payment_status, payment_method, guest_access_token, subtotal, vat, tip, total, gateway_reference, created_at"

const ITEM_RECEIPT_SELECT =
  "id, menu_item_id, name_en, name_ar, quantity, unit_price, notes, selected_options"

/**
 * Guest digital receipt. Requires the order guest_access_token + restaurant slug.
 * Guest-safe: omits internal cost columns from the select and payload.
 */
export async function getGuestReceipt(
  client: SupabaseClient,
  orderId: string,
  options: { slug: string; accessToken: string },
): Promise<PublicReceipt | null> {
  const slug = options.slug.trim()
  const accessToken = options.accessToken.trim()
  if (!slug || !accessToken) {
    return null
  }

  const { data: orderRow, error } = await client
    .from("orders")
    .select(ORDER_RECEIPT_SELECT)
    .eq("id", orderId)
    .eq("guest_access_token", accessToken)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load receipt: ${error.message}`,
    })
  }
  if (!orderRow) {
    return null
  }

  const { data: restaurant, error: restaurantError } = await client
    .from("restaurants")
    .select("id, name, slug, trn")
    .eq("id", orderRow.restaurant_id)
    .maybeSingle()

  if (restaurantError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load restaurant for receipt: ${restaurantError.message}`,
    })
  }
  if (!restaurant || restaurant.slug !== slug) {
    return null
  }

  const { data: table } = await client
    .from("tables")
    .select("table_number")
    .eq("id", orderRow.table_id)
    .maybeSingle()

  const { data: itemRows, error: itemsError } = await client
    .from("order_items")
    .select(ITEM_RECEIPT_SELECT)
    .eq("order_id", orderId)

  if (itemsError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load receipt lines: ${itemsError.message}`,
    })
  }

  return buildReceipt({
    order: orderRow as ReceiptOrderRow,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      trn: restaurant.trn,
    },
    tableNumber: table?.table_number ?? null,
    items: mapItems(itemRows as ReceiptItemRow[] | null),
  })
}

/**
 * Owner digital receipt for one order in a restaurant they own.
 * Owner-safe for receipts: omits internal cost columns from the select and payload.
 */
export async function getOwnerReceipt(
  client: SupabaseClient,
  restaurantId: string,
  orderId: string,
): Promise<PublicReceipt | null> {
  const { data: orderRow, error } = await client
    .from("orders")
    .select(ORDER_RECEIPT_SELECT)
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load receipt: ${error.message}`,
    })
  }
  if (!orderRow) {
    return null
  }

  const { data: restaurant, error: restaurantError } = await client
    .from("restaurants")
    .select("id, name, slug, trn")
    .eq("id", restaurantId)
    .maybeSingle()

  if (restaurantError || !restaurant) {
    throw createError({
      statusCode: 404,
      statusMessage: "Restaurant not found",
    })
  }

  const { data: table } = await client
    .from("tables")
    .select("table_number")
    .eq("id", orderRow.table_id)
    .maybeSingle()

  const { data: itemRows, error: itemsError } = await client
    .from("order_items")
    .select(ITEM_RECEIPT_SELECT)
    .eq("order_id", orderId)

  if (itemsError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load receipt lines: ${itemsError.message}`,
    })
  }

  return buildReceipt({
    order: orderRow as ReceiptOrderRow,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      trn: restaurant.trn,
    },
    tableNumber: table?.table_number ?? null,
    items: mapItems(itemRows as ReceiptItemRow[] | null),
  })
}

export type OwnerOrderSummary = {
  id: string
  created_at: string
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  total: string
  table_number: number | null
  guest_name: string | null
  gateway_reference: string | null
}

/** Recent orders for the owner receipt list (no cost fields). */
export async function listOwnerOrders(
  client: SupabaseClient,
  restaurantId: string,
  limit = 40,
): Promise<OwnerOrderSummary[]> {
  const { data, error } = await client
    .from("orders")
    .select(
      "id, created_at, payment_status, payment_method, total, guest_name, gateway_reference, table_id, tables(table_number)",
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to list orders: ${error.message}`,
    })
  }

  return (data ?? []).map((row) => {
    const tables = row.tables as
      | { table_number: number }
      | { table_number: number }[]
      | null
    const tableNumber = Array.isArray(tables)
      ? (tables[0]?.table_number ?? null)
      : (tables?.table_number ?? null)
    return {
      id: row.id,
      created_at: row.created_at,
      payment_status: row.payment_status as PaymentStatus,
      payment_method: row.payment_method as PaymentMethod | null,
      total: String(row.total),
      table_number: tableNumber,
      guest_name: row.guest_name,
      gateway_reference: row.gateway_reference,
    }
  })
}
