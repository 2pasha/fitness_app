import { NextResponse } from "next/server";
import { buildDashboardAnalytics } from "@/lib/analytics/progression";
import { generateProgressAudit } from "@/lib/ai/coach";

export async function POST() {
  try {
    const analytics = await buildDashboardAnalytics();
    const audit = await generateProgressAudit(analytics);
    return NextResponse.json({ audit });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate progress audit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
