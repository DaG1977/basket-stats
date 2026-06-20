import { NextResponse } from "next/server";
import { buildTeamSeasonDetail } from "../../../lib/supabase";

export async function GET(request) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    const calendarYear = request.nextUrl.searchParams.get("calendarYear");
    if (!id) {
      return NextResponse.json({ error: "Chybí id team_season." }, { status: 400 });
    }

    const payload = await buildTeamSeasonDetail(id, calendarYear);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Neočekávaná chyba." }, { status: 500 });
  }
}
