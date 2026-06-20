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

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    full_name text,
    role text not null check (role in ('admin', 'viewer')) default 'viewer',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data ->> 'full_name', '')
    )
    on conflict (id) do update
    set email = excluded.email;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'admin'
          and is_active = true
    );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and is_active = true
    );
$$;

create table public.clubs (
    id bigint generated always as identity primary key,
    name text not null,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (name),
    unique (external_id)
);

create table public.seasons (
    id bigint generated always as identity primary key,
    code text not null,
    name text not null,
    start_date date,
    end_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (code)
);

create table public.teams (
    id bigint generated always as identity primary key,
    club_id bigint not null references public.clubs(id),
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

create table public.team_seasons (
    id bigint generated always as identity primary key,
    team_id bigint not null references public.teams(id),
    season_id bigint not null references public.seasons(id),
    category text,
    coach_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (team_id, season_id)
);

create table public.players (
    id bigint generated always as identity primary key,
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

create table public.player_team_seasons (
    id bigint generated always as identity primary key,
    player_id bigint not null references public.players(id),
    team_season_id bigint not null references public.team_seasons(id),
    season_id bigint not null references public.seasons(id),
    jersey_number text,
    valid_from date,
    valid_to date,
    assignment_type text not null default 'regular',
    source_club_name text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (player_id, team_season_id)
);

create table public.competitions (
    id bigint generated always as identity primary key,
    name text not null,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (external_id)
);

create table public.venues (
    id bigint generated always as identity primary key,
    name text not null,
    court_name text,
    external_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (external_id),
    unique nulls not distinct (name, court_name)
);

create table public.games (
    id bigint generated always as identity primary key,
    season_id bigint references public.seasons(id),
    competition_id bigint references public.competitions(id),
    venue_id bigint references public.venues(id),
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

create table public.game_teams (
    id bigint generated always as identity primary key,
    game_id bigint not null references public.games(id) on delete cascade,
    team_season_id bigint not null references public.team_seasons(id),
    side text not null check (side in ('home', 'away')),
    team_number integer,
    score integer,
    coach_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (game_id, side),
    unique (game_id, team_season_id)
);

create table public.player_game_stats (
    id bigint generated always as identity primary key,
    game_id bigint not null references public.games(id) on delete cascade,
    game_team_id bigint not null references public.game_teams(id) on delete cascade,
    player_id bigint not null references public.players(id),
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

create table public.imports (
    id bigint generated always as identity primary key,
    uploaded_by_user_id uuid references public.profiles(id),
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

create table public.import_files (
    id bigint generated always as identity primary key,
    import_id bigint not null references public.imports(id) on delete cascade,
    original_file_name text not null,
    external_game_id text,
    file_checksum text,
    status text not null check (status in ('pending', 'imported', 'skipped_duplicate', 'failed')),
    error_message text,
    created_at timestamptz not null default now()
);

create index idx_teams_club_id on public.teams(club_id);
create index idx_team_seasons_team_id on public.team_seasons(team_id);
create index idx_team_seasons_season_id on public.team_seasons(season_id);
create index idx_player_team_seasons_player_id on public.player_team_seasons(player_id);
create index idx_player_team_seasons_team_season_id on public.player_team_seasons(team_season_id);
create index idx_player_team_seasons_season_id on public.player_team_seasons(season_id);
create index idx_games_season_id on public.games(season_id);
create index idx_games_scheduled_at on public.games(scheduled_at);
create index idx_game_teams_team_season_id on public.game_teams(team_season_id);
create index idx_player_game_stats_player_id on public.player_game_stats(player_id);
create index idx_player_game_stats_game_id on public.player_game_stats(game_id);
create index idx_player_game_stats_game_team_id on public.player_game_stats(game_team_id);
create index idx_imports_uploaded_by_user_id on public.imports(uploaded_by_user_id);
create index idx_import_files_import_id on public.import_files(import_id);
create index idx_import_files_external_game_id on public.import_files(external_game_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger set_clubs_updated_at
before update on public.clubs
for each row execute procedure public.set_updated_at();

create trigger set_seasons_updated_at
before update on public.seasons
for each row execute procedure public.set_updated_at();

create trigger set_teams_updated_at
before update on public.teams
for each row execute procedure public.set_updated_at();

create trigger set_team_seasons_updated_at
before update on public.team_seasons
for each row execute procedure public.set_updated_at();

create trigger set_players_updated_at
before update on public.players
for each row execute procedure public.set_updated_at();

create trigger set_player_team_seasons_updated_at
before update on public.player_team_seasons
for each row execute procedure public.set_updated_at();

create trigger set_competitions_updated_at
before update on public.competitions
for each row execute procedure public.set_updated_at();

create trigger set_venues_updated_at
before update on public.venues
for each row execute procedure public.set_updated_at();

create trigger set_games_updated_at
before update on public.games
for each row execute procedure public.set_updated_at();

create trigger set_game_teams_updated_at
before update on public.game_teams
for each row execute procedure public.set_updated_at();

create trigger set_player_game_stats_updated_at
before update on public.player_game_stats
for each row execute procedure public.set_updated_at();

create or replace view public.season_player_totals
with (security_invoker = true) as
select
    g.season_id,
    pgs.player_id,
    gt.team_id,
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
from public.player_game_stats pgs
join public.games g on g.id = pgs.game_id
join public.game_teams gt on gt.id = pgs.game_team_id
group by g.season_id, pgs.player_id, gt.team_id;

grant usage on schema public to authenticated;
grant select on
    public.profiles,
    public.clubs,
    public.seasons,
    public.teams,
    public.team_seasons,
    public.players,
    public.player_team_seasons,
    public.competitions,
    public.venues,
    public.games,
    public.game_teams,
    public.player_game_stats,
    public.imports,
    public.import_files,
    public.season_player_totals
to authenticated;

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.team_seasons enable row level security;
alter table public.players enable row level security;
alter table public.player_team_seasons enable row level security;
alter table public.competitions enable row level security;
alter table public.venues enable row level security;
alter table public.games enable row level security;
alter table public.game_teams enable row level security;
alter table public.player_game_stats enable row level security;
alter table public.imports enable row level security;
alter table public.import_files enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "profiles_insert_admin"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

create policy "read_all_active_users_clubs"
on public.clubs
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_seasons"
on public.seasons
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_teams"
on public.teams
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_team_seasons"
on public.team_seasons
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_players"
on public.players
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_player_team_seasons"
on public.player_team_seasons
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_competitions"
on public.competitions
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_venues"
on public.venues
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_games"
on public.games
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_game_teams"
on public.game_teams
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_player_game_stats"
on public.player_game_stats
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_imports"
on public.imports
for select
to authenticated
using (public.is_active_user());

create policy "read_all_active_users_import_files"
on public.import_files
for select
to authenticated
using (public.is_active_user());

create policy "admin_write_clubs"
on public.clubs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_seasons"
on public.seasons
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_teams"
on public.teams
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_team_seasons"
on public.team_seasons
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_players"
on public.players
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_player_team_seasons"
on public.player_team_seasons
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_competitions"
on public.competitions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_venues"
on public.venues
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_games"
on public.games
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_game_teams"
on public.game_teams
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_player_game_stats"
on public.player_game_stats
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_imports"
on public.imports
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admin_write_import_files"
on public.import_files
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
-- LEGACY REFERENCE
-- This file contains an older combined schema variant and is not the canonical
-- model for the current importer-ui runtime anymore.
-- Use sql/supabase_current_runtime_schema.sql as the source of truth for the
-- active application schema.
