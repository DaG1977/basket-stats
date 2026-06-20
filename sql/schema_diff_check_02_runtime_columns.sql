-- Part 2: required runtime columns

with expected_columns as (
    select * from (
        values
            ('public','players','full_name'),
            ('public','players','player_code'),
            ('public','players','birth_date'),
            ('public','player_team_seasons','team_season_id'),
            ('public','player_team_seasons','assignment_type'),
            ('public','player_team_seasons','source_club_name'),
            ('public','player_team_seasons','valid_from'),
            ('public','player_team_seasons','valid_to'),
            ('public','player_team_seasons','is_active'),
            ('public','games','team_season_id'),
            ('public','games','opponent_name'),
            ('public','games','source_type'),
            ('public','games','source_url'),
            ('public','games','home_score'),
            ('public','games','guest_score'),
            ('public','games','is_home'),
            ('public','games','opponent_team_code'),
            ('public','games','opponent_external_id'),
            ('public','game_players','game_id'),
            ('public','game_players','player_id'),
            ('public','game_players','player_team_season_id'),
            ('public','game_players','is_present'),
            ('public','player_game_stats','game_player_id'),
            ('public','player_game_stats','points'),
            ('public','player_game_stats','ft_made'),
            ('public','player_game_stats','ft_missed'),
            ('public','player_game_stats','fg2_made'),
            ('public','player_game_stats','fg2_missed'),
            ('public','player_game_stats','fg3_made'),
            ('public','player_game_stats','fg3_missed'),
            ('public','player_game_stats','personal_fouls')
    ) as t(table_schema, table_name, column_name)
)
select
    'missing_column' as issue_type,
    e.table_schema,
    e.table_name,
    e.column_name as object_name
from expected_columns e
left join information_schema.columns c
  on c.table_schema = e.table_schema
 and c.table_name = e.table_name
 and c.column_name = e.column_name
where c.column_name is null
order by e.table_name, e.column_name;

