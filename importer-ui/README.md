# CBF Importer UI

Jednoduché lokální UI pro BK Skokani, přes které zadáš jedno nebo více `game ID` z CBF a zapíšeš data přímo do Supabase.

## Spuštění

```powershell
cd C:\Osobní\Codex\CBFBasketStats\importer-ui
npm start
```

Pak otevři:

- `http://localhost:3010`

## Přímý import do Supabase

Před spuštěním nastav:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Příklad:

```powershell
$env:SUPABASE_URL = 'https://qwalzqjcwljvhhpnwyqu.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '...'
```

## Jednokrokové spuštění

```powershell
C:\Osobní\Codex\CBFBasketStats\start-importer-ui.ps1
```

## Co UI umí

- vybrat tým podle názvu
- vybrat sezónu z dropdownu
- načíst seznam `game ID` z veřejné stránky týmu na `cz.basketball`
- stáhnout `gamestats.xml` z CBF
- najít náš tým podle `team code`
- zapsat data přímo do Supabase:
  - `competitions`
  - `venues`
  - `games`
  - `player_team_seasons`
  - `game_players`
  - `player_game_stats`

## Poznámka

Starší režim generování SQL souborů zůstává k dispozici přes:

- [Generate-CbfGameImportSql.ps1](C:\Osobní\Codex\CBFBasketStats\tools\Generate-CbfGameImportSql.ps1)
