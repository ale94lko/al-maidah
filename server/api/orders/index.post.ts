type OrderBody = {
  slug?: string
  sessionToken?: string
  /** @deprecated Use sessionToken from the staff visit QR. */
  tableId?: string
  guestName?: string
  paymentMethod?: string
  items?: Array<{
    menuItemId?: string
    quantity?: number
    notes?: string
    selectedOptionIds?: string[]
    /** Ignored — prices are recomputed on the server. */
    unit_price?: string
    subtotal?: string
    vat?: string
    total?: string
  }>
}

/**
 * Guest checkout: create a pending order with server-side UAE 5% VAT.
 * Requires an open table visit session from the staff QR.
 * Uses the service role because anon/authenticated cannot INSERT orders (RLS).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<OrderBody>(event)

  const items = (body.items ?? []).map((item) => ({
    menuItemId: String(item.menuItemId || ""),
    quantity: Number(item.quantity),
    notes: typeof item.notes === "string" ? item.notes : "",
    selectedOptionIds: Array.isArray(item.selectedOptionIds)
      ? item.selectedOptionIds.map(String)
      : [],
  }))

  const paymentMethod = String(body.paymentMethod || "").trim()
  // Guest checkout is counter-only; ignore client attempts to select online pay.
  if (paymentMethod && paymentMethod !== "cash_at_table") {
    throw createError({
      statusCode: 400,
      statusMessage: "Only pay-at-counter checkout is available",
    })
  }

  const client = createServiceRoleClient()
  return createGuestOrder(client, {
    slug: String(body.slug || ""),
    sessionToken: String(body.sessionToken || ""),
    guestName: body.guestName,
    paymentMethod: "cash_at_table",
    items,
  })
})
