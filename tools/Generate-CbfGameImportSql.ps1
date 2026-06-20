param(
    [string[]]$GameIds,
    [string]$XmlPath,
    [Parameter(Mandatory = $true)]
    [string]$TeamCode,
    [Parameter(Mandatory = $true)]
    [string]$SeasonCode,
    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-SqlString {
    param(
        [AllowNull()]
        [string]$Value
    )

    if ($null -eq $Value -or $Value -eq '') {
        return 'null'
    }

    return "'" + $Value.Replace("'", "''") + "'"
}

function Get-SqlTextOrNull {
    param(
        [AllowNull()]
        [object]$Value
    )

    if ($null -eq $Value) {
        return 'null'
    }

    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        return 'null'
    }

    return Get-SqlString $text.Trim()
}

function Get-SqlIntOrNull {
    param(
        [AllowNull()]
        [object]$Value
    )

    if ($null -eq $Value) {
        return 'null'
    }

    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        return 'null'
    }

    return [int]$text
}

function Get-BoolSql {
    param(
        [AllowNull()]
        [object]$Value
    )

    if ($null -eq $Value) {
        return 'false'
    }

    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        return 'false'
    }

    if (@('1', 'true', 't', 'yes') -contains $text.ToLowerInvariant()) {
        return 'true'
    }

    return 'false'
}

function Get-PlayerBlockSideName {
    param(
        [string]$GuestFlag
    )

    if ($GuestFlag -eq '0') {
        return 'a'
    }

    return 'b'
}

function Get-PlayerCode {
    param(
        [object]$PlayerNode
    )

    if (-not [string]::IsNullOrWhiteSpace([string]$PlayerNode.ident)) {
        return [string]$PlayerNode.ident
    }

    return [string]$PlayerNode.id
}

function Add-PlayerValuesSql {
    param(
        [System.Collections.Generic.List[string]]$SqlParts,
        [object[]]$PlayerNodes,
        [scriptblock]$Formatter
    )

    $SqlParts.Add("  values")
    $rows = @($PlayerNodes | ForEach-Object { & $Formatter $_ })
    $SqlParts.Add(($rows -join ",`n"))
}

if (($null -eq $GameIds -or $GameIds.Count -eq 0) -and [string]::IsNullOrWhiteSpace($XmlPath)) {
    throw "Zadej GameIds nebo XmlPath."
}

if (($null -ne $GameIds -and $GameIds.Count -gt 0) -and -not [string]::IsNullOrWhiteSpace($XmlPath)) {
    throw "Zadej jen jednu variantu: GameIds nebo XmlPath."
}

$sources = New-Object System.Collections.Generic.List[object]

if ($null -ne $GameIds -and $GameIds.Count -gt 0) {
    foreach ($gameId in $GameIds) {
        if ([string]::IsNullOrWhiteSpace($gameId)) {
            continue
        }

        $sourceUrl = "https://www.cbf.cz/xml/gamestats.php?g=$gameId"
        $response = Invoke-WebRequest -Uri $sourceUrl -UseBasicParsing
        $sources.Add([pscustomobject]@{
            XmlContent = $response.Content
            SourceLabel = "gamestats_$gameId.xml"
            SourceUrl = $sourceUrl
        })
    }
} else {
    if (-not (Test-Path -LiteralPath $XmlPath)) {
        throw "Soubor '$XmlPath' neexistuje."
    }

    $sources.Add([pscustomobject]@{
        XmlContent = Get-Content -LiteralPath $XmlPath -Raw
        SourceLabel = [System.IO.Path]::GetFileName($XmlPath)
        SourceUrl = $null
    })
}

if ($sources.Count -eq 0) {
    throw "Nebyl nalezen žádný zdroj pro import."
}

$sqlParts = New-Object System.Collections.Generic.List[string]
$reportRows = New-Object System.Collections.Generic.List[object]
$allPlayerCodes = New-Object 'System.Collections.Generic.HashSet[string]'

