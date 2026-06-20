const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = process.env.PORT || 3010;
const PUBLIC_DIR = path.join(__dirname, "public");
const OUTPUT_DIR = path.join(__dirname, "generated");
const SCRIPT_PATH = path.join(__dirname, "..", "tools", "Generate-CbfGameImportSql.ps1");
const IMPORT_SCRIPT_PATH = path.join(__dirname, "..", "tools", "Import-CbfGamesToSupabase.ps1");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".sql": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const SERVICE_STAT_KEYS = [
  "XSP",
  "ZS1P",
  "ZS1M",
  "ZS2PP",
  "ZS2PM",
  "ZS3P",
  "ZS3M",
  "ZPF",
  "ZRD",
  "ZRO",
  "ZBL",
  "ZAS",
  "ZST",
  "ZLS",
  "ZAF",
  "ZUF",
  "ZTF",
  "ZDF"
];

const SERVICE_CLUB_ID = "1638";
const SERVICE_SEASON_ID_BY_CODE = {
  "2025-2026": "35"
};

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBirthDate(value) {
  return String(value || "").trim();
}

function normalizeOptionalDate(value) {
  return String(value || "").trim().slice(0, 10);
}

function normalizeOptionalText(value) {
  return String(value || "").trim();
}

function normalizeComparableText(value) {
  return normalizeOptionalText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("cs");
}

