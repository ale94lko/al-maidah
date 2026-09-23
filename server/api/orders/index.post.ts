type OrderBody = {
  slug?: string
  tableId?: string
  guestName?: string
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

  const client = createServiceRoleClient()
  return createGuestOrder(client, {
    slug: String(body.slug || ""),
    tableId: String(body.tableId || ""),
    guestName: body.guestName,
    items,
  })
})
