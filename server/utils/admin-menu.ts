import { randomUUID } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  Category,
  MenuItem,
  ModifierGroupInput,
  ModifierGroupWithOptions,
  ModifierOption,
  ModifierOptionInput,
} from "~/types"

const MENU_ITEM_COLUMNS =
  "id, restaurant_id, category_id, name_en, name_ar, description_en, description_ar, price, cost_price, photo_url, is_available, is_vegetarian, is_archived, archived_at, allergens, sort_order, created_at, updated_at"

const CATEGORY_COLUMNS =
  "id, restaurant_id, name_en, name_ar, sort_order, is_archived, archived_at, created_at, updated_at"

export type AdminMenuPayload = {
  restaurant_id: string
  categories: Category[]
  items: MenuItem[]
  modifiers: ModifierGroupWithOptions[]
}

export type CategoryInput = {
  name_en: string
  name_ar: string
  sort_order?: number
}

export type MenuItemInput = {
  category_id: string
  name_en: string
  name_ar: string
  description_en?: string
  description_ar?: string
  price: string | number
  cost_price: string | number
  photo_url?: string | null
  is_available?: boolean
  is_vegetarian?: boolean
  allergens?: string[]
  sort_order?: number
  modifiers?: ModifierGroupInput[]
}

function requireText(value: unknown, label: string): string {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: `${label} is required` })
  }
  return text
}

function requireMoney(value: unknown, label: string): string {
  const raw = typeof value === "number" ? value : Number(String(value ?? "").trim())
  if (!Number.isFinite(raw) || raw < 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `${label} must be a non-negative number`,
    })
  }
  return raw.toFixed(2)
}

function normalizeAllergens(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return [
    ...new Set(
      value
        .map((entry) => String(entry ?? "").trim().toLowerCase())
        .filter(Boolean),
    ),
  ]
}

export async function getAdminMenu(
  client: SupabaseClient,
  restaurantId: string,
): Promise<AdminMenuPayload> {
  const [categoriesResult, itemsResult, groupsResult, optionsResult] =
    await Promise.all([
      client
        .from("categories")
        .select(CATEGORY_COLUMNS)
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true }),
      client
        .from("menu_items")
        .select(MENU_ITEM_COLUMNS)
        .eq("restaurant_id", restaurantId)
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
        .order("sort_order", { ascending: true }),
    ])

  for (const result of [
    categoriesResult,
    itemsResult,
    groupsResult,
    optionsResult,
  ]) {
    if (result.error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to load admin menu: ${result.error.message}`,
      })
    }
  }

  const optionsByGroup = new Map<string, ModifierOption[]>()
  for (const option of (optionsResult.data ?? []) as ModifierOption[]) {
    const list = optionsByGroup.get(option.modifier_group_id) ?? []
    list.push({
      ...option,
      price_extra: String(option.price_extra),
    })
    optionsByGroup.set(option.modifier_group_id, list)
  }

  const modifiers: ModifierGroupWithOptions[] = (
    (groupsResult.data ?? []) as ModifierGroupWithOptions[]
  ).map((group) => ({
    ...group,
    options: optionsByGroup.get(group.id) ?? [],
  }))

  const items = ((itemsResult.data ?? []) as MenuItem[]).map((item) => ({
    ...item,
    price: String(item.price),
    cost_price: String(item.cost_price),
  }))

  return {
    restaurant_id: restaurantId,
    categories: (categoriesResult.data ?? []) as Category[],
    items,
    modifiers,
  }
}

export async function createCategory(
  client: SupabaseClient,
  restaurantId: string,
  input: CategoryInput,
): Promise<Category> {
  const name_en = requireText(input.name_en, "English name")
  const name_ar = requireText(input.name_ar, "Arabic name")
  const sort_order =
    typeof input.sort_order === "number" && Number.isFinite(input.sort_order)
      ? Math.trunc(input.sort_order)
      : await nextCategorySort(client, restaurantId)

  const { data, error } = await client
    .from("categories")
    .insert({
      restaurant_id: restaurantId,
      name_en,
      name_ar,
      sort_order,
      is_archived: false,
    })
    .select(CATEGORY_COLUMNS)
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create category: ${error?.message || "unknown"}`,
    })
  }

  return data as Category
}

