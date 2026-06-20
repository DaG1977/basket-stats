# CBF Presentation UI

Prezentační read-only web nad daty v Supabase.

## Spuštění

```powershell
cd C:\Osobní\Codex\CBFBasketStats\presentation-ui
$env:SUPABASE_URL = 'https://...supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '...'
node server.js
```

Pak otevři:

- `http://localhost:3020`

## Co ukazuje

- přehled týmů podle sezóny
- detail týmu
- soupisku
- přehled utkání
- detail utkání
- hráčské souhrny
- počet utkání podle soupisky
- počet soutěžních dnů v kalendářním roce

## Poznámka

Aplikace používá server-side volání na Supabase REST API, takže klíč
`SUPABASE_SERVICE_ROLE_KEY` zůstává pouze na serveru a neposílá se do browseru.
