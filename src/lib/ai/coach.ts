import { GoogleGenAI } from "@google/genai";
import { getRuntimeConfig } from "@/lib/config";
import {
  classifyMovementPattern,
  DashboardAnalyticsPayload,
  ExerciseProgressionReport,
  MovementPattern,
  SplitRoutineWithExercises,
} from "@/lib/analytics/demo-data";

export interface ProposedRoutineSet {
  type: "warmup" | "normal" | "failure" | "dropset";
  weight_kg: number | null;
  reps: number | null;
}

export interface ProposedRoutineExercise {
  exercise_template_id: string;
  title: string;
  movementPattern?: MovementPattern;
  priorityBadge?: string | null;
  superset_id: number | null;
  rest_seconds: number;
  notes: string;
  progression_rationale: string;
  sets: ProposedRoutineSet[];
}

export interface ProposedWorkoutRoutine {
  title: string;
  baseRoutineTitle: string;
  notes: string;
  estimatedDurationMinutes: number;
  patternsIncluded?: MovementPattern[];
  exercises: ProposedRoutineExercise[];
}

export interface CoachResponse {
  usedGemini: boolean;
  coachingReply: string;
  workoutPlan: ProposedWorkoutRoutine;
}

export interface ProgressAuditReport {
  usedGemini: boolean;
  overallVerdict: string;
  headline: string;
  keyWins: string[];
  plateausAndRisks: string[];
  actionableAdjustments: string[];
}

