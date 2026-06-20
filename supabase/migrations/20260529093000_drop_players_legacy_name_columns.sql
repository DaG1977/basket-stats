-- Remove unused legacy name columns from public.players.
-- The active runtime model uses public.players.full_name.

alter table public.players
drop column if exists first_name,
drop column if exists last_name;

