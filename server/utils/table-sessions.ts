import type { SupabaseClient } from "@supabase/supabase-js"
import type { DiningTable, TableSession } from "~/types"
import { generateSessionToken } from "~/utils/session-token"

const SESSION_COLUMNS =
  "id, restaurant_id, table_id, token, status, opened_at, closed_at, closed_reason"

const TABLE_COLUMNS =
  "id, restaurant_id, table_number, label, is_active, deactivated_at, created_at"

export type OpenSessionWithTable = {
  session: TableSession
  table: DiningTable
}

export async function getOpenSessionByToken(
  client: SupabaseClient,
  restaurantId: string,
  token: string,
): Promise<OpenSessionWithTable | null> {
  const { data: session, error } = await client
    .from("table_sessions")
    .select(SESSION_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .eq("token", token)
    .eq("status", "open")
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load table session: ${error.message}`,
    })
  }
  if (!session) {
    return null
  }

  const { data: table, error: tableError } = await client
    .from("tables")
    .select(TABLE_COLUMNS)
    .eq("id", session.table_id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle()

  if (tableError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load table for session: ${tableError.message}`,
    })
  }
  if (!table || table.is_active === false) {
    return null
  }

  return {
    session: session as TableSession,
    table: table as DiningTable,
  }
}

export async function listOpenSessionsForRestaurant(
  client: SupabaseClient,
  restaurantId: string,
): Promise<TableSession[]> {
  const { data, error } = await client
    .from("table_sessions")
    .select(SESSION_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .eq("status", "open")

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to list open sessions: ${error.message}`,
    })
  }
  return (data ?? []) as TableSession[]
}

export async function openTableSession(
  client: SupabaseClient,
  restaurantId: string,
  tableId: string,
): Promise<OpenSessionWithTable> {
  const { data: table, error: tableError } = await client
    .from("tables")
    .select(TABLE_COLUMNS)
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle()

  if (tableError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load table: ${tableError.message}`,
    })
  }
  if (!table || table.is_active === false) {
    throw createError({ statusCode: 404, statusMessage: "Table not found" })
  }

  const { data: existing } = await client
    .from("table_sessions")
    .select(SESSION_COLUMNS)
    .eq("table_id", tableId)
    .eq("status", "open")
    .maybeSingle()

  if (existing) {
    return {
      session: existing as TableSession,
      table: table as DiningTable,
    }
  }

  const token = generateSessionToken()
  const { data: session, error } = await client
    .from("table_sessions")
    .insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      token,
      status: "open",
    })
    .select(SESSION_COLUMNS)
    .single()

  if (error || !session) {
    if (error?.code === "23505") {
      const { data: raced } = await client
        .from("table_sessions")
        .select(SESSION_COLUMNS)
        .eq("table_id", tableId)
        .eq("status", "open")
        .maybeSingle()
      if (raced) {
        return {
          session: raced as TableSession,
          table: table as DiningTable,
        }
      }
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to open table session: ${error?.message || "unknown"}`,
    })
  }

  return {
    session: session as TableSession,
    table: table as DiningTable,
  }
}

export async function closeTableSession(
  client: SupabaseClient,
  restaurantId: string,
  tableId: string,
  reason: "paid" | "manual",
): Promise<TableSession | null> {
  const now = new Date().toISOString()
  const { data, error } = await client
    .from("table_sessions")
    .update({
      status: "closed",
      closed_at: now,
      closed_reason: reason,
    })
    .eq("restaurant_id", restaurantId)
    .eq("table_id", tableId)
    .eq("status", "open")
    .select(SESSION_COLUMNS)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to close table session: ${error.message}`,
    })
  }
  return (data as TableSession | null) ?? null
}

export async function closeSessionForOrder(
  client: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { data: order, error } = await client
    .from("orders")
    .select("id, restaurant_id, table_id, table_session_id")
    .eq("id", orderId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load order for session close: ${error.message}`,
    })
  }
  if (!order) {
    return
  }

  const now = new Date().toISOString()

  if (order.table_session_id) {
    const { error: closeError } = await client
      .from("table_sessions")
      .update({
        status: "closed",
        closed_at: now,
        closed_reason: "paid",
      })
      .eq("id", order.table_session_id)
      .eq("restaurant_id", order.restaurant_id)
      .eq("status", "open")

    if (closeError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to close session after payment: ${closeError.message}`,
      })
    }
    return
  }

  await closeTableSession(client, order.restaurant_id, order.table_id, "paid")
}
