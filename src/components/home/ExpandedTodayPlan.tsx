"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  Ellipsis,
  Sparkles,
  Pencil,
  ChevronUp,
  ChevronDown,
  Timer,
  Plus,
  Send,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import { ProposedWorkoutRoutine, ProposedRoutineExercise } from "@/lib/ai/coach";
import {
  DashboardAnalyticsPayload,
  classifyMovementPattern,
} from "@/lib/analytics/demo-data";
import {
  MobileStatusBar,
  cleanExerciseName,
  cleanRoutineTitle,
  getTargetBadgeForExercise,
} from "./shared";

export interface ExpandedTodayPlanProps {
  plan: ProposedWorkoutRoutine | null;
  coachReply: string | null;
  analytics: DashboardAnalyticsPayload | null;
  generatingPlan: boolean;
  sendingToHevy: boolean;
  sendResult: { type: "success" | "error"; message: string } | null;
  onUpdatePlan: (updated: ProposedWorkoutRoutine) => void;
  onSendToHevy: () => void;
  onRegenerate: () => void;
  onBack: () => void;
}

function getMuscleLabel(
  ex: ProposedRoutineExercise,
  analytics: DashboardAnalyticsPayload | null
): string {
  const report = analytics?.exerciseReports.find(
    (r) => r.exerciseTemplateId === ex.exercise_template_id
  );
  const rawMuscle = report?.primaryMuscleGroup?.toLowerCase() || "";
  const titleLower = ex.title.toLowerCase();
  const pattern =
    ex.movementPattern ||
    report?.movementPattern ||
    classifyMovementPattern(ex.title, rawMuscle || "other");

  if (rawMuscle.includes("quad") || titleLower.includes("squat") || titleLower.includes("leg extension") || titleLower.includes("leg press")) {
    return "Quads";
  }
  if (rawMuscle.includes("chest") || titleLower.includes("bench") || titleLower.includes("fly")) {
    return "Chest";
  }
  if (rawMuscle.includes("hamstring") || titleLower.includes("leg curl") || titleLower.includes("rdl") || titleLower.includes("romanian")) {
    return "Hamstrings";
  }
  if (rawMuscle.includes("shoulder") || titleLower.includes("lateral raise") || titleLower.includes("overhead")) {
    return "Shoulders";
  }
  if (rawMuscle.includes("tricep") || titleLower.includes("pushdown") || titleLower.includes("tricep")) {
    return "Triceps";
  }
  if (rawMuscle.includes("bicep") || titleLower.includes("curl")) {
    return "Biceps";
  }
  if (rawMuscle.includes("lat") || titleLower.includes("pulldown") || titleLower.includes("pull-up")) {
    return "Lats";
  }
  if (rawMuscle.includes("upper_back") || rawMuscle.includes("back") || titleLower.includes("row") || titleLower.includes("face pull")) {
    return "Upper back";
  }
  if (rawMuscle.includes("glute") || titleLower.includes("hip thrust")) {
    return "Glutes";
  }
  if (rawMuscle.includes("calf") || rawMuscle.includes("calves") || titleLower.includes("calf")) {
    return "Calves";
  }

  switch (pattern) {
    case "Knee-Dominant (Quads)":
      return "Quads";
    case "Horizontal Push (Chest)":
      return "Chest";
    case "Horizontal Pull (Upper Back)":
      return "Upper back";
    case "Vertical Pull (Lats)":
      return "Lats";
    case "Hip-Hinge (Posterior)":
      return "Hamstrings";
    case "Vertical Push (Shoulders)":
      return "Shoulders";
    default:
      return "Accessory";
  }
}

