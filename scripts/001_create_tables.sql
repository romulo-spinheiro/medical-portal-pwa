-- Create profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar text not null default 'U',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Create doctors table
create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  specialty text not null,
  crm text not null,
  avatar text not null default 'DR',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.doctors enable row level security;

create policy "doctors_select_own" on public.doctors for select using (auth.uid() = user_id);
create policy "doctors_insert_own" on public.doctors for insert with check (auth.uid() = user_id);
create policy "doctors_update_own" on public.doctors for update using (auth.uid() = user_id);
create policy "doctors_delete_own" on public.doctors for delete using (auth.uid() = user_id);

-- Create schedules table
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  place_name text not null,
  neighborhood text not null,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.schedules enable row level security;

create policy "schedules_select_own" on public.schedules for select using (auth.uid() = user_id);
create policy "schedules_insert_own" on public.schedules for insert with check (auth.uid() = user_id);
create policy "schedules_update_own" on public.schedules for update using (auth.uid() = user_id);
create policy "schedules_delete_own" on public.schedules for delete using (auth.uid() = user_id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', 'Usuário'),
    coalesce(upper(left(new.raw_user_meta_data ->> 'name', 1)), 'U')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
