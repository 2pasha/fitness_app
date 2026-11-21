import { NextRequest, NextResponse } from "next/server";
import { HevyClient } from "@/lib/hevy/client";
import { HevyRoutinePayload } from "@/lib/hevy/types";
import { ProposedWorkoutRoutine } from "@/lib/ai/coach";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      workoutPlan: ProposedWorkoutRoutine;
      mode?: "update_ai_routine" | "create_new";
    };

    if (
      !body?.workoutPlan ||
      !Array.isArray(body.workoutPlan.exercises) ||
      body.workoutPlan.exercises.length === 0
    ) {
      return NextResponse.json(
        { error: "Workout plan must include at least one exercise." },
        { status: 400 }
      );
    }

    const hevy = new HevyClient();
    const supabase = getSupabaseAdmin();
    const mode = body.mode || "create_new";

    let existingRoutineId: string | null = null;
    if (mode === "update_ai_routine") {
      if (supabase) {
        const { data: settingsRow } = await supabase
          .from("app_settings")
          .select("ai_target_routine_id")
          .eq("id", 1)
          .maybeSingle();

        existingRoutineId = settingsRow?.ai_target_routine_id || null;
      }

      if (!existingRoutineId) {
        const liveRoutines = await hevy.getAllRoutines(3).catch(() => []);
        const match = liveRoutines.find((r) =>
          r.title.includes("Today's AI Workout")
        );
        if (match) {
          existingRoutineId = match.id;
        }
      }
    }

    const payload: HevyRoutinePayload = {
      routine: {
        title: (body.workoutPlan.title || "Today's AI Workout").trim(),
        folder_id: null,
        notes: (
          body.workoutPlan.notes ||
          "Created by Hevy AI Coach based on your recent workouts."
        ).trim(),
        exercises: body.workoutPlan.exercises.map((ex) => ({
          exercise_template_id: ex.exercise_template_id,
          superset_id: ex.superset_id ?? null,
          rest_seconds: Math.max(0, Math.round(Number(ex.rest_seconds || 90))),
          notes: (ex.notes || ex.progression_rationale || "").trim(),
          sets: ex.sets.map((s) => ({
            type: s.type || "normal",
            weight_kg:
              s.weight_kg !== null && s.weight_kg !== undefined
                ? Number(s.weight_kg)
                : null,
            reps:
              s.reps !== null && s.reps !== undefined
                ? Math.max(1, Math.round(Number(s.reps)))
                : null,
            distance_meters: null,
            duration_seconds: null,
          })),
        })),
      },
    };

    let actionTaken: "updated" | "created" = "created";
    let routineId = existingRoutineId;

    if (mode === "update_ai_routine" && existingRoutineId) {
      try {
        await hevy.updateRoutine(existingRoutineId, payload);
        actionTaken = "updated";
      } catch {
        const createdRes = await hevy.createRoutine(payload);
        const routineObj = Array.isArray(createdRes.routine)
          ? createdRes.routine[0]
          : createdRes.routine;
        routineId = routineObj?.id || null;
        actionTaken = "created";
      }
    } else {
      const createdRes = await hevy.createRoutine(payload);
      const routineObj = Array.isArray(createdRes.routine)
        ? createdRes.routine[0]
        : createdRes.routine;
      routineId = routineObj?.id || null;
      actionTaken = "created";
    }

    // Store the routine reference in Supabase if available
    if (supabase && routineId) {
      const nowIso = new Date().toISOString();
      await supabase.from("routines").upsert(
        {
          id: routineId,
          title: payload.routine.title,
          folder_id: null,
          notes: payload.routine.notes ?? null,
          is_active_in_split: false,
          is_ai_target_routine: mode === "update_ai_routine",
          hevy_updated_at: nowIso,
          hevy_created_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "id" }
      );

      if (mode === "update_ai_routine") {
        await supabase.from("app_settings").upsert(
          {
            id: 1,
            ai_target_routine_id: routineId,
            ai_target_routine_title: payload.routine.title,
            updated_at: nowIso,
          },
          { onConflict: "id" }
        );
      }
    }

    const totalSets = payload.routine.exercises.reduce(
      (sum, ex) => sum + ex.sets.length,
      0
    );

    return NextResponse.json({
      success: true,
      actionTaken,
      routineId,
      title: payload.routine.title,
      exercisesCount: payload.routine.exercises.length,
      totalSets,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to create routine in Hevy API";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
