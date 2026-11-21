import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Supabase is not configured yet. Connect your Supabase project in Setup & Settings to persist split changes.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Update routine split order / active flag
    if (body.type === "update_routine") {
      const { routineId, split_order, is_active_in_split } = body;
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (typeof split_order === "number") updates.split_order = split_order;
      if (typeof is_active_in_split === "boolean")
        updates.is_active_in_split = is_active_in_split;

      const { error } = await supabase
        .from("routines")
        .update(updates)
        .eq("id", routineId);

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true });
    }

    // Update exercise progression rules
    if (body.type === "update_exercise_rule") {
      const {
        routineExerciseId,
        target_rep_min,
        target_rep_max,
        weight_increment_kg,
        target_rpe,
      } = body;

      const { error } = await supabase
        .from("routine_exercises")
        .update({
          target_rep_min: Number(target_rep_min),
          target_rep_max: Number(target_rep_max),
          weight_increment_kg: Number(weight_increment_kg),
          target_rpe: Number(target_rpe),
        })
        .eq("id", routineExerciseId);

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown update type" }, { status: 400 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update split rule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
