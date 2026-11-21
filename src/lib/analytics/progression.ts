import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  classifyMovementPattern,
  DashboardAnalyticsPayload,
  ExerciseProgressionReport,
  ExerciseSessionPoint,
  getDemoAnalyticsPayload,
  LastThreeWorkoutsAnalysis,
  MovementPattern,
  MuscleVolumeSummary,
  PatternCoverageItem,
  ProgressionStatus,
  RecentWorkoutDetailed,
  SplitRoutineWithExercises,
} from "./demo-data";

const ALL_MOVEMENT_PATTERNS: Array<{
  pattern: MovementPattern;
  targetSetsPer3Workouts: number;
}> = [
  { pattern: "Knee-Dominant (Quads)", targetSetsPer3Workouts: 6 },
  { pattern: "Hip-Hinge (Posterior)", targetSetsPer3Workouts: 6 },
  { pattern: "Horizontal Push (Chest)", targetSetsPer3Workouts: 6 },
  { pattern: "Vertical Push (Shoulders)", targetSetsPer3Workouts: 6 },
  { pattern: "Horizontal Pull (Upper Back)", targetSetsPer3Workouts: 6 },
  { pattern: "Vertical Pull (Lats)", targetSetsPer3Workouts: 6 },
  { pattern: "Arms & Core (Accessory)", targetSetsPer3Workouts: 6 },
];

