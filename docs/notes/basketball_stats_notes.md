# NÃ¡vrh DB a jednoduchÃ©ho UI pro pÅ™ehled basketbalovÃ½ch statistik

## Co je v dodanÃ©m XML

Soubor `lsg523959.xml` zatÃ­m obsahuje:

- identifikaci utkÃ¡nÃ­
- soutÄ›Å¾
- datum a Äas
- halu
- oba tÃ½my
- soupisky hrÃ¡ÄÅ¯ obou tÃ½mÅ¯

V souboru nejsou skuteÄnÃ© zÃ¡pasovÃ© statistiky hrÃ¡ÄÅ¯ ani tÃ½mÅ¯. To znamenÃ¡, Å¾e importÃ©r mÅ¯Å¾e z tohoto typu XML zatÃ­m spolehlivÄ› zaloÅ¾it:

- zÃ¡pas
- ÃºÄast tÃ½mÅ¯ v zÃ¡pase
- soupisku hrÃ¡ÄÅ¯ navÃ¡zanou na tÃ½m

Pokud mÃ¡Å¡ i druhÃ½ typ XML se statistikami, je dobrÃ© navrhnout import tak, aby Å¡el napojit do stejnÃ©ho modelu.

## DoporuÄenÃ½ datovÃ½ model

NejpraktiÄtÄ›jÅ¡Ã­ je oddÄ›lit:

1. `club`
2. `season`
3. `team`
4. `team_season`
5. `player`
6. `player_team_season`
7. `game`
8. `game_team`
9. `player_game_stats`

### ProÄ takto

- `club -> team`: klub mÅ¯Å¾e mÃ­t vÃ­ce tÃ½mÅ¯, napÅ™Ã­klad U10, U11, U12, A tÃ½m
- `team`: tÃ½m je trvalÃ¡ entita se stabilnÃ­m XML ID nebo kÃ³dem napÅ™Ã­Ä sezÃ³nami
- `team_season`: stejnÃ½ tÃ½m existuje v rÅ¯znÃ½ch sezÃ³nÃ¡ch a mÅ¯Å¾e mÃ­t jinÃ©ho trenÃ©ra nebo kategorii
- `player`: hrÃ¡Ä je trvalÃ¡ entita se stabilnÃ­m ID napÅ™Ã­Ä sezÃ³nami
- `player_team_season`: hrÃ¡Ä mÅ¯Å¾e bÃ½t v jednÃ© sezÃ³nÄ› ve vÃ­ce tÃ½mech
- `game_team`: jeden zÃ¡pas mÃ¡ dvÄ› strany a kaÅ¾dÃ¡ strana nese vlastnÃ­ skÃ³re a vazbu na tÃ½m v konkrÃ©tnÃ­ sezÃ³nÄ›
- `player_game_stats`: jedna Å™Ã¡dka = statistika jednoho hrÃ¡Äe v jednom zÃ¡pase za konkrÃ©tnÃ­ tÃ½m

## DoporuÄenÃ© statistiky

I kdyÅ¾ dnes nepotÅ™ebujeÅ¡ body a fauly, do modelu je rozumnÃ© je pÅ™idat. U basketu se pak velmi snadno dopoÄÃ­tajÃ­ dalÅ¡Ã­ pÅ™ehledy.

ZÃ¡klad:

- `minutes_played`
- `fgm`, `fga`
- `tpm`, `tpa`
- `ftm`, `fta`
- `oreb`, `dreb`, `reb`
- `ast`
- `stl`
- `blk`
- `tov`
- `pf`
- `plus_minus`
- `points`

KdyÅ¾ nÄ›kterÃ¡ hodnota v XML nebude, uloÅ¾Ã­ se `0` nebo `NULL` podle logiky importu.

## SezÃ³nnÃ­ statistiky

SezÃ³nnÃ­ statistiky nenÃ­ nutnÃ© fyzicky uklÃ¡dat zvlÃ¡Å¡Å¥. Pro jednoduchÃ© Å™eÅ¡enÃ­ je lepÅ¡Ã­ je poÄÃ­tat pÅ™es SQL pohled nebo agregaci nad `player_game_stats`.

TypickÃ© vÃ½stupy:

- souÄet za sezÃ³nu
- prÅ¯mÄ›r na zÃ¡pas
- statistiky za konkrÃ©tnÃ­ tÃ½m v sezÃ³nÄ›
- statistiky hrÃ¡Äe napÅ™Ã­Ä vÃ­ce tÃ½my v sezÃ³nÄ›

## JednoduchÃ© UI

Pro prvnÃ­ verzi bych navrhl 5 obrazovek:

1. PÅ™ehled tÃ½mÅ¯
2. Detail hrÃ¡Äe
3. Detail zÃ¡pasu
4. Import XML
5. SprÃ¡va uÅ¾ivatelÅ¯ a pÅ™Ã­stupÅ¯

