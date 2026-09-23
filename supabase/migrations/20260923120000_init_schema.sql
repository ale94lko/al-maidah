-- MVP-02: multi-tenant menu, orders, kitchen, and statistics schema.
-- Money columns use numeric (never floating point).
-- RLS is enabled with no open write policies for orders; server routes
-- (service role) perform inserts/updates (see MVP-04 / MVP-09).

create extension if not exists "pgcrypto";

create type public.order_status as enum (
  'pending',
  'in_preparation',
  'ready',
  'completed',
  'cancelled'
);

create type public.payment_status as enum (
  'pending',
  'paid',
  'refunded'
);

create type public.payment_method as enum (
  'google_pay',
  'apple_pay',
  'card',
  'cash_at_table'
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  trn text,
  currency text not null default 'AED' check (currency = 'AED'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_slug_unique unique (slug),
  constraint restaurants_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.restaurant_owners (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint restaurant_owners_restaurant_user_unique unique (restaurant_id, user_id)
);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_number integer not null check (table_number > 0),
  label text,
  created_at timestamptz not null default now(),
  constraint tables_restaurant_number_unique unique (restaurant_id, table_number)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  cost_price numeric(12, 2) not null check (cost_price >= 0),
  photo_url text,
  is_available boolean not null default true,
  allergens text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  is_required boolean not null default false,
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint modifier_groups_select_bounds check (min_select <= max_select)
);

create table public.modifier_options (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups (id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  price_extra numeric(12, 2) not null default 0 check (price_extra >= 0),
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id uuid not null references public.tables (id) on delete restrict,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  payment_method public.payment_method,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  vat numeric(12, 2) not null default 0 check (vat >= 0),
  tip numeric(12, 2) not null default 0 check (tip >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  total_cost numeric(12, 2) not null default 0 check (total_cost >= 0),
  gateway_reference text,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name_en text not null,
  name_ar text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  notes text not null default '',
  selected_options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index restaurants_slug_idx on public.restaurants (slug);
create index restaurant_owners_user_id_idx on public.restaurant_owners (user_id);
create index restaurant_owners_restaurant_id_idx on public.restaurant_owners (restaurant_id);
create index tables_restaurant_id_idx on public.tables (restaurant_id);
create index categories_restaurant_id_idx on public.categories (restaurant_id);
create index categories_sort_idx on public.categories (restaurant_id, sort_order);
create index menu_items_restaurant_id_idx on public.menu_items (restaurant_id);
create index menu_items_category_id_idx on public.menu_items (category_id);
create index menu_items_available_idx on public.menu_items (restaurant_id, is_available);
create index modifier_groups_menu_item_id_idx on public.modifier_groups (menu_item_id);
create index modifier_options_group_id_idx on public.modifier_options (modifier_group_id);
create index orders_restaurant_id_idx on public.orders (restaurant_id);
create index orders_status_idx on public.orders (restaurant_id, status);
create index orders_created_at_idx on public.orders (restaurant_id, created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_restaurant_id_idx on public.order_items (restaurant_id);

-- RLS: deny-by-default. Public/anon writes to orders are intentionally absent.
alter table public.restaurants enable row level security;
alter table public.restaurant_owners enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.modifier_groups enable row level security;
alter table public.modifier_options enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on table public.restaurants from anon, authenticated;
revoke all on table public.restaurant_owners from anon, authenticated;
revoke all on table public.tables from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.menu_items from anon, authenticated;
revoke all on table public.modifier_groups from anon, authenticated;
revoke all on table public.modifier_options from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;

comment on table public.orders is
  'Order writes go through server routes with the service role; no open anon INSERT policy.';
comment on column public.menu_items.cost_price is
  'Internal cost; must not be exposed on the public guest menu API (MVP-04).';
comment on column public.order_items.selected_options is
  'Snapshot of chosen modifiers at sale time: [{id, name_en, name_ar, price_extra}].';