export async function updateCategory(
  client: SupabaseClient,
  restaurantId: string,
  categoryId: string,
  patch: Partial<CategoryInput> & {
    is_archived?: boolean
    sort_order?: number
  },
): Promise<Category> {
  const existing = await loadCategory(client, restaurantId, categoryId)
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (patch.name_en !== undefined) {
    updates.name_en = requireText(patch.name_en, "English name")
  }
  if (patch.name_ar !== undefined) {
    updates.name_ar = requireText(patch.name_ar, "Arabic name")
  }
  if (typeof patch.sort_order === "number" && Number.isFinite(patch.sort_order)) {
    updates.sort_order = Math.trunc(patch.sort_order)
  }
  if (typeof patch.is_archived === "boolean") {
    updates.is_archived = patch.is_archived
    updates.archived_at = patch.is_archived
      ? existing.archived_at || new Date().toISOString()
      : null
  }

  const { data, error } = await client
    .from("categories")
    .update(updates)
    .eq("id", categoryId)
    .eq("restaurant_id", restaurantId)
    .select(CATEGORY_COLUMNS)
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update category: ${error?.message || "unknown"}`,
    })
  }

  return data as Category
}

export async function createMenuItem(
  client: SupabaseClient,
  restaurantId: string,
  input: MenuItemInput,
): Promise<MenuItem> {
  await assertCategoryOwned(client, restaurantId, input.category_id)

  const payload = {
    restaurant_id: restaurantId,
    category_id: input.category_id,
    name_en: requireText(input.name_en, "English name"),
    name_ar: requireText(input.name_ar, "Arabic name"),
    description_en: String(input.description_en ?? "").trim(),
    description_ar: String(input.description_ar ?? "").trim(),
    price: requireMoney(input.price, "Price"),
    cost_price: requireMoney(input.cost_price, "Cost"),
    photo_url: input.photo_url?.trim() || null,
    is_available: input.is_available !== false,
    is_vegetarian: Boolean(input.is_vegetarian),
    is_archived: false,
    allergens: normalizeAllergens(input.allergens),
    sort_order:
      typeof input.sort_order === "number" && Number.isFinite(input.sort_order)
        ? Math.trunc(input.sort_order)
        : await nextItemSort(client, restaurantId, input.category_id),
  }

  const { data, error } = await client
    .from("menu_items")
    .insert(payload)
    .select(MENU_ITEM_COLUMNS)
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create dish: ${error?.message || "unknown"}`,
    })
  }

  const item = {
    ...(data as MenuItem),
    price: String(data.price),
    cost_price: String(data.cost_price),
  }

  if (input.modifiers?.length) {
    await replaceModifiers(client, restaurantId, item.id, input.modifiers)
  }

  return item
}

export async function updateMenuItem(
  client: SupabaseClient,
  restaurantId: string,
  itemId: string,
  patch: Partial<MenuItemInput> & {
    is_archived?: boolean
  },
): Promise<MenuItem> {
  const existing = await loadMenuItem(client, restaurantId, itemId)
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (patch.category_id !== undefined) {
    await assertCategoryOwned(client, restaurantId, patch.category_id)
    updates.category_id = patch.category_id
  }
  if (patch.name_en !== undefined) {
    updates.name_en = requireText(patch.name_en, "English name")
  }
  if (patch.name_ar !== undefined) {
    updates.name_ar = requireText(patch.name_ar, "Arabic name")
  }
  if (patch.description_en !== undefined) {
    updates.description_en = String(patch.description_en ?? "").trim()
  }
  if (patch.description_ar !== undefined) {
    updates.description_ar = String(patch.description_ar ?? "").trim()
  }
  if (patch.price !== undefined) {
    updates.price = requireMoney(patch.price, "Price")
  }
  if (patch.cost_price !== undefined) {
    updates.cost_price = requireMoney(patch.cost_price, "Cost")
  }
  if (patch.photo_url !== undefined) {
    updates.photo_url = patch.photo_url?.trim() || null
  }
  if (typeof patch.is_available === "boolean") {
    updates.is_available = patch.is_available
  }
  if (typeof patch.is_vegetarian === "boolean") {
    updates.is_vegetarian = patch.is_vegetarian
  }
  if (patch.allergens !== undefined) {
    updates.allergens = normalizeAllergens(patch.allergens)
  }
  if (typeof patch.sort_order === "number" && Number.isFinite(patch.sort_order)) {
    updates.sort_order = Math.trunc(patch.sort_order)
  }
  if (typeof patch.is_archived === "boolean") {
    updates.is_archived = patch.is_archived
    updates.archived_at = patch.is_archived
      ? existing.archived_at || new Date().toISOString()
      : null
  }

  const { data, error } = await client
    .from("menu_items")
    .update(updates)
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId)
    .select(MENU_ITEM_COLUMNS)
    .single()

  if (error || !data) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update dish: ${error?.message || "unknown"}`,
    })
  }

  if (patch.modifiers) {
    await replaceModifiers(client, restaurantId, itemId, patch.modifiers)
  }

  return {
    ...(data as MenuItem),
    price: String(data.price),
    cost_price: String(data.cost_price),
  }
}

export async function replaceModifiers(
  client: SupabaseClient,
  restaurantId: string,
  menuItemId: string,
  groups: ModifierGroupInput[],
): Promise<void> {
  await loadMenuItem(client, restaurantId, menuItemId)

  const { error: deleteError } = await client
    .from("modifier_groups")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("menu_item_id", menuItemId)

  if (deleteError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to clear modifiers: ${deleteError.message}`,
    })
  }

  for (const [groupIndex, group] of groups.entries()) {
    const name_en = requireText(group.name_en, "Modifier group English name")
    const name_ar = requireText(group.name_ar, "Modifier group Arabic name")
    const min_select = Math.max(0, Math.trunc(group.min_select ?? 0))
    const max_select = Math.max(
      min_select || 1,
      Math.trunc(group.max_select ?? 1),
    )

    const { data: groupRow, error: groupError } = await client
      .from("modifier_groups")
      .insert({
        restaurant_id: restaurantId,
        menu_item_id: menuItemId,
        name_en,
        name_ar,
        is_required: Boolean(group.is_required),
        min_select,
        max_select,
        sort_order:
          typeof group.sort_order === "number"
            ? Math.trunc(group.sort_order)
            : groupIndex,
      })
      .select("id")
      .single()

    if (groupError || !groupRow) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to save modifier group: ${groupError?.message || "unknown"}`,
      })
    }

    const options = group.options ?? []
    if (!options.length) {
      continue
    }

    const optionPayload = options.map((option, optionIndex) => ({
      restaurant_id: restaurantId,
      modifier_group_id: groupRow.id,
      name_en: requireText(option.name_en, "Modifier option English name"),
      name_ar: requireText(option.name_ar, "Modifier option Arabic name"),
      price_extra: requireMoney(option.price_extra ?? 0, "Modifier price"),
      sort_order:
        typeof option.sort_order === "number"
          ? Math.trunc(option.sort_order)
          : optionIndex,
      is_available: option.is_available !== false,
    }))

    const { error: optionsError } = await client
      .from("modifier_options")
      .insert(optionPayload)

    if (optionsError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to save modifier options: ${optionsError.message}`,
      })
    }
  }
}

