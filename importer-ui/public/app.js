const importForm = document.getElementById("import-form");
const rosterAdminForm = document.getElementById("roster-admin-form");
const serviceSyncForm = document.getElementById("service-sync-form");
const serviceForm = document.getElementById("service-form");

const submitButton = document.getElementById("submit-button");
const loadRosterAdminButton = document.getElementById("load-roster-admin-button");
const saveRosterAdminButton = document.getElementById("save-roster-admin-button");
const loadServicePlayerButton = document.getElementById("load-service-player-button");
const importHostedPlayersButton = document.getElementById("import-hosted-players-button");
const loadServiceSyncButton = document.getElementById("load-service-sync-button");
const createMissingServicePlayersButton = document.getElementById("create-missing-service-players-button");
const applyServiceSyncButton = document.getElementById("apply-service-sync-button");
const loadGamesButton = document.getElementById("load-games-button");
const loadRosterButton = document.getElementById("load-roster-button");
const sendRosterButton = document.getElementById("send-roster-button");
const importServiceGameButton = document.getElementById("import-service-game-button");
const importServiceStatsButton = document.getElementById("import-service-stats-button");
const selectAllGamesButton = document.getElementById("select-all-games-button");
const clearGamesButton = document.getElementById("clear-games-button");
const clearSharedSessionButton = document.getElementById("clear-shared-session-button");
const toggleGamesPanelButton = document.getElementById("toggle-games-panel-button");
const selectAllRosterAdminButton = document.getElementById("select-all-roster-admin-button");
const clearRosterAdminButton = document.getElementById("clear-roster-admin-button");
const toggleRosterAdminPanelButton = document.getElementById("toggle-roster-admin-panel-button");
const selectAllServiceSyncButton = document.getElementById("select-all-service-sync-button");
const clearServiceSyncButton = document.getElementById("clear-service-sync-button");
const toggleServiceSyncPanelButton = document.getElementById("toggle-service-sync-panel-button");
const selectAllRosterButton = document.getElementById("select-all-roster-button");
const clearRosterButton = document.getElementById("clear-roster-button");
const toggleRosterPanelButton = document.getElementById("toggle-roster-panel-button");
const applyPreviousGameButton = document.getElementById("apply-previous-game-button");

const teamSelect = document.getElementById("team-select");
const seasonSelect = document.getElementById("season-select");
const sharedServiceSessionIdField = document.getElementById("shared-service-session-id");
const gameIdsField = document.getElementById("game-ids");
const onlyMissingGamesCheckbox = document.getElementById("only-missing-games");
const servicePlayerIdField = document.getElementById("service-player-id");
const servicePlayerNameFallbackField = document.getElementById("service-player-name-fallback");
const servicePlayerBirthYearFallbackField = document.getElementById("service-player-birth-year-fallback");
const serviceTeamIdField = document.getElementById("service-team-id");
const serviceGameIdField = document.getElementById("service-game-id");
const serviceStatsEnabledCheckbox = document.getElementById("service-stats-enabled");
const serviceGameSummary = document.getElementById("service-game-summary");
const servicePointsCheck = document.getElementById("service-points-check");
const gameSelectionList = document.getElementById("game-selection-list");
const rosterAdminList = document.getElementById("roster-admin-list");
const rosterList = document.getElementById("roster-list");
const serviceSyncList = document.getElementById("service-sync-list");
const previousGameSelect = document.getElementById("previous-game-select");
const gamesPanel = gameSelectionList ? gameSelectionList.closest(".roster-panel") : null;
const rosterAdminPanel = rosterAdminList ? rosterAdminList.closest(".roster-panel") : null;
const serviceSyncPanel = serviceSyncList ? serviceSyncList.closest(".roster-panel") : null;
const rosterPanel = rosterList ? rosterList.closest(".roster-panel") : null;

const statusText = document.getElementById("status-text");
const rosterAdminStatusText = document.getElementById("roster-admin-status-text");
const serviceSyncStatusText = document.getElementById("service-sync-status-text");
const serviceStatusText = document.getElementById("service-status-text");
const rosterAdminContextText = document.getElementById("roster-admin-context-text");
const serviceSyncContextText = document.getElementById("service-sync-context-text");
const serviceRosterContextText = document.getElementById("service-roster-context-text");
const resultCard = document.getElementById("result-card");
const processedGames = document.getElementById("processed-games");
const importedPlayers = document.getElementById("imported-players");
const importedStats = document.getElementById("imported-stats");
const sqlPreview = document.getElementById("sql-preview");
const missingPreview = document.getElementById("missing-preview");
const stdoutPreview = document.getElementById("stdout-preview");
const serviceOutput = document.getElementById("service-output");
const rosterAdminOutput = document.getElementById("roster-admin-output");
const serviceSyncOutput = document.getElementById("service-sync-output");

const teamOptions = [
  { code: "12494", serviceTeamId: "12495", serviceTeamName: "BBA Skokani Brno A", name: "BK Skokani Brno U10A" },
  { code: "14516", serviceTeamId: "14516", serviceTeamName: "BBA Skokani Brno B", name: "BK Skokani Brno U10B" },
  { code: "12301", serviceTeamId: "12301", serviceTeamName: "BBA Skokani Brno A", name: "BK Skokani Brno U11A" },
  { code: "13483", serviceTeamId: "13483", serviceTeamName: "BBA Skokani Brno B", name: "BK Skokani Brno U11B" },
  { code: "11939", serviceTeamId: "11939", serviceTeamName: "BBA Skokani Brno A", name: "BK Skokani Brno U12A" },
  { code: "13484", serviceTeamId: "13484", serviceTeamName: "BBA Skokani Brno B", name: "BK Skokani Brno U12B" },
  { code: "12306", serviceTeamId: "12306", serviceTeamName: "BBA Skokani Brno A", name: "BK Skokani Brno U13A" },
  { code: "13485", serviceTeamId: "13485", serviceTeamName: "BBA Skokani Brno B", name: "BK Skokani Brno U13B" },
  { code: "14703", serviceTeamId: "14703", serviceTeamName: "BBA Skokani Brno A", name: "BK Skokani Brno U14A" },
  { code: "14856", serviceTeamId: "14856", serviceTeamName: "BBA Skokani Brno B", name: "BK Skokani Brno U14B" },
  { code: "12880", serviceTeamId: "12880", serviceTeamName: "BBA ST Brno", name: "BK Skokani Brno U15ST" },
  { code: "15394", serviceTeamId: "15394", serviceTeamName: "BBA Skokani Brno B", name: "BK Skokani Brno U15B" }
];

const seasonOptions = [
  { code: "2025-2026", name: "2025/2026", selected: true },
  { code: "2024-2025", name: "2024/2025" },
  { code: "2023-2024", name: "2023/2024" }
];

const rosterAssignmentOptions = [
  { value: "regular", label: "Náš hráč" },
  { value: "hosting_in", label: "Hostování k nám" }
];

let rosterPlayers = [];
let previousGames = [];
let rosterAdminPlayers = [];
let serviceSyncDiffs = [];
let availableGames = [];
let currentServiceGame = null;
let isSyncingGameIdsField = false;
const SHARED_SERVICE_SESSION_STORAGE_KEY = "cbf-importer-shared-service-session-id";

