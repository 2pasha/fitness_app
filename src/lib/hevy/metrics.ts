import { HevySet, HevyWorkout, HevyWorkoutExercise } from "./types";

/**
 * Epley 1RM formula: weight * (1 + reps / 30)
 * For reps === 1, returns weight directly.
 * Only calculated for working sets (normal / failure / dropset) with positive weight and reps.
 */
export function calculateE1RM(
  weightKg: number | null | undefined,
  reps: number | null | undefined,
  setType: string = "normal"
): number {
  if (setType === "warmup") return 0;
  const w = Number(weightKg || 0);
  const r = Number(reps || 0);
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return Math.round(w * 100) / 100;
  // Cap effective rep scaling at 15 reps to prevent inflated high-rep estimates
  const cappedReps = Math.min(r, 15);
  const e1rm = w * (1 + cappedReps / 30);
  return Math.round(e1rm * 100) / 100;
}

export interface ComputedExerciseMetrics {
  bestE1rmKg: number;
  maxWeightKg: number;
  exerciseVolumeKg: number;
  workingSetsCount: number;
  avgRpe: number | null;
  computedSets: Array<
    HevySet & {
      index: number;
      e1rm_kg: number;
    }
  >;
}

export function computeExerciseMetrics(
  exercise: HevyWorkoutExercise
): ComputedExerciseMetrics {
  let bestE1rmKg = 0;
  let maxWeightKg = 0;
  let exerciseVolumeKg = 0;
  let workingSetsCount = 0;
  let rpeSum = 0;
  let rpeCount = 0;

  const computedSets = (exercise.sets || []).map((set, idx) => {
    const isWorking = set.type !== "warmup";
    const w = Number(set.weight_kg || 0);
    const r = Number(set.reps || 0);
    const e1rm = isWorking ? calculateE1RM(w, r, set.type) : 0;

    if (isWorking) {
      workingSetsCount++;
      if (w > 0 && r > 0) {
        exerciseVolumeKg += w * r;
      }
      if (w > maxWeightKg) {
        maxWeightKg = w;
      }
      if (e1rm > bestE1rmKg) {
        bestE1rmKg = e1rm;
      }
      if (set.rpe !== null && set.rpe !== undefined && Number(set.rpe) > 0) {
        rpeSum += Number(set.rpe);
        rpeCount++;
      }
    }

    return {
      ...set,
      index: set.index ?? idx,
      e1rm_kg: e1rm,
    };
  });

  return {
    bestE1rmKg: Math.round(bestE1rmKg * 100) / 100,
    maxWeightKg: Math.round(maxWeightKg * 100) / 100,
    exerciseVolumeKg: Math.round(exerciseVolumeKg * 100) / 100,
    workingSetsCount,
    avgRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
    computedSets,
  };
}

export function computeWorkoutSummary(workout: HevyWorkout) {
  const startMs = new Date(workout.start_time).getTime();
  const endMs = new Date(workout.end_time).getTime();
  const durationSeconds =
    !isNaN(startMs) && !isNaN(endMs) && endMs > startMs
      ? Math.round((endMs - startMs) / 1000)
      : 0;

  let totalVolumeKg = 0;
  let totalWorkingSets = 0;

  const exercisesWithMetrics = (workout.exercises || []).map((ex, idx) => {
    const metrics = computeExerciseMetrics(ex);
    totalVolumeKg += metrics.exerciseVolumeKg;
    totalWorkingSets += metrics.workingSetsCount;
    return {
      ...ex,
      index: ex.index ?? idx,
      metrics,
    };
  });

  return {
    durationSeconds,
    totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
    totalWorkingSets,
    exercisesWithMetrics,
  };
}
