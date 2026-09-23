/** Shared domain types for the Al-Maidah MVP surfaces. */

export interface ProductSurface {
  audience: string
  title: string
  description: string
  route: string
}

export type OrderStatus =
  | "pending"
  | "in_preparation"
  | "ready"
  | "completed"
  | "cancelled"

export type PaymentStatus = "pending" | "paid" | "refunded"

export type PaymentMethod =
  | "google_pay"
  | "apple_pay"
  | "card"
  | "cash_at_table"

export interface Restaurant {
  id: string
  name: string
  slug: string
  trn: string | null
  currency: "AED"
  created_at: string
  updated_at: string
}

export interface DiningTable {
  id: string
  restaurant_id: string
  table_number: number
  label: string | null
  created_at: string
}

export interface Category {
  id: string
  restaurant_id: string
  name_en: string
  name_ar: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** Full menu item row, including internal cost (admin / server only). */
export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name_en: string
  name_ar: string
  description_en: string
  description_ar: string
  price: string
  cost_price: string
  photo_url: string | null
  is_available: boolean
  is_vegetarian: boolean
  allergens: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

/** Guest-facing dish: never includes cost_price. */
export type Dish = Omit<MenuItem, "cost_price">

export interface ModifierGroup {
  id: string
  restaurant_id: string
  menu_item_id: string
  name_en: string
  name_ar: string
  is_required: boolean
  min_select: number
  max_select: number
  sort_order: number
  created_at: string
}

export interface ModifierOption {
  id: string
  restaurant_id: string
  modifier_group_id: string
  name_en: string
  name_ar: string
  price_extra: string
  sort_order: number
  is_available: boolean
  created_at: string
}

export interface ModifierGroupWithOptions extends ModifierGroup {
  options: ModifierOption[]
}

export interface SelectedModifierOption {
  id: string
  name_en: string
  name_ar: string
  price_extra: string
}

export interface CartItem {
  menu_item_id: string
  name_en: string
  name_ar: string
  unit_price: string
  quantity: number
  notes: string
  selected_options: SelectedModifierOption[]
}

export interface Order {
  id: string
  restaurant_id: string
  table_id: string
  guest_name: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  subtotal: string
  vat: string
  tip: string
  total: string
  total_cost: string
  gateway_reference: string | null
  created_at: string
  ready_at: string | null
  updated_at: string
}

/** Guest-facing order payload: never includes total_cost, unit_cost, or gateway secrets. */
export interface PublicOrder {
  id: string
  restaurant_id: string
  table_id: string
  guest_name: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  guest_access_token: string
  subtotal: string
  vat: string
  tip: string
  total: string
  created_at: string
  ready_at: string | null
  table_number: number | null
  restaurant_slug: string | null
}

export interface PublicOrderItem {
  id: string
  menu_item_id: string | null
  name_en: string
  name_ar: string
  quantity: number
  unit_price: string
  notes: string
  selected_options: SelectedModifierOption[]
}

export interface OrderItem {
  id: string
  restaurant_id: string
  order_id: string
  menu_item_id: string | null
  name_en: string
  name_ar: string
  quantity: number
  unit_price: string
  unit_cost: string
  notes: string
  selected_options: SelectedModifierOption[]
  created_at: string
}

export interface RestaurantStatistics {
  restaurant_id: string
  order_count: number
  paid_order_count: number
  revenue: string
  total_cost: string
  gross_profit: string
  average_ticket: string
  average_ready_seconds: number | null
}

export interface PublicMenu {
  restaurant: Pick<Restaurant, "id" | "name" | "slug" | "trn" | "currency">
  categories: Category[]
  dishes: Dish[]
  modifiers: ModifierGroupWithOptions[]
}