function getBirthYear(birthDate) {
  const value = String(birthDate || "").trim();
  const match = value.match(/^(\d{4})/);
  return match ? match[1] : "";
}

function formatTeamLabel(team) {
  return `${team.serviceTeamId} - ${team.name}`;
}

function formatPlayerLabel(player) {
  const birthYear = getBirthYear(player.birthDate);
  return birthYear
    ? `${player.fullName} (${player.playerCode}, ${birthYear})`
    : `${player.fullName} (${player.playerCode})`;
}

function normalizeIntegerValue(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 0 ? digits : "0";
}

function toInteger(value) {
  const normalized = normalizeIntegerValue(value);
  return Number.parseInt(normalized, 10) || 0;
}

function normalizeDisplayText(value) {
  return String(value || "")
    .replace(/UtkÃ¡nÃ­/g, "Utkání")
    .replace(/UtkÃƒÂ¡nÃƒÂ­/g, "Utkání")
    .replace(/domÃ¡cÃ­/g, "domácí")
    .replace(/domÃƒÂ¡cÃƒÂ­/g, "domácí")
    .replace(/uÅ¾/g, "už")
    .replace(/uÃ…Â¾/g, "už")
    .replace(/detail se nepodaÅ™ilo naÄÃ­st/g, "detail se nepodařilo načíst")
    .replace(/detail se nepodaÃ…â„¢ilo naÃ„ÂÃƒÂ­st/g, "detail se nepodařilo načíst")
    .replace(/hrÃ¡ÄÅ¯/g, "hráčů")
    .replace(/hrÃƒÂ¡Ã„ÂÃ…Â¯/g, "hráčů")
    .replace(/hrÃƒÆ’Ã‚Â¡Ãƒâ€žÃ‚ÂÃƒâ€¦Ã‚Â¯/g, "hráčů");
}

function fixMojibake(value) {
  return String(value || "")
    .replace(/UtkÃ¡nÃ­/g, "Utkání")
    .replace(/domÃ¡cÃ­/g, "domácí")
    .replace(/uÅ¾/g, "už")
    .replace(/detail se nepodaÅ™ilo naÄÃ­st/g, "detail se nepodařilo načíst")
    .replace(/hrÃƒÂ¡Ã„ÂÃ…Â¯/g, "hráčů");
}

function getSelectedTeamMeta() {
  const selectedTeam = teamOptions.find(team => team.code === teamSelect.value);
  const selectedSeason = seasonOptions.find(season => season.code === seasonSelect.value);

  return {
    teamCode: selectedTeam ? selectedTeam.code : teamSelect.value,
    serviceTeamId: selectedTeam ? selectedTeam.serviceTeamId : "",
    serviceTeamName: selectedTeam ? selectedTeam.serviceTeamName : "",
    teamLabel: selectedTeam ? selectedTeam.name : teamSelect.value,
    seasonLabel: selectedSeason ? selectedSeason.name : seasonSelect.value
  };
}

function updateSectionContexts() {
  const { teamCode, serviceTeamId, teamLabel, seasonLabel } = getSelectedTeamMeta();
  const sharedLabel = `${teamLabel} | ${seasonLabel}`;

  rosterAdminContextText.textContent = `Aktuálně upravuješ lokální soupisku pro: ${sharedLabel}.`;
  serviceSyncContextText.textContent = `Porovnání se service poběží pro: ${sharedLabel}. Team code: ${teamCode}, interní service ID: ${serviceTeamId}.`;
  serviceRosterContextText.textContent = `Hráči pro service utkání se načítají z lokální soupisky pro: ${sharedLabel}.`;
  if (serviceTeamIdField) {
    serviceTeamIdField.value = serviceTeamId || "";
  }
}

function loadSharedServiceSession() {
  try {
    const savedValue = window.localStorage.getItem(SHARED_SERVICE_SESSION_STORAGE_KEY) || "";
    sharedServiceSessionIdField.value = savedValue;
  } catch (error) {
    // localStorage is optional here
  }
}

function setPanelCollapsed(panel, button, isCollapsed) {
  if (!panel || !button) {
    return;
  }

  panel.classList.toggle("is-collapsed", Boolean(isCollapsed));
  button.textContent = isCollapsed ? "Zobrazit seznam" : "Skrýt seznam";
  button.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
}

function bindPanelToggle(button, panel) {
  if (!button || !panel) {
    return;
  }

  setPanelCollapsed(panel, button, false);
  button.addEventListener("click", () => {
    const isCollapsed = panel.classList.contains("is-collapsed");
    setPanelCollapsed(panel, button, !isCollapsed);
  });
}

