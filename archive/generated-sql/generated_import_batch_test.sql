-- Generated from gamestats_500671.xml
insert into public.competitions (competition_code, name, competition_group_code, phase_code, category_name, competition_group_name, phase_name, unit_name)
values ('5128', 'žákovská liga U15M', '2701', '9474', 'muži U15', 'žákovská liga', 'Skupina C', null)
on conflict (competition_code) do update
set
  name = excluded.name,
  competition_group_code = excluded.competition_group_code,
  phase_code = excluded.phase_code,
  category_name = excluded.category_name,
  competition_group_name = excluded.competition_group_name,
  phase_name = excluded.phase_name,
  unit_name = excluded.unit_name;

insert into public.venues (name, court_name, external_id)
values ('SH Morenda', null, '127')
on conflict (external_id) do update
set
  name = excluded.name,
  court_name = excluded.court_name;

insert into public.games (
  season_id,
  team_season_id,
  competition_id,
  venue_id,
  external_id,
  opponent_name,
  scheduled_at,
  source_type,
  source_file_name,
  source_url,
  home_score,
  guest_score,
  quarter_score,
  home_table_points,
  guest_table_points,
  round_number,
  game_number,
  checked,
  is_home,
  opponent_team_code,
  opponent_external_id
)
select
  s.id,
  ts.id,
  c.id,
  v.id,
  '500671',
  'BA Nymburk',
  '2025-09-27 17:00:00'::timestamptz,
  'xml',
  'gamestats_500671.xml',
  'https://www.cbf.cz/xml/gamestats.php?g=500671',
  34,
  104,
  '6:24 9:56 20:79',
  1,
  2,
  2,
  117,
  true,
  true,
  '13039',
  '13039'
from public.seasons s
join public.teams t on t.team_code = '12880'
join public.team_seasons ts on ts.team_id = t.id and ts.season_id = s.id
join public.competitions c on c.competition_code = '5128'
join public.venues v on v.external_id = '127'
where s.code = '2025-2026'
on conflict (external_id, team_season_id) do update
set
  competition_id = excluded.competition_id,
  venue_id = excluded.venue_id,
  opponent_name = excluded.opponent_name,
  scheduled_at = excluded.scheduled_at,
  source_type = excluded.source_type,
  source_file_name = excluded.source_file_name,
  source_url = excluded.source_url,
  home_score = excluded.home_score,
  guest_score = excluded.guest_score,
  quarter_score = excluded.quarter_score,
  home_table_points = excluded.home_table_points,
  guest_table_points = excluded.guest_table_points,
  round_number = excluded.round_number,
  game_number = excluded.game_number,
  checked = excluded.checked,
  is_home = excluded.is_home,
  opponent_team_code = excluded.opponent_team_code,
  opponent_external_id = excluded.opponent_external_id;

insert into public.player_team_seasons (player_id, team_season_id, jersey_number, is_active)
select
  p.id,
  ts.id,
  nullif(x.jersey_number, '0'),
  true
from public.players p
join (
  values
    ('117206', '0'),
    ('126462', '0'),
    ('125767', '0'),
    ('125207', '0'),
    ('124522', '0'),
    ('119449', '0'),
    ('119374', '0'),
    ('119262', '0'),
    ('118218', '0'),
    ('129218', '0')
) as x(player_code, jersey_number) on x.player_code = p.player_code
join public.teams t on t.team_code = '12880'
join public.team_seasons ts on ts.team_id = t.id
join public.seasons s on s.id = ts.season_id
where s.code = '2025-2026'
on conflict (player_id, team_season_id) do update
set
  jersey_number = coalesce(excluded.jersey_number, public.player_team_seasons.jersey_number),
  is_active = true;

insert into public.game_players (game_id, player_id, player_team_season_id, jersey_number, is_present)
select
  g.id,
  p.id,
  pts.id,
  nullif(x.jersey_number, '0'),
  true
