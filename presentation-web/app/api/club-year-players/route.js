import { NextResponse } from "next/server";
import { buildClubYearPlayers } from "../../../lib/supabase";

export async function GET(request) {
  try {
    const calendarYear = request.nextUrl.searchParams.get("calendarYear");
    if (!/^\d{4}$/.test(String(calendarYear || ""))) {
      return NextResponse.json({ error: "Chybí platný kalendářní rok." }, { status: 400 });
    }

    const payload = await buildClubYearPlayers(calendarYear);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Neočekávaná chyba." }, { status: 500 });
  }
}