function buildPersonFullName(firstName, lastName, order = "last_first") {
  const first = normalizeOptionalText(firstName);
  const last = normalizeOptionalText(lastName);
  if (!first && !last) {
    return "";
  }

  return order === "first_last"
    ? [first, last].filter(Boolean).join(" ").trim()
    : [last, first].filter(Boolean).join(" ").trim();
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const urlPath = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseGameIds(rawValue) {
  return [
    ...new Set(
      rawValue
        .split(/[\s,;]+/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  ];
}

function sortGameIdsAscending(gameIds) {
  return [...gameIds].sort((left, right) => Number(left) - Number(right));
}

function seasonCodeToYear(seasonCode) {
  const match = String(seasonCode || "").match(/^(\d{4})-/);
  if (!match) {
    throw new Error("Season code musí být ve tvaru YYYY-YYYY.");
  }

  return match[1];
}

function extractGameIdsFromTeamPage(html) {
  const tabMatch = html.match(
    /<div class="d-none" role="tab-pane" aria-labelledby="tab-three" id="tab-pane-three">([\s\S]*?)<\/table>/i
  );
  const source = tabMatch ? tabMatch[1] : html;
  const matches = [...source.matchAll(/href="\/zapas\/(\d+)(?:#tab-pane-one)?"/g)];
  return [...new Set(matches.map(match => match[1]))];
}

function parseScheduledAtValue(label) {
  const value = String(label || "").trim();
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = Date.parse(value.replace(" ", "T"));
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function extractXmlTagValue(xml, tagName) {
  const match = String(xml || "").match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return decodeHtmlEntities(match ? match[1] : "");
}

function parseTeamBlocksFromGameXml(xml) {
  return [...String(xml || "").matchAll(/<team\b([^>]*)>([\s\S]*?)<\/team>/gi)].map(match => {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const guestMatch = attrs.match(/\bguest="([^"]+)"/i);

    return {
      guest: guestMatch ? guestMatch[1] === "1" : null,
      identity: extractXmlTagValue(body, "identity"),
      name: extractXmlTagValue(body, "name"),
      score: extractXmlTagValue(body, "score")
    };
  });
}

function parseGamePreviewFromXml(xml, teamCode, gameId) {
  const teams = parseTeamBlocksFromGameXml(xml);
  const ourTeam = teams.find(team => String(team.identity || "").trim() === String(teamCode || "").trim());
  const opponent = teams.find(team => team !== ourTeam) || null;
  const dateLabel = extractXmlTagValue(xml, "date");
  const timeLabel = extractXmlTagValue(xml, "time");
  const homeScore = extractXmlTagValue(xml, "score_home");
  const guestScore = extractXmlTagValue(xml, "score_guest");
  const fallbackScoreParts = teams
    .map(team => String(team.score || "").trim())
    .filter(Boolean);
  const scoreLabel = homeScore && guestScore
    ? `${homeScore}:${guestScore}`
    : (fallbackScoreParts.length === 2 ? `${fallbackScoreParts[0]}:${fallbackScoreParts[1]}` : "");
  const isHome = ourTeam ? ourTeam.guest === false : null;
  const homeScoreValue = homeScore ? parseIntegerStatValue(homeScore) : (fallbackScoreParts[0] ? parseIntegerStatValue(fallbackScoreParts[0]) : null);
  const guestScoreValue = guestScore ? parseIntegerStatValue(guestScore) : (fallbackScoreParts[1] ? parseIntegerStatValue(fallbackScoreParts[1]) : null);
  const ourScore =
    isHome == null || homeScoreValue == null || guestScoreValue == null
      ? null
      : (isHome ? homeScoreValue : guestScoreValue);

  return {
    gameId: String(gameId || "").trim(),
    scheduledAtLabel: [dateLabel, timeLabel].filter(Boolean).join(" ").trim(),
    opponentName: opponent?.name || "",
    scoreLabel,
    isHome,
    homeScore: homeScoreValue,
    guestScore: guestScoreValue,
    ourScore,
    alreadyImported: false
  };
}

async function fetchGamePreview(gameId, teamCode) {
  const url = `https://www.cbf.cz/xml/gamestats.php?g=${encodeURIComponent(gameId)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Nepodařilo se načíst detail utkání ${gameId}. HTTP ${response.status}.`);
  }

  const xml = await response.text();
  return parseGamePreviewFromXml(xml, teamCode, gameId);
}

async function fetchServiceGameStatsCount({ serviceTeamId, gameId, phpSessionId }) {
  const url = `https://service.cbf.cz/?cross=teams&action=results&team=${encodeURIComponent(serviceTeamId)}&game=${encodeURIComponent(gameId)}&statistics=lists`;
  const response = await fetch(url, {
    headers: {
      Cookie: `PHPSESSID=${phpSessionId}`
    }
  });

  if (!response.ok) {
    throw new Error(`Nepodařilo se načíst statistics=lists pro utkání ${gameId}. HTTP ${response.status}.`);
  }

  const html = await response.text();
  const playerIds = [
    ...new Set(
      [...html.matchAll(/player_var=edit(?:&amp;|&)player_id=(\d+)/g)].map(match => match[1])
    )
  ];

  return {
    servicePlayersCount: playerIds.length
  };
}

async function fetchServiceGameStatsHtml({ serviceTeamId, gameId, phpSessionId }) {
  const url = `https://service.cbf.cz/?cross=teams&action=results&team=${encodeURIComponent(serviceTeamId)}&game=${encodeURIComponent(gameId)}&statistics=lists`;
  const response = await fetch(url, {
    headers: {
      Cookie: `PHPSESSID=${phpSessionId}`
    }
  });

  if (!response.ok) {
    throw new Error(`Nepodařilo se načíst service statistics=lists pro utkání ${gameId}. HTTP ${response.status}.`);
  }

  return response.text();
}

function extractServicePlayerIdsFromStatsHtml(html) {
  return [
    ...new Set(
      [...String(html || "").matchAll(/player_var=edit(?:&amp;|&)player_id=(\d+)/g)].map(match => match[1])
    )
  ];
}

async function fetchServicePlayerEditHtml({ serviceTeamId, gameId, phpSessionId, playerCode }) {
  const url = `https://service.cbf.cz/?cross=teams&action=results&team=${encodeURIComponent(serviceTeamId)}&game=${encodeURIComponent(gameId)}&statistics=lists&player_var=edit&player_id=${encodeURIComponent(playerCode)}`;
  const response = await fetch(url, {
    headers: {
      Cookie: `PHPSESSID=${phpSessionId}`
    }
  });

  if (!response.ok) {
    throw new Error(`Nepodařilo se načíst detail statistik hráče ${playerCode}. HTTP ${response.status}.`);
  }

  return response.text();
}

function extractServiceInputValueLoose(html, fieldName) {
  const pattern = new RegExp(`<input[^>]*name="${fieldName}"[^>]*value="([^"]*)"`, "i");
  const match = String(html || "").match(pattern);
  return decodeHtmlEntities(match ? match[1] : "");
}

function extractServiceCheckboxChecked(html, fieldName) {
  const pattern = new RegExp(`<input[^>]*name="${fieldName}"[^>]*>`, "i");
  const match = String(html || "").match(pattern);
  return match ? /\bchecked\b/i.test(match[0]) : false;
}

function parseIntegerStatValue(value) {
  const normalized = String(value ?? "").trim().replace(/[^\d-]/g, "");
  if (!normalized) {
    return 0;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseServicePlayerStats(html, playerCode) {
  const ftMade = parseIntegerStatValue(extractServiceInputValue(html, "ZS1P"));
  const ftMissed = parseIntegerStatValue(extractServiceInputValue(html, "ZS1M"));
  const fg2Made = parseIntegerStatValue(extractServiceInputValue(html, "ZS2PP"));
  const fg2Missed = parseIntegerStatValue(extractServiceInputValue(html, "ZS2PM"));
  const fg3Made = parseIntegerStatValue(extractServiceInputValue(html, "ZS3P"));
  const fg3Missed = parseIntegerStatValue(extractServiceInputValue(html, "ZS3M"));

  return {
    playerCode: String(playerCode || "").trim(),
    jerseyNumber: extractServiceInputValue(html, "number"),
    started: extractServiceCheckboxChecked(html, "STARTER"),
    secondsPlayed: parseIntegerStatValue(extractServiceInputValue(html, "XSP")),
    points: ftMade + (fg2Made * 2) + (fg3Made * 3),
    ftMade,
    ftMissed,
    fg2Made,
    fg2Missed,
    fg3Made,
    fg3Missed,
    defensiveRebounds: parseIntegerStatValue(extractServiceInputValue(html, "ZRD")),
    offensiveRebounds: parseIntegerStatValue(extractServiceInputValue(html, "ZRO")),
    blocks: parseIntegerStatValue(extractServiceInputValue(html, "ZBL")),
    assists: parseIntegerStatValue(extractServiceInputValue(html, "ZAS")),
    steals: parseIntegerStatValue(extractServiceInputValue(html, "ZST")),
    turnovers: parseIntegerStatValue(extractServiceInputValue(html, "ZLS")),
    foulsDrawn: parseIntegerStatValue(extractServiceInputValue(html, "ZAF")),
    personalFouls: parseIntegerStatValue(extractServiceInputValue(html, "ZPF")),
    unsportsmanlikeFouls: parseIntegerStatValue(extractServiceInputValue(html, "ZUF")),
    technicalFouls: parseIntegerStatValue(extractServiceInputValue(html, "ZTF")),
    disqualifyingFouls: parseIntegerStatValue(extractServiceInputValue(html, "ZDF"))
  };
}

function parseScheduledAtIso(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const asDate = new Date(raw.replace(" ", "T"));
  return Number.isNaN(asDate.getTime()) ? null : asDate.toISOString();
}

function buildOutputPath(teamCode, seasonCode) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(OUTPUT_DIR, `import_${teamCode}_${seasonCode}_${timestamp}.sql`);
}

function getSupabaseConfig() {
  const baseUrl = String(process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!baseUrl) {
    throw new Error("Chybí SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error("Chybí SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { baseUrl, serviceRoleKey };
}

async function fetchSupabaseRows({ baseUrl, serviceRoleKey, table, query }) {
  const url = `${baseUrl}/rest/v1/${table}?${query}`;
  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase dotaz selhal pro ${table}. HTTP ${response.status}. ${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function resolveTeamSeason({ teamCode, seasonCode }) {
  const config = getSupabaseConfig();

  const [teamRows, seasonRows] = await Promise.all([
    fetchSupabaseRows({
      ...config,
      table: "teams",
      query: `select=id&team_code=eq.${encodeURIComponent(teamCode)}`
    }),
    fetchSupabaseRows({
      ...config,
      table: "seasons",
      query: `select=id&code=eq.${encodeURIComponent(seasonCode)}`
    })
  ]);

  if (teamRows.length === 0) {
    throw new Error(`Tým ${teamCode} nebyl v databázi nalezen.`);
  }

  if (seasonRows.length === 0) {
    throw new Error(`Sezóna ${seasonCode} nebyla v databázi nalezena.`);
  }

  const teamId = teamRows[0].id;
  const seasonId = seasonRows[0].id;
  const teamSeasonRows = await fetchSupabaseRows({
    ...config,
    table: "team_seasons",
    query: `select=id&team_id=eq.${teamId}&season_id=eq.${seasonId}`
  });

  if (teamSeasonRows.length === 0) {
    throw new Error(`Pro tým ${teamCode} a sezónu ${seasonCode} neexistuje team_season.`);
  }

  return {
    config,
    teamId,
    seasonId,
    teamSeasonId: teamSeasonRows[0].id
  };
}

async function getImportedGameIds({ teamCode, seasonCode }) {
  const { config, teamSeasonId } = await resolveTeamSeason({ teamCode, seasonCode });
  const gameRows = await fetchSupabaseRows({
    ...config,
    table: "games",
    query: `select=external_id&team_season_id=eq.${teamSeasonId}`
  });

  return new Set(
    gameRows
      .map(row => String(row.external_id || "").trim())
      .filter(Boolean)
  );
}

async function getTeamRoster({ teamCode, seasonCode }) {
  const { config, teamSeasonId } = await resolveTeamSeason({ teamCode, seasonCode });

  const ptsRows = await fetchSupabaseRows({
    ...config,
    table: "player_team_seasons",
    query: `select=player_id&team_season_id=eq.${teamSeasonId}`
  });

  if (ptsRows.length === 0) {
    return [];
  }

  const playerIds = [...new Set(ptsRows.map(row => row.player_id).filter(Boolean))];
  const playerRows = await fetchSupabaseRows({
    ...config,
    table: "players",
    query: `select=id,player_code,full_name,birth_date&id=in.(${playerIds.join(",")})`
  });

  return playerRows
    .map(row => ({
      id: row.id,
      playerCode: String(row.player_code || "").trim(),
      fullName: String(row.full_name || "").trim(),
      birthDate: normalizeBirthDate(row.birth_date)
    }))
    .filter(player => player.playerCode && player.fullName)
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "cs"));
}

async function getAllPlayers() {
  const config = getSupabaseConfig();
  const playerRows = await fetchSupabaseRows({
    ...config,
    table: "players",
    query: "select=id,player_code,full_name,birth_date&order=full_name.asc"
  });

  return playerRows
    .map(row => ({
      id: row.id,
      playerCode: String(row.player_code || "").trim(),
      fullName: String(row.full_name || "").trim(),
      birthDate: normalizeBirthDate(row.birth_date)
    }))
    .filter(player => player.playerCode && player.fullName);
}

async function getRosterAdminState({ teamCode, seasonCode }) {
  const { config, teamSeasonId } = await resolveTeamSeason({ teamCode, seasonCode });
  const [allPlayers, assignedRows] = await Promise.all([
    getAllPlayers(),
    fetchSupabaseRows({
      ...config,
      table: "player_team_seasons",
      query: `select=player_id,assignment_type,source_club_name,notes,valid_from,valid_to,is_active&team_season_id=eq.${teamSeasonId}`
    })
  ]);

  const assignedByPlayerId = new Map(
    assignedRows.map(row => [
      row.player_id,
      {
        assignmentType: normalizeOptionalText(row.assignment_type) || "regular",
        sourceClubName: normalizeOptionalText(row.source_club_name),
        notes: normalizeOptionalText(row.notes),
        validFrom: normalizeOptionalDate(row.valid_from),
        validTo: normalizeOptionalDate(row.valid_to),
        isActive: row.is_active == null ? true : Boolean(row.is_active)
      }
    ])
  );
  return allPlayers.map(player => ({
    ...player,
    assigned: assignedByPlayerId.has(player.id),
    assignmentType: assignedByPlayerId.get(player.id)?.assignmentType || "regular",
    sourceClubName: assignedByPlayerId.get(player.id)?.sourceClubName || "",
    notes: assignedByPlayerId.get(player.id)?.notes || "",
    validFrom: assignedByPlayerId.get(player.id)?.validFrom || "",
    validTo: assignedByPlayerId.get(player.id)?.validTo || "",
    isActive: assignedByPlayerId.get(player.id)?.isActive ?? true
  }));
}

async function postSupabaseRows({ baseUrl, serviceRoleKey, table, rows, onConflict }) {
  const params = new URLSearchParams();
  if (onConflict) {
    params.set("on_conflict", onConflict);
  }

  const response = await fetch(`${baseUrl}/rest/v1/${table}?${params.toString()}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase zápis selhal pro ${table}. HTTP ${response.status}. ${errorText}`);
  }

  return response.json();
}

async function deleteSupabaseRows({ baseUrl, serviceRoleKey, table, query }) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase mazání selhalo pro ${table}. HTTP ${response.status}. ${errorText}`);
  }
}

async function saveRosterAdminState({ teamCode, seasonCode, playerCodes = [], assignments = [] }) {
  const { config, teamSeasonId } = await resolveTeamSeason({ teamCode, seasonCode });
  const allPlayers = await getAllPlayers();
  const playerByCode = new Map(allPlayers.map(player => [player.playerCode, player]));
  const normalizedAssignments = Array.isArray(assignments) && assignments.length > 0
    ? assignments
        .map(assignment => ({
          playerCode: String(assignment?.playerCode || "").trim(),
          assignmentType: normalizeOptionalText(assignment?.assignmentType) || "regular",
          sourceClubName: normalizeOptionalText(assignment?.sourceClubName),
          notes: normalizeOptionalText(assignment?.notes),
          validFrom: normalizeOptionalDate(assignment?.validFrom),
          validTo: normalizeOptionalDate(assignment?.validTo)
        }))
        .filter(assignment => assignment.playerCode)
    : playerCodes
        .map(code => ({
          playerCode: String(code || "").trim(),
          assignmentType: "regular",
          sourceClubName: "",
          notes: "",
          validFrom: "",
          validTo: ""
        }))
        .filter(assignment => assignment.playerCode);
  const selectedPlayers = normalizedAssignments
    .map(assignment => {
      const player = playerByCode.get(assignment.playerCode);
      return player ? { ...player, ...assignment } : null;
    })
    .filter(Boolean);

  if (selectedPlayers.length !== normalizedAssignments.length) {
    const missingCodes = normalizedAssignments
      .map(assignment => assignment.playerCode)
      .filter(code => !playerByCode.has(code));
    throw new Error(`Někteří hráči nebyli v databázi nalezeni: ${missingCodes.join(", ")}`);
  }

  const currentRows = await fetchSupabaseRows({
    ...config,
    table: "player_team_seasons",
    query: `select=id,player_id&team_season_id=eq.${teamSeasonId}`
  });

  const selectedPlayerIds = new Set(selectedPlayers.map(player => player.id));
  const upsertRows = selectedPlayers.map(player => ({
    player_id: player.id,
    team_season_id: teamSeasonId,
    assignment_type: player.assignmentType || "regular",
    source_club_name: player.assignmentType === "hosting_in" ? (player.sourceClubName || null) : null,
    notes: player.notes || null,
    valid_from: player.validFrom || null,
    valid_to: player.validTo || null,
    is_active: true
  }));

  const toDeleteIds = currentRows
    .filter(row => !selectedPlayerIds.has(row.player_id))
    .map(row => row.player_id);

  if (upsertRows.length > 0) {
    await postSupabaseRows({
      ...config,
      table: "player_team_seasons",
      rows: upsertRows,
      onConflict: "player_id,team_season_id"
    });
  }

  if (toDeleteIds.length > 0) {
    await deleteSupabaseRows({
      ...config,
      table: "player_team_seasons",
      query: `team_season_id=eq.${teamSeasonId}&player_id=in.(${toDeleteIds.join(",")})`
    });
  }

  return getRosterAdminState({ teamCode, seasonCode });
}

async function fetchServiceRosterHtml({ serviceTeamId, phpSessionId }) {
  const url = `https://service.cbf.cz/?cross=teams&action=list&team=${encodeURIComponent(serviceTeamId)}`;
  const response = await fetch(url, {
    headers: {
      Cookie: `PHPSESSID=${phpSessionId}`
    }
  });

  if (!response.ok) {
    throw new Error(`Service soupiska se nepodařila načíst. HTTP ${response.status}.`);
  }

  return response.text();
}

async function fetchServiceArchivedPlayersHtml({ phpSessionId, clubId = SERVICE_CLUB_ID }) {
  const url = `https://service.cbf.cz/?cross=orgclub&what=players_archived&club=${encodeURIComponent(clubId)}`;
  const response = await fetch(url, {
    headers: {
      Cookie: `PHPSESSID=${phpSessionId}`
    }
  });

  if (!response.ok) {
    throw new Error(`Archivovaní hráči ze service se nepodařili načíst. HTTP ${response.status}.`);
  }

  return response.text();
}

async function fetchServiceTransferHostHtml({ phpSessionId, seasonCode, clubId = SERVICE_CLUB_ID }) {
  const serviceSeasonId = SERVICE_SEASON_ID_BY_CODE[String(seasonCode || "").trim()];
  if (!serviceSeasonId) {
    return "";
  }

  const url = `https://service.cbf.cz/?cross=orgclub&what=transfer_host&club=${encodeURIComponent(clubId)}&season=detail&IDseason=${encodeURIComponent(serviceSeasonId)}`;
  const response = await fetch(url, {
    headers: {
      Cookie: `PHPSESSID=${phpSessionId}`
    }
  });

  if (!response.ok) {
    throw new Error(`Přehled hostování/přestupů ze service se nepodařilo načíst. HTTP ${response.status}.`);
  }

  return response.text();
}

async function fetchServiceTransferRecordHtml({ phpSessionId, seasonCode, recordId, clubId = SERVICE_CLUB_ID }) {
  const serviceSeasonId = SERVICE_SEASON_ID_BY_CODE[String(seasonCode || "").trim()];
  if (!serviceSeasonId) {
    throw new Error(`Pro sezónu ${seasonCode} chybí mapování service season ID.`);
  }

  const url = `https://service.cbf.cz/?cross=orgclub&what=transfer_host&club=${encodeURIComponent(clubId)}&season=detail&IDseason=${encodeURIComponent(serviceSeasonId)}&action=edit&id=${encodeURIComponent(recordId)}`;
  const response = await fetch(url, {
    headers: {
      Cookie: `PHPSESSID=${phpSessionId}`
    }
  });

  if (!response.ok) {
    throw new Error(`Detail hostování/přestupu ${recordId} se nepodařilo načíst. HTTP ${response.status}.`);
  }

  return response.text();
}

function extractArchivedPlayersFromHtml(html) {
  const rowMatches = [...String(html || "").matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  const archivedPlayers = [];

  rowMatches.forEach(match => {
    const rowHtml = match[1];
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
      .map(cell => decodeHtmlEntities(cell[1].replace(/<[^>]+>/g, " ")).trim())
      .filter(Boolean);

    if (cells.length < 2) {
      return;
    }

    const playerCode = cells.find(cell => /^\d{5,}$/.test(cell)) || "";
    const fullName = cells.find(cell => /[A-Za-zÀ-ž]/.test(cell) && !/^(Údaje|Č\. dresu|Výška|Škrtnout|Přidat|Pendl)$/i.test(cell)) || "";

    if (!playerCode || !fullName) {
      return;
    }

    archivedPlayers.push({
      playerCode,
      fullName
    });
  });

  return archivedPlayers;
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "));
}

function extractServiceTransferRows(html) {
  const tableMatch = String(html || "").match(/<table[^>]*class=["'][^"']*table-list[^"']*["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    return [];
  }

  const tableHtml = tableMatch[1];
  const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  if (rowMatches.length < 2) {
    return [];
  }

  const headerCells = [...rowMatches[0][1].matchAll(/<td[^>]*class=["'][^"']*header[^"']*["'][^>]*>([\s\S]*?)<\/td>/gi)];
  const headers = headerCells.map(match => stripHtml(match[1]));
  if (headers.length === 0) {
    return [];
  }

  return rowMatches
    .slice(1)
    .map(match => {
      const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => stripHtml(cell[1]));
      if (cells.length < headers.length) {
        return null;
      }

      const row = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] || "";
      });

      return {
        state: row["Stav"] || "",
        recordId: row["ID"] || "",
        newClubName: row["Nový klub"] || "",
        oldClubName: row["Původní klub"] || "",
        playerShortName: row["Hráč"] || "",
        targetTeamName: row["Družstvo pro hostování"] || "",
        competitionName: row["Soutěž"] || "",
        transferType: row["Přestup/hostování"] || "",
        firstName: row["Jméno"] || "",
        lastName: row["Příjmení"] || "",
        birthDate: parseServiceBirthDate(row["Datum narození"] || ""),
        acceptedAt: row["Schváleno"] || "",
        updatedAt: row["Aktualizováno"] || ""
      };
    })
    .filter(Boolean);
}

function matchServiceTransferForPlayer(transferRows, player) {
  const normalizedFullName = normalizeComparableText(player?.fullName);
  const normalizedBirthDate = normalizeOptionalDate(player?.birthDate);

  if (!normalizedFullName) {
    return null;
  }

  return (
    transferRows.find(row => {
      const rowNames = [
        normalizeComparableText(buildPersonFullName(row.firstName, row.lastName, "first_last")),
        normalizeComparableText(buildPersonFullName(row.firstName, row.lastName, "last_first"))
      ].filter(Boolean);
      if (rowNames.length === 0 || !rowNames.includes(normalizedFullName)) {
        return false;
      }

      if (!normalizedBirthDate) {
        return true;
      }

      return normalizeOptionalDate(row.birthDate) === normalizedBirthDate;
    }) || null
  );
}

function extractServiceTransferPlayerCode(html) {
  const patterns = [
    /name=["']IDplayer["'][^>]*value=["'](\d+)["']/i,
    /name=["']player_id["'][^>]*value=["'](\d+)["']/i,
    /name=["']user["'][^>]*value=["'](\d+)["']/i,
    /\bplayer_id=(\d+)/i,
    /\buser=(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = String(html || "").match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function parseServiceRoster(html) {
  const topMatch = html.match(/<h2>Změna soupisky[\s\S]*?<table class="table">([\s\S]*?)<\/table>[\s\S]*?<fieldset>\s*<h2>Dostupní hráči/i);
  if (!topMatch) {
    throw new Error("Nepodařilo se najít horní tabulku soupisky ve service.");
  }

  const tableHtml = topMatch[1];
  const rowMatches = [...tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  const roster = [];

  rowMatches.forEach(match => {
    const rowHtml = match[1];
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(cell => cell[1]);
    if (cells.length < 10) {
      return;
    }

    const playerCode = decodeHtmlEntities(cells[1]).replace(/\D/g, "");
    const fullName = decodeHtmlEntities(cells[9].replace(/<[^>]+>/g, " "));
    const status = decodeHtmlEntities(cells[10] ? cells[10].replace(/<[^>]+>/g, " ") : "");

    if (!playerCode || !fullName) {
      return;
    }

    roster.push({
      playerCode,
      fullName,
      status
    });
  });

  return roster;
}

async function fetchServicePlayerContactHtml({ serviceTeamId, playerCode, phpSessionId }) {
  const url = `https://service.cbf.cz/?cross=teams&action=contact&team=${encodeURIComponent(serviceTeamId)}&user=${encodeURIComponent(playerCode)}&edituser=1`;
  const response = await fetch(url, {
    headers: {
      Cookie: `PHPSESSID=${phpSessionId}`
    }
  });

  if (!response.ok) {
    throw new Error(`Detail hráče ze service se nepodařilo načíst. HTTP ${response.status}.`);
  }

  return response.text();
}

async function fetchPublicPlayerProfileHtml(playerCode) {
  const url = `https://cz.basketball/hrac/${encodeURIComponent(playerCode)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Veřejný profil hráče se nepodařilo načíst. HTTP ${response.status}.`);
  }

  return response.text();
}

function extractServiceInputValue(html, fieldName) {
  const pattern = new RegExp(`<input[^>]*name=["']${fieldName}["'][^>]*value=["']([^"']*)["']`, "i");
  const match = String(html || "").match(pattern);
  return match ? decodeHtmlEntities(match[1]) : "";
}

function extractServiceCellValue(html, headerLabel) {
  const safeLabel = headerLabel
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s*");
  const pattern = new RegExp(`<td[^>]*class=["']header["'][^>]*>\\s*${safeLabel}\\s*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, "i");
  const match = String(html || "").match(pattern);
  return match ? decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " ")) : "";
}

function extractServiceTitleName(html, playerCode) {
  const titleMatch = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) {
    return "";
  }

  const titleText = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, " "));
  const ignored = new Set([
    "Lusk",
    "Seznam družstev",
    "Editace sumarizace",
    "Editace",
    "Kontakt",
    String(playerCode || "").trim()
  ]);

  return titleText
    .split("|")
    .map(part => part.trim())
    .find(part => /[A-Za-zÀ-ž]/.test(part) && !ignored.has(part)) || "";
}

function extractServiceHeaderTrailName(html, playerCode) {
  const helpMatch = String(html || "").match(/<div id="header_help">([\s\S]*?)<\/div>/i);
  if (!helpMatch) {
    return "";
  }

  const text = decodeHtmlEntities(helpMatch[1].replace(/<[^>]+>/g, " "));
  const ignored = new Set([
    "www.cbf.cz",
    "Seznam družstev",
    "Editace sumarizace",
    "Soupiska družstva",
    "Kontaktní údaje",
    String(playerCode || "").trim()
  ]);

  return text
    .split("->")
    .map(part => part.trim())
    .find(part => /[A-Za-zÀ-ž]/.test(part) && !ignored.has(part)) || "";
}

function parseServiceBirthDate(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }

  const normalizedIso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (normalizedIso) {
    return value;
  }

  const czechFormat = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (czechFormat) {
    const day = czechFormat[1].padStart(2, "0");
    const month = czechFormat[2].padStart(2, "0");
    const year = czechFormat[3];
    return `${year}-${month}-${day}`;
  }

  return "";
}

function parseBirthDateFromYear(yearValue) {
  const year = String(yearValue || "").trim();
  return /^\d{4}$/.test(year) ? `${year}-01-01` : "";
}

function stripPublicHtmlToLines(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .split(/\r?\n/)
    .map(line => decodeHtmlEntities(line).trim())
    .filter(Boolean);
}

function extractPublicProfileValue(lines, label) {
  const normalizedLabel = normalizeOptionalText(label).toLocaleLowerCase("cs");
  const index = lines.findIndex(line => normalizeOptionalText(line).toLocaleLowerCase("cs") === normalizedLabel);
  if (index < 0) {
    return "";
  }

  for (let cursor = index + 1; cursor < lines.length && cursor <= index + 4; cursor += 1) {
    const candidate = normalizeOptionalText(lines[cursor]);
    if (!candidate || normalizeOptionalText(candidate).toLocaleLowerCase("cs") === normalizedLabel) {
      continue;
    }

    return candidate;
  }

  return "";
}

function parsePublicPlayerProfile(html, playerCode) {
  const h1Match = String(html || "").match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleMatch = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const lines = stripPublicHtmlToLines(html);
  const fullName =
    (h1Match ? decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, " ")).trim() : "") ||
    lines.find(line => /\p{L}/u.test(line) && line.split(/\s+/).length >= 2) ||
    (titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, " ")).split("|")[0].trim() : "");
  const birthYearText = extractPublicProfileValue(lines, "Ro?n?k narozen?");
  const birthYearMatch = String(birthYearText).match(/\b(\d{4})\b/);
  const currentClub = extractPublicProfileValue(lines, "Aktu?ln? klub");

  if (!fullName) {
    throw new Error(`U hr??e ${playerCode} se nepoda?ilo na??st jm?no ani z ve?ejn?ho profilu.`);
  }

  return {
    playerCode: String(playerCode || "").trim(),
    fullName,
    birthDate: birthYearMatch ? `${birthYearMatch[1]}-01-01` : "",
    sourceClubName: normalizeOptionalText(currentClub)
  };
}

function parseServicePlayerContact(html, playerCode) {
  const firstName =
    extractServiceInputValue(html, "first_name") ||
    extractServiceInputValue(html, "firstname") ||
    extractServiceCellValue(html, "Jméno");
  const lastName =
    extractServiceInputValue(html, "last_name") ||
    extractServiceInputValue(html, "lastname") ||
    extractServiceInputValue(html, "surname") ||
    extractServiceCellValue(html, "Příjmení");
  const fullNameCell = extractServiceCellValue(html, "Jméno a příjmení");
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()
    || fullNameCell
    || extractServiceTitleName(html, playerCode)
    || extractServiceHeaderTrailName(html, playerCode);
  const birthDate = parseServiceBirthDate(
    extractServiceInputValue(html, "birth_date") ||
    extractServiceInputValue(html, "birthday") ||
    extractServiceInputValue(html, "date_of_birth") ||
    extractServiceCellValue(html, "Datum narození")
  );
  const sourceClubName =
    extractServiceCellValue(html, "Klub") ||
    extractServiceCellValue(html, "Mateřský klub");

  if (!fullName) {
    throw new Error(`U hráče ${playerCode} se nepodařilo ze service načíst jméno.`);
  }

  return {
    playerCode: String(playerCode || "").trim(),
    fullName: normalizeOptionalText(fullName),
    birthDate,
    sourceClubName: normalizeOptionalText(sourceClubName)
  };
}

async function createPlayerFromService({ serviceTeamId, playerCode, phpSessionId, seasonCode }) {
  const [html, rosterHtml, archivedHtml, transferHostHtml] = await Promise.all([
    fetchServicePlayerContactHtml({ serviceTeamId, playerCode, phpSessionId }),
    fetchServiceRosterHtml({ serviceTeamId, phpSessionId }).catch(() => ""),
    fetchServiceArchivedPlayersHtml({ phpSessionId }).catch(() => ""),
    fetchServiceTransferHostHtml({ phpSessionId, seasonCode }).catch(() => "")
  ]);

  let player;
  try {
    player = parseServicePlayerContact(html, playerCode);
  } catch (error) {
    const normalizedPlayerCode = String(playerCode || "").trim();
    const rosterMatch = rosterHtml
      ? parseServiceRoster(rosterHtml).find(item => item.playerCode === normalizedPlayerCode)
      : null;
    const archivedMatch = archivedHtml
      ? extractArchivedPlayersFromHtml(archivedHtml).find(item => item.playerCode === normalizedPlayerCode)
      : null;
    let publicProfileMatch = null;

    try {
      const publicProfileHtml = await fetchPublicPlayerProfileHtml(normalizedPlayerCode);
      publicProfileMatch = parsePublicPlayerProfile(publicProfileHtml, normalizedPlayerCode);
    } catch (_) {
      publicProfileMatch = null;
    }

    if (!rosterMatch && !archivedMatch && !publicProfileMatch) {
      throw error;
    }

    player = {
      playerCode: normalizedPlayerCode,
      fullName: rosterMatch?.fullName || archivedMatch?.fullName || publicProfileMatch?.fullName || "",
      birthDate: publicProfileMatch?.birthDate || "",
      sourceClubName: publicProfileMatch?.sourceClubName || ""
    };
  }

  const transferRows = transferHostHtml ? extractServiceTransferRows(transferHostHtml) : [];
  const transferMatch = matchServiceTransferForPlayer(transferRows, player);
  if (transferMatch) {
    player.fullName =
      buildPersonFullName(transferMatch.firstName, transferMatch.lastName, "last_first") ||
      player.fullName;
    player.sourceClubName = normalizeOptionalText(transferMatch.oldClubName) || player.sourceClubName || "";
    player.suggestedAssignmentType = /hostov/i.test(transferMatch.transferType) ? "hosting_in" : "regular";
    player.transferType = normalizeOptionalText(transferMatch.transferType);
    player.targetTeamName = normalizeOptionalText(transferMatch.targetTeamName);
    player.transferCompetitionName = normalizeOptionalText(transferMatch.competitionName);
  } else {
    player.suggestedAssignmentType = player.sourceClubName ? "hosting_in" : "regular";
  }

  const config = getSupabaseConfig();

  await postSupabaseRows({
    ...config,
    table: "players",
    rows: [
      {
        player_code: player.playerCode,
        full_name: player.fullName,
        birth_date: player.birthDate || null
      }
    ],
    onConflict: "player_code"
  });

  return player;
}

async function createPlayerLocally({ playerCode, fullName, birthDate, sourceClubName = "", suggestedAssignmentType = "hosting_in" }) {
  const config = getSupabaseConfig();
  await postSupabaseRows({
    ...config,
    table: "players",
    rows: [
      {
        player_code: String(playerCode || "").trim(),
        full_name: normalizeOptionalText(fullName),
        birth_date: birthDate || null
      }
    ],
    onConflict: "player_code"
  });

  return {
    playerCode: String(playerCode || "").trim(),
    fullName: normalizeOptionalText(fullName),
    birthDate: birthDate || "",
    sourceClubName: normalizeOptionalText(sourceClubName),
    suggestedAssignmentType: normalizeOptionalText(suggestedAssignmentType) || "hosting_in"
  };
}

async function importHostedPlayersForTeam({ teamCode, seasonCode, phpSessionId, serviceTeamName }) {
  const normalizedServiceTeamName = normalizeComparableText(serviceTeamName);
  if (!normalizedServiceTeamName) {
    throw new Error("Chybí service název týmu pro filtrování hostování.");
  }

  const transferHostHtml = await fetchServiceTransferHostHtml({ phpSessionId, seasonCode });
  const allRows = extractServiceTransferRows(transferHostHtml);
  const matchedRows = allRows.filter(row =>
    /schvalen/i.test(normalizeComparableText(row.state)) &&
    /hostov/i.test(normalizeComparableText(row.transferType)) &&
    normalizeComparableText(row.targetTeamName) === normalizedServiceTeamName
  );

  if (matchedRows.length === 0) {
    return {
      importedCount: 0,
      skippedCount: 0,
      skippedRows: [],
      players: await getRosterAdminState({ teamCode, seasonCode })
    };
  }

  const createdPlayers = [];
  const skippedRows = [];

  for (const row of matchedRows) {
    try {
      const detailHtml = await fetchServiceTransferRecordHtml({
        phpSessionId,
        seasonCode,
        recordId: row.recordId
      });
      const playerCode = extractServiceTransferPlayerCode(detailHtml);
      if (!playerCode) {
        skippedRows.push({
          recordId: row.recordId,
          fullName: buildPersonFullName(row.firstName, row.lastName, "last_first"),
          reason: "V detailu hostování nebyl nalezen player_id."
        });
        continue;
      }

      const player = await createPlayerLocally({
        playerCode,
        fullName: buildPersonFullName(row.firstName, row.lastName, "last_first"),
        birthDate: row.birthDate || "",
        sourceClubName: row.oldClubName || "",
        suggestedAssignmentType: "hosting_in"
      });
      createdPlayers.push(player);
    } catch (error) {
      skippedRows.push({
        recordId: row.recordId,
        fullName: buildPersonFullName(row.firstName, row.lastName, "last_first"),
        reason: error.message || "Nepodařilo se načíst detail hostování."
      });
    }
  }

  const uniqueCodes = [...new Set(createdPlayers.map(player => player.playerCode).filter(Boolean))];
  if (uniqueCodes.length > 0) {
    const { config, teamSeasonId } = await resolveTeamSeason({ teamCode, seasonCode });
    const playerRows = (await getAllPlayers()).filter(player => uniqueCodes.includes(player.playerCode));
    const playerIdByCode = new Map(
      playerRows.map(row => [String(row.playerCode || "").trim(), row.id])
    );
    const upsertRows = createdPlayers
      .map(player => ({
        player_id: playerIdByCode.get(player.playerCode),
        team_season_id: teamSeasonId,
        assignment_type: "hosting_in",
        source_club_name: player.sourceClubName || null,
        notes: null,
        valid_from: null,
        valid_to: null,
        is_active: true
      }))
      .filter(row => row.player_id);

    if (upsertRows.length > 0) {
      await postSupabaseRows({
        ...config,
        table: "player_team_seasons",
        rows: upsertRows,
        onConflict: "player_id,team_season_id"
      });
    }
  }

  return {
    importedCount: uniqueCodes.length,
    skippedCount: skippedRows.length,
    skippedRows,
    players: await getRosterAdminState({ teamCode, seasonCode })
  };
}

async function buildServiceSyncPreview({ teamCode, seasonCode, serviceTeamId, phpSessionId }) {
  const [serviceHtml, localRoster, allPlayers] = await Promise.all([
    fetchServiceRosterHtml({ serviceTeamId, phpSessionId }),
    getTeamRoster({ teamCode, seasonCode }),
    getAllPlayers()
  ]);

  const serviceRoster = parseServiceRoster(serviceHtml);
  const localByCode = new Map(localRoster.map(player => [player.playerCode, player]));
  const allPlayersByCode = new Map(allPlayers.map(player => [player.playerCode, player]));
  const serviceCodes = new Set(serviceRoster.map(player => player.playerCode));

  const diffs = [];

  serviceRoster.forEach(player => {
    const localPlayer = allPlayersByCode.get(player.playerCode);
    if (!localPlayer) {
      diffs.push({
        playerCode: player.playerCode,
        fullName: player.fullName,
        birthDate: "",
        status: "missing",
        badge: "chybí lokálně",
        description: "Hráč je na soupisce ve service, ale není v lokální databázi hráčů.",
        actionable: false,
        operation: "missing_local"
      });
      return;
    }

    if (!localByCode.has(player.playerCode)) {
      diffs.push({
        playerCode: localPlayer.playerCode,
        fullName: localPlayer.fullName,
        birthDate: localPlayer.birthDate,
        status: "add",
        badge: "přidat lokálně",
        description: "Hráč je na soupisce ve service, ale není přiřazený v lokální DB.",
        actionable: true,
        operation: "add"
      });
      return;
    }

    diffs.push({
      playerCode: localPlayer.playerCode,
      fullName: localPlayer.fullName,
      birthDate: localPlayer.birthDate,
      status: "match",
      badge: "beze změny",
      description: "Hráč je v service i v lokální DB.",
      actionable: false,
      operation: "match"
    });
  });

  localRoster.forEach(player => {
    if (!serviceCodes.has(player.playerCode)) {
      diffs.push({
        playerCode: player.playerCode,
        fullName: player.fullName,
        birthDate: player.birthDate,
        status: "remove",
        badge: "odebrat lokálně",
        description: "Hráč je jen v lokální DB, ve service na soupisce není.",
        actionable: true,
        operation: "remove"
      });
    }
  });

  diffs.sort((left, right) => {
    const order = { missing: 0, add: 1, remove: 2, match: 3 };
    const diff = (order[left.status] ?? 99) - (order[right.status] ?? 99);
    if (diff !== 0) {
      return diff;
    }

    return left.fullName.localeCompare(right.fullName, "cs");
  });

  return {
    serviceTeamId,
    serviceRosterCount: serviceRoster.length,
    localRosterCount: localRoster.length,
    diffs
  };
}

async function buildServiceSyncPreviewV2({ teamCode, seasonCode, serviceTeamId, phpSessionId }) {
  const [serviceHtml, archivedHtml, localRoster, allPlayers] = await Promise.all([
    fetchServiceRosterHtml({ serviceTeamId, phpSessionId }),
    fetchServiceArchivedPlayersHtml({ phpSessionId }),
    getTeamRoster({ teamCode, seasonCode }),
    getAllPlayers()
  ]);

  const serviceRoster = parseServiceRoster(serviceHtml);
  const archivedPlayers = extractArchivedPlayersFromHtml(archivedHtml);
  const archivedCodes = new Set(archivedPlayers.map(player => player.playerCode));
  const localByCode = new Map(localRoster.map(player => [player.playerCode, player]));
  const allPlayersByCode = new Map(allPlayers.map(player => [player.playerCode, player]));
  const serviceCodes = new Set(serviceRoster.map(player => player.playerCode));
  const diffs = [];

  serviceRoster.forEach(player => {
    const localPlayer = allPlayersByCode.get(player.playerCode);
    if (!localPlayer) {
      const isArchived = archivedCodes.has(player.playerCode);
      diffs.push({
        playerCode: player.playerCode,
        fullName: player.fullName,
        birthDate: "",
        status: isArchived ? "archived" : "missing",
        badge: isArchived ? "archivovaný" : "chybí lokálně",
        description: isArchived
          ? "Hráč je na soupisce ve service, ale lokálně chybí a ve service je vedený jako archivovaný."
          : "Hráč je na soupisce ve service, ale není v lokální databázi hráčů.",
        actionable: false,
        operation: isArchived ? "missing_archived" : "missing_local"
      });
      return;
    }

    if (!localByCode.has(player.playerCode)) {
      diffs.push({
        playerCode: localPlayer.playerCode,
        fullName: localPlayer.fullName,
        birthDate: localPlayer.birthDate,
        status: "add",
        badge: "přidat lokálně",
        description: "Hráč je na soupisce ve service, ale není přiřazený v lokální DB.",
        actionable: true,
        operation: "add"
      });
      return;
    }

    diffs.push({
      playerCode: localPlayer.playerCode,
      fullName: localPlayer.fullName,
      birthDate: localPlayer.birthDate,
      status: "match",
      badge: "beze změny",
      description: "Hráč je v service i v lokální DB.",
      actionable: false,
      operation: "match"
    });
  });

  localRoster.forEach(player => {
    if (!serviceCodes.has(player.playerCode)) {
      diffs.push({
        playerCode: player.playerCode,
        fullName: player.fullName,
        birthDate: player.birthDate,
        status: "remove",
        badge: "odebrat lokálně",
        description: "Hráč je jen v lokální DB, ve service na soupisce není.",
        actionable: true,
        operation: "remove"
      });
    }
  });

  diffs.sort((left, right) => {
    const order = { archived: 0, missing: 1, add: 2, remove: 3, match: 4 };
    const diff = (order[left.status] ?? 99) - (order[right.status] ?? 99);
    if (diff !== 0) {
      return diff;
    }

    return left.fullName.localeCompare(right.fullName, "cs");
  });

  return {
    serviceTeamId,
    serviceRosterCount: serviceRoster.length,
    archivedRosterCount: archivedPlayers.length,
    localRosterCount: localRoster.length,
    diffs
  };
}

async function applyServiceSyncChanges({ teamCode, seasonCode, changes }) {
  const additions = changes.filter(change => change.operation === "add").map(change => change.playerCode);
  const removals = changes.filter(change => change.operation === "remove").map(change => change.playerCode);

  const currentState = await getRosterAdminState({ teamCode, seasonCode });
  const selectedCodes = new Set(
    currentState
      .filter(player => player.assigned)
      .map(player => player.playerCode)
  );

  additions.forEach(code => selectedCodes.add(code));
  removals.forEach(code => selectedCodes.delete(code));

  await saveRosterAdminState({
    teamCode,
    seasonCode,
    playerCodes: [...selectedCodes]
  });
}

async function createMissingServicePlayers({ serviceTeamId, phpSessionId }) {
  const serviceHtml = await fetchServiceRosterHtml({ serviceTeamId, phpSessionId });
  const serviceRoster = parseServiceRoster(serviceHtml);
  const allPlayers = await getAllPlayers();
  const knownCodes = new Set(allPlayers.map(player => player.playerCode));

  const missingPlayers = serviceRoster.filter(player => !knownCodes.has(player.playerCode));
  if (missingPlayers.length === 0) {
    return 0;
  }

  const config = getSupabaseConfig();
  const rows = missingPlayers.map(player => ({
    player_code: player.playerCode,
    full_name: player.fullName,
    birth_date: null
  }));

  await postSupabaseRows({
    ...config,
    table: "players",
    rows,
    onConflict: "player_code"
  });

  return missingPlayers.length;
}

async function getRecentGameRosters({ teamCode, seasonCode, limit = 8 }) {
  const { config, teamSeasonId } = await resolveTeamSeason({ teamCode, seasonCode });

  const games = await fetchSupabaseRows({
    ...config,
    table: "games",
    query: `select=id,external_id,opponent_name,scheduled_at&team_season_id=eq.${teamSeasonId}&order=scheduled_at.desc&limit=${limit}`
  });

  if (games.length === 0) {
    return [];
  }

  const gameIds = games.map(game => game.id).filter(Boolean);
  const gamePlayers = await fetchSupabaseRows({
    ...config,
    table: "game_players",
    query: `select=id,game_id,player_id&game_id=in.(${gameIds.join(",")})`
  });

  const gamePlayerIds = gamePlayers.map(row => row.id).filter(Boolean);
  const playerStats = gamePlayerIds.length === 0
    ? []
    : await fetchSupabaseRows({
        ...config,
        table: "player_game_stats",
        query: `select=game_player_id,ft_made,ft_missed,fg2_made,fg3_made,personal_fouls&game_player_id=in.(${gamePlayerIds.join(",")})`
      });

  const playerIds = [...new Set(gamePlayers.map(row => row.player_id).filter(Boolean))];
  const players = playerIds.length === 0
    ? []
    : await fetchSupabaseRows({
        ...config,
        table: "players",
        query: `select=id,player_code,full_name&id=in.(${playerIds.join(",")})`
      });

  const playerCodeById = new Map(
    players.map(player => [player.id, String(player.player_code || "").trim()])
  );
  const statsByGamePlayerId = new Map(
    playerStats.map(row => [
      row.game_player_id,
      {
        ZS1P: Number(row.ft_made || 0),
        ZS1M: Number(row.ft_missed || 0),
        ZS2PP: Number(row.fg2_made || 0),
        ZS3P: Number(row.fg3_made || 0),
        ZPF: Number(row.personal_fouls || 0)
      }
    ])
  );

  return games.map(game => {
    const selectedPlayerCodes = gamePlayers
      .filter(row => row.game_id === game.id)
      .map(row => playerCodeById.get(row.player_id))
      .filter(Boolean);
    const playerStatsByCode = {};

    gamePlayers
      .filter(row => row.game_id === game.id)
      .forEach(row => {
        const playerCode = playerCodeById.get(row.player_id);
        if (!playerCode) {
          return;
        }

        playerStatsByCode[playerCode] = statsByGamePlayerId.get(row.id) || {
          ZS1P: 0,
          ZS1M: 0,
          ZS2PP: 0,
          ZS3P: 0,
          ZPF: 0
        };
      });

    const dateLabel = game.scheduled_at ? String(game.scheduled_at).slice(0, 10) : "";
    const opponentLabel = game.opponent_name ? ` vs ${game.opponent_name}` : "";

    return {
      gameId: String(game.external_id || ""),
      label: `${dateLabel} | ${game.external_id}${opponentLabel}`,
      playerCodes: [...new Set(selectedPlayerCodes)],
      playerStatsByCode
    };
  }).filter(game => game.gameId);
}

async function getGameSummary({ teamCode, seasonCode, gameId }) {
  const { config, teamSeasonId } = await resolveTeamSeason({ teamCode, seasonCode });
  const gameRows = await fetchSupabaseRows({
    ...config,
    table: "games",
    query: `select=external_id,opponent_name,scheduled_at,home_score,guest_score,is_home&team_season_id=eq.${teamSeasonId}&external_id=eq.${encodeURIComponent(gameId)}&limit=1`
  });

  if (gameRows.length === 0) {
    try {
      const preview = await fetchGamePreview(gameId, teamCode);
      return {
        externalId: preview.gameId,
        opponentName: preview.opponentName,
        scheduledAt: "",
        scheduledAtLabel: preview.scheduledAtLabel,
        scoreLabel: preview.scoreLabel,
        isHome: preview.isHome,
        homeScore: preview.homeScore,
        guestScore: preview.guestScore,
        ourScore: preview.ourScore,
        source: "cbf"
      };
    } catch (error) {
      return null;
    }
  }

  const game = gameRows[0];
  const homeScore = game.home_score == null ? null : parseIntegerStatValue(game.home_score);
  const guestScore = game.guest_score == null ? null : parseIntegerStatValue(game.guest_score);
  const isHome = game.is_home == null ? null : Boolean(game.is_home);
  return {
    externalId: String(game.external_id || "").trim(),
    opponentName: String(game.opponent_name || "").trim(),
    scheduledAt: String(game.scheduled_at || "").trim(),
    scheduledAtLabel: game.scheduled_at ? String(game.scheduled_at).slice(0, 16).replace("T", " ") : "",
    scoreLabel:
      game.home_score == null || game.guest_score == null
        ? ""
        : `${game.home_score}:${game.guest_score}`,
    isHome,
    homeScore,
    guestScore,
    ourScore:
      isHome == null || homeScore == null || guestScore == null
        ? null
        : (isHome ? homeScore : guestScore),
    source: "local"
  };
}

async function ensureLocalGameForServiceImport({ teamCode, seasonCode, gameId }) {
  const { config, seasonId, teamSeasonId } = await resolveTeamSeason({ teamCode, seasonCode });
  const existingRows = await fetchSupabaseRows({
    ...config,
    table: "games",
    query: `select=id,external_id,opponent_name,scheduled_at,home_score,guest_score,is_home&team_season_id=eq.${teamSeasonId}&external_id=eq.${encodeURIComponent(gameId)}&limit=1`
  });

  if (existingRows.length > 0) {
    return {
      config,
      teamSeasonId,
      game: existingRows[0]
    };
  }

  const preview = await fetchGamePreview(gameId, teamCode);
  const insertedRows = await postSupabaseRows({
    ...config,
    table: "games",
    rows: [
      {
        season_id: seasonId,
        team_season_id: teamSeasonId,
        external_id: String(gameId),
        opponent_name: preview.opponentName || "Neznámý soupeř",
        scheduled_at: parseScheduledAtIso(preview.scheduledAtLabel),
        source_type: "service",
        source_url: `https://service.cbf.cz/?cross=teams&action=results&team=${encodeURIComponent(teamCode)}&game=${encodeURIComponent(gameId)}&statistics=lists`,
        home_score: preview.scoreLabel ? parseIntegerStatValue(String(preview.scoreLabel).split(":")[0]) : null,
        guest_score: preview.scoreLabel ? parseIntegerStatValue(String(preview.scoreLabel).split(":")[1]) : null,
        is_home: preview.isHome == null ? null : Boolean(preview.isHome)
      }
    ],
    onConflict: "external_id,team_season_id"
  });

  const insertedGame = Array.isArray(insertedRows) && insertedRows.length > 0
    ? insertedRows[0]
    : (await fetchSupabaseRows({
        ...config,
        table: "games",
        query: `select=id,external_id,opponent_name,scheduled_at,home_score,guest_score,is_home&team_season_id=eq.${teamSeasonId}&external_id=eq.${encodeURIComponent(gameId)}&limit=1`
      }))[0];

  return {
    config,
    teamSeasonId,
    game: insertedGame
  };
}

async function importServiceGameToLocalDb({ teamCode, serviceTeamId, seasonCode, gameId, phpSessionId }) {
  const { config, teamSeasonId, game } = await ensureLocalGameForServiceImport({ teamCode, seasonCode, gameId });
  if (!game?.id) {
    throw new Error(`Nepodařilo se připravit lokální utkání ${gameId}.`);
  }

  const roster = await getTeamRoster({ teamCode, seasonCode });
  const rosterByCode = new Map(roster.map(player => [player.playerCode, player]));

  const allPlayers = await getAllPlayers();
  const playerByCode = new Map(allPlayers.map(player => [player.playerCode, player]));

  const statsHtml = await fetchServiceGameStatsHtml({ serviceTeamId, gameId, phpSessionId });
  const servicePlayerCodes = extractServicePlayerIdsFromStatsHtml(statsHtml);

  const missingPlayerCodes = servicePlayerCodes.filter(playerCode => !playerByCode.has(playerCode));
  const validPlayerCodes = servicePlayerCodes.filter(playerCode => playerByCode.has(playerCode));

  const missingRosterPlayers = validPlayerCodes
    .map(playerCode => playerByCode.get(playerCode))
    .filter(Boolean)
    .filter(player => !rosterByCode.has(player.playerCode));

  if (missingRosterPlayers.length > 0) {
    await postSupabaseRows({
      ...config,
      table: "player_team_seasons",
      rows: missingRosterPlayers.map(player => ({
        player_id: player.id,
        team_season_id: teamSeasonId,
        is_active: true
      })),
      onConflict: "player_id,team_season_id"
    });
  }

  const refreshedRoster = await getTeamRoster({ teamCode, seasonCode });
  const refreshedRosterByCode = new Map(refreshedRoster.map(player => [player.playerCode, player]));
  const playerTeamSeasonRows = await fetchSupabaseRows({
    ...config,
    table: "player_team_seasons",
    query: `select=id,player_id&team_season_id=eq.${teamSeasonId}`
  });
  const playerTeamSeasonIdByPlayerId = new Map(playerTeamSeasonRows.map(row => [row.player_id, row.id]));

  const playerStatDetails = [];
  for (const playerCode of validPlayerCodes) {
    const detailHtml = await fetchServicePlayerEditHtml({ serviceTeamId, gameId, phpSessionId, playerCode });
    playerStatDetails.push(parseServicePlayerStats(detailHtml, playerCode));
  }

  const gamePlayerRows = await postSupabaseRows({
    ...config,
    table: "game_players",
    rows: playerStatDetails.map(playerStats => {
      const player = playerByCode.get(playerStats.playerCode);
      return {
        game_id: game.id,
        player_id: player.id,
        player_team_season_id: playerTeamSeasonIdByPlayerId.get(player.id) || null,
        jersey_number: playerStats.jerseyNumber || null,
        is_present: true
      };
    }),
    onConflict: "game_id,player_id"
  });

  const gamePlayerIdByPlayerId = new Map(
    gamePlayerRows
      .filter(row => row && row.player_id && row.id)
      .map(row => [row.player_id, row.id])
  );

  const missingGamePlayerIds = playerStatDetails
    .map(playerStats => playerByCode.get(playerStats.playerCode))
    .filter(Boolean)
    .filter(player => !gamePlayerIdByPlayerId.has(player.id));

  if (missingGamePlayerIds.length > 0) {
    const fallbackRows = await fetchSupabaseRows({
      ...config,
      table: "game_players",
      query: `select=id,player_id&game_id=eq.${game.id}`
    });
    fallbackRows.forEach(row => {
      if (row?.player_id && row?.id) {
        gamePlayerIdByPlayerId.set(row.player_id, row.id);
      }
    });
  }

  await postSupabaseRows({
    ...config,
    table: "player_game_stats",
    rows: playerStatDetails.map(playerStats => {
      const player = playerByCode.get(playerStats.playerCode);
      const gamePlayerId = gamePlayerIdByPlayerId.get(player.id);
      if (!gamePlayerId) {
        throw new Error(`Nepodařilo se najít game_player pro hráče ${playerStats.playerCode}.`);
      }

      return {
        game_player_id: gamePlayerId,
        started: Boolean(playerStats.started),
        seconds_played: playerStats.secondsPlayed,
        points: playerStats.points,
        ft_made: playerStats.ftMade,
        ft_missed: playerStats.ftMissed,
        fg2_made: playerStats.fg2Made,
        fg2_missed: playerStats.fg2Missed,
        fg3_made: playerStats.fg3Made,
        fg3_missed: playerStats.fg3Missed,
        defensive_rebounds: playerStats.defensiveRebounds,
        offensive_rebounds: playerStats.offensiveRebounds,
        blocks: playerStats.blocks,
        assists: playerStats.assists,
        steals: playerStats.steals,
        turnovers: playerStats.turnovers,
        fouls_drawn: playerStats.foulsDrawn,
        personal_fouls: playerStats.personalFouls,
        unsportsmanlike_fouls: playerStats.unsportsmanlikeFouls,
        technical_fouls: playerStats.technicalFouls,
        disqualifying_fouls: playerStats.disqualifyingFouls
      };
    }),
    onConflict: "game_player_id"
  });

  const summaryGame = await getGameSummary({ teamCode, seasonCode, gameId });
  return {
    game: summaryGame,
    importedPlayers: playerStatDetails.length,
    importedStats: playerStatDetails.length,
    missingPlayerCodes,
    servicePlayerCount: servicePlayerCodes.length,
    rosterPlayerCount: refreshedRosterByCode.size
  };
}

function runImporter({ teamCode, seasonCode, gameIds, outputPath }) {
  return new Promise((resolve, reject) => {
    const psArgs = [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", SCRIPT_PATH,
      "-TeamCode", teamCode,
      "-SeasonCode", seasonCode,
      "-OutputPath", outputPath,
      "-GameIds",
      ...gameIds
    ];

    const child = spawn("powershell.exe", psArgs, {
      cwd: path.join(__dirname, ".."),
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `Importer failed with exit code ${code}.`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function runDirectImport({ teamCode, seasonCode, gameIds }) {
  return new Promise((resolve, reject) => {
    const psArgs = [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", IMPORT_SCRIPT_PATH,
      "-TeamCode", teamCode,
      "-SeasonCode", seasonCode,
      "-GameIds", gameIds.join(",")
    ];

    const child = spawn("powershell.exe", psArgs, {
      cwd: path.join(__dirname, ".."),
      windowsHide: true,
      env: process.env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `Import failed with exit code ${code}.`));
        return;
      }

      try {
        const jsonStart = stdout.indexOf("{");
        const payload = JSON.parse(jsonStart >= 0 ? stdout.slice(jsonStart) : stdout);
        resolve({ payload, stdout, stderr });
      } catch (parseError) {
        reject(new Error(`Nepodařilo se zpracovat odpověď importéru. ${parseError.message}`));
      }
    });
  });
}

async function postServiceRosterPlayer({ serviceTeamId, gameId, phpSessionId, playerCode, stats = {} }) {
  const url = `https://service.cbf.cz/?cross=teams&action=results&team=${encodeURIComponent(serviceTeamId)}&game=${encodeURIComponent(gameId)}&statistics=lists&player_var=add`;

  const form = new FormData();
  form.append("IDuser", String(playerCode));
  form.append("number", "");
  SERVICE_STAT_KEYS.forEach(key => {
    const rawValue = Object.prototype.hasOwnProperty.call(stats, key) ? stats[key] : "0";
    const normalizedValue = String(rawValue ?? "0").replace(/\D/g, "");
    form.append(key, normalizedValue.length > 0 ? normalizedValue : "0");
  });
  form.append("table_save", "1");

  const response = await fetch(url, {
    method: "POST",
    body: form,
    redirect: "manual",
    headers: {
      Cookie: `PHPSESSID=${phpSessionId}`,
      Origin: "https://service.cbf.cz",
      Referer: url
    }
  });

  const location = response.headers.get("location") || "";
  const setCookie = response.headers.get("set-cookie") || "";
  const success =
    (response.status === 302 || response.status === 303) &&
    (setCookie.includes("app-status=saved") || location.includes("statistics=lists"));

  return {
    playerCode: String(playerCode),
    status: response.status,
    success,
    location
  };
}

async function handleGenerate(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const gameIds = parseGameIds(String(payload.gameIds || ""));

    if (!teamCode) {
      sendJson(res, 400, { error: "Chybí team code." });
      return;
    }

    if (!seasonCode) {
      sendJson(res, 400, { error: "Chybí season code." });
      return;
    }

    if (gameIds.length === 0) {
      sendJson(res, 400, { error: "Zadej alespoň jedno ID utkání." });
      return;
    }

    const outputPath = buildOutputPath(teamCode, seasonCode);
    const { stdout } = await runImporter({ teamCode, seasonCode, gameIds, outputPath });
    const missingPath = outputPath.replace(/\.sql$/i, "_missing_players.sql");

    let sqlPreview = "";
    let missingPreview = "";

    if (fs.existsSync(outputPath)) {
      sqlPreview = fs.readFileSync(outputPath, "utf8").slice(0, 5000);
    }

    if (fs.existsSync(missingPath)) {
      missingPreview = fs.readFileSync(missingPath, "utf8");
    }

    sendJson(res, 200, {
      ok: true,
      outputPath,
      missingPath,
      stdout,
      sqlPreview,
      missingPreview,
      gameCount: gameIds.length
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Importer failed."
    });
  }
}

async function handleImport(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const gameIds = parseGameIds(String(payload.gameIds || ""));

    if (!teamCode) {
      sendJson(res, 400, { error: "Chybí team code." });
      return;
    }

    if (!seasonCode) {
      sendJson(res, 400, { error: "Chybí season code." });
      return;
    }

    if (gameIds.length === 0) {
      sendJson(res, 400, { error: "Zadej alespoň jedno ID utkání." });
      return;
    }

    const { payload: importResult, stdout } = await runDirectImport({ teamCode, seasonCode, gameIds });
    sendJson(res, 200, {
      ok: true,
      stdout,
      importResult
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Import do DB selhal."
    });
  }
}

async function handleTeamGames(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const serviceTeamId = String(payload.serviceTeamId || "").trim();
    const phpSessionId = String(payload.phpSessionId || "").trim();
    const onlyMissingGames = payload.onlyMissingGames !== false;

    if (!teamCode) {
      sendJson(res, 400, { error: "Chybí team code." });
      return;
    }

    if (!seasonCode) {
      sendJson(res, 400, { error: "Chybí season code." });
      return;
    }

    const year = seasonCodeToYear(seasonCode);
    const url = `https://cz.basketball/tym/${encodeURIComponent(teamCode)}?y=${year}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Nepodařilo se načíst stránku týmu. HTTP ${response.status}.`);
    }

    const html = await response.text();
    const allGameIds = sortGameIdsAscending(extractGameIdsFromTeamPage(html));

    const importedGameIds = await getImportedGameIds({ teamCode, seasonCode });

    let gameIds = allGameIds;
    let skippedImportedCount = 0;

    if (onlyMissingGames) {
      gameIds = allGameIds.filter(gameId => !importedGameIds.has(gameId));
      skippedImportedCount = allGameIds.length - gameIds.length;
    }

    const games = await Promise.all(
      gameIds.map(async gameId => {
        try {
          const game = await fetchGamePreview(gameId, teamCode);
          let servicePlayersCount = null;

          if (serviceTeamId && phpSessionId) {
            try {
              const serviceMeta = await fetchServiceGameStatsCount({
                serviceTeamId,
                gameId,
                phpSessionId
              });
              servicePlayersCount = serviceMeta.servicePlayersCount;
            } catch (error) {
              servicePlayersCount = null;
            }
          }

          return {
            ...game,
            alreadyImported: importedGameIds.has(gameId),
            servicePlayersCount
          };
        } catch (error) {
          return {
            gameId,
            scheduledAtLabel: "",
            opponentName: "",
            scoreLabel: "",
            alreadyImported: importedGameIds.has(gameId),
            servicePlayersCount: null,
            loadError: error.message
          };
        }
      })
    );

    games.sort((left, right) => {
      const diff = parseScheduledAtValue(left.scheduledAtLabel) - parseScheduledAtValue(right.scheduledAtLabel);
      if (diff !== 0) {
        return diff;
      }

      return Number(left.gameId) - Number(right.gameId);
    });

    sendJson(res, 200, {
      ok: true,
      url,
      teamPageId: teamCode,
      onlyMissingGames,
      totalGameCount: allGameIds.length,
      skippedImportedCount,
      gameIds: games.map(game => game.gameId),
      games
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se načíst seznam utkání."
    });
  }
}

async function handleTeamRoster(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();

    if (!teamCode) {
      sendJson(res, 400, { error: "Chybí team code." });
      return;
    }

    if (!seasonCode) {
      sendJson(res, 400, { error: "Chybí season code." });
      return;
    }

    const players = await getTeamRoster({ teamCode, seasonCode });
    const previousGames = await getRecentGameRosters({ teamCode, seasonCode });
    sendJson(res, 200, {
      ok: true,
      teamCode,
      seasonCode,
      players,
      previousGames
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se načíst soupisku."
    });
  }
}

async function handleGameSummary(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const gameId = String(payload.gameId || "").trim();

    if (!teamCode) {
      sendJson(res, 400, { error: "Chybí team code." });
      return;
    }

    if (!seasonCode) {
      sendJson(res, 400, { error: "Chybí season code." });
      return;
    }

    if (!gameId) {
      sendJson(res, 400, { error: "Chybí game ID." });
      return;
    }

    const game = await getGameSummary({ teamCode, seasonCode, gameId });
    if (!game) {
      sendJson(res, 404, { error: "Utkání nebylo v lokální DB nalezeno." });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      teamCode,
      seasonCode,
      game
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se načíst detail utkání."
    });
  }
}

