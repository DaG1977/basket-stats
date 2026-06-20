import { NextResponse } from "next/server";
import { buildGameDetail } from "../../../lib/supabase";

export async function GET(request) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Chybí id utkání." }, { status: 400 });
    }

    const payload = await buildGameDetail(id);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Neočekávaná chyba." }, { status: 500 });
  }
}