### 1. PÅ™ehled tÃ½mÅ¯

- filtr sezÃ³na
- filtr tÃ½m
- tabulka hrÃ¡ÄÅ¯
- sloupce: zÃ¡pasy, minuty, doskoky, asistence, zisky, bloky, ztrÃ¡ty
- pÅ™epÃ­naÄ `souÄty / prÅ¯mÄ›ry`

### 2. Detail hrÃ¡Äe

- zÃ¡kladnÃ­ informace o hrÃ¡Äi
- ve kterÃ½ch tÃ½mech hrÃ¡l v danÃ© sezÃ³nÄ›
- sezÃ³nnÃ­ souhrn
- seznam vÅ¡ech zÃ¡pasÅ¯ s Å™Ã¡dkem statistik

### 3. Detail zÃ¡pasu

- datum, soutÄ›Å¾, soupeÅ™, vÃ½sledek
- roster obou tÃ½mÅ¯
- statistiky hrÃ¡ÄÅ¯ v tabulce

### 4. Import XML

- nahrÃ¡nÃ­ jednoho nebo vÃ­ce XML
- zobrazenÃ­, co se zaloÅ¾Ã­ nebo aktualizuje
- log importu a pÅ™Ã­padnÃ© chyby
- kontrola duplicit podle `external_id` zÃ¡pasu
- moÅ¾nost reÅ¾imu `nÃ¡hled importu` pÅ™ed potvrzenÃ­m

### 5. SprÃ¡va uÅ¾ivatelÅ¯ a pÅ™Ã­stupÅ¯

- seznam uÅ¾ivatelÅ¯
- role uÅ¾ivatele
- aktivace nebo deaktivace ÃºÄtu
- pÅ™Ã­padnÄ› omezenÃ­ pÅ™Ã­stupu jen na ÄtenÃ­

## Role a oprÃ¡vnÄ›nÃ­

Pro tvoje pouÅ¾itÃ­ zatÃ­m staÄÃ­ 2 role:

### Admin

- upload jednoho i vÃ­ce XML souborÅ¯ najednou
- vytvoÅ™enÃ­, oprava a smazÃ¡nÃ­ dat
- sprÃ¡va hrÃ¡ÄÅ¯, tÃ½mÅ¯, sezÃ³n
- sprÃ¡va uÅ¾ivatelÅ¯

### Read only

- zobrazenÃ­ pÅ™ehledÅ¯
- filtrovÃ¡nÃ­ a detail zÃ¡pasu
- detail hrÃ¡Äe
- bez moÅ¾nosti importu a Ãºprav

NejjednoduÅ¡Å¡Ã­ technicky je role uklÃ¡dat pÅ™Ã­mo na uÅ¾ivatele jako:

- `admin`
- `viewer`

## DoporuÄenÃ½ stack

Pro jednoduchÃ© internÃ­ pouÅ¾itÃ­:

- DB: PostgreSQL nebo SQLite
- backend: FastAPI nebo Node.js/Express
- UI: Next.js nebo jednoduchÃ© server-rendered strÃ¡nky

Pokud to chceÅ¡ spÃ­Å¡ rychle a lokÃ¡lnÄ›:

- SQLite
- FastAPI
- jednoduchÃ© HTML tabulky nebo React admin

Pokud to mÃ¡ rÅ¯st:

- PostgreSQL
- Next.js
- API vrstva pro import i reporting

KvÅ¯li uÅ¾ivatelÅ¯m a prÃ¡vÅ¯m bych pro webovou variantu preferoval:

- PostgreSQL
- Next.js
- pÅ™ihlÃ¡Å¡enÃ­ pÅ™es jednoduchou autentizaci
- role-based access control nad API i UI

## Pokud pouÅ¾ijeÅ¡ Supabase

Pro Supabase bych Å¡el touto cestou:

- uÅ¾ivatelÃ© v `auth.users`
- vlastnÃ­ role a stav ÃºÄtu v tabulce `public.profiles`
- role jen dvÄ›: `admin`, `viewer`
- vÅ¡echna read-only data povolit pÅ™ihlÃ¡Å¡enÃ½m aktivnÃ­m uÅ¾ivatelÅ¯m
- zÃ¡pis povolit jen `admin`

Prakticky:

- `viewer` uvidÃ­ pÅ™ehledy, hrÃ¡Äe, zÃ¡pasy i statistiky
- `admin` navÃ­c importuje XML, upravuje data a spravuje uÅ¾ivatele
- importnÃ­ backend pouÅ¾Ã­vÃ¡ server-side klÃ­Ä, ale UI je stÃ¡le chrÃ¡nÄ›nÃ© rolemi

## DÅ¯leÅ¾itÃ¡ modelovÃ¡ logika pro XML

