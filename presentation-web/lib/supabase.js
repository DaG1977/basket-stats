const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const CLUB_NAME = process.env.PRESENTATION_CLUB_NAME || "BK Skokani Brno, z. s.";

function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Chybí SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY.");
  }
}

function buildSupabaseUrl(tableOrPath, query = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${tableOrPath}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    url.searchParams.set(key, value);
  }
  return url;
}

async function supabaseSelect(tableOrPath, query = {}) {
  assertSupabaseConfigured();
  const url = buildSupabaseUrl(tableOrPath, query);
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text}`);
  }

  return response.json();
}

function formatSeasonLabel(code) {
  return String(code || "").replace("-", "/");
}

function getBirthYear(birthDate) {
  const match = String(birthDate || "").match(/^(\d{4})/);
  return match ? match[1] : "";
}

function formatGameResult(game) {
  if (game.home_score == null || game.guest_score == null) {
    return "";
  }
  return `${game.home_score}:${game.guest_score}`;
}

function getOurScore(game) {
  if (game.home_score == null || game.guest_score == null || game.is_home == null) {
    return null;
  }
  return game.is_home ? game.home_score : game.guest_score;
}

function getOpponentScore(game) {
  if (game.home_score == null || game.guest_score == null || game.is_home == null) {
    return null;
  }
  return game.is_home ? game.guest_score : game.home_score;
}

function uniqueCount(values) {
  return new Set(values.filter(Boolean)).size;
}

async function loadClubId() {
  const rows = await supabaseSelect("clubs", {
    select: "id,name",
    name: `eq.${CLUB_NAME}`,
    limit: "1"
  });

  if (!rows.length) {
    throw new Error(`Klub "${CLUB_NAME}" nebyl v databázi nalezen.`);
  }

  return rows[0].id;
}

export async function loadSeasons() {
  const rows = await supabaseSelect("seasons", {
    select: "id,code,name,start_date,end_date",
    order: "start_date.desc.nullslast,code.desc"
  });

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name || formatSeasonLabel(row.code)
  }));
}

export async function loadTeamSeasons(seasonCode) {
  const clubId = await loadClubId();
  const rows = await supabaseSelect("team_seasons", {
    select: "id,category,coach_name,is_active,teams!inner(id,name,team_code,club_id),seasons!inner(id,code,name)",
    "seasons.code": `eq.${seasonCode}`,
    "teams.club_id": `eq.${clubId}`
  });

  return rows
    .map((row) => ({
      id: row.id,
      category: row.category,
      coachName: row.coach_name,
      isActive: row.is_active,
      team: {
        id: row.teams.id,
        name: row.teams.name,
        teamCode: row.teams.team_code
      },
      season: {
        id: row.seasons.id,
        code: row.seasons.code,
        name: row.seasons.name || formatSeasonLabel(row.seasons.code)
      }
    }))
    .sort((left, right) => left.team.name.localeCompare(right.team.name, "cs"));
}

async function loadTeamSeason(teamSeasonId) {
  const rows = await supabaseSelect("team_seasons", {
    select: "id,category,coach_name,is_active,teams!inner(id,name,team_code),seasons!inner(id,code,name)",
    id: `eq.${teamSeasonId}`,
    limit: "1"
  });

  if (!rows.length) {
    throw new Error("Tým pro tuto sezónu nebyl nalezen.");
  }

  const row = rows[0];
  return {
    id: row.id,
    category: row.category,
    coachName: row.coach_name,
    isActive: row.is_active,
    team: {
      id: row.teams.id,
      name: row.teams.name,
      teamCode: row.teams.team_code
    },
    season: {
      id: row.seasons.id,
      code: row.seasons.code,
      name: row.seasons.name || formatSeasonLabel(row.seasons.code)
    }
  };
}

async function loadRoster(teamSeasonId) {
  const rows = await supabaseSelect("player_team_seasons", {
    select: "id,jersey_number,valid_from,valid_to,assignment_type,source_club_name,is_active,players!inner(id,full_name,player_code,birth_date)",
    team_season_id: `eq.${teamSeasonId}`
  });

  return rows
    .map((row) => ({
      id: row.id,
      jerseyNumber: row.jersey_number,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      assignmentType: row.assignment_type,
      sourceClubName: row.source_club_name,
      isActive: row.is_active,
      player: {
        id: row.players.id,
        fullName: row.players.full_name,
        playerCode: row.players.player_code,
        birthDate: row.players.birth_date,
        birthYear: getBirthYear(row.players.birth_date)
      }
    }))
    .sort((left, right) => left.player.fullName.localeCompare(right.player.fullName, "cs"));
}

async function loadGames(teamSeasonId) {
  const rows = await supabaseSelect("games", {
    select: "id,external_id,opponent_name,scheduled_at,is_home,home_score,guest_score,checked,round_number,competitions(id,name,category_name,competition_group_name,phase_name),venues(id,name,court_name)",
    team_season_id: `eq.${teamSeasonId}`,
    order: "scheduled_at.desc.nullslast,id.desc"
  });

  return rows.map((row) => ({
    id: row.id,
    externalId: row.external_id,
    opponentName: row.opponent_name,
    scheduledAt: row.scheduled_at,
    isHome: row.is_home,
    homeScore: row.home_score,
    guestScore: row.guest_score,
    checked: row.checked,
    roundNumber: row.round_number,
    resultLabel: formatGameResult(row),
    competition: row.competitions
      ? {
          id: row.competitions.id,
          name: row.competitions.name,
          categoryName: row.competitions.category_name,
          competitionGroupName: row.competitions.competition_group_name,
          phaseName: row.competitions.phase_name
        }
      : null,
    venue: row.venues
      ? {
          id: row.venues.id,
          name: row.venues.name,
          courtName: row.venues.court_name
        }
      : null
  }));
}

async function loadGamePlayers(gameId) {
  const rows = await supabaseSelect("game_players", {
    select: "id,game_id,player_id,player_team_season_id,jersey_number,is_present,players!inner(id,full_name,player_code,birth_date),player_game_stats(id,points,seconds_played,ft_made,ft_missed,fg2_made,fg2_missed,fg3_made,fg3_missed,personal_fouls,assists,steals,turnovers,defensive_rebounds,offensive_rebounds,blocks)",
    game_id: `eq.${gameId}`
  });

  return rows
    .map((row) => {
      const stats = Array.isArray(row.player_game_stats) ? row.player_game_stats[0] : row.player_game_stats;
      return {
        id: row.id,
        gameId: row.game_id,
        playerId: row.player_id,
        playerTeamSeasonId: row.player_team_season_id,
        jerseyNumber: row.jersey_number,
        isPresent: row.is_present,
        player: {
          id: row.players.id,
          fullName: row.players.full_name,
          playerCode: row.players.player_code,
          birthDate: row.players.birth_date,
          birthYear: getBirthYear(row.players.birth_date)
        },
        stats: stats
          ? {
              points: stats.points,
              secondsPlayed: stats.seconds_played,
              ftMade: stats.ft_made,
              ftMissed: stats.ft_missed,
              fg2Made: stats.fg2_made,
              fg2Missed: stats.fg2_missed,
              fg3Made: stats.fg3_made,
              fg3Missed: stats.fg3_missed,
              personalFouls: stats.personal_fouls,
              assists: stats.assists,
              steals: stats.steals,
              turnovers: stats.turnovers,
              defensiveRebounds: stats.defensive_rebounds,
              offensiveRebounds: stats.offensive_rebounds,
              blocks: stats.blocks
            }
          : null
      };
    })
    .sort((left, right) => left.player.fullName.localeCompare(right.player.fullName, "cs"));
}

function buildPlayerSummaries(rosterRows, gameRows, gamePlayerRows, calendarYear) {
  const gameById = new Map(gameRows.map((game) => [game.id, game]));
  const summaries = new Map();

  for (const rosterEntry of rosterRows) {
    summaries.set(rosterEntry.player.id, {
      playerId: rosterEntry.player.id,
      playerCode: rosterEntry.player.playerCode,
      fullName: rosterEntry.player.fullName,
      birthYear: rosterEntry.player.birthYear,
      jerseyNumber: rosterEntry.jerseyNumber,
      assignmentType: rosterEntry.assignmentType,
      sourceClubName: rosterEntry.sourceClubName,
      validFrom: rosterEntry.validFrom,
      validTo: rosterEntry.validTo,
      gamesPlayed: 0,
      competitionDaysInYear: 0,
      totalPoints: 0
    });
  }

  const groupedGamePlayers = new Map();
  for (const gamePlayer of gamePlayerRows) {
    if (!groupedGamePlayers.has(gamePlayer.playerId)) {
      groupedGamePlayers.set(gamePlayer.playerId, []);
    }
    groupedGamePlayers.get(gamePlayer.playerId).push(gamePlayer);
  }

  for (const [playerId, summary] of summaries.entries()) {
    const items = groupedGamePlayers.get(playerId) || [];
    const playerGames = items.filter((item) => item.isPresent !== false);
    const dayLabels = [];
    let totalPoints = 0;

    for (const item of playerGames) {
      const game = gameById.get(item.gameId);
      if (!game) {
        continue;
      }
      if (item.stats && Number.isFinite(item.stats.points)) {
        totalPoints += item.stats.points;
      }
      if (game.scheduledAt) {
        const dateLabel = String(game.scheduledAt).slice(0, 10);
        if (!calendarYear || dateLabel.startsWith(`${calendarYear}-`)) {
          dayLabels.push(dateLabel);
        }
      }
    }

    summary.gamesPlayed = playerGames.length;
    summary.competitionDaysInYear = uniqueCount(dayLabels);
    summary.totalPoints = totalPoints;
  }

  return [...summaries.values()].sort((left, right) => left.fullName.localeCompare(right.fullName, "cs"));
}

export async function buildOverview(seasonCode) {
  const teamSeasons = await loadTeamSeasons(seasonCode);
  const items = [];

  for (const teamSeason of teamSeasons) {
    const [roster, games] = await Promise.all([loadRoster(teamSeason.id), loadGames(teamSeason.id)]);

    items.push({
      id: teamSeason.id,
      teamName: teamSeason.team.name,
      teamCode: teamSeason.team.teamCode,
      category: teamSeason.category,
      coachName: teamSeason.coachName,
      rosterCount: roster.filter((item) => item.isActive).length,
      gameCount: games.length,
      latestGame: games[0] || null
    });
  }

  return items.sort((left, right) => left.teamName.localeCompare(right.teamName, "cs"));
}

export async function buildTeamSeasonDetail(teamSeasonId, calendarYear) {
  const teamSeason = await loadTeamSeason(teamSeasonId);
  const [roster, games] = await Promise.all([loadRoster(teamSeasonId), loadGames(teamSeasonId)]);

  const gamePlayersPerGame = await Promise.all(games.map((game) => loadGamePlayers(game.id)));
  const flatGamePlayers = gamePlayersPerGame.flat();
  const playerSummaries = buildPlayerSummaries(roster, games, flatGamePlayers, calendarYear);
  const wins = games.filter((game) => {
    const ourScore = getOurScore(game);
    const opponentScore = getOpponentScore(game);
    return ourScore != null && opponentScore != null && ourScore > opponentScore;
  }).length;

  return {
    teamSeason,
    roster,
    games,
    playerSummaries,
    totals: {
      rosterCount: roster.filter((item) => item.isActive).length,
      gameCount: games.length,
      wins,
      losses: Math.max(games.length - wins, 0)
    }
  };
}

export async function buildGameDetail(gameId) {
  const rows = await supabaseSelect("games", {
    select: "id,external_id,opponent_name,scheduled_at,is_home,home_score,guest_score,quarter_score,checked,round_number,team_seasons!inner(id,category,teams!inner(id,name,team_code),seasons!inner(id,code,name)),competitions(id,name,category_name,competition_group_name,phase_name),venues(id,name,court_name)",
    id: `eq.${gameId}`,
    limit: "1"
  });

  if (!rows.length) {
    throw new Error("Utkání nebylo nalezeno.");
  }

  const row = rows[0];
  const players = await loadGamePlayers(gameId);

  return {
    game: {
      id: row.id,
      externalId: row.external_id,
      opponentName: row.opponent_name,
      scheduledAt: row.scheduled_at,
      isHome: row.is_home,
      homeScore: row.home_score,
      guestScore: row.guest_score,
      quarterScore: row.quarter_score,
      checked: row.checked,
      roundNumber: row.round_number,
      resultLabel: formatGameResult(row),
      teamSeason: {
        id: row.team_seasons.id,
        category: row.team_seasons.category,
        team: row.team_seasons.teams,
        season: row.team_seasons.seasons
      },
      competition: row.competitions || null,
      venue: row.venues || null
    },
    players
  };
}
