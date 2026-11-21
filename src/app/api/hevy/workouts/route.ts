import { NextRequest, NextResponse } from "next/server";
import { syncHevyToSupabase } from "@/lib/hevy/sync";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface DetailedWorkoutView {
  id: string;
  title: string;
  description: string | null;
  routine_id: string | null;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  total_volume_kg: number;
  total_working_sets: number;
  total_sets: number;
  exercises: Array<{
    index: number;
    exercise_template_id: string;
    title: string;
    notes: string | null;
    superset_id: number | null;
    best_e1rm_kg: number;
    max_weight_kg: number;
    exercise_volume_kg: number;
    working_sets_count: number;
    avg_rpe: number | null;
    sets: Array<{
      index: number;
      type: string;
      weight_kg: number | null;
      reps: number | null;
      distance_meters: number | null;
      duration_seconds: number | null;
      rpe: number | null;
      e1rm_kg: number;
      is_pr: boolean;
    }>;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error(
        "Supabase client is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
      );
    }

    const forceSync = req.nextUrl.searchParams.get("sync") === "true";

    // Check how many workouts are currently stored in Supabase DB
    const { count: existingCount, error: countErr } = await supabase
      .from("workouts")
      .select("id", { count: "exact", head: true });

    if (countErr && countErr.code === "42P01") {
      throw new Error(
        "Supabase tables do not exist yet. Please run supabase/migrations/0001_initial_schema.sql in your Supabase SQL Editor."
      );
    }

    // Auto-sync to Supabase DB if DB is empty or user clicked "Sync with Hevy"
    if (forceSync || !existingCount || existingCount === 0) {
      await syncHevyToSupabase(!existingCount || existingCount === 0);
    }

    // Read workouts directly from Supabase DB
    const [
      { data: dbWorkouts, error: wErr },
      { count: totalWorkoutsInDb },
      { count: totalExercisesInDb },
      { count: totalSetsInDb },
      { data: settingsRow },
    ] = await Promise.all([
      supabase
        .from("workouts")
        .select("*, workout_exercises(*, workout_sets(*))")
        .order("start_time", { ascending: false })
        .limit(40),
      supabase.from("workouts").select("id", { count: "exact", head: true }),
      supabase
        .from("workout_exercises")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("workout_sets")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("app_settings")
        .select("last_sync_at")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    if (wErr) {
      throw new Error(`Failed to read workouts from Supabase: ${wErr.message}`);
    }

    const workouts: DetailedWorkoutView[] = (dbWorkouts || []).map((w) => {
      const sortedEx = [...(w.workout_exercises || [])].sort(
        (a, b) => a.index - b.index
      );
      let totalSets = 0;

      const exercises = sortedEx.map((ex) => {
        const sortedSets = [...(ex.workout_sets || [])]
          .sort((a, b) => a.index - b.index)
          .map((s) => ({
            index: s.index,
            type: s.type,
            weight_kg: s.weight_kg !== null ? Number(s.weight_kg) : null,
            reps: s.reps !== null ? Number(s.reps) : null,
            distance_meters:
              s.distance_meters !== null ? Number(s.distance_meters) : null,
            duration_seconds:
              s.duration_seconds !== null ? Number(s.duration_seconds) : null,
            rpe: s.rpe !== null ? Number(s.rpe) : null,
            e1rm_kg: Number(s.e1rm_kg || 0),
            is_pr: Boolean(s.is_pr),
          }));

        totalSets += sortedSets.length;

        return {
          index: ex.index,
          exercise_template_id: ex.exercise_template_id,
          title: ex.title,
          notes: ex.notes,
          superset_id: ex.superset_id,
          best_e1rm_kg: Number(ex.best_e1rm_kg || 0),
          max_weight_kg: Number(ex.max_weight_kg || 0),
          exercise_volume_kg: Number(ex.exercise_volume_kg || 0),
          working_sets_count: Number(ex.working_sets_count || 0),
          avg_rpe: ex.avg_rpe !== null ? Number(ex.avg_rpe) : null,
          sets: sortedSets,
        };
      });

      return {
        id: w.id,
        title: w.title,
        description: w.description,
        routine_id: w.routine_id,
        start_time: w.start_time,
        end_time: w.end_time,
        duration_seconds: Number(w.duration_seconds || 0),
        total_volume_kg: Number(w.total_volume_kg || 0),
        total_working_sets: Number(w.total_working_sets || 0),
        total_sets: totalSets,
        exercises,
      };
    });

    const dbStats = {
      workoutsInDb: totalWorkoutsInDb ?? workouts.length,
      exercisesInDb: totalExercisesInDb ?? 0,
      setsInDb: totalSetsInDb ?? 0,
      lastSyncAt: settingsRow?.last_sync_at || null,
    };

    return NextResponse.json({
      totalCount: dbStats.workoutsInDb,
      workouts,
      dbStats,
      supabaseStatus: {
        synced: true,
        message: `Stored in Supabase DB: ${dbStats.workoutsInDb} workouts, ${dbStats.exercisesInDb} exercises, ${dbStats.setsInDb} sets`,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to sync/read workouts";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
