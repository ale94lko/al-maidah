import type {
  Category,
  MenuItem,
  ModifierGroupInput,
  ModifierGroupWithOptions,
} from "~/types"

type MeResponse = {
  user: { id: string; email?: string }
  restaurants: Array<{ id: string; name: string; slug: string }>
}

type AdminMenuResponse = {
  restaurant_id: string
  categories: Category[]
  items: MenuItem[]
  modifiers: ModifierGroupWithOptions[]
}

export type DishFormState = {
  id?: string
  category_id: string
  name_en: string
  name_ar: string
  description_en: string
  description_ar: string
  price: string
  cost_price: string
  photo_url: string
  is_available: boolean
  is_vegetarian: boolean
  allergens: string
  modifiers: ModifierGroupInput[]
}

/**
 * Owner menu editor: loads full menu for the selected restaurant and
 * exposes create / update / archive / sold-out / photo helpers.
 */
export function useAdminMenu() {
  const { accessToken, refreshSession } = useAuth()

  const restaurants = ref<MeResponse["restaurants"]>([])
  const restaurantId = ref<string | null>(null)
  const categories = ref<Category[]>([])
  const items = ref<MenuItem[]>([])
  const modifiers = ref<ModifierGroupWithOptions[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const errorMessage = ref("")
  const showArchived = ref(false)

  async function authHeaders() {
    const token = await accessToken()
    if (!token) {
      throw new Error("Not signed in")
    }
    return { Authorization: `Bearer ${token}` }
  }

  const visibleCategories = computed(() =>
    categories.value
      .filter((category) => showArchived.value || !category.is_archived)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order),
  )

  function itemsForCategory(categoryId: string) {
    return items.value
      .filter((item) => item.category_id === categoryId)
      .filter((item) => showArchived.value || !item.is_archived)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  function modifiersForItem(itemId: string) {
    return modifiers.value.filter((group) => group.menu_item_id === itemId)
  }

  async function loadMenu() {
    if (!restaurantId.value) {
      categories.value = []
      items.value = []
      modifiers.value = []
      return
    }
    const headers = await authHeaders()
    const menu = await $fetch<AdminMenuResponse>(
      `/api/admin/menu/${restaurantId.value}`,
      { headers },
    )
    categories.value = menu.categories ?? []
    items.value = menu.items ?? []
    modifiers.value = menu.modifiers ?? []
  }

  async function bootstrap() {
    loading.value = true
    errorMessage.value = ""
    try {
      await refreshSession()
      const headers = await authHeaders()
      const me = await $fetch<MeResponse>("/api/auth/me", { headers })
      restaurants.value = me.restaurants ?? []
      if (!restaurants.value.length) {
        restaurantId.value = null
        return
      }
      if (
        !restaurantId.value ||
        !restaurants.value.some((entry) => entry.id === restaurantId.value)
      ) {
        restaurantId.value = restaurants.value[0]?.id ?? null
      }
      await loadMenu()
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Could not load menu"
      throw error
    } finally {
      loading.value = false
    }
  }

  async function selectRestaurant(id: string) {
    restaurantId.value = id
    await loadMenu()
  }

  async function createCategory(name_en: string, name_ar: string) {
    if (!restaurantId.value) {
      return
    }
    saving.value = true
    errorMessage.value = ""
    try {
      const headers = await authHeaders()
      await $fetch(`/api/admin/menu/${restaurantId.value}/categories`, {
        method: "POST",
        headers,
        body: { name_en, name_ar },
      })
      await loadMenu()
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Could not create category"
      throw error
    } finally {
      saving.value = false
    }
  }

  async function patchCategory(
    categoryId: string,
    body: Record<string, unknown>,
  ) {
    if (!restaurantId.value) {
      return
    }
    saving.value = true
    errorMessage.value = ""
    try {
      const headers = await authHeaders()
      await $fetch(
        `/api/admin/menu/${restaurantId.value}/categories/${categoryId}`,
        { method: "PATCH", headers, body },
      )
      await loadMenu()
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Could not update category"
      throw error
    } finally {
      saving.value = false
    }
  }

  async function saveDish(form: DishFormState) {
    if (!restaurantId.value) {
      return
    }
    saving.value = true
    errorMessage.value = ""
    const body = {
      category_id: form.category_id,
      name_en: form.name_en,
      name_ar: form.name_ar,
      description_en: form.description_en,
      description_ar: form.description_ar,
      price: form.price,
      cost_price: form.cost_price,
      photo_url: form.photo_url || null,
      is_available: form.is_available,
      is_vegetarian: form.is_vegetarian,
      allergens: form.allergens
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
      modifiers: form.modifiers,
    }
    try {
      const headers = await authHeaders()
      if (form.id) {
        await $fetch(
          `/api/admin/menu/${restaurantId.value}/items/${form.id}`,
          { method: "PATCH", headers, body },
        )
      } else {
        await $fetch(`/api/admin/menu/${restaurantId.value}/items`, {
          method: "POST",
          headers,
          body,
        })
      }
      await loadMenu()
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Could not save dish"
      throw error
    } finally {
      saving.value = false
    }
  }

  async function patchDish(itemId: string, body: Record<string, unknown>) {
    if (!restaurantId.value) {
      return
    }
    saving.value = true
    errorMessage.value = ""
    try {
      const headers = await authHeaders()
      await $fetch(`/api/admin/menu/${restaurantId.value}/items/${itemId}`, {
        method: "PATCH",
        headers,
        body,
      })
      await loadMenu()
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Could not update dish"
      throw error
    } finally {
      saving.value = false
    }
  }

  async function uploadPhoto(itemId: string, file: File) {
    if (!restaurantId.value) {
      return
    }
    saving.value = true
    errorMessage.value = ""
    try {
      const headers = await authHeaders()
      const form = new FormData()
      form.append("file", file)
      await $fetch(
        `/api/admin/menu/${restaurantId.value}/items/${itemId}/photo`,
        { method: "POST", headers, body: form },
      )
      await loadMenu()
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Could not upload photo"
      throw error
    } finally {
      saving.value = false
    }
  }

  async function moveCategory(categoryId: string, direction: -1 | 1) {
    const ordered = visibleCategories.value.filter((c) => !c.is_archived)
    const index = ordered.findIndex((c) => c.id === categoryId)
    const current = ordered[index]
    const swapWith = ordered[index + direction]
    if (!current || !swapWith) {
      return
    }
    await patchCategory(categoryId, { sort_order: swapWith.sort_order })
    await patchCategory(swapWith.id, { sort_order: current.sort_order })
  }

  async function moveDish(itemId: string, direction: -1 | 1) {
    const item = items.value.find((entry) => entry.id === itemId)
    if (!item) {
      return
    }
    const ordered = itemsForCategory(item.category_id).filter((d) => !d.is_archived)
    const index = ordered.findIndex((entry) => entry.id === itemId)
    const current = ordered[index]
    const swapWith = ordered[index + direction]
    if (!current || !swapWith) {
      return
    }
    await patchDish(itemId, { sort_order: swapWith.sort_order })
    await patchDish(swapWith.id, { sort_order: current.sort_order })
  }

  function emptyDishForm(categoryId: string): DishFormState {
    return {
      category_id: categoryId,
      name_en: "",
      name_ar: "",
      description_en: "",
      description_ar: "",
      price: "0.00",
      cost_price: "0.00",
      photo_url: "",
      is_available: true,
      is_vegetarian: false,
      allergens: "",
      modifiers: [],
    }
  }

  function dishFormFromItem(item: MenuItem): DishFormState {
    return {
      id: item.id,
      category_id: item.category_id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      description_en: item.description_en,
      description_ar: item.description_ar,
      price: item.price,
      cost_price: item.cost_price,
      photo_url: item.photo_url ?? "",
      is_available: item.is_available,
      is_vegetarian: item.is_vegetarian,
      allergens: (item.allergens ?? []).join(", "),
      modifiers: modifiersForItem(item.id).map((group) => ({
        name_en: group.name_en,
        name_ar: group.name_ar,
        is_required: group.is_required,
        min_select: group.min_select,
        max_select: group.max_select,
        sort_order: group.sort_order,
        options: group.options.map((option) => ({
          name_en: option.name_en,
          name_ar: option.name_ar,
          price_extra: option.price_extra,
          sort_order: option.sort_order,
          is_available: option.is_available,
        })),
      })),
    }
  }

  return {
    restaurants,
    restaurantId,
    categories,
    items,
    modifiers,
    loading,
    saving,
    errorMessage,
    showArchived,
    visibleCategories,
    itemsForCategory,
    modifiersForItem,
    bootstrap,
    selectRestaurant,
    createCategory,
    patchCategory,
    saveDish,
    patchDish,
    uploadPhoto,
    moveCategory,
    moveDish,
    emptyDishForm,
    dishFormFromItem,
    reload: loadMenu,
  }
}
