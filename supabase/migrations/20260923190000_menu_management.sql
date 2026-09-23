-- MVP-15: archive flags, hide sold-out from guests, restaurant-scoped menu photo storage.

alter table public.categories
  add column if not exists is_archived boolean not null default false;

alter table public.categories
  add column if not exists archived_at timestamptz;

alter table public.menu_items
  add column if not exists is_archived boolean not null default false;

alter table public.menu_items
  add column if not exists archived_at timestamptz;

comment on column public.categories.is_archived is
  'Soft-archive: hidden from the public menu, kept for owners.';
comment on column public.menu_items.is_archived is
  'Soft-archive: hidden from the public menu, kept for owners.';

create index if not exists categories_restaurant_active_sort_idx
  on public.categories (restaurant_id, sort_order)
  where not is_archived;

create index if not exists menu_items_restaurant_active_sort_idx
  on public.menu_items (restaurant_id, sort_order)
  where not is_archived;

-- Column grants for the new archive fields (PostgREST column-level).
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
  is_archived,
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
  is_archived,
  archived_at,
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
  is_archived,
  archived_at,
  allergens,
  sort_order,
  updated_at
) on table public.menu_items to authenticated;

grant select (
  id,
  restaurant_id,
  name_en,
  name_ar,
  sort_order,
  is_archived,
  archived_at,
  created_at,
  updated_at
) on table public.categories to anon, authenticated;

grant insert, update on table public.categories to authenticated;

-- Guests only see available, non-archived dishes (MVP-15 Done when).
drop policy if exists menu_items_anon_select on public.menu_items;
create policy menu_items_anon_select
  on public.menu_items
  for select
  to anon
  using (is_available = true and is_archived = false);

drop policy if exists menu_items_authenticated_select on public.menu_items;
create policy menu_items_authenticated_select
  on public.menu_items
  for select
  to authenticated
  using (
    (is_available = true and is_archived = false)
    or public.is_restaurant_owner(restaurant_id)
  );

drop policy if exists categories_public_select on public.categories;
create policy categories_public_select
  on public.categories
  for select
  to anon, authenticated
  using (
    is_archived = false
    or public.is_restaurant_owner(restaurant_id)
  );

-- Storage bucket + policies only when the Supabase storage schema exists
-- (hosted Supabase). Plain CI Postgres skips this block.
do $$
begin
  if not exists (
    select 1 from information_schema.schemata where schema_name = 'storage'
  ) then
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'menu-photos',
    'menu-photos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
  on conflict (id) do nothing;

  execute $pol$
    drop policy if exists menu_photos_public_read on storage.objects;
    create policy menu_photos_public_read
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'menu-photos');
  $pol$;

  execute $pol$
    drop policy if exists menu_photos_owner_insert on storage.objects;
    create policy menu_photos_owner_insert
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'menu-photos'
        and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
      );
  $pol$;

  execute $pol$
    drop policy if exists menu_photos_owner_update on storage.objects;
    create policy menu_photos_owner_update
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'menu-photos'
        and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
      )
      with check (
        bucket_id = 'menu-photos'
        and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
      );
  $pol$;

  execute $pol$
    drop policy if exists menu_photos_owner_delete on storage.objects;
    create policy menu_photos_owner_delete
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'menu-photos'
        and public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
      );
  $pol$;
end $$;
