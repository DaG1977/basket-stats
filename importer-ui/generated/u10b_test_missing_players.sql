-- Missing players report for generated import
select x.player_code
from (
  values
    ('136642'),
    ('141349'),
    ('141317'),
    ('141315'),
    ('141314'),
    ('141296'),
    ('141251'),
    ('141229'),
    ('139990'),
    ('139853'),
    ('136792'),
    ('141369')
) as x(player_code)
left join public.players p on p.player_code = x.player_code
where p.id is null
order by x.player_code;
