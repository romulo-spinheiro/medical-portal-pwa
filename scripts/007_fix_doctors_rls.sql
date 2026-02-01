-- Enable RLS (just in case)
alter table public.doctors enable row level security;

-- Drop existing update policy if it exists (sanity check)
drop policy if exists "doctors_update_own" on public.doctors;
drop policy if exists "Users can update their own doctors" on public.doctors;

-- Create missing UPDATE policy
create policy "doctors_update_own" 
on public.doctors for update 
using (auth.uid() = user_id);