function persistSharedServiceSession() {
  try {
    const value = String(sharedServiceSessionIdField.value || "").trim();
    if (value) {
      window.localStorage.setItem(SHARED_SERVICE_SESSION_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(SHARED_SERVICE_SESSION_STORAGE_KEY);
    }
  } catch (error) {
    // localStorage is optional here
  }
}

function populateTeams() {
  const fragment = document.createDocumentFragment();

  teamOptions.forEach(team => {
    const option = document.createElement("option");
    option.value = team.code;
    option.textContent = formatTeamLabel(team);
    if (team.code === "12880") {
      option.selected = true;
    }
    fragment.appendChild(option);
  });

  teamSelect.appendChild(fragment);
}

function populateSeasons() {
  const fragment = document.createDocumentFragment();

  seasonOptions.forEach(season => {
    const option = document.createElement("option");
    option.value = season.code;
    option.textContent = season.name;
    if (season.selected) {
      option.selected = true;
    }
    fragment.appendChild(option);
  });

  seasonSelect.appendChild(fragment);
}

function setImportLoadingState(isLoading) {
  submitButton.disabled = isLoading;
  loadGamesButton.disabled = isLoading;
  selectAllGamesButton.disabled = isLoading || availableGames.length === 0;
  clearGamesButton.disabled = isLoading || availableGames.length === 0;
  clearSharedSessionButton.disabled = isLoading;
  teamSelect.disabled = isLoading;
  seasonSelect.disabled = isLoading;
  sharedServiceSessionIdField.disabled = isLoading;
  gameIdsField.disabled = isLoading;
  onlyMissingGamesCheckbox.disabled = isLoading;
  submitButton.textContent = isLoading ? "Importuji..." : "Importovat do DB";
}

function setRosterAdminLoadingState(isLoading) {
  loadRosterAdminButton.disabled = isLoading;
  saveRosterAdminButton.disabled = isLoading || rosterAdminPlayers.length === 0;
  loadServicePlayerButton.disabled = isLoading;
  importHostedPlayersButton.disabled = isLoading;
  selectAllRosterAdminButton.disabled = isLoading || rosterAdminPlayers.length === 0;
  clearRosterAdminButton.disabled = isLoading || rosterAdminPlayers.length === 0;
  servicePlayerIdField.disabled = isLoading;
  servicePlayerNameFallbackField.disabled = isLoading;
  servicePlayerBirthYearFallbackField.disabled = isLoading;
  loadRosterAdminButton.textContent = isLoading ? "Načítám..." : "Načíst soupisku pro úpravu";
}

function setServiceSyncLoadingState(isLoading) {
  loadServiceSyncButton.disabled = isLoading;
  createMissingServicePlayersButton.disabled = isLoading || !serviceSyncDiffs.some(diff => diff.status === "missing" || diff.status === "archived");
  applyServiceSyncButton.disabled = isLoading || !serviceSyncDiffs.some(diff => diff.actionable);
  selectAllServiceSyncButton.disabled = isLoading || serviceSyncDiffs.length === 0;
  clearServiceSyncButton.disabled = isLoading || serviceSyncDiffs.length === 0;
  serviceTeamIdField.disabled = isLoading;
  sharedServiceSessionIdField.disabled = isLoading;
  loadServiceSyncButton.textContent = isLoading ? "Načítám..." : "Načíst a porovnat";
}

function setServiceLoadingState(isLoading) {
  loadRosterButton.disabled = isLoading;
  sendRosterButton.disabled = isLoading || rosterPlayers.length === 0;
  importServiceGameButton.disabled = isLoading;
  importServiceStatsButton.disabled = isLoading;
  selectAllRosterButton.disabled = isLoading || rosterPlayers.length === 0;
  clearRosterButton.disabled = isLoading || rosterPlayers.length === 0;
  applyPreviousGameButton.disabled = isLoading || previousGames.length === 0;
  previousGameSelect.disabled = isLoading || previousGames.length === 0;
  serviceGameIdField.disabled = isLoading;
  serviceStatsEnabledCheckbox.disabled = isLoading;
  sharedServiceSessionIdField.disabled = isLoading;
  loadRosterButton.textContent = isLoading ? "Načítám..." : "Načíst soupisku týmu";
}

function setResult(data) {
  resultCard.classList.remove("is-empty");

  const games = data.importResult?.games || [];
  const playerTotal = games.reduce((sum, game) => sum + (game.imported_players || 0), 0);
  const statsTotal = games.reduce((sum, game) => sum + (game.imported_stats || 0), 0);
  const missing = games.flatMap(game =>
    (game.missing_player_codes || []).map(code => `${game.game_id}: ${code}`)
  );

  processedGames.textContent = String(data.importResult?.games_processed ?? games.length ?? 0);
  importedPlayers.textContent = String(playerTotal);
  importedStats.textContent = String(statsTotal);
  sqlPreview.textContent = JSON.stringify(data.importResult, null, 2);
  missingPreview.textContent = missing.length > 0 ? missing.join("\n") : "Žádní chybějící hráči.";
  stdoutPreview.textContent = data.stdout || "-";
}

function renderRoster(players) {
  rosterPlayers = players;
  rosterList.innerHTML = "";

  if (players.length === 0) {
    rosterList.classList.add("is-empty");
    rosterList.textContent = "Pro vybraný tým a sezónu nebyli nalezeni žádní hráči.";
    sendRosterButton.disabled = true;
    selectAllRosterButton.disabled = true;
    clearRosterButton.disabled = true;
    applyPreviousGameButton.disabled = true;
    updateServicePointsCheck();
    return;
  }

  rosterList.classList.remove("is-empty");
  const fragment = document.createDocumentFragment();

  players.forEach(player => {
    const label = document.createElement("label");
    label.className = "roster-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = player.playerCode;
    checkbox.checked = true;
    checkbox.dataset.playerName = player.fullName;

    const body = document.createElement("div");
    body.className = "roster-item-body";

    const text = document.createElement("span");
    text.className = "roster-item-label";
    text.textContent = formatPlayerLabel(player);

    const statsGrid = document.createElement("div");
    statsGrid.className = "player-stats-grid";

    [
      { key: "ZS1P", label: "TH+" },
      { key: "ZS1M", label: "TH-" },
      { key: "ZS2PP", label: "2b+" },
      { key: "ZS3P", label: "3b+" },
      { key: "ZPF", label: "PF" }
    ].forEach(stat => {
      const statLabel = document.createElement("label");
      statLabel.className = "player-stat-field";

      const statTitle = document.createElement("span");
      statTitle.textContent = stat.label;

      const statInput = document.createElement("input");
      statInput.type = "number";
      statInput.min = "0";
      statInput.step = "1";
      statInput.value = "0";
      statInput.dataset.statKey = stat.key;
      statInput.dataset.playerCode = player.playerCode;

      statLabel.appendChild(statTitle);
      statLabel.appendChild(statInput);
      statsGrid.appendChild(statLabel);
    });

    label.appendChild(checkbox);
    body.appendChild(text);
    body.appendChild(statsGrid);
    label.appendChild(body);
    fragment.appendChild(label);
  });

  rosterList.appendChild(fragment);
  sendRosterButton.disabled = false;
  selectAllRosterButton.disabled = false;
  clearRosterButton.disabled = false;
  applyPreviousGameButton.disabled = previousGames.length === 0;
  updateServicePointsCheck();
}

function renderRosterAdmin(players) {
  rosterAdminPlayers = players;
  rosterAdminList.innerHTML = "";

  if (players.length === 0) {
    rosterAdminList.classList.add("is-empty");
    rosterAdminList.textContent = "V databázi nejsou žádní hráči nebo nebyla načtena data.";
    saveRosterAdminButton.disabled = true;
    selectAllRosterAdminButton.disabled = true;
    clearRosterAdminButton.disabled = true;
    return;
  }

  rosterAdminList.classList.remove("is-empty");
  const fragment = document.createDocumentFragment();

  players.forEach(player => {
    const label = document.createElement("label");
    label.className = "roster-item roster-admin-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = player.playerCode;
    checkbox.checked = Boolean(player.assigned);
    checkbox.dataset.playerCode = player.playerCode;

    const body = document.createElement("div");
    body.className = "roster-item-body";

    const text = document.createElement("span");
    text.className = "roster-item-label";
    text.textContent = formatPlayerLabel(player);

    const meta = document.createElement("div");
    meta.className = "roster-admin-meta";

    const typeField = document.createElement("label");
    typeField.className = "roster-admin-field";
    const typeTitle = document.createElement("span");
    typeTitle.textContent = "Typ";
    const typeSelect = document.createElement("select");
    typeSelect.dataset.rosterAdminField = "assignmentType";
    rosterAssignmentOptions.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      if ((player.assignmentType || "regular") === option.value) {
        opt.selected = true;
      }
      typeSelect.appendChild(opt);
    });
    typeField.appendChild(typeTitle);
    typeField.appendChild(typeSelect);

    const validFromField = document.createElement("label");
    validFromField.className = "roster-admin-field";
    const validFromTitle = document.createElement("span");
    validFromTitle.textContent = "Platnost od";
    const validFromInput = document.createElement("input");
    validFromInput.type = "date";
    validFromInput.value = player.validFrom || "";
    validFromInput.dataset.rosterAdminField = "validFrom";
    validFromField.appendChild(validFromTitle);
    validFromField.appendChild(validFromInput);

    const validToField = document.createElement("label");
    validToField.className = "roster-admin-field";
    const validToTitle = document.createElement("span");
    validToTitle.textContent = "Platnost do";
    const validToInput = document.createElement("input");
    validToInput.type = "date";
    validToInput.value = player.validTo || "";
    validToInput.dataset.rosterAdminField = "validTo";
    validToField.appendChild(validToTitle);
    validToField.appendChild(validToInput);

    const sourceClubField = document.createElement("label");
    sourceClubField.className = "roster-admin-field roster-admin-field-wide";
    const sourceClubTitle = document.createElement("span");
    sourceClubTitle.textContent = "Mateřský klub";
    const sourceClubInput = document.createElement("input");
    sourceClubInput.type = "text";
    sourceClubInput.value = player.sourceClubName || "";
    sourceClubInput.placeholder = "Např. BCM Olomouc";
    sourceClubInput.dataset.rosterAdminField = "sourceClubName";
    sourceClubField.appendChild(sourceClubTitle);
    sourceClubField.appendChild(sourceClubInput);

    meta.appendChild(typeField);
    meta.appendChild(validFromField);
    meta.appendChild(validToField);
    meta.appendChild(sourceClubField);

    body.appendChild(text);
    body.appendChild(meta);

    const updateMetaVisibility = () => {
      const assigned = checkbox.checked;
      meta.querySelectorAll("input, select").forEach(input => {
        input.disabled = !assigned;
      });
      sourceClubField.hidden = !assigned || typeSelect.value !== "hosting_in";
      label.classList.toggle("is-unassigned", !assigned);
    };

    checkbox.addEventListener("change", updateMetaVisibility);
    typeSelect.addEventListener("change", updateMetaVisibility);
    updateMetaVisibility();

    label.appendChild(checkbox);
    label.appendChild(body);
    fragment.appendChild(label);
  });

  rosterAdminList.appendChild(fragment);
  saveRosterAdminButton.disabled = false;
  selectAllRosterAdminButton.disabled = false;
  clearRosterAdminButton.disabled = false;
}

