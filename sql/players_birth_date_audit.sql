-- Audit hracu bez data narozeni pro public web.
-- Public web zobrazuje rocnik z public.players.birth_date.

select
  p.id,
  p.player_code,
  p.full_name,
  p.birth_date,
  string_agg(distinct t.name || ' / ' || s.code, ', ' order by t.name || ' / ' || s.code) as team_seasons
from public.players p
left join public.player_team_seasons pts on pts.player_id = p.id
left join public.team_seasons ts on ts.id = pts.team_season_id
left join public.teams t on t.id = ts.team_id
left join public.seasons s on s.id = ts.season_id
where p.birth_date is null
group by p.id, p.player_code, p.full_name, p.birth_date
order by p.full_name;

