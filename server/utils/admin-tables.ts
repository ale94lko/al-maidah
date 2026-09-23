import type { SupabaseClient } from "@supabase/supabase-js"
import type { DiningTable } from "~/types"

const TABLE_COLUMNS =
  "id, restaurant_id, table_number, label, is_active, deactivated_at, created_at"

export async function listRestaurantTables(
  client: SupabaseClient,
  restaurantId: string,
  options?: { includeInactive?: boolean },
): Promise<DiningTable[]> {
  let query = client
    .from("tables")
    .select(TABLE_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .order("table_number", { ascending: true })

  if (!options?.includeInactive) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query
  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load tables: ${error.message}`,
    })
  }

  return (data ?? []) as DiningTable[]
}

export async function createRestaurantTable(
  client: SupabaseClient,
  restaurantId: string,
  input: { table_number: number; label?: string | null },
): Promise<DiningTable> {
  const tableNumber = Number(input.table_number)
  if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "table_number must be a positive integer",
    })
  }

  const label =
    typeof input.label === "string" && input.label.trim()
      ? input.label.trim()
      : null

  const { data, error } = await client
    .from("tables")
    .insert({
      restaurant_id: restaurantId,
      table_number: tableNumber,
      label,
      is_active: true,
      deactivated_at: null,
    })
    .select(TABLE_COLUMNS)
    .single()

  if (error || !data) {
    if (error?.code === "23505") {
      throw createError({
        statusCode: 409,
        statusMessage: `Table ${tableNumber} already exists`,
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create table: ${error?.message || "unknown"}`,
    })
  }

  return data as DiningTable
}

export async function updateRestaurantTable(
  client: SupabaseClient,
  restaurantId: string,
  tableId: string,
  patch: { table_number?: number; label?: string | null },
): Promise<DiningTable> {
  await loadOwnedTable(client, restaurantId, tableId)

  const updates: Record<string, unknown> = {}
  if (patch.table_number !== undefined) {
    const tableNumber = Number(patch.table_number)
    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "table_number must be a positive integer",
      })
    }
    updates.table_number = tableNumber
  }
  if (patch.label !== undefined) {
    updates.label =
      typeof patch.label === "string" && patch.label.trim()
        ? patch.label.trim()
        : null
  }

  if (!Object.keys(updates).length) {
    throw createError({ statusCode: 400, statusMessage: "Nothing to update" })
  }

  const { data, error } = await client
    .from("tables")
    .update(updates)
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .select(TABLE_COLUMNS)
    .single()

  if (error || !data) {
    if (error?.code === "23505") {
      throw createError({
        statusCode: 409,
        statusMessage: "That table number is already in use",
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update table: ${error?.message || "unknown"}`,
    })
  }

  return data as DiningTable
}

/**
 * Soft-deactivate: keeps order FK history and blocks new guest orders
 * for this table number until a new active table reuses it.
 */
export async function deactivateRestaurantTable(
  client: SupabaseClient,
  restaurantId: string,
  tableId: string,
): Promise<DiningTable> {
  await loadOwnedTable(client, restaurantId, tableId)

  const { data, error } = await client
    .from("tables")
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
    })
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .select(TABLE_COLUMNS)
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to remove table: ${error?.message || "unknown"}`,
    })
  }

  await closeTableSession(client, restaurantId, tableId, "manual")

  return data as DiningTable
}

async function loadOwnedTable(
  client: SupabaseClient,
  restaurantId: string,
  tableId: string,
): Promise<DiningTable> {
  const { data, error } = await client
    .from("tables")
    .select(TABLE_COLUMNS)
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load table: ${error.message}`,
    })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Table not found" })
  }
  return data as DiningTable
}