export async function uploadMenuPhoto(
  client: SupabaseClient,
  restaurantId: string,
  itemId: string,
  file: { data: Buffer; type: string; filename: string },
): Promise<MenuItem> {
  await loadMenuItem(client, restaurantId, itemId)

  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ])
  if (!allowed.has(file.type)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Photo must be JPEG, PNG, WebP, or GIF",
    })
  }
  if (file.data.byteLength > 5 * 1024 * 1024) {
    throw createError({
      statusCode: 400,
      statusMessage: "Photo must be 5MB or smaller",
    })
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg"
  // Always prefix with restaurant id — never an unscoped shared path.
  const objectPath = `${restaurantId}/${itemId}-${randomUUID()}.${ext}`

  const { error: uploadError } = await client.storage
    .from("menu-photos")
    .upload(objectPath, file.data, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to upload photo: ${uploadError.message}`,
    })
  }

  const { data: publicUrl } = client.storage
    .from("menu-photos")
    .getPublicUrl(objectPath)

  return updateMenuItem(client, restaurantId, itemId, {
    photo_url: publicUrl.publicUrl,
  })
}

async function loadCategory(
  client: SupabaseClient,
  restaurantId: string,
  categoryId: string,
): Promise<Category> {
  const { data, error } = await client
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("id", categoryId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load category: ${error.message}`,
    })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Category not found" })
  }
  return data as Category
}

async function loadMenuItem(
  client: SupabaseClient,
  restaurantId: string,
  itemId: string,
): Promise<MenuItem> {
  const { data, error } = await client
    .from("menu_items")
    .select(MENU_ITEM_COLUMNS)
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle()

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load dish: ${error.message}`,
    })
  }
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Dish not found" })
  }
  return {
    ...(data as MenuItem),
    price: String(data.price),
    cost_price: String(data.cost_price),
  }
}

async function assertCategoryOwned(
  client: SupabaseClient,
  restaurantId: string,
  categoryId: string,
) {
  await loadCategory(client, restaurantId, categoryId)
}

async function nextCategorySort(
  client: SupabaseClient,
  restaurantId: string,
): Promise<number> {
  const { data } = await client
    .from("categories")
    .select("sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: false })
    .limit(1)
  return Number(data?.[0]?.sort_order ?? -1) + 1
}

async function nextItemSort(
  client: SupabaseClient,
  restaurantId: string,
  categoryId: string,
): Promise<number> {
  const { data } = await client
    .from("menu_items")
    .select("sort_order")
    .eq("restaurant_id", restaurantId)
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
  return Number(data?.[0]?.sort_order ?? -1) + 1
}
