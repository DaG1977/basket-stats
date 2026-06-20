import { NextResponse } from "next/server";
import { buildOverview } from "../../../lib/supabase";

export async function GET(request) {
  try {
    const seasonCode = request.nextUrl.searchParams.get("seasonCode");
    if (!seasonCode) {
      return NextResponse.json({ error: "Chybí seasonCode." }, { status: 400 });
    }

    const payload = await buildOverview(seasonCode);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Neočekávaná chyba." }, { status: 500 });
  }
}
