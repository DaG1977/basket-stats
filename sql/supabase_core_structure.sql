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

create index if not exists idx_teams_club_id on public.teams(club_id);
create index if not exists idx_team_seasons_team_id on public.team_seasons(team_id);
create index if not exists idx_team_seasons_season_id on public.team_seasons(season_id);
create index if not exists idx_players_full_name on public.players(full_name);
create index if not exists idx_player_team_seasons_player_id on public.player_team_seasons(player_id);
create index if not exists idx_player_team_seasons_team_season_id on public.player_team_seasons(team_season_id);

drop trigger if exists set_clubs_updated_at on public.clubs;
create trigger set_clubs_updated_at
before update on public.clubs
for each row execute procedure public.set_updated_at();

drop trigger if exists set_seasons_updated_at on public.seasons;
create trigger set_seasons_updated_at
before update on public.seasons
for each row execute procedure public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row execute procedure public.set_updated_at();

drop trigger if exists set_team_seasons_updated_at on public.team_seasons;
create trigger set_team_seasons_updated_at
before update on public.team_seasons
for each row execute procedure public.set_updated_at();

drop trigger if exists set_players_updated_at on public.players;
create trigger set_players_updated_at
before update on public.players
for each row execute procedure public.set_updated_at();

drop trigger if exists set_player_team_seasons_updated_at on public.player_team_seasons;
create trigger set_player_team_seasons_updated_at
before update on public.player_team_seasons
for each row execute procedure public.set_updated_at();
