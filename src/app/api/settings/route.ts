import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function parseWeeklyGoalFromSetting(row: Record<string, unknown> | null): number {
  if (!row) return 3;
  if (typeof row.weekly_goal_sessions === "number" && row.weekly_goal_sessions >= 1) {
    return row.weekly_goal_sessions;
  }
  if (typeof row.training_goal === "string") {
    const match = row.training_goal.match(/\[weekly_goal:(\d+)\]/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (parsed >= 1 && parsed <= 14) return parsed;
    }
  }
  return 3;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ weeklyGoalSessions: 3 });
    }

    const { data: row, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ weeklyGoalSessions: 3 });
    }

    return NextResponse.json({
      weeklyGoalSessions: parseWeeklyGoalFromSetting(row),
      lastSyncAt: row?.last_sync_at || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load settings";
    return NextResponse.json({ error: message, weeklyGoalSessions: 3 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawGoal = Number(body.weeklyGoalSessions);
    const weeklyGoalSessions = Math.max(1, Math.min(14, Math.round(rawGoal || 3)));

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ weeklyGoalSessions });
    }

    const nowIso = new Date().toISOString();

    // First try updating weekly_goal_sessions directly
    const { error: directErr } = await supabase
      .from("app_settings")
      .upsert(
        {
          id: 1,
          weekly_goal_sessions: weeklyGoalSessions,
          updated_at: nowIso,
        },
        { onConflict: "id" }
      );

    if (directErr) {
      // Fallback: store inside training_goal tag on app_settings if weekly_goal_sessions column hasn't been added yet
      const { data: existing } = await supabase
        .from("app_settings")
        .select("training_goal")
        .eq("id", 1)
        .maybeSingle();

      const baseGoal = (existing?.training_goal || "Hypertrophy & Progressive Overload")
        .replace(/\s*\[weekly_goal:\d+\]/g, "")
        .trim();

      const { error: fallbackErr } = await supabase
        .from("app_settings")
        .upsert(
          {
            id: 1,
            training_goal: `${baseGoal} [weekly_goal:${weeklyGoalSessions}]`,
            updated_at: nowIso,
          },
          { onConflict: "id" }
        );

      if (fallbackErr) {
        throw new Error(fallbackErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      weeklyGoalSessions,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to save weekly goal in Supabase";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
