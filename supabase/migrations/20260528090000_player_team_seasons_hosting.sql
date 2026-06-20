alter table public.player_team_seasons
add column if not exists assignment_type text not null default 'regular',
add column if not exists source_club_name text,
add column if not exists notes text;

alter table public.player_team_seasons
drop constraint if exists player_team_seasons_assignment_type_check;

alter table public.player_team_seasons
add constraint player_team_seasons_assignment_type_check
check (assignment_type in ('regular', 'hosting_in'));
