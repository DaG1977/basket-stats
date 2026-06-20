-- Check 1: rows where legacy first_name/last_name still carry data
-- and compare them with full_name.

select
  p.id,
  p.player_code,
  p.full_name,
  p.first_name,
  p.last_name,
  trim(concat_ws(' ', p.last_name, p.first_name)) as legacy_last_first,
  trim(concat_ws(' ', p.first_name, p.last_name)) as legacy_first_last
from public.players p
where coalesce(trim(p.first_name), '') <> ''
   or coalesce(trim(p.last_name), '') <> ''
order by p.id;