Podle upÅ™esnÄ›nÃ­ dÃ¡vÃ¡ smysl tento princip:

- `team` mÃ¡ stabilnÃ­ ID nebo kÃ³d i mezi sezÃ³nami
- `player` mÃ¡ stabilnÃ­ ID i mezi sezÃ³nami
- sezÃ³na nemÄ›nÃ­ identitu tÃ½mu ani hrÃ¡Äe
- sezÃ³na mÄ›nÃ­ jejich vztahy

Proto:

- `team` je samostatnÃ¡ dlouhodobÃ¡ entita
- `team_season` reprezentuje tÃ½m v konkrÃ©tnÃ­ sezÃ³nÄ›
- `player_team_season` reprezentuje hrÃ¡Äe v konkrÃ©tnÃ­m tÃ½mu a sezÃ³nÄ›

To je vhodnÄ›jÅ¡Ã­ neÅ¾ uklÃ¡dat sezÃ³nu pÅ™Ã­mo do `teams` nebo vytvÃ¡Å™et novÃ©ho hrÃ¡Äe pÅ™i kaÅ¾dÃ© sezÃ³nÄ›.

Pro Supabase jsem pÅ™ipravil samostatnÃ½ SQL zÃ¡klad:

- [supabase_basketball_schema.sql](C:\Osobní\Codex\CBFBasketStats\sql\supabase_basketball_schema.sql)

Ten uÅ¾ obsahuje:

- tabulky pro basketbalovÃ¡ data
- `profiles` navÃ¡zanÃ© na `auth.users`
- automatickÃ© zaloÅ¾enÃ­ profilu po registraci
- helper funkce `is_admin()` a `is_active_user()`
- zapnutÃ© RLS
- zÃ¡kladnÃ­ policies pro `admin` a `viewer`

## DÅ¯leÅ¾itÃ¡ poznÃ¡mka k importu

Podle ukÃ¡zkovÃ©ho XML doporuÄuji do kaÅ¾dÃ© tabulky uklÃ¡dat i `external_id` z XML, napÅ™Ã­klad:

- `external_id` hrÃ¡Äe
- `external_id` tÃ½mu
- `external_id` zÃ¡pasu

TÃ­m se vyhneÅ¡ duplicitÃ¡m pÅ™i opakovanÃ©m importu stejnÃ©ho souboru.

Pokud je tÃ½m v XML identifikovanÃ½ vlastnÃ­m kÃ³dem, je lepÅ¡Ã­ mÃ­t na nÄ›m jeÅ¡tÄ› samostatnÃ½ sloupec:

- `team_code`

Ten pak pouÅ¾ijeÅ¡ jako hlavnÃ­ vazbu pÅ™i importu tÃ½mÅ¯ a zÃ¡pasÅ¯.

Pro dÃ¡vkovÃ½ upload je dobrÃ© uklÃ¡dat i historii importÅ¯:

- kdo import provedl
- kdy import probÄ›hl
- kolik souborÅ¯ bylo zpracovÃ¡no
- kolik zÃ¡pasÅ¯ bylo novÄ› zaloÅ¾eno
- kolik zÃ¡pasÅ¯ bylo aktualizovÃ¡no
- kterÃ© soubory skonÄily chybou

## DoporuÄenÃ½ prÅ¯bÄ›h uploadu vÃ­ce souborÅ¯

1. Admin nahraje vÃ­ce XML souborÅ¯ najednou.
2. Aplikace kaÅ¾dÃ½ soubor validuje.
3. Z XML se vytÃ¡hne `external_id` zÃ¡pasu.
4. Pokud zÃ¡pas neexistuje, vytvoÅ™Ã­ se.
5. Pokud uÅ¾ existuje, buÄ se pÅ™eskoÄÃ­, nebo aktualizuje podle zvolenÃ©ho reÅ¾imu.
6. Na konci se zobrazÃ­ pÅ™ehled importu.

Pro prvnÃ­ verzi doporuÄuji bezpeÄnÃ½ reÅ¾im:

- duplicitnÃ­ zÃ¡pas nepÅ™epsat automaticky
- jen zobrazit, Å¾e uÅ¾ existuje
- pÅ™Ã­padnou aktualizaci dÄ›lat vÄ›domÄ›

## Co bych udÄ›lal jako dalÅ¡Ã­ krok

NejlepÅ¡Ã­ dalÅ¡Ã­ krok je vzÃ­t jeden XML soubor, kterÃ½ uÅ¾ opravdu obsahuje statistiky hrÃ¡ÄÅ¯, a podle nÄ›j doladit:

- nÃ¡zvy sloupcÅ¯ statistik
- mapovÃ¡nÃ­ XML -> DB
- importnÃ­ skript
- prvnÃ­ obrazovku pÅ™ehledu
