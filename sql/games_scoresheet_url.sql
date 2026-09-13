alter table public.games
add column if not exists scoresheet_url text;

create index if not exists idx_games_scoresheet_url
on public.games(scoresheet_url)
where scoresheet_url is not null;
