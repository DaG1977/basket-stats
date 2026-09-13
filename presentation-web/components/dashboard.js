"use client";

import { useEffect, useState, startTransition } from "react";

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

function formatDateOnly(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateCount(item) {
  const label = formatDateOnly(item.date);
  return item.count > 1 ? `${label} ${item.count}x` : label;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(escapeCsvValue).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function splitPlayerName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    lastName: parts[0] || "",
    firstName: parts.slice(1).join(" ")
  };
}

function extractLiveMatchId(input) {
  const text = String(input || "").trim();
  if (/^\d+$/.test(text)) {
    return text;
  }

  try {
    const url = new URL(text);
    return url.searchParams.get("MatchID") || url.searchParams.get("matchID") || "";
  } catch {
    const match = text.match(/MatchID=(\d+)/i);
    return match ? match[1] : "";
  }
}

export function Dashboard() {
  const [status, setStatus] = useState({ message: "Načítám data...", kind: "neutral" });
  const [activeView, setActiveView] = useState("stats");
  const [seasons, setSeasons] = useState([]);
  const [seasonCode, setSeasonCode] = useState("");
  const [calendarYear, setCalendarYear] = useState("");
  const [overview, setOverview] = useState([]);
  const [clubYearPlayers, setClubYearPlayers] = useState(null);
  const [selectedTeamSeasonId, setSelectedTeamSeasonId] = useState(null);
  const [teamDetail, setTeamDetail] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [gameDetail, setGameDetail] = useState(null);
  const [liveInput, setLiveInput] = useState("");
  const [liveMatch, setLiveMatch] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [liveStatus, setLiveStatus] = useState({
    message: "Zadej MatchID nebo URL ze zapis.cz.basketball.",
    kind: "neutral"
  });

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("skokani-live-matches") || "[]");
      if (Array.isArray(saved)) {
        setLiveMatches(saved);
      }
    } catch {
      setLiveMatches([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("skokani-live-matches", JSON.stringify(liveMatches));
  }, [liveMatches]);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setStatus({ message: "Načítám sezóny...", kind: "neutral" });
        const seasonRows = await fetchJson("/api/seasons");
        if (!active) {
          return;
        }

        setSeasons(seasonRows);
        if (seasonRows[0]) {
          const nextSeasonCode = seasonRows[0].code;
          const yearMatch = String(nextSeasonCode).match(/^(\d{4})/);
          setSeasonCode(nextSeasonCode);
          setCalendarYear(yearMatch ? yearMatch[1] : "");
        } else {
          setStatus({ message: "V databázi nejsou dostupné žádné sezóny.", kind: "error" });
        }
      } catch (error) {
        if (active) {
          setStatus({ message: error.message || "Nepodařilo se načíst data.", kind: "error" });
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!seasonCode) {
      return;
    }

    let active = true;

    async function run() {
      try {
        setStatus({ message: "Načítám přehled týmů...", kind: "neutral" });
        const overviewRows = await fetchJson(`/api/overview?seasonCode=${encodeURIComponent(seasonCode)}`);
        if (!active) {
          return;
        }

        setOverview(overviewRows);
        setSelectedGameId(null);
        setGameDetail(null);

        if (overviewRows[0]) {
          setSelectedTeamSeasonId(overviewRows[0].id);
          setStatus({ message: "Přehled týmů je načtený.", kind: "success" });
        } else {
          setSelectedTeamSeasonId(null);
          setTeamDetail(null);
          setStatus({ message: "Pro zvolenou sezónu nejsou zatím dostupná data.", kind: "error" });
        }
      } catch (error) {
        if (active) {
          setStatus({ message: error.message || "Nepodařilo se načíst týmy.", kind: "error" });
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [seasonCode]);

  useEffect(() => {
    if (!selectedTeamSeasonId) {
      return;
    }

    let active = true;

    async function run() {
      try {
        setStatus({ message: "Načítám detail týmu...", kind: "neutral" });
        const payload = await fetchJson(
          `/api/team-season?id=${encodeURIComponent(selectedTeamSeasonId)}&calendarYear=${encodeURIComponent(calendarYear)}`
        );
        if (!active) {
          return;
        }

        setTeamDetail(payload);
        setSelectedGameId(null);
        setGameDetail(null);
        setStatus({ message: "Detail týmu je načtený.", kind: "success" });
      } catch (error) {
        if (active) {
          setStatus({ message: error.message || "Nepodařilo se načíst detail týmu.", kind: "error" });
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [selectedTeamSeasonId, calendarYear]);

  useEffect(() => {
    if (!/^\d{4}$/.test(String(calendarYear || ""))) {
      setClubYearPlayers(null);
      return;
    }

    let active = true;

    async function run() {
      try {
        const payload = await fetchJson(`/api/club-year-players?calendarYear=${encodeURIComponent(calendarYear)}`);
        if (active) {
          setClubYearPlayers(payload);
        }
      } catch (error) {
        if (active) {
          setClubYearPlayers(null);
          setStatus({ message: error.message || "Nepodařilo se načíst klubový roční přehled.", kind: "error" });
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [calendarYear]);

  useEffect(() => {
    if (!selectedGameId) {
      return;
    }

    let active = true;

    async function run() {
      try {
        setStatus({ message: "Načítám detail utkání...", kind: "neutral" });
        const payload = await fetchJson(`/api/game?id=${encodeURIComponent(selectedGameId)}`);
        if (!active) {
          return;
        }

        setGameDetail(payload);
        setStatus({ message: "Detail utkání je načtený.", kind: "success" });
      } catch (error) {
        if (active) {
          setStatus({ message: error.message || "Nepodařilo se načíst detail utkání.", kind: "error" });
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [selectedGameId]);

  function exportClubYearPlayers() {
    if (!clubYearPlayers?.players?.length) {
      return;
    }

    downloadCsv(`skokani-hraci-${calendarYear}.csv`, [
      [
        "Kalendářní rok",
        "Příjmení",
        "Jméno",
        "Hráč",
        "Kód hráče",
        "Ročník",
        "Typ",
        "Utkání",
        "Soutěžní dny",
        "Body",
        "Týmy",
        "Datumy utkání"
      ],
      ...clubYearPlayers.players.map((player) => {
        const name = splitPlayerName(player.fullName);
        return [
          calendarYear,
          name.lastName,
          name.firstName,
          player.fullName,
          player.playerCode || "",
          player.birthYear || "",
          player.assignmentTypeLabel || "",
          player.gamesPlayed,
          player.competitionDaysInYear,
          player.totalPoints,
          (player.teams || []).join(", "),
          (player.dates || []).map(formatDateCount).join(", ")
        ];
      })
    ]);
  }

  async function loadLiveMatch(input = liveInput) {
    const matchId = extractLiveMatchId(input);
    if (!matchId) {
      setLiveStatus({ message: "Zadej platné MatchID nebo URL live zápisu.", kind: "error" });
      return;
    }

    try {
      setLiveStatus({ message: "Načítám live zápis...", kind: "neutral" });
      const payload = await fetchJson(`/api/live-zapis?matchId=${encodeURIComponent(matchId)}`);
      setLiveMatch(payload);
      setLiveInput(matchId);
      setLiveStatus({ message: "Live skóre je načtené.", kind: "success" });
    } catch (error) {
      setLiveMatch(null);
      setLiveStatus({
        message: `${error.message || "Nepodařilo se načíst live zápis."} Pro automatické načítání musí mít backend přihlášenou session.`,
        kind: "error"
      });
    }
  }

  function saveLiveMatch() {
    const matchId = extractLiveMatchId(liveInput || liveMatch?.matchId);
    if (!matchId) {
      setLiveStatus({ message: "Nejdřív zadej MatchID nebo URL live zápisu.", kind: "error" });
      return;
    }

    setLiveMatches((items) => {
      if (items.some((item) => item.matchId === matchId)) {
        return items;
      }
      return [
        {
          matchId,
          label: liveMatch ? `${liveMatch.homeTeam} - ${liveMatch.awayTeam}` : `Utkání ${matchId}`
        },
        ...items
      ];
    });
    setLiveStatus({ message: "Utkání je uložené v lokálním seznamu tohoto prohlížeče.", kind: "success" });
  }

  function removeLiveMatch(matchId) {
    setLiveMatches((items) => items.filter((item) => item.matchId !== matchId));
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-head">
            <a className="logo-link" href="https://www.bkskokani.cz/" target="_blank" rel="noreferrer">
              <img className="logo-image" src="https://www.bkskokani.cz/images/logo.svg" alt="BK Skokani Brno" />
            </a>
            <div className="hero-links">
              <a href="https://www.bkskokani.cz/" target="_blank" rel="noreferrer">
                Hlavní web
              </a>
              <a href="https://www.bkskokani.cz/teamy" target="_blank" rel="noreferrer">
                Teamy
              </a>
              <a href="https://www.bkskokani.cz/zapasy" target="_blank" rel="noreferrer">
                Zápasy
              </a>
            </div>
          </div>
          <p className="eyebrow">BK Skokani Brno</p>
          <h1>Klubové statistiky</h1>
          <p className="lede">
            Přehled týmů, soupisek, hráčů a utkání BK Skokani Brno nad klubovou databází. Vyber sezónu, otevři tým a
            sleduj také počet utkání a soutěžních dnů v kalendářním roce.
          </p>
          <div className="hero-pills hero-tabs" aria-label="Sekce statistik">
            <button className={activeView === "stats" ? "is-active" : ""} type="button" onClick={() => setActiveView("stats")}>
              Statistiky
            </button>
            <button className={activeView === "live" ? "is-active" : ""} type="button" onClick={() => setActiveView("live")}>
              Live zápis
            </button>
          </div>
        </div>
      </section>

      {activeView === "live" ? (
        <>
          <section className="panel live-panel">
            <div className="section-head">
              <div>
                <h2>Live zápis ČBF</h2>
                <p>Načtení skóre a posledního známého času ze zápisu zapis.cz.basketball.</p>
              </div>
            </div>

            <div className="toolbar-card live-toolbar">
              <label className="field">
                <span>MatchID nebo URL utkání</span>
                <input
                  value={liveInput}
                  placeholder="Např. 136417 nebo URL MatchLive"
                  onChange={(event) => setLiveInput(event.target.value)}
                />
              </label>
              <div className="live-actions">
                <button className="export-button" type="button" onClick={() => loadLiveMatch()}>
                  Načíst live skóre
                </button>
                <button className="secondary-button" type="button" onClick={saveLiveMatch}>
                  Uložit do seznamu
                </button>
              </div>
            </div>

            <section className={`status-card ${liveStatus.kind}`}>{liveStatus.message}</section>

            {liveMatch ? (
              <div className="live-score-card">
                <div>
                  <span>Domácí</span>
                  <strong>{liveMatch.homeTeam}</strong>
                </div>
                <div className="live-score">
                  <strong>
                    {liveMatch.homeScore}:{liveMatch.awayScore}
                  </strong>
                  <span>
                    {liveMatch.latestPeriod || "—"}
                    {liveMatch.latestTime ? ` • poslední záznam ${liveMatch.latestTime}` : ""}
                  </span>
                </div>
                <div>
                  <span>Hosté</span>
                  <strong>{liveMatch.awayTeam}</strong>
                </div>
                <p>
                  {liveMatch.competitionName || "Soutěž neuvedena"} {liveMatch.matchDate ? `• ${liveMatch.matchDate}` : ""}
                  {liveMatch.scoringEventCount ? ` • ${liveMatch.scoringEventCount} bodových záznamů` : ""}
                </p>
              </div>
            ) : (
              <div className="empty-state">
                Import utkání zatím znamená vložení MatchID nebo URL live zápisu. Backend pak stránku stáhne, vyparsuje skóre a
                veřejný web může tento endpoint pravidelně obnovovat. Pro trvalý klubový seznam můžeme navázat Supabase tabulkou
                live_matches.
              </div>
            )}
          </section>

          <section className="panel">
            <div className="section-head">
              <h2>Sledovaná live utkání</h2>
              <p>{liveMatches.length ? `${liveMatches.length} uložených zápasů` : "Zatím žádné."}</p>
            </div>
            <div className="stack-list">
              {liveMatches.length ? (
                liveMatches.map((item) => (
                  <div className="saved-live-card" key={item.matchId}>
                    <button type="button" onClick={() => loadLiveMatch(item.matchId)}>
                      <strong>{item.label}</strong>
                      <span>MatchID {item.matchId}</span>
                    </button>
                    <button className="text-button" type="button" onClick={() => removeLiveMatch(item.matchId)}>
                      Odebrat
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">Ulož si sem utkání, která chceš během zápasu rychle obnovovat.</div>
              )}
            </div>
          </section>
        </>
      ) : (
        <>
      <section className="toolbar-card">
        <label className="field">
          <span>Sezóna</span>
          <select
            value={seasonCode}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => {
                setSeasonCode(value);
                const yearMatch = String(value).match(/^(\d{4})/);
                if (yearMatch) {
                  setCalendarYear(yearMatch[1]);
                }
              });
            }}
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.code}>
                {season.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Kalendářní rok pro soutěžní dny</span>
          <input
            value={calendarYear}
            type="number"
            min="2020"
            max="2035"
            step="1"
            onChange={(event) => setCalendarYear(event.target.value)}
          />
        </label>
      </section>

      <section className={`status-card ${status.kind}`}>{status.message}</section>

      <section className="grid two-up">
        <article className="panel">
          <div className="section-head">
            <h2>Týmy</h2>
            <p>{overview.length ? `${overview.length} týmů v sezóně` : "-"}</p>
          </div>
          <div className="stack-list">
            {overview.length ? (
              overview.map((item) => (
                <button
                  key={item.id}
                  className={`team-card${item.id === selectedTeamSeasonId ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setSelectedTeamSeasonId(item.id)}
                >
                  <strong>{item.teamName}</strong>
                  <span>{item.category || "Bez kategorie"}</span>
                  <small>
                    {item.rosterCount} hráčů • {item.gameCount} utkání
                  </small>
                </button>
              ))
            ) : (
              <div className="empty-state">Pro zvolenou sezónu zatím nejsou dostupná data.</div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="section-head">
            <h2>Souhrn týmu</h2>
            <p>{teamDetail ? `${teamDetail.teamSeason.team.name} | ${teamDetail.teamSeason.season.name}` : "Vyber tým vlevo."}</p>
          </div>
          {teamDetail ? (
            <div className="stat-grid">
              <div className="stat-card">
                <span>Kategorie</span>
                <strong>{teamDetail.teamSeason.category || "—"}</strong>
              </div>
              <div className="stat-card">
                <span>Trenér</span>
                <strong>{teamDetail.teamSeason.coachName || "—"}</strong>
              </div>
              <div className="stat-card">
                <span>Hráči</span>
                <strong>{teamDetail.totals.rosterCount}</strong>
              </div>
              <div className="stat-card">
                <span>Utkání</span>
                <strong>{teamDetail.totals.gameCount}</strong>
              </div>
              <div className="stat-card">
                <span>Bilance</span>
                <strong>
                  {teamDetail.totals.wins}-{teamDetail.totals.losses}
                </strong>
                <div className="muted stat-note">
                  {teamDetail.totals.completedGameCount} utkání se známým skóre
                  {teamDetail.totals.draws ? ` • remízy ${teamDetail.totals.draws}` : ""}
                </div>
              </div>
              <div className="stat-card">
                <span>Soutěžní rok</span>
                <strong>{calendarYear || "—"}</strong>
              </div>
            </div>
          ) : (
            <div className="empty-state">Zatím není vybraný žádný tým.</div>
          )}
        </article>
      </section>

      <section className="grid two-up">
        <article className="panel">
          <div className="section-head">
            <h2>Hráči</h2>
            <p>{teamDetail ? `${teamDetail.playerSummaries.length} hráčů na soupisce` : "Vyber tým."}</p>
          </div>
          {teamDetail ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hráč</th>
                    <th>Ročník</th>
                    <th>Typ</th>
                    <th>Utkání v týmu</th>
                    <th>Dny v týmu</th>
                    <th>Utkání klub/rok</th>
                    <th>Dny klub/rok</th>
                    <th>Body</th>
                  </tr>
                </thead>
                <tbody>
                  {teamDetail.playerSummaries.map((player) => (
                    <tr key={player.playerId}>
                      <td>
                        <strong>{player.fullName}</strong>
                        <div className="muted">{player.playerCode || ""}</div>
                      </td>
                      <td>{player.birthYear || "—"}</td>
                      <td>{player.assignmentType === "hosting_in" ? "Hostování" : "Náš hráč"}</td>
                      <td>{player.gamesPlayed}</td>
                      <td>{player.competitionDaysInYear}</td>
                      <td>{player.clubGamesInYear}</td>
                      <td>{player.clubCompetitionDaysInYear}</td>
                      <td>{player.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">Zatím nic k zobrazení.</div>
          )}
        </article>

        <article className="panel">
          <div className="section-head">
            <h2>Utkání</h2>
            <p>{teamDetail ? `${teamDetail.games.length} utkání` : "Vyber tým."}</p>
          </div>
          <div className="stack-list">
            {teamDetail ? (
              teamDetail.games.map((game) => (
                <button
                  key={game.id}
                  className={`game-card game-card--${game.outcome}${game.id === selectedGameId ? " is-active" : ""}`}
                  type="button"
                  onClick={() => setSelectedGameId(game.id)}
                >
                  <strong>{game.opponentName}</strong>
                  <span>{formatDateTime(game.scheduledAt)}</span>
                  <small className={`game-result game-result--${game.outcome}`}>
                    {game.isHome ? "domácí" : "venku"}
                    {game.resultLabel ? ` • ${game.resultLabel}` : ""}
                  </small>
                </button>
              ))
            ) : (
              <div className="empty-state">Zatím nic k zobrazení.</div>
            )}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Hráči v kalendářním roce {calendarYear || ""}</h2>
            <p>
              {clubYearPlayers
                ? `${clubYearPlayers.calendarYear}: ${clubYearPlayers.totals.playerCount} hráčů • ${clubYearPlayers.totals.gameCount} utkání • ${clubYearPlayers.totals.competitionDayCount} soutěžních dnů`
                : "Zadej kalendářní rok."}
            </p>
          </div>
          <button
            className="export-button"
            type="button"
            disabled={!clubYearPlayers?.players?.length}
            onClick={exportClubYearPlayers}
          >
            Export CSV
          </button>
        </div>
        {clubYearPlayers?.players?.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hráč</th>
                  <th>Ročník</th>
                  <th>Typ</th>
                  <th>Utkání</th>
                  <th>Soutěžní dny</th>
                  <th>Body</th>
                  <th>Týmy</th>
                  <th>Datumy utkání</th>
                </tr>
              </thead>
              <tbody>
                {clubYearPlayers.players.map((player) => (
                  <tr key={player.playerId}>
                    <td>
                      <strong>{player.fullName}</strong>
                      <div className="muted">{player.playerCode || ""}</div>
                    </td>
                    <td>{player.birthYear || "—"}</td>
                    <td>{player.assignmentTypeLabel || "—"}</td>
                    <td>{player.gamesPlayed}</td>
                    <td>{player.competitionDaysInYear}</td>
                    <td>{player.totalPoints}</td>
                    <td>{(player.teams || []).join(", ") || "—"}</td>
                    <td className="date-list">{(player.dates || []).map(formatDateCount).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">Pro zvolený kalendářní rok zatím nejsou dostupní žádní hráči.</div>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Detail utkání</h2>
          <p>{gameDetail ? `${gameDetail.game.teamSeason.team.name} vs ${gameDetail.game.opponentName}` : "Klikni na utkání vpravo."}</p>
        </div>
        {gameDetail ? (
          <div className="game-detail">
            <div className="detail-meta">
              <div>
                <span>Termín</span>
                <strong>{formatDateTime(gameDetail.game.scheduledAt)}</strong>
              </div>
              <div>
                <span>Výsledek</span>
                <strong className={`result-highlight result-highlight--${gameDetail.game.outcome}`}>
                  {gameDetail.game.resultLabel || "—"}
                </strong>
              </div>
              <div>
                <span>Soutěž</span>
                <strong>{gameDetail.game.competition?.name || "—"}</strong>
              </div>
              <div>
                <span>Hřiště</span>
                <strong>{gameDetail.game.venue?.name || "—"}</strong>
              </div>
              <div>
                <span>Zápis</span>
                {gameDetail.game.scoresheetUrl ? (
                  <strong>
                    <a href={gameDetail.game.scoresheetUrl} target="_blank" rel="noreferrer">
                      PDF zápis
                    </a>
                  </strong>
                ) : (
                  <strong>—</strong>
                )}
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
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
                  {gameDetail.players.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.player.fullName}
                        <div className="muted">{item.player.playerCode || ""}</div>
                      </td>
                      <td>{item.player.birthYear || "—"}</td>
                      <td>{item.jerseyNumber || "—"}</td>
                      <td>{item.isPresent === false ? "Ne" : "Ano"}</td>
                      <td>{item.stats?.points ?? 0}</td>
                      <td>{item.stats?.ftMade ?? 0}</td>
                      <td>{item.stats?.fg2Made ?? 0}</td>
                      <td>{item.stats?.fg3Made ?? 0}</td>
                      <td>{item.stats?.personalFouls ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-state">Detail utkání se zobrazí tady.</div>
        )}
      </section>
        </>
      )}
    </main>
  );
}
