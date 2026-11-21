"use client";

import React from "react";
import { House, Dumbbell, TrendingUp, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type ExpandedViewType =
  | null
  | "weekly_goal"
  | "muscular_load"
  | "today_plan"
  | "last_session";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  return (
    <div
      className={`inline-flex items-center rounded-full bg-white p-[3px] shadow-2xs ${
        compact ? "h-[44px]" : "h-[44px]"
      }`}
      role="group"
      aria-label="Language switcher"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`flex h-full items-center justify-center rounded-full text-[12px] font-bold transition ${
          compact ? "px-2.5" : "px-3"
        } ${
          locale === "en"
            ? "bg-[#0B0D17] text-white"
            : "text-[#5E6275] hover:text-[#0B0D17]"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("uk")}
        className={`flex h-full items-center justify-center rounded-full text-[12px] font-bold transition ${
          compact ? "px-2.5" : "px-3"
        } ${
          locale === "uk"
            ? "bg-[#0B0D17] text-white"
            : "text-[#5E6275] hover:text-[#0B0D17]"
        }`}
      >
        UA
      </button>
    </div>
  );
}

export function GoalProgressRing({
  completed,
  goal,
  size = 118,
  innerRadiusRatio = 0.8,
  valueFontSize = "text-[30px]",
  unitFontSize = "text-[12px]",
  letterSpacing = "tracking-normal",
}: {
  completed: number;
  goal: number;
  size?: number;
  innerRadiusRatio?: number;
  valueFontSize?: string;
  unitFontSize?: string;
  letterSpacing?: string;
}) {
  const { t } = useI18n();
  const strokeWidth = Math.round((size / 2) * (1 - innerRadiusRatio));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = goal > 0 ? Math.min(1, Math.max(0, completed / goal)) : 0;
  const dashOffset = circumference * (1 - ratio);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#B9F2D2"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="butt"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span className={`font-bold leading-none text-white ${valueFontSize} ${letterSpacing}`}>
          {completed}/{goal}
        </span>
        <span
          className={`mt-1 max-w-full truncate font-normal leading-none text-[#A9ADC2] ${
            size <= 120 ? "text-[11px]" : unitFontSize
          }`}
        >
          {t.sessions}
        </span>
      </div>
    </div>
  );
}

export function CompactNavPill({
  onHomeClick,
}: {
  onHomeClick?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="pointer-events-auto flex h-[60px] items-center gap-[4px] rounded-[30px] bg-[#0B0D17]/[0.95] p-[6px] shadow-[0_8px_24px_rgba(11,13,23,0.25)] backdrop-blur-md">
      <button
        type="button"
        onClick={onHomeClick}
        className="flex h-[48px] items-center gap-[8px] rounded-[24px] bg-[#B9F2D2] pr-[18px] pl-[14px] text-[#0B0D17] transition active:scale-95"
      >
        <House className="h-[20px] w-[20px] text-[#0B0D17]" />
        <span className="whitespace-nowrap text-[14px] font-bold leading-none text-[#0B0D17]">
          {t.navHome}
        </span>
      </button>
      <button
        type="button"
        aria-label={t.navWorkouts}
        className="flex h-[48px] w-[48px] items-center justify-center rounded-[24px] text-[#8A8FA8] transition hover:text-white/80 active:scale-95"
      >
        <Dumbbell className="h-[20px] w-[20px]" />
      </button>
      <button
        type="button"
        aria-label={t.navProgress}
        className="flex h-[48px] w-[48px] items-center justify-center rounded-[24px] text-[#8A8FA8] transition hover:text-white/80 active:scale-95"
      >
        <TrendingUp className="h-[20px] w-[20px]" />
      </button>
      <button
        type="button"
        aria-label={t.navPlan}
        className="flex h-[48px] w-[48px] items-center justify-center rounded-[24px] text-[#8A8FA8] transition hover:text-white/80 active:scale-95"
      >
        <Sparkles className="h-[20px] w-[20px]" />
      </button>
    </div>
  );
}

export function MobileBottomTabBar({
  onHomeClick,
}: {
  onHomeClick?: () => void;
}) {
  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center lg:hidden"
      style={{ bottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <CompactNavPill onHomeClick={onHomeClick} />
    </div>
  );
}

export function cleanExerciseName(raw: string): string {
  if (!raw) return "Exercise";
  return raw.replace(/\s*\([^)]*\)\s*/g, "").trim() || raw;
}

export function extractEquipmentFromTitle(raw: string): string | null {
  const match = raw.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

export function cleanRoutineTitle(raw: string): string {
  if (!raw) return "Full Body A";
  const cleaned = raw
    .replace(/^⚡\s*Today's AI Workout\s*[—-]\s*/i, "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();
  if (/day\s*1/i.test(cleaned)) return "Full Body A";
  return cleaned || "Full Body A";
}

export function getTargetBadgeForExercise(
  title: string,
  rationale: string,
  priorityBadge?: string | null,
  status?: string
): { label: string; tone: "green" | "orange" | "neutral" } {
  const r = (rationale || "").toLowerCase();
  const p = (priorityBadge || "").toLowerCase();
  const t = (title || "").toLowerCase();

  if (
    p.includes("balance") ||
    p.includes("priority") ||
    p.includes("under-worked") ||
    r.includes("limited volume") ||
    r.includes("running light") ||
    t.includes("pushdown") ||
    t.includes("tricep")
  ) {
    return { label: "Catch-up", tone: "orange" };
  }
  if (r.includes("increase load") || r.includes("+2.5kg") || r.includes("+2.5 kg")) {
    return { label: "+2.5 kg", tone: "green" };
  }
  if (
    r.includes("+1 rep") ||
    r.includes("13 reps") ||
    r.includes("aim for") ||
    status === "plateaued"
  ) {
    return { label: "+1 rep", tone: "green" };
  }
  if (status === "regressing" || r.includes("consolidate") || r.includes("reset")) {
    return { label: "Reset", tone: "neutral" };
  }
  return { label: "Hold", tone: "neutral" };
}
