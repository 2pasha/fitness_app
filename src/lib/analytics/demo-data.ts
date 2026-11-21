export type MovementPattern =
  | "Knee-Dominant (Quads)"
  | "Hip-Hinge (Posterior)"
  | "Horizontal Push (Chest)"
  | "Vertical Push (Shoulders)"
  | "Horizontal Pull (Upper Back)"
  | "Vertical Pull (Lats)"
  | "Arms & Core (Accessory)";

export interface ExerciseSessionPoint {
  workoutId: string;
  workoutTitle: string;
  date: string;
  bestE1rmKg: number;
  maxWeightKg: number;
  volumeKg: number;
  avgRpe: number | null;
  topSetSummary: string;
  sets: Array<{
    index: number;
    type: string;
    weight_kg: number | null;
    reps: number | null;
    rpe: number | null;
    e1rm_kg: number;
    is_pr: boolean;
  }>;
}

export type ProgressionStatus =
  | "progressing"
  | "plateaued"
  | "regressing"
  | "building_baseline";

export interface ExerciseProgressionReport {
  exerciseTemplateId: string;
  title: string;
  primaryMuscleGroup: string;
  movementPattern: MovementPattern;
  status: ProgressionStatus;
  sessionsCount: number;
  currentBestE1rmKg: number;
  previousE1rmKg: number;
  e1rmChangePct: number;
  currentMaxWeightKg: number;
  latestSession: ExerciseSessionPoint | null;
  history: ExerciseSessionPoint[];
  nextTargetWeightKg: number;
  nextTargetReps: string;
  recommendationReason: string;
}

export interface MuscleVolumeSummary {
  muscleGroup: string;
  weeklyWorkingSets: number;
  last3WorkoutsSets: number;
  thirtyDaysSets?: number;
  recommendedMinSets: number;
  recommendedMaxSets: number;
  status: "optimal" | "under" | "high";
}

export interface PatternCoverageItem {
  pattern: MovementPattern;
  setsInLast3Workouts: number;
  targetSetsPer3Workouts: number;
  lastPerformedDate: string | null;
  lastExerciseTitle: string | null;
  status: "covered" | "underworked";
}

export interface RecentWorkoutDetailed {
  id: string;
  title: string;
  routine_id: string | null;
  start_time: string;
  duration_seconds: number;
  total_volume_kg: number;
  total_working_sets: number;
  isFullBody: boolean;
  patternsCovered: MovementPattern[];
  exercises: Array<{
    exercise_template_id: string;
    title: string;
    primary_muscle_group: string;
    movementPattern: MovementPattern;
    working_sets_count: number;
    best_e1rm_kg: number;
    max_weight_kg: number;
    topSetSummary: string;
    sets: Array<{
      index: number;
      type: string;
      weight_kg: number | null;
      reps: number | null;
      rpe: number | null;
    }>;
  }>;
}

export interface LastThreeWorkoutsAnalysis {
  detectedStyle: "full_body_rotation" | "split_rotation";
  headline: string;
  last3Workouts: RecentWorkoutDetailed[];
  patternCoverage: PatternCoverageItem[];
  underworkedMuscles: string[];
  underworkedPatterns: MovementPattern[];
  recommendedBaseSource: {
    type: "routine" | "workout_3_sessions_ago";
    id: string;
    title: string;
    reason: string;
  };
}

export interface SplitRoutineWithExercises {
  id: string;
  title: string;
  notes: string | null;
  split_order: number;
  is_active_in_split: boolean;
  is_ai_target_routine: boolean;
  exercises: Array<{
    id?: number;
    exercise_template_id: string;
    index: number;
    title: string;
    primary_muscle_group?: string;
    movementPattern?: MovementPattern;
    rest_seconds: number;
    notes: string | null;
    target_rep_min: number;
    target_rep_max: number;
    weight_increment_kg: number;
    target_rpe: number;
    progression_rule: string;
    target_sets: Array<{
      type: string;
      weight_kg: number | null;
      reps: number | null;
    }>;
  }>;
}

export interface DashboardAnalyticsPayload {
  isDemoMode: boolean;
  lastSyncAt: string | null;
  aiTargetRoutineId: string | null;
  summary: {
    totalWorkoutsCount: number;
    workoutsLast7Days: number;
    workoutsLast30Days: number;
    totalVolumeLast7DaysKg: number;
    progressingLiftsCount: number;
    plateauedLiftsCount: number;
    regressingLiftsCount: number;
  };
  nextSplitRoutine: SplitRoutineWithExercises | null;
  lastCompletedWorkout: {
    id: string;
    title: string;
    start_time: string;
    duration_seconds: number;
    total_volume_kg: number;
    total_working_sets: number;
  } | null;
  lastThreeAnalysis: LastThreeWorkoutsAnalysis;
  exerciseReports: ExerciseProgressionReport[];
  muscleVolumes: MuscleVolumeSummary[];
  recentWorkouts: Array<{
    id: string;
    title: string;
    start_time: string;
    duration_seconds: number;
    total_volume_kg: number;
    total_working_sets: number;
    exerciseCount: number;
    prCount: number;
  }>;
  routines: SplitRoutineWithExercises[];
}

