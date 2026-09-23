import type { SupabaseClient } from "@supabase/supabase-js"

export type MarkCashPaidResult =
  | { ok: true; alreadyPaid: boolean; orderId: string }
  | { ok: false; reason: "missing_order" | "not_cash" | "cancelled" }

/**
 * Owner confirms cash was collected at the table.
 * Idempotent when already paid. Rejects non-cash and cancelled orders.
 */
export async function markCashOrderPaid(
  client: SupabaseClient,
  restaurantId: string,
  orderId: string,
): Promise<MarkCashPaidResult> {
  const { data: order, error } = await client
    .from("orders")
    .select("id, restaurant_id, payment_status, payment_method, status")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load order: ${error.message}`,
    })
  }
  if (!order) {
    return { ok: false, reason: "missing_order" }
  }
  if (order.payment_method !== "cash_at_table") {
    return { ok: false, reason: "not_cash" }
  }
  if (order.status === "cancelled") {
    return { ok: false, reason: "cancelled" }
  }
  if (order.payment_status === "paid") {
    await closeSessionForOrder(client, order.id)
    return { ok: true, alreadyPaid: true, orderId: order.id }
  }

  const { data: updated, error: updateError } = await client
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", order.id)
    .eq("restaurant_id", restaurantId)
    .eq("payment_method", "cash_at_table")
    .eq("payment_status", "pending")
    .neq("status", "cancelled")
    .select("id")
    .maybeSingle()

  if (updateError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to mark cash order paid: ${updateError.message}`,
    })
  }

  if (!updated) {
    const { data: again, error: againError } = await client
      .from("orders")
      .select("id, payment_status")
      .eq("id", order.id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle()
    if (againError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to re-check cash order: ${againError.message}`,
      })
    }
    if (again?.payment_status === "paid") {
      await closeSessionForOrder(client, order.id)
      return { ok: true, alreadyPaid: true, orderId: order.id }
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Cash order payment status could not be updated",
    })
  }

  await closeSessionForOrder(client, order.id)
  return { ok: true, alreadyPaid: false, orderId: order.id }
}