function getAssignedRosterAdminCount(players) {
  return players.filter(player => Boolean(player.assigned)).length;
}

function applyRosterAdminPlayerPreset(playerCode, preset = {}) {
  const checkbox = rosterAdminList.querySelector(`.roster-admin-item input[type="checkbox"][value="${playerCode}"]`);
  if (!checkbox) {
    return false;
  }

  checkbox.checked = true;
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));

  const row = checkbox.closest(".roster-admin-item");
  if (!row) {
    return false;
  }

  const typeSelect = row.querySelector('[data-roster-admin-field="assignmentType"]');
  const sourceClubInput = row.querySelector('[data-roster-admin-field="sourceClubName"]');
  const validFromInput = row.querySelector('[data-roster-admin-field="validFrom"]');
  const validToInput = row.querySelector('[data-roster-admin-field="validTo"]');

  if (typeSelect) {
    typeSelect.value = preset.assignmentType || "hosting_in";
    typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  if (sourceClubInput && preset.sourceClubName) {
    sourceClubInput.value = preset.sourceClubName;
  }
  if (validFromInput && preset.validFrom) {
    validFromInput.value = preset.validFrom;
  }
  if (validToInput && preset.validTo) {
    validToInput.value = preset.validTo;
  }

  row.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}

function getRosterAdminAssignments() {
  return [...rosterAdminList.querySelectorAll(".roster-admin-item")]
    .map(item => {
      const checkbox = item.querySelector('input[type="checkbox"]');
      if (!checkbox?.checked) {
        return null;
      }

      return {
        playerCode: checkbox.value,
        assignmentType: item.querySelector('[data-roster-admin-field="assignmentType"]')?.value || "regular",
        validFrom: item.querySelector('[data-roster-admin-field="validFrom"]')?.value || "",
        validTo: item.querySelector('[data-roster-admin-field="validTo"]')?.value || "",
        sourceClubName: item.querySelector('[data-roster-admin-field="sourceClubName"]')?.value?.trim() || "",
        notes: ""
      };
    })
    .filter(Boolean);
}

function renderServiceSyncDiffs(diffs) {
  serviceSyncDiffs = diffs;
  serviceSyncList.innerHTML = "";

  if (diffs.length === 0) {
    serviceSyncList.classList.add("is-empty");
    serviceSyncList.textContent = "Nebyly nalezeny žádné rozdíly ani hráči.";
    createMissingServicePlayersButton.disabled = true;
    applyServiceSyncButton.disabled = true;
    selectAllServiceSyncButton.disabled = true;
    clearServiceSyncButton.disabled = true;
    return;
  }

  serviceSyncList.classList.remove("is-empty");
  const fragment = document.createDocumentFragment();

  diffs.forEach(diff => {
    const row = document.createElement("label");
    row.className = `sync-item is-${diff.status}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = diff.playerCode;
    checkbox.checked = Boolean(diff.actionable);
    checkbox.disabled = !diff.actionable;

    const text = document.createElement("div");
    text.className = "sync-text";
    const title = document.createElement("strong");
    title.textContent = formatPlayerLabel(diff);
    title.textContent = normalizeDisplayText(title.textContent);

    const subtitle = document.createElement("small");
    subtitle.textContent = diff.description;
    text.appendChild(title);
    text.appendChild(subtitle);

    const badge = document.createElement("span");
    badge.className = `sync-badge is-${diff.status}`;
    badge.textContent = diff.badge;

    row.appendChild(checkbox);
    row.appendChild(text);
    row.appendChild(badge);
    fragment.appendChild(row);
  });

  serviceSyncList.appendChild(fragment);
  createMissingServicePlayersButton.disabled = !diffs.some(diff => diff.status === "missing" || diff.status === "archived");
  applyServiceSyncButton.disabled = !diffs.some(diff => diff.actionable);
  selectAllServiceSyncButton.disabled = false;
  clearServiceSyncButton.disabled = false;
}

function renderPreviousGames(games) {
  previousGames = games;
  previousGameSelect.innerHTML = "";

  if (games.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Žádné předchozí utkání v DB";
    previousGameSelect.appendChild(option);
    previousGameSelect.disabled = true;
    applyPreviousGameButton.disabled = true;
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Vyber předchozí utkání";
  previousGameSelect.appendChild(placeholder);

  games.forEach(game => {
    const option = document.createElement("option");
    option.value = game.gameId;
    option.textContent = game.label;
    previousGameSelect.appendChild(option);
  });

  previousGameSelect.disabled = false;
  applyPreviousGameButton.disabled = false;
}

function updateGameIdsFieldFromSelection() {
  const selectedIds = [...gameSelectionList.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
  isSyncingGameIdsField = true;
  gameIdsField.value = selectedIds.join("\n");
  isSyncingGameIdsField = false;
}

function renderGameSelectionList(games, emptyMessage = "Nejsou k dispozici žádná utkání.") {
  availableGames = games;
  gameSelectionList.innerHTML = "";

  if (games.length === 0) {
    gameSelectionList.classList.add("is-empty");
    gameSelectionList.textContent = emptyMessage;
    selectAllGamesButton.disabled = true;
    clearGamesButton.disabled = true;
    return;
  }

  gameSelectionList.classList.remove("is-empty");
  const fragment = document.createDocumentFragment();

  games.forEach(game => {
    const row = document.createElement("label");
    row.className = `sync-item ${game.alreadyImported ? "is-match" : "is-add"}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = game.gameId;
    checkbox.checked = game.servicePlayersCount === 0 ? false : true;
    checkbox.addEventListener("change", updateGameIdsFieldFromSelection);

    const text = document.createElement("div");
    text.className = "sync-text";

    const title = document.createElement("strong");
    const titleParts = [game.scheduledAtLabel];
    if (game.scoreLabel) {
      titleParts.push(game.scoreLabel);
    }
    if (game.opponentName) {
      titleParts.push(game.opponentName);
    }
    title.textContent = titleParts.length > 0 ? titleParts.join(" | ") : `Utkání ${game.gameId}`;

    const subtitle = document.createElement("small");
    const subtitleParts = [`ID: ${game.gameId}`];
    if (typeof game.isHome === "boolean") {
      subtitleParts.push(game.isHome ? "domácí" : "venku");
    }
    if (typeof game.servicePlayersCount === "number") {
      subtitleParts.push(`service: ${game.servicePlayersCount} hrÃ¡ÄÅ¯`);
    }
    if (game.alreadyImported) {
      subtitleParts.push("už v DB");
    }
    if (game.loadError) {
      subtitleParts.push("detail se nepodařilo načíst");
    }
    subtitle.textContent = subtitleParts.join(" | ");
    subtitle.textContent = normalizeDisplayText(subtitle.textContent);

    text.appendChild(title);
    text.appendChild(subtitle);

    const badge = document.createElement("span");
    badge.className = `sync-badge ${game.alreadyImported ? "is-match" : "is-add"}`;
    badge.textContent = game.alreadyImported ? "v DB" : "k importu";

    row.appendChild(checkbox);
    row.appendChild(text);
    row.appendChild(badge);
    fragment.appendChild(row);
  });

  gameSelectionList.appendChild(fragment);
  selectAllGamesButton.disabled = false;
  clearGamesButton.disabled = false;
  updateGameIdsFieldFromSelection();
}

