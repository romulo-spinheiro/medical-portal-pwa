-- Add user_id column to schedules if it doesn't exist
alter table public.schedules 
add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Backfill user_id from the parent doctor record
update public.schedules s
set user_id = d.user_id
from public.doctors d
where s.doctor_id = d.id
and s.user_id is null;

-- (Optional) If you want to enforce it for future rows, you'd make it NOT NULL
-- But we can leave it nullable for safety during migration, or enforce it now:
-- alter table public.schedules alter column user_id set not null;

-- Refresh schema cache (usually happens automatically on DDL, but good to know)
notify pgrst, 'reload config';
