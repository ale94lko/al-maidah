-- MVP-07: vegetarian flag for guest filters, and allow guests to see sold-out dishes.

alter table public.menu_items
  add column if not exists is_vegetarian boolean not null default false;

comment on column public.menu_items.is_vegetarian is
  'Guest filter flag: dish is suitable for vegetarians when true.';

-- Column-level grants: new column must be listed explicitly for PostgREST.
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
  is_vegetarian,
  allergens,
  sort_order,
  created_at,
  updated_at
) on table public.menu_items to anon, authenticated;

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
  is_vegetarian,
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
  is_vegetarian,
  allergens,
  sort_order,
  updated_at
) on table public.menu_items to authenticated;

-- Guests may read sold-out rows so the UI can show a sold-out mark.
drop policy if exists menu_items_anon_select on public.menu_items;
create policy menu_items_anon_select
  on public.menu_items
  for select
  to anon
  using (true);