function getSelectedImportGameIds() {
  if (availableGames.length === 0) {
    return String(gameIdsField.value || "")
      .split(/[\s,;]+/)
      .map(value => value.trim())
      .filter(Boolean);
  }

  return [...gameSelectionList.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
}

function getSelectedPlayersForService() {
  return [...rosterList.querySelectorAll('.roster-item input[type="checkbox"]:checked')].map(input => {
    const playerCode = input.value;
    const row = input.closest(".roster-item");
    const stats = {};

    row.querySelectorAll(".player-stats-grid input[data-stat-key]").forEach(statInput => {
      stats[statInput.dataset.statKey] = normalizeIntegerValue(statInput.value);
    });

    return {
      playerCode,
      stats
    };
  });
}

function formatGameSummary(game) {
  if (!game) {
    return "Po zadání ID utkání se zde zobrazí datum, skóre a soupeř z lokální DB.";
  }

  const parts = [];
  if (game.scheduledAtLabel) {
    parts.push(game.scheduledAtLabel);
  }
  if (game.scoreLabel) {
    parts.push(`Skóre: ${game.scoreLabel}`);
  }
  parts.push(`ID utkání: ${game.externalId}`);
  parts.push(`Soupeř: ${game.opponentName || "-"}`);
  return parts.join(" | ");
}

function getEnteredUiPoints() {
  if (!rosterList) {
    return 0;
  }

  let total = 0;
  rosterList.querySelectorAll(".roster-item").forEach(item => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    if (!checkbox || !checkbox.checked) {
      return;
    }

    const ftMade = toInteger(item.querySelector('input[data-stat-key="ZS1P"]')?.value);
    const fg2Made = toInteger(item.querySelector('input[data-stat-key="ZS2PP"]')?.value);
    const fg3Made = toInteger(item.querySelector('input[data-stat-key="ZS3P"]')?.value);
    total += ftMade + (2 * fg2Made) + (3 * fg3Made);
  });

  return total;
}

function updateServicePointsCheck() {
  if (!servicePointsCheck) {
    return;
  }

  servicePointsCheck.classList.remove("is-ok", "is-warning");

  if (!currentServiceGame) {
    servicePointsCheck.textContent = "Po načtení utkání se zde zobrazí kontrola součtu bodů podle zadaných statistik.";
    return;
  }

  if (!serviceStatsEnabledCheckbox?.checked) {
    servicePointsCheck.textContent = "Pro kontrolu součtu bodů zapni sekci Zadat i statistiky.";
    return;
  }

  if (currentServiceGame.ourScore == null) {
    servicePointsCheck.textContent = "U tohoto utkání není k dispozici skóre našeho týmu, takže součet bodů nejde zkontrolovat.";
    return;
  }

  const enteredPoints = getEnteredUiPoints();
  const expectedPoints = Number(currentServiceGame.ourScore);
  const difference = enteredPoints - expectedPoints;

  if (difference === 0) {
    servicePointsCheck.classList.add("is-ok");
    servicePointsCheck.textContent = `Součet bodů sedí: ${enteredPoints} zadaných bodů = ${expectedPoints} bodů týmu v utkání.`;
    return;
  }

  servicePointsCheck.classList.add("is-warning");
  servicePointsCheck.textContent = `Součet bodů nesedí: zadáno ${enteredPoints}, utkání má ${expectedPoints}. Rozdíl: ${difference > 0 ? "+" : ""}${difference}.`;
}

async function loadServiceGameSummary() {
  const gameId = serviceGameIdField.value.trim();
  if (!gameId) {
    currentServiceGame = null;
    serviceGameSummary.textContent = formatGameSummary(null);
    updateServicePointsCheck();
    return;
  }

  serviceGameSummary.textContent = "Načítám detail utkání z lokální DB...";

  try {
    const response = await fetch("/api/game-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teamCode: teamSelect.value,
        seasonCode: seasonSelect.value,
        gameId
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Nepodařilo se načíst detail utkání.");
    }

    currentServiceGame = data.game || null;
    serviceGameSummary.textContent = formatGameSummary(currentServiceGame);
    updateServicePointsCheck();
  } catch (error) {
    currentServiceGame = null;
    serviceGameSummary.textContent = `Utkání ${gameId} nebylo v lokální DB nalezeno.`;
    updateServicePointsCheck();
  }
}

async function reloadServiceRosterContext() {
  const payload = {
    teamCode: teamSelect.value,
    seasonCode: seasonSelect.value
  };

  const response = await fetch("/api/team-roster", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Nepodařilo se načíst soupisku.");
  }

  renderRoster(data.players || []);
  renderPreviousGames(data.previousGames || []);
  return data;
}

function setRosterSelection(checked) {
  rosterList.querySelectorAll('.roster-item input[type="checkbox"]').forEach(input => {
    input.checked = checked;
  });
  updateServicePointsCheck();
}

function updateServiceStatsVisibility() {
  if (!rosterList || !serviceStatsEnabledCheckbox) {
    return;
  }

  rosterList.classList.toggle("show-stats", Boolean(serviceStatsEnabledCheckbox.checked));
  updateServicePointsCheck();
}

function setRosterAdminSelection(checked) {
  rosterAdminList.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = checked;
  });
}

function getSelectedRosterAdminPlayerCodes() {
  return [...rosterAdminList.querySelectorAll('.roster-admin-item input[type="checkbox"]:checked')].map(input => input.value);
}

function applyPreviousGameSelection(gameId) {
  const selectedGame = previousGames.find(game => game.gameId === gameId);
  if (!selectedGame) {
    return false;
  }

  const selectedCodes = new Set(selectedGame.playerCodes || []);
  rosterList.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = selectedCodes.has(input.value);
  });

  rosterList.querySelectorAll(".player-stats-grid input[data-stat-key]").forEach(input => {
    const playerCode = input.dataset.playerCode;
    const statKey = input.dataset.statKey;
    const playerStats = selectedGame.playerStatsByCode?.[playerCode];
    const value = playerStats && Object.prototype.hasOwnProperty.call(playerStats, statKey)
      ? playerStats[statKey]
      : 0;
    input.value = String(value);
  });

  updateServicePointsCheck();
  return true;
}

