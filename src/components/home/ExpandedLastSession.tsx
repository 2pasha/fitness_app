"use client";

import React from "react";
import { ChevronLeft, ExternalLink, TrendingUp } from "lucide-react";
import { DetailedWorkoutView } from "@/app/api/hevy/workouts/route";
import { DashboardAnalyticsPayload } from "@/lib/analytics/demo-data";
import {
  cleanExerciseName,
  extractEquipmentFromTitle,
} from "./shared";

export interface ExpandedLastSessionProps {
  workout: DetailedWorkoutView | null;
  analytics: DashboardAnalyticsPayload | null;
  onBack: () => void;
}

function inferEquipmentLabel(rawTitle: string): string {
  const extracted = extractEquipmentFromTitle(rawTitle);
  if (extracted) return extracted;
  const lower = rawTitle.toLowerCase();
  if (lower.includes("barbell")) return "Barbell";
  if (lower.includes("dumbbell") || lower.includes("db")) return "Dumbbell";
  if (lower.includes("cable") || lower.includes("pushdown") || lower.includes("pulldown") || lower.includes("face pull")) {
    if (lower.includes("seated cable row")) return "Bar grip";
    return "Cable";
  }
  if (lower.includes("machine") || lower.includes("extension") || lower.includes("curl") || lower.includes("press") || lower.includes("calf")) {
    return "Machine";
  }
  return "Barbell";
}

function formatSessionDateTimeRange(
  startTimeStr: string,
  endTimeStr?: string,
  durationSeconds?: number
): string {
  const start = new Date(startTimeStr);
  if (Number.isNaN(start.getTime())) return startTimeStr;

  const end = endTimeStr
    ? new Date(endTimeStr)
    : new Date(start.getTime() + (durationSeconds || 3120) * 1000);

  const datePart = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const startHourMin = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const endHourMin = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const startMeridiem = startHourMin.split(" ")[1];
  const endMeridiem = endHourMin.split(" ")[1];
  const startClean =
    startMeridiem === endMeridiem
      ? startHourMin.replace(/\s?(AM|PM)$/i, "")
      : startHourMin;

  return `${datePart} · ${startClean} – ${endHourMin}`;
}

