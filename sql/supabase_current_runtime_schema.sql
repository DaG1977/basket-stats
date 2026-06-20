-- Canonical runtime schema for the current importer-ui application.
-- This file reflects the data model actually used by:
-- - importer-ui/server.js
-- - sql/supabase_core_structure.sql
-- - sql/supabase_games_basic.sql
-- - sql/supabase_games_stats.sql
--
-- Legacy files such as supabase_basketball_schema.sql and basketball_stats_schema.sql
-- contain older variants of the model (for example first_name/last_name and game_teams)
-- and should be treated as historical reference only.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.clubs (
    id bigint generated always as identity primary key,
    name text not null,
    club_code text,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (name),
    unique (club_code),
    unique (external_id)
);

create table if not exists public.seasons (
    id bigint generated always as identity primary key,
    code text not null,
    name text not null,
    start_date date,
    end_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (code)
);

create table if not exists public.teams (
    id bigint generated always as identity primary key,
    club_id bigint not null references public.clubs(id) on delete restrict,
    name text not null,
    team_code text,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (club_id, name),
    unique (team_code),
    unique (external_id)
);

create table if not exists public.team_seasons (
    id bigint generated always as identity primary key,
    team_id bigint not null references public.teams(id) on delete cascade,
    season_id bigint not null references public.seasons(id) on delete cascade,
    category text,
    coach_name text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (team_id, season_id)
);

create table if not exists public.players (
    id bigint generated always as identity primary key,
    full_name text not null,
    player_code text,
    external_id text,
    birth_date date,
    gender text,
    height_cm integer,
    position text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (player_code),
    unique (external_id)
);

create table if not exists public.player_team_seasons (
    id bigint generated always as identity primary key,
    player_id bigint not null references public.players(id) on delete cascade,
    team_season_id bigint not null references public.team_seasons(id) on delete cascade,
    jersey_number text,
    valid_from date,
    valid_to date,
    assignment_type text not null default 'regular',
    source_club_name text,
    notes text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (player_id, team_season_id)
);

create table if not exists public.competitions (
    id bigint generated always as identity primary key,
    name text not null,
    external_id text,
    competition_code text,
    competition_group_code text,
    phase_code text,
    category_name text,
    competition_group_name text,
    phase_name text,
    unit_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (external_id)
);

create table if not exists public.venues (
    id bigint generated always as identity primary key,
    name text not null,
    court_name text,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (external_id),
    unique nulls not distinct (name, court_name)
);

create table if not exists public.games (
    id bigint generated always as identity primary key,
    season_id bigint not null references public.seasons(id) on delete restrict,
    team_season_id bigint not null references public.team_seasons(id) on delete restrict,
    competition_id bigint references public.competitions(id) on delete restrict,
    venue_id bigint references public.venues(id) on delete restrict,
    external_id text not null,
    opponent_name text not null,
    scheduled_at timestamptz,
    period_count integer,
    period_length_minutes integer,
    overtime_length_minutes integer,
    source_type text not null default 'xml',
    source_file_name text,
    source_url text,
    home_score integer,
    guest_score integer,
    quarter_score text,
    home_table_points integer,
    guest_table_points integer,
    round_number integer,
    game_number integer,
    checked boolean,
    is_home boolean,
    opponent_team_code text,
    opponent_external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (external_id, team_season_id)
);

create table if not exists public.game_players (
    id bigint generated always as identity primary key,
    game_id bigint not null references public.games(id) on delete cascade,
    player_id bigint not null references public.players(id) on delete restrict,
    player_team_season_id bigint references public.player_team_seasons(id) on delete set null,
    jersey_number text,
    is_present boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (game_id, player_id)
);

create table if not exists public.player_game_stats (
    id bigint generated always as identity primary key,
    game_player_id bigint not null references public.game_players(id) on delete cascade,
    started boolean not null default false,
    seconds_played integer not null default 0,
    points integer not null default 0,
    ft_made integer not null default 0,
    ft_missed integer not null default 0,
    fg2_made integer not null default 0,
    fg2_missed integer not null default 0,
    fg3_made integer not null default 0,
    fg3_missed integer not null default 0,
    defensive_rebounds integer not null default 0,
    offensive_rebounds integer not null default 0,
    blocks integer not null default 0,
    assists integer not null default 0,
    steals integer not null default 0,
    turnovers integer not null default 0,
    fouls_drawn integer not null default 0,
    personal_fouls integer not null default 0,
    unsportsmanlike_fouls integer not null default 0,
    technical_fouls integer not null default 0,
    disqualifying_fouls integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (game_player_id)
);

create index if not exists idx_teams_club_id on public.teams(club_id);
create index if not exists idx_team_seasons_team_id on public.team_seasons(team_id);
create index if not exists idx_team_seasons_season_id on public.team_seasons(season_id);
create index if not exists idx_players_full_name on public.players(full_name);
create index if not exists idx_player_team_seasons_player_id on public.player_team_seasons(player_id);
create index if not exists idx_player_team_seasons_team_season_id on public.player_team_seasons(team_season_id);
create index if not exists idx_games_season_id on public.games(season_id);
create index if not exists idx_games_team_season_id on public.games(team_season_id);
create index if not exists idx_games_scheduled_at on public.games(scheduled_at);
create index if not exists idx_games_opponent_team_code on public.games(opponent_team_code);
create index if not exists idx_game_players_game_id on public.game_players(game_id);
create index if not exists idx_game_players_player_id on public.game_players(player_id);
create index if not exists idx_game_players_player_team_season_id on public.game_players(player_team_season_id);
create index if not exists idx_player_game_stats_game_player_id on public.player_game_stats(game_player_id);

drop trigger if exists set_clubs_updated_at on public.clubs;
create trigger set_clubs_updated_at before update on public.clubs
for each row execute procedure public.set_updated_at();

drop trigger if exists set_seasons_updated_at on public.seasons;
create trigger set_seasons_updated_at before update on public.seasons
for each row execute procedure public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at before update on public.teams
for each row execute procedure public.set_updated_at();

drop trigger if exists set_team_seasons_updated_at on public.team_seasons;
create trigger set_team_seasons_updated_at before update on public.team_seasons
for each row execute procedure public.set_updated_at();

drop trigger if exists set_players_updated_at on public.players;
create trigger set_players_updated_at before update on public.players
for each row execute procedure public.set_updated_at();

drop trigger if exists set_player_team_seasons_updated_at on public.player_team_seasons;
create trigger set_player_team_seasons_updated_at before update on public.player_team_seasons
for each row execute procedure public.set_updated_at();

drop trigger if exists set_competitions_updated_at on public.competitions;
create trigger set_competitions_updated_at before update on public.competitions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_venues_updated_at on public.venues;
create trigger set_venues_updated_at before update on public.venues
for each row execute procedure public.set_updated_at();

drop trigger if exists set_games_updated_at on public.games;
create trigger set_games_updated_at before update on public.games
for each row execute procedure public.set_updated_at();

drop trigger if exists set_game_players_updated_at on public.game_players;
create trigger set_game_players_updated_at before update on public.game_players
for each row execute procedure public.set_updated_at();

drop trigger if exists set_player_game_stats_updated_at on public.player_game_stats;
create trigger set_player_game_stats_updated_at before update on public.player_game_stats
for each row execute procedure public.set_updated_at();