function getSelectedServiceSyncChanges() {
  const selectedCodes = new Set(
    [...serviceSyncList.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value)
  );

  return serviceSyncDiffs.filter(diff => diff.actionable && selectedCodes.has(diff.playerCode));
}

function getMissingServicePlayers() {
  return serviceSyncDiffs.filter(diff => diff.status === "missing" || diff.status === "archived");
}

function setServiceSyncSelection(checked) {
  serviceSyncList.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(input => {
    input.checked = checked;
  });
}

loadServicePlayerButton.addEventListener("click", async () => {
  const playerCode = servicePlayerIdField.value.trim();
  if (!playerCode) {
    rosterAdminStatusText.textContent = "Vyplň player_id ze service.";
    return;
  }

  if (!sharedServiceSessionIdField.value.trim()) {
    rosterAdminStatusText.textContent = "Vyplň PHPSESSID.";
    return;
  }

  setRosterAdminLoadingState(true);
  rosterAdminStatusText.textContent = "Načítám hráče ze service a zakládám ho lokálně...";

  try {
    const response = await fetch("/api/service-player-create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teamCode: teamSelect.value,
        seasonCode: seasonSelect.value,
        serviceTeamId: serviceTeamIdField.value.trim(),
        phpSessionId: sharedServiceSessionIdField.value.trim(),
        playerCode,
        fallbackFullName: servicePlayerNameFallbackField.value.trim(),
        fallbackBirthYear: servicePlayerBirthYearFallbackField.value.trim()
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Nepodařilo se načíst hráče ze service.");
    }

    const reloadResponse = await fetch("/api/roster-admin-load", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teamCode: teamSelect.value,
        seasonCode: seasonSelect.value
      })
    });

    const reloadData = await reloadResponse.json();
    if (!reloadResponse.ok) {
      throw new Error(reloadData.error || "Hráč byl založen, ale nepodařilo se obnovit soupisku.");
    }

    renderRosterAdmin(reloadData.players || []);
    applyRosterAdminPlayerPreset(playerCode, {
      assignmentType: data.player?.suggestedAssignmentType || "hosting_in",
      sourceClubName: data.player?.sourceClubName || ""
    });
    rosterAdminStatusText.textContent = `Hráč ${data.player?.fullName || playerCode} byl načten ze service a připraven k hostování na soupisce.`;
    rosterAdminOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    rosterAdminStatusText.textContent = "Načtení hráče ze service selhalo.";
    rosterAdminOutput.textContent = error.message;
  } finally {
    setRosterAdminLoadingState(false);
  }
});

importHostedPlayersButton.addEventListener("click", async () => {
  const { serviceTeamName } = getSelectedTeamMeta();
  if (!sharedServiceSessionIdField.value.trim()) {
    rosterAdminStatusText.textContent = "Vyplň PHPSESSID.";
    return;
  }

  setRosterAdminLoadingState(true);
  rosterAdminStatusText.textContent = "Importuji hostující hráče ze service na lokální soupisku...";

  try {
    const response = await fetch("/api/roster-admin-import-hosting", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teamCode: teamSelect.value,
        seasonCode: seasonSelect.value,
        phpSessionId: sharedServiceSessionIdField.value.trim(),
        serviceTeamName
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Nepodařilo se importovat hostující hráče.");
    }

    renderRosterAdmin(data.players || []);
    rosterAdminStatusText.textContent = `Hostující hráči importováni: ${data.importedCount || 0}. Přeskočeno: ${data.skippedCount || 0}.`;
    rosterAdminOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    rosterAdminStatusText.textContent = "Hromadný import hostujících hráčů selhal.";
    rosterAdminOutput.textContent = error.message;
  } finally {
    setRosterAdminLoadingState(false);
  }
});

importForm.addEventListener("submit", async event => {
  event.preventDefault();

  const selectedGameIds = getSelectedImportGameIds();
  if (selectedGameIds.length === 0) {
    statusText.textContent = "Vyber alespoň jedno utkání k importu.";
    return;
  }

  const payload = {
    teamCode: teamSelect.value,
    seasonCode: seasonSelect.value,
    gameIds: selectedGameIds.join("\n")
  };

  setImportLoadingState(true);
  statusText.textContent = "Importuji data z CBF přímo do databáze...";

  try {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Import se nepodařil.");
    }

    setResult(data);
    const processedCount = data.importResult?.games_processed ?? 0;
    const selectedCount = selectedGameIds.length;
    const loadedCount = availableGames.length;
    statusText.textContent = loadedCount > 0
      ? `Hotovo. Importováno vybraných utkání: ${processedCount} z ${selectedCount}. V načteném seznamu bylo celkem ${loadedCount} utkání.`
      : `Hotovo. Importováno vybraných utkání: ${processedCount}.`;
  } catch (error) {
    resultCard.classList.remove("is-empty");
    processedGames.textContent = "-";
    importedPlayers.textContent = "-";
    importedStats.textContent = "-";
    sqlPreview.textContent = "-";
    missingPreview.textContent = "-";
    stdoutPreview.textContent = error.message;
    statusText.textContent = "Import selhal.";
  } finally {
    setImportLoadingState(false);
  }
});

rosterAdminForm.addEventListener("submit", async event => {
  event.preventDefault();

  const payload = {
    teamCode: teamSelect.value,
    seasonCode: seasonSelect.value,
    playerCodes: getSelectedRosterAdminPlayerCodes(),
    assignments: getRosterAdminAssignments()
  };

  setRosterAdminLoadingState(true);
  rosterAdminStatusText.textContent = "Ukládám soupisku týmu do lokální DB...";

  try {
    const response = await fetch("/api/roster-admin-save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Nepodařilo se uložit soupisku.");
    }

    rosterAdminStatusText.textContent = `Hotovo. Na soupisce je ${data.assignedCount || 0} hráčů. Celkem v DB: ${(data.players || []).length}.`;
    rosterAdminOutput.textContent = JSON.stringify(data, null, 2);
    renderRosterAdmin(data.players || []);
  } catch (error) {
    rosterAdminStatusText.textContent = "Uložení soupisky selhalo.";
    rosterAdminOutput.textContent = error.message;
  } finally {
    setRosterAdminLoadingState(false);
  }
});

serviceSyncForm.addEventListener("submit", async event => {
  event.preventDefault();

  const selectedDiffs = getSelectedServiceSyncChanges();
  if (selectedDiffs.length === 0) {
    serviceSyncStatusText.textContent = "Vyber alespoň jednu změnu k promítnutí do lokální DB.";
    return;
  }

  const payload = {
    teamCode: teamSelect.value,
    seasonCode: seasonSelect.value,
    serviceTeamId: serviceTeamIdField.value.trim(),
    phpSessionId: sharedServiceSessionIdField.value.trim(),
    changes: selectedDiffs.map(diff => ({
      playerCode: diff.playerCode,
      operation: diff.operation
    }))
  };

  setServiceSyncLoadingState(true);
  serviceSyncStatusText.textContent = "Promítám vybrané změny do lokální DB...";

  try {
    const response = await fetch("/api/service-sync-apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Nepodařilo se promítnout změny.");
    }

    renderServiceSyncDiffs(data.diffs || []);
    serviceSyncStatusText.textContent = `Hotovo. Použito změn: ${data.appliedCount || 0}.`;
    serviceSyncOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    serviceSyncStatusText.textContent = "Promítnutí změn selhalo.";
    serviceSyncOutput.textContent = error.message;
  } finally {
    setServiceSyncLoadingState(false);
  }
});

