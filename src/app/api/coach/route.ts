import { NextRequest, NextResponse } from "next/server";
import { buildDashboardAnalytics } from "@/lib/analytics/progression";
import { generatePreWorkoutPlan } from "@/lib/ai/coach";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage =
      typeof body.message === "string" && body.message.trim().length > 0
        ? body.message.trim()
        : "What should I do today?";
    const routineId =
      typeof body.routineId === "string" ? body.routineId : undefined;
    const locale = body.locale === "uk" ? "uk" : "en";

    const analytics = await buildDashboardAnalytics();
    const result = await generatePreWorkoutPlan({
      userMessage,
      analytics,
      routineId,
      locale,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to generate pre-workout recommendation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
