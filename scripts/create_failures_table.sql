-- Create skylinetragedy_failures table if it doesn't exist
create table if not exists skylinetragedy_failures (
  failure_code text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add missing columns to skylinetragedy_failures if they don't exist
alter table skylinetragedy_failures 
  add column if not exists system text,
  add column if not exists component text,
  add column if not exists failure_mode text,
  add column if not exists description text,
  add column if not exists dependencies jsonb default '[]'::jsonb,
  add column if not exists conditions jsonb default '[]'::jsonb,
  add column if not exists edges jsonb default '[]'::jsonb,
  add column if not exists observed_effects jsonb default '[]'::jsonb,
  add column if not exists source text,
  add column if not exists applicability jsonb default '["GENERAL"]'::jsonb,
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Enable Row Level Security (RLS)
alter table skylinetragedy_failures enable row level security;

-- Create policy to allow public read access (idempotent: drop first if exists)
drop policy if exists "Allow public read access" on skylinetragedy_failures;
create policy "Allow public read access" on skylinetragedy_failures
  for select using (true);

-- Create policy to allow authenticated users (service role) to insert/update (idempotent: drop first if exists)
drop policy if exists "Allow service role to insert/update" on skylinetragedy_failures;
create policy "Allow service role to insert/update" on skylinetragedy_failures
  for all using (true) with check (true);

-- Create skylinetragedy_failure_edges table for cascade links
create table if not exists skylinetragedy_failure_edges (
  id uuid default gen_random_uuid() primary key,
  source_failure_code text not null references skylinetragedy_failures(failure_code),
  target_failure_code text not null references skylinetragedy_failures(failure_code),
  condition_logic jsonb default '{}'::jsonb, -- e.g. { "var": "hydraulic_pressure", "op": "<", "val": 500 }
  time_delay_seconds numeric default 0, -- Time required for cascade to trigger
  probability numeric default 1.0, -- Probability of cascade occurring given conditions met
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure all columns exist in skylinetragedy_failure_edges (idempotent)
alter table skylinetragedy_failure_edges
  add column if not exists source_failure_code text not null references skylinetragedy_failures(failure_code),
  add column if not exists target_failure_code text not null references skylinetragedy_failures(failure_code),
  add column if not exists condition_logic jsonb default '{}'::jsonb,
  add column if not exists time_delay_seconds numeric default 0,
  add column if not exists probability numeric default 1.0,
  add column if not exists description text,
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Remove duplicates from skylinetragedy_failure_edges before adding unique constraint
delete from skylinetragedy_failure_edges a using skylinetragedy_failure_edges b
where a.id < b.id 
  and a.source_failure_code = b.source_failure_code 
  and a.target_failure_code = b.target_failure_code;

-- Add Unique Constraint to prevent duplicate edges
alter table skylinetragedy_failure_edges
  drop constraint if exists unique_failure_edge;
  
alter table skylinetragedy_failure_edges
  add constraint unique_failure_edge unique (source_failure_code, target_failure_code);

-- Create skylinetragedy_failure_effects table for physical/simulation consequences
create table if not exists skylinetragedy_failure_effects (
  id uuid default gen_random_uuid() primary key,
  failure_code text not null references skylinetragedy_failures(failure_code),
  effect_type text not null, -- e.g. 'PHYSICS_MOD', 'SYSTEM_STATE', 'COCKPIT_INDICATION'
  parameters jsonb default '{}'::jsonb, -- e.g. { "drag_coefficient_delta": 0.05, "thrust_loss_percent": 100 }
  simulation_logic text, -- Optional script or formula identifier
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure all columns exist in skylinetragedy_failure_effects (idempotent)
alter table skylinetragedy_failure_effects
  add column if not exists failure_code text not null references skylinetragedy_failures(failure_code),
  add column if not exists effect_type text,
  add column if not exists parameters jsonb default '{}'::jsonb,
  add column if not exists simulation_logic text,
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Remove duplicates from skylinetragedy_failure_effects before adding unique constraint
delete from skylinetragedy_failure_effects a using skylinetragedy_failure_effects b
where a.id < b.id 
  and a.failure_code = b.failure_code 
  and a.effect_type = b.effect_type;

-- Add Unique Constraint to prevent duplicate effects
alter table skylinetragedy_failure_effects
  drop constraint if exists unique_failure_effect;

alter table skylinetragedy_failure_effects
  add constraint unique_failure_effect unique (failure_code, effect_type);

-- Enable RLS for new tables
alter table skylinetragedy_failure_edges enable row level security;
alter table skylinetragedy_failure_effects enable row level security;

-- Public Read Policies for new tables
drop policy if exists "Allow public read access" on skylinetragedy_failure_edges;
create policy "Allow public read access" on skylinetragedy_failure_edges for select using (true);

drop policy if exists "Allow public read access" on skylinetragedy_failure_effects;
create policy "Allow public read access" on skylinetragedy_failure_effects for select using (true);

-- Service Role Write Policies for new tables
drop policy if exists "Allow service role to insert/update" on skylinetragedy_failure_edges;
create policy "Allow service role to insert/update" on skylinetragedy_failure_edges for all using (true) with check (true);

drop policy if exists "Allow service role to insert/update" on skylinetragedy_failure_effects;
create policy "Allow service role to insert/update" on skylinetragedy_failure_effects for all using (true) with check (true);

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
