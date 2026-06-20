# Generate-CbfGameImportSql

Skript:

- [Generate-CbfGameImportSql.ps1](C:\Osobní\Codex\CBFBasketStats\tools\Generate-CbfGameImportSql.ps1)

vygeneruje SQL pro import jednoho nebo více utkání z `gamestats.xml` do Supabase.

## Příklady

```powershell
.\tools\Generate-CbfGameImportSql.ps1 -GameIds 500671 -TeamCode 12880 -SeasonCode 2025-2026
```

```powershell
.\tools\Generate-CbfGameImportSql.ps1 -GameIds 500671,500672,500673 -TeamCode 12880 -SeasonCode 2025-2026
```

```powershell
.\tools\Generate-CbfGameImportSql.ps1 -XmlPath 'C:\Users\dalib\Downloads\gamestats.xml' -TeamCode 12494 -SeasonCode 2025-2026
```

## Předpoklady

- tabulky ze [supabase_core_structure.sql](C:\Osobní\Codex\CBFBasketStats\sql\supabase_core_structure.sql)
- rozšíření ze [supabase_games_basic.sql](C:\Osobní\Codex\CBFBasketStats\sql\supabase_games_basic.sql)
- rozšíření ze [supabase_games_stats.sql](C:\Osobní\Codex\CBFBasketStats\sql\supabase_games_stats.sql)
