import { NextResponse } from "next/server";
import { loadSeasons } from "../../../lib/supabase";

export async function GET() {
  try {
    const payload = await loadSeasons();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Neočekávaná chyba." }, { status: 500 });
  }
}
