import { NextResponse } from "next/server";
import { fetchZapisLiveMatch } from "../../../lib/zapis-live";

export async function GET(request) {
  try {
    const matchId = request.nextUrl.searchParams.get("matchId") || request.nextUrl.searchParams.get("url") || "";
    const payload = await fetchZapisLiveMatch(matchId);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nepodařilo se načíst live zápis." }, { status: 500 });
  }
}
