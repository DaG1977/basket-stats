-- Read-only schema audit for the current importer-ui runtime model.
-- Returns missing/unexpected objects compared to sql/supabase_current_runtime_schema.sql.

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
),
actual_columns as (
    select
        c.table_schema,
        c.table_name,
        c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
),
missing_columns as (
    select
        'missing_column' as issue_type,
        e.table_schema,
        e.table_name,
        e.column_name as object_name
    from expected_columns e
    left join actual_columns a
      on a.table_schema = e.table_schema
     and a.table_name = e.table_name
     and a.column_name = e.column_name
    where a.column_name is null
),
expected_tables as (
    select * from (
        values
            ('public','clubs'),
            ('public','seasons'),
            ('public','teams'),
            ('public','team_seasons'),
            ('public','players'),
            ('public','player_team_seasons'),
            ('public','competitions'),
            ('public','venues'),
            ('public','games'),
            ('public','game_players'),
            ('public','player_game_stats')
    ) as t(table_schema, table_name)
),
actual_tables as (
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
),
missing_tables as (
    select
        'missing_table' as issue_type,
        e.table_schema,
        e.table_name,
        e.table_name as object_name
    from expected_tables e
    left join actual_tables a
      on a.table_schema = e.table_schema
     and a.table_name = e.table_name
    where a.table_name is null
),
legacy_columns as (
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
        or (c.table_name = 'player_game_stats' and c.column_name in ('game_id','game_team_id','player_id','minutes_played','fgm','fga','tpm','tpa','ftm','fta','oreb','dreb','reb','ast','stl','blk','tov','pf','plus_minus','efficiency','raw_payload'))
      )
),
legacy_tables as (
    select
        'legacy_table_present' as issue_type,
        t.table_schema,
        t.table_name,
        t.table_name as object_name
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_name in ('game_teams')
)
select *
from (
    select * from missing_tables
    union all
    select * from missing_columns
    union all
    select * from legacy_tables
    union all
    select * from legacy_columns
) issues
order by issue_type, table_name, object_name;

