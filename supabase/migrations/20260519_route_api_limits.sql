create table if not exists public.route_api_call_limits (
  user_id uuid not null,
  window_start timestamptz not null,
  call_count integer not null default 0,
  primary key (user_id, window_start)
);

alter table public.route_api_call_limits enable row level security;

drop policy if exists "Users can read own route limits" on public.route_api_call_limits;
create policy "Users can read own route limits"
  on public.route_api_call_limits
  for select
  using (auth.uid() = user_id);

create table if not exists public.route_api_call_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  origin text,
  destination text,
  status text not null,
  charged_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.route_api_call_logs enable row level security;

drop policy if exists "Users can read own route API logs" on public.route_api_call_logs;
create policy "Users can read own route API logs"
  on public.route_api_call_logs
  for select
  using (auth.uid() = user_id);
