/** Guest QR links use a SHA-256 of the table id, not the table number. */

const TABLE_TOKEN = /^[a-f0-9]{64}$/

export function parseTableToken(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null
  }
  const value = raw.trim().toLowerCase()
  return TABLE_TOKEN.test(value) ? value : null
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
