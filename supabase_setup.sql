
-- Create a table for flight saves
create table if not exists public.flight_saves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  data jsonb not null,
  status text default 'active' check (status in ('active', 'discarded', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.flight_saves enable row level security;

-- Create policies
create policy "Users can view their own saves"
  on public.flight_saves for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saves"
  on public.flight_saves for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own saves"
  on public.flight_saves for update
  using (auth.uid() = user_id);

-- Optional: Create a function to update 'updated_at' automatically
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_flight_saves_updated_at
    before update on public.flight_saves
    for each row
    execute procedure update_updated_at_column();
