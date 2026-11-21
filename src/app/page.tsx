"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  ChevronRight,
  History,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
} from "lucide-react";
import type { DetailedWorkoutView } from "@/app/api/hevy/workouts/route";
import type { CoachResponse, ProposedWorkoutRoutine } from "@/lib/ai/coach";
import type { DashboardAnalyticsPayload } from "@/lib/analytics/demo-data";
import {
  cleanExerciseName,
  cleanRoutineTitle,
  CompactNavPill,
  ExpandedViewType,
  getTargetBadgeForExercise,
  GoalProgressRing,
  LanguageToggle,
  MobileBottomTabBar,
} from "@/components/home/shared";
import {
  capitalizeFirst,
  formatTimeAgoLocalized,
  getDateLocale,
  translateMuscle,
  translateTargetBadge,
  useI18n,
  WEEKDAY_LETTERS,
} from "@/lib/i18n";
import { ExpandedWeeklyGoal } from "@/components/home/ExpandedWeeklyGoal";
import { ExpandedMuscularLoad } from "@/components/home/ExpandedMuscularLoad";
import { ExpandedTodayPlan } from "@/components/home/ExpandedTodayPlan";
import { ExpandedLastSession } from "@/components/home/ExpandedLastSession";
import { MuscularLoadBodyMap } from "@/components/home/MuscularLoadBodyMap";

const CORE_MUSCLES_MOBILE = [
  "Quads",
  "Shoulders",
  "Chest",
  "Lats",
  "Calves",
  "Triceps",
  "Biceps",
  "Abs",
];

const CORE_MUSCLES_DESKTOP = [
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
];