foreach ($source in $sources) {
    [xml]$xml = $source.XmlContent
    $game = $xml.game

    if ($null -eq $game) {
        throw "Ve zdroji '$($source.SourceLabel)' nebyl nalezen element <game>."
    }

    $teams = @($game.team)
    if ($teams.Count -lt 2) {
        throw "Ve zdroji '$($source.SourceLabel)' nebyly nalezeny dva týmy."
    }

    $matchingTeams = @($teams | Where-Object { [string]$_.identity -eq $TeamCode })
    if ($matchingTeams.Count -ne 1) {
        throw "Ve zdroji '$($source.SourceLabel)' se nepodařilo jednoznačně určit náš tým pro team_code '$TeamCode'. Nalezeno: $($matchingTeams.Count)."
    }

    $ourTeam = $matchingTeams[0]
    $opponentTeam = @($teams | Where-Object { $_ -ne $ourTeam })[0]
    $isHome = ([string]$ourTeam.guest) -eq '0'
    $playerSideName = Get-PlayerBlockSideName -GuestFlag ([string]$ourTeam.guest)
    $playerNodes = @($game.stats.$playerSideName.player)
    $competitionName = if ([string]::IsNullOrWhiteSpace([string]$game.cname)) { [string]$game.catname } else { [string]$game.cname }
    $scheduledAt = [string]$game.date
    $checkedSql = Get-BoolSql $game.checked
    $isHomeSql = if ($isHome) { 'true' } else { 'false' }

    $playerCount = $playerNodes.Count
    foreach ($playerNode in $playerNodes) {
        $playerCode = Get-PlayerCode -PlayerNode $playerNode
        if (-not [string]::IsNullOrWhiteSpace($playerCode)) {
            [void]$allPlayerCodes.Add($playerCode)
        }
    }

    $reportRows.Add([pscustomobject]@{
        GameId = [string]$game.id
        TeamCode = $TeamCode
        SeasonCode = $SeasonCode
        OurTeamName = [string]$ourTeam.name
        OpponentName = [string]$opponentTeam.name
        ScheduledAt = $scheduledAt
        PlayerCount = $playerCount
        SourceLabel = $source.SourceLabel
    })

    $sqlParts.Add("-- Generated from $($source.SourceLabel)")
    $sqlParts.Add("insert into public.competitions (competition_code, name, competition_group_code, phase_code, category_name, competition_group_name, phase_name, unit_name)")
    $sqlParts.Add("values (" +
        (Get-SqlTextOrNull $game.idcompetition) + ", " +
        (Get-SqlTextOrNull $competitionName) + ", " +
        (Get-SqlTextOrNull $game.idcompetitiongroup) + ", " +
        (Get-SqlTextOrNull $game.idphase) + ", " +
        (Get-SqlTextOrNull $game.catname) + ", " +
        (Get-SqlTextOrNull $game.cgname) + ", " +
        (Get-SqlTextOrNull $game.pname) + ", " +
        (Get-SqlTextOrNull $game.uname) +
        ")")
    $sqlParts.Add("on conflict (competition_code) do update")
    $sqlParts.Add("set")
    $sqlParts.Add("  name = excluded.name,")
    $sqlParts.Add("  competition_group_code = excluded.competition_group_code,")
    $sqlParts.Add("  phase_code = excluded.phase_code,")
    $sqlParts.Add("  category_name = excluded.category_name,")
    $sqlParts.Add("  competition_group_name = excluded.competition_group_name,")
    $sqlParts.Add("  phase_name = excluded.phase_name,")
    $sqlParts.Add("  unit_name = excluded.unit_name;")
    $sqlParts.Add("")

    $sqlParts.Add("insert into public.venues (name, court_name, external_id)")
    $sqlParts.Add("values (" +
        (Get-SqlTextOrNull $game.hallname) + ", " +
        "null, " +
        (Get-SqlTextOrNull $game.IDhall) +
        ")")
    $sqlParts.Add("on conflict (external_id) do update")
    $sqlParts.Add("set")
    $sqlParts.Add("  name = excluded.name,")
    $sqlParts.Add("  court_name = excluded.court_name;")
    $sqlParts.Add("")

    $sqlParts.Add("insert into public.games (")
    $sqlParts.Add("  season_id,")
    $sqlParts.Add("  team_season_id,")
    $sqlParts.Add("  competition_id,")
    $sqlParts.Add("  venue_id,")
    $sqlParts.Add("  external_id,")
    $sqlParts.Add("  opponent_name,")
    $sqlParts.Add("  scheduled_at,")
    $sqlParts.Add("  source_type,")
    $sqlParts.Add("  source_file_name,")
    $sqlParts.Add("  source_url,")
    $sqlParts.Add("  home_score,")
    $sqlParts.Add("  guest_score,")
    $sqlParts.Add("  quarter_score,")
    $sqlParts.Add("  home_table_points,")
    $sqlParts.Add("  guest_table_points,")
    $sqlParts.Add("  round_number,")
    $sqlParts.Add("  game_number,")
    $sqlParts.Add("  checked,")
    $sqlParts.Add("  is_home,")
    $sqlParts.Add("  opponent_team_code,")
    $sqlParts.Add("  opponent_external_id")
    $sqlParts.Add(")")
    $sqlParts.Add("select")
    $sqlParts.Add("  s.id,")
    $sqlParts.Add("  ts.id,")
    $sqlParts.Add("  c.id,")
    $sqlParts.Add("  v.id,")
    $sqlParts.Add("  " + (Get-SqlTextOrNull $game.id) + ",")
    $sqlParts.Add("  " + (Get-SqlTextOrNull $opponentTeam.name) + ",")
    $sqlParts.Add("  " + (Get-SqlTextOrNull $scheduledAt) + "::timestamptz,")
    $sqlParts.Add("  'xml',")
    $sqlParts.Add("  " + (Get-SqlTextOrNull $source.SourceLabel) + ",")
    $sqlParts.Add("  " + (Get-SqlTextOrNull $source.SourceUrl) + ",")
    $sqlParts.Add("  " + (Get-SqlIntOrNull $game.score_home) + ",")
    $sqlParts.Add("  " + (Get-SqlIntOrNull $game.score_guest) + ",")
    $sqlParts.Add("  " + (Get-SqlTextOrNull $game.score_quarter) + ",")
    $sqlParts.Add("  " + (Get-SqlIntOrNull $game.points_home) + ",")
    $sqlParts.Add("  " + (Get-SqlIntOrNull $game.points_guest) + ",")
    $sqlParts.Add("  " + (Get-SqlIntOrNull $game.round) + ",")
    $sqlParts.Add("  " + (Get-SqlIntOrNull $game.num) + ",")
    $sqlParts.Add("  $checkedSql,")
    $sqlParts.Add("  $isHomeSql,")
    $sqlParts.Add("  " + (Get-SqlTextOrNull $opponentTeam.identity) + ",")
    $sqlParts.Add("  " + (Get-SqlTextOrNull $opponentTeam.id))
    $sqlParts.Add("from public.seasons s")
    $sqlParts.Add("join public.teams t on t.team_code = " + (Get-SqlTextOrNull $TeamCode))
    $sqlParts.Add("join public.team_seasons ts on ts.team_id = t.id and ts.season_id = s.id")
    $sqlParts.Add("join public.competitions c on c.competition_code = " + (Get-SqlTextOrNull $game.idcompetition))
    $sqlParts.Add("join public.venues v on v.external_id = " + (Get-SqlTextOrNull $game.IDhall))
    $sqlParts.Add("where s.code = " + (Get-SqlTextOrNull $SeasonCode))
    $sqlParts.Add("on conflict (external_id, team_season_id) do update")
    $sqlParts.Add("set")
    $sqlParts.Add("  competition_id = excluded.competition_id,")
    $sqlParts.Add("  venue_id = excluded.venue_id,")
    $sqlParts.Add("  opponent_name = excluded.opponent_name,")
    $sqlParts.Add("  scheduled_at = excluded.scheduled_at,")
    $sqlParts.Add("  source_type = excluded.source_type,")
    $sqlParts.Add("  source_file_name = excluded.source_file_name,")
    $sqlParts.Add("  source_url = excluded.source_url,")
    $sqlParts.Add("  home_score = excluded.home_score,")
    $sqlParts.Add("  guest_score = excluded.guest_score,")
    $sqlParts.Add("  quarter_score = excluded.quarter_score,")
    $sqlParts.Add("  home_table_points = excluded.home_table_points,")
    $sqlParts.Add("  guest_table_points = excluded.guest_table_points,")
    $sqlParts.Add("  round_number = excluded.round_number,")
    $sqlParts.Add("  game_number = excluded.game_number,")
    $sqlParts.Add("  checked = excluded.checked,")
    $sqlParts.Add("  is_home = excluded.is_home,")
    $sqlParts.Add("  opponent_team_code = excluded.opponent_team_code,")
    $sqlParts.Add("  opponent_external_id = excluded.opponent_external_id;")
    $sqlParts.Add("")

    $sqlParts.Add("insert into public.player_team_seasons (player_id, team_season_id, jersey_number, is_active)")
    $sqlParts.Add("select")
    $sqlParts.Add("  p.id,")
    $sqlParts.Add("  ts.id,")
    $sqlParts.Add("  nullif(x.jersey_number, '0'),")
    $sqlParts.Add("  true")
    $sqlParts.Add("from public.players p")
    $sqlParts.Add("join (")
    Add-PlayerValuesSql -SqlParts $sqlParts -PlayerNodes $playerNodes -Formatter {
        param($playerNode)
        "    (" + (Get-SqlTextOrNull (Get-PlayerCode -PlayerNode $playerNode)) + ", " + (Get-SqlTextOrNull $playerNode.number) + ")"
    }
    $sqlParts.Add(") as x(player_code, jersey_number) on x.player_code = p.player_code")
    $sqlParts.Add("join public.teams t on t.team_code = " + (Get-SqlTextOrNull $TeamCode))
    $sqlParts.Add("join public.team_seasons ts on ts.team_id = t.id")
    $sqlParts.Add("join public.seasons s on s.id = ts.season_id")
    $sqlParts.Add("where s.code = " + (Get-SqlTextOrNull $SeasonCode))
    $sqlParts.Add("on conflict (player_id, team_season_id) do update")
    $sqlParts.Add("set")
    $sqlParts.Add("  jersey_number = coalesce(excluded.jersey_number, public.player_team_seasons.jersey_number),")
    $sqlParts.Add("  is_active = true;")
    $sqlParts.Add("")

    $sqlParts.Add("insert into public.game_players (game_id, player_id, player_team_season_id, jersey_number, is_present)")
    $sqlParts.Add("select")
    $sqlParts.Add("  g.id,")
    $sqlParts.Add("  p.id,")
    $sqlParts.Add("  pts.id,")
    $sqlParts.Add("  nullif(x.jersey_number, '0'),")
    $sqlParts.Add("  true")
    $sqlParts.Add("from public.games g")
    $sqlParts.Add("join public.teams t on t.team_code = " + (Get-SqlTextOrNull $TeamCode))
    $sqlParts.Add("join public.team_seasons ts on ts.id = g.team_season_id and ts.team_id = t.id")
    $sqlParts.Add("join public.seasons s on s.id = ts.season_id and s.code = " + (Get-SqlTextOrNull $SeasonCode))
    $sqlParts.Add("join public.player_team_seasons pts on pts.team_season_id = ts.id")
    $sqlParts.Add("join public.players p on p.id = pts.player_id")
    $sqlParts.Add("join (")
    Add-PlayerValuesSql -SqlParts $sqlParts -PlayerNodes $playerNodes -Formatter {
        param($playerNode)
        "    (" + (Get-SqlTextOrNull (Get-PlayerCode -PlayerNode $playerNode)) + ", " + (Get-SqlTextOrNull $playerNode.number) + ")"
    }
    $sqlParts.Add(") as x(player_code, jersey_number) on x.player_code = p.player_code")
    $sqlParts.Add("where g.external_id = " + (Get-SqlTextOrNull $game.id))
    $sqlParts.Add("on conflict (game_id, player_id) do update")
    $sqlParts.Add("set")
    $sqlParts.Add("  player_team_season_id = excluded.player_team_season_id,")
    $sqlParts.Add("  jersey_number = excluded.jersey_number,")
    $sqlParts.Add("  is_present = excluded.is_present;")
    $sqlParts.Add("")

    $sqlParts.Add("insert into public.player_game_stats (")
    $sqlParts.Add("  game_player_id,")
    $sqlParts.Add("  started,")
    $sqlParts.Add("  seconds_played,")
    $sqlParts.Add("  points,")
    $sqlParts.Add("  ft_made,")
    $sqlParts.Add("  ft_missed,")
    $sqlParts.Add("  fg2_made,")
    $sqlParts.Add("  fg2_missed,")
    $sqlParts.Add("  fg3_made,")
    $sqlParts.Add("  fg3_missed,")
    $sqlParts.Add("  defensive_rebounds,")
    $sqlParts.Add("  offensive_rebounds,")
    $sqlParts.Add("  blocks,")
    $sqlParts.Add("  assists,")
    $sqlParts.Add("  steals,")
    $sqlParts.Add("  turnovers,")
    $sqlParts.Add("  fouls_drawn,")
    $sqlParts.Add("  personal_fouls,")
    $sqlParts.Add("  unsportsmanlike_fouls,")
    $sqlParts.Add("  technical_fouls,")
    $sqlParts.Add("  disqualifying_fouls")
    $sqlParts.Add(")")
    $sqlParts.Add("select")
    $sqlParts.Add("  gp.id,")
    $sqlParts.Add("  x.started,")
    $sqlParts.Add("  x.seconds_played,")
    $sqlParts.Add("  x.points,")
    $sqlParts.Add("  x.ft_made,")
    $sqlParts.Add("  x.ft_missed,")
    $sqlParts.Add("  x.fg2_made,")
    $sqlParts.Add("  x.fg2_missed,")
    $sqlParts.Add("  x.fg3_made,")
    $sqlParts.Add("  x.fg3_missed,")
    $sqlParts.Add("  x.defensive_rebounds,")
    $sqlParts.Add("  x.offensive_rebounds,")
    $sqlParts.Add("  x.blocks,")
    $sqlParts.Add("  x.assists,")
    $sqlParts.Add("  x.steals,")
    $sqlParts.Add("  x.turnovers,")
    $sqlParts.Add("  x.fouls_drawn,")
    $sqlParts.Add("  x.personal_fouls,")
    $sqlParts.Add("  x.unsportsmanlike_fouls,")
    $sqlParts.Add("  x.technical_fouls,")
    $sqlParts.Add("  x.disqualifying_fouls")
    $sqlParts.Add("from public.games g")
    $sqlParts.Add("join public.game_players gp on gp.game_id = g.id")
    $sqlParts.Add("join public.players p on p.id = gp.player_id")
    $sqlParts.Add("join (")
    Add-PlayerValuesSql -SqlParts $sqlParts -PlayerNodes $playerNodes -Formatter {
        param($playerNode)
        "    (" +
            (Get-SqlTextOrNull (Get-PlayerCode -PlayerNode $playerNode)) + ", " +
            (Get-BoolSql $playerNode.starter) + ", " +
            (Get-SqlIntOrNull $playerNode.seconds) + ", " +
            (Get-SqlIntOrNull $playerNode.points) + ", " +
            (Get-SqlIntOrNull $playerNode.zs1p) + ", " +
            (Get-SqlIntOrNull $playerNode.zs1m) + ", " +
            (Get-SqlIntOrNull $playerNode.zs2pp) + ", " +
            (Get-SqlIntOrNull $playerNode.zs2pm) + ", " +
            (Get-SqlIntOrNull $playerNode.zs3p) + ", " +
            (Get-SqlIntOrNull $playerNode.zs3m) + ", " +
            (Get-SqlIntOrNull $playerNode.zrd) + ", " +
            (Get-SqlIntOrNull $playerNode.zro) + ", " +
            (Get-SqlIntOrNull $playerNode.zbl) + ", " +
            (Get-SqlIntOrNull $playerNode.zas) + ", " +
            (Get-SqlIntOrNull $playerNode.zst) + ", " +
            (Get-SqlIntOrNull $playerNode.zls) + ", " +
            (Get-SqlIntOrNull $playerNode.zaf) + ", " +
            (Get-SqlIntOrNull $playerNode.zpf) + ", " +
            (Get-SqlIntOrNull $playerNode.zuf) + ", " +
            (Get-SqlIntOrNull $playerNode.ztf) + ", " +
            (Get-SqlIntOrNull $playerNode.zdf) +
        ")"
    }
    $sqlParts.Add(") as x(")
    $sqlParts.Add("  player_code,")
    $sqlParts.Add("  started,")
    $sqlParts.Add("  seconds_played,")
    $sqlParts.Add("  points,")
    $sqlParts.Add("  ft_made,")
    $sqlParts.Add("  ft_missed,")
    $sqlParts.Add("  fg2_made,")
    $sqlParts.Add("  fg2_missed,")
    $sqlParts.Add("  fg3_made,")
    $sqlParts.Add("  fg3_missed,")
    $sqlParts.Add("  defensive_rebounds,")
    $sqlParts.Add("  offensive_rebounds,")
    $sqlParts.Add("  blocks,")
    $sqlParts.Add("  assists,")
    $sqlParts.Add("  steals,")
    $sqlParts.Add("  turnovers,")
    $sqlParts.Add("  fouls_drawn,")
    $sqlParts.Add("  personal_fouls,")
    $sqlParts.Add("  unsportsmanlike_fouls,")
    $sqlParts.Add("  technical_fouls,")
    $sqlParts.Add("  disqualifying_fouls")
    $sqlParts.Add(") on x.player_code = p.player_code")
    $sqlParts.Add("where g.external_id = " + (Get-SqlTextOrNull $game.id))
    $sqlParts.Add("on conflict (game_player_id) do update")
    $sqlParts.Add("set")
    $sqlParts.Add("  started = excluded.started,")
    $sqlParts.Add("  seconds_played = excluded.seconds_played,")
    $sqlParts.Add("  points = excluded.points,")
    $sqlParts.Add("  ft_made = excluded.ft_made,")
    $sqlParts.Add("  ft_missed = excluded.ft_missed,")
    $sqlParts.Add("  fg2_made = excluded.fg2_made,")
    $sqlParts.Add("  fg2_missed = excluded.fg2_missed,")
    $sqlParts.Add("  fg3_made = excluded.fg3_made,")
    $sqlParts.Add("  fg3_missed = excluded.fg3_missed,")
    $sqlParts.Add("  defensive_rebounds = excluded.defensive_rebounds,")
    $sqlParts.Add("  offensive_rebounds = excluded.offensive_rebounds,")
    $sqlParts.Add("  blocks = excluded.blocks,")
    $sqlParts.Add("  assists = excluded.assists,")
    $sqlParts.Add("  steals = excluded.steals,")
    $sqlParts.Add("  turnovers = excluded.turnovers,")
    $sqlParts.Add("  fouls_drawn = excluded.fouls_drawn,")
    $sqlParts.Add("  personal_fouls = excluded.personal_fouls,")
    $sqlParts.Add("  unsportsmanlike_fouls = excluded.unsportsmanlike_fouls,")
    $sqlParts.Add("  technical_fouls = excluded.technical_fouls,")
    $sqlParts.Add("  disqualifying_fouls = excluded.disqualifying_fouls;")
    $sqlParts.Add("")
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    if ($sources.Count -eq 1) {
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($sources[0].SourceLabel)
        $OutputPath = Join-Path (Get-Location) "generated_import_$baseName.sql"
    } else {
        $OutputPath = Join-Path (Get-Location) "generated_import_batch.sql"
    }
}