export function classifyMovementPattern(
  title: string,
  primaryMuscle: string
): MovementPattern {
  const t = title.toLowerCase();
  const m = primaryMuscle.toLowerCase();

  if (
    t.includes("rdl") ||
    t.includes("romanian") ||
    t.includes("deadlift") ||
    t.includes("hip thrust") ||
    t.includes("good morning") ||
    t.includes("leg curl") ||
    t.includes("hamstring") ||
    m.includes("hamstring") ||
    m.includes("glute")
  ) {
    return "Hip-Hinge (Posterior)";
  }

  if (
    t.includes("squat") ||
    t.includes("leg press") ||
    t.includes("lunge") ||
    t.includes("split squat") ||
    t.includes("leg extension") ||
    t.includes("hack") ||
    m.includes("quad")
  ) {
    return "Knee-Dominant (Quads)";
  }

  if (
    t.includes("overhead") ||
    t.includes("shoulder press") ||
    t.includes("military") ||
    t.includes("arnold") ||
    t.includes("lateral raise") ||
    t.includes("upright row") ||
    m.includes("shoulder")
  ) {
    return "Vertical Push (Shoulders)";
  }

  if (
    t.includes("bench") ||
    t.includes("chest press") ||
    t.includes("push up") ||
    t.includes("push-up") ||
    t.includes("dip") ||
    t.includes("fly") ||
    t.includes("pec") ||
    m.includes("chest")
  ) {
    return "Horizontal Push (Chest)";
  }

  if (
    t.includes("pulldown") ||
    t.includes("pull-up") ||
    t.includes("pull up") ||
    t.includes("chin-up") ||
    t.includes("chin up") ||
    m.includes("lat")
  ) {
    return "Vertical Pull (Lats)";
  }

  if (
    t.includes("row") ||
    t.includes("face pull") ||
    t.includes("rear delt") ||
    m.includes("upper_back") ||
    m.includes("back") ||
    m.includes("trap")
  ) {
    return "Horizontal Pull (Upper Back)";
  }

  return "Arms & Core (Accessory)";
}

