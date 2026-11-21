import { getSupabaseAdmin } from "@/lib/supabase/server";
import { HevyClient } from "./client";
import { computeWorkoutSummary } from "./metrics";
import { HevyExerciseTemplate, HevyRoutine, HevyWorkout } from "./types";

export interface SyncResult {
  mode: "full" | "delta";
  templatesSynced: number;
  routinesSynced: number;
  workoutsSynced: number;
  workoutsDeleted: number;
  syncedAt: string;
}

export async function syncHevyToSupabase(
  forceFull = false
): Promise<SyncResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  const hevy = new HevyClient();
  const nowIso = new Date().toISOString();

  // Check existing sync state and whether DB actually has workouts
  const [
    { data: settingsRow, error: settingsErr },
    { count: existingWorkoutsCount },
  ] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("workouts").select("id", { count: "exact", head: true }),
  ]);

  if (settingsErr && settingsErr.code === "42P01") {
    throw new Error(
      "Database tables not found in Supabase. Please run supabase/migrations/0001_initial_schema.sql in your Supabase SQL Editor."
    );
  }

  const hasExistingData = (existingWorkoutsCount ?? 0) > 0;
  const lastSyncAt: string | null =
    !forceFull && hasExistingData && settingsRow?.last_sync_at
      ? settingsRow.last_sync_at
      : null;

  // 1. Fetch Workouts from Hevy (Full or Delta)
  let workoutsToUpsert: HevyWorkout[] = [];
  let deletedWorkoutIds: string[] = [];
  let mode: "full" | "delta" = "full";

  if (lastSyncAt) {
    mode = "delta";
    try {
      let page = 1;
      let pageCount = 1;
      while (page <= pageCount && page <= 5) {
        const evRes = await hevy.getWorkoutEvents(lastSyncAt, page, 10);
        for (const ev of evRes.events || []) {
          if (ev.type === "updated" && ev.workout) {
            workoutsToUpsert.push(ev.workout);
          } else if (ev.type === "deleted" && ev.id) {
            deletedWorkoutIds.push(ev.id);
          }
        }
        pageCount = evRes.page_count || 1;
        page++;
      }
    } catch {
      // Fallback to fetching recent workouts page if delta events endpoint errors
      mode = "full";
      workoutsToUpsert = await hevy.getAllWorkouts(5);
    }
  } else {
    workoutsToUpsert = await hevy.getAllWorkouts(5);
  }

  // 2. Fetch Routines from Hevy (gracefully handle empty/404)
  let routines: HevyRoutine[] = [];
  try {
    routines = await hevy.getAllRoutines(3);
  } catch {
    routines = [];
  }

  // 3. Fetch Exercise Templates (or collect from workouts & routines so FK constraints never fail)
  let templates: HevyExerciseTemplate[] = [];
  try {
    templates = await hevy.getAllExerciseTemplates(5);
  } catch {
    templates = [];
  }

  const templateRowsMap = new Map<
    string,
    {
      id: string;
      title: string;
      type: string;
      primary_muscle_group: string;
      secondary_muscle_groups: string[];
      is_custom: boolean;
      updated_at: string;
    }
  >();

  for (const t of templates) {
    templateRowsMap.set(t.id, {
      id: t.id,
      title: t.title,
      type: t.type || "weight_reps",
      primary_muscle_group: t.primary_muscle_group || "other",
      secondary_muscle_groups: t.secondary_muscle_groups || [],
      is_custom: Boolean(t.is_custom),
      updated_at: nowIso,
    });
  }

  // Ensure every exercise_template_id referenced by workouts or routines is in templateRowsMap
  for (const w of workoutsToUpsert) {
    for (const ex of w.exercises || []) {
      if (!templateRowsMap.has(ex.exercise_template_id)) {
        templateRowsMap.set(ex.exercise_template_id, {
          id: ex.exercise_template_id,
          title: ex.title || `Exercise ${ex.exercise_template_id}`,
          type: "weight_reps",
          primary_muscle_group: "other",
          secondary_muscle_groups: [],
          is_custom: false,
          updated_at: nowIso,
        });
      }
    }
  }

  for (const r of routines) {
    for (const ex of r.exercises || []) {
      if (!templateRowsMap.has(ex.exercise_template_id)) {
        templateRowsMap.set(ex.exercise_template_id, {
          id: ex.exercise_template_id,
          title: ex.title || `Exercise ${ex.exercise_template_id}`,
          type: "weight_reps",
          primary_muscle_group: "other",
          secondary_muscle_groups: [],
          is_custom: false,
          updated_at: nowIso,
        });
      }
    }
  }

  // Batch upsert all exercise_templates in one call
  const allTemplateRows = Array.from(templateRowsMap.values());
  if (allTemplateRows.length > 0) {
    const { error: tplErr } = await supabase
      .from("exercise_templates")
      .upsert(allTemplateRows, { onConflict: "id" });

    if (tplErr) {
      throw new Error(`Failed to upsert exercise templates: ${tplErr.message}`);
    }
  }

  // 4. Batch upsert Routines & Routine Exercises
  if (routines.length > 0) {
    const { data: existingRoutines } = await supabase
      .from("routines")
      .select("id, split_order, is_active_in_split, is_ai_target_routine");

    const existingRoutineMap = new Map(
      (existingRoutines || []).map((r) => [r.id, r])
    );

    const routineRows = routines.map((r, i) => {
      const existing = existingRoutineMap.get(r.id);
      const isAiRoutine =
        existing?.is_ai_target_routine ||
        r.title.includes("Today's AI Workout") ||
        settingsRow?.ai_target_routine_id === r.id;

      return {
        id: r.id,
        title: r.title,
        folder_id: r.folder_id ?? null,
        notes: r.notes ?? null,
        split_order: existing?.split_order ?? i + 1,
        is_active_in_split: isAiRoutine
          ? false
          : existing?.is_active_in_split ?? true,
        is_ai_target_routine: Boolean(isAiRoutine),
        hevy_updated_at: r.updated_at,
        hevy_created_at: r.created_at,
        updated_at: nowIso,
      };
    });

    const { error: routineErr } = await supabase
      .from("routines")
      .upsert(routineRows, { onConflict: "id" });

    if (routineErr) {
      throw new Error(`Failed to upsert routines: ${routineErr.message}`);
    }

    const routineIds = routines.map((r) => r.id);
    await supabase
      .from("routine_exercises")
      .delete()
      .in("routine_id", routineIds);

    const allRoutineExerciseRows = routines.flatMap((r) =>
      (r.exercises || []).map((ex, idx) => {
        const firstWorkingSet = (ex.sets || []).find(
          (s) => s.type !== "warmup"
        );
        const defaultRep = firstWorkingSet?.reps || 10;
        return {
          routine_id: r.id,
          exercise_template_id: ex.exercise_template_id,
          index: idx,
          title: ex.title || `Exercise ${idx + 1}`,
          superset_id: ex.superset_id ?? null,
          rest_seconds: ex.rest_seconds ?? 90,
          notes: ex.notes ?? null,
          target_sets: ex.sets || [],
          target_rep_min: Math.max(4, defaultRep - 2),
          target_rep_max: defaultRep + 2,
          weight_increment_kg: 2.5,
          target_rpe: 8.5,
          progression_rule: "double_progression",
        };
      })
    );

    if (allRoutineExerciseRows.length > 0) {
      const { error: reErr } = await supabase
        .from("routine_exercises")
        .insert(allRoutineExerciseRows);
      if (reErr) {
        throw new Error(
          `Failed to insert routine exercises: ${reErr.message}`
        );
      }
    }
  }

  // 5. Delete removed workouts if any
  if (deletedWorkoutIds.length > 0) {
    await supabase.from("workouts").delete().in("id", deletedWorkoutIds);
  }

  // 6. Batch upsert Workouts, Workout Exercises, and Workout Sets
  if (workoutsToUpsert.length > 0) {
    workoutsToUpsert.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const summariesByWorkoutId = new Map(
      workoutsToUpsert.map((w) => [w.id, computeWorkoutSummary(w)])
    );

    const workoutRows = workoutsToUpsert.map((w) => {
      const summary = summariesByWorkoutId.get(w.id)!;
      return {
        id: w.id,
        routine_id: w.routine_id ?? null,
        title: w.title || "Workout",
        description: w.description ?? null,
        start_time: w.start_time,
        end_time: w.end_time,
        duration_seconds: summary.durationSeconds,
        total_volume_kg: summary.totalVolumeKg,
        total_working_sets: summary.totalWorkingSets,
        hevy_updated_at: w.updated_at,
        updated_at: nowIso,
      };
    });

    const { error: wErr } = await supabase
      .from("workouts")
      .upsert(workoutRows, { onConflict: "id" });

    if (wErr) {
      throw new Error(`Failed to upsert workouts: ${wErr.message}`);
    }

    // Delete old workout_exercises for these workouts (cascades to workout_sets)
    const upsertedIds = workoutsToUpsert.map((w) => w.id);
    await supabase
      .from("workout_exercises")
      .delete()
      .in("workout_id", upsertedIds);

    // Prepare all workout_exercises rows
    const workoutExercisesPayload: Array<{
      workout_id: string;
      exercise_template_id: string;
      index: number;
      title: string;
      notes: string | null;
      superset_id: number | null;
      best_e1rm_kg: number;
      max_weight_kg: number;
      exercise_volume_kg: number;
      working_sets_count: number;
      avg_rpe: number | null;
    }> = [];

    for (const w of workoutsToUpsert) {
      const summary = summariesByWorkoutId.get(w.id)!;
      for (const ex of summary.exercisesWithMetrics) {
        workoutExercisesPayload.push({
          workout_id: w.id,
          exercise_template_id: ex.exercise_template_id,
          index: ex.index,
          title: ex.title,
          notes: ex.notes ?? null,
          superset_id: ex.superset_id ?? null,
          best_e1rm_kg: ex.metrics.bestE1rmKg,
          max_weight_kg: ex.metrics.maxWeightKg,
          exercise_volume_kg: ex.metrics.exerciseVolumeKg,
          working_sets_count: ex.metrics.workingSetsCount,
          avg_rpe: ex.metrics.avgRpe,
        });
      }
    }

    if (workoutExercisesPayload.length > 0) {
      const { data: insertedExercises, error: weErr } = await supabase
        .from("workout_exercises")
        .insert(workoutExercisesPayload)
        .select("id, workout_id, index, exercise_template_id");

      if (weErr || !insertedExercises) {
        throw new Error(
          `Failed to insert workout_exercises: ${weErr?.message}`
        );
      }

      // Map (workout_id:index) -> inserted workout_exercise.id
      const weIdByKey = new Map(
        insertedExercises.map((row) => [`${row.workout_id}:${row.index}`, row.id])
      );

      const bestE1rmByTemplate = new Map<string, number>();
      const allSetsPayload: Array<{
        workout_exercise_id: number;
        index: number;
        type: string;
        weight_kg: number | null;
        reps: number | null;
        distance_meters: number | null;
        duration_seconds: number | null;
        rpe: number | null;
        e1rm_kg: number;
        is_pr: boolean;
      }> = [];

      for (const w of workoutsToUpsert) {
        const summary = summariesByWorkoutId.get(w.id)!;
        for (const ex of summary.exercisesWithMetrics) {
          const weId = weIdByKey.get(`${w.id}:${ex.index}`);
          if (!weId) continue;

          let currentBest =
            bestE1rmByTemplate.get(ex.exercise_template_id) || 0;

          for (const s of ex.metrics.computedSets) {
            const isPr = s.e1rm_kg > 0 && s.e1rm_kg > currentBest;
            if (isPr) {
              currentBest = s.e1rm_kg;
              bestE1rmByTemplate.set(ex.exercise_template_id, currentBest);
            }
            allSetsPayload.push({
              workout_exercise_id: weId,
              index: s.index,
              type: s.type || "normal",
              weight_kg: s.weight_kg ?? null,
              reps: s.reps ?? null,
              distance_meters: s.distance_meters ?? null,
              duration_seconds: s.duration_seconds ?? null,
              rpe: s.rpe ?? null,
              e1rm_kg: s.e1rm_kg,
              is_pr: isPr,
            });
          }
        }
      }

      if (allSetsPayload.length > 0) {
        const { error: wsErr } = await supabase
          .from("workout_sets")
          .insert(allSetsPayload);
        if (wsErr) {
          throw new Error(`Failed to insert workout_sets: ${wsErr.message}`);
        }
      }
    }
  }

  // 7. Update app_settings.last_sync_at
  await supabase.from("app_settings").upsert(
    {
      id: 1,
      last_sync_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: "id" }
  );

  return {
    mode,
    templatesSynced: allTemplateRows.length,
    routinesSynced: routines.length,
    workoutsSynced: workoutsToUpsert.length,
    workoutsDeleted: deletedWorkoutIds.length,
    syncedAt: nowIso,
  };
}
