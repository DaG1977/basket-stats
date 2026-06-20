-- Missing players report for generated import
select x.player_code
from (
  values
    ('117206'),
    ('126462'),
    ('125767'),
    ('125207'),
    ('124522'),
    ('119449'),
    ('119374'),
    ('119262'),
    ('118218'),
    ('129218')
) as x(player_code)
left join public.players p on p.player_code = x.player_code
where p.id is null
order by x.player_code;
