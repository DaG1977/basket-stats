drop view if exists public.season_player_totals;

drop table if exists public.profiles cascade;
drop table if exists public.import_files cascade;
drop table if exists public.imports cascade;
drop table if exists public.player_game_stats cascade;
drop table if exists public.game_teams cascade;
drop table if exists public.games cascade;
drop table if exists public.venues cascade;
drop table if exists public.competitions cascade;
drop table if exists public.player_team_seasons cascade;
drop table if exists public.team_seasons cascade;
drop table if exists public.players cascade;
drop table if exists public.teams cascade;
drop table if exists public.seasons cascade;
drop table if exists public.clubs cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_active_user() cascade;
drop function if exists public.set_updated_at() cascade;
