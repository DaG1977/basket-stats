const ZAPIS_BASE_URL = "https://zapis.cz.basketball";

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " "));
}

export function extractMatchId(input) {
  const text = String(input || "").trim();
  if (!text) {
    return "";
  }

  const direct = text.match(/^\d+$/);
  if (direct) {
    return direct[0];
  }

  try {
    const url = new URL(text);
    return url.searchParams.get("MatchID") || url.searchParams.get("matchID") || "";
  } catch {
    const match = text.match(/MatchID=(\d+)/i);
    return match ? match[1] : "";
  }
}

export function buildZapisMatchUrl(matchId) {
  const id = extractMatchId(matchId);
  if (!id) {
    return "";
  }
  return `${ZAPIS_BASE_URL}/index.aspx?Module=Competition&Page=MatchLive&MenuID=253&MatchID=${encodeURIComponent(id)}`;
}

export function parseZapisLiveHtml(html, matchId = "") {
  const source = String(html || "");
  const previewMatch = source.match(/<div class="well well-edit matchlive-preview">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<h2 class="fs-title">/);
  const preview = previewMatch ? previewMatch[0] : source;
  const teamMatches = [...preview.matchAll(/<div class="teamname">([\s\S]*?)<\/div>/g)].map((match) => stripTags(match[1]));
  const scoreMatch = preview.match(/<div[^>]*class="[^"]*\bscore\b[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  const scoreNumbers = scoreMatch ? stripTags(scoreMatch[1]).match(/\d+/g) || [] : [];
  const dateMatch = preview.match(/<div class="match-date">([\s\S]*?)<\/div>/);
  const matchDate = dateMatch ? stripTags(dateMatch[1]) : "";
  const competitionMatch = source.match(/<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
  const competitionName = competitionMatch ? stripTags(competitionMatch[1]) : "";

  const scoringEvents = [...source.matchAll(/<tr class="bgrow2?">([\s\S]*?)<\/tr>/g)]
    .map((rowMatch) => {
      const values = [...rowMatch[1].matchAll(/<span[^>]*class="label"[^>]*>([\s\S]*?)<\/span>/g)].map((match) =>
        stripTags(match[1])
      );
      return {
        period: values[0] || "",
        time: values[1] || "",
        team: values[2] || "",
        score: values[3] || "",
        player: values[4] || "",
        action: values[5] || ""
      };
    })
    .filter((event) => /^\d+\s*:\s*\d+$/.test(event.score));

  const latestScoringEvent = scoringEvents[scoringEvents.length - 1] || null;

  if (teamMatches.length < 2 || scoreNumbers.length < 2) {
    const looksLoggedOut = /login|přihl/i.test(stripTags(source));
    throw new Error(
      looksLoggedOut
        ? "Zápis se nepodařilo načíst jako přihlášený uživatel."
        : "Ve stránce zápisu se nepodařilo najít skóre."
    );
  }

  return {
    matchId: extractMatchId(matchId),
    sourceUrl: buildZapisMatchUrl(matchId),
    competitionName,
    matchDate,
    homeTeam: teamMatches[0],
    awayTeam: teamMatches[1],
    homeScore: Number(scoreNumbers[0]),
    awayScore: Number(scoreNumbers[1]),
    latestPeriod: latestScoringEvent?.period || "",
    latestTime: latestScoringEvent?.time || "",
    latestScore: latestScoringEvent?.score || `${scoreNumbers[0]}:${scoreNumbers[1]}`,
    scoringEventCount: scoringEvents.length,
    fetchedAt: new Date().toISOString()
  };
}

export async function fetchZapisLiveMatch(matchId) {
  const id = extractMatchId(matchId);
  if (!id) {
    throw new Error("Zadej MatchID nebo URL live zápisu.");
  }

  const cookie = String(process.env.ZAPIS_SESSION_COOKIE || "").trim();
  if (!cookie) {
    throw new Error("Chybí ZAPIS_SESSION_COOKIE. Bez přihlášené session zápis obvykle vrací jen login stránku.");
  }

  const response = await fetch(buildZapisMatchUrl(id), {
    headers: {
      Cookie: cookie,
      "User-Agent": "BK-Skokani-Stats/1.0",
      Accept: "text/html"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Zápis vrátil HTTP ${response.status}.`);
  }

  const html = await response.text();
  return parseZapisLiveHtml(html, id);
}
