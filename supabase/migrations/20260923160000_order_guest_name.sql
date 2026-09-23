-- MVP-09: optional guest name on orders for checkout.

alter table public.orders
  add column if not exists guest_name text;

comment on column public.orders.guest_name is
  'Optional guest display name captured at checkout.';