async function handleServiceSyncPreview(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const serviceTeamId = String(payload.serviceTeamId || "").trim();
    const phpSessionId = String(payload.phpSessionId || "").trim();

    if (!teamCode || !seasonCode || !serviceTeamId || !phpSessionId) {
      sendJson(res, 400, { error: "Chybí team code, season code, service team ID nebo PHPSESSID." });
      return;
    }

    const preview = await buildServiceSyncPreviewV2({ teamCode, seasonCode, serviceTeamId, phpSessionId });
    sendJson(res, 200, {
      ok: true,
      teamCode,
      seasonCode,
      ...preview
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se načíst soupisku ze service."
    });
  }
}

async function handleServiceSyncApply(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const serviceTeamId = String(payload.serviceTeamId || "").trim();
    const phpSessionId = String(payload.phpSessionId || "").trim();
    const changes = Array.isArray(payload.changes) ? payload.changes : [];

    if (!teamCode || !seasonCode || !serviceTeamId || !phpSessionId) {
      sendJson(res, 400, { error: "Chybí team code, season code, service team ID nebo PHPSESSID." });
      return;
    }

    await applyServiceSyncChanges({ teamCode, seasonCode, changes });
    const players = await getRosterAdminState({ teamCode, seasonCode });
    const preview = await buildServiceSyncPreviewV2({ teamCode, seasonCode, serviceTeamId, phpSessionId });

    sendJson(res, 200, {
      ok: true,
      teamCode,
      seasonCode,
      appliedCount: changes.length,
      players,
      ...preview
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se promítnout změny ze service."
    });
  }
}

