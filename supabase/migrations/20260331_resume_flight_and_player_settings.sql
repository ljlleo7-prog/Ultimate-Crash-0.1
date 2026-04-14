-- Resume flight and player settings migration

create extension if not exists pgcrypto;

create table if not exists public.flight_saves (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    status text not null default 'active' check (status in ('active', 'discarded')),
    save_type text not null default 'manual' check (save_type in ('manual', 'autosave')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.player_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    auto_save_enabled boolean not null default true,
    auto_save_interval_minutes integer not null default 5 check (auto_save_interval_minutes between 1 and 60),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.flight_saves enable row level security;
alter table public.player_settings enable row level security;

create index if not exists idx_flight_saves_user_status_updated_at
    on public.flight_saves (user_id, status, updated_at desc);

create unique index if not exists idx_flight_saves_one_active_per_user
    on public.flight_saves (user_id)
    where status = 'active';

drop policy if exists flight_saves_select_own on public.flight_saves;
create policy flight_saves_select_own
    on public.flight_saves for select
    using (auth.uid() = user_id);

drop policy if exists flight_saves_insert_own on public.flight_saves;
create policy flight_saves_insert_own
    on public.flight_saves for insert
    with check (auth.uid() = user_id);

drop policy if exists flight_saves_update_own on public.flight_saves;
create policy flight_saves_update_own
    on public.flight_saves for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists player_settings_select_own on public.player_settings;
create policy player_settings_select_own
    on public.player_settings for select
    using (auth.uid() = user_id);

drop policy if exists player_settings_insert_own on public.player_settings;
create policy player_settings_insert_own
    on public.player_settings for insert
    with check (auth.uid() = user_id);

drop policy if exists player_settings_update_own on public.player_settings;
create policy player_settings_update_own
    on public.player_settings for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

grant select, insert, update on public.flight_saves to authenticated;
grant select, insert, update on public.player_settings to authenticated;
