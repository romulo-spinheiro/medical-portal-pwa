-- Add neighborhood_id foreign key if it (UUID) doesn't exist
alter table public.schedules 
add column if not exists neighborhood_id uuid references public.neighborhoods(id) on delete set null;

-- Add neighborhood (text) column if it doesn't exist (nullable)
alter table public.schedules 
add column if not exists neighborhood text;

-- If it already existed but was not null, make it nullable
alter table public.schedules 
alter column neighborhood drop not null;
