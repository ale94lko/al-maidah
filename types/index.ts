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