async function handleServiceSyncCreatePlayers(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const serviceTeamId = String(payload.serviceTeamId || "").trim();
    const phpSessionId = String(payload.phpSessionId || "").trim();

    if (!teamCode || !seasonCode || !serviceTeamId || !phpSessionId) {
      sendJson(res, 400, { error: "Chybí team code, season code, service team ID nebo PHPSESSID." });
      return;
    }

    const createdCount = await createMissingServicePlayers({ serviceTeamId, phpSessionId });
    const preview = await buildServiceSyncPreviewV2({ teamCode, seasonCode, serviceTeamId, phpSessionId });

    sendJson(res, 200, {
      ok: true,
      teamCode,
      seasonCode,
      createdCount,
      ...preview
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se založit chybějící hráče ze service."
    });
  }
}

async function handleRosterAdminLoad(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();

    if (!teamCode) {
      sendJson(res, 400, { error: "Chybí team code." });
      return;
    }

    if (!seasonCode) {
      sendJson(res, 400, { error: "Chybí season code." });
      return;
    }

    const players = await getRosterAdminState({ teamCode, seasonCode });
    sendJson(res, 200, {
      ok: true,
      teamCode,
      seasonCode,
      players
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se načíst správu soupisky."
    });
  }
}

async function handleRosterAdminSave(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const playerCodes = Array.isArray(payload.playerCodes)
      ? payload.playerCodes.map(value => String(value).trim()).filter(Boolean)
      : [];
    const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];

    if (!teamCode) {
      sendJson(res, 400, { error: "Chybí team code." });
      return;
    }

    if (!seasonCode) {
      sendJson(res, 400, { error: "Chybí season code." });
      return;
    }

    const players = await saveRosterAdminState({ teamCode, seasonCode, playerCodes, assignments });
    sendJson(res, 200, {
      ok: true,
      teamCode,
      seasonCode,
      assignedCount: players.filter(player => player.assigned).length,
      players
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se uložit soupisku."
    });
  }
}

