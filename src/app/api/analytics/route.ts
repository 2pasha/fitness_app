import { NextResponse } from "next/server";
import { buildDashboardAnalytics } from "@/lib/analytics/progression";

export async function GET() {
  try {
    const analytics = await buildDashboardAnalytics();
    return NextResponse.json({
      analytics,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
