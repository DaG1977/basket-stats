-- Part 3: legacy columns that suggest old schema branches are still present

select
    'legacy_column_present' as issue_type,
    c.table_schema,
    c.table_name,
    c.column_name as object_name
from information_schema.columns c
where c.table_schema = 'public'
  and (
    (c.table_name = 'players' and c.column_name in ('first_name','last_name','ext_id'))
    or (c.table_name = 'player_team_seasons' and c.column_name = 'season_id')
    or (c.table_name = 'player_game_stats' and c.column_name in (
      'game_id','game_team_id','player_id','minutes_played','fgm','fga','tpm','tpa',
      'ftm','fta','oreb','dreb','reb','ast','stl','blk','tov','pf','plus_minus',
      'efficiency','raw_payload'
    ))
  )
order by c.table_name, c.column_name;

