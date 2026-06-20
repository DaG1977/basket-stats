-- Cleanup legacy columns from public.players.
-- Preconditions already verified:
-- - runtime uses full_name
-- - first_name / last_name do not carry active data

alter table public.players
drop column if exists first_name,
drop column if exists last_name;

