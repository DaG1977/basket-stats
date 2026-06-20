-- Audit konzistence dat pro aktuální model používaný importer-ui.
-- Předpokládá živé schéma, se kterým pracuje server.js:
-- players(player_code, full_name, birth_date, ...)
-- player_team_seasons(team_season_id, player_id, assignment_type, source_club_name, valid_from, valid_to, ...)

-- 1) Hráči bez player_code nebo full_name
select
  'players_missing_identity' as check_name,
  p.id,
  p.player_code,
  p.full_name,
  p.birth_date
from public.players p
where coalesce(trim(p.player_code), '') = ''
   or coalesce(trim(p.full_name), '') = '';

-- 2) Podezřelé duplicity hráčů podle player_code
select
  'duplicate_player_code' as check_name,
  p.player_code,
  count(*) as row_count,
  string_agg(p.full_name, ' | ' order by p.full_name) as names
from public.players p
where coalesce(trim(p.player_code), '') <> ''
group by p.player_code
having count(*) > 1;

-- 3) Podezřelé duplicity hráčů podle jména + data narození
select
  'duplicate_name_birthdate' as check_name,
  p.full_name,
  p.birth_date,
  count(*) as row_count,
  string_agg(coalesce(p.player_code, '?'), ', ' order by p.player_code) as player_codes
from public.players p
where coalesce(trim(p.full_name), '') <> ''
  and p.birth_date is not null
group by p.full_name, p.birth_date
having count(*) > 1;

-- 4) Hostující hráči bez mateřského klubu
select
  'hosting_without_source_club' as check_name,
  pts.id,
  p.player_code,
  p.full_name,
  pts.assignment_type,
  pts.source_club_name,
  pts.valid_from,
  pts.valid_to
from public.player_team_seasons pts
join public.players p on p.id = pts.player_id
where pts.assignment_type = 'hosting_in'
  and coalesce(trim(pts.source_club_name), '') = '';

-- 5) Hostující hráči bez platnosti od/do
select
  'hosting_without_validity' as check_name,
  pts.id,
  p.player_code,
  p.full_name,
  pts.source_club_name,
  pts.valid_from,
  pts.valid_to
from public.player_team_seasons pts
join public.players p on p.id = pts.player_id
where pts.assignment_type = 'hosting_in'
  and (pts.valid_from is null or pts.valid_to is null);

-- 6) Hostující hráči s obrácenou nebo nesmyslnou platností
select
  'hosting_invalid_validity_range' as check_name,
  pts.id,
  p.player_code,
  p.full_name,
  pts.valid_from,
  pts.valid_to
from public.player_team_seasons pts
join public.players p on p.id = pts.player_id
where pts.assignment_type = 'hosting_in'
  and pts.valid_from is not null
  and pts.valid_to is not null
  and pts.valid_from > pts.valid_to;

-- 7) Hráči na soupisce bez odpovídajícího game_player vazebního řádku pro své zápasy
select
  'game_player_without_pts' as check_name,
  gp.id as game_player_id,
  g.external_id as game_external_id,
  p.player_code,
  p.full_name,
  gp.player_team_season_id
from public.game_players gp
join public.games g on g.id = gp.game_id
join public.players p on p.id = gp.player_id
left join public.player_team_seasons pts on pts.id = gp.player_team_season_id
where gp.player_team_season_id is not null
  and pts.id is null;

-- 8) game_players navázané na jiný tým/season než game.team_season_id
select
  'game_player_team_season_mismatch' as check_name,
  gp.id as game_player_id,
  g.external_id as game_external_id,
  g.team_season_id as game_team_season_id,
  gp.player_team_season_id,
  p.player_code,
  p.full_name
from public.game_players gp
join public.games g on g.id = gp.game_id
join public.players p on p.id = gp.player_id
join public.player_team_seasons pts on pts.id = gp.player_team_season_id
where pts.team_season_id <> g.team_season_id;

-- 9) Hráči ve game_players, kteří vůbec nejsou na soupisce daného team_season
select
  'game_player_missing_roster_assignment' as check_name,
  gp.id as game_player_id,
  g.external_id as game_external_id,
  g.team_season_id,
  p.player_code,
  p.full_name
from public.game_players gp
join public.games g on g.id = gp.game_id
join public.players p on p.id = gp.player_id
left join public.player_team_seasons pts
  on pts.player_id = gp.player_id
 and pts.team_season_id = g.team_season_id
where pts.id is null;

-- 10) Statistiky bez game_player
select
  'stats_without_game_player' as check_name,
  pgs.id as player_game_stats_id,
  pgs.game_player_id
from public.player_game_stats pgs
left join public.game_players gp on gp.id = pgs.game_player_id
where gp.id is null;

-- 11) Základní kontrola bodů: součet bodů hráčů vs skóre týmu v game
select
  'points_sum_mismatch' as check_name,
  g.external_id as game_external_id,
  case
    when g.is_home = true then g.home_score
    when g.is_home = false then g.guest_score
    else null
  end as team_score,
  coalesce(sum(pgs.points), 0) as stats_points_sum,
  coalesce(sum(pgs.points), 0) - coalesce(
    case
      when g.is_home = true then g.home_score
      when g.is_home = false then g.guest_score
      else null
    end,
    0
  ) as diff
from public.games g
left join public.game_players gp on gp.game_id = g.id
left join public.player_game_stats pgs on pgs.game_player_id = gp.id
group by g.id, g.external_id, g.is_home, g.home_score, g.guest_score
having (
    case
      when g.is_home = true then g.home_score
      when g.is_home = false then g.guest_score
      else null
    end
  ) is not null
  and coalesce(sum(pgs.points), 0) <> coalesce(
    case
      when g.is_home = true then g.home_score
      when g.is_home = false then g.guest_score
      else null
    end,
    0
  )
order by abs(
  coalesce(sum(pgs.points), 0) - coalesce(
    case
      when g.is_home = true then g.home_score
      when g.is_home = false then g.guest_score
      else null
    end,
    0
  )
) desc, g.external_id;