export function ExpandedLastSession({
  workout,
  analytics,
  onBack,
}: ExpandedLastSessionProps) {
  if (!workout) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-[#ECEEF3] p-8 text-center">
        <p className="text-[15px] font-semibold text-[#0B0D17]">
          No recent session available.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0B0D17]"
        >
          Back
        </button>
      </div>
    );
  }

  const hevyUrl = `https://hevy.com/workout/${workout.id}`;
  const durationMinutes = Math.max(1, Math.round(workout.duration_seconds / 60));
  const subtitle = formatSessionDateTimeRange(
    workout.start_time,
    workout.end_time,
    workout.duration_seconds
  );

  // Compute progression highlights from analytics?.exerciseReports
  const exerciseDeltas = workout.exercises.map((ex) => {
    const report = analytics?.exerciseReports.find(
      (r) => r.exerciseTemplateId === ex.exercise_template_id
    );
    const pct = report?.e1rmChangePct ?? 0;
    return {
      title: cleanExerciseName(ex.title),
      e1rmChangePct: pct,
    };
  });

  const strongerLifts = exerciseDeltas.filter((d) => d.e1rmChangePct > 0);
  const strongerCount = strongerLifts.length;
  const topGainer =
    strongerLifts.length > 0
      ? [...strongerLifts].sort((a, b) => b.e1rmChangePct - a.e1rmChangePct)[0]
      : null;
  const dippedLift =
    exerciseDeltas.find((d) => d.e1rmChangePct < 0) || null;

  const highlightsTitle =
    strongerCount > 0
      ? `${strongerCount} lift${strongerCount === 1 ? "" : "s"} got stronger`
      : `${workout.exercises.length} lifts completed`;

  const highlightsText = topGainer
    ? `${topGainer.title} led the way at +${topGainer.e1rmChangePct}% e1RM.${
        dippedLift
          ? ` ${dippedLift.title} dipped slightly, worth watching next session.`
          : " Consistent progressive overload across your working sets."
      }`
    : "Solid baseline session logged. Keep pushing reps or load on your primary movements next workout.";

  return (
    <div className="flex min-h-full flex-col bg-[#ECEEF3] pb-[12px]">
      <div className="flex flex-col gap-[12px] px-[16px] pb-[28px] pt-[16px] lg:pt-5">
        {/* Nav Bar */}
        <div className="flex items-center justify-between pb-[8px]">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-[#0B0D17] shadow-xs transition hover:bg-white/80"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
          <span className="text-[17px] font-semibold text-[#0B0D17]">
            Last session
          </span>
          <a
            href={hevyUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open in Hevy"
            className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-[#0B0D17] shadow-xs transition hover:bg-white/80"
          >
            <ExternalLink className="h-[18px] w-[18px]" />
          </a>
        </div>

        {/* Session Title block */}
        <div className="flex flex-col gap-[2px] px-[4px] pb-[4px]">
          <h1 className="text-[34px] font-bold leading-tight tracking-[-1px] text-[#0B0D17]">
            {workout.title}
          </h1>
          <span className="text-[14px] font-normal text-[#5E6275]">
            {subtitle}
          </span>
        </div>

        {/* 2x2 Stats Grid */}
        <div className="flex flex-col gap-[10px]">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-[10px]">
            {/* Duration card */}
            <div className="flex flex-col gap-[2px] rounded-[24px] bg-[#0B0D17] p-[18px]">
              <span className="text-[13px] font-normal text-[#A9ADC2]">
                Duration
              </span>
              <div className="flex items-baseline gap-[4px]">
                <span className="text-[30px] font-bold leading-none tracking-[-1px] text-white">
                  {durationMinutes}
                </span>
                <span className="text-[14px] font-normal text-[#A9ADC2]">
                  min
                </span>
              </div>
            </div>

            {/* Volume card */}
            <div className="flex flex-col gap-[2px] rounded-[24px] bg-[#FFC6A3] p-[18px]">
              <span className="text-[13px] font-normal text-[#6B3A1C]">
                Volume
              </span>
              <div className="flex items-baseline gap-[4px]">
                <span className="text-[30px] font-bold leading-none tracking-[-1px] text-[#0B0D17]">
                  {Math.round(workout.total_volume_kg).toLocaleString()}
                </span>
                <span className="text-[14px] font-normal text-[#6B3A1C]">
                  kg
                </span>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-[10px]">
            {/* Working sets card */}
            <div className="flex flex-col gap-[2px] rounded-[24px] bg-white p-[18px]">
              <span className="text-[13px] font-normal text-[#5E6275]">
                Working sets
              </span>
              <div className="flex items-baseline gap-[4px]">
                <span className="text-[30px] font-bold leading-none tracking-[-1px] text-[#0B0D17]">
                  {workout.total_working_sets}
                </span>
              </div>
            </div>

            {/* Exercises card */}
            <div className="flex flex-col gap-[2px] rounded-[24px] bg-white p-[18px]">
              <span className="text-[13px] font-normal text-[#5E6275]">
                Exercises
              </span>
              <div className="flex items-baseline gap-[4px]">
                <span className="text-[30px] font-bold leading-none tracking-[-1px] text-[#0B0D17]">
                  {workout.exercises.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Highlights green card */}
        <div className="flex flex-col gap-[10px] rounded-[24px] bg-[#B9F2D2] p-[18px]">
          <div className="flex items-center gap-[8px]">
            <TrendingUp className="h-[18px] w-[18px] text-[#0E6A37]" />
            <span className="text-[17px] font-semibold text-[#0B0D17]">
              {highlightsTitle}
            </span>
          </div>
          <p className="text-[13px] font-normal leading-snug text-[#1F4D33]">
            {highlightsText}
          </p>
        </div>

        {/* Exercises section */}
        <div className="flex flex-col gap-[10px]">
          <h2 className="text-[17px] font-semibold text-[#0B0D17]">
            Exercises
          </h2>

          {workout.exercises.map((ex, idx) => {
            const report = analytics?.exerciseReports.find(
              (r) => r.exerciseTemplateId === ex.exercise_template_id
            );
            const e1rmChangePct = report?.e1rmChangePct ?? 0;
            const equipmentLabel = inferEquipmentLabel(ex.title);
            const bestE1rmFormatted =
              Math.round((ex.best_e1rm_kg || 0) * 10) / 10;

            const weights = ex.sets.map((s) => s.weight_kg ?? 0);
            const maxWeight =
              ex.max_weight_kg || Math.max(0, ...weights);
            const distinctWeights = new Set(weights);
            const hasMultipleDistinctWeights = distinctWeights.size > 1;

            return (
              <div
                key={`${ex.exercise_template_id}-${idx}`}
                className="flex flex-col gap-[12px] rounded-[20px] bg-white p-[16px]"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-[10px]">
                  <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
                    <span className="truncate text-[15px] font-semibold text-[#0B0D17]">
                      {cleanExerciseName(ex.title)}
                    </span>
                    <span className="truncate text-[12px] font-normal text-[#5E6275]">
                      {equipmentLabel} ·{" "}
                      {Math.round(ex.exercise_volume_kg).toLocaleString()} kg
                      volume
                    </span>
                  </div>

                  <div className="flex shrink-0 flex-col items-end">
                    <span className="text-[15px] font-bold text-[#0B0D17]">
                      {bestE1rmFormatted} kg
                    </span>
                    {e1rmChangePct > 0 ? (
                      <span className="text-[11px] font-semibold text-[#0E8A45]">
                        e1RM +{e1rmChangePct}%
                      </span>
                    ) : e1rmChangePct < 0 ? (
                      <span className="text-[11px] font-semibold text-[#C2410C]">
                        e1RM −{Math.abs(e1rmChangePct)}%
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#5E6275]">
                        e1RM Flat
                      </span>
                    )}
                  </div>
                </div>

                {/* Sets horizontal pills row */}
                <div className="grid auto-cols-fr grid-flow-col gap-[6px]">
                  {ex.sets.map((s, sIdx) => {
                    const w = s.weight_kg ?? 0;
                    const isTopWeightHighlight =
                      maxWeight > 0 &&
                      w === maxWeight &&
                      (hasMultipleDistinctWeights || e1rmChangePct !== 0);

                    return (
                      <div
                        key={sIdx}
                        className={`flex flex-col rounded-[12px] px-[10px] py-[8px] ${
                          isTopWeightHighlight
                            ? "bg-[#E5E7FF]"
                            : "bg-[#ECEEF3]"
                        }`}
                      >
                        <span
                          className={`text-[13px] font-bold ${
                            isTopWeightHighlight
                              ? "text-[#2E3BFF]"
                              : "text-[#0B0D17]"
                          }`}
                        >
                          {w} kg
                        </span>
                        <span className="text-[12px] font-normal text-[#5E6275]">
                          × {s.reps ?? 0}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Open in Hevy button */}
        <a
          href={hevyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[52px] w-full items-center justify-center gap-[8px] rounded-[26px] border border-[#B9BDCB] text-[15px] font-semibold text-[#0B0D17] transition hover:bg-white/60"
        >
          <span>Open in Hevy</span>
          <ExternalLink className="h-[16px] w-[16px]" />
        </a>
      </div>
    </div>
  );
}