export function getDemoAnalyticsPayload(): DashboardAnalyticsPayload {
  const routines: SplitRoutineWithExercises[] = [
    {
      id: "demo-fb-a",
      title: "Full Body A (Squat + Bench + Row Focus)",
      notes: "Heavy Squat & Horizontal Push/Pull + Hamstring & Delt accessories",
      split_order: 1,
      is_active_in_split: true,
      is_ai_target_routine: false,
      exercises: [
        {
          id: 1,
          exercise_template_id: "D04AC939",
          index: 0,
          title: "Squat (Barbell)",
          primary_muscle_group: "quadriceps",
          movementPattern: "Knee-Dominant (Quads)",
          rest_seconds: 180,
          notes: "Full depth below parallel",
          target_rep_min: 5,
          target_rep_max: 8,
          weight_increment_kg: 2.5,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: [
            { type: "warmup", weight_kg: 80, reps: 6 },
            { type: "normal", weight_kg: 115, reps: 6 },
            { type: "normal", weight_kg: 115, reps: 6 },
            { type: "normal", weight_kg: 115, reps: 6 },
          ],
        },
        {
          id: 2,
          exercise_template_id: "79D0BB3A",
          index: 1,
          title: "Bench Press (Barbell)",
          primary_muscle_group: "chest",
          movementPattern: "Horizontal Push (Chest)",
          rest_seconds: 150,
          notes: "1s pause on chest",
          target_rep_min: 6,
          target_rep_max: 8,
          weight_increment_kg: 2.5,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: [
            { type: "warmup", weight_kg: 60, reps: 8 },
            { type: "normal", weight_kg: 85, reps: 8 },
            { type: "normal", weight_kg: 85, reps: 8 },
            { type: "normal", weight_kg: 85, reps: 8 },
          ],
        },
        {
          id: 3,
          exercise_template_id: "55E6546F",
          index: 2,
          title: "Barbell Row (Pendlay)",
          primary_muscle_group: "upper_back",
          movementPattern: "Horizontal Pull (Upper Back)",
          rest_seconds: 150,
          notes: "Controlled eccentric",
          target_rep_min: 8,
          target_rep_max: 10,
          weight_increment_kg: 2.5,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 80, reps: 8 },
            { type: "normal", weight_kg: 80, reps: 8 },
            { type: "normal", weight_kg: 80, reps: 8 },
          ],
        },
        {
          id: 4,
          exercise_template_id: "B823A91C",
          index: 3,
          title: "Seated Leg Curl (Machine)",
          primary_muscle_group: "hamstrings",
          movementPattern: "Hip-Hinge (Posterior)",
          rest_seconds: 90,
          notes: "1s squeeze at bottom",
          target_rep_min: 10,
          target_rep_max: 15,
          weight_increment_kg: 2.5,
          target_rpe: 9.0,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 55, reps: 12 },
            { type: "normal", weight_kg: 55, reps: 12 },
          ],
        },
        {
          id: 5,
          exercise_template_id: "422B08F1",
          index: 4,
          title: "Lateral Raise (Dumbbell)",
          primary_muscle_group: "shoulders",
          movementPattern: "Vertical Push (Shoulders)",
          rest_seconds: 75,
          notes: "Lead with elbows",
          target_rep_min: 12,
          target_rep_max: 15,
          weight_increment_kg: 1.0,
          target_rpe: 9.0,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 14, reps: 15 },
            { type: "normal", weight_kg: 14, reps: 14 },
            { type: "normal", weight_kg: 14, reps: 12 },
          ],
        },
      ],
    },
    {
      id: "demo-fb-b",
      title: "Full Body B (RDL + Overhead Press + Lat Pulldown)",
      notes: "Posterior Chain Hinge + Vertical Push/Pull + Quad & Arm work",
      split_order: 2,
      is_active_in_split: true,
      is_ai_target_routine: false,
      exercises: [
        {
          id: 6,
          exercise_template_id: "2B4B7310",
          index: 0,
          title: "Romanian Deadlift (Barbell)",
          primary_muscle_group: "hamstrings",
          movementPattern: "Hip-Hinge (Posterior)",
          rest_seconds: 150,
          notes: "Hips back, feel deep hamstring stretch",
          target_rep_min: 8,
          target_rep_max: 10,
          weight_increment_kg: 2.5,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 105, reps: 9 },
            { type: "normal", weight_kg: 105, reps: 9 },
            { type: "normal", weight_kg: 105, reps: 8 },
          ],
        },
        {
          id: 7,
          exercise_template_id: "6A6C31A5",
          index: 1,
          title: "Lat Pulldown (Cable)",
          primary_muscle_group: "lats",
          movementPattern: "Vertical Pull (Lats)",
          rest_seconds: 120,
          notes: "Drive elbows to hips",
          target_rep_min: 8,
          target_rep_max: 12,
          weight_increment_kg: 2.5,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 70, reps: 10 },
            { type: "normal", weight_kg: 70, reps: 10 },
            { type: "normal", weight_kg: 70, reps: 9 },
          ],
        },
        {
          id: 8,
          exercise_template_id: "8E9A12B4",
          index: 2,
          title: "Overhead Press (Barbell)",
          primary_muscle_group: "shoulders",
          movementPattern: "Vertical Push (Shoulders)",
          rest_seconds: 150,
          notes: "Brace glutes and abs",
          target_rep_min: 6,
          target_rep_max: 8,
          weight_increment_kg: 2.5,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 52.5, reps: 7 },
            { type: "normal", weight_kg: 52.5, reps: 7 },
            { type: "normal", weight_kg: 52.5, reps: 6 },
          ],
        },
        {
          id: 9,
          exercise_template_id: "3C91F8D2",
          index: 3,
          title: "Bulgarian Split Squat (Dumbbell)",
          primary_muscle_group: "quadriceps",
          movementPattern: "Knee-Dominant (Quads)",
          rest_seconds: 120,
          notes: "Slight forward torso lean",
          target_rep_min: 8,
          target_rep_max: 12,
          weight_increment_kg: 2.0,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 24, reps: 10 },
            { type: "normal", weight_kg: 24, reps: 10 },
            { type: "normal", weight_kg: 24, reps: 10 },
          ],
        },
      ],
    },
    {
      id: "demo-fb-c",
      title: "Full Body C (Leg Press + Incline DB + Cable Row)",
      notes: "Hypertrophy focus with reduced spinal axial loading",
      split_order: 3,
      is_active_in_split: true,
      is_ai_target_routine: false,
      exercises: [
        {
          id: 10,
          exercise_template_id: "1F77D901",
          index: 0,
          title: "Leg Press (Machine)",
          primary_muscle_group: "quadriceps",
          movementPattern: "Knee-Dominant (Quads)",
          rest_seconds: 150,
          notes: "Controlled descent, don't lock knees",
          target_rep_min: 10,
          target_rep_max: 12,
          weight_increment_kg: 5.0,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 180, reps: 12 },
            { type: "normal", weight_kg: 180, reps: 11 },
            { type: "normal", weight_kg: 180, reps: 10 },
          ],
        },
        {
          id: 11,
          exercise_template_id: "50DFDFAB",
          index: 1,
          title: "Incline Bench Press (Dumbbell)",
          primary_muscle_group: "chest",
          movementPattern: "Horizontal Push (Chest)",
          rest_seconds: 120,
          notes: "30-degree angle, full stretch",
          target_rep_min: 8,
          target_rep_max: 12,
          weight_increment_kg: 2.0,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 32, reps: 10 },
            { type: "normal", weight_kg: 32, reps: 10 },
            { type: "normal", weight_kg: 32, reps: 9 },
          ],
        },
        {
          id: 12,
          exercise_template_id: "7A91E04C",
          index: 2,
          title: "Seated Cable Row",
          primary_muscle_group: "upper_back",
          movementPattern: "Horizontal Pull (Upper Back)",
          rest_seconds: 120,
          notes: "Full stretch forward on eccentric",
          target_rep_min: 10,
          target_rep_max: 12,
          weight_increment_kg: 2.5,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 65, reps: 11 },
            { type: "normal", weight_kg: 65, reps: 11 },
            { type: "normal", weight_kg: 65, reps: 10 },
          ],
        },
        {
          id: 13,
          exercise_template_id: "93A552C6",
          index: 3,
          title: "Triceps Rope Pushdown",
          primary_muscle_group: "triceps",
          movementPattern: "Arms & Core (Accessory)",
          rest_seconds: 75,
          notes: "Spread rope at bottom",
          target_rep_min: 10,
          target_rep_max: 15,
          weight_increment_kg: 2.5,
          target_rpe: 9.0,
          progression_rule: "double_progression",
          target_sets: [
            { type: "normal", weight_kg: 27.5, reps: 12 },
            { type: "normal", weight_kg: 27.5, reps: 12 },
            { type: "normal", weight_kg: 27.5, reps: 11 },
          ],
        },
      ],
    },
  ];

  const last3Workouts: RecentWorkoutDetailed[] = [
    {
      id: "w-fb-c",
      title: "Full Body C (Leg Press + Incline DB + Cable Row)",
      routine_id: "demo-fb-c",
      start_time: "2026-11-18T17:30:00Z",
      duration_seconds: 3900,
      total_volume_kg: 11420,
      total_working_sets: 12,
      isFullBody: true,
      patternsCovered: [
        "Knee-Dominant (Quads)",
        "Horizontal Push (Chest)",
        "Horizontal Pull (Upper Back)",
        "Arms & Core (Accessory)",
      ],
      exercises: [
        {
          exercise_template_id: "1F77D901",
          title: "Leg Press (Machine)",
          primary_muscle_group: "quadriceps",
          movementPattern: "Knee-Dominant (Quads)",
          working_sets_count: 3,
          best_e1rm_kg: 252.0,
          max_weight_kg: 180,
          topSetSummary: "180 kg × 12 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 180, reps: 12, rpe: 8.5 },
            { index: 1, type: "normal", weight_kg: 180, reps: 11, rpe: 8.5 },
            { index: 2, type: "normal", weight_kg: 180, reps: 10, rpe: 9.0 },
          ],
        },
        {
          exercise_template_id: "50DFDFAB",
          title: "Incline Bench Press (Dumbbell)",
          primary_muscle_group: "chest",
          movementPattern: "Horizontal Push (Chest)",
          working_sets_count: 3,
          best_e1rm_kg: 42.67,
          max_weight_kg: 32,
          topSetSummary: "32 kg × 10 @ RPE 9",
          sets: [
            { index: 0, type: "normal", weight_kg: 32, reps: 10, rpe: 9.0 },
            { index: 1, type: "normal", weight_kg: 32, reps: 10, rpe: 9.0 },
            { index: 2, type: "normal", weight_kg: 32, reps: 9, rpe: 9.5 },
          ],
        },
        {
          exercise_template_id: "7A91E04C",
          title: "Seated Cable Row",
          primary_muscle_group: "upper_back",
          movementPattern: "Horizontal Pull (Upper Back)",
          working_sets_count: 3,
          best_e1rm_kg: 88.83,
          max_weight_kg: 65,
          topSetSummary: "65 kg × 11 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 65, reps: 11, rpe: 8.5 },
            { index: 1, type: "normal", weight_kg: 65, reps: 11, rpe: 8.5 },
            { index: 2, type: "normal", weight_kg: 65, reps: 10, rpe: 9.0 },
          ],
        },
        {
          exercise_template_id: "93A552C6",
          title: "Triceps Rope Pushdown",
          primary_muscle_group: "triceps",
          movementPattern: "Arms & Core (Accessory)",
          working_sets_count: 3,
          best_e1rm_kg: 38.5,
          max_weight_kg: 27.5,
          topSetSummary: "27.5 kg × 12 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 27.5, reps: 12, rpe: 8.5 },
            { index: 1, type: "normal", weight_kg: 27.5, reps: 12, rpe: 8.5 },
            { index: 2, type: "normal", weight_kg: 27.5, reps: 11, rpe: 9.0 },
          ],
        },
      ],
    },
    {
      id: "w-fb-b",
      title: "Full Body B (RDL + Overhead Press + Lat Pulldown)",
      routine_id: "demo-fb-b",
      start_time: "2026-11-16T18:00:00Z",
      duration_seconds: 3720,
      total_volume_kg: 8740,
      total_working_sets: 12,
      isFullBody: true,
      patternsCovered: [
        "Hip-Hinge (Posterior)",
        "Vertical Pull (Lats)",
        "Vertical Push (Shoulders)",
        "Knee-Dominant (Quads)",
      ],
      exercises: [
        {
          exercise_template_id: "2B4B7310",
          title: "Romanian Deadlift (Barbell)",
          primary_muscle_group: "hamstrings",
          movementPattern: "Hip-Hinge (Posterior)",
          working_sets_count: 3,
          best_e1rm_kg: 136.5,
          max_weight_kg: 105,
          topSetSummary: "105 kg × 9 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 105, reps: 9, rpe: 8.5 },
            { index: 1, type: "normal", weight_kg: 105, reps: 9, rpe: 8.5 },
            { index: 2, type: "normal", weight_kg: 105, reps: 8, rpe: 9.0 },
          ],
        },
        {
          exercise_template_id: "6A6C31A5",
          title: "Lat Pulldown (Cable)",
          primary_muscle_group: "lats",
          movementPattern: "Vertical Pull (Lats)",
          working_sets_count: 3,
          best_e1rm_kg: 93.33,
          max_weight_kg: 70,
          topSetSummary: "70 kg × 10 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 70, reps: 10, rpe: 8.5 },
            { index: 1, type: "normal", weight_kg: 70, reps: 10, rpe: 8.5 },
            { index: 2, type: "normal", weight_kg: 70, reps: 9, rpe: 9.0 },
          ],
        },
        {
          exercise_template_id: "8E9A12B4",
          title: "Overhead Press (Barbell)",
          primary_muscle_group: "shoulders",
          movementPattern: "Vertical Push (Shoulders)",
          working_sets_count: 3,
          best_e1rm_kg: 64.75,
          max_weight_kg: 52.5,
          topSetSummary: "52.5 kg × 7 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 52.5, reps: 7, rpe: 8.5 },
            { index: 1, type: "normal", weight_kg: 52.5, reps: 7, rpe: 8.5 },
            { index: 2, type: "normal", weight_kg: 52.5, reps: 6, rpe: 9.0 },
          ],
        },
        {
          exercise_template_id: "3C91F8D2",
          title: "Bulgarian Split Squat (Dumbbell)",
          primary_muscle_group: "quadriceps",
          movementPattern: "Knee-Dominant (Quads)",
          working_sets_count: 3,
          best_e1rm_kg: 32.0,
          max_weight_kg: 24,
          topSetSummary: "24 kg × 10 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 24, reps: 10, rpe: 8.5 },
            { index: 1, type: "normal", weight_kg: 24, reps: 10, rpe: 8.5 },
            { index: 2, type: "normal", weight_kg: 24, reps: 10, rpe: 9.0 },
          ],
        },
      ],
    },
    {
      id: "w-fb-a",
      title: "Full Body A (Squat + Bench + Row Focus)",
      routine_id: "demo-fb-a",
      start_time: "2026-11-14T16:45:00Z",
      duration_seconds: 3840,
      total_volume_kg: 9290,
      total_working_sets: 14,
      isFullBody: true,
      patternsCovered: [
        "Knee-Dominant (Quads)",
        "Horizontal Push (Chest)",
        "Horizontal Pull (Upper Back)",
        "Hip-Hinge (Posterior)",
        "Vertical Push (Shoulders)",
      ],
      exercises: [
        {
          exercise_template_id: "D04AC939",
          title: "Squat (Barbell)",
          primary_muscle_group: "quadriceps",
          movementPattern: "Knee-Dominant (Quads)",
          working_sets_count: 3,
          best_e1rm_kg: 138.0,
          max_weight_kg: 115,
          topSetSummary: "115 kg × 6 @ RPE 8",
          sets: [
            { index: 0, type: "normal", weight_kg: 115, reps: 6, rpe: 8.0 },
            { index: 1, type: "normal", weight_kg: 115, reps: 6, rpe: 8.0 },
            { index: 2, type: "normal", weight_kg: 115, reps: 6, rpe: 8.5 },
          ],
        },
        {
          exercise_template_id: "79D0BB3A",
          title: "Bench Press (Barbell)",
          primary_muscle_group: "chest",
          movementPattern: "Horizontal Push (Chest)",
          working_sets_count: 3,
          best_e1rm_kg: 107.67,
          max_weight_kg: 85,
          topSetSummary: "85 kg × 8 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 85, reps: 8, rpe: 8.0 },
            { index: 1, type: "normal", weight_kg: 85, reps: 8, rpe: 8.5 },
            { index: 2, type: "normal", weight_kg: 85, reps: 8, rpe: 9.0 },
          ],
        },
        {
          exercise_template_id: "55E6546F",
          title: "Barbell Row (Pendlay)",
          primary_muscle_group: "upper_back",
          movementPattern: "Horizontal Pull (Upper Back)",
          working_sets_count: 3,
          best_e1rm_kg: 101.33,
          max_weight_kg: 80,
          topSetSummary: "80 kg × 8 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 80, reps: 8, rpe: 8.0 },
            { index: 1, type: "normal", weight_kg: 80, reps: 8, rpe: 8.5 },
            { index: 2, type: "normal", weight_kg: 80, reps: 8, rpe: 8.5 },
          ],
        },
        {
          exercise_template_id: "B823A91C",
          title: "Seated Leg Curl (Machine)",
          primary_muscle_group: "hamstrings",
          movementPattern: "Hip-Hinge (Posterior)",
          working_sets_count: 2,
          best_e1rm_kg: 77.0,
          max_weight_kg: 55,
          topSetSummary: "55 kg × 12 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 55, reps: 12, rpe: 8.5 },
            { index: 1, type: "normal", weight_kg: 55, reps: 12, rpe: 9.0 },
          ],
        },
        {
          exercise_template_id: "422B08F1",
          title: "Lateral Raise (Dumbbell)",
          primary_muscle_group: "shoulders",
          movementPattern: "Vertical Push (Shoulders)",
          working_sets_count: 3,
          best_e1rm_kg: 21.0,
          max_weight_kg: 14,
          topSetSummary: "14 kg × 15 @ RPE 8.5",
          sets: [
            { index: 0, type: "normal", weight_kg: 14, reps: 15, rpe: 8.5 },
            { index: 1, type: "normal", weight_kg: 14, reps: 14, rpe: 9.0 },
            { index: 2, type: "normal", weight_kg: 14, reps: 12, rpe: 9.5 },
          ],
        },
      ],
    },
  ];

  const patternCoverage: PatternCoverageItem[] = [
    {
      pattern: "Knee-Dominant (Quads)",
      setsInLast3Workouts: 9,
      targetSetsPer3Workouts: 8,
      lastPerformedDate: "2026-11-18",
      lastExerciseTitle: "Leg Press (Machine)",
      status: "covered",
    },
    {
      pattern: "Horizontal Push (Chest)",
      setsInLast3Workouts: 6,
      targetSetsPer3Workouts: 6,
      lastPerformedDate: "2026-11-18",
      lastExerciseTitle: "Incline Bench Press (Dumbbell)",
      status: "covered",
    },
    {
      pattern: "Horizontal Pull (Upper Back)",
      setsInLast3Workouts: 6,
      targetSetsPer3Workouts: 6,
      lastPerformedDate: "2026-11-18",
      lastExerciseTitle: "Seated Cable Row",
      status: "covered",
    },
    {
      pattern: "Vertical Push (Shoulders)",
      setsInLast3Workouts: 6,
      targetSetsPer3Workouts: 6,
      lastPerformedDate: "2026-11-16",
      lastExerciseTitle: "Overhead Press (Barbell)",
      status: "covered",
    },
    {
      pattern: "Hip-Hinge (Posterior)",
      setsInLast3Workouts: 5,
      targetSetsPer3Workouts: 6,
      lastPerformedDate: "2026-11-16",
      lastExerciseTitle: "Romanian Deadlift (Barbell)",
      status: "underworked",
    },
    {
      pattern: "Vertical Pull (Lats)",
      setsInLast3Workouts: 3,
      targetSetsPer3Workouts: 6,
      lastPerformedDate: "2026-11-16",
      lastExerciseTitle: "Lat Pulldown (Cable)",
      status: "underworked",
    },
    {
      pattern: "Arms & Core (Accessory)",
      setsInLast3Workouts: 3,
      targetSetsPer3Workouts: 6,
      lastPerformedDate: "2026-11-18",
      lastExerciseTitle: "Triceps Rope Pushdown",
      status: "underworked",
    },
  ];

  const exerciseReports: ExerciseProgressionReport[] = [
    {
      exerciseTemplateId: "D04AC939",
      title: "Squat (Barbell)",
      primaryMuscleGroup: "quadriceps",
      movementPattern: "Knee-Dominant (Quads)",
      status: "progressing",
      sessionsCount: 5,
      currentBestE1rmKg: 138.0,
      previousE1rmKg: 128.33,
      e1rmChangePct: 7.5,
      currentMaxWeightKg: 115,
      nextTargetWeightKg: 115,
      nextTargetReps: "3 × 7",
      recommendationReason:
        "Strong upward trend (+7.5% e1RM). Hit 115kg × 6, 6, 6 @ RPE 8 in Full Body A (3 workouts ago). Keep 115kg today and push for 7, 7, 6–7 reps.",
      latestSession: {
        workoutId: "w-fb-a",
        workoutTitle: "Full Body A",
        date: "2026-11-14",
        bestE1rmKg: 138.0,
        maxWeightKg: 115,
        volumeKg: 2070,
        avgRpe: 8.2,
        topSetSummary: "115 kg × 6 @ RPE 8",
        sets: [
          { index: 0, type: "normal", weight_kg: 115, reps: 6, rpe: 8, e1rm_kg: 138.0, is_pr: true },
          { index: 1, type: "normal", weight_kg: 115, reps: 6, rpe: 8, e1rm_kg: 138.0, is_pr: false },
          { index: 2, type: "normal", weight_kg: 115, reps: 6, rpe: 8.5, e1rm_kg: 138.0, is_pr: false },
        ],
      },
      history: [
        { workoutId: "w-l1", workoutTitle: "Full Body A", date: "2026-10-18", bestE1rmKg: 128.33, maxWeightKg: 107.5, volumeKg: 1935, avgRpe: 8.0, topSetSummary: "107.5 kg × 6", sets: [] },
        { workoutId: "w-l2", workoutTitle: "Full Body A", date: "2026-10-25", bestE1rmKg: 132.0, maxWeightKg: 110, volumeKg: 1980, avgRpe: 8.0, topSetSummary: "110 kg × 6", sets: [] },
        { workoutId: "w-l3", workoutTitle: "Full Body A", date: "2026-11-01", bestE1rmKg: 135.67, maxWeightKg: 110, volumeKg: 2310, avgRpe: 8.5, topSetSummary: "110 kg × 7", sets: [] },
        { workoutId: "w-l4", workoutTitle: "Full Body A", date: "2026-11-08", bestE1rmKg: 135.13, maxWeightKg: 112.5, volumeKg: 2025, avgRpe: 8.0, topSetSummary: "112.5 kg × 6", sets: [] },
        { workoutId: "w-fb-a", workoutTitle: "Full Body A", date: "2026-11-14", bestE1rmKg: 138.0, maxWeightKg: 115, volumeKg: 2070, avgRpe: 8.2, topSetSummary: "115 kg × 6", sets: [] },
      ],
    },
    {
      exerciseTemplateId: "79D0BB3A",
      title: "Bench Press (Barbell)",
      primaryMuscleGroup: "chest",
      movementPattern: "Horizontal Push (Chest)",
      status: "progressing",
      sessionsCount: 6,
      currentBestE1rmKg: 107.67,
      previousE1rmKg: 99.17,
      e1rmChangePct: 8.6,
      currentMaxWeightKg: 85,
      nextTargetWeightKg: 87.5,
      nextTargetReps: "3 × 6–7",
      recommendationReason:
        "You hit the top of your 6–8 rep range on all 3 working sets (85kg × 8, 8, 8 @ RPE 8.5) in Full Body A. Time to graduate to 87.5kg for 3 sets of 6–7 reps.",
      latestSession: {
        workoutId: "w-fb-a",
        workoutTitle: "Full Body A",
        date: "2026-11-14",
        bestE1rmKg: 107.67,
        maxWeightKg: 85,
        volumeKg: 2040,
        avgRpe: 8.5,
        topSetSummary: "85 kg × 8 @ RPE 8.5",
        sets: [
          { index: 0, type: "normal", weight_kg: 85, reps: 8, rpe: 8, e1rm_kg: 107.67, is_pr: true },
          { index: 1, type: "normal", weight_kg: 85, reps: 8, rpe: 8.5, e1rm_kg: 107.67, is_pr: false },
          { index: 2, type: "normal", weight_kg: 85, reps: 8, rpe: 9, e1rm_kg: 107.67, is_pr: false },
        ],
      },
      history: [
        { workoutId: "w-1", workoutTitle: "Full Body A", date: "2026-10-10", bestE1rmKg: 99.17, maxWeightKg: 80, volumeKg: 1680, avgRpe: 8.5, topSetSummary: "80 kg × 7", sets: [] },
        { workoutId: "w-2", workoutTitle: "Full Body A", date: "2026-10-17", bestE1rmKg: 101.33, maxWeightKg: 80, volumeKg: 1840, avgRpe: 8.5, topSetSummary: "80 kg × 8", sets: [] },
        { workoutId: "w-3", workoutTitle: "Full Body A", date: "2026-10-24", bestE1rmKg: 102.0, maxWeightKg: 82.5, volumeKg: 1732.5, avgRpe: 8.5, topSetSummary: "82.5 kg × 7", sets: [] },
        { workoutId: "w-4", workoutTitle: "Full Body A", date: "2026-10-31", bestE1rmKg: 104.5, maxWeightKg: 82.5, volumeKg: 1980, avgRpe: 8.0, topSetSummary: "82.5 kg × 8", sets: [] },
        { workoutId: "w-5", workoutTitle: "Full Body A", date: "2026-11-07", bestE1rmKg: 104.83, maxWeightKg: 85, volumeKg: 1870, avgRpe: 8.5, topSetSummary: "85 kg × 7", sets: [] },
        { workoutId: "w-fb-a", workoutTitle: "Full Body A", date: "2026-11-14", bestE1rmKg: 107.67, maxWeightKg: 85, volumeKg: 2040, avgRpe: 8.5, topSetSummary: "85 kg × 8", sets: [] },
      ],
    },
    {
      exerciseTemplateId: "50DFDFAB",
      title: "Incline Bench Press (Dumbbell)",
      primaryMuscleGroup: "chest",
      movementPattern: "Horizontal Push (Chest)",
      status: "plateaued",
      sessionsCount: 5,
      currentBestE1rmKg: 42.67,
      previousE1rmKg: 42.67,
      e1rmChangePct: 0.0,
      currentMaxWeightKg: 32,
      nextTargetWeightKg: 32,
      nextTargetReps: "11, 10, 10",
      recommendationReason:
        "Plateau detected in Full Body C: stuck at 32kg × 10, 10, 9 for the last 3 exposures with RPE creeping up to 9.5.",
      latestSession: {
        workoutId: "w-fb-c",
        workoutTitle: "Full Body C",
        date: "2026-11-18",
        bestE1rmKg: 42.67,
        maxWeightKg: 32,
        volumeKg: 928,
        avgRpe: 9.2,
        topSetSummary: "32 kg × 10 @ RPE 9",
        sets: [
          { index: 0, type: "normal", weight_kg: 32, reps: 10, rpe: 9, e1rm_kg: 42.67, is_pr: false },
          { index: 1, type: "normal", weight_kg: 32, reps: 10, rpe: 9, e1rm_kg: 42.67, is_pr: false },
          { index: 2, type: "normal", weight_kg: 32, reps: 9, rpe: 9.5, e1rm_kg: 41.6, is_pr: false },
        ],
      },
      history: [
        { workoutId: "w-2", workoutTitle: "Full Body C", date: "2026-10-21", bestE1rmKg: 41.0, maxWeightKg: 30, volumeKg: 930, avgRpe: 8.5, topSetSummary: "30 kg × 11", sets: [] },
        { workoutId: "w-3", workoutTitle: "Full Body C", date: "2026-10-28", bestE1rmKg: 42.0, maxWeightKg: 30, volumeKg: 1080, avgRpe: 8.5, topSetSummary: "30 kg × 12", sets: [] },
        { workoutId: "w-4", workoutTitle: "Full Body C", date: "2026-11-04", bestE1rmKg: 42.67, maxWeightKg: 32, volumeKg: 928, avgRpe: 8.8, topSetSummary: "32 kg × 10", sets: [] },
        { workoutId: "w-5", workoutTitle: "Full Body C", date: "2026-11-11", bestE1rmKg: 42.67, maxWeightKg: 32, volumeKg: 928, avgRpe: 9.0, topSetSummary: "32 kg × 10", sets: [] },
        { workoutId: "w-fb-c", workoutTitle: "Full Body C", date: "2026-11-18", bestE1rmKg: 42.67, maxWeightKg: 32, volumeKg: 928, avgRpe: 9.2, topSetSummary: "32 kg × 10", sets: [] },
      ],
    },
    {
      exerciseTemplateId: "55E6546F",
      title: "Barbell Row (Pendlay)",
      primaryMuscleGroup: "upper_back",
      movementPattern: "Horizontal Pull (Upper Back)",
      status: "progressing",
      sessionsCount: 5,
      currentBestE1rmKg: 101.33,
      previousE1rmKg: 95.0,
      e1rmChangePct: 6.7,
      currentMaxWeightKg: 80,
      nextTargetWeightKg: 80,
      nextTargetReps: "3 × 9",
      recommendationReason:
        "Hit 80kg × 8, 8, 8 cleanly in Full Body A. Aim for 80kg × 9, 9, 8–9 today before jumping to 82.5kg.",
      latestSession: {
        workoutId: "w-fb-a",
        workoutTitle: "Full Body A",
        date: "2026-11-14",
        bestE1rmKg: 101.33,
        maxWeightKg: 80,
        volumeKg: 1920,
        avgRpe: 8.3,
        topSetSummary: "80 kg × 8 @ RPE 8.5",
        sets: [
          { index: 0, type: "normal", weight_kg: 80, reps: 8, rpe: 8, e1rm_kg: 101.33, is_pr: true },
          { index: 1, type: "normal", weight_kg: 80, reps: 8, rpe: 8.5, e1rm_kg: 101.33, is_pr: false },
          { index: 2, type: "normal", weight_kg: 80, reps: 8, rpe: 8.5, e1rm_kg: 101.33, is_pr: false },
        ],
      },
      history: [
        { workoutId: "w-p1", workoutTitle: "Full Body A", date: "2026-10-18", bestE1rmKg: 95.0, maxWeightKg: 75, volumeKg: 1800, avgRpe: 8.0, topSetSummary: "75 kg × 8", sets: [] },
        { workoutId: "w-p2", workoutTitle: "Full Body A", date: "2026-10-25", bestE1rmKg: 97.5, maxWeightKg: 75, volumeKg: 2025, avgRpe: 8.5, topSetSummary: "75 kg × 9", sets: [] },
        { workoutId: "w-p3", workoutTitle: "Full Body A", date: "2026-11-01", bestE1rmKg: 98.17, maxWeightKg: 77.5, volumeKg: 1860, avgRpe: 8.0, topSetSummary: "77.5 kg × 8", sets: [] },
        { workoutId: "w-p4", workoutTitle: "Full Body A", date: "2026-11-08", bestE1rmKg: 100.75, maxWeightKg: 77.5, volumeKg: 2092.5, avgRpe: 8.5, topSetSummary: "77.5 kg × 9", sets: [] },
        { workoutId: "w-fb-a", workoutTitle: "Full Body A", date: "2026-11-14", bestE1rmKg: 101.33, maxWeightKg: 80, volumeKg: 1920, avgRpe: 8.3, topSetSummary: "80 kg × 8", sets: [] },
      ],
    },
  ];

  const muscleVolumes: MuscleVolumeSummary[] = [
    { muscleGroup: "Quads", weeklyWorkingSets: 7, last3WorkoutsSets: 11, thirtyDaysSets: 28, recommendedMinSets: 6, recommendedMaxSets: 18, status: "optimal" },
    { muscleGroup: "Shoulders", weeklyWorkingSets: 6, last3WorkoutsSets: 9, thirtyDaysSets: 24, recommendedMinSets: 6, recommendedMaxSets: 18, status: "optimal" },
    { muscleGroup: "Chest", weeklyWorkingSets: 4, last3WorkoutsSets: 8, thirtyDaysSets: 22, recommendedMinSets: 6, recommendedMaxSets: 20, status: "optimal" },
    { muscleGroup: "Lats", weeklyWorkingSets: 8, last3WorkoutsSets: 8, thirtyDaysSets: 20, recommendedMinSets: 6, recommendedMaxSets: 18, status: "optimal" },
    { muscleGroup: "Calves", weeklyWorkingSets: 4, last3WorkoutsSets: 4, thirtyDaysSets: 10, recommendedMinSets: 6, recommendedMaxSets: 16, status: "under" },
    { muscleGroup: "Triceps", weeklyWorkingSets: 3, last3WorkoutsSets: 3, thirtyDaysSets: 9, recommendedMinSets: 6, recommendedMaxSets: 16, status: "under" },
    { muscleGroup: "Biceps", weeklyWorkingSets: 3, last3WorkoutsSets: 3, thirtyDaysSets: 9, recommendedMinSets: 6, recommendedMaxSets: 16, status: "under" },
    { muscleGroup: "Abs", weeklyWorkingSets: 0, last3WorkoutsSets: 3, thirtyDaysSets: 6, recommendedMinSets: 6, recommendedMaxSets: 16, status: "under" },
  ];

  return {
    isDemoMode: true,
    lastSyncAt: null,
    aiTargetRoutineId: null,
    summary: {
      totalWorkoutsCount: 18,
      workoutsLast7Days: 3,
      workoutsLast30Days: 14,
      totalVolumeLast7DaysKg: 29450,
      progressingLiftsCount: 3,
      plateauedLiftsCount: 1,
      regressingLiftsCount: 0,
    },
    nextSplitRoutine: routines[0],
    lastCompletedWorkout: {
      id: "w-fb-c",
      title: "Full Body C (Leg Press + Incline DB + Cable Row)",
      start_time: "2026-11-18T17:30:00Z",
      duration_seconds: 3900,
      total_volume_kg: 11420,
      total_working_sets: 12,
    },
    lastThreeAnalysis: {
      detectedStyle: "full_body_rotation",
      headline:
        "Your last 3 workouts were all Full Body sessions (Full Body A → Full Body B → Full Body C). In your 3-day Full Body rotation, Full Body A (from 3 sessions ago) is due up today, with extra attention needed on Lats, Hamstrings, and Biceps.",
      last3Workouts,
      patternCoverage,
      underworkedMuscles: ["Lats (3 sets)", "Hamstrings (5 sets)", "Biceps/Arms (3 sets)"],
      underworkedPatterns: [
        "Vertical Pull (Lats)",
        "Hip-Hinge (Posterior)",
        "Arms & Core (Accessory)",
      ],
      recommendedBaseSource: {
        type: "workout_3_sessions_ago",
        id: "w-fb-a",
        title: "Full Body A (Squat + Bench + Row Focus)",
        reason:
          "Cycles back to your Full Body A variation from 3 workouts ago while avoiding repeating Leg Press / Incline DB from your most recent session.",
      },
    },
    exerciseReports,
    muscleVolumes,
    recentWorkouts: [
      {
        id: "w-fb-c",
        title: "Full Body C (Leg Press + Incline DB + Cable Row)",
        start_time: "2026-11-18T17:30:00Z",
        duration_seconds: 3900,
        total_volume_kg: 11420,
        total_working_sets: 12,
        exerciseCount: 4,
        prCount: 1,
      },
      {
        id: "w-fb-b",
        title: "Full Body B (RDL + Overhead Press + Lat Pulldown)",
        start_time: "2026-11-16T18:00:00Z",
        duration_seconds: 3720,
        total_volume_kg: 8740,
        total_working_sets: 12,
        exerciseCount: 4,
        prCount: 1,
      },
      {
        id: "w-fb-a",
        title: "Full Body A (Squat + Bench + Row Focus)",
        start_time: "2026-11-14T16:45:00Z",
        duration_seconds: 3840,
        total_volume_kg: 9290,
        total_working_sets: 14,
        exerciseCount: 5,
        prCount: 2,
      },
    ],
    routines,
  };
}
