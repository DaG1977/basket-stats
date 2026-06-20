-- Part 1: expected vs legacy tables

with expected_tables as (
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
    select * from legacy_tables
) issues
order by issue_type, table_name, object_name;

