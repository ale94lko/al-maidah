-- MVP-16: soft-deactivate tables so historical orders stay, but new scans are blocked.

alter table public.tables
  add column if not exists is_active boolean not null default true;

alter table public.tables
  add column if not exists deactivated_at timestamptz;

comment on column public.tables.is_active is
  'Inactive tables keep order history but cannot receive new guest orders.';

-- Allow the same table_number again only among active rows.
alter table public.tables
  drop constraint if exists tables_restaurant_number_unique;

create unique index if not exists tables_restaurant_active_number_uidx
  on public.tables (restaurant_id, table_number)
  where is_active;

create index if not exists tables_restaurant_active_idx
  on public.tables (restaurant_id)
  where is_active;

grant select (
  id,
  restaurant_id,
  table_number,
  label,
  is_active,
  deactivated_at,
  created_at
) on table public.tables to anon, authenticated;

grant insert (
  id,
  restaurant_id,
  table_number,
  label,
  is_active,
  deactivated_at,
  created_at
) on table public.tables to authenticated;

grant update (
  table_number,
  label,
  is_active,
  deactivated_at
) on table public.tables to authenticated;

-- Guests only resolve active tables for QR scans.
drop policy if exists tables_public_select on public.tables;
create policy tables_public_select
  on public.tables
  for select
  to anon, authenticated
  using (
    is_active = true
    or public.is_restaurant_owner(restaurant_id)
  );