loadGamesButton.addEventListener("click", async () => {
  const payload = {
    teamCode: teamSelect.value,
    seasonCode: seasonSelect.value,
    serviceTeamId: serviceTeamIdField.value.trim(),
    phpSessionId: sharedServiceSessionIdField.value.trim(),
    onlyMissingGames: onlyMissingGamesCheckbox.checked
  };

  loadGamesButton.disabled = true;
  teamSelect.disabled = true;
  seasonSelect.disabled = true;
  onlyMissingGamesCheckbox.disabled = true;
  statusText.textContent = "Načítám seznam utkání z cz.basketball...";

  try {
    const response = await fetch("/api/team-games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Nepodařilo se načíst utkání.");
    }

    renderGameSelectionList(data.games || [], "Pro vybraný tým nebyla nalezena žádná utkání.");
    if (data.onlyMissingGames) {
      statusText.textContent = `Načteno nových utkání: ${(data.gameIds || []).length}. Přeskočeno už importovaných: ${data.skippedImportedCount || 0}.`;
    } else {
      statusText.textContent = `Načteno utkání: ${(data.gameIds || []).length}.`;
    }
  } catch (error) {
    renderGameSelectionList([], "Načtení utkání selhalo.");
    statusText.textContent = "Načtení utkání selhalo.";
    stdoutPreview.textContent = error.message;
  } finally {
    loadGamesButton.disabled = false;
    teamSelect.disabled = false;
    seasonSelect.disabled = false;
    onlyMissingGamesCheckbox.disabled = false;
  }
});

loadRosterAdminButton.addEventListener("click", async () => {
  const payload = {
    teamCode: teamSelect.value,
    seasonCode: seasonSelect.value
  };

  setRosterAdminLoadingState(true);
  rosterAdminStatusText.textContent = "Načítám hráče a aktuální soupisku týmu...";

  try {
    const response = await fetch("/api/roster-admin-load", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Nepodařilo se načíst správu soupisky.");
    }

    renderRosterAdmin(data.players || []);
    rosterAdminStatusText.textContent = `Načteno hráčů: ${(data.players || []).length}. Na aktuální soupisce: ${getAssignedRosterAdminCount(data.players || [])}.`;
    rosterAdminOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    renderRosterAdmin([]);
    rosterAdminStatusText.textContent = "Načtení správy soupisky selhalo.";
    rosterAdminOutput.textContent = error.message;
  } finally {
    setRosterAdminLoadingState(false);
  }
});

loadServiceSyncButton.addEventListener("click", async () => {
  const payload = {
    teamCode: teamSelect.value,
    seasonCode: seasonSelect.value,
    serviceTeamId: serviceTeamIdField.value.trim(),
    phpSessionId: sharedServiceSessionIdField.value.trim()
  };

  if (!payload.serviceTeamId) {
    serviceSyncStatusText.textContent = "Vyplň service team ID.";
    return;
  }

  if (!payload.phpSessionId) {
    serviceSyncStatusText.textContent = "Vyplň PHPSESSID.";
    return;
  }

  setServiceSyncLoadingState(true);
  serviceSyncStatusText.textContent = "Načítám soupisku ze service a porovnávám s lokální DB...";

  try {
    const response = await fetch("/api/service-sync-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Nepodařilo se načíst soupisku ze service.");
    }

    renderServiceSyncDiffs(data.diffs || []);
    serviceSyncStatusText.textContent = `Načteno rozdílů: ${(data.diffs || []).length}.`;
    serviceSyncOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    renderServiceSyncDiffs([]);
    serviceSyncStatusText.textContent = "Načtení soupisky ze service selhalo.";
    serviceSyncOutput.textContent = error.message;
  } finally {
    setServiceSyncLoadingState(false);
  }
});

loadRosterButton.addEventListener("click", async () => {
  const payload = {
    teamCode: teamSelect.value,
    seasonCode: seasonSelect.value
  };

  setServiceLoadingState(true);
  serviceStatusText.textContent = "Načítám soupisku týmu z databáze...";

  try {
    await loadServiceGameSummary();
    const data = await reloadServiceRosterContext();
    serviceStatusText.textContent = `Načteno hráčů: ${(data.players || []).length}.`;
    serviceOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    renderRoster([]);
    renderPreviousGames([]);
    serviceStatusText.textContent = "Načtení soupisky selhalo.";
    serviceOutput.textContent = error.message;
  } finally {
    setServiceLoadingState(false);
  }
});

serviceForm.addEventListener("submit", async event => {
  event.preventDefault();

  const selectedPlayers = getSelectedPlayersForService();
  if (selectedPlayers.length === 0) {
    serviceStatusText.textContent = "Vyber alespoň jednoho hráče.";
    return;
  }

  const payload = {
    teamCode: teamSelect.value,
    serviceTeamId: serviceTeamIdField.value.trim(),
    seasonCode: seasonSelect.value,
    gameId: serviceGameIdField.value.trim(),
    phpSessionId: sharedServiceSessionIdField.value.trim(),
    includeStats: Boolean(serviceStatsEnabledCheckbox?.checked),
    players: selectedPlayers
  };

  if (!payload.gameId) {
    serviceStatusText.textContent = "Vyplň ID utkání v service.cbf.cz.";
    return;
  }

  if (!payload.phpSessionId) {
    serviceStatusText.textContent = "Vyplň PHPSESSID.";
    return;
  }

  setServiceLoadingState(true);
  serviceStatusText.textContent = "Odesílám soupisku do service.cbf.cz...";

  try {
    const response = await fetch("/api/service-roster-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Odeslání soupisky selhalo.");
    }

    serviceStatusText.textContent = `Hotovo. Uloženo hráčů: ${data.savedCount || 0}, chyb: ${data.failedCount || 0}.`;
    serviceOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    serviceStatusText.textContent = "Odeslání soupisky selhalo.";
    serviceOutput.textContent = error.message;
  } finally {
    setServiceLoadingState(false);
  }
});

importServiceGameButton.addEventListener("click", async () => {
  const gameId = serviceGameIdField.value.trim();
  if (!gameId) {
    serviceStatusText.textContent = "Vyplň ID utkání, které chceš importovat do lokální DB.";
    return;
  }

  setServiceLoadingState(true);
  serviceStatusText.textContent = "Importuji toto utkání do lokální DB...";

  try {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teamCode: teamSelect.value,
        seasonCode: seasonSelect.value,
        gameIds: gameId
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Lokální import utkání selhal.");
    }

    setResult(data);
    serviceStatusText.textContent = `Lokální import hotov pro utkání ${gameId}.`;
    serviceOutput.textContent = JSON.stringify(data.importResult || data, null, 2);
    await loadServiceGameSummary();
  } catch (error) {
    serviceStatusText.textContent = "Lokální import utkání selhal.";
    serviceOutput.textContent = error.message;
  } finally {
    setServiceLoadingState(false);
  }
});