export function ExpandedTodayPlan({
  plan,
  coachReply,
  analytics,
  generatingPlan,
  sendingToHevy,
  sendResult,
  onUpdatePlan,
  onSendToHevy,
  onRegenerate,
  onBack,
}: ExpandedTodayPlanProps) {
  const defaultExpanded = plan && plan.exercises.length > 1 ? 1 : 0;
  const [expandedIdx, setExpandedIdx] = useState<number | null>(defaultExpanded);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [customExTitle, setCustomExTitle] = useState("");

  const now = useMemo(() => new Date(), []);
  const formattedTodayShort = useMemo(
    () =>
      now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [now]
  );
  const shortDate = useMemo(
    () =>
      now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    [now]
  );

  if (!plan) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-[#ECEEF3] p-8 text-center">
        <p className="text-[15px] font-semibold text-[#0B0D17]">
          {generatingPlan ? "Generating today's AI plan..." : "No active plan generated yet."}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0B0D17]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={generatingPlan}
            className="rounded-full bg-[#2E3BFF] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            Generate Plan
          </button>
        </div>
      </div>
    );
  }

  const cleanedTitle = cleanRoutineTitle(plan.title);
  const hevyRoutineDisplayName =
    plan.title.includes("—") && !plan.title.startsWith("⚡")
      ? plan.title
      : `${cleanedTitle} — ${shortDate}`;

  const totalSets = plan.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const estimatedVolumeKg = plan.exercises.reduce(
    (acc, ex) =>
      acc +
      ex.sets.reduce(
        (sAcc, s) => sAcc + (s.weight_kg ?? 0) * (s.reps ?? 0),
        0
      ),
    0
  );

  // Build concise "Why this plan" summary
  const whyThisPlanText = (() => {
    const plusOneEx = plan.exercises.find((ex) => {
      const rep = analytics?.exerciseReports.find(
        (r) => r.exerciseTemplateId === ex.exercise_template_id
      );
      const badge = getTargetBadgeForExercise(
        ex.title,
        ex.progression_rationale,
        ex.priorityBadge,
        rep?.status
      );
      return badge.label === "+1 rep" || badge.label === "+2.5 kg";
    });
    const catchupEx = plan.exercises.find((ex) => {
      const rep = analytics?.exerciseReports.find(
        (r) => r.exerciseTemplateId === ex.exercise_template_id
      );
      const badge = getTargetBadgeForExercise(
        ex.title,
        ex.progression_rationale,
        ex.priorityBadge,
        rep?.status
      );
      return badge.label === "Catch-up";
    });

    if (plusOneEx || catchupEx) {
      const parts: string[] = ["Built from your last 3 sessions."];
      if (plusOneEx) {
        const name = cleanExerciseName(plusOneEx.title);
        const w =
          plusOneEx.sets.find((s) => s.type !== "warmup")?.weight_kg ??
          plusOneEx.sets[0]?.weight_kg ??
          40;
        const maxReps = Math.max(...plusOneEx.sets.map((s) => s.reps ?? 12));
        parts.push(
          `${name} has held at ${w} kg, so chase ${maxReps} reps.`
        );
      }
      if (catchupEx) {
        const muscle = getMuscleLabel(catchupEx, analytics);
        const shortName = cleanExerciseName(catchupEx.title).toLowerCase();
        parts.push(
          `${muscle} are running light, so ${shortName}s are added.`
        );
      }
      return parts.join(" ");
    }

    if (plan.notes) {
      return plan.notes;
    }
    if (coachReply) {
      return coachReply.replace(/[#*_]/g, "").slice(0, 145) + "...";
    }
    return "Built from your last 3 sessions to balance movement patterns and drive progressive overload.";
  })();

  const handleSetChange = (
    exIdx: number,
    setIdx: number,
    field: "weight_kg" | "reps",
    rawVal: string
  ) => {
    const num = rawVal === "" ? 0 : Number(rawVal);
    if (Number.isNaN(num)) return;
    const nextExercises = plan.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const nextSets = ex.sets.map((s, si) =>
        si === setIdx ? { ...s, [field]: num } : s
      );
      return { ...ex, sets: nextSets };
    });
    onUpdatePlan({ ...plan, exercises: nextExercises });
  };

  const handleAddSet = (exIdx: number) => {
    const nextExercises = plan.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const lastSet = ex.sets[ex.sets.length - 1] || {
        type: "normal" as const,
        weight_kg: 40,
        reps: 12,
      };
      return {
        ...ex,
        sets: [
          ...ex.sets,
          {
            type: "normal" as const,
            weight_kg: lastSet.weight_kg,
            reps: lastSet.reps,
          },
        ],
      };
    });
    onUpdatePlan({ ...plan, exercises: nextExercises });
  };

  const handleAddExerciseFromReport = (templateId: string, title: string, weightKg: number) => {
    const newEx: ProposedRoutineExercise = {
      exercise_template_id: templateId,
      title,
      movementPattern: classifyMovementPattern(title, "other"),
      priorityBadge: "Catch-up",
      superset_id: null,
      rest_seconds: 120,
      notes: "Added manually",
      progression_rationale: "Added to round out today's session volume.",
      sets: [
        { type: "normal", weight_kg: weightKg, reps: 12 },
        { type: "normal", weight_kg: weightKg, reps: 12 },
        { type: "normal", weight_kg: weightKg, reps: 12 },
      ],
    };
    const nextExercises = [...plan.exercises, newEx];
    onUpdatePlan({ ...plan, exercises: nextExercises });
    setExpandedIdx(nextExercises.length - 1);
    setShowAddPicker(false);
    setCustomExTitle("");
  };

  const candidateExercises = (analytics?.exerciseReports || []).filter(
    (rep) =>
      !plan.exercises.some(
        (e) => e.exercise_template_id === rep.exerciseTemplateId
      )
  );

  return (
    <div className="flex min-h-full flex-col justify-between bg-[#ECEEF3]">
      <div>
        {/* Blue Hero section */}
        <div className="flex flex-col gap-[14px] rounded-b-[32px] bg-[#2E3BFF] px-[16px] pb-[22px] pt-0 lg:pt-5">
          <MobileStatusBar light={true} />

          {/* Nav Bar */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            >
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
            <span className="text-[17px] font-semibold text-white">
              Today&apos;s plan
            </span>
            <button
              type="button"
              onClick={onRegenerate}
              aria-label="More options"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            >
              <Ellipsis className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Titles block */}
          <div className="flex flex-col gap-[6px] px-[4px] pt-[6px]">
            <span className="text-[13px] font-normal text-[#C9CCFF]">
              AI plan · {formattedTodayShort}
            </span>
            <h1 className="text-[40px] font-bold leading-none tracking-[-1.2px] text-white">
              {cleanedTitle}
            </h1>
            <div className="flex flex-wrap gap-[6px] pt-[4px]">
              <span className="rounded-full bg-white/15 px-[10px] py-[5px] text-[12px] font-semibold text-white">
                {plan.exercises.length} exercises
              </span>
              <span className="rounded-full bg-white/15 px-[10px] py-[5px] text-[12px] font-semibold text-white">
                {totalSets} sets
              </span>
              <span className="rounded-full bg-white/15 px-[10px] py-[5px] text-[12px] font-semibold text-white">
                ~{plan.estimatedDurationMinutes || 55} min
              </span>
              <span className="rounded-full bg-white/15 px-[10px] py-[5px] text-[12px] font-semibold text-white">
                ≈ {(estimatedVolumeKg / 1000).toFixed(1)} t
              </span>
            </div>
          </div>

          {/* Why this plan glass card */}
          <div className="flex flex-col gap-[6px] rounded-[18px] bg-white/10 p-[14px]">
            <div className="flex items-center gap-[6px]">
              <Sparkles className="h-[14px] w-[14px] text-[#B9F2D2]" />
              <span className="text-[12px] font-semibold text-[#B9F2D2]">
                Why this plan
              </span>
            </div>
            <p className="text-[13px] font-normal leading-snug text-white">
              {whyThisPlanText}
            </p>
          </div>
        </div>

        {/* Content section */}
        <div className="flex flex-col gap-[10px] px-[16px] pb-[20px] pt-[16px]">
          {/* Routine Name card */}
          <div
            onClick={() => setEditingTitle(true)}
            className="flex cursor-pointer items-center justify-between gap-[12px] rounded-[18px] bg-white px-[16px] py-[12px]"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
              <span className="text-[11px] font-normal text-[#5E6275]">
                Routine name in Hevy
              </span>
              {editingTitle ? (
                <input
                  type="text"
                  autoFocus
                  value={plan.title}
                  onChange={(e) =>
                    onUpdatePlan({ ...plan, title: e.target.value })
                  }
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingTitle(false);
                  }}
                  className="w-full bg-transparent text-[15px] font-semibold text-[#0B0D17] focus:outline-none"
                />
              ) : (
                <span className="truncate text-[15px] font-semibold text-[#0B0D17]">
                  {hevyRoutineDisplayName}
                </span>
              )}
            </div>
            {editingTitle ? (
              <Check
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTitle(false);
                }}
                className="h-[16px] w-[16px] shrink-0 text-[#2E3BFF]"
              />
            ) : (
              <Pencil className="h-[16px] w-[16px] shrink-0 text-[#5E6275]" />
            )}
          </div>

          {/* Accordion list of Exercises */}
          {plan.exercises.map((ex, idx) => {
            const isExpanded = expandedIdx === idx;
            const report = analytics?.exerciseReports.find(
              (r) => r.exerciseTemplateId === ex.exercise_template_id
            );
            const muscleGroupLabel = getMuscleLabel(ex, analytics);
            const workingSets = ex.sets.filter((s) => s.type !== "warmup");
            const displaySets = workingSets.length > 0 ? workingSets : ex.sets;
            const repCount = displaySets[0]?.reps ?? 12;
            const weightKg = displaySets[0]?.weight_kg ?? 40;

            const badge = getTargetBadgeForExercise(
              ex.title,
              ex.progression_rationale,
              ex.priorityBadge,
              report?.status
            );

            const pillClasses =
              badge.tone === "green"
                ? "bg-[#B9F2D2] text-[#0E6A37]"
                : badge.tone === "orange"
                ? "bg-[#FFE3D2] text-[#B2430A]"
                : "bg-[#EEF0F4] text-[#5E6275]";

            const prevWorkingSets =
              report?.latestSession?.sets.filter((s) => s.type !== "warmup") ||
              [];

            const restMinutes = Math.floor((ex.rest_seconds || 120) / 60);
            const restRemSeconds = String((ex.rest_seconds || 120) % 60).padStart(
              2,
              "0"
            );

            return (
              <div
                key={`${ex.exercise_template_id}-${idx}`}
                className={`flex flex-col gap-[12px] rounded-[20px] bg-white p-[14px] transition ${
                  isExpanded
                    ? "border-2 border-[#2E3BFF]"
                    : "border border-transparent"
                }`}
              >
                {/* Header row */}
                <div
                  onClick={() =>
                    setExpandedIdx(isExpanded ? null : idx)
                  }
                  className="flex cursor-pointer items-center gap-[12px]"
                >
                  <div
                    className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] text-[14px] font-bold ${
                      isExpanded
                        ? "bg-[#2E3BFF] text-white"
                        : "bg-[#ECEEF3] text-[#0B0D17]"
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                    <span className="truncate text-[15px] font-semibold text-[#0B0D17]">
                      {cleanExerciseName(ex.title)}
                    </span>
                    <span className="truncate text-[12px] font-normal text-[#5E6275]">
                      {isExpanded
                        ? muscleGroupLabel
                        : `${muscleGroupLabel} · ${displaySets.length} × ${repCount} · ${weightKg} kg`}
                    </span>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-[10px] py-[4px] text-[11px] font-semibold ${pillClasses}`}
                  >
                    {badge.label}
                  </span>

                  {isExpanded ? (
                    <ChevronUp className="h-[18px] w-[18px] shrink-0 text-[#5E6275]" />
                  ) : (
                    <ChevronDown className="h-[18px] w-[18px] shrink-0 text-[#5E6275]" />
                  )}
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <>
                    {/* Coach Tip box */}
                    {ex.progression_rationale && (
                      <div className="flex items-start gap-[8px] rounded-[12px] bg-[#F0F1FF] px-[12px] py-[10px]">
                        <Sparkles className="mt-0.5 h-[14px] w-[14px] shrink-0 text-[#2E3BFF]" />
                        <p className="text-[12px] font-normal leading-snug text-[#2A2F7A]">
                          {ex.progression_rationale}
                        </p>
                      </div>
                    )}

                    {/* Sets Table */}
                    <div className="flex flex-col gap-[6px]">
                      {/* Header Row */}
                      <div className="flex items-center gap-[8px] px-[4px] text-[11px] font-semibold text-[#5E6275]">
                        <span className="w-[34px]">Set</span>
                        <span className="flex-1">Previous</span>
                        <span className="w-[64px] text-center">kg</span>
                        <span className="w-[64px] text-center">Reps</span>
                      </div>

                      {/* Set Rows */}
                      {ex.sets.map((s, sIdx) => {
                        const prevSet =
                          prevWorkingSets[sIdx] ||
                          prevWorkingSets[prevWorkingSets.length - 1];
                        const prevWeight =
                          prevSet?.weight_kg ?? s.weight_kg ?? 0;
                        const prevReps = prevSet?.reps ?? s.reps ?? 10;

                        const isLastSet = sIdx === ex.sets.length - 1;
                        const highlightReps =
                          isLastSet && badge.label === "+1 rep";

                        return (
                          <div
                            key={sIdx}
                            className="flex items-center gap-[8px] px-[4px]"
                          >
                            <span className="w-[34px] text-[14px] font-semibold text-[#0B0D17]">
                              {sIdx + 1}
                            </span>
                            <span className="flex-1 text-[13px] font-normal text-[#5E6275]">
                              {prevWeight} × {prevReps}
                            </span>
                            <div className="flex h-[36px] w-[64px] items-center justify-center rounded-[10px] bg-[#ECEEF3]">
                              <input
                                type="number"
                                step="0.5"
                                value={s.weight_kg ?? 0}
                                onChange={(e) =>
                                  handleSetChange(
                                    idx,
                                    sIdx,
                                    "weight_kg",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-transparent text-center text-[15px] font-bold text-[#0B0D17] focus:outline-none"
                              />
                            </div>
                            <div
                              className={`flex h-[36px] w-[64px] items-center justify-center rounded-[10px] ${
                                highlightReps
                                  ? "bg-[#B9F2D2] text-[#0E6A37]"
                                  : "bg-[#ECEEF3] text-[#0B0D17]"
                              }`}
                            >
                              <input
                                type="number"
                                value={s.reps ?? 0}
                                onChange={(e) =>
                                  handleSetChange(
                                    idx,
                                    sIdx,
                                    "reps",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-transparent text-center text-[15px] font-bold focus:outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer row */}
                    <div className="flex items-center justify-between px-[4px] pt-[2px]">
                      <div className="flex items-center gap-[6px] text-[13px] font-normal text-[#5E6275]">
                        <Timer className="h-[14px] w-[14px]" />
                        <span>
                          Rest {restMinutes}:{restRemSeconds}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSet(idx)}
                        className="flex items-center gap-[4px] text-[13px] font-semibold text-[#2E3BFF] transition hover:opacity-80"
                      >
                        <Plus className="h-[14px] w-[14px]" />
                        <span>Add set</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* + Add exercise button or inline picker */}
          {!showAddPicker ? (
            <button
              type="button"
              onClick={() => setShowAddPicker(true)}
              className="flex h-[48px] w-full items-center justify-center gap-[6px] rounded-[20px] border border-[#B9BDCB] text-[14px] font-semibold text-[#5E6275] transition hover:bg-white/60"
            >
              <Plus className="h-[16px] w-[16px]" />
              <span>Add exercise</span>
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-[20px] bg-white p-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#0B0D17]">
                  Add exercise to today&apos;s plan
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddPicker(false)}
                  className="text-[#5E6275] hover:text-[#0B0D17]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {candidateExercises.length > 0 && (
                <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                  {candidateExercises.slice(0, 6).map((rep) => (
                    <button
                      key={rep.exerciseTemplateId}
                      type="button"
                      onClick={() =>
                        handleAddExerciseFromReport(
                          rep.exerciseTemplateId,
                          rep.title,
                          rep.nextTargetWeightKg || rep.currentMaxWeightKg || 30
                        )
                      }
                      className="flex items-center justify-between rounded-[12px] bg-[#ECEEF3]/70 px-3 py-2 text-left text-[13px] font-medium text-[#0B0D17] transition hover:bg-[#ECEEF3]"
                    >
                      <span className="truncate">
                        {cleanExerciseName(rep.title)}
                      </span>
                      <span className="text-[11px] font-semibold text-[#2E3BFF]">
                        + Add ({rep.nextTargetWeightKg || rep.currentMaxWeightKg || 30} kg)
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Custom exercise name..."
                  value={customExTitle}
                  onChange={(e) => setCustomExTitle(e.target.value)}
                  className="h-9 flex-1 rounded-[10px] bg-[#ECEEF3] px-3 text-[13px] text-[#0B0D17] placeholder:text-[#5E6275] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!customExTitle.trim()}
                  onClick={() =>
                    handleAddExerciseFromReport(
                      `custom-${Date.now()}`,
                      customExTitle.trim(),
                      30
                    )
                  }
                  className="h-9 rounded-[10px] bg-[#2E3BFF] px-3 text-[12px] font-semibold text-white disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Status banner if sendResult is present */}
          {sendResult && (
            <div
              className={`rounded-[16px] px-4 py-3 text-[13px] font-medium ${
                sendResult.type === "success"
                  ? "bg-[#B9F2D2] text-[#0E6A37]"
                  : "bg-[#FFE3D2] text-[#B2430A]"
              }`}
            >
              {sendResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center gap-[10px] border-t border-[#E2E4EA] bg-white px-[16px] pb-[30px] pt-[14px]">
        <button
          type="button"
          onClick={onSendToHevy}
          disabled={sendingToHevy}
          className="flex h-[54px] flex-1 items-center justify-center gap-[8px] rounded-[27px] bg-[#2E3BFF] text-[16px] font-bold text-white shadow-sm transition hover:bg-[#2530d9] disabled:opacity-50"
        >
          <span>{sendingToHevy ? "Sending..." : "Send to Hevy"}</span>
          <Send className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={generatingPlan}
          aria-label="Regenerate plan"
          className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[27px] bg-[#ECEEF3] text-[#0B0D17] transition hover:bg-[#dfe2ea] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-[18px] w-[18px] ${
              generatingPlan ? "animate-spin" : ""
            }`}
          />
        </button>
      </div>
    </div>
  );
}
