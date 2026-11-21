import { NextRequest, NextResponse } from "next/server";
import { syncHevyToSupabase } from "@/lib/hevy/sync";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const forceFull = Boolean(body.forceFull);
    const result = await syncHevyToSupabase(forceFull);
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to sync with Hevy API";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