from public.games g
join public.teams t on t.team_code = '12880'
join public.team_seasons ts on ts.id = g.team_season_id and ts.team_id = t.id
join public.seasons s on s.id = ts.season_id and s.code = '2025-2026'
join public.player_team_seasons pts on pts.team_season_id = ts.id
join public.players p on p.id = pts.player_id
join (
  values
    ('117206', '0'),
    ('126462', '0'),
    ('125767', '0'),
    ('125207', '0'),
    ('124522', '0'),
    ('119449', '0'),
    ('119374', '0'),
    ('119262', '0'),
    ('118218', '0'),
    ('129218', '0')
) as x(player_code, jersey_number) on x.player_code = p.player_code
where g.external_id = '500671'
on conflict (game_id, player_id) do update
set
  player_team_season_id = excluded.player_team_season_id,
  jersey_number = excluded.jersey_number,
  is_present = excluded.is_present;

insert into public.player_game_stats (
  game_player_id,
  started,
  seconds_played,
  points,
  ft_made,
  ft_missed,
  fg2_made,
  fg2_missed,
  fg3_made,
  fg3_missed,
  defensive_rebounds,
  offensive_rebounds,
  blocks,
  assists,
  steals,
  turnovers,
  fouls_drawn,
  personal_fouls,
  unsportsmanlike_fouls,
  technical_fouls,
  disqualifying_fouls
)
select
  gp.id,
  x.started,
  x.seconds_played,
  x.points,
  x.ft_made,
  x.ft_missed,
  x.fg2_made,
  x.fg2_missed,
  x.fg3_made,
  x.fg3_missed,
  x.defensive_rebounds,
  x.offensive_rebounds,
  x.blocks,
  x.assists,
  x.steals,
  x.turnovers,
  x.fouls_drawn,
  x.personal_fouls,
  x.unsportsmanlike_fouls,
  x.technical_fouls,
  x.disqualifying_fouls
