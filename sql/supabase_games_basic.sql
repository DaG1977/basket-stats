create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.competitions (
    id bigint generated always as identity primary key,
    name text not null,
    competition_code text,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (competition_code),
    unique (external_id),
    unique (name)
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

create index if not exists idx_games_season_id on public.games(season_id);
create index if not exists idx_games_team_season_id on public.games(team_season_id);
create index if not exists idx_games_scheduled_at on public.games(scheduled_at);
create index if not exists idx_game_players_game_id on public.game_players(game_id);
create index if not exists idx_game_players_player_id on public.game_players(player_id);
create index if not exists idx_game_players_player_team_season_id on public.game_players(player_team_season_id);

drop trigger if exists set_competitions_updated_at on public.competitions;
create trigger set_competitions_updated_at
before update on public.competitions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_venues_updated_at on public.venues;
create trigger set_venues_updated_at
before update on public.venues
for each row execute procedure public.set_updated_at();

drop trigger if exists set_games_updated_at on public.games;
create trigger set_games_updated_at
before update on public.games
for each row execute procedure public.set_updated_at();

drop trigger if exists set_game_players_updated_at on public.game_players;
create trigger set_game_players_updated_at
before update on public.game_players
for each row execute procedure public.set_updated_at();
