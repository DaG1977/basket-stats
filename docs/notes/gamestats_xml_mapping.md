# Mapování `gamestats.xml` do DB

Soubor [gamestats.xml](C:\Users\dalib\Downloads\gamestats.xml) je pro import výrazně vhodnější než předchozí `lsg` export.

## Proč je lepší

- metadata utkání jsou v samostatných tagách
- oba týmy jsou samostatně strukturované
- hráči jsou ve vlastních `<player>` blocích
- statistiky jsou už rozpadlé do konkrétních polí

Není potřeba parsovat žádný nejednoznačný zhuštěný řetězec.

## Metadata utkání

Mapování:

- `<id>` -> `games.external_id`
- `<idcompetition>` -> `competitions.competition_code`
- `<cname>` nebo `<catname>` -> `competitions.name`
- `<IDhall>` -> `venues.external_id`
- `<hallname>` -> `venues.name`
- `<date>` -> `games.scheduled_at`
- `<score_home>` / `<score_guest>` -> později pro výsledek utkání
- `<score_quarter>` -> volitelně textový souhrn čtvrtin

## Týmy

V XML jsou týmy:

- `<team guest="0">` = domácí
- `<team guest="1">` = hosté

Mapování:

- `<team>/<id>` -> externí ID týmu v daném výpisu
- `<team>/<identity>` -> stabilní identita týmu, nejlepší kandidát na `teams.team_code`
- `<team>/<name>` -> plný název
- `<team>/<shortname>` -> zkrácený název

Pro párování na náš tým je nejlepší používat:

- `<identity>` -> `teams.team_code`

Příklad z ukázky:

- hosté mají `<id>12495</id>`
- ale `<identity>12494</identity>`

To znamená, že pro import je bezpečnější opírat se o `identity`, ne o `id`.

## Hráči

Každý hráč má vlastní blok:

- `<id>` / `<ident>` -> identifikátor hráče
- `<number>` -> číslo dresu
- `<starter>` -> základní pětka
- `<lastname>`
- `<firstname>`

Pro párování na databázi:

- `<ident>` nebo `<id>` -> `players.player_code`

Protože v ukázce jsou obě hodnoty stejné, může importer použít:

- `player_code = ident`, fallback `id`

## Statistiky hráče

Statistiky jsou už rozdělené po polích:

- `<seconds>`
- `<points>`
- `<zs1p>`
- `<zs1m>`
- `<zs2pp>`
- `<zs2pm>`
- `<zs3p>`
- `<zs3m>`
- `<zrd>`
- `<zro>`
- `<zbl>`
- `<zas>`
- `<zst>`
- `<zls>`
- `<zaf>`
- `<zpf>`
- `<zuf>`
- `<ztf>`
- `<zdf>`

To je přesně formát, který lze bez problémů ukládat do `player_game_stats`.

### Potvrzené významy polí

- `<starter>` -> hráč byl v základní pětce (`0/1`)
- `<points>` -> body v utkání
- `<zs1p>` -> úspěšné trestné hody
- `<zs1m>` -> neúspěšné trestné hody
- `<zs2pp>` -> úspěšné pokusy za 2 body
- `<zs2pm>` -> neúspěšné pokusy za 2 body
- `<zs3p>` -> úspěšné pokusy za 3 body
- `<zs3m>` -> neúspěšné pokusy za 3 body
- `<zpf>` -> osobní chyby
- `<zuf>` -> nesportovní chyby
- `<ztf>` -> technické chyby
- `<zdf>` -> diskvalifikační chyby

### Doporučené sloupce do `player_game_stats`

- `started`
- `seconds_played`
- `points`
- `ft_made`
- `ft_missed`
- `fg2_made`
- `fg2_missed`
- `fg3_made`
- `fg3_missed`
- `personal_fouls`
- `unsportsmanlike_fouls`
- `technical_fouls`
- `disqualifying_fouls`

## Který tým importovat

Protože chceš importovat jen náš tým:

1. importer projde oba `<team>` bloky
2. zkusí najít `team.identity` v `teams.team_code`
3. pokud najde právě jeden tým, importuje jen jeho stranu statistik
4. soupeře uloží jen jako text

## Důležitá poznámka k ukázce

Soubor je v CP1250 nebo podobném kódování, ale hlásí `utf-8`, proto je v textu rozbitá diakritika.

Například:

- `pÅ™Ã­pravky U10`
- `VÃ­t`

Na import identifikátorů to nevadí, ale pro textová pole bude potřeba při automatickém importu hlídat dekódování.