from public.games g
join public.game_players gp on gp.game_id = g.id
join public.players p on p.id = gp.player_id
join (
  values
    ('117206', false, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ('126462', false, 0, 3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ('125767', false, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0),
    ('125207', false, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0),
    ('124522', false, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0),
    ('119449', true, 0, 5, 1, 3, 2, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 2, 9, 10, 11),
    ('119374', false, 0, 10, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0),
    ('119262', false, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0),
    ('118218', false, 0, 10, 1, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0),
    ('129218', false, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0)
) as x(
  player_code,
  started,
  seconds_played,
  points,
  ft_made,
  ft_missed,
  fg2_made,
  fg2_missed,
  fg3_made,
  fg3_missed,
  defensive_rebounds,
  offensive_rebounds,
  blocks,
  assists,
  steals,
  turnovers,
  fouls_drawn,
  personal_fouls,
  unsportsmanlike_fouls,
  technical_fouls,
  disqualifying_fouls
) on x.player_code = p.player_code
where g.external_id = '500671'
on conflict (game_player_id) do update
set
  started = excluded.started,
  seconds_played = excluded.seconds_played,
  points = excluded.points,
  ft_made = excluded.ft_made,
  ft_missed = excluded.ft_missed,
  fg2_made = excluded.fg2_made,
  fg2_missed = excluded.fg2_missed,
  fg3_made = excluded.fg3_made,
  fg3_missed = excluded.fg3_missed,
  defensive_rebounds = excluded.defensive_rebounds,
  offensive_rebounds = excluded.offensive_rebounds,
  blocks = excluded.blocks,
  assists = excluded.assists,
  steals = excluded.steals,
  turnovers = excluded.turnovers,
  fouls_drawn = excluded.fouls_drawn,
  personal_fouls = excluded.personal_fouls,
  unsportsmanlike_fouls = excluded.unsportsmanlike_fouls,
  technical_fouls = excluded.technical_fouls,
  disqualifying_fouls = excluded.disqualifying_fouls;

-- Generated from gamestats_500671.xml
insert into public.competitions (competition_code, name, competition_group_code, phase_code, category_name, competition_group_name, phase_name, unit_name)
values ('5128', 'žákovská liga U15M', '2701', '9474', 'muži U15', 'žákovská liga', 'Skupina C', null)
on conflict (competition_code) do update
set
  name = excluded.name,
  competition_group_code = excluded.competition_group_code,
  phase_code = excluded.phase_code,
  category_name = excluded.category_name,
  competition_group_name = excluded.competition_group_name,
  phase_name = excluded.phase_name,
  unit_name = excluded.unit_name;

insert into public.venues (name, court_name, external_id)
values ('SH Morenda', null, '127')
on conflict (external_id) do update
set
  name = excluded.name,
  court_name = excluded.court_name;

insert into public.games (
  season_id,
  team_season_id,
  competition_id,
  venue_id,
  external_id,
  opponent_name,
  scheduled_at,
  source_type,
  source_file_name,
  source_url,
  home_score,
  guest_score,
  quarter_score,
  home_table_points,
  guest_table_points,
  round_number,
  game_number,
  checked,
  is_home,
  opponent_team_code,
  opponent_external_id
)
select
  s.id,
  ts.id,
  c.id,
  v.id,
  '500671',
  'BA Nymburk',
  '2025-09-27 17:00:00'::timestamptz,
  'xml',
  'gamestats_500671.xml',
  'https://www.cbf.cz/xml/gamestats.php?g=500671',
  34,
  104,
  '6:24 9:56 20:79',
  1,
  2,
  2,
  117,
  true,
  true,
  '13039',
  '13039'
from public.seasons s
join public.teams t on t.team_code = '12880'
join public.team_seasons ts on ts.team_id = t.id and ts.season_id = s.id
join public.competitions c on c.competition_code = '5128'
join public.venues v on v.external_id = '127'
where s.code = '2025-2026'
on conflict (external_id, team_season_id) do update
set
  competition_id = excluded.competition_id,
  venue_id = excluded.venue_id,
  opponent_name = excluded.opponent_name,
  scheduled_at = excluded.scheduled_at,
  source_type = excluded.source_type,
  source_file_name = excluded.source_file_name,
  source_url = excluded.source_url,
  home_score = excluded.home_score,
  guest_score = excluded.guest_score,
  quarter_score = excluded.quarter_score,
  home_table_points = excluded.home_table_points,
  guest_table_points = excluded.guest_table_points,
  round_number = excluded.round_number,
  game_number = excluded.game_number,
  checked = excluded.checked,
  is_home = excluded.is_home,
  opponent_team_code = excluded.opponent_team_code,
  opponent_external_id = excluded.opponent_external_id;

insert into public.player_team_seasons (player_id, team_season_id, jersey_number, is_active)
select
  p.id,
  ts.id,
  nullif(x.jersey_number, '0'),
  true
from public.players p
join (
  values
    ('117206', '0'),
    ('126462', '0'),
    ('125767', '0'),
    ('125207', '0'),
    ('124522', '0'),
    ('119449', '0'),
    ('119374', '0'),
    ('119262', '0'),
    ('118218', '0'),
    ('129218', '0')
) as x(player_code, jersey_number) on x.player_code = p.player_code
join public.teams t on t.team_code = '12880'
join public.team_seasons ts on ts.team_id = t.id
join public.seasons s on s.id = ts.season_id
where s.code = '2025-2026'
on conflict (player_id, team_season_id) do update
set
  jersey_number = coalesce(excluded.jersey_number, public.player_team_seasons.jersey_number),
  is_active = true;

insert into public.game_players (game_id, player_id, player_team_season_id, jersey_number, is_present)
select
  g.id,
  p.id,
  pts.id,
  nullif(x.jersey_number, '0'),
  true
from public.games g
join public.teams t on t.team_code = '12880'
join public.team_seasons ts on ts.id = g.team_season_id and ts.team_id = t.id
join public.seasons s on s.id = ts.season_id and s.code = '2025-2026'
join public.player_team_seasons pts on pts.team_season_id = ts.id
join public.players p on p.id = pts.player_id
join (
  values
    ('117206', '0'),
    ('126462', '0'),
    ('125767', '0'),
    ('125207', '0'),
    ('124522', '0'),
    ('119449', '0'),
    ('119374', '0'),
    ('119262', '0'),
    ('118218', '0'),
    ('129218', '0')
) as x(player_code, jersey_number) on x.player_code = p.player_code
where g.external_id = '500671'
on conflict (game_id, player_id) do update
set
  player_team_season_id = excluded.player_team_season_id,
  jersey_number = excluded.jersey_number,
  is_present = excluded.is_present;

insert into public.player_game_stats (
  game_player_id,
  started,
  seconds_played,
  points,
  ft_made,
  ft_missed,
  fg2_made,
  fg2_missed,
  fg3_made,
  fg3_missed,
  defensive_rebounds,
  offensive_rebounds,
  blocks,
  assists,
  steals,
  turnovers,
  fouls_drawn,
  personal_fouls,
  unsportsmanlike_fouls,
  technical_fouls,
  disqualifying_fouls
)
select
  gp.id,
  x.started,
  x.seconds_played,
  x.points,
  x.ft_made,
  x.ft_missed,
  x.fg2_made,
  x.fg2_missed,
  x.fg3_made,
  x.fg3_missed,
  x.defensive_rebounds,
  x.offensive_rebounds,
  x.blocks,
  x.assists,
  x.steals,
  x.turnovers,
  x.fouls_drawn,
  x.personal_fouls,
  x.unsportsmanlike_fouls,
  x.technical_fouls,
  x.disqualifying_fouls
from public.games g
join public.game_players gp on gp.game_id = g.id
join public.players p on p.id = gp.player_id
join (
  values
    ('117206', false, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ('126462', false, 0, 3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
    ('125767', false, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0),
    ('125207', false, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0),
    ('124522', false, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0),
    ('119449', true, 0, 5, 1, 3, 2, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8, 2, 9, 10, 11),
    ('119374', false, 0, 10, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0),
    ('119262', false, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0),
    ('118218', false, 0, 10, 1, 3, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0),
    ('129218', false, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0)
) as x(
  player_code,
  started,
  seconds_played,
  points,
  ft_made,
  ft_missed,
  fg2_made,
  fg2_missed,
  fg3_made,
  fg3_missed,
  defensive_rebounds,
  offensive_rebounds,
  blocks,
  assists,
  steals,
  turnovers,
  fouls_drawn,
  personal_fouls,
  unsportsmanlike_fouls,
  technical_fouls,
  disqualifying_fouls
) on x.player_code = p.player_code
where g.external_id = '500671'
on conflict (game_player_id) do update
set
  started = excluded.started,
  seconds_played = excluded.seconds_played,
  points = excluded.points,
  ft_made = excluded.ft_made,
  ft_missed = excluded.ft_missed,
  fg2_made = excluded.fg2_made,
  fg2_missed = excluded.fg2_missed,
  fg3_made = excluded.fg3_made,
  fg3_missed = excluded.fg3_missed,
  defensive_rebounds = excluded.defensive_rebounds,
  offensive_rebounds = excluded.offensive_rebounds,
  blocks = excluded.blocks,
  assists = excluded.assists,
  steals = excluded.steals,
  turnovers = excluded.turnovers,
  fouls_drawn = excluded.fouls_drawn,
  personal_fouls = excluded.personal_fouls,
  unsportsmanlike_fouls = excluded.unsportsmanlike_fouls,
  technical_fouls = excluded.technical_fouls,
  disqualifying_fouls = excluded.disqualifying_fouls;

