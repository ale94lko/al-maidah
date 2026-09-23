import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  Category,
  DiningTable,
  Dish,
  MenuItem,
  ModifierGroup,
  ModifierGroupWithOptions,
  ModifierOption,
  PublicMenu,
  Restaurant,
  RestaurantStatistics,
} from "~/types"

const PUBLIC_DISH_COLUMNS =
  "id, restaurant_id, category_id, name_en, name_ar, description_en, description_ar, price, photo_url, is_available, is_vegetarian, is_archived, allergens, sort_order, created_at, updated_at"

export async function getRestaurantBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<Restaurant | null> {
  const { data, error } = await client
    .from("restaurants")
    .select(
      "id, name, slug, trn, currency, created_at, updated_at",
    )
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load restaurant: ${error.message}`,
    })
  }

  return (data as Restaurant | null) ?? null
}

export async function getTableByNumber(
  client: SupabaseClient,
  restaurantId: string,
  tableNumber: number,
): Promise<DiningTable | null> {
  const { data, error } = await client
    .from("tables")
    .select("id, restaurant_id, table_number, label, is_active, deactivated_at, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("table_number", tableNumber)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load table: ${error.message}`,
    })
  }

  return (data as DiningTable | null) ?? null
}

/**
 * Public menu for one restaurant. Dishes are scoped by restaurant_id,
 * omit cost_price, and hide sold-out / archived rows from guests.
 */
export async function getPublicMenuBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<PublicMenu | null> {
  const restaurant = await getRestaurantBySlug(client, slug)
  if (!restaurant) {
    return null
  }

  const restaurantId = restaurant.id

  const [categoriesResult, dishesResult, groupsResult, optionsResult] =
    await Promise.all([
      client
        .from("categories")
        .select(
          "id, restaurant_id, name_en, name_ar, sort_order, is_archived, archived_at, created_at, updated_at",
        )
        .eq("restaurant_id", restaurantId)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true }),
      client
        .from("menu_items")
        .select(PUBLIC_DISH_COLUMNS)
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true }),
      client
        .from("modifier_groups")
        .select(
          "id, restaurant_id, menu_item_id, name_en, name_ar, is_required, min_select, max_select, sort_order, created_at",
        )
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true }),
      client
        .from("modifier_options")
        .select(
          "id, restaurant_id, modifier_group_id, name_en, name_ar, price_extra, sort_order, is_available, created_at",
        )
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("sort_order", { ascending: true }),
    ])

  for (const result of [
    categoriesResult,
    dishesResult,
    groupsResult,
    optionsResult,
  ]) {
    if (result.error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to load menu: ${result.error.message}`,
      })
    }
  }

  const dishes = (dishesResult.data ?? []) as Dish[]
  assertNoCostPrice(dishes)
  const dishIds = new Set(dishes.map((dish) => dish.id))

  const groups = ((groupsResult.data ?? []) as ModifierGroup[]).filter(
    (group) => dishIds.has(group.menu_item_id),
  )
  const options = (optionsResult.data ?? []) as ModifierOption[]
  const optionsByGroup = new Map<string, ModifierOption[]>()

  for (const option of options) {
    const list = optionsByGroup.get(option.modifier_group_id) ?? []
    list.push(option)
    optionsByGroup.set(option.modifier_group_id, list)
  }

  const modifiers: ModifierGroupWithOptions[] = groups.map((group) => ({
    ...group,
    options: optionsByGroup.get(group.id) ?? [],
  }))

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      trn: restaurant.trn,
      currency: restaurant.currency,
    },
    categories: (categoriesResult.data ?? []) as Category[],
    dishes,
    modifiers,
  }
}

/** Admin helper: full menu items including cost_price for one restaurant. */
export async function getMenuItemsForRestaurant(
  client: SupabaseClient,
  restaurantId: string,
): Promise<MenuItem[]> {
  const { data, error } = await client
    .from("menu_items")
    .select(
      "id, restaurant_id, category_id, name_en, name_ar, description_en, description_ar, price, cost_price, photo_url, is_available, is_vegetarian, is_archived, archived_at, allergens, sort_order, created_at, updated_at",
    )
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load menu items: ${error.message}`,
    })
  }

  return (data ?? []) as MenuItem[]
}

export async function getRestaurantStatistics(
  client: SupabaseClient,
  restaurantId: string,
): Promise<RestaurantStatistics> {
  const { data, error } = await client
    .from("orders")
    .select("payment_status, total, total_cost, created_at, ready_at")
    .eq("restaurant_id", restaurantId)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load statistics: ${error.message}`,
    })
  }

  const rows = data ?? []
  const paid = rows.filter((row) => row.payment_status === "paid")
  const revenue = sumMoney(paid.map((row) => String(row.total ?? "0")))
  const totalCost = sumMoney(paid.map((row) => String(row.total_cost ?? "0")))
  const readyDurations = paid
    .filter((row) => row.ready_at && row.created_at)
    .map(
      (row) =>
        (Date.parse(String(row.ready_at)) - Date.parse(String(row.created_at))) /
        1000,
    )
    .filter((seconds) => Number.isFinite(seconds) && seconds >= 0)

  const averageReadySeconds =
    readyDurations.length === 0
      ? null
      : Math.round(
          readyDurations.reduce((sum, value) => sum + value, 0) /
            readyDurations.length,
        )

  return {
    restaurant_id: restaurantId,
    order_count: rows.length,
    paid_order_count: paid.length,
    revenue: revenue.toFixed(2),
    total_cost: totalCost.toFixed(2),
    gross_profit: (revenue - totalCost).toFixed(2),
    average_ticket:
      paid.length === 0 ? "0.00" : (revenue / paid.length).toFixed(2),
    average_ready_seconds: averageReadySeconds,
  }
}

function sumMoney(values: string[]): number {
  return values.reduce((sum, value) => sum + Number(value || 0), 0)
}

function assertNoCostPrice(dishes: Dish[]): void {
  for (const dish of dishes) {
    if ("cost_price" in (dish as object)) {
      throw createError({
        statusCode: 500,
        statusMessage: "Public menu must not include cost_price",
      })
    }
  }
}