Set-Content -LiteralPath $OutputPath -Value ($sqlParts -join [Environment]::NewLine) -Encoding UTF8

$missingPlayersReport = Join-Path (Split-Path -Parent $OutputPath) ([System.IO.Path]::GetFileNameWithoutExtension($OutputPath) + "_missing_players.sql")

$missingSqlParts = New-Object System.Collections.Generic.List[string]
$missingSqlParts.Add("-- Missing players report for generated import")
$missingSqlParts.Add("select x.player_code")
$missingSqlParts.Add("from (")
$missingSqlParts.Add("  values")
$missingSqlParts.Add((@($allPlayerCodes | ForEach-Object { "    (" + (Get-SqlTextOrNull $_) + ")" }) -join ",`n"))
$missingSqlParts.Add(") as x(player_code)")
$missingSqlParts.Add("left join public.players p on p.player_code = x.player_code")
$missingSqlParts.Add("where p.id is null")
$missingSqlParts.Add("order by x.player_code;")

Set-Content -LiteralPath $missingPlayersReport -Value ($missingSqlParts -join [Environment]::NewLine) -Encoding UTF8

$summary = [pscustomobject]@{
    GamesProcessed = $reportRows.Count
    TeamCode = $TeamCode
    SeasonCode = $SeasonCode
    OutputPath = $OutputPath
    MissingPlayersSql = $missingPlayersReport
}

$summary | Format-List
$reportRows | Format-Table -AutoSize