async function handleRosterAdminImportHosting(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const phpSessionId = String(payload.phpSessionId || "").trim();
    const serviceTeamName = String(payload.serviceTeamName || "").trim();

    if (!teamCode || !seasonCode || !phpSessionId || !serviceTeamName) {
      sendJson(res, 400, { error: "Chybí team code, season code, PHPSESSID nebo service název týmu." });
      return;
    }

    const result = await importHostedPlayersForTeam({
      teamCode,
      seasonCode,
      phpSessionId,
      serviceTeamName
    });

    sendJson(res, 200, {
      ok: true,
      teamCode,
      seasonCode,
      serviceTeamName,
      ...result
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se importovat hostující hráče ze service."
    });
  }
}

async function handleServicePlayerCreate(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const serviceTeamId = String(payload.serviceTeamId || "").trim();
    const playerCode = String(payload.playerCode || "").trim();
    const phpSessionId = String(payload.phpSessionId || "").trim();
    const fallbackFullName = String(payload.fallbackFullName || "").trim();
    const fallbackBirthYear = String(payload.fallbackBirthYear || "").trim();

    if (!serviceTeamId) {
      sendJson(res, 400, { error: "Chybí service team ID." });
      return;
    }

    if (!playerCode) {
      sendJson(res, 400, { error: "Chybí player_id ze service." });
      return;
    }

    if (!phpSessionId) {
      sendJson(res, 400, { error: "Chybí PHPSESSID." });
      return;
    }

    let player;
    try {
      player = await createPlayerFromService({
        serviceTeamId,
        playerCode,
        phpSessionId,
        seasonCode: String(payload.seasonCode || "").trim()
      });
    } catch (error) {
      if (!fallbackFullName) {
        throw error;
      }

      const fallbackPlayer = {
        playerCode,
        fullName: fallbackFullName,
        birthDate: parseBirthDateFromYear(fallbackBirthYear),
        sourceClubName: "",
        suggestedAssignmentType: "hosting_in"
      };

      try {
        const transferHostHtml = await fetchServiceTransferHostHtml({
          phpSessionId,
          seasonCode: String(payload.seasonCode || "").trim()
        });
        const transferMatch = matchServiceTransferForPlayer(
          extractServiceTransferRows(transferHostHtml),
          fallbackPlayer
        );

        if (transferMatch) {
          fallbackPlayer.sourceClubName = normalizeOptionalText(transferMatch.oldClubName);
          fallbackPlayer.suggestedAssignmentType = /hostov/i.test(transferMatch.transferType) ? "hosting_in" : "regular";
        }
      } catch (_) {
        // fallback stays minimal when transfer overview is unavailable
      }

      player = await createPlayerLocally({
        playerCode,
        fullName: fallbackFullName,
        birthDate: fallbackPlayer.birthDate,
        sourceClubName: fallbackPlayer.sourceClubName,
        suggestedAssignmentType: fallbackPlayer.suggestedAssignmentType
      });
    }
    sendJson(res, 200, {
      ok: true,
      player
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se načíst hráče ze service."
    });
  }
}

