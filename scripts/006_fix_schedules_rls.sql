-- Drop existing policies to ensure a clean slate (names might vary, so dropping by known names or just ensuring new ones)
drop policy if exists "Schedules visibility" on public.schedules;
drop policy if exists "Schedules insert" on public.schedules;
drop policy if exists "schedules_select_own" on public.schedules;
drop policy if exists "schedules_insert_own" on public.schedules;
drop policy if exists "schedules_update_own" on public.schedules;
drop policy if exists "schedules_delete_own" on public.schedules;

-- Re-enable RLS just in case
alter table public.schedules enable row level security;

-- Create comprehensive policies using the new user_id column
-- 1. SELECT: Users can see their own schedules
create policy "schedules_select_own" 
on public.schedules for select 
using (auth.uid() = user_id);

-- 2. INSERT: Users can insert schedules for themselves
create policy "schedules_insert_own" 
on public.schedules for insert 
with check (auth.uid() = user_id);

-- 3. UPDATE: Users can update their own schedules
create policy "schedules_update_own" 
on public.schedules for update 
using (auth.uid() = user_id);

-- 4. DELETE: Users can delete their own schedules
create policy "schedules_delete_own" 
on public.schedules for delete 
using (auth.uid() = user_id);
