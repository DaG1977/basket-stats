-- Zalozeni sezony 2026/2027 pro importer a prezentacni web.
-- Skript je idempotentni: lze ho spustit opakovane.

insert into public.seasons (code, name, start_date, end_date)
values ('2026-2027', '2026/2027', '2026-08-01', '2027-07-31')
on conflict (code) do update
set
  name = excluded.name,
  start_date = excluded.start_date,
  end_date = excluded.end_date;

with season_2026 as (
  select id from public.seasons where code = '2026-2027'
),
season_2025 as (
  select id from public.seasons where code = '2025-2026'
),
source_teams as (
  select
    t.id as team_id,
    coalesce(ts_old.category, regexp_replace(t.name, '^.* ', '')) as category,
    ts_old.coach_name
  from public.teams t
  left join season_2025 s_old on true
  left join public.team_seasons ts_old
    on ts_old.team_id = t.id
   and ts_old.season_id = s_old.id
  where t.team_code in (
    '12494', '14516', '12301', '13483',
    '11939', '13484', '12306', '13485',
    '14703', '14856', '12880', '15394'
  )
)
insert into public.team_seasons (team_id, season_id, category, coach_name, is_active)
select
  st.team_id,
  s26.id,
  st.category,
  st.coach_name,
  true
from source_teams st
cross join season_2026 s26
on conflict (team_id, season_id) do update
set
  category = coalesce(public.team_seasons.category, excluded.category),
  coach_name = coalesce(public.team_seasons.coach_name, excluded.coach_name),
  is_active = true;