async function handleServiceRosterSync(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const serviceTeamId = String(payload.serviceTeamId || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const gameId = String(payload.gameId || "").trim();
    const phpSessionId = String(payload.phpSessionId || "").trim();
    const includeStats = Boolean(payload.includeStats);
    const players = Array.isArray(payload.players)
      ? payload.players
          .map(player => ({
            playerCode: String(player?.playerCode || "").trim(),
            stats: player && typeof player.stats === "object" && player.stats !== null ? player.stats : {}
          }))
          .filter(player => player.playerCode)
      : [];
    const playerCodes = players.map(player => player.playerCode);

    if (!teamCode || !serviceTeamId || !seasonCode || !gameId || !phpSessionId) {
      sendJson(res, 400, { error: "Chybí tým, interní service ID, sezóna, ID utkání nebo PHPSESSID." });
      return;
    }

    if (playerCodes.length === 0) {
      sendJson(res, 400, { error: "Nebyl vybrán žádný hráč." });
      return;
    }

    const roster = await getTeamRoster({ teamCode, seasonCode });
    const validPlayerCodes = new Set(roster.map(player => player.playerCode));
    const invalidPlayerCodes = playerCodes.filter(playerCode => !validPlayerCodes.has(playerCode));
    if (invalidPlayerCodes.length > 0) {
      sendJson(res, 400, {
        error: `Někteří hráči nepatří do vybraného týmu/sezóny: ${invalidPlayerCodes.join(", ")}`
      });
      return;
    }

    const results = [];
    for (const player of players) {
      results.push(await postServiceRosterPlayer({
        serviceTeamId,
        gameId,
        phpSessionId,
        playerCode: player.playerCode,
        stats: includeStats ? player.stats : {}
      }));
    }

    const savedCount = results.filter(result => result.success).length;
    const failed = results.filter(result => !result.success);

    sendJson(res, 200, {
      ok: true,
      gameId,
      teamCode,
      serviceTeamId,
      seasonCode,
      savedCount,
      failedCount: failed.length,
      results
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se odeslat soupisku do service.cbf.cz."
    });
  }
}