function formatMuscleLabel(raw: string, title?: string): string {
  const lower = (raw || "").toLowerCase();
  if (lower.includes("quad")) return "Quads";
  if (lower.includes("hamstring")) return "Hamstrings";
  if (lower.includes("shoulder")) return "Shoulders";
  if (lower.includes("chest") || lower.includes("pec")) return "Chest";
  if (lower.includes("lat")) return "Lats";
  if (lower.includes("upper_back") || lower.includes("upper back") || lower.includes("trap"))
    return "Upper back";
  if (lower.includes("calf") || lower.includes("calves")) return "Calves";
  if (lower.includes("tricep")) return "Triceps";
  if (lower.includes("bicep")) return "Biceps";
  if (lower.includes("ab") || lower.includes("core")) return "Abs";

  if (title) {
    const t = title.toLowerCase();
    if (t.includes("calf") || t.includes("calves")) return "Calves";
    if (t.includes("tricep") || t.includes("pushdown") || t.includes("skull"))
      return "Triceps";
    if (t.includes("bicep") || (t.includes("curl") && !t.includes("leg curl")))
      return "Biceps";
    if (t.includes("plank") || t.includes("crunch") || t.includes("ab "))
      return "Abs";
  }

  if (!raw || lower === "other") {
    if (title) {
      const pattern = classifyMovementPattern(title, "other");
      switch (pattern) {
        case "Knee-Dominant (Quads)":
          return "Quads";
        case "Hip-Hinge (Posterior)":
          return "Hamstrings";
        case "Horizontal Push (Chest)":
          return "Chest";
        case "Vertical Push (Shoulders)":
          return "Shoulders";
        case "Horizontal Pull (Upper Back)":
          return "Upper back";
        case "Vertical Pull (Lats)":
          return "Lats";
        default:
          return "Triceps";
      }
    }
    return "Other";
  }
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isWorkoutFullBody(
  title: string,
  patterns: Set<MovementPattern>
): boolean {
  if (/full\s*body|\bfb\b/i.test(title)) return true;
  const hasLower =
    patterns.has("Knee-Dominant (Quads)") ||
    patterns.has("Hip-Hinge (Posterior)");
  const hasPush =
    patterns.has("Horizontal Push (Chest)") ||
    patterns.has("Vertical Push (Shoulders)");
  const hasPull =
    patterns.has("Horizontal Pull (Upper Back)") ||
    patterns.has("Vertical Pull (Lats)");
  return hasLower && (hasPush || hasPull);
}

export async function buildDashboardAnalytics(): Promise<DashboardAnalyticsPayload> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return getDemoAnalyticsPayload();
  }

  const { data: settingsRow, error: settingsErr } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (settingsErr) {
    return getDemoAnalyticsPayload();
  }

  const { data: workoutsData } = await supabase
    .from("workouts")
    .select("*")
    .order("start_time", { ascending: false })
    .limit(60);

  const { data: routinesData } = await supabase
    .from("routines")
    .select("*, routine_exercises(*)")
    .order("split_order", { ascending: true });

  if (
    (!workoutsData || workoutsData.length === 0) &&
    (!routinesData || routinesData.length === 0)
  ) {
    return getDemoAnalyticsPayload();
  }

  const { data: templatesData } = await supabase
    .from("exercise_templates")
    .select("*");

  const templateMap = new Map((templatesData || []).map((t) => [t.id, t]));

  // Format saved routines with ordered exercises & movement patterns
  const routines: SplitRoutineWithExercises[] = (routinesData || []).map(
    (r) => {
      const sortedEx = [...(r.routine_exercises || [])].sort(
        (a, b) => a.index - b.index
      );
      return {
        id: r.id,
        title: r.title,
        notes: r.notes,
        split_order: r.split_order,
        is_active_in_split: r.is_active_in_split,
        is_ai_target_routine: r.is_ai_target_routine,
        exercises: sortedEx.map((re) => {
          const tpl = templateMap.get(re.exercise_template_id);
          const title = re.title || tpl?.title || "Exercise";
          const primaryMuscle = tpl?.primary_muscle_group || "other";
          return {
            id: re.id,
            exercise_template_id: re.exercise_template_id,
            index: re.index,
            title,
            primary_muscle_group: primaryMuscle,
            movementPattern: classifyMovementPattern(title, primaryMuscle),
            rest_seconds: re.rest_seconds ?? 90,
            notes: re.notes,
            target_rep_min: re.target_rep_min ?? 8,
            target_rep_max: re.target_rep_max ?? 12,
            weight_increment_kg: Number(re.weight_increment_kg ?? 2.5),
            target_rpe: Number(re.target_rpe ?? 8.5),
            progression_rule: re.progression_rule || "double_progression",
            target_sets: Array.isArray(re.target_sets) ? re.target_sets : [],
          };
        }),
      };
    }
  );

  // Fetch workout_exercises and workout_sets for the retrieved workouts
  const workoutIds = (workoutsData || []).map((w) => w.id);
  const { data: workoutExercisesData } =
    workoutIds.length > 0
      ? await supabase
          .from("workout_exercises")
          .select("*, workout_sets(*)")
          .in("workout_id", workoutIds)
      : { data: [] };

  const workoutById = new Map((workoutsData || []).map((w) => [w.id, w]));

  // Group exercise sessions by exercise_template_id & by workout_id
  const sessionsByTemplate = new Map<string, ExerciseSessionPoint[]>();
  const exercisesByWorkoutId = new Map<string, typeof workoutExercisesData>();
  const prCountByWorkout = new Map<string, number>();
  const exCountByWorkout = new Map<string, number>();

  for (const we of workoutExercisesData || []) {
    const w = workoutById.get(we.workout_id);
    if (!w) continue;

    exCountByWorkout.set(w.id, (exCountByWorkout.get(w.id) || 0) + 1);
    const wList = exercisesByWorkoutId.get(w.id) || [];
    wList.push(we);
    exercisesByWorkoutId.set(w.id, wList);

    const sets = [...(we.workout_sets || [])]
      .sort((a, b) => a.index - b.index)
      .map((s) => {
        if (s.is_pr) {
          prCountByWorkout.set(w.id, (prCountByWorkout.get(w.id) || 0) + 1);
        }
        return {
          index: s.index,
          type: s.type,
          weight_kg: s.weight_kg !== null ? Number(s.weight_kg) : null,
          reps: s.reps !== null ? Number(s.reps) : null,
          rpe: s.rpe !== null ? Number(s.rpe) : null,
          e1rm_kg: Number(s.e1rm_kg || 0),
          is_pr: Boolean(s.is_pr),
        };
      });

    const workingSets = sets.filter((s) => s.type !== "warmup");
    const topSet =
      workingSets.reduce(
        (best, cur) => (cur.e1rm_kg > (best?.e1rm_kg || 0) ? cur : best),
        workingSets[0]
      ) || sets[0];

    const topSetSummary = topSet
      ? `${topSet.weight_kg ?? 0} kg × ${topSet.reps ?? 0}${
          topSet.rpe ? ` @ RPE ${topSet.rpe}` : ""
        }`
      : "No working sets";

    const point: ExerciseSessionPoint = {
      workoutId: w.id,
      workoutTitle: w.title,
      date: w.start_time.slice(0, 10),
      bestE1rmKg: Number(we.best_e1rm_kg || 0),
      maxWeightKg: Number(we.max_weight_kg || 0),
      volumeKg: Number(we.exercise_volume_kg || 0),
      avgRpe: we.avg_rpe !== null ? Number(we.avg_rpe) : null,
      topSetSummary,
      sets,
    };

    const arr = sessionsByTemplate.get(we.exercise_template_id) || [];
    arr.push(point);
    sessionsByTemplate.set(we.exercise_template_id, arr);
  }

  // Build detailed Last 3 Workouts breakdown
  const last3RawWorkouts = (workoutsData || []).slice(0, 3);
  const last3Workouts: RecentWorkoutDetailed[] = last3RawWorkouts.map((w) => {
    const rawExs = [...(exercisesByWorkoutId.get(w.id) || [])].sort(
      (a, b) => a.index - b.index
    );
    const patternsSet = new Set<MovementPattern>();

    const exercises = rawExs.map((we) => {
      const tpl = templateMap.get(we.exercise_template_id);
      const title = we.title || tpl?.title || "Exercise";
      const primaryMuscle = tpl?.primary_muscle_group || "other";
      const pattern = classifyMovementPattern(title, primaryMuscle);
      patternsSet.add(pattern);

      const sets = [...(we.workout_sets || [])]
        .sort((a, b) => a.index - b.index)
        .map((s) => ({
          index: s.index,
          type: s.type,
          weight_kg: s.weight_kg !== null ? Number(s.weight_kg) : null,
          reps: s.reps !== null ? Number(s.reps) : null,
          rpe: s.rpe !== null ? Number(s.rpe) : null,
        }));

      const workingSets = sets.filter((s) => s.type !== "warmup");
      const topSet = workingSets[0] || sets[0];
      const topSetSummary = topSet
        ? `${topSet.weight_kg ?? 0} kg × ${topSet.reps ?? 0}${
            topSet.rpe ? ` @ RPE ${topSet.rpe}` : ""
          }`
        : "N/A";

      return {
        exercise_template_id: we.exercise_template_id,
        title,
        primary_muscle_group: primaryMuscle,
        movementPattern: pattern,
        working_sets_count: Number(
          we.working_sets_count || workingSets.length || 0
        ),
        best_e1rm_kg: Number(we.best_e1rm_kg || 0),
        max_weight_kg: Number(we.max_weight_kg || 0),
        topSetSummary,
        sets,
      };
    });

    return {
      id: w.id,
      title: w.title,
      routine_id: w.routine_id || null,
      start_time: w.start_time,
      duration_seconds: Number(w.duration_seconds || 0),
      total_volume_kg: Number(w.total_volume_kg || 0),
      total_working_sets: Number(w.total_working_sets || 0),
      isFullBody: isWorkoutFullBody(w.title, patternsSet),
      patternsCovered: Array.from(patternsSet),
      exercises,
    };
  });

  // Compute Movement Pattern Coverage across the Last 3 Workouts
  const patternSetsMap = new Map<
    MovementPattern,
    { sets: number; lastDate: string | null; lastExercise: string | null }
  >();
  for (const item of ALL_MOVEMENT_PATTERNS) {
    patternSetsMap.set(item.pattern, {
      sets: 0,
      lastDate: null,
      lastExercise: null,
    });
  }

  const last3MuscleSets = new Map<string, number>();

  for (const w of last3Workouts) {
    const dateStr = w.start_time.slice(0, 10);
    for (const ex of w.exercises) {
      const entry = patternSetsMap.get(ex.movementPattern);
      if (entry) {
        entry.sets += ex.working_sets_count;
        if (!entry.lastDate) {
          entry.lastDate = dateStr;
          entry.lastExercise = ex.title;
        }
      }
      const mLabel = formatMuscleLabel(ex.primary_muscle_group, ex.title);
      last3MuscleSets.set(
        mLabel,
        (last3MuscleSets.get(mLabel) || 0) + ex.working_sets_count
      );
    }
  }

  const patternCoverage: PatternCoverageItem[] = ALL_MOVEMENT_PATTERNS.map(
    ({ pattern, targetSetsPer3Workouts }) => {
      const info = patternSetsMap.get(pattern)!;
      return {
        pattern,
        setsInLast3Workouts: info.sets,
        targetSetsPer3Workouts,
        lastPerformedDate: info.lastDate,
        lastExerciseTitle: info.lastExercise,
        status: info.sets >= targetSetsPer3Workouts ? "covered" : "underworked",
      };
    }
  );

  // Lookup custom progression rules from routine_exercises
  const ruleByTemplateId = new Map<
    string,
    { minRep: number; maxRep: number; incKg: number; targetRpe: number }
  >();
  for (const r of routines) {
    for (const ex of r.exercises) {
      if (!ruleByTemplateId.has(ex.exercise_template_id)) {
        ruleByTemplateId.set(ex.exercise_template_id, {
          minRep: ex.target_rep_min,
          maxRep: ex.target_rep_max,
          incKg: ex.weight_increment_kg,
          targetRpe: ex.target_rpe,
        });
      }
    }
  }

  // Build ExerciseProgressionReport for each exercise with history
  const exerciseReports: ExerciseProgressionReport[] = [];

  for (const [templateId, rawPoints] of sessionsByTemplate.entries()) {
    const history = [...rawPoints].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const recentHistory = history.slice(-8);
    const latest = recentHistory[recentHistory.length - 1] || null;
    const tpl = templateMap.get(templateId);
    const exTitle =
      tpl?.title ||
      (workoutExercisesData || []).find(
        (we) => we.exercise_template_id === templateId
      )?.title ||
      templateId;
    const primaryMuscleGroup = tpl?.primary_muscle_group || "other";
    const movementPattern = classifyMovementPattern(
      exTitle,
      primaryMuscleGroup
    );

    const rule = ruleByTemplateId.get(templateId) || {
      minRep: 8,
      maxRep: 12,
      incKg: 2.5,
      targetRpe: 8.5,
    };

    let status: ProgressionStatus = "building_baseline";
    let e1rmChangePct = 0;
    const currentBestE1rmKg = latest?.bestE1rmKg || 0;
    const baselineIdx = Math.max(0, recentHistory.length - 4);
    const previousE1rmKg =
      recentHistory[baselineIdx]?.bestE1rmKg || currentBestE1rmKg;

    if (recentHistory.length >= 2 && previousE1rmKg > 0) {
      e1rmChangePct =
        Math.round(
          ((currentBestE1rmKg - previousE1rmKg) / previousE1rmKg) * 1000
        ) / 10;

      if (e1rmChangePct >= 1.5) {
        status = "progressing";
      } else if (e1rmChangePct <= -2.5) {
        status = "regressing";
      } else if (recentHistory.length >= 3) {
        status = "plateaued";
      } else {
        status = "progressing";
      }
    }

    const latestWorkingSets = (latest?.sets || []).filter(
      (s) => s.type !== "warmup"
    );
    const setCount = Math.max(2, latestWorkingSets.length || 3);
    const lastWeight = latest?.maxWeightKg || 20;
    const allHitMaxReps =
      latestWorkingSets.length > 0 &&
      latestWorkingSets.every((s) => (s.reps || 0) >= rule.maxRep);

    let nextTargetWeightKg = lastWeight;
    let nextTargetReps = `${setCount} × ${rule.minRep}–${rule.maxRep}`;
    let recommendationReason = "";

    if (allHitMaxReps && (latest?.avgRpe ?? 8) <= rule.targetRpe + 0.5) {
      nextTargetWeightKg = lastWeight + rule.incKg;
      nextTargetReps = `${setCount} × ${rule.minRep}–${rule.minRep + 1}`;
      recommendationReason = `All ${latestWorkingSets.length} working sets reached ${rule.maxRep}+ reps at ${lastWeight}kg. Increase load by +${rule.incKg}kg to ${nextTargetWeightKg}kg and build from ${rule.minRep} reps.`;
    } else if (status === "plateaued") {
      nextTargetWeightKg = lastWeight;
      const targetRep = Math.min(
        rule.maxRep,
        (latestWorkingSets[0]?.reps || rule.minRep) + 1
      );
      nextTargetReps = `${setCount} × ${targetRep}`;
      recommendationReason = `Performance held steady around ${lastWeight}kg for the last 3 exposures. Keep ${lastWeight}kg and aim for +1 rep on your first two sets.`;
    } else if (status === "regressing") {
      nextTargetWeightKg = lastWeight;
      nextTargetReps = `${setCount} × ${rule.minRep}–${rule.maxRep}`;
      recommendationReason = `Recent e1RM dipped (${e1rmChangePct}%). Consolidate technique at ${lastWeight}kg stopping at RPE ${rule.targetRpe}.`;
    } else {
      nextTargetWeightKg = lastWeight;
      const nextRep = Math.min(
        rule.maxRep,
        (latestWorkingSets[0]?.reps || rule.minRep) + 1
      );
      nextTargetReps = `${setCount} × ${nextRep}`;
      recommendationReason = `Last session top set: ${
        latest?.topSetSummary || "N/A"
      }. Stay at ${lastWeight}kg and aim for ${nextRep} reps across ${setCount} working sets.`;
    }

    exerciseReports.push({
      exerciseTemplateId: templateId,
      title: exTitle,
      primaryMuscleGroup,
      movementPattern,
      status,
      sessionsCount: history.length,
      currentBestE1rmKg,
      previousE1rmKg,
      e1rmChangePct,
      currentMaxWeightKg: latest?.maxWeightKg || 0,
      latestSession: latest,
      history: recentHistory,
      nextTargetWeightKg,
      nextTargetReps,
      recommendationReason,
    });
  }

  exerciseReports.sort((a, b) => b.sessionsCount - a.sessionsCount);

  // Synthesize virtual Full Body routines from the last 3 workouts if the user logged workouts directly without saved Full Body routines!
  const fullBodyCountInLast3 = last3Workouts.filter((w) => w.isFullBody).length;
  const detectedStyle: "full_body_rotation" | "split_rotation" =
    fullBodyCountInLast3 >= 2 ? "full_body_rotation" : "split_rotation";

  // If the user doesn't have saved Full Body routines (or logged their last 3 Full Body workouts directly), expose those 3 workouts as selectable Full Body A/B/C templates too!
  const virtualRoutinesFromLast3: SplitRoutineWithExercises[] = [
    ...last3Workouts,
  ]
    .reverse()
    .map((w, idx) => {
      const letter = ["A", "B", "C"][idx] || `${idx + 1}`;
      return {
        id: `history-workout-${w.id}`,
        title: `${w.title} (Rotation Day ${letter} • ${w.start_time.slice(
          5,
          10
        )})`,
        notes: `Derived directly from your logged Full Body session on ${w.start_time.slice(
          0,
          10
        )}`,
        split_order: idx + 1,
        is_active_in_split: true,
        is_ai_target_routine: false,
        exercises: w.exercises.map((ex, exIdx) => ({
          exercise_template_id: ex.exercise_template_id,
          index: exIdx,
          title: ex.title,
          primary_muscle_group: ex.primary_muscle_group,
          movementPattern: ex.movementPattern,
          rest_seconds: 120,
          notes: null,
          target_rep_min: 8,
          target_rep_max: 12,
          weight_increment_kg: 2.5,
          target_rpe: 8.5,
          progression_rule: "double_progression",
          target_sets: ex.sets.map((s) => ({
            type: s.type,
            weight_kg: s.weight_kg,
            reps: s.reps,
          })),
        })),
      };
    });

  // Merge virtual routines from last 3 workouts if no saved routines match them
  const activeSavedRoutines = routines
    .filter((r) => r.is_active_in_split && !r.is_ai_target_routine)
    .sort((a, b) => a.split_order - b.split_order);

  const allSelectableRoutines =
    detectedStyle === "full_body_rotation"
      ? [
          ...virtualRoutinesFromLast3,
          ...activeSavedRoutines.filter(
            (r) => !virtualRoutinesFromLast3.some((vr) => vr.id === r.id)
          ),
        ]
      : activeSavedRoutines.length > 0
      ? activeSavedRoutines
      : virtualRoutinesFromLast3;

  // Determine which routine/variation is due up today
  // In a 3-workout Full Body rotation (A -> B -> C), the workout from 3 sessions ago (index 0 of reversed virtualRoutinesFromLast3) is due today!
  let nextSplitRoutine: SplitRoutineWithExercises | null =
    allSelectableRoutines[0] || null;

  const lastWorkout = workoutsData?.[0] || null;
  if (
    detectedStyle !== "full_body_rotation" &&
    lastWorkout &&
    activeSavedRoutines.length > 0
  ) {
    const matchedIdx = activeSavedRoutines.findIndex(
      (r) =>
        r.id === lastWorkout.routine_id ||
        lastWorkout.title
          .toLowerCase()
          .includes(r.title.toLowerCase().split("(")[0].trim())
    );
    if (matchedIdx !== -1) {
      nextSplitRoutine =
        activeSavedRoutines[(matchedIdx + 1) % activeSavedRoutines.length];
    }
  }

  // Weekly & Last-3-Workouts Muscle Group Volume
  const nowMs = Date.now();
  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgoMs = nowMs - 30 * 24 * 60 * 60 * 1000;

  const workoutsLast7 = (workoutsData || []).filter(
    (w) => new Date(w.start_time).getTime() >= sevenDaysAgoMs
  );
  const workoutsLast30 = (workoutsData || []).filter(
    (w) => new Date(w.start_time).getTime() >= thirtyDaysAgoMs
  );

  const workoutIdsLast7 = new Set(workoutsLast7.map((w) => w.id));
  const workoutIdsLast30 = new Set(workoutsLast30.map((w) => w.id));
  const setsPerMuscle = new Map<string, number>();
  const setsPerMuscle30d = new Map<string, number>();

  for (const we of workoutExercisesData || []) {
    const tpl = templateMap.get(we.exercise_template_id);
    const primary = formatMuscleLabel(
      tpl?.primary_muscle_group || "other",
      we.title || tpl?.title
    );
    const workingCount = Number(we.working_sets_count || 0);
    if (workoutIdsLast7.has(we.workout_id)) {
      setsPerMuscle.set(
        primary,
        (setsPerMuscle.get(primary) || 0) + workingCount
      );
    }
    if (workoutIdsLast30.has(we.workout_id)) {
      setsPerMuscle30d.set(
        primary,
        (setsPerMuscle30d.get(primary) || 0) + workingCount
      );
    }
  }

  // Ensure all 10 core muscle groups appear so under-worked ones are highlighted
  for (const coreMuscle of [
    "Quads",
    "Shoulders",
    "Chest",
    "Lats",
    "Upper back",
    "Hamstrings",
    "Calves",
    "Triceps",
    "Biceps",
    "Abs",
  ]) {
    if (!setsPerMuscle.has(coreMuscle) && !last3MuscleSets.has(coreMuscle)) {
      setsPerMuscle.set(coreMuscle, 0);
    }
  }

  const allMuscleNames = new Set([
    ...setsPerMuscle.keys(),
    ...last3MuscleSets.keys(),
  ]);

  const muscleVolumes: MuscleVolumeSummary[] = Array.from(allMuscleNames)
    .map((muscleGroup) => {
      const weeklyWorkingSets = setsPerMuscle.get(muscleGroup) || 0;
      const last3Sets = last3MuscleSets.get(muscleGroup) || 0;
      const thirtyDaysSets = setsPerMuscle30d.get(muscleGroup) || 0;
      return {
        muscleGroup,
        weeklyWorkingSets,
        last3WorkoutsSets: last3Sets,
        thirtyDaysSets,
        recommendedMinSets: 6,
        recommendedMaxSets: 18,
        status: (last3Sets < 6
          ? "under"
          : last3Sets > 18
          ? "high"
          : "optimal") as "optimal" | "under" | "high",
      };
    })
    .sort((a, b) => b.last3WorkoutsSets - a.last3WorkoutsSets);

  const underworkedMuscles = muscleVolumes
    .filter((m) => m.status === "under")
    .map((m) => `${m.muscleGroup} (${m.last3WorkoutsSets} sets in last 3 workouts)`);

  const underworkedPatterns = patternCoverage
    .filter((p) => p.status === "underworked")
    .map((p) => p.pattern);

  const oldestOfLast3 = last3Workouts[last3Workouts.length - 1];
  const lastThreeAnalysis: LastThreeWorkoutsAnalysis = {
    detectedStyle,
    headline:
      detectedStyle === "full_body_rotation"
        ? `Detected a Full Body A/B/C rotation across your last ${last3Workouts.length} workouts. Today cycles back to your variation from ${last3Workouts.length} sessions ago (${oldestOfLast3?.title || "Full Body A"}) while prioritizing under-worked patterns (${underworkedPatterns.slice(0, 2).join(", ") || "balanced across all 7 patterns"}).`
        : `Analyzed your last ${last3Workouts.length} workouts for movement pattern balance and progressive overload.`,
    last3Workouts,
    patternCoverage,
    underworkedMuscles,
    underworkedPatterns,
    recommendedBaseSource: {
      type: "workout_3_sessions_ago",
      id: oldestOfLast3?.id || nextSplitRoutine?.id || "default",
      title: oldestOfLast3?.title || nextSplitRoutine?.title || "Full Body Session",
      reason:
        "In a 3-day Full Body rotation, repeating the exercise variations from 3 sessions ago gives optimal recovery from your most recent session while keeping weekly frequency high.",
    },
  };

  return {
    isDemoMode: false,
    lastSyncAt: settingsRow?.last_sync_at || null,
    aiTargetRoutineId: settingsRow?.ai_target_routine_id || null,
    summary: {
      totalWorkoutsCount: workoutsData?.length || 0,
      workoutsLast7Days: workoutsLast7.length,
      workoutsLast30Days: workoutsLast30.length,
      totalVolumeLast7DaysKg: Math.round(
        workoutsLast7.reduce(
          (sum, w) => sum + Number(w.total_volume_kg || 0),
          0
        )
      ),
      progressingLiftsCount: exerciseReports.filter(
        (r) => r.status === "progressing"
      ).length,
      plateauedLiftsCount: exerciseReports.filter(
        (r) => r.status === "plateaued"
      ).length,
      regressingLiftsCount: exerciseReports.filter(
        (r) => r.status === "regressing"
      ).length,
    },
    nextSplitRoutine,
    lastCompletedWorkout: lastWorkout
      ? {
          id: lastWorkout.id,
          title: lastWorkout.title,
          start_time: lastWorkout.start_time,
          duration_seconds: lastWorkout.duration_seconds,
          total_volume_kg: Number(lastWorkout.total_volume_kg || 0),
          total_working_sets: lastWorkout.total_working_sets,
        }
      : null,
    lastThreeAnalysis,
    exerciseReports,
    muscleVolumes,
    recentWorkouts: (workoutsData || []).slice(0, 10).map((w) => ({
      id: w.id,
      title: w.title,
      start_time: w.start_time,
      duration_seconds: w.duration_seconds,
      total_volume_kg: Number(w.total_volume_kg || 0),
      total_working_sets: w.total_working_sets,
      exerciseCount: exCountByWorkout.get(w.id) || 0,
      prCount: prCountByWorkout.get(w.id) || 0,
    })),
    routines: allSelectableRoutines,
  };
}
