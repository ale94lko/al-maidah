import type { SupabaseClient } from "@supabase/supabase-js"

export type PlatformEventKind = "page_view" | "error"

export type PlatformEventInput = {
  kind: PlatformEventKind
  path?: string
  message?: string
  visitor_id?: string
  user_agent?: string
}

const MAX_PATH = 300
const MAX_MESSAGE = 500
const MAX_VISITOR = 80
const MAX_UA = 300

export function sanitizePlatformEvent(
  input: PlatformEventInput,
): PlatformEventInput | null {
  if (input.kind !== "page_view" && input.kind !== "error") {
    return null
  }
  const path = (input.path || "/").trim().slice(0, MAX_PATH) || "/"
  const message =
    typeof input.message === "string"
      ? input.message.trim().slice(0, MAX_MESSAGE) || null
      : null
  if (input.kind === "error" && !message) {
    return null
  }
  return {
    kind: input.kind,
    path,
    message: message ?? undefined,
    visitor_id: (input.visitor_id || "").trim().slice(0, MAX_VISITOR) || undefined,
    user_agent: (input.user_agent || "").trim().slice(0, MAX_UA) || undefined,
  }
}

export async function insertPlatformEvent(
  client: SupabaseClient,
  input: PlatformEventInput,
): Promise<void> {
  const clean = sanitizePlatformEvent(input)
  if (!clean) {
    throw createError({ statusCode: 400, statusMessage: "Invalid event" })
  }

  const { error } = await client.from("platform_events").insert({
    kind: clean.kind,
    path: clean.path,
    message: clean.message ?? null,
    visitor_id: clean.visitor_id ?? null,
    user_agent: clean.user_agent ?? null,
  })

  if (error) {
    // Table may not exist yet on a fresh remote; don't break the app shell.
    if (/platform_events|schema cache/i.test(error.message)) {
      return
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to record event: ${error.message}`,
    })
  }
}
