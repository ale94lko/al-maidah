-- MVP-04: owner auth helpers, multi-tenant RLS, and public menu reads.
-- Orders remain insert-only via the service role (server routes).

create or replace function public.is_restaurant_owner(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_owners ro
    where ro.restaurant_id = p_restaurant_id
      and ro.user_id = auth.uid()
  );
$$;

revoke all on function public.is_restaurant_owner(uuid) from public;
grant execute on function public.is_restaurant_owner(uuid) to anon, authenticated;

-- Public (and signed-in guest) read access.
grant select on table public.restaurants to anon, authenticated;
grant select on table public.tables to anon, authenticated;
grant select on table public.categories to anon, authenticated;
grant select on table public.modifier_groups to anon, authenticated;
grant select on table public.modifier_options to anon, authenticated;

-- Guests (anon + authenticated) never receive preparation cost via PostgREST.
-- Owners load cost_price through server routes that use the service role.
grant select (
  id,
  restaurant_id,
  category_id,
  name_en,
  name_ar,
  description_en,
  description_ar,
  price,
  photo_url,
  is_available,
  allergens,
  sort_order,
  created_at,
  updated_at
) on table public.menu_items to anon, authenticated;

-- Owner writes for menu / tables / profile (cost_price writable for owners).
grant insert, update, delete on table public.tables to authenticated;
grant insert, update, delete on table public.categories to authenticated;
grant insert (
  id,
  restaurant_id,
  category_id,
  name_en,
  name_ar,
  description_en,
  description_ar,
  price,
  cost_price,
  photo_url,
  is_available,
  allergens,
  sort_order,
  created_at,
  updated_at
) on table public.menu_items to authenticated;
grant update (
  category_id,
  name_en,
  name_ar,
  description_en,
  description_ar,
  price,
  cost_price,
  photo_url,
  is_available,
  allergens,
  sort_order,
  updated_at
) on table public.menu_items to authenticated;
grant delete on table public.menu_items to authenticated;
grant insert, update, delete on table public.modifier_groups to authenticated;
grant insert, update, delete on table public.modifier_options to authenticated;
grant update on table public.restaurants to authenticated;

grant select on table public.restaurant_owners to authenticated;

-- Kitchen / admin can read and update ticket status; inserts stay on the server.
grant select, update on table public.orders to authenticated;
grant select on table public.order_items to authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

-- restaurants
create policy restaurants_public_select
  on public.restaurants
  for select
  to anon, authenticated
  using (true);

create policy restaurants_owner_update
  on public.restaurants
  for update
  to authenticated
  using (public.is_restaurant_owner(id))
  with check (public.is_restaurant_owner(id));

-- restaurant_owners
create policy restaurant_owners_self_select
  on public.restaurant_owners
  for select
  to authenticated
  using (user_id = auth.uid());

-- tables
create policy tables_public_select
  on public.tables
  for select
  to anon, authenticated
  using (true);

create policy tables_owner_insert
  on public.tables
  for insert
  to authenticated
  with check (public.is_restaurant_owner(restaurant_id));

create policy tables_owner_update
  on public.tables
  for update
  to authenticated
  using (public.is_restaurant_owner(restaurant_id))
  with check (public.is_restaurant_owner(restaurant_id));

create policy tables_owner_delete
  on public.tables
  for delete
  to authenticated
  using (public.is_restaurant_owner(restaurant_id));

-- categories
create policy categories_public_select
  on public.categories
  for select
  to anon, authenticated
  using (true);

create policy categories_owner_insert
  on public.categories
  for insert
  to authenticated
  with check (public.is_restaurant_owner(restaurant_id));

create policy categories_owner_update
  on public.categories
  for update
  to authenticated
  using (public.is_restaurant_owner(restaurant_id))
  with check (public.is_restaurant_owner(restaurant_id));

create policy categories_owner_delete
  on public.categories
  for delete
  to authenticated
  using (public.is_restaurant_owner(restaurant_id));

-- menu_items
create policy menu_items_anon_select
  on public.menu_items
  for select
  to anon
  using (is_available = true);

create policy menu_items_authenticated_select
  on public.menu_items
  for select
  to authenticated
  using (
    is_available = true
    or public.is_restaurant_owner(restaurant_id)
  );

create policy menu_items_owner_insert
  on public.menu_items
  for insert
  to authenticated
  with check (public.is_restaurant_owner(restaurant_id));

create policy menu_items_owner_update
  on public.menu_items
  for update
  to authenticated
  using (public.is_restaurant_owner(restaurant_id))
  with check (public.is_restaurant_owner(restaurant_id));

create policy menu_items_owner_delete
  on public.menu_items
  for delete
  to authenticated
  using (public.is_restaurant_owner(restaurant_id));

-- modifier_groups
create policy modifier_groups_public_select
  on public.modifier_groups
  for select
  to anon, authenticated
  using (true);

create policy modifier_groups_owner_insert
  on public.modifier_groups
  for insert
  to authenticated
  with check (public.is_restaurant_owner(restaurant_id));

create policy modifier_groups_owner_update
  on public.modifier_groups
  for update
  to authenticated
  using (public.is_restaurant_owner(restaurant_id))
  with check (public.is_restaurant_owner(restaurant_id));

create policy modifier_groups_owner_delete
  on public.modifier_groups
  for delete
  to authenticated
  using (public.is_restaurant_owner(restaurant_id));

-- modifier_options
create policy modifier_options_public_select
  on public.modifier_options
  for select
  to anon, authenticated
  using (true);

create policy modifier_options_owner_insert
  on public.modifier_options
  for insert
  to authenticated
  with check (public.is_restaurant_owner(restaurant_id));

create policy modifier_options_owner_update
  on public.modifier_options
  for update
  to authenticated
  using (public.is_restaurant_owner(restaurant_id))
  with check (public.is_restaurant_owner(restaurant_id));

create policy modifier_options_owner_delete
  on public.modifier_options
  for delete
  to authenticated
  using (public.is_restaurant_owner(restaurant_id));

-- orders: no anon access; owners read/update only; no client inserts
create policy orders_owner_select
  on public.orders
  for select
  to authenticated
  using (public.is_restaurant_owner(restaurant_id));

create policy orders_owner_update
  on public.orders
  for update
  to authenticated
  using (public.is_restaurant_owner(restaurant_id))
  with check (public.is_restaurant_owner(restaurant_id));

create policy order_items_owner_select
  on public.order_items
  for select
  to authenticated
  using (public.is_restaurant_owner(restaurant_id));

comment on function public.is_restaurant_owner(uuid) is
  'True when auth.uid() owns the given restaurant via restaurant_owners.';
comment on policy orders_owner_update on public.orders is
  'Owners may update ticket status; INSERT remains service-role only (server routes).';
