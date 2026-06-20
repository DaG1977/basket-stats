create table clubs (
    id bigserial primary key,
    name text not null,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (name),
    unique (external_id)
);

create table seasons (
    id bigserial primary key,
    code text not null,
    name text not null,
    start_date date,
    end_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (code)
);

create table teams (
    id bigserial primary key,
    club_id bigint not null references clubs(id),
    name text not null,
    category text,
    team_code text,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (team_code),
    unique (external_id),
    unique (club_id, name)
);

create table team_seasons (
    id bigserial primary key,
    team_id bigint not null references teams(id),
    season_id bigint not null references seasons(id),
    category text,
    coach_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (team_id, season_id)
);

create table players (
    id bigserial primary key,
    first_name text not null,
    last_name text not null,
    birth_date date,
    gender text,
    height_cm integer,
    position text,
    external_id text,
    ext_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (external_id)
);

create table player_team_seasons (
    id bigserial primary key,
    player_id bigint not null references players(id),
    team_season_id bigint not null references team_seasons(id),
    season_id bigint not null references seasons(id),
    jersey_number text,
    valid_from date,
    valid_to date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (player_id, team_season_id)
);

create table competitions (
    id bigserial primary key,
    name text not null,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (external_id)
);

create table venues (
    id bigserial primary key,
    name text not null,
    court_name text,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (external_id),
    unique (name, court_name)
);

create table games (
    id bigserial primary key,
    season_id bigint references seasons(id),
    competition_id bigint references competitions(id),
    venue_id bigint references venues(id),
    external_id text not null,
    scheduled_at timestamptz,
    period_count integer,
    period_length_minutes integer,
    overtime_length_minutes integer,
    source_file_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (external_id)
);

create table game_teams (
    id bigserial primary key,
    game_id bigint not null references games(id) on delete cascade,
    team_season_id bigint not null references team_seasons(id),
    side text not null check (side in ('home', 'away')),
    team_number integer,
    score integer,
    coach_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (game_id, side),
    unique (game_id, team_season_id)
);

create table player_game_stats (
    id bigserial primary key,
    game_id bigint not null references games(id) on delete cascade,
    game_team_id bigint not null references game_teams(id) on delete cascade,
    player_id bigint not null references players(id),
    jersey_number text,
    started boolean,
    minutes_played numeric(5,2),
    fgm integer not null default 0,
    fga integer not null default 0,
    tpm integer not null default 0,
    tpa integer not null default 0,
    ftm integer not null default 0,
    fta integer not null default 0,
    oreb integer not null default 0,
    dreb integer not null default 0,
    reb integer not null default 0,
    ast integer not null default 0,
    stl integer not null default 0,
    blk integer not null default 0,
    tov integer not null default 0,
    pf integer not null default 0,
    plus_minus integer,
    points integer not null default 0,
    efficiency numeric(8,2),
    raw_payload jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (game_id, game_team_id, player_id)
);

create table users (
    id bigserial primary key,
    email text not null,
    password_hash text,
    full_name text,
    role text not null check (role in ('admin', 'viewer')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (email)
);

create table imports (
    id bigserial primary key,
    uploaded_by_user_id bigint references users(id),
    imported_at timestamptz not null default now(),
    source_type text not null default 'xml',
    file_count integer not null default 0,
    status text not null check (status in ('pending', 'completed', 'completed_with_errors', 'failed')),
    created_games_count integer not null default 0,
    updated_games_count integer not null default 0,
    skipped_games_count integer not null default 0,
    failed_files_count integer not null default 0,
    notes text
);

create table import_files (
    id bigserial primary key,
    import_id bigint not null references imports(id) on delete cascade,
    original_file_name text not null,
    external_game_id text,
    file_checksum text,
    status text not null check (status in ('pending', 'imported', 'skipped_duplicate', 'failed')),
    error_message text,
    created_at timestamptz not null default now()
);

create index idx_teams_club_id on teams(club_id);
create index idx_team_seasons_team_id on team_seasons(team_id);
create index idx_team_seasons_season_id on team_seasons(season_id);
create index idx_player_team_seasons_player_id on player_team_seasons(player_id);
create index idx_player_team_seasons_team_season_id on player_team_seasons(team_season_id);
create index idx_player_team_seasons_season_id on player_team_seasons(season_id);
create index idx_games_season_id on games(season_id);
create index idx_games_scheduled_at on games(scheduled_at);
create index idx_game_teams_team_season_id on game_teams(team_season_id);
create index idx_player_game_stats_player_id on player_game_stats(player_id);
create index idx_player_game_stats_game_id on player_game_stats(game_id);
create index idx_player_game_stats_game_team_id on player_game_stats(game_team_id);
create index idx_imports_uploaded_by_user_id on imports(uploaded_by_user_id);
create index idx_import_files_import_id on import_files(import_id);
create index idx_import_files_external_game_id on import_files(external_game_id);

create view season_player_totals as
select
    g.season_id,
    pgs.player_id,
    ts.team_id,
    count(*) as games_played,
    coalesce(sum(pgs.minutes_played), 0) as minutes_played,
    sum(pgs.fgm) as fgm,
    sum(pgs.fga) as fga,
    sum(pgs.tpm) as tpm,
    sum(pgs.tpa) as tpa,
    sum(pgs.ftm) as ftm,
    sum(pgs.fta) as fta,
    sum(pgs.oreb) as oreb,
    sum(pgs.dreb) as dreb,
    sum(pgs.reb) as reb,
    sum(pgs.ast) as ast,
    sum(pgs.stl) as stl,
    sum(pgs.blk) as blk,
    sum(pgs.tov) as tov,
    sum(pgs.pf) as pf,
    sum(pgs.points) as points
from player_game_stats pgs
join games g on g.id = pgs.game_id
join game_teams gt on gt.id = pgs.game_team_id
join team_seasons ts on ts.id = gt.team_season_id
group by g.season_id, pgs.player_id, ts.team_id;
-- LEGACY REFERENCE
-- This file contains an older pre-Supabase schema variant and is not the
-- canonical model for the current importer-ui runtime anymore.
-- Use sql/supabase_current_runtime_schema.sql as the source of truth for the
-- active application schema.
