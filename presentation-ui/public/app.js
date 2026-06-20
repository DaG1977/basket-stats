const seasonSelect = document.getElementById("season-select");
const calendarYearInput = document.getElementById("calendar-year-input");
const statusCard = document.getElementById("status-card");
const teamsSummary = document.getElementById("teams-summary");
const teamsList = document.getElementById("teams-list");
const teamSummaryText = document.getElementById("team-summary-text");
const teamSummary = document.getElementById("team-summary");
const playersSummary = document.getElementById("players-summary");
const playersTableWrap = document.getElementById("players-table-wrap");
const gamesSummary = document.getElementById("games-summary");
const gamesList = document.getElementById("games-list");
const gameDetailSummary = document.getElementById("game-detail-summary");
const gameDetail = document.getElementById("game-detail");

const state = {
  seasons: [],
  overview: [],
  selectedTeamSeasonId: null,
  selectedGameId: null,
  teamDetail: null
};

function setStatus(message, kind = "neutral") {
  statusCard.textContent = message;
  statusCard.className = `status-card ${kind}`;
}

function formatDateTime(value) {
  if (!value) {
    return "Bez termínu";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

function renderSeasons() {
  seasonSelect.innerHTML = state.seasons
    .map(season => `<option value="${escapeHtml(season.code)}">${escapeHtml(season.name)}</option>`)
    .join("");

  if (state.seasons[0]) {
    seasonSelect.value = state.seasons[0].code;
    const yearMatch = String(state.seasons[0].code).match(/^(\d{4})/);
    calendarYearInput.value = yearMatch ? yearMatch[1] : new Date().getFullYear();
  }
}

function renderOverview() {
  teamsSummary.textContent = `${state.overview.length} týmů v sezóně`;
  if (!state.overview.length) {
    teamsList.innerHTML = `<div class="empty-state">Pro zvolenou sezónu zatím nejsou dostupná data.</div>`;
    return;
  }

  teamsList.innerHTML = state.overview
    .map(item => `
      <button class="team-card${item.id === state.selectedTeamSeasonId ? " is-active" : ""}" data-team-season-id="${item.id}">
        <strong>${escapeHtml(item.teamName)}</strong>
        <span>${escapeHtml(item.category || "Bez kategorie")}</span>
        <small>${item.rosterCount} hráčů • ${item.gameCount} utkání</small>
      </button>
    `)
    .join("");

  for (const button of teamsList.querySelectorAll("[data-team-season-id]")) {
    button.addEventListener("click", () => {
      void selectTeamSeason(button.dataset.teamSeasonId);
    });
  }
}

function renderTeamDetail() {
  const detail = state.teamDetail;
  if (!detail) {
    teamSummaryText.textContent = "Vyber tým vlevo.";
    teamSummary.className = "stat-grid empty-state";
    teamSummary.textContent = "Zatím není vybraný žádný tým.";
    playersSummary.textContent = "Vyber tým.";
    playersTableWrap.className = "table-wrap empty-state";
    playersTableWrap.textContent = "Zatím nic k zobrazení.";
    gamesSummary.textContent = "Vyber tým.";
    gamesList.className = "stack-list empty-state";
    gamesList.textContent = "Zatím nic k zobrazení.";
    return;
  }

  const { teamSeason, totals, playerSummaries, games } = detail;
  teamSummaryText.textContent = `${teamSeason.team.name} | ${teamSeason.season.name}`;
  teamSummary.className = "stat-grid";
  teamSummary.innerHTML = `
    <div class="stat-card"><span>Kategorie</span><strong>${escapeHtml(teamSeason.category || "—")}</strong></div>
    <div class="stat-card"><span>Trenér</span><strong>${escapeHtml(teamSeason.coachName || "—")}</strong></div>
    <div class="stat-card"><span>Hráči</span><strong>${totals.rosterCount}</strong></div>
    <div class="stat-card"><span>Utkání</span><strong>${totals.gameCount}</strong></div>
    <div class="stat-card"><span>Bilance</span><strong>${totals.wins}-${totals.losses}</strong></div>
    <div class="stat-card"><span>Soutěžní rok</span><strong>${escapeHtml(calendarYearInput.value || "—")}</strong></div>
  `;

  playersSummary.textContent = `${playerSummaries.length} hráčů na soupisce`;
  playersTableWrap.className = "table-wrap";
  playersTableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Hráč</th>
          <th>Ročník</th>
          <th>Typ</th>
          <th>Utkání</th>
          <th>Soutěžní dny</th>
          <th>Body</th>
        </tr>
      </thead>
      <tbody>
        ${playerSummaries.map(player => `
          <tr>
            <td>
              <strong>${escapeHtml(player.fullName)}</strong>
              <div class="muted">${escapeHtml(player.playerCode || "")}</div>
            </td>
            <td>${escapeHtml(player.birthYear || "—")}</td>
            <td>${player.assignmentType === "hosting_in" ? "Hostování" : "Náš hráč"}</td>
            <td>${player.gamesPlayed}</td>
            <td>${player.competitionDaysInYear}</td>
            <td>${player.totalPoints}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  gamesSummary.textContent = `${games.length} utkání`;
  gamesList.className = "stack-list";
  gamesList.innerHTML = games.map(game => `
    <button class="game-card${game.id === state.selectedGameId ? " is-active" : ""}" data-game-id="${game.id}">
      <strong>${escapeHtml(game.opponentName)}</strong>
      <span>${formatDateTime(game.scheduledAt)}</span>
      <small>${game.isHome ? "domácí" : "venku"}${game.resultLabel ? ` • ${escapeHtml(game.resultLabel)}` : ""}</small>
    </button>
  `).join("");

  for (const button of gamesList.querySelectorAll("[data-game-id]")) {
    button.addEventListener("click", () => {
      void selectGame(button.dataset.gameId);
    });
  }
}

function renderGameDetail(payload) {
  if (!payload) {
    gameDetailSummary.textContent = "Klikni na utkání vpravo.";
    gameDetail.className = "empty-state";
    gameDetail.textContent = "Detail utkání se zobrazí tady.";
    return;
  }

  const { game, players } = payload;
  gameDetailSummary.textContent = `${game.teamSeason.team.name} vs ${game.opponentName}`;
  gameDetail.className = "game-detail";
  gameDetail.innerHTML = `
    <div class="detail-meta">
      <div><span>Termín</span><strong>${escapeHtml(formatDateTime(game.scheduledAt))}</strong></div>
      <div><span>Výsledek</span><strong>${escapeHtml(game.resultLabel || "—")}</strong></div>
      <div><span>Soutěž</span><strong>${escapeHtml(game.competition?.name || "—")}</strong></div>
      <div><span>Hřiště</span><strong>${escapeHtml(game.venue?.name || "—")}</strong></div>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Hráč</th>
            <th>Ročník</th>
            <th>Číslo</th>
            <th>Přítomen</th>
            <th>Body</th>
            <th>TH+</th>
            <th>2B+</th>
            <th>3B+</th>
            <th>PF</th>
          </tr>
        </thead>
        <tbody>
          ${players.map(item => `
            <tr>
              <td>${escapeHtml(item.player.fullName)}<div class="muted">${escapeHtml(item.player.playerCode || "")}</div></td>
              <td>${escapeHtml(item.player.birthYear || "—")}</td>
              <td>${escapeHtml(item.jerseyNumber || "—")}</td>
              <td>${item.isPresent === false ? "Ne" : "Ano"}</td>
              <td>${item.stats?.points ?? 0}</td>
              <td>${item.stats?.ftMade ?? 0}</td>
              <td>${item.stats?.fg2Made ?? 0}</td>
              <td>${item.stats?.fg3Made ?? 0}</td>
              <td>${item.stats?.personalFouls ?? 0}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function loadOverview() {
  setStatus("Načítám přehled týmů…");
  state.overview = await fetchJson(`/api/overview?seasonCode=${encodeURIComponent(seasonSelect.value)}`);
  renderOverview();
  setStatus("Přehled týmů je načtený.", "success");

  if (state.overview[0]) {
    await selectTeamSeason(String(state.overview[0].id));
  } else {
    state.selectedTeamSeasonId = null;
    state.teamDetail = null;
    renderTeamDetail();
    renderGameDetail(null);
  }
}

async function selectTeamSeason(teamSeasonId) {
  state.selectedTeamSeasonId = Number(teamSeasonId);
  renderOverview();
  setStatus("Načítám detail týmu…");
  state.teamDetail = await fetchJson(
    `/api/team-season?id=${encodeURIComponent(teamSeasonId)}&calendarYear=${encodeURIComponent(calendarYearInput.value)}`
  );
  state.selectedGameId = null;
  renderTeamDetail();
  renderGameDetail(null);
  setStatus("Detail týmu je načtený.", "success");
}

async function selectGame(gameId) {
  state.selectedGameId = Number(gameId);
  renderTeamDetail();
  setStatus("Načítám detail utkání…");
  const payload = await fetchJson(`/api/game?id=${encodeURIComponent(gameId)}`);
  renderGameDetail(payload);
  setStatus("Detail utkání je načtený.", "success");
}

async function init() {
  try {
    setStatus("Načítám sezóny…");
    state.seasons = await fetchJson("/api/seasons");
    renderSeasons();
    await loadOverview();
  } catch (error) {
    setStatus(error.message || "Nepodařilo se načíst data.", "error");
  }
}

seasonSelect.addEventListener("change", () => {
  void loadOverview().catch(error => setStatus(error.message || "Chyba načtení.", "error"));
});

calendarYearInput.addEventListener("change", () => {
  if (!state.selectedTeamSeasonId) {
    return;
  }
  void selectTeamSeason(state.selectedTeamSeasonId).catch(error => setStatus(error.message || "Chyba načtení.", "error"));
});

void init();