function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMuscleLabelForPlanRow(
  title: string,
  movementPattern?: string,
  analytics?: DashboardAnalyticsPayload | null,
  templateId?: string
): string {
  const t = title.toLowerCase();
  if (t.includes("squat") || t.includes("leg extension") || t.includes("leg press"))
    return "Quads";
  if (t.includes("bench") || t.includes("chest") || t.includes("fly"))
    return "Chest";
  if (t.includes("row") || t.includes("face pull")) return "Upper back";
  if (t.includes("leg curl") || t.includes("rdl") || t.includes("deadlift"))
    return "Hamstrings";
  if (t.includes("lateral raise") || t.includes("shoulder") || t.includes("overhead"))
    return "Shoulders";
  if (t.includes("pulldown") || t.includes("pull-up") || t.includes("pull up"))
    return "Lats";
  if (t.includes("tricep") || t.includes("pushdown")) return "Triceps";
  if (t.includes("bicep") || t.includes("curl")) return "Biceps";
  if (t.includes("calf") || t.includes("calves")) return "Calves";
  if (t.includes("plank") || t.includes("ab")) return "Abs";

  const rep = analytics?.exerciseReports.find(
    (r) => r.exerciseTemplateId === templateId
  );
  if (rep?.primaryMuscleGroup) {
    const m = rep.primaryMuscleGroup.toLowerCase();
    if (m.includes("quad")) return "Quads";
    if (m.includes("chest")) return "Chest";
    if (m.includes("upper_back")) return "Upper back";
    if (m.includes("hamstring")) return "Hamstrings";
    if (m.includes("shoulder")) return "Shoulders";
    if (m.includes("lat")) return "Lats";
    if (m.includes("tricep")) return "Triceps";
    if (m.includes("bicep")) return "Biceps";
    if (m.includes("calf") || m.includes("calves")) return "Calves";
  }

  if (movementPattern?.includes("Quads")) return "Quads";
  if (movementPattern?.includes("Chest")) return "Chest";
  if (movementPattern?.includes("Upper Back")) return "Upper back";
  if (movementPattern?.includes("Posterior")) return "Hamstrings";
  if (movementPattern?.includes("Shoulders")) return "Shoulders";
  if (movementPattern?.includes("Lats")) return "Lats";
  return "Accessory";
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return "just now";
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (diffSec < 90) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function HevyAppPage() {
  const { locale, t } = useI18n();
  // Navigation & Expanded View state
  const [expandedView, setExpandedView] = useState<ExpandedViewType>(null);
  const desktopModalScrollRef = useRef<HTMLDivElement | null>(null);
  const prevLocaleRef = useRef<string>(locale);

  useEffect(() => {
    if (expandedView !== null) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (desktopModalScrollRef.current) {
        desktopModalScrollRef.current.scrollTop = 0;
      }
    }
  }, [expandedView]);

  // Workouts & DB stats
  const [workouts, setWorkouts] = useState<DetailedWorkoutView[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("");
  const [dbStats, setDbStats] = useState<{
    workoutsInDb: number;
    exercisesInDb: number;
    setsInDb: number;
    lastSyncAt: string | null;
  }>({
    workoutsInDb: 0,
    exercisesInDb: 0,
    setsInDb: 0,
    lastSyncAt: null,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Analytics & Weekly Goal state
  const [analytics, setAnalytics] =
    useState<DashboardAnalyticsPayload | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(3);

  // Today's AI Plan state
  const [generatingPlan, setGeneratingPlan] = useState<boolean>(false);
  const [coachResponse, setCoachResponse] = useState<CoachResponse | null>(
    null
  );
  const [editablePlan, setEditablePlan] =
    useState<ProposedWorkoutRoutine | null>(null);
  const [sendingToHevy, setSendingToHevy] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadAllData = useCallback(async (triggerSync = false) => {
    try {
      if (triggerSync) {
        setSyncing(true);
      } else {
        setLoading(true);
      }

      const workoutsUrl = triggerSync
        ? "/api/hevy/workouts?sync=true"
        : "/api/hevy/workouts";

      const [workoutsRes, analyticsRes, settingsRes] = await Promise.all([
        fetch(workoutsUrl),
        fetch("/api/analytics"),
        fetch("/api/settings"),
      ]);

      const [workoutsData, analyticsData, settingsData] = await Promise.all([
        workoutsRes.json().catch(() => ({})),
        analyticsRes.json().catch(() => ({})),
        settingsRes.json().catch(() => ({})),
      ]);

      if (Array.isArray(workoutsData.workouts)) {
        setWorkouts(workoutsData.workouts);
        if (workoutsData.workouts.length > 0) {
          setSelectedWorkoutId((prev) =>
            prev && workoutsData.workouts.some((w: DetailedWorkoutView) => w.id === prev)
              ? prev
              : workoutsData.workouts[0].id
          );
        }
      }

      if (workoutsData.dbStats) {
        setDbStats(workoutsData.dbStats);
      }

      if (analyticsData.analytics) {
        setAnalytics(analyticsData.analytics);
      }

      if (typeof settingsData.weeklyGoalSessions === "number") {
        setWeeklyGoal(settingsData.weeklyGoalSessions);
      }
    } catch (err) {
      console.error("Error loading home screen data:", err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  const handleGeneratePlan = useCallback(
    async (customPrompt?: string, overrideLocale?: "en" | "uk") => {
      try {
        setGeneratingPlan(true);
        setSendResult(null);

        const activeLocale = overrideLocale ?? locale;
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message:
              customPrompt ||
              "What should I do today based on my last 3 workouts?",
            locale: activeLocale,
          }),
        });

        const data = await res.json();
        if (res.ok && data.workoutPlan) {
          setCoachResponse(data);
          setEditablePlan(data.workoutPlan);
        }
      } catch (err) {
        console.error("Failed to generate plan:", err);
      } finally {
        setGeneratingPlan(false);
      }
    },
    [locale]
  );

  useEffect(() => {
    loadAllData(false);
    handleGeneratePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevLocaleRef.current !== locale) {
      prevLocaleRef.current = locale;
      handleGeneratePlan(undefined, locale);
    }
  }, [locale, handleGeneratePlan]);

  const handleUpdateWeeklyGoal = useCallback(async (newGoal: number) => {
    const clamped = Math.max(1, Math.min(14, newGoal));
    setWeeklyGoal(clamped);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyGoalSessions: clamped }),
      });
    } catch (err) {
      console.error("Failed to persist weekly goal:", err);
    }
  }, []);

  const handleSendToHevy = useCallback(async () => {
    if (!editablePlan) return;
    try {
      setSendingToHevy(true);
      setSendResult(null);

      const res = await fetch("/api/hevy/push-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutPlan: editablePlan,
          mode: "create_new",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send routine to Hevy");
      }

      setSendResult({
        type: "success",
        message: t.sentSuccess(data.title, data.exercisesCount, data.totalSets),
      });
    } catch (err: unknown) {
      setSendResult({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to send routine to Hevy",
      });
    } finally {
      setSendingToHevy(false);
    }
  }, [editablePlan]);

  const handleAddSuggestedExercise = useCallback(
    (suggestion: {
      muscleGroup: string;
      title: string;
      setsCount: number;
      reps: number;
      weightKg: number;
      exerciseTemplateId: string;
    }) => {
      setEditablePlan((prev) => {
        if (!prev) return prev;
        const alreadyExists = prev.exercises.some(
          (e) =>
            e.exercise_template_id === suggestion.exerciseTemplateId ||
            e.title.toLowerCase().includes(suggestion.title.toLowerCase())
        );
        if (alreadyExists) return prev;

        const sets = Array.from({ length: suggestion.setsCount }, () => ({
          type: "normal" as const,
          weight_kg: suggestion.weightKg,
          reps: suggestion.reps,
        }));

        return {
          ...prev,
          exercises: [
            ...prev.exercises,
            {
              exercise_template_id: suggestion.exerciseTemplateId,
              title: suggestion.title,
              priorityBadge: `Catch-up (${suggestion.muscleGroup})`,
              superset_id: null,
              rest_seconds: 90,
              notes: `Added to bring ${suggestion.muscleGroup} volume into optimal range`,
              progression_rationale: `${suggestion.muscleGroup} are running light across your last 3 sessions, so ${suggestion.title} is added.`,
              sets,
            },
          ],
        };
      });
    },
    []
  );

  // Reference today date (aligns with real system clock)
  const today = useMemo(() => new Date(), []);
  const dateLocale = getDateLocale(locale);
  const weekdayTitle = capitalizeFirst(
    today.toLocaleDateString(dateLocale, { weekday: "long" })
  );
  const monthDayStr = today.toLocaleDateString(dateLocale, {
    month: "long",
    day: "numeric",
  });
  const weekNum = getISOWeekNumber(today);

  // Build current Sunday..Saturday week days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday

    const letters = WEEKDAY_LETTERS[locale];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;

      const workoutOnDay = workouts.find(
        (w) => w.start_time.slice(0, 10) === dateIso
      );
      const isToday =
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();

      return {
        weekdayLetter: letters[i],
        dayNumber: d.getDate(),
        dateIso,
        isToday,
        workout: workoutOnDay || null,
      };
    });
  }, [today, workouts, locale]);

  const completedSessionsThisWeek = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return workouts.filter((w) => {
      const t = new Date(w.start_time).getTime();
      return t >= startOfWeek.getTime() && t < endOfWeek.getTime();
    }).length;
  }, [today, workouts]);

  const sessionsRemaining = Math.max(0, weeklyGoal - completedSessionsThisWeek);
  const plannedTitleClean = cleanRoutineTitle(
    editablePlan?.baseRoutineTitle || editablePlan?.title || "Full Body A"
  );
  const plannedTotalSets = useMemo(
    () =>
      editablePlan
        ? editablePlan.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
        : 0,
    [editablePlan]
  );
  const plannedDurationMin = editablePlan?.estimatedDurationMinutes || 55;

  // Build ordered Muscular Load list for Mobile (8 rows) & Desktop (10 rows)
  const getMuscleRows = useCallback(
    (names: string[]) => {
      const map = new Map(
        (analytics?.muscleVolumes || []).map((m) => [
          m.muscleGroup.toLowerCase(),
          m,
        ])
      );
      return names.map((name) => {
        const found = map.get(name.toLowerCase());
        const sets = found ? found.last3WorkoutsSets : 0;
        const isOptimal = sets >= 6;
        return {
          name,
          sets,
          isOptimal,
          pct: Math.min(100, Math.max(12, Math.round((sets / 14) * 100))),
        };
      });
    },
    [analytics]
  );

  const mobileMuscleRows = useMemo(
    () => getMuscleRows(CORE_MUSCLES_MOBILE),
    [getMuscleRows]
  );
  const desktopMuscleRows = useMemo(
    () => getMuscleRows(CORE_MUSCLES_DESKTOP),
    [getMuscleRows]
  );

  // Coach note concise text
  const whyThisPlanNote = useMemo(() => {
    if (!editablePlan || editablePlan.exercises.length === 0) {
      return t.defaultWhyPlan;
    }
    if (locale === "uk" && editablePlan.notes) {
      return editablePlan.notes;
    }
    const plateauEx = editablePlan.exercises.find((e) =>
      e.progression_rationale.toLowerCase().includes("held")
    );
    const catchupEx = editablePlan.exercises.find(
      (e) =>
        e.priorityBadge ||
        e.title.toLowerCase().includes("tricep") ||
        e.title.toLowerCase().includes("pushdown")
    );
    if (plateauEx && locale === "en") {
      const cleanName = cleanExerciseName(plateauEx.title);
      const w = plateauEx.sets.find((s) => s.type !== "warmup")?.weight_kg ?? 40;
      const r =
        (plateauEx.sets.find((s) => s.type !== "warmup")?.reps ?? 12) + 1;
      const catchupSentence = catchupEx
        ? ` Triceps are running light, so ${cleanExerciseName(
            catchupEx.title
          ).toLowerCase()}s are added.`
        : "";
      return `${cleanName} has held at ${w} kg for 3 sessions, so keep the weight and chase ${r} reps.${catchupSentence}`;
    }
    return editablePlan.exercises[0]?.progression_rationale || t.defaultWhyPlanBuilt;
  }, [editablePlan, locale, t]);

  const latestWorkout = workouts[0] || null;
  const activeSelectedWorkout =
    workouts.find((w) => w.id === selectedWorkoutId) || latestWorkout;

  const formatLastSessionTitle = (w: DetailedWorkoutView) => {
    try {
      const d = new Date(w.start_time);
      const dayStr = d.toLocaleDateString(dateLocale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return `${w.title} · ${dayStr}`;
    } catch {
      return w.title;
    }
  };

  const renderExpandedViewContent = () => {
    if (expandedView === "weekly_goal") {
      return (
        <ExpandedWeeklyGoal
          workouts={workouts}
          weeklyGoal={weeklyGoal}
          onUpdateWeeklyGoal={handleUpdateWeeklyGoal}
          plannedRoutineTitle={plannedTitleClean}
          plannedDurationMinutes={plannedDurationMin}
          onBack={() => setExpandedView(null)}
          onOpenPlan={() => setExpandedView("today_plan")}
          onSelectWorkout={(wId) => {
            setSelectedWorkoutId(wId);
            setExpandedView("last_session");
          }}
        />
      );
    }
    if (expandedView === "muscular_load") {
      return (
        <ExpandedMuscularLoad
          analytics={analytics}
          planExercises={editablePlan?.exercises || []}
          onAddSuggestedExercise={handleAddSuggestedExercise}
          onBack={() => setExpandedView(null)}
        />
      );
    }
    if (expandedView === "today_plan") {
      return (
        <ExpandedTodayPlan
          plan={editablePlan}
          coachReply={coachResponse?.coachingReply || null}
          analytics={analytics}
          generatingPlan={generatingPlan}
          sendingToHevy={sendingToHevy}
          sendResult={sendResult}
          onUpdatePlan={setEditablePlan}
          onSendToHevy={handleSendToHevy}
          onRegenerate={() => handleGeneratePlan()}
          onBack={() => setExpandedView(null)}
        />
      );
    }
    if (expandedView === "last_session") {
      return (
        <ExpandedLastSession
          workout={activeSelectedWorkout}
          analytics={analytics}
          onBack={() => setExpandedView(null)}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#ECEEF3] text-[#0B0D17]">
      {/* =====================================================================
          MOBILE FULL-SCREEN PUSH VIEW WHEN AN EXPANDED VIEW IS OPEN
         ===================================================================== */}
      {expandedView !== null && (
        <div className="min-h-screen lg:hidden">
          <div className="mx-auto max-w-[430px]">
            {renderExpandedViewContent()}
          </div>
          {expandedView === "last_session" && (
            <MobileBottomTabBar onHomeClick={() => setExpandedView(null)} />
          )}
        </div>
      )}

      {/* =====================================================================
          DESKTOP MODAL / DRAWER OVERLAY WHEN AN EXPANDED VIEW IS OPEN
         ===================================================================== */}
      {expandedView !== null && (
        <div
          className="fixed inset-0 z-50 hidden items-center justify-center bg-[#0B0D17]/50 p-6 backdrop-blur-xs lg:flex"
          onClick={() => setExpandedView(null)}
        >
          <div
            ref={desktopModalScrollRef}
            className="relative max-h-[90vh] w-full max-w-[440px] overflow-y-auto rounded-[32px] bg-[#ECEEF3] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpandedView(null)}
              aria-label="Close expanded view"
              className="absolute right-4 top-4 z-20 hidden rounded-full bg-white/80 p-2 text-[#0B0D17] shadow-xs transition hover:bg-white"
            >
              <X className="h-4 w-4" />
            </button>
            {renderExpandedViewContent()}
          </div>
        </div>
      )}

      {/* =====================================================================
          MAIN MOBILE HOME VIEW — Node ID: eUTLi
         ===================================================================== */}
      <div
        className={`mx-auto max-w-[430px] pb-24 lg:hidden ${
          expandedView !== null ? "hidden" : "block"
        }`}
      >
        <div className="flex flex-col gap-[10px] px-[16px] pt-[16px] pb-[28px]">
          {/* Header */}
          <div className="flex items-center justify-between px-[4px] pb-[14px]">
            <div className="flex flex-col gap-[2px]">
              <h1 className="text-[34px] font-bold leading-tight tracking-[-1px] text-[#0B0D17]">
                {weekdayTitle}
              </h1>
              <p className="text-[14px] font-normal text-[#5E6275]">
                {monthDayStr} · {t.weekPrefix} {weekNum}
              </p>
            </div>

            <div className="flex items-center gap-[8px]">
              <LanguageToggle compact />
              <button
                type="button"
                onClick={() => loadAllData(true)}
                disabled={syncing}
                aria-label={t.syncWithHevyAria}
                className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-[#0B0D17] shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-[18px] w-[18px] ${
                    syncing ? "animate-spin" : ""
                  }`}
                />
              </button>
              <button
                type="button"
                aria-label={t.accountAria}
                className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-[#0B0D17] shadow-2xs transition active:scale-95"
              >
                <User className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          {/* Week Calendar */}
          <div className="grid grid-cols-7 pt-[2px] pb-[6px]">
            {weekDays.map((d) => {
              const hasWorkout = Boolean(d.workout);
              return (
                <button
                  key={d.dateIso}
                  type="button"
                  onClick={() => {
                    if (d.workout) {
                      setSelectedWorkoutId(d.workout.id);
                      setExpandedView("last_session");
                    } else {
                      setExpandedView("weekly_goal");
                    }
                  }}
                  className="flex flex-col items-center gap-[6px]"
                >
                  <span className="text-[12px] font-medium text-[#8E8E93]">
                    {d.weekdayLetter}
                  </span>
                  <div
                    className={`flex h-[38px] w-[38px] items-center justify-center rounded-full text-[14px] font-semibold transition ${
                      d.isToday
                        ? "border border-[#D1D1D6] bg-[#1C1C1E] text-white"
                        : hasWorkout
                        ? "border-2 border-[#30C15A] text-[#1C1C1E]"
                        : "border border-[#D1D1D6] text-[#1C1C1E]"
                    }`}
                  >
                    {d.dayNumber}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Weekly Goal Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpandedView("weekly_goal")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setExpandedView("weekly_goal");
            }}
            className="flex w-full cursor-pointer items-center justify-between gap-[20px] rounded-[24px] bg-[#0B0D17] py-[18px] pr-[22px] pl-[18px] text-left transition active:scale-[0.99]"
          >
            <GoalProgressRing
              completed={completedSessionsThisWeek}
              goal={weeklyGoal}
              size={118}
              innerRadiusRatio={0.8}
            />
            <div className="flex flex-1 flex-col gap-[6px]">
              <span className="text-[13px] font-normal text-[#A9ADC2]">
                {t.weeklyGoal}
              </span>
              <p className="text-[22px] font-bold leading-tight tracking-[-0.5px] text-white">
                {sessionsRemaining === 0
                  ? t.goalComplete
                  : t.sessionsToGo(sessionsRemaining)}
              </p>
              <p className="text-[13px] font-normal leading-snug text-[#A9ADC2]">
                {sessionsRemaining <= 1
                  ? t.todayClosesWeek(plannedTitleClean)
                  : t.todayKeepsPace(plannedTitleClean)}
              </p>
            </div>
          </div>

          {/* Muscular Load Card — Node ID: gXu83 */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpandedView("muscular_load")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setExpandedView("muscular_load");
            }}
            className="flex w-full cursor-pointer flex-col gap-[14px] rounded-[24px] bg-white p-[18px] transition active:scale-[0.99]"
          >
            <div className="flex items-center justify-between pb-[6px]">
              <span className="text-[17px] font-semibold text-[#0B0D17]">
                {t.muscularLoad}
              </span>
              <span className="text-[12px] font-normal text-[#5E6275]">
                {t.setsLast3}
              </span>
            </div>

            {loading && !analytics ? (
              <div className="flex h-[280px] w-full animate-pulse items-center justify-center rounded-2xl bg-[#ECEEF3]" />
            ) : (
              <MuscularLoadBodyMap
                muscles={desktopMuscleRows.map((r) => ({
                  name: r.name,
                  sets: r.sets,
                }))}
              />
            )}
          </div>

          {/* Today's AI Plan Card */}
          <div
            onClick={() => setExpandedView("today_plan")}
            className="flex w-full cursor-pointer flex-col gap-[16px] rounded-[24px] bg-[#2E3BFF] p-[20px] text-white transition active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-[4px]">
                <span className="text-[13px] font-normal text-[#C9CCFF]">
                  {t.todaysAiPlan}
                </span>
                <h2 className="text-[28px] font-bold leading-none tracking-[-0.5px] text-white">
                  {plannedTitleClean}
                </h2>
              </div>
              <div className="rounded-full bg-white/15 px-[10px] py-[6px]">
                <span className="text-[12px] font-semibold text-white">
                  ~{plannedDurationMin} {t.min}
                </span>
              </div>
            </div>

            {generatingPlan && !editablePlan ? (
              <div className="space-y-2.5 py-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-5 w-full animate-pulse rounded-lg bg-white/15"
                  />
                ))}
              </div>
            ) : editablePlan ? (
              <div className="flex flex-col gap-[8px]">
                {editablePlan.exercises.slice(0, 4).map((ex, i) => {
                  const workingSets = ex.sets.filter(
                    (s) => s.type !== "warmup"
                  );
                  const setsToUse =
                    workingSets.length > 0 ? workingSets : ex.sets;
                  const count = setsToUse.length;
                  const reps = setsToUse[0]?.reps ?? 10;
                  const weight = setsToUse[0]?.weight_kg ?? 0;
                  return (
                    <div
                      key={`${ex.exercise_template_id}-${i}`}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[15px] font-medium text-white">
                        {cleanExerciseName(ex.title)}
                      </span>
                      <span className="text-[14px] font-normal text-[#C9CCFF]">
                        {count}×{reps} · {weight} {t.kg}
                      </span>
                    </div>
                  );
                })}
                {editablePlan.exercises.length > 4 && (
                  <span className="text-[13px] font-normal text-[#C9CCFF]">
                    {t.moreLifts(editablePlan.exercises.length - 4)}
                  </span>
                )}
              </div>
            ) : null}

            {sendResult && (
              <div
                className={`rounded-xl px-3 py-2 text-xs font-medium ${
                  sendResult.type === "success"
                    ? "bg-[#B9F2D2] text-[#0E6A37]"
                    : "bg-[#FFE3D2] text-[#B2430A]"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {sendResult.message}
              </div>
            )}

            <div
              className="flex items-center gap-[8px]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleSendToHevy}
                disabled={sendingToHevy || !editablePlan}
                className="flex h-[52px] flex-1 items-center justify-center gap-[8px] rounded-[26px] bg-white text-[16px] font-bold text-[#2E3BFF] transition hover:bg-white/95 active:scale-[0.99] disabled:opacity-60"
              >
                <span>{sendingToHevy ? t.sending : t.sendToHevy}</span>
                <Send className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setExpandedView("today_plan")}
                aria-label={t.editPlan}
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[26px] border border-white/35 text-white transition hover:bg-white/10"
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          {/* Last Session Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (latestWorkout) {
                setSelectedWorkoutId(latestWorkout.id);
              }
              setExpandedView("last_session");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                setExpandedView("last_session");
            }}
            className="flex w-full cursor-pointer items-center gap-[14px] rounded-[24px] bg-white py-[14px] px-[16px] transition active:scale-[0.99]"
          >
            <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-[#ECEEF3] text-[#0B0D17]">
              <History className="h-[20px] w-[20px]" />
            </div>
            {loading && !latestWorkout ? (
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-36 animate-pulse rounded bg-[#ECEEF3]" />
                <div className="h-3.5 w-48 animate-pulse rounded bg-[#ECEEF3]" />
              </div>
            ) : latestWorkout ? (
              <div className="flex flex-1 flex-col gap-[2px]">
                <span className="text-[15px] font-semibold text-[#0B0D17]">
                  {formatLastSessionTitle(latestWorkout)}
                </span>
                <span className="text-[13px] font-normal text-[#5E6275]">
                  {Math.round(latestWorkout.duration_seconds / 60)} {t.min} ·{" "}
                  {t.setsCount(latestWorkout.total_working_sets)} ·{" "}
                  {(latestWorkout.total_volume_kg / 1000).toFixed(1)} {t.t}{" "}
                  {t.movedSuffix}
                </span>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-[2px]">
                <span className="text-[15px] font-semibold text-[#0B0D17]">
                  {t.noSessionsYet}
                </span>
                <span className="text-[13px] font-normal text-[#5E6275]">
                  {t.tapRefreshToSync}
                </span>
              </div>
            )}
            <ChevronRight className="h-[20px] w-[20px] shrink-0 text-[#5E6275]" />
          </div>
        </div>

        <MobileBottomTabBar onHomeClick={() => setExpandedView(null)} />
      </div>

      {/* =====================================================================
          MAIN DESKTOP VIEW — Node ID: b4sbg
         ===================================================================== */}
      <div className="hidden min-h-screen w-full flex-col bg-[#ECEEF3] lg:flex">
        {/* Top Bar (L98Eq) */}
        <header className="flex w-full items-center px-[40px] py-[20px]">
          {/* Left: Logo */}
          <div className="flex flex-1 items-center">
            <div className="flex items-center gap-[10px]">
              <img
                src="/spotter-logo.png"
                alt="Spotter"
                className="h-[34px] w-[34px] rounded-[10px] object-cover"
              />
              <span className="text-[20px] font-bold tracking-[-0.5px] text-[#0B0D17]">
                Spotter
              </span>
            </div>
          </div>

          {/* Center: Compact Nav Pill (B3SeO) */}
          <div className="flex shrink-0 justify-center">
            <CompactNavPill onHomeClick={() => setExpandedView(null)} />
          </div>

          {/* Right: Language Toggle + Sync Pill + Avatar */}
          <div className="flex flex-1 items-center justify-end gap-[10px]">
            <LanguageToggle />

            <div className="flex h-[44px] items-center gap-[10px] rounded-[22px] bg-white pr-[8px] pl-[16px]">
              <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#3DDC84]" />
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold text-[#0B0D17]">
                  {t.syncedWithHevy}
                </span>
                <span className="text-[11px] font-normal text-[#5E6275]">
                  {t.workoutsCount(dbStats.workoutsInDb)} ·{" "}
                  {formatTimeAgoLocalized(dbStats.lastSyncAt, locale)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => loadAllData(true)}
                disabled={syncing}
                aria-label={t.syncWithHevyAria}
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[15px] bg-[#ECEEF3] text-[#0B0D17] transition hover:bg-[#dfe2ea] active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-[14px] w-[14px] ${
                    syncing ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              aria-label={t.accountAria}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[22px] bg-white text-[#0B0D17] transition hover:bg-white/80 active:scale-95"
            >
              <User className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col gap-[28px] px-[40px] pt-[12px] pb-[40px]">
          {/* Header Row */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-[4px]">
              <h1 className="text-[40px] font-bold leading-none tracking-[-1.2px] text-[#0B0D17]">
                {weekdayTitle}
              </h1>
              <p className="text-[15px] font-normal text-[#5E6275]">
                {monthDayStr} · {t.weekPrefix} {weekNum}
              </p>
            </div>

            {/* Week Calendar Strip */}
            <div className="flex items-center gap-[12px]">
              {weekDays.map((d) => {
                const hasWorkout = Boolean(d.workout);
                return (
                  <button
                    key={d.dateIso}
                    type="button"
                    onClick={() => {
                      if (d.workout) {
                        setSelectedWorkoutId(d.workout.id);
                        setExpandedView("last_session");
                      } else {
                        setExpandedView("weekly_goal");
                      }
                    }}
                    className="flex flex-col items-center gap-[6px]"
                  >
                    <span className="text-[12px] font-medium text-[#8E8E93]">
                      {d.weekdayLetter}
                    </span>
                    <div
                      className={`flex h-[38px] w-[38px] items-center justify-center rounded-full text-[14px] font-semibold transition hover:scale-105 ${
                        d.isToday
                          ? "border border-[#D1D1D6] bg-[#1C1C1E] text-white"
                          : hasWorkout
                          ? "border-2 border-[#30C15A] text-[#1C1C1E]"
                          : "border border-[#D1D1D6] text-[#1C1C1E]"
                      }`}
                    >
                      {d.dayNumber}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2-Column Dashboard Grid */}
          <div className="flex flex-1 items-stretch gap-[20px]">
            {/* Left Column (Today Plan + Last Session) */}
            <div className="flex min-w-0 flex-1 flex-col gap-[20px]">
              {/* Today's AI Plan Card (Desktop) */}
              <div className="flex flex-1 flex-col justify-between gap-[22px] rounded-[28px] bg-[#2E3BFF] p-[28px] text-white">
                {/* Plan Header */}
                <div className="flex items-start justify-between gap-6">
                  <div className="flex flex-col gap-[6px]">
                    <span className="text-[14px] font-normal text-[#C9CCFF]">
                      {t.todaysAiPlan}
                    </span>
                    <h2 className="text-[44px] font-bold leading-none tracking-[-1.2px] text-white">
                      {plannedTitleClean}
                    </h2>
                    <div className="flex flex-wrap items-center gap-[8px] pt-[4px]">
                      <span className="rounded-full bg-white/15 px-[12px] py-[6px] text-[13px] font-semibold text-white">
                        {t.exercisesCount(editablePlan?.exercises.length ?? 0)}
                      </span>
                      <span className="rounded-full bg-white/15 px-[12px] py-[6px] text-[13px] font-semibold text-white">
                        {t.setsCount(plannedTotalSets)}
                      </span>
                      <span className="rounded-full bg-white/15 px-[12px] py-[6px] text-[13px] font-semibold text-white">
                        ~{plannedDurationMin} {t.min}
                      </span>
                    </div>
                  </div>

                  {/* Coach Note Box */}
                  <div className="flex w-[300px] shrink-0 flex-col gap-[6px] rounded-[18px] bg-white/10 p-[16px]">
                    <div className="flex items-center gap-[6px]">
                      <Sparkles className="h-[14px] w-[14px] text-[#B9F2D2]" />
                      <span className="text-[12px] font-semibold text-[#B9F2D2]">
                        {t.whyThisPlan}
                      </span>
                    </div>
                    <p className="text-[13px] font-normal leading-snug text-white">
                      {whyThisPlanNote}
                    </p>
                  </div>
                </div>

                {/* Exercise Table */}
                <div className="flex flex-col">
                  {/* Table Header */}
                  <div className="flex items-center gap-[16px] border-b border-white/20 pb-[10px] text-[12px] font-medium text-[#C9CCFF]">
                    <span className="w-[24px]">#</span>
                    <span className="flex-1">{t.tableExercise}</span>
                    <span className="w-[110px]">{t.tableSetsReps}</span>
                    <span className="w-[80px]">{t.tableWeight}</span>
                    <span className="w-[96px] text-right">{t.tableTarget}</span>
                  </div>

                  {generatingPlan && !editablePlan ? (
                    <div className="space-y-3 py-4">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="h-7 w-full animate-pulse rounded-lg bg-white/15"
                        />
                      ))}
                    </div>
                  ) : editablePlan ? (
                    editablePlan.exercises.map((ex, idx) => {
                      const workingSets = ex.sets.filter(
                        (s) => s.type !== "warmup"
                      );
                      const setsToUse =
                        workingSets.length > 0 ? workingSets : ex.sets;
                      const setCount = setsToUse.length;
                      const repVal = setsToUse[0]?.reps ?? 10;
                      const weightVal = setsToUse[0]?.weight_kg ?? 0;

                      const repReport = analytics?.exerciseReports.find(
                        (r) =>
                          r.exerciseTemplateId === ex.exercise_template_id
                      );
                      const badge = getTargetBadgeForExercise(
                        ex.title,
                        ex.progression_rationale,
                        ex.priorityBadge,
                        repReport?.status
                      );
                      const muscleGroup = getMuscleLabelForPlanRow(
                        ex.title,
                        ex.movementPattern,
                        analytics,
                        ex.exercise_template_id
                      );
                      const isLast =
                        idx === editablePlan.exercises.length - 1;

                      return (
                        <div
                          key={`${ex.exercise_template_id}-${idx}`}
                          onClick={() => setExpandedView("today_plan")}
                          className={`flex cursor-pointer items-center gap-[16px] py-[12px] transition hover:bg-white/5 ${
                            !isLast ? "border-b border-white/[0.12]" : ""
                          }`}
                        >
                          <span className="w-[24px] text-[14px] font-normal text-[#C9CCFF]">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="flex flex-1 items-center gap-[10px]">
                            <span className="text-[16px] font-semibold text-white">
                              {cleanExerciseName(ex.title)}
                            </span>
                            <span className="text-[13px] font-normal text-[#C9CCFF]">
                              {translateMuscle(muscleGroup, locale)}
                            </span>
                          </div>
                          <span className="w-[110px] text-[15px] font-medium text-white">
                            {setCount} × {repVal}
                          </span>
                          <span className="w-[80px] text-[15px] font-medium text-white">
                            {weightVal} {t.kg}
                          </span>
                          <div className="flex w-[96px] justify-end">
                            <span
                              className={`rounded-full px-[10px] py-[4px] text-[12px] font-semibold ${
                                badge.tone === "green"
                                  ? "bg-[#B9F2D2] text-[#0E6A37]"
                                  : badge.tone === "orange"
                                  ? "bg-[#FFC6A3] text-[#7A2E06]"
                                  : "bg-white/15 text-white"
                              }`}
                            >
                              {translateTargetBadge(badge.label, locale)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : null}
                </div>

                {sendResult && (
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm font-medium ${
                      sendResult.type === "success"
                        ? "bg-[#B9F2D2] text-[#0E6A37]"
                        : "bg-[#FFE3D2] text-[#B2430A]"
                    }`}
                  >
                    {sendResult.message}
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex items-center gap-[10px]">
                  <button
                    type="button"
                    onClick={handleSendToHevy}
                    disabled={sendingToHevy || !editablePlan}
                    className="flex h-[52px] items-center justify-center gap-[8px] rounded-[26px] bg-white px-[28px] text-[16px] font-bold text-[#2E3BFF] transition hover:bg-white/90 disabled:opacity-60"
                  >
                    <span>
                      {sendingToHevy ? t.sending : t.sendToHevy}
                    </span>
                    <Send className="h-[18px] w-[18px]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedView("today_plan")}
                    className="flex h-[52px] items-center justify-center gap-[8px] rounded-[26px] border border-white/35 px-[20px] text-[15px] font-medium text-white transition hover:bg-white/10"
                  >
                    <SlidersHorizontal className="h-[16px] w-[16px]" />
                    <span>{t.editPlan}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGeneratePlan()}
                    disabled={generatingPlan}
                    className="flex h-[52px] items-center justify-center gap-[8px] rounded-[26px] border border-white/35 px-[20px] text-[15px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-[16px] w-[16px] ${
                        generatingPlan ? "animate-spin" : ""
                      }`}
                    />
                    <span>{t.regenerate}</span>
                  </button>
                </div>
              </div>

              {/* Last Session Card (Desktop Horizontal) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (latestWorkout) {
                    setSelectedWorkoutId(latestWorkout.id);
                  }
                  setExpandedView("last_session");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setExpandedView("last_session");
                }}
                className="flex cursor-pointer items-center gap-[16px] rounded-[24px] bg-white px-[20px] py-[16px] transition hover:shadow-sm"
              >
                <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-[#ECEEF3] text-[#0B0D17]">
                  <History className="h-[20px] w-[20px]" />
                </div>

                <div className="flex flex-1 flex-col gap-[2px]">
                  <span className="text-[12px] font-normal text-[#5E6275]">
                    {t.lastSession}
                  </span>
                  <span className="text-[17px] font-semibold text-[#0B0D17]">
                    {latestWorkout
                      ? formatLastSessionTitle(latestWorkout)
                      : loading
                      ? t.loadingLastSession
                      : t.noSessionsYet}
                  </span>
                </div>

                {latestWorkout && (
                  <>
                    <div className="flex flex-col border-l border-[#E2E4EA] pl-[16px]">
                      <span className="text-[18px] font-bold text-[#0B0D17]">
                        {Math.round(latestWorkout.duration_seconds / 60)} {t.min}
                      </span>
                      <span className="text-[12px] font-normal text-[#5E6275]">
                        {t.durationLabel}
                      </span>
                    </div>

                    <div className="flex flex-col border-l border-[#E2E4EA] pl-[16px]">
                      <span className="text-[18px] font-bold text-[#0B0D17]">
                        {latestWorkout.exercises.length}
                      </span>
                      <span className="text-[12px] font-normal text-[#5E6275]">
                        {t.exercisesLabel}
                      </span>
                    </div>

                    <div className="flex flex-col border-l border-[#E2E4EA] pl-[16px]">
                      <span className="text-[18px] font-bold text-[#0B0D17]">
                        {latestWorkout.total_working_sets}
                      </span>
                      <span className="text-[12px] font-normal text-[#5E6275]">
                        {t.setsLabel}
                      </span>
                    </div>

                    <div className="flex flex-col border-l border-[#E2E4EA] pl-[16px]">
                      <span className="text-[18px] font-bold text-[#0B0D17]">
                        {Math.round(
                          latestWorkout.total_volume_kg
                        ).toLocaleString()}{" "}
                        {t.kg}
                      </span>
                      <span className="text-[12px] font-normal text-[#5E6275]">
                        {t.volumeLabel}
                      </span>
                    </div>
                  </>
                )}

                <ChevronRight className="h-[20px] w-[20px] shrink-0 text-[#5E6275]" />
              </div>
            </div>

            {/* Right Column (400px: Weekly Goal + Muscular Load) */}
            <div className="flex w-[400px] shrink-0 flex-col gap-[20px]">
              {/* Weekly Goal Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedView("weekly_goal")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setExpandedView("weekly_goal");
                }}
                className="flex cursor-pointer items-center justify-between gap-[20px] rounded-[24px] bg-[#0B0D17] py-[18px] pr-[22px] pl-[18px] text-left transition hover:opacity-95"
              >
                <GoalProgressRing
                  completed={completedSessionsThisWeek}
                  goal={weeklyGoal}
                  size={118}
                  innerRadiusRatio={0.8}
                />
                <div className="flex flex-1 flex-col gap-[6px]">
                  <span className="text-[13px] font-normal text-[#A9ADC2]">
                    {t.weeklyGoal}
                  </span>
                  <p className="text-[22px] font-bold leading-tight tracking-[-0.5px] text-white">
                    {sessionsRemaining === 0
                      ? t.goalComplete
                      : t.sessionsToGo(sessionsRemaining)}
                  </p>
                  <p className="text-[13px] font-normal leading-snug text-[#A9ADC2]">
                    {sessionsRemaining <= 1
                      ? t.todayClosesWeek(plannedTitleClean)
                      : t.todayKeepsPace(plannedTitleClean)}
                  </p>
                </div>
              </div>

              {/* Muscular Load Card (Desktop — Node ID: gXu83) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedView("muscular_load")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setExpandedView("muscular_load");
                }}
                className="flex flex-1 cursor-pointer flex-col justify-between gap-[14px] rounded-[24px] bg-white p-[20px] transition hover:shadow-sm"
              >
                <div className="flex items-center justify-between pb-[6px]">
                  <span className="text-[18px] font-semibold text-[#0B0D17]">
                    {t.muscularLoad}
                  </span>
                  <span className="text-[12px] font-normal text-[#5E6275]">
                    {t.setsLast3}
                  </span>
                </div>

                {loading && !analytics ? (
                  <div className="flex h-[280px] w-full animate-pulse items-center justify-center rounded-2xl bg-[#ECEEF3]" />
                ) : (
                  <MuscularLoadBodyMap
                    muscles={desktopMuscleRows.map((r) => ({
                      name: r.name,
                      sets: r.sets,
                    }))}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
