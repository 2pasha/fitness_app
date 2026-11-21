"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, CircleCheck, Info, Sparkles } from "lucide-react";
import type {
  DashboardAnalyticsPayload,
  MovementPattern,
} from "@/lib/analytics/demo-data";
import type { ProposedRoutineExercise } from "@/lib/ai/coach";
import {
  cleanExerciseName,
  MobileBottomTabBar,
  MobileStatusBar,
} from "./shared";

export interface SuggestedExercisePayload {
  muscleGroup: string;
  title: string;
  setsCount: number;
  reps: number;
  weightKg: number;
  exerciseTemplateId: string;
}

export interface ExpandedMuscularLoadProps {
  analytics: DashboardAnalyticsPayload | null;
  planExercises: ProposedRoutineExercise[];
  onAddSuggestedExercise: (suggestion: SuggestedExercisePayload) => void;
  onBack: () => void;
}

type RangeTab = "last3" | "7d" | "30d";

interface NormalizedMuscleItem {
  muscleGroup: string;
  last3WorkoutsSets: number;
  weeklyWorkingSets: number;
  thirtyDaysSets: number;
}

const CORE_MUSCLES_DEFAULT: NormalizedMuscleItem[] = [
  { muscleGroup: "Quads", last3WorkoutsSets: 11, weeklyWorkingSets: 7, thirtyDaysSets: 28 },
  { muscleGroup: "Shoulders", last3WorkoutsSets: 9, weeklyWorkingSets: 6, thirtyDaysSets: 24 },
  { muscleGroup: "Chest", last3WorkoutsSets: 8, weeklyWorkingSets: 4, thirtyDaysSets: 22 },
  { muscleGroup: "Lats", last3WorkoutsSets: 8, weeklyWorkingSets: 8, thirtyDaysSets: 20 },
  { muscleGroup: "Upper back", last3WorkoutsSets: 6, weeklyWorkingSets: 3, thirtyDaysSets: 16 },
  { muscleGroup: "Hamstrings", last3WorkoutsSets: 6, weeklyWorkingSets: 3, thirtyDaysSets: 16 },
  { muscleGroup: "Triceps", last3WorkoutsSets: 3, weeklyWorkingSets: 3, thirtyDaysSets: 9 },
  { muscleGroup: "Calves", last3WorkoutsSets: 4, weeklyWorkingSets: 4, thirtyDaysSets: 10 },
  { muscleGroup: "Biceps", last3WorkoutsSets: 3, weeklyWorkingSets: 3, thirtyDaysSets: 9 },
  { muscleGroup: "Abs", last3WorkoutsSets: 3, weeklyWorkingSets: 0, thirtyDaysSets: 6 },
];

const DEFAULT_SUGGESTIONS: Record<
  string,
  {
    title: string;
    displayText: string;
    setsCount: number;
    reps: number;
    weightKg: number;
    exerciseTemplateId: string;
    matchKeywords: string[];
  }
