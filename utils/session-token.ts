/** Opaque guest visit tokens (64 hex chars). */

const SESSION_TOKEN = /^[a-f0-9]{64}$/

export function parseSessionToken(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null
  }
  const value = raw.trim().toLowerCase()
  return SESSION_TOKEN.test(value) ? value : null
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}
