import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()
const migrationsDir = resolve(root, "supabase/migrations")

function loadMigrationSql() {
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
  assert.ok(files.length > 0, "expected at least one migration")
  return files
    .map((name) => readFileSync(resolve(migrationsDir, name), "utf8"))
    .join("\n")
}

test("supabase migration and seed files exist", () => {
  assert.ok(existsSync(resolve(root, "supabase/config.toml")))
  assert.ok(existsSync(resolve(root, "supabase/seed.sql")))
  assert.ok(existsSync(migrationsDir))
})

test("migration defines the MVP-02 multi-tenant tables", () => {
  const sql = loadMigrationSql()
  for (const table of [
    "restaurants",
    "restaurant_owners",
    "tables",
    "categories",
    "menu_items",
    "modifier_groups",
    "modifier_options",
    "orders",
    "order_items",
  ]) {
    assert.match(
      sql,
      new RegExp(`create table public\\.${table}\\b`, "i"),
      `missing table ${table}`,
    )
  }
})

test("money columns use numeric rather than floating point", () => {
  const sql = loadMigrationSql()
  assert.match(sql, /price numeric/i)
  assert.match(sql, /cost_price numeric/i)
  assert.match(sql, /price_extra numeric/i)
  assert.match(sql, /subtotal numeric/i)
  assert.match(sql, /\bvat numeric/i)
  assert.match(sql, /\btip numeric/i)
  assert.match(sql, /\btotal numeric/i)
  assert.match(sql, /total_cost numeric/i)
  assert.match(sql, /unit_price numeric/i)
  assert.match(sql, /unit_cost numeric/i)
  assert.doesNotMatch(sql, /\b(price|cost_price|vat|subtotal|total)\s+(double precision|real|float)/i)
})

test("business tables require restaurant_id", () => {
  const sql = loadMigrationSql()
  for (const table of [
    "restaurant_owners",
    "tables",
    "categories",
    "menu_items",
    "modifier_groups",
    "modifier_options",
    "orders",
    "order_items",
  ]) {
    const block = sql.match(
      new RegExp(`create table public\\.${table} \\(([\\s\\S]*?)\\);`, "i"),
    )
    assert.ok(block, `could not parse create table for ${table}`)
    assert.match(block[1], /restaurant_id uuid not null/i)
  }
})

test("orders have status, payment, and method enums", () => {
  const sql = loadMigrationSql()
  assert.match(sql, /create type public\.order_status/i)
  assert.match(sql, /'pending',\s*'in_preparation',\s*'ready',\s*'completed',\s*'cancelled'/s)
  assert.match(sql, /create type public\.payment_status/i)
  assert.match(sql, /'pending',\s*'paid',\s*'refunded'/s)
  assert.match(sql, /create type public\.payment_method/i)
  assert.match(sql, /'google_pay',\s*'apple_pay',\s*'card',\s*'cash_at_table'/s)
})

test("RLS is enabled and orders have no open anon write policy", () => {
  const sql = loadMigrationSql()
  assert.match(sql, /alter table public\.orders enable row level security/i)
  assert.match(sql, /revoke all on table public\.orders from anon/i)
  // Avoid cross-policy false positives from concatenated migrations.
  assert.doesNotMatch(
    sql,
    /create policy\s+\w+\s+on\s+public\.orders\s+for\s+insert\s+to\s+anon\b/i,
  )
  assert.doesNotMatch(
    sql,
    /create policy\s+\w+\s+on\s+public\.orders\s+for\s+update\s+to\s+anon\b/i,
  )
})

test("seed creates the demo restaurant with categories, dishes, and tables", () => {
  const seed = readFileSync(resolve(root, "supabase/seed.sql"), "utf8")
  assert.match(seed, /slug,\s*trn,\s*currency/i)
  assert.match(seed, /'demo'/)
  assert.match(seed, /insert into public\.tables/i)
  assert.match(seed, /insert into public\.categories/i)
  assert.match(seed, /insert into public\.menu_items/i)
  assert.match(seed, /insert into public\.modifier_groups/i)
  assert.match(seed, /insert into public\.modifier_options/i)
})

test("config.toml applies seed on db reset", () => {
  const config = readFileSync(resolve(root, "supabase/config.toml"), "utf8")
  assert.match(config, /\[db\.seed\]/)
  assert.match(config, /enabled\s*=\s*true/)
  assert.match(config, /\.\/seed\.sql/)
})
