insert into public.competitions (competition_code, name)
values ('5282', 'Pripravky U10')
on conflict (competition_code) do update
set
  name = excluded.name;

insert into public.venues (name, court_name)
values ('Sokol Brno II', null)
on conflict (name, court_name) do nothing;

insert into public.games (
  season_id,
  team_season_id,
  competition_id,
  venue_id,
  external_id,
  opponent_name,
  scheduled_at,
  period_count,
  period_length_minutes,
  overtime_length_minutes,
  source_type,
  source_file_name
)
select
  s.id,
  ts.id,
  c.id,
  v.id,
  '523681',
  'BBA Tygri Brno B',
  '2025-11-22 10:00:00+01',
  4,
  10,
  5,
  'xml',
  'lsg523681.xml'
from public.seasons s
join public.teams t on t.team_code = '14516'
join public.team_seasons ts on ts.team_id = t.id and ts.season_id = s.id
join public.competitions c on c.competition_code = '5282'
join public.venues v on v.name = 'Sokol Brno II' and v.court_name is null
where s.code = '2025-2026'
on conflict (external_id, team_season_id) do update
set
  competition_id = excluded.competition_id,
  venue_id = excluded.venue_id,
  opponent_name = excluded.opponent_name,
  scheduled_at = excluded.scheduled_at,
  period_count = excluded.period_count,
  period_length_minutes = excluded.period_length_minutes,
  overtime_length_minutes = excluded.overtime_length_minutes,
  source_type = excluded.source_type,
  source_file_name = excluded.source_file_name;

insert into public.player_team_seasons (
  player_id,
  team_season_id,
  is_active
)
select
  p.id,
  ts.id,
  true
from public.players p
join public.teams t on t.team_code = '14516'
join public.team_seasons ts on ts.team_id = t.id
join public.seasons s on s.id = ts.season_id
join (
  values
    ('141317'),
    ('136525'),
    ('141492'),
    ('139990'),
    ('141324'),
    ('141426'),
    ('136642'),
    ('141315'),
    ('141327'),
    ('136964'),
    ('142543'),
    ('141229'),
    ('141349'),
    ('136792'),
    ('142397'),
    ('141296'),
    ('141369'),
    ('136706'),
    ('142142'),
    ('141314'),
    ('141251'),
    ('139853'),
    ('142368'),
    ('136721')
) as x(player_code) on x.player_code = p.player_code
where s.code = '2025-2026'
on conflict (player_id, team_season_id) do update
set
  is_active = excluded.is_active;

insert into public.game_players (
  game_id,
  player_id,
  player_team_season_id,
  jersey_number,
  is_present
)
select
  g.id,
  p.id,
  pts.id,
  null,
  true
from public.games g
join public.teams t on t.team_code = '14516'
join public.team_seasons ts on ts.id = g.team_season_id and ts.team_id = t.id
join public.seasons s on s.id = ts.season_id and s.code = '2025-2026'
join public.player_team_seasons pts on pts.team_season_id = ts.id
join public.players p on p.id = pts.player_id
join (
  values
    ('141317'),
    ('136525'),
    ('141492'),
    ('139990'),
    ('141324'),
    ('141426'),
    ('136642'),
    ('141315'),
    ('141327'),
    ('136964'),
    ('142543'),
    ('141229'),
    ('141349'),
    ('136792'),
    ('142397'),
    ('141296'),
    ('141369'),
    ('136706'),
    ('142142'),
    ('141314'),
    ('141251'),
    ('139853'),
    ('142368'),
    ('136721')
) as x(player_code) on x.player_code = p.player_code
where g.external_id = '523681'
on conflict (game_id, player_id) do update
set
  player_team_season_id = excluded.player_team_season_id,
  jersey_number = excluded.jersey_number,
  is_present = excluded.is_present;
