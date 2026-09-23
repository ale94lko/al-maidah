/**
 * Pull a human-readable API message out of $fetch / ofetch errors.
 * Avoids technical strings like `[PATCH] "/api/...": 409 …`.
 */
export function extractApiErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null
  }

  const record = error as {
    data?: { statusMessage?: unknown; message?: unknown }
    statusMessage?: unknown
    message?: unknown
  }

  const fromData = record.data
  if (fromData && typeof fromData === "object") {
    if (typeof fromData.statusMessage === "string" && fromData.statusMessage.trim()) {
      return fromData.statusMessage.trim()
    }
    if (typeof fromData.message === "string" && fromData.message.trim()) {
      return fromData.message.trim()
    }
  }

  if (typeof record.statusMessage === "string" && record.statusMessage.trim()) {
    return record.statusMessage.trim()
  }

  if (typeof record.message === "string" && record.message.trim()) {
    const message = record.message.trim()
    if (/^\[[A-Z]+\]\s+"/.test(message)) {
      const trailing = message.match(/:\s*\d{3}\s+(.+)$/)
      return trailing?.[1]?.trim() || null
    }
    return message
  }

  return null
}
