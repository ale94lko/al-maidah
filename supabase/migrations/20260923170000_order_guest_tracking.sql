-- MVP-12: guest tracking token so status fetches stay scoped and non-leaky.

alter table public.orders
  add column if not exists guest_access_token uuid not null default gen_random_uuid();

create unique index if not exists orders_guest_access_token_uidx
  on public.orders (guest_access_token);

comment on column public.orders.guest_access_token is
  'Opaque capability token returned to the guest for live status tracking.';
