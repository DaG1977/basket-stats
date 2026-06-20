alter table public.competitions
add column if not exists competition_group_code text,
add column if not exists phase_code text,
add column if not exists category_name text,
add column if not exists competition_group_name text,
add column if not exists phase_name text,
add column if not exists unit_name text;

create unique index if not exists idx_competitions_group_code
on public.competitions(competition_group_code)
where competition_group_code is not null;

alter table public.games
add column if not exists home_score integer,
add column if not exists guest_score integer,
add column if not exists quarter_score text,
add column if not exists home_table_points integer,
add column if not exists guest_table_points integer,
add column if not exists round_number integer,
add column if not exists game_number integer,
add column if not exists checked boolean,
add column if not exists is_home boolean,
add column if not exists opponent_team_code text,
add column if not exists opponent_external_id text;

create index if not exists idx_games_opponent_team_code on public.games(opponent_team_code);

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

create index if not exists idx_player_game_stats_game_player_id
on public.player_game_stats(game_player_id);

drop trigger if exists set_player_game_stats_updated_at on public.player_game_stats;
create trigger set_player_game_stats_updated_at
before update on public.player_game_stats
for each row execute procedure public.set_updated_at();
