-- Platform admin analytics: page views and client/server error events.

create table if not exists public.platform_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in ('page_view', 'error')),
  path text not null default '',
  message text,
  visitor_id text,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.platform_events is
  'Anonymous platform telemetry for the superadmin dashboard (visits and errors).';

create index if not exists platform_events_kind_created_idx
  on public.platform_events (kind, created_at desc);

create index if not exists platform_events_created_idx
  on public.platform_events (created_at desc);

create index if not exists platform_events_path_created_idx
  on public.platform_events (path, created_at desc);

alter table public.platform_events enable row level security;

-- No direct client access; inserts go through the service-role API route.
revoke all on table public.platform_events from anon, authenticated;