function buildDeterministicWorkoutPlan(
  routine: SplitRoutineWithExercises,
  analytics: DashboardAnalyticsPayload,
  reportsByTemplate: Map<string, ExerciseProgressionReport>,
  userPrompt: string
): CoachResponse {
  const isShortSession =
    /short|quick|30 min|40 min|45 min|hurry|fast/i.test(userPrompt);
  const { lastThreeAnalysis } = analytics;
  const underworkedPatternSet = new Set(
    lastThreeAnalysis.underworkedPatterns || []
  );

  const exercises: ProposedRoutineExercise[] = routine.exercises.map((ex) => {
    const report = reportsByTemplate.get(ex.exercise_template_id);
    const pattern =
      ex.movementPattern ||
      report?.movementPattern ||
      classifyMovementPattern(ex.title, ex.primary_muscle_group || "other");

    const isUnderworkedPattern = underworkedPatternSet.has(pattern);

    const latestWorkingSets =
      report?.latestSession?.sets.filter((s) => s.type !== "warmup") || [];

    const targetWeight =
      report?.nextTargetWeightKg ??
      ex.target_sets.find((s) => s.type !== "warmup")?.weight_kg ??
      40;

    const workingSetCount = isShortSession
      ? 2
      : Math.max(
          2,
          ex.target_sets.filter((s) => s.type !== "warmup").length || 3
        );

    const lastReps =
      latestWorkingSets[0]?.reps ?? ex.target_rep_min ?? 8;
    const didGraduateWeight =
      report && targetWeight > (report.currentMaxWeightKg || 0);
    const targetRep = didGraduateWeight
      ? ex.target_rep_min
      : Math.min(ex.target_rep_max, lastReps + 1);

    const sets: ProposedRoutineSet[] = [];
    if (ex.index <= 1 && targetWeight >= 40) {
      sets.push({
        type: "warmup",
        weight_kg: Math.round((targetWeight * 0.6) / 2.5) * 2.5,
        reps: 8,
      });
    }

    for (let i = 0; i < workingSetCount; i++) {
      sets.push({
        type: "normal",
        weight_kg: targetWeight,
        reps: targetRep,
      });
    }

    const rationale =
      report?.recommendationReason ||
      `Target ${workingSetCount} working sets in the ${ex.target_rep_min}–${ex.target_rep_max} rep window @ RPE ${ex.target_rpe}.`;

    return {
      exercise_template_id: ex.exercise_template_id,
      title: ex.title,
      movementPattern: pattern,
      priorityBadge: isUnderworkedPattern
        ? `Priority Pattern (${pattern} was under-worked in last 3 sessions)`
        : null,
      superset_id: null,
      rest_seconds: isShortSession
        ? Math.min(90, ex.rest_seconds)
        : ex.rest_seconds || 90,
      notes: `${
        ex.notes ? ex.notes + " | " : ""
      }AI Target: ${targetWeight}kg × ${targetRep} (RPE ${ex.target_rpe})`,
      progression_rationale: rationale,
      sets,
    };
  });

  // If this is a Full Body session, check if any under-worked pattern from the last 3 workouts is missing from today's exercise list, and fill it from the user's known exercises!
  if (
    lastThreeAnalysis.detectedStyle === "full_body_rotation" &&
    !isShortSession
  ) {
    const presentPatterns = new Set(
      exercises.map((e) => e.movementPattern).filter(Boolean)
    );
    const recentSession1Ids = new Set(
      (lastThreeAnalysis.last3Workouts[0]?.exercises || []).map(
        (e) => e.exercise_template_id
      )
    );

    for (const missingPattern of lastThreeAnalysis.underworkedPatterns) {
      if (presentPatterns.has(missingPattern)) continue;
      if (exercises.length >= 6) break;

      // Find an exercise in the user's history that matches this missing pattern (preferring one not done in the immediately preceding workout)
      const candidate =
        analytics.exerciseReports.find(
          (r) =>
            r.movementPattern === missingPattern &&
            !recentSession1Ids.has(r.exerciseTemplateId) &&
            !exercises.some(
              (e) => e.exercise_template_id === r.exerciseTemplateId
            )
        ) ||
        analytics.exerciseReports.find(
          (r) =>
            r.movementPattern === missingPattern &&
            !exercises.some(
              (e) => e.exercise_template_id === r.exerciseTemplateId
            )
        );

      if (candidate) {
        const w = candidate.nextTargetWeightKg || candidate.currentMaxWeightKg || 25;
        exercises.push({
          exercise_template_id: candidate.exerciseTemplateId,
          title: candidate.title,
          movementPattern: candidate.movementPattern,
          priorityBadge: `Added to Balance Last 3 Full Body Workouts (${missingPattern})`,
          superset_id: null,
          rest_seconds: 90,
          notes: `Added to top up ${missingPattern} volume across your 3-workout Full Body cycle`,
          progression_rationale: `${missingPattern} only had limited volume across your last 3 workouts. ${candidate.recommendationReason}`,
          sets: [
            { type: "normal", weight_kg: w, reps: 10 },
            { type: "normal", weight_kg: w, reps: 10 },
            { type: "normal", weight_kg: w, reps: 10 },
          ],
        });
        presentPatterns.add(missingPattern);
      }
    }
  }

  // Re-order so priority/under-worked compound patterns come early while fresh
  const patternsIncluded = Array.from(
    new Set(
      exercises
        .map((e) => e.movementPattern)
        .filter((p): p is MovementPattern => Boolean(p))
    )
  );

  const last3SummaryLines = lastThreeAnalysis.last3Workouts
    .map(
      (w, idx) =>
        `${idx + 1}. **${w.title}** (${w.start_time.slice(0, 10)}) — ${
          w.total_working_sets
        } sets (${w.exercises.map((e) => e.title).join(", ")})`
    )
    .join("\n");

  const underworkedText =
    lastThreeAnalysis.underworkedMuscles.length > 0
      ? `\n\n**Under-Worked Across Last 3 Sessions (Prioritized Today):**\n- ${lastThreeAnalysis.underworkedMuscles.join(
          "\n- "
        )}`
      : "\n\nAll 7 major Full Body movement patterns were well balanced across your last 3 sessions.";

  const coachingReply = `### Last 3 Full Body Workouts Analyzed\n${last3SummaryLines}${underworkedText}\n\n### Today's Full Body Rotation Plan: **${routine.title}**\n${exercises
    .map(
      (e) =>
        `- **${e.title}** *(${e.movementPattern})*: ${e.progression_rationale}`
    )
    .join(
      "\n"
    )}\n\nReview or tweak your sets below and tap **Sync to Hevy Routine** to update **"⚡ Today's AI Workout"** in your Hevy app.`;

  return {
    usedGemini: false,
    coachingReply,
    workoutPlan: {
      title: `⚡ Today's AI Workout — ${routine.title.split("(")[0].trim()}`,
      baseRoutineTitle: routine.title,
      notes: `Full Body A/B/C rotation generated from your last 3 workouts. Covers: ${patternsIncluded.join(
        " • "
      )}.`,
      estimatedDurationMinutes: isShortSession ? 40 : 60,
      patternsIncluded,
      exercises,
    },
  };
}