importServiceStatsButton.addEventListener("click", async () => {
  const gameId = serviceGameIdField.value.trim();
  if (!gameId) {
    serviceStatusText.textContent = "Vyplň ID utkání, jehož statistiky chceš stáhnout ze service.";
    return;
  }

  if (!sharedServiceSessionIdField.value.trim()) {
    serviceStatusText.textContent = "Vyplň PHPSESSID.";
    return;
  }

  setServiceLoadingState(true);
  serviceStatusText.textContent = "Importuji statistiky ze service do lokální DB...";

  try {
    const response = await fetch("/api/service-game-import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        teamCode: teamSelect.value,
        serviceTeamId: serviceTeamIdField.value.trim(),
        seasonCode: seasonSelect.value,
        gameId,
        phpSessionId: sharedServiceSessionIdField.value.trim()
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Import statistik ze service selhal.");
    }

    serviceStatusText.textContent = `Ze service importováno hráčů: ${data.importedPlayers || 0}, statistik: ${data.importedStats || 0}.`;
    serviceOutput.textContent = JSON.stringify(data, null, 2);

    setResult({
      importResult: {
        games_processed: 1,
        games: [
          {
            game_id: gameId,
            our_team: data.teamLabel || "",
            opponent: data.game?.opponentName || "",
            imported_players: data.importedPlayers || 0,
            imported_stats: data.importedStats || 0,
            missing_player_codes: data.missingPlayerCodes || []
          }
        ]
      },
      stdout: "Import statistik byl proveden ze service.cbf.cz."
    });

    await reloadServiceRosterContext();
    previousGameSelect.value = gameId;
    serviceStatsEnabledCheckbox.checked = true;
    updateServiceStatsVisibility();
    applyPreviousGameSelection(gameId);

    await loadServiceGameSummary();
  } catch (error) {
    serviceStatusText.textContent = "Import statistik ze service selhal.";
    serviceOutput.textContent = error.message;
  } finally {
    setServiceLoadingState(false);
  }
});

selectAllRosterButton.addEventListener("click", () => {
  setRosterSelection(true);
});

clearRosterButton.addEventListener("click", () => {
  setRosterSelection(false);
});

serviceStatsEnabledCheckbox.addEventListener("change", () => {
  updateServiceStatsVisibility();
});

rosterList.addEventListener("input", event => {
  if (event.target instanceof HTMLInputElement && event.target.dataset.statKey) {
    event.target.value = normalizeIntegerValue(event.target.value);
    updateServicePointsCheck();
  }
});

rosterList.addEventListener("change", event => {
  if (event.target instanceof HTMLInputElement) {
    updateServicePointsCheck();
  }
});

selectAllGamesButton.addEventListener("click", () => {
  gameSelectionList.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = true;
  });
  updateGameIdsFieldFromSelection();
});

clearGamesButton.addEventListener("click", () => {
  gameSelectionList.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = false;
  });
  updateGameIdsFieldFromSelection();
});

clearSharedSessionButton.addEventListener("click", () => {
  sharedServiceSessionIdField.value = "";
  persistSharedServiceSession();
  statusText.textContent = "Sdílená PHPSESSID byla vymazána.";
});

selectAllRosterAdminButton.addEventListener("click", () => {
  setRosterAdminSelection(true);
});

clearRosterAdminButton.addEventListener("click", () => {
  setRosterAdminSelection(false);
});

selectAllServiceSyncButton.addEventListener("click", () => {
  setServiceSyncSelection(true);
});

clearServiceSyncButton.addEventListener("click", () => {
  setServiceSyncSelection(false);
});

createMissingServicePlayersButton.addEventListener("click", async () => {
  const missingPlayers = getMissingServicePlayers();
  if (missingPlayers.length === 0) {
    serviceSyncStatusText.textContent = "Nejsou tu žádní chybějící hráči k založení.";
    return;
  }

  const payload = {
    teamCode: teamSelect.value,
    seasonCode: seasonSelect.value,
    serviceTeamId: serviceTeamIdField.value.trim(),
    phpSessionId: sharedServiceSessionIdField.value.trim()
  };

  if (!payload.serviceTeamId) {
    serviceSyncStatusText.textContent = "Vyplň service team ID.";
    return;
  }

  if (!payload.phpSessionId) {
    serviceSyncStatusText.textContent = "Vyplň PHPSESSID.";
    return;
  }

  setServiceSyncLoadingState(true);
  serviceSyncStatusText.textContent = "Zakládám chybějící hráče ze service do lokální DB...";

  try {
    const response = await fetch("/api/service-sync-create-players", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Nepodařilo se založit chybějící hráče.");
    }

    renderServiceSyncDiffs(data.diffs || []);
    serviceSyncStatusText.textContent = `Hotovo. Založeno hráčů: ${data.createdCount || 0}.`;
    serviceSyncOutput.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    serviceSyncStatusText.textContent = "Zakládání chybějících hráčů selhalo.";
    serviceSyncOutput.textContent = error.message;
  } finally {
    setServiceSyncLoadingState(false);
  }
});

applyPreviousGameButton.addEventListener("click", () => {
  const gameId = previousGameSelect.value;
  if (!gameId) {
    serviceStatusText.textContent = "Vyber utkání, ze kterého chceš převzít výběr.";
    return;
  }

  const applied = applyPreviousGameSelection(gameId);
  if (applied) {
    serviceStatusText.textContent = "Výběr hráčů byl předvyplněn z předchozího utkání.";
  }
});

teamSelect.addEventListener("change", () => {
  updateSectionContexts();
  renderGameSelectionList([], "Po změně týmu načti utkání znovu.");
  gameIdsField.value = "";
});
seasonSelect.addEventListener("change", () => {
  updateSectionContexts();
  renderGameSelectionList([], "Po změně sezóny načti utkání znovu.");
  gameIdsField.value = "";
});
serviceGameIdField.addEventListener("change", () => {
  loadServiceGameSummary();
});
gameIdsField.addEventListener("input", () => {
  if (isSyncingGameIdsField || availableGames.length === 0) {
    return;
  }

  availableGames = [];
  gameSelectionList.innerHTML = "";
  gameSelectionList.classList.add("is-empty");
  gameSelectionList.textContent = "Používáš ručně zadaná ID utkání. Pro znovunačtení detailu použij tlačítko Načíst utkání týmu.";
  selectAllGamesButton.disabled = true;
  clearGamesButton.disabled = true;
});
sharedServiceSessionIdField.addEventListener("change", persistSharedServiceSession);
sharedServiceSessionIdField.addEventListener("input", persistSharedServiceSession);

bindPanelToggle(toggleGamesPanelButton, gamesPanel);
bindPanelToggle(toggleRosterAdminPanelButton, rosterAdminPanel);
bindPanelToggle(toggleServiceSyncPanelButton, serviceSyncPanel);
bindPanelToggle(toggleRosterPanelButton, rosterPanel);

populateTeams();
populateSeasons();
loadSharedServiceSession();
updateSectionContexts();
serviceGameSummary.textContent = formatGameSummary(null);
updateServicePointsCheck();
renderGameSelectionList([], "Nejprve načti utkání týmu.");
renderRoster([]);
renderPreviousGames([]);
renderRosterAdmin([]);
renderServiceSyncDiffs([]);
updateServiceStatsVisibility();
