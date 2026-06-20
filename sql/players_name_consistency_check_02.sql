-- Check 2: rows that look suspicious for migration/cleanup.

select
  'missing_full_name_but_legacy_present' as issue_type,
  p.id,
  p.player_code,
  p.full_name,
  p.first_name,
  p.last_name
from public.players p
where coalesce(trim(p.full_name), '') = ''
  and (
    coalesce(trim(p.first_name), '') <> ''
    or coalesce(trim(p.last_name), '') <> ''
  )

union all

select
  'full_name_differs_from_legacy_last_first' as issue_type,
  p.id,
  p.player_code,
  p.full_name,
  p.first_name,
  p.last_name
from public.players p
where coalesce(trim(p.full_name), '') <> ''
  and coalesce(trim(p.first_name), '') <> ''
  and coalesce(trim(p.last_name), '') <> ''
  and lower(trim(p.full_name)) <> lower(trim(concat_ws(' ', p.last_name, p.first_name)))

order by issue_type, id;

