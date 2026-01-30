-- Create specialties table
create table if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Create neighborhoods table
create table if not exists public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Enable RLS on specialties
alter table public.specialties enable row level security;

-- Specialties policies - all authenticated users can see all specialties
create policy "specialties_select_all" on public.specialties for select to authenticated using (true);
create policy "specialties_insert_own" on public.specialties for insert to authenticated with check (auth.uid() = user_id);

-- Enable RLS on neighborhoods
alter table public.neighborhoods enable row level security;

-- Neighborhoods policies - all authenticated users can see all neighborhoods
create policy "neighborhoods_select_all" on public.neighborhoods for select to authenticated using (true);
create policy "neighborhoods_insert_own" on public.neighborhoods for insert to authenticated with check (auth.uid() = user_id);

-- Add avatar_url column to profiles table
alter table public.profiles add column if not exists avatar_url text;

-- Create storage bucket for avatars (run manually if needed)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
