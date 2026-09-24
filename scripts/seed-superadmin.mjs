/**
 * Ensure the platform superadmin exists in Supabase Auth.
 *
 * Usage (from repo root, with .env loaded):
 *   node --env-file=.env scripts/seed-superadmin.mjs
 */
import { createClient } from "@supabase/supabase-js"

const email = process.env.SUPERADMIN_EMAIL || "superadmin@gmail.com"
const password = process.env.SUPERADMIN_PASSWORD || "Aa123456789*"
const url = process.env.NUXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error(
    "Missing NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  )
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findUserByEmail(targetEmail) {
  let page = 1
  const perPage = 100
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw error
    }
    const hit = (data.users ?? []).find(
      (user) => (user.email || "").toLowerCase() === targetEmail.toLowerCase(),
    )
    if (hit) {
      return hit
    }
    if ((data.users ?? []).length < perPage) {
      return null
    }
    page += 1
  }
}

const existing = await findUserByEmail(email)

if (existing) {
  const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    app_metadata: {
      ...(existing.app_metadata || {}),
      role: "superadmin",
      app_role: "superadmin",
    },
  })
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  console.log(`Updated superadmin ${data.user.email} (${data.user.id})`)
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "superadmin", app_role: "superadmin" },
  })
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  console.log(`Created superadmin ${data.user.email} (${data.user.id})`)
}
