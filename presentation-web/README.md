# Presentation Web

Vercel-friendly prezentační vrstva pro BK Skokani Brno.

## Lokální spuštění

```powershell
cd C:\Osobní\Codex\CBFBasketStats\presentation-web
npm install
$env:SUPABASE_URL = 'https://...supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '...'
$env:PRESENTATION_CLUB_NAME = 'BK Skokani Brno, z. s.'
npm run dev
```

Pak otevři:

- `http://localhost:3000`

## Vercel

Environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PRESENTATION_CLUB_NAME`

Root directory na Vercelu:

- `CBFBasketStats/presentation-web`