> = {
  Triceps: {
    title: "Triceps Pushdown",
    displayText: "Triceps Pushdown · 3 × 12",
    setsCount: 3,
    reps: 12,
    weightKg: 30,
    exerciseTemplateId: "93A552C6",
    matchKeywords: ["pushdown", "tricep", "skullcrusher", "extension"],
  },
  Calves: {
    title: "Seated Calf Raise",
    displayText: "Seated Calf Raise · 3 × 12",
    setsCount: 3,
    reps: 12,
    weightKg: 30,
    exerciseTemplateId: "062AB91A",
    matchKeywords: ["calf"],
  },
  Biceps: {
    title: "Preacher Curl",
    displayText: "Preacher Curl · 3 × 10",
    setsCount: 3,
    reps: 10,
    weightKg: 20,
    exerciseTemplateId: "4F942934",
    matchKeywords: ["preacher", "bicep", "curl"],
  },
  Abs: {
    title: "Plank",
    displayText: "Plank · 3 × 45 s",
    setsCount: 3,
    reps: 45,
    weightKg: 0,
    exerciseTemplateId: "C6C9B8A0",
    matchKeywords: ["plank", "crunch", "ab ", "abs", "leg raise"],
  },
  Hamstrings: {
    title: "Seated Leg Curl",
    displayText: "Seated Leg Curl · 3 × 12",
    setsCount: 3,
    reps: 12,
    weightKg: 55,
    exerciseTemplateId: "B823A91C",
    matchKeywords: ["leg curl", "hamstring", "rdl", "romanian"],
  },
  Lats: {
    title: "Lat Pulldown",
    displayText: "Lat Pulldown · 3 × 10",
    setsCount: 3,
    reps: 10,
    weightKg: 60,
    exerciseTemplateId: "6A6C31A5",
    matchKeywords: ["pulldown", "pull-up", "pull up", "chin"],
  },
  "Upper back": {
    title: "Seated Cable Row",
    displayText: "Seated Cable Row · 3 × 10",
    setsCount: 3,
    reps: 10,
    weightKg: 60,
    exerciseTemplateId: "55E6546F",
    matchKeywords: ["row", "face pull", "rear delt"],
  },
  Chest: {
    title: "Incline DB Press",
    displayText: "Incline DB Press · 3 × 10",
    setsCount: 3,
    reps: 10,
    weightKg: 30,
    exerciseTemplateId: "50DFDFAB",
    matchKeywords: ["bench", "chest", "incline", "fly"],
  },
  Shoulders: {
    title: "Lateral Raise",
    displayText: "Lateral Raise · 3 × 15",
    setsCount: 3,
    reps: 15,
    weightKg: 12,
    exerciseTemplateId: "422B08F1",
    matchKeywords: ["lateral raise", "overhead press", "shoulder press"],
  },
  Quads: {
    title: "Leg Extension",
    displayText: "Leg Extension · 3 × 12",
    setsCount: 3,
    reps: 12,
    weightKg: 50,
    exerciseTemplateId: "D04AC939",
    matchKeywords: ["squat", "leg press", "leg extension", "lunge"],
  },
};

const MOVEMENT_PATTERN_CELLS: Array<{
  shortLabel: string;
  patternKey: MovementPattern;
  fallbackSets: number;
}> = [
  {
    shortLabel: "Knee-dominant",
    patternKey: "Knee-Dominant (Quads)",
    fallbackSets: 11,
  },
  {
    shortLabel: "Hip-hinge",
    patternKey: "Hip-Hinge (Posterior)",
    fallbackSets: 6,
  },
  {
    shortLabel: "Horizontal push",
    patternKey: "Horizontal Push (Chest)",
    fallbackSets: 11,
  },
  {
    shortLabel: "Vertical push",
    patternKey: "Vertical Push (Shoulders)",
    fallbackSets: 9,
  },
  {
    shortLabel: "Horizontal pull",
    patternKey: "Horizontal Pull (Upper Back)",
    fallbackSets: 6,
  },
  {
    shortLabel: "Vertical pull",
    patternKey: "Vertical Pull (Lats)",
    fallbackSets: 8,
  },
];

function canonicalMuscleName(raw: string): string | null {
  const lower = raw.trim().toLowerCase();
  if (lower.includes("quad")) return "Quads";
  if (lower.includes("shoulder") || lower.includes("delt")) return "Shoulders";
  if (lower.includes("chest") || lower.includes("pec")) return "Chest";
  if (lower === "lats" || lower.includes("lat")) return "Lats";
  if (lower.includes("upper back") || lower.includes("upper_back") || lower === "back")
    return "Upper back";
  if (lower.includes("hamstring") || lower.includes("glute")) return "Hamstrings";
  if (lower.includes("tricep")) return "Triceps";
  if (lower.includes("calf") || lower.includes("calves")) return "Calves";
  if (lower.includes("bicep")) return "Biceps";
  if (lower.includes("ab") || lower.includes("core")) return "Abs";
  return null;
}

