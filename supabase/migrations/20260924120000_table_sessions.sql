-- Table visit sessions: staff opens a seating; QR is per-visit; closes on pay.

create table if not exists public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id uuid not null references public.tables (id) on delete cascade,
  token text not null,
  status text not null default 'open'
    check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_reason text
    check (closed_reason is null or closed_reason in ('paid', 'manual')),
  constraint table_sessions_token_unique unique (token)
);

comment on table public.table_sessions is
  'Per-visit dining session. Guest QR uses token; closes when the bill is paid or staff closes.';

create unique index if not exists table_sessions_one_open_per_table_uidx
  on public.table_sessions (table_id)
  where status = 'open';

create index if not exists table_sessions_restaurant_status_idx
  on public.table_sessions (restaurant_id, status);

create index if not exists table_sessions_table_id_idx
  on public.table_sessions (table_id);

alter table public.orders
  add column if not exists table_session_id uuid references public.table_sessions (id) on delete set null;

create index if not exists orders_table_session_id_idx
  on public.orders (table_session_id);

alter table public.table_sessions enable row level security;

-- Owners can read sessions for their restaurants (admin UI).
create policy table_sessions_owner_select
  on public.table_sessions
  for select
  to authenticated
  using (public.is_restaurant_owner(restaurant_id));

-- Mutations go through service-role API routes (no direct client writes).
revoke all on table public.table_sessions from anon;
grant select on table public.table_sessions to authenticated;