export async function generatePreWorkoutPlan(params: {
  userMessage: string;
  analytics: DashboardAnalyticsPayload;
  routineId?: string;
}): Promise<CoachResponse> {
  const { userMessage, analytics, routineId } = params;
  const targetRoutine =
    analytics.routines.find((r) => r.id === routineId) ||
    analytics.nextSplitRoutine ||
    analytics.routines[0];

  const reportsByTemplate = new Map(
    analytics.exerciseReports.map((r) => [r.exerciseTemplateId, r])
  );

  if (!targetRoutine) {
    throw new Error("No training routine or recent workouts found to plan from.");
  }

  const fallback = buildDeterministicWorkoutPlan(
    targetRoutine,
    analytics,
    reportsByTemplate,
    userMessage
  );

  const cfg = getRuntimeConfig();
  if (!cfg.geminiApiKey) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: cfg.geminiApiKey });

    const contextPayload = {
      trainingStyle: analytics.lastThreeAnalysis.detectedStyle,
      lastThreeWorkoutsDetailed: analytics.lastThreeAnalysis.last3Workouts,
      patternCoverageLast3Workouts: analytics.lastThreeAnalysis.patternCoverage,
      underworkedMusclesLast3Workouts:
        analytics.lastThreeAnalysis.underworkedMuscles,
      underworkedPatternsLast3Workouts:
        analytics.lastThreeAnalysis.underworkedPatterns,
      scheduledBaseVariationForToday: targetRoutine,
      availableKnownExercisesFromHistory: analytics.exerciseReports.map(
        (rep) => ({
          exercise_template_id: rep.exerciseTemplateId,
          title: rep.title,
          primaryMuscleGroup: rep.primaryMuscleGroup,
          movementPattern: rep.movementPattern,
          status: rep.status,
          e1rmChangePct: rep.e1rmChangePct,
          latestSession: rep.latestSession,
          suggestedNextWeightKg: rep.nextTargetWeightKg,
          suggestedNextReps: rep.nextTargetReps,
          deterministicReason: rep.recommendationReason,
        })
      ),
    };

    const systemPrompt = `You are an elite evidence-based strength & hypertrophy AI coach integrated with the user's Hevy workout app.
The user trains using a Full Body A/B/C rotation (rotating 2-3 different Full Body sessions across the week).
Your job is to:
1. Directly analyze their LAST 3 WORKOUTS (even if they were logged without a saved Hevy routine).
2. Avoid repeating the exact heavy variations from their most recent workout (#1), while cycling back to the variations from 3 workouts ago (or the selected base variation) and applying progressive overload (+weight or +1 rep).
3. Ensure today's Full Body session balances all major movement patterns:
   - "Knee-Dominant (Quads)"
   - "Hip-Hinge (Posterior)"
   - "Horizontal Push (Chest)"
   - "Vertical Push (Shoulders)"
   - "Horizontal Pull (Upper Back)"
   - "Vertical Pull (Lats)"
   - "Arms & Core (Accessory)"
4. Check "underworkedMusclesLast3Workouts" and "underworkedPatternsLast3Workouts". Prioritize those patterns early in the workout or include a known exercise from "availableKnownExercisesFromHistory" (using its exact exercise_template_id!) so the 3-workout cycle is completely balanced.
5. IMPORTANT: Only use valid "exercise_template_id" values present in "scheduledBaseVariationForToday" or "availableKnownExercisesFromHistory".
6. Return strictly valid JSON matching this schema:
{
  "coachingReply": "Markdown explanation analyzing their last 3 Full Body workouts, highlighting which muscle groups/patterns were under-worked, and explaining today's exercise & weight/rep targets",
  "workoutPlan": {
    "title": "⚡ Today's AI Workout — Full Body",
    "baseRoutineTitle": "string",
    "notes": "Short coaching focus for the session",
    "estimatedDurationMinutes": 60,
    "exercises": [
      {
        "exercise_template_id": "string",
        "title": "string",
        "movementPattern": "Knee-Dominant (Quads) | Hip-Hinge (Posterior) | Horizontal Push (Chest) | Vertical Push (Shoulders) | Horizontal Pull (Upper Back) | Vertical Pull (Lats) | Arms & Core (Accessory)",
        "priorityBadge": "Optional badge string if this exercise addresses an under-worked muscle/pattern from the last 3 workouts, else null",
        "superset_id": null,
        "rest_seconds": 120,
        "notes": "Coaching cue + target RPE to display inside Hevy",
        "progression_rationale": "1-sentence explanation of why this weight/rep target was chosen vs the last time they did this lift",
        "sets": [
          { "type": "warmup", "weight_kg": 60, "reps": 8 },
          { "type": "normal", "weight_kg": 85, "reps": 8 }
        ]
      }
    ]
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nTRAINING CONTEXT:\n${JSON.stringify(
                contextPayload,
                null,
                2
              )}\n\nUSER MESSAGE:\n${userMessage || "What should I do today?"}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text;
    if (!rawText) return fallback;

    const parsed = JSON.parse(rawText);
    if (!parsed.workoutPlan || !Array.isArray(parsed.workoutPlan.exercises)) {
      return fallback;
    }

    const patternsIncluded = Array.from(
      new Set(
        parsed.workoutPlan.exercises
          .map(
            (e: ProposedRoutineExercise) =>
              e.movementPattern || classifyMovementPattern(e.title, "other")
          )
          .filter(Boolean)
      )
    ) as MovementPattern[];

    return {
      usedGemini: true,
      coachingReply: parsed.coachingReply || fallback.coachingReply,
      workoutPlan: {
        ...parsed.workoutPlan,
        patternsIncluded,
      },
    };
  } catch (err) {
    console.error("Gemini Coach error, falling back to deterministic plan:", err);
    return fallback;
  }
}

export async function generateProgressAudit(
  analytics: DashboardAnalyticsPayload
): Promise<ProgressAuditReport> {
  const progressing = analytics.exerciseReports.filter(
    (r) => r.status === "progressing"
  );
  const plateaued = analytics.exerciseReports.filter(
    (r) => r.status === "plateaued" || r.status === "regressing"
  );

  const deterministicReport: ProgressAuditReport = {
    usedGemini: false,
    overallVerdict:
      progressing.length >= plateaued.length
        ? "Full Body Progressive Overload On Track"
        : "Mixed Full Body Progress — Address Stalled Patterns",
    headline: `Across your Full Body A/B/C rotation (${analytics.summary.workoutsLast30Days} sessions in 30 days), ${progressing.length} primary lifts are gaining e1RM while ${plateaued.length} lift(s) have plateaued.`,
    keyWins:
      progressing.length > 0
        ? progressing
            .slice(0, 3)
            .map(
              (r) =>
                `${r.title} (${r.movementPattern}): e1RM climbed +${r.e1rmChangePct}% to ${r.currentBestE1rmKg} kg (latest: ${r.latestSession?.topSetSummary || "N/A"}).`
            )
        : ["Consistent Full Body frequency established — building multi-week baseline."],
    plateausAndRisks: [
      ...plateaued.map(
        (r) =>
          `${r.title}: Held flat at ${r.currentMaxWeightKg} kg (e1RM ${r.currentBestE1rmKg} kg) across last 3 exposures.`
      ),
      ...(analytics.lastThreeAnalysis.underworkedMuscles.length > 0
        ? [
            `Under-worked in last 3 Full Body sessions: ${analytics.lastThreeAnalysis.underworkedMuscles.join(
              ", "
            )}.`,
          ]
        : []),
    ],
    actionableAdjustments: [
      ...(plateaued
        .slice(0, 2)
        .map((r) => `${r.title}: ${r.recommendationReason}`)),
      ...(analytics.lastThreeAnalysis.underworkedPatterns.length > 0
        ? [
            `Prioritize ${analytics.lastThreeAnalysis.underworkedPatterns.join(
              " & "
            )} early in today's Full Body session to balance your 3-workout cycle.`,
          ]
        : []),
      "Sync today's recommended Full Body variation to Hevy before starting your warmups.",
    ].slice(0, 4),
  };

  const cfg = getRuntimeConfig();
  if (!cfg.geminiApiKey) {
    return deterministicReport;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: cfg.geminiApiKey });
    const prompt = `You are a sports scientist auditing a lifter's Full Body A/B/C training data from Hevy.
Analyze their exercise progression, last 3 Full Body workouts pattern coverage, and under-worked muscles.
Return strictly valid JSON with keys:
- "overallVerdict": Short 3-6 word verdict badge
- "headline": 2-sentence executive summary of their Full Body progress
- "keyWins": Array of 2-3 specific data-backed wins citing exact exercises, e1RM % changes, and weights
- "plateausAndRisks": Array of 1-3 specific stalls, RPE creep signals, or movement pattern imbalances across their last 3 Full Body workouts
- "actionableAdjustments": Array of 3 concrete programming adjustments for their next Full Body cycle

DATA:
${JSON.stringify(
  {
    summary: analytics.summary,
    lastThreeAnalysis: analytics.lastThreeAnalysis,
    exercises: analytics.exerciseReports.slice(0, 10),
    weeklyMuscleVolume: analytics.muscleVolumes,
  },
  null,
  2
)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" },
    });

    if (!response.text) return deterministicReport;
    const parsed = JSON.parse(response.text);
    return {
      usedGemini: true,
      overallVerdict:
        parsed.overallVerdict || deterministicReport.overallVerdict,
      headline: parsed.headline || deterministicReport.headline,
      keyWins: Array.isArray(parsed.keyWins)
        ? parsed.keyWins
        : deterministicReport.keyWins,
      plateausAndRisks: Array.isArray(parsed.plateausAndRisks)
        ? parsed.plateausAndRisks
        : deterministicReport.plateausAndRisks,
      actionableAdjustments: Array.isArray(parsed.actionableAdjustments)
        ? parsed.actionableAdjustments
        : deterministicReport.actionableAdjustments,
    };
  } catch (err) {
    console.error("Gemini Audit error, returning deterministic audit:", err);
    return deterministicReport;
  }
}