export function ExpandedMuscularLoad({
  analytics,
  planExercises,
  onAddSuggestedExercise,
  onBack,
}: ExpandedMuscularLoadProps) {
  const [rangeTab, setRangeTab] = useState<RangeTab>("last3");
  const [showInfoBanner, setShowInfoBanner] = useState(false);
  const [locallyAddedMuscles, setLocallyAddedMuscles] = useState<Record<string, boolean>>({});

  const normalizedMuscles = useMemo<NormalizedMuscleItem[]>(() => {
    if (!analytics?.muscleVolumes || analytics.muscleVolumes.length === 0) {
      return CORE_MUSCLES_DEFAULT;
    }

    const byName = new Map<string, NormalizedMuscleItem>();

    for (const item of analytics.muscleVolumes) {
      const canonical = canonicalMuscleName(item.muscleGroup);
      if (!canonical) continue;

      const existing = byName.get(canonical);
      const last3 = item.last3WorkoutsSets ?? 0;
      const weekly = item.weeklyWorkingSets ?? 0;
      const thirty = item.thirtyDaysSets ?? weekly * 3;

      if (!existing) {
        byName.set(canonical, {
          muscleGroup: canonical,
          last3WorkoutsSets: last3,
          weeklyWorkingSets: weekly,
          thirtyDaysSets: thirty,
        });
      } else {
        byName.set(canonical, {
          muscleGroup: canonical,
          last3WorkoutsSets: existing.last3WorkoutsSets + last3,
          weeklyWorkingSets: existing.weeklyWorkingSets + weekly,
          thirtyDaysSets: existing.thirtyDaysSets + thirty,
        });
      }
    }

    // Ensure all 10 core muscles exist in canonical order
    return CORE_MUSCLES_DEFAULT.map((def) => byName.get(def.muscleGroup) || def);
  }, [analytics]);

  const targetThreshold = rangeTab === "30d" ? 18 : 6;

  const getSetsForRange = (m: NormalizedMuscleItem): number => {
    if (rangeTab === "7d") return m.weeklyWorkingSets;
    if (rangeTab === "30d") return m.thirtyDaysSets;
    return m.last3WorkoutsSets;
  };

  const { lowMuscles, optimalMuscles } = useMemo(() => {
    const low: NormalizedMuscleItem[] = [];
    const optimal: NormalizedMuscleItem[] = [];

    for (const m of normalizedMuscles) {
      const sets = getSetsForRange(m);
      if (sets < targetThreshold) {
        low.push(m);
      } else {
        optimal.push(m);
      }
    }

    // Sort optimal descending by sets, keep low ordered closely to design (Triceps, Calves, Biceps, Abs first)
    optimal.sort((a, b) => getSetsForRange(b) - getSetsForRange(a));
    return { lowMuscles: low, optimalMuscles: optimal };
  }, [normalizedMuscles, rangeTab, targetThreshold]);

  const totalMuscles = normalizedMuscles.length;
  const inRangeCount = optimalMuscles.length;

  const patternItems = useMemo(() => {
    const coverage = analytics?.lastThreeAnalysis?.patternCoverage || [];
    const byPattern = new Map<MovementPattern, number>();
    for (const c of coverage) {
      byPattern.set(c.pattern, c.setsInLast3Workouts);
    }

    return MOVEMENT_PATTERN_CELLS.map((cell) => {
      const hasLive = byPattern.has(cell.patternKey);
      const sets = hasLive ? byPattern.get(cell.patternKey)! : cell.fallbackSets;
      return {
        shortLabel: cell.shortLabel,
        sets,
        isCovered: sets >= 6,
      };
    });
  }, [analytics]);

  const getSuggestionForMuscle = (muscleGroup: string) => {
    const fallback = DEFAULT_SUGGESTIONS[muscleGroup] || {
      title: `${muscleGroup} Accessory`,
      displayText: `${muscleGroup} Accessory · 3 × 12`,
      setsCount: 3,
      reps: 12,
      weightKg: 20,
      exerciseTemplateId: `custom-${muscleGroup.toLowerCase()}`,
      matchKeywords: [muscleGroup.toLowerCase()],
    };

    // Check if user's exerciseReports has a specific exercise for this muscle group
    if (analytics?.exerciseReports && !DEFAULT_SUGGESTIONS[muscleGroup]) {
      const matchingReport = analytics.exerciseReports.find(
        (r) => canonicalMuscleName(r.primaryMuscleGroup) === muscleGroup
      );
      if (matchingReport) {
        const cleanTitle = cleanExerciseName(matchingReport.title);
        return {
          title: cleanTitle,
          displayText: `${cleanTitle} · 3 × 10`,
          setsCount: 3,
          reps: 10,
          weightKg: matchingReport.nextTargetWeightKg || 25,
          exerciseTemplateId: matchingReport.exerciseTemplateId,
          matchKeywords: [cleanTitle.toLowerCase()],
        };
      }
    }

    return fallback;
  };

  const isSuggestionInPlan = (
    muscleGroup: string,
    suggestion: ReturnType<typeof getSuggestionForMuscle>
  ): boolean => {
    if (locallyAddedMuscles[muscleGroup]) return true;
    if (!planExercises || planExercises.length === 0) return false;

    return planExercises.some((ex) => {
      if (ex.exercise_template_id === suggestion.exerciseTemplateId) return true;
      const lowerTitle = ex.title.toLowerCase();
      return suggestion.matchKeywords.some((kw) => lowerTitle.includes(kw));
    });
  };

  const rangeHintText =
    rangeTab === "last3"
      ? "Target is 6+ working sets per muscle across your last 3 sessions."
      : rangeTab === "7d"
        ? "Target is 6+ working sets per muscle across the last 7 days."
        : "Target is 18+ working sets per muscle across the last 30 days.";

  return (
    <div className="min-h-screen w-full bg-[#ECEEF3] pb-[86px] text-[#0B0D17]">
      <div className="mx-auto max-w-[430px] lg:max-w-none">
        <MobileStatusBar />

        {/* Content */}
        <div className="flex flex-col gap-[12px] px-[16px] pt-[4px] pb-[28px]">
          {/* Nav Bar */}
          <div className="flex items-center justify-between pb-[8px]">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-[#0B0D17] transition hover:bg-white/80 active:scale-95"
            >
              <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </button>

            <h1 className="text-[17px] font-semibold text-[#0B0D17]">
              Muscular load
            </h1>

            <button
              type="button"
              onClick={() => setShowInfoBanner((prev) => !prev)}
              aria-label="Muscular load info"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-[#0B0D17] transition hover:bg-white/80 active:scale-95"
            >
              <Info className="h-[18px] w-[18px]" strokeWidth={2.1} />
            </button>
          </div>

          {showInfoBanner && (
            <div className="rounded-[18px] bg-white px-[16px] py-[12px] text-[13px] leading-relaxed text-[#5E6275]">
              Research supports 6+ hard working sets per muscle group across every
              3-session microcycle (~10–20 sets/week) to maximize hypertrophy without
              junk volume.
            </div>
          )}

          {/* Range Toggle */}
          <div className="flex w-full rounded-full bg-[#DFE2EA] p-[4px]">
            <button
              type="button"
              onClick={() => setRangeTab("last3")}
              className={`flex h-[36px] flex-1 items-center justify-center rounded-full text-[13px] transition ${
                rangeTab === "last3"
                  ? "bg-white font-semibold text-[#0B0D17] shadow-xs"
                  : "font-medium text-[#5E6275] hover:text-[#0B0D17]"
              }`}
            >
              Last 3 sessions
            </button>
            <button
              type="button"
              onClick={() => setRangeTab("7d")}
              className={`flex h-[36px] flex-1 items-center justify-center rounded-full text-[13px] transition ${
                rangeTab === "7d"
                  ? "bg-white font-semibold text-[#0B0D17] shadow-xs"
                  : "font-medium text-[#5E6275] hover:text-[#0B0D17]"
              }`}
            >
              7 days
            </button>
            <button
              type="button"
              onClick={() => setRangeTab("30d")}
              className={`flex h-[36px] flex-1 items-center justify-center rounded-full text-[13px] transition ${
                rangeTab === "30d"
                  ? "bg-white font-semibold text-[#0B0D17] shadow-xs"
                  : "font-medium text-[#5E6275] hover:text-[#0B0D17]"
              }`}
            >
              30 days
            </button>
          </div>

          {/* Summary dark card */}
          <div className="flex flex-col gap-[14px] rounded-[24px] bg-[#0B0D17] p-[18px]">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-[6px]">
                <span className="text-[44px] font-bold leading-none tracking-[-1.5px] text-white">
                  {inRangeCount}/{totalMuscles}
                </span>
                <span className="pb-[3px] text-[14px] font-normal text-[#A9ADC2]">
                  muscles in range
                </span>
              </div>
            </div>

            {/* 10 Segments */}
            <div className="flex h-[10px] w-full gap-[4px]">
              {Array.from({ length: totalMuscles }, (_, idx) => {
                const isOptimalSeg = idx < inRangeCount;
                return (
                  <div
                    key={idx}
                    className={`h-[10px] flex-1 rounded-[3px] transition-colors ${
                      isOptimalSeg ? "bg-[#B9F2D2]" : "bg-[#FF7A33]"
                    }`}
                  />
                );
              })}
            </div>

            <p className="text-[13px] font-normal text-[#A9ADC2]">{rangeHintText}</p>
          </div>

          {/* Needs Work card */}
          <div className="flex flex-col gap-[4px] rounded-[24px] bg-white px-[18px] pt-[18px] pb-[8px]">
            <div className="flex items-center justify-between pb-[8px]">
              <h2 className="text-[17px] font-semibold text-[#0B0D17]">
                Needs work
              </h2>
              <div className="rounded-full bg-[#FFE3D2] px-[10px] py-[3px]">
                <span className="block text-[10px] font-bold tracking-[0.8px] text-[#B2430A]">
                  {lowMuscles.length} LOW
                </span>
              </div>
            </div>

            {lowMuscles.length === 0 ? (
              <div className="border-t border-[#EEF0F4] py-[14px] text-[13px] text-[#5E6275]">
                All 10 muscle groups have reached their target working sets.
              </div>
            ) : (
              lowMuscles.map((m) => {
                const currentSets = getSetsForRange(m);
                const maxBarSets = rangeTab === "30d" ? 36 : 12;
                const fillWidthPx = Math.min(
                  90,
                  Math.max(8, Math.round((currentSets / maxBarSets) * 90))
                );
                const suggestion = getSuggestionForMuscle(m.muscleGroup);
                const inPlan = isSuggestionInPlan(m.muscleGroup, suggestion);

                return (
                  <div
                    key={m.muscleGroup}
                    className="flex flex-col gap-[10px] border-t border-[#EEF0F4] py-[12px]"
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-[12px]">
                      <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                        <span className="text-[15px] font-semibold text-[#0B0D17]">
                          {m.muscleGroup}
                        </span>
                        <span className="text-[12px] font-normal text-[#5E6275]">
                          {m.last3WorkoutsSets} sets last 3 · {m.weeklyWorkingSets} in 7
                          days
                        </span>
                      </div>

                      <div className="h-[8px] w-[90px] shrink-0 overflow-hidden rounded-[4px] bg-[#ECEEF3]">
                        <div
                          className="h-full rounded-[4px] bg-[#FF7A33] transition-all duration-300"
                          style={{ width: `${fillWidthPx}px` }}
                        />
                      </div>
                    </div>

                    {/* Suggestion pill */}
                    {inPlan ? (
                      <div className="flex items-center gap-[10px] rounded-[14px] bg-[#E9F9F0] py-[8px] pr-[8px] pl-[12px]">
                        <CircleCheck
                          className="h-[16px] w-[16px] shrink-0 text-[#0E6A37]"
                          strokeWidth={2.3}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#0B0D17]">
                          {suggestion.displayText}
                        </span>
                        <div className="shrink-0 rounded-full px-[12px] py-[6px]">
                          <span className="block text-[12px] font-semibold leading-none text-[#0E6A37]">
                            In plan
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-[10px] rounded-[14px] bg-[#F5F6F9] py-[8px] pr-[8px] pl-[12px]">
                        <Sparkles
                          className="h-[16px] w-[16px] shrink-0 text-[#2E3BFF]"
                          strokeWidth={2.2}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#0B0D17]">
                          {suggestion.displayText}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLocallyAddedMuscles((prev) => ({
                              ...prev,
                              [m.muscleGroup]: true,
                            }));
                            onAddSuggestedExercise({
                              muscleGroup: m.muscleGroup,
                              title: suggestion.title,
                              setsCount: suggestion.setsCount,
                              reps: suggestion.reps,
                              weightKg: suggestion.weightKg,
                              exerciseTemplateId: suggestion.exerciseTemplateId,
                            });
                          }}
                          className="shrink-0 rounded-full bg-[#2E3BFF] px-[12px] py-[6px] text-[12px] font-semibold leading-none text-white transition hover:bg-[#2530d9] active:scale-95"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* In Range card */}
          <div className="flex flex-col gap-[4px] rounded-[24px] bg-white px-[18px] pt-[18px] pb-[10px]">
            <div className="flex items-center justify-between pb-[8px]">
              <h2 className="text-[17px] font-semibold text-[#0B0D17]">In range</h2>
              <div className="rounded-full bg-[#B9F2D2] px-[10px] py-[3px]">
                <span className="block text-[10px] font-bold tracking-[0.8px] text-[#0E6A37]">
                  {optimalMuscles.length} OPTIMAL
                </span>
              </div>
            </div>

            {optimalMuscles.map((m) => {
              const sets = getSetsForRange(m);
              const maxScale = rangeTab === "30d" ? 36 : 14;
              const widthPct = Math.min(
                100,
                Math.max(15, Math.round((sets / maxScale) * 100))
              );

              return (
                <div
                  key={m.muscleGroup}
                  className="flex items-center gap-[12px] py-[8px]"
                >
                  <span className="w-[92px] shrink-0 truncate text-[14px] font-medium text-[#0B0D17]">
                    {m.muscleGroup}
                  </span>

                  <div className="h-[8px] flex-1 overflow-hidden rounded-[4px] bg-[#ECEEF3]">
                    <div
                      className="h-full rounded-[4px] bg-[#2E3BFF] transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  <span className="w-[20px] shrink-0 text-right text-[14px] font-semibold text-[#0B0D17]">
                    {sets}
                  </span>

                  <span className="w-[36px] shrink-0 text-right text-[12px] font-normal text-[#5E6275]">
                    7d {m.weeklyWorkingSets}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Movement Patterns card */}
          <div className="flex flex-col gap-[10px] rounded-[24px] bg-white p-[18px]">
            <h2 className="text-[17px] font-semibold text-[#0B0D17]">
              Movement patterns
            </h2>

            <div className="grid grid-cols-2 gap-[8px]">
              {patternItems.map((item) => (
                <div
                  key={item.shortLabel}
                  className="flex flex-col gap-[2px] rounded-[14px] bg-[#ECEEF3] p-[12px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[16px] font-bold text-[#0B0D17]">
                      {item.sets} sets
                    </span>
                    <CircleCheck
                      className={`h-[16px] w-[16px] shrink-0 ${
                        item.isCovered ? "text-[#30C15A]" : "text-[#FF7A33]"
                      }`}
                      strokeWidth={2.3}
                    />
                  </div>
                  <span className="text-[12px] font-normal text-[#5E6275]">
                    {item.shortLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <MobileBottomTabBar onHomeClick={onBack} />
      </div>
    </div>
  );
}