async function handleServiceGameImport(req, res) {
  try {
    const body = await readRequestBody(req);
    const payload = JSON.parse(body);

    const teamCode = String(payload.teamCode || "").trim();
    const serviceTeamId = String(payload.serviceTeamId || "").trim();
    const seasonCode = String(payload.seasonCode || "").trim();
    const gameId = String(payload.gameId || "").trim();
    const phpSessionId = String(payload.phpSessionId || "").trim();

    if (!teamCode || !serviceTeamId || !seasonCode || !gameId || !phpSessionId) {
      sendJson(res, 400, { error: "Chybí tým, interní service ID, sezóna, ID utkání nebo PHPSESSID." });
      return;
    }

    const result = await importServiceGameToLocalDb({
      teamCode,
      serviceTeamId,
      seasonCode,
      gameId,
      phpSessionId
    });

    sendJson(res, 200, {
      ok: true,
      teamCode,
      serviceTeamId,
      seasonCode,
      gameId,
      teamLabel: teamCode,
      ...result
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Nepodařilo se importovat statistiky ze service do lokální DB."
    });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/team-games") {
    handleTeamGames(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/team-roster") {
    handleTeamRoster(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/game-summary") {
    handleGameSummary(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/service-sync-preview") {
    handleServiceSyncPreview(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/service-sync-apply") {
    handleServiceSyncApply(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/service-sync-create-players") {
    handleServiceSyncCreatePlayers(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/roster-admin-load") {
    handleRosterAdminLoad(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/roster-admin-save") {
    handleRosterAdminSave(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/roster-admin-import-hosting") {
    handleRosterAdminImportHosting(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/service-player-create") {
    handleServicePlayerCreate(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/service-roster-sync") {
    handleServiceRosterSync(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/service-game-import") {
    handleServiceGameImport(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/import") {
    handleImport(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/generate") {
    handleGenerate(req, res);
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`CBF importer UI is running on http://localhost:${PORT}`);
});
