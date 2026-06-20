param(
    [Parameter(Mandatory = $true)]
    [string]$GameIds,
    [Parameter(Mandatory = $true)]
    [string]$TeamCode,
    [Parameter(Mandatory = $true)]
    [string]$SeasonCode
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$GameIdList = @(
    ($GameIds -split '[,\s;]+' | ForEach-Object { $_.Trim() }) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
)

function Get-SupabaseConfig {
    $url = $env:SUPABASE_URL
    $serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

    if ([string]::IsNullOrWhiteSpace($url)) {
        throw "Chybí SUPABASE_URL."
    }

    if ([string]::IsNullOrWhiteSpace($serviceRoleKey)) {
        throw "Chybí SUPABASE_SERVICE_ROLE_KEY."
    }

    return [pscustomobject]@{
        Url = $url.TrimEnd('/')
        ServiceRoleKey = $serviceRoleKey
    }
}

function Get-SupabaseHeaders {
    param(
        [string]$ServiceRoleKey,
        [string]$Prefer = $null
    )

    $headers = @{
        apikey = $ServiceRoleKey
        Authorization = "Bearer $ServiceRoleKey"
    }

    if (-not [string]::IsNullOrWhiteSpace($Prefer)) {
        $headers["Prefer"] = $Prefer
    }

    return $headers
}

function ConvertTo-Array {
    param(
        [AllowNull()]
        [object]$Value
    )

    if ($null -eq $Value) {
        return @()
    }

    return @($Value)
}

function Invoke-SupabaseGet {
    param(
        [string]$BaseUrl,
        [string]$ServiceRoleKey,
        [string]$Table,
        [string]$Query
    )

    $uri = "${BaseUrl}/rest/v1/${Table}?${Query}"
    $headers = Get-SupabaseHeaders -ServiceRoleKey $ServiceRoleKey
    return Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
}

function Invoke-SupabaseUpsert {
    param(
        [string]$BaseUrl,
        [string]$ServiceRoleKey,
        [string]$Table,
        [object[]]$Rows,
        [string]$OnConflict
    )

    if (@($Rows).Count -eq 0) {
        return @()
    }

    $query = "on_conflict=$([uri]::EscapeDataString($OnConflict))&select=*"
    $uri = "${BaseUrl}/rest/v1/${Table}?${query}"
    $headers = Get-SupabaseHeaders -ServiceRoleKey $ServiceRoleKey -Prefer "resolution=merge-duplicates,return=representation"
    $body = @($Rows) | ConvertTo-Json -Depth 10 -Compress

    try {
        return Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body
    } catch {
        throw "Supabase upsert failed for table '$Table'. Body: $body. Error: $($_.Exception.Message)"
    }
}

function Invoke-SupabaseInsert {
    param(
        [string]$BaseUrl,
        [string]$ServiceRoleKey,
        [string]$Table,
        [object[]]$Rows
    )

    if (@($Rows).Count -eq 0) {
        return @()
    }

    $uri = "${BaseUrl}/rest/v1/${Table}?select=*"
    $headers = Get-SupabaseHeaders -ServiceRoleKey $ServiceRoleKey -Prefer "return=representation"
    $body = @($Rows) | ConvertTo-Json -Depth 10 -Compress

    try {
        return Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body
    } catch {
        throw "Supabase insert failed for table '$Table'. Body: $body. Error: $($_.Exception.Message)"
    }
}

function Invoke-SupabasePatch {
    param(
        [string]$BaseUrl,
        [string]$ServiceRoleKey,
        [string]$Table,
        [string]$Query,
        [object]$Row
    )

    $uri = "${BaseUrl}/rest/v1/${Table}?${Query}&select=*"
    $headers = Get-SupabaseHeaders -ServiceRoleKey $ServiceRoleKey -Prefer "return=representation"
    $body = $Row | ConvertTo-Json -Depth 10 -Compress

    try {
        return Invoke-RestMethod -Method Patch -Uri $uri -Headers $headers -ContentType "application/json; charset=utf-8" -Body $body
    } catch {
        throw "Supabase patch failed for table '$Table'. Body: $body. Error: $($_.Exception.Message)"
    }
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

function Get-GamePlayerNodes {
    param(
        [object]$GameNode,
        [string]$PlayerSideName
    )

    if ($null -eq $GameNode) {
        return @()
    }

    if ($null -eq $GameNode.stats) {
        return @()
    }

    $sideNode = $GameNode.stats.$PlayerSideName
    if ($null -eq $sideNode) {
        return @()
    }

    if ($sideNode.PSObject.Properties.Name -notcontains "player") {
        return @()
    }

    return @($sideNode.player)
}

function Find-SingleRow {
    param(
        [object[]]$Rows,
        [string]$Description
    )

    $items = ConvertTo-Array $Rows
    if (@($items).Count -ne 1) {
        throw "Nepodařilo se jednoznačně najít $Description. Nalezeno: $(@($items).Count)."
    }

    return $items[0]
}

function Get-InFilter {
    param(
        [string[]]$Values
    )

    $quoted = $Values | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' }
    return '(' + ($quoted -join ',') + ')'
}

function Get-OrCreateCompetition {
    param(
        [string]$BaseUrl,
        [string]$ServiceRoleKey,
        [object]$GameNode
    )

    $competitionCode = [string]$GameNode.idcompetition
    $competitionName = if ([string]::IsNullOrWhiteSpace([string]$GameNode.cname)) { [string]$GameNode.catname } else { [string]$GameNode.cname }
    $row = [pscustomobject]@{
        competition_code = $competitionCode
        name = $competitionName
        competition_group_code = [string]$GameNode.idcompetitiongroup
        phase_code = [string]$GameNode.idphase
        category_name = [string]$GameNode.catname
        competition_group_name = [string]$GameNode.cgname
        phase_name = [string]$GameNode.pname
        unit_name = if ([string]::IsNullOrWhiteSpace([string]$GameNode.uname)) { $null } else { [string]$GameNode.uname }
    }

    $byCode = ConvertTo-Array (Invoke-SupabaseGet -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Query ("competition_code=eq." + [uri]::EscapeDataString($competitionCode) + "&select=*"))
    if (@($byCode).Count -eq 1) {
        $patched = ConvertTo-Array (Invoke-SupabasePatch -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Query ("id=eq." + $byCode[0].id) -Row $row)
        return (Find-SingleRow -Rows $patched -Description "soutěž '$competitionCode'")
    }

    if (-not [string]::IsNullOrWhiteSpace([string]$row.competition_group_code)) {
        $byGroupCode = ConvertTo-Array (Invoke-SupabaseGet -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Query ("competition_group_code=eq." + [uri]::EscapeDataString([string]$row.competition_group_code) + "&select=*"))
        if (@($byGroupCode).Count -eq 1) {
            $patched = ConvertTo-Array (Invoke-SupabasePatch -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Query ("id=eq." + $byGroupCode[0].id) -Row $row)
            return (Find-SingleRow -Rows $patched -Description "soutěž se skupinou '$($row.competition_group_code)'")
        }
    }

    $byName = ConvertTo-Array (Invoke-SupabaseGet -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Query ("name=eq." + [uri]::EscapeDataString($competitionName) + "&select=*"))
    if (@($byName).Count -eq 1) {
        $patched = ConvertTo-Array (Invoke-SupabasePatch -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Query ("id=eq." + $byName[0].id) -Row $row)
        return (Find-SingleRow -Rows $patched -Description "soutěž '$competitionName'")
    }

    try {
        $inserted = ConvertTo-Array (Invoke-SupabaseInsert -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Rows @($row))
        return (Find-SingleRow -Rows $inserted -Description "soutěž '$competitionCode'")
    } catch {
        $retryRows = @()

        $retryRows += ConvertTo-Array (Invoke-SupabaseGet -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Query ("competition_code=eq." + [uri]::EscapeDataString($competitionCode) + "&select=*"))

        if (-not [string]::IsNullOrWhiteSpace([string]$row.competition_group_code)) {
            $retryRows += ConvertTo-Array (Invoke-SupabaseGet -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Query ("competition_group_code=eq." + [uri]::EscapeDataString([string]$row.competition_group_code) + "&select=*"))
        }

        $retryRows += ConvertTo-Array (Invoke-SupabaseGet -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Query ("name=eq." + [uri]::EscapeDataString($competitionName) + "&select=*"))

        $uniqueRetryRows = @($retryRows | Group-Object id | ForEach-Object { $_.Group[0] })
        if (@($uniqueRetryRows).Count -ge 1) {
            $patched = ConvertTo-Array (Invoke-SupabasePatch -BaseUrl $BaseUrl -ServiceRoleKey $ServiceRoleKey -Table "competitions" -Query ("id=eq." + $uniqueRetryRows[0].id) -Row $row)
            return (Find-SingleRow -Rows $patched -Description "soutěž '$competitionCode'")
        }

        throw
    }
}

try {
    $config = Get-SupabaseConfig

    $seasonRows = ConvertTo-Array (Invoke-SupabaseGet -BaseUrl $config.Url -ServiceRoleKey $config.ServiceRoleKey -Table "seasons" -Query ("code=eq." + [uri]::EscapeDataString($SeasonCode) + "&select=id,code"))
    $season = Find-SingleRow -Rows $seasonRows -Description "sezónu '$SeasonCode'"

    $teamRows = ConvertTo-Array (Invoke-SupabaseGet -BaseUrl $config.Url -ServiceRoleKey $config.ServiceRoleKey -Table "teams" -Query ("team_code=eq." + [uri]::EscapeDataString($TeamCode) + "&select=id,team_code,name"))
    $team = Find-SingleRow -Rows $teamRows -Description "tým '$TeamCode'"

    $teamSeasonRows = ConvertTo-Array (Invoke-SupabaseGet -BaseUrl $config.Url -ServiceRoleKey $config.ServiceRoleKey -Table "team_seasons" -Query ("team_id=eq." + $team.id + "&season_id=eq." + $season.id + "&select=id,team_id,season_id"))
    $teamSeason = Find-SingleRow -Rows $teamSeasonRows -Description "team_season pro tým '$TeamCode' a sezónu '$SeasonCode'"

    $summaries = New-Object System.Collections.Generic.List[object]

    foreach ($gameId in $GameIdList) {
    if ([string]::IsNullOrWhiteSpace($gameId)) {
        continue
    }

    $sourceUrl = "https://www.cbf.cz/xml/gamestats.php?g=$gameId"
    $response = Invoke-WebRequest -Uri $sourceUrl -UseBasicParsing
    [xml]$xml = $response.Content
    $game = $xml.game

    if ($null -eq $game) {
        throw "Ve zdroji pro game '$gameId' nebyl nalezen element <game>."
    }

    $teams = @($game.team)
    $matchingTeams = @($teams | Where-Object { [string]$_.identity -eq $TeamCode })
    if (@($matchingTeams).Count -ne 1) {
        throw "Ve zdroji pro game '$gameId' se nepodařilo jednoznačně určit náš tým '$TeamCode'. Nalezeno: $(@($matchingTeams).Count)."
    }

    $ourTeam = $matchingTeams[0]
    $opponentTeam = @($teams | Where-Object { $_ -ne $ourTeam })[0]
    $isHome = ([string]$ourTeam.guest) -eq '0'
    $playerSideName = Get-PlayerBlockSideName -GuestFlag ([string]$ourTeam.guest)
    $playerNodes = Get-GamePlayerNodes -GameNode $game -PlayerSideName $playerSideName
    $competition = Get-OrCreateCompetition -BaseUrl $config.Url -ServiceRoleKey $config.ServiceRoleKey -GameNode $game

    $venueRows = ConvertTo-Array (Invoke-SupabaseUpsert -BaseUrl $config.Url -ServiceRoleKey $config.ServiceRoleKey -Table "venues" -OnConflict "external_id" -Rows @([pscustomobject]@{
        name = [string]$game.hallname
        court_name = $null
        external_id = [string]$game.IDhall
    }))
    $venue = Find-SingleRow -Rows $venueRows -Description "halu pro game '$gameId'"

    $gameRows = ConvertTo-Array (Invoke-SupabaseUpsert -BaseUrl $config.Url -ServiceRoleKey $config.ServiceRoleKey -Table "games" -OnConflict "external_id,team_season_id" -Rows @([pscustomobject]@{
        season_id = $season.id
        team_season_id = $teamSeason.id
        competition_id = $competition.id
        venue_id = $venue.id
        external_id = [string]$game.id
        opponent_name = [string]$opponentTeam.name
        scheduled_at = [string]$game.date
        source_type = "xml"
        source_file_name = "gamestats_$gameId.xml"
        source_url = $sourceUrl
        home_score = [int]$game.score_home
        guest_score = [int]$game.score_guest
        quarter_score = [string]$game.score_quarter
        home_table_points = [int]$game.points_home
        guest_table_points = [int]$game.points_guest
        round_number = [int]$game.round
        game_number = [int]$game.num
        checked = ([string]$game.checked) -eq '1'
        is_home = $isHome
        opponent_team_code = [string]$opponentTeam.identity
        opponent_external_id = [string]$opponentTeam.id
    }))
    $gameRow = Find-SingleRow -Rows $gameRows -Description "utkání '$gameId'"

    $playerCodes = @($playerNodes | ForEach-Object { Get-PlayerCode -PlayerNode $_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
    $playersQuery = "player_code=in." + [uri]::EscapeDataString((Get-InFilter -Values $playerCodes)) + "&select=id,player_code,full_name"
    $playerRows = ConvertTo-Array (Invoke-SupabaseGet -BaseUrl $config.Url -ServiceRoleKey $config.ServiceRoleKey -Table "players" -Query $playersQuery)
    $playersByCode = @{}
    foreach ($player in $playerRows) {
        $playersByCode[[string]$player.player_code] = $player
    }

    $missingPlayerCodes = New-Object System.Collections.Generic.List[string]
    foreach ($playerCode in $playerCodes) {
        if (-not $playersByCode.ContainsKey($playerCode)) {
            $missingPlayerCodes.Add($playerCode)
        }
    }

    $ptsRowsToUpsert = New-Object System.Collections.Generic.List[object]
    foreach ($playerNode in $playerNodes) {
        $playerCode = Get-PlayerCode -PlayerNode $playerNode
        if (-not $playersByCode.ContainsKey($playerCode)) {
            continue
        }

        $player = $playersByCode[$playerCode]
        $jersey = [string]$playerNode.number
        if ($jersey -eq '0') {
            $jersey = $null
        }

        $ptsRowsToUpsert.Add([pscustomobject]@{
            player_id = $player.id
            team_season_id = $teamSeason.id
            jersey_number = $jersey
            is_active = $true
        })
    }

    $ptsRows = ConvertTo-Array (Invoke-SupabaseUpsert -BaseUrl $config.Url -ServiceRoleKey $config.ServiceRoleKey -Table "player_team_seasons" -OnConflict "player_id,team_season_id" -Rows $ptsRowsToUpsert.ToArray())
    $ptsByPlayerId = @{}
    foreach ($pts in $ptsRows) {
        $ptsByPlayerId[[string]$pts.player_id] = $pts
    }

    $gamePlayerRowsToUpsert = New-Object System.Collections.Generic.List[object]
    foreach ($playerNode in $playerNodes) {
        $playerCode = Get-PlayerCode -PlayerNode $playerNode
        if (-not $playersByCode.ContainsKey($playerCode)) {
            continue
        }

        $player = $playersByCode[$playerCode]
        if (-not $ptsByPlayerId.ContainsKey([string]$player.id)) {
            continue
        }

        $jersey = [string]$playerNode.number
        if ($jersey -eq '0') {
            $jersey = $null
        }

        $gamePlayerRowsToUpsert.Add([pscustomobject]@{
            game_id = $gameRow.id
            player_id = $player.id
            player_team_season_id = $ptsByPlayerId[[string]$player.id].id
            jersey_number = $jersey
            is_present = $true
        })
    }

    $gamePlayerRows = ConvertTo-Array (Invoke-SupabaseUpsert -BaseUrl $config.Url -ServiceRoleKey $config.ServiceRoleKey -Table "game_players" -OnConflict "game_id,player_id" -Rows $gamePlayerRowsToUpsert.ToArray())
    $gamePlayersByPlayerId = @{}
    foreach ($gamePlayer in $gamePlayerRows) {
        $gamePlayersByPlayerId[[string]$gamePlayer.player_id] = $gamePlayer
    }

    $statsRowsToUpsert = New-Object System.Collections.Generic.List[object]
    foreach ($playerNode in $playerNodes) {
        $playerCode = Get-PlayerCode -PlayerNode $playerNode
        if (-not $playersByCode.ContainsKey($playerCode)) {
            continue
        }

        $player = $playersByCode[$playerCode]
        if (-not $gamePlayersByPlayerId.ContainsKey([string]$player.id)) {
            continue
        }

        $statsRowsToUpsert.Add([pscustomobject]@{
            game_player_id = $gamePlayersByPlayerId[[string]$player.id].id
            started = ([string]$playerNode.starter) -eq '1'
            seconds_played = [int]$playerNode.seconds
            points = [int]$playerNode.points
            ft_made = [int]$playerNode.zs1p
            ft_missed = [int]$playerNode.zs1m
            fg2_made = [int]$playerNode.zs2pp
            fg2_missed = [int]$playerNode.zs2pm
            fg3_made = [int]$playerNode.zs3p
            fg3_missed = [int]$playerNode.zs3m
            defensive_rebounds = [int]$playerNode.zrd
            offensive_rebounds = [int]$playerNode.zro
            blocks = [int]$playerNode.zbl
            assists = [int]$playerNode.zas
            steals = [int]$playerNode.zst
            turnovers = [int]$playerNode.zls
            fouls_drawn = [int]$playerNode.zaf
            personal_fouls = [int]$playerNode.zpf
            unsportsmanlike_fouls = [int]$playerNode.zuf
            technical_fouls = [int]$playerNode.ztf
            disqualifying_fouls = [int]$playerNode.zdf
        })
    }

    $statsRows = ConvertTo-Array (Invoke-SupabaseUpsert -BaseUrl $config.Url -ServiceRoleKey $config.ServiceRoleKey -Table "player_game_stats" -OnConflict "game_player_id" -Rows $statsRowsToUpsert.ToArray())

    $summaries.Add([pscustomobject]@{
        game_id = [string]$game.id
        our_team = [string]$ourTeam.name
        opponent = [string]$opponentTeam.name
        imported_players = @($gamePlayerRows).Count
        imported_stats = @($statsRows).Count
        missing_player_codes = $missingPlayerCodes.ToArray()
    })
    }

    $result = [pscustomobject]@{
        team_code = $TeamCode
        season_code = $SeasonCode
        games_processed = $summaries.Count
        games = $summaries.ToArray()
    }

    $result | ConvertTo-Json -Depth 10
} catch {
    $details = [pscustomobject]@{
        message = $_.Exception.Message
        line = $_.InvocationInfo.ScriptLineNumber
        position = $_.InvocationInfo.PositionMessage
        stack = $_.ScriptStackTrace
    }

    $details | ConvertTo-Json -Depth 5
    exit 1
}
