import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(resolve(root, path), "utf8")
}

test("orders realtime migration publishes kitchen updates", () => {
  const path = "supabase/migrations/20260923180000_orders_realtime.sql"
  assert.ok(existsSync(resolve(root, path)))
  const sql = read(path)
  assert.match(sql, /supabase_realtime/)
  assert.match(sql, /public\.orders/)
  assert.match(sql, /create publication supabase_realtime|pg_publication/)
  assert.match(sql, /pg_publication_tables|add table public\.orders/)
})

test("kitchen helpers filter cash or paid and set ready_at", () => {
  const helper = read("server/utils/orders.ts")
  assert.match(helper, /export function isKitchenVisibleOrder/)
  assert.match(helper, /cash_at_table/)
  assert.match(helper, /payment_status === "paid"/)
  assert.match(helper, /export async function listKitchenTickets/)
  assert.match(helper, /export async function transitionKitchenOrder/)
  assert.match(helper, /ready_at/)
  assert.match(helper, /in_preparation/)
  assert.match(helper, /completed/)
  assert.doesNotMatch(
    helper.match(/export async function listKitchenTickets[\s\S]*?(?=export async function transitionKitchenOrder)/)?.[0] ??
      "",
    /total_cost|unit_cost/,
  )
})

test("kitchen APIs require ownership and restaurant scope", () => {
  const listApi = read("server/api/kitchen/orders/index.get.ts")
  const transitionApi = read(
    "server/api/kitchen/orders/[id]/transition.post.ts",
  )
  assert.match(listApi, /requireUser/)
  assert.match(listApi, /assertRestaurantOwner/)
  assert.match(listApi, /listKitchenTickets/)
  assert.match(listApi, /restaurantId/)
  assert.match(transitionApi, /requireUser/)
  assert.match(transitionApi, /assertRestaurantOwner/)
  assert.match(transitionApi, /transitionKitchenOrder/)
  assert.match(transitionApi, /action/)
  assert.match(transitionApi, /start|ready|deliver/)
})

test("kitchen board UI has three columns and ticket actions", () => {
  const page = read("pages/kitchen/index.vue")
  const board = read("components/KitchenBoard.vue")
  const card = read("components/KitchenTicketCard.vue")
  const composable = read("composables/useKitchenBoard.ts")
  assert.match(page, /KitchenBoard/)
  assert.match(page, /layout:\s*["']kitchen["']/)
  assert.match(board, /columnPending|kitchen\.columnPending/)
  assert.match(board, /columnPreparing|kitchen\.columnPreparing/)
  assert.match(board, /columnReady|kitchen\.columnReady/)
  assert.match(board, /actionStart|action="start"/)
  assert.match(board, /actionReady|action="ready"/)
  assert.match(board, /actionDeliver|action="deliver"/)
  assert.match(card, /elapsedMinutes|kitchen\.elapsed/)
  assert.match(card, /selected_options/)
  assert.match(card, /item\.notes/)
  assert.match(composable, /postgres_changes/)
  assert.match(composable, /restaurant_id=eq\./)
  assert.match(composable, /POLL_FALLBACK_MS|setInterval/)
  assert.match(composable, /enableAlerts|alertsEnabled/)
  assert.match(composable, /onNewTickets/)
  assert.doesNotMatch(composable, /playNewTicketSound|new AudioContext/)
})

test("kitchen i18n covers board actions in English and Arabic", () => {
  const messages = read("i18n/messages.ts")
  for (const key of [
    "columnPending",
    "columnPreparing",
    "columnReady",
    "actionStart",
    "actionReady",
    "actionDeliver",
    "elapsed",
  ]) {
    assert.match(messages, new RegExp(`${key}:`))
  }
})

test("KitchenTicket type omits cost fields", () => {
  const types = read("types/index.ts")
  const block = types.match(/interface KitchenTicket \{([\s\S]*?)\n\}/)?.[1]
  assert.ok(block)
  assert.doesNotMatch(block, /total_cost/)
  assert.doesNotMatch(block, /unit_cost/)
  assert.match(block, /table_number/)
  assert.match(block, /items:/)
})
