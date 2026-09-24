type EventBody = {
  kind?: string
  path?: string
  message?: string
  visitor_id?: string
}

/**
 * Record anonymous platform telemetry (page views / client errors).
 * Uses the service role; no auth required.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<EventBody>(event)
  const kind = body.kind === "error" ? "error" : body.kind === "page_view" ? "page_view" : null
  if (!kind) {
    throw createError({ statusCode: 400, statusMessage: "kind is required" })
  }

  const client = createServiceRoleClient()
  await insertPlatformEvent(client, {
    kind,
    path: body.path,
    message: body.message,
    visitor_id: body.visitor_id,
    user_agent: getHeader(event, "user-agent") || undefined,
  })

  return { ok: true }
})
