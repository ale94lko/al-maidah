import type { SupabaseClient, User } from "@supabase/supabase-js"
import { isSuperAdmin, slugifyRestaurantName } from "~/server/utils/auth"

export type CreateOwnerAccountInput = {
  email: string
  password: string
  restaurantName: string
  slug?: string | null
  trn?: string | null
}

export type OwnerRestaurant = {
  id: string
  name: string
  slug: string
  trn: string | null
  currency: string
  created_at: string
  updated_at: string
}

export type CreateOwnerAccountResult = {
  user: { id: string; email: string }
  restaurant: OwnerRestaurant
}

/**
 * Create an owner auth user + restaurant + ownership row.
 * Caller must already be authorized (superadmin).
 */
export async function createOwnerAccount(
  admin: SupabaseClient,
  input: CreateOwnerAccountInput,
): Promise<CreateOwnerAccountResult> {
  const email = input.email.trim().toLowerCase()
  const password = input.password
  const restaurantName = input.restaurantName.trim()
  const trn = input.trn?.trim() || null
  const slugInput = input.slug?.trim().toLowerCase()

  if (!email || !password || !restaurantName) {
    throw createError({
      statusCode: 400,
      statusMessage: "email, password, and restaurantName are required",
    })
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password must be at least 8 characters",
    })
  }

  const slug = slugInput || slugifyRestaurantName(restaurantName)
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid restaurant slug",
    })
  }

  const { data: existing } = await admin
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: "Restaurant slug is already taken",
    })
  }

  const { data: createdUser, error: userError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "owner" },
    })

  if (userError || !createdUser.user) {
    throw createError({
      statusCode: 400,
      statusMessage: userError?.message || "Could not create user",
    })
  }

  const userId = createdUser.user.id

  const { data: restaurant, error: restaurantError } = await admin
    .from("restaurants")
    .insert({
      name: restaurantName,
      slug,
      trn,
      currency: "AED",
    })
    .select("id, name, slug, trn, currency, created_at, updated_at")
    .single()

  if (restaurantError || !restaurant) {
    await admin.auth.admin.deleteUser(userId)
    throw createError({
      statusCode: 500,
      statusMessage: restaurantError?.message || "Could not create restaurant",
    })
  }

  const { error: ownerError } = await admin.from("restaurant_owners").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
  })

  if (ownerError) {
    await admin.from("restaurants").delete().eq("id", restaurant.id)
    await admin.auth.admin.deleteUser(userId)
    throw createError({
      statusCode: 500,
      statusMessage: ownerError.message,
    })
  }

  return {
    user: { id: userId, email },
    restaurant: restaurant as OwnerRestaurant,
  }
}

export async function listAuthUsers(admin: SupabaseClient): Promise<User[]> {
  const users: User[] = []
  let page = 1
  const perPage = 100

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to list users: ${error.message}`,
      })
    }
    users.push(...(data.users ?? []))
    if ((data.users ?? []).length < perPage) {
      break
    }
    page += 1
  }

  return users
}

export async function restaurantsForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<OwnerRestaurant[]> {
  const { data, error } = await admin
    .from("restaurant_owners")
    .select(
      "restaurant_id, restaurants(id, name, slug, trn, currency, created_at, updated_at)",
    )
    .eq("user_id", userId)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load ownerships: ${error.message}`,
    })
  }

  return (data ?? []).flatMap((row) => {
    const linked = row.restaurants
    if (!linked) {
      return []
    }
    const list = Array.isArray(linked) ? linked : [linked]
    return list as OwnerRestaurant[]
  })
}

/**
 * Delete an owner account. Removes restaurants with no order history;
 * restaurants that still have orders are left in place (ownership row goes away
 * when the auth user is deleted).
 */
export async function deleteOwnerAccount(
  admin: SupabaseClient,
  userId: string,
  actingUserId: string,
): Promise<{ deleted_restaurants: string[]; kept_restaurants: string[] }> {
  if (userId === actingUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: "You cannot delete your own account",
    })
  }

  const { data: target, error: getError } =
    await admin.auth.admin.getUserById(userId)
  if (getError || !target.user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    })
  }

  if (isSuperAdmin(target.user)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cannot delete a superadmin account",
    })
  }

  const restaurants = await restaurantsForUser(admin, userId)
  const deleted_restaurants: string[] = []
  const kept_restaurants: string[] = []

  for (const restaurant of restaurants) {
    const { count, error: countError } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id)

    if (countError) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to check orders: ${countError.message}`,
      })
    }

    if ((count ?? 0) > 0) {
      kept_restaurants.push(restaurant.id)
      continue
    }

    const { error: deleteRestError } = await admin
      .from("restaurants")
      .delete()
      .eq("id", restaurant.id)

    if (deleteRestError) {
      kept_restaurants.push(restaurant.id)
    } else {
      deleted_restaurants.push(restaurant.id)
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
  if (deleteUserError) {
    throw createError({
      statusCode: 500,
      statusMessage: deleteUserError.message,
    })
  }

  return { deleted_restaurants, kept_restaurants }
}
