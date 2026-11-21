"use client";

import React, { useMemo, useState } from "react";
import { BACK_BODY_PATHS, FRONT_BODY_PATHS, BodySvgPathItem } from "./bodyMapPaths";
import { translateMuscle, useI18n } from "@/lib/i18n";

export interface MuscleSetItem {
  name: string;
  sets: number;
}

export interface MuscularLoadBodyMapProps {
  muscles: MuscleSetItem[];
  targetThreshold?: number;
  selectedMuscle?: string | null;
  onSelectMuscle?: (muscle: string | null) => void;
  showColumns?: boolean;
  showNotTrainedBanner?: boolean;
  compact?: boolean;
}

const ALL_BODY_MUSCLES = [
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
  "Glutes",
  "Lower back",
];

const SHORT_NOT_TRAINED_NAMES: Record<string, Record<"en" | "uk", string>> = {
  Glutes: { en: "glutes", uk: "сідниці" },
  Hamstrings: { en: "hams", uk: "задня стегна" },
  "Upper back": { en: "traps", uk: "верх спини" },
  "Lower back": { en: "lower back", uk: "поперек" },
  Quads: { en: "quads", uk: "квадрицепси" },
  Shoulders: { en: "shoulders", uk: "плечі" },
  Chest: { en: "chest", uk: "груди" },
  Lats: { en: "lats", uk: "найширші" },
  Calves: { en: "calves", uk: "литки" },
  Triceps: { en: "triceps", uk: "трицепс" },
  Biceps: { en: "biceps", uk: "біцепс" },
  Abs: { en: "abs", uk: "прес" },
};

export function MuscularLoadBodyMap({
  muscles,
  targetThreshold = 6,
  selectedMuscle: controlledSelectedMuscle,
  onSelectMuscle,
  showColumns = true,
  showNotTrainedBanner = true,
}: MuscularLoadBodyMapProps) {
  const { locale, t } = useI18n();
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  const activeMuscle =
    hoveredMuscle ??
    (controlledSelectedMuscle !== undefined
      ? controlledSelectedMuscle
      : internalSelected);

  const handleToggleMuscle = (muscle: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const current =
      controlledSelectedMuscle !== undefined
        ? controlledSelectedMuscle
        : internalSelected;
    const next = current === muscle ? null : muscle;
    if (controlledSelectedMuscle === undefined) {
      setInternalSelected(next);
    }
    onSelectMuscle?.(next);
  };

  // Build map of muscle -> sets
  const setsByMuscle = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of ALL_BODY_MUSCLES) {
      map.set(m, 0);
    }
    for (const item of muscles) {
      map.set(item.name, item.sets);
    }
    return map;
  }, [muscles]);

  const { optimalList, lowList, notTrainedList } = useMemo(() => {
    const optimal: MuscleSetItem[] = [];
    const low: MuscleSetItem[] = [];
    const untrained: string[] = [];

    for (const m of ALL_BODY_MUSCLES) {
      const s = setsByMuscle.get(m) ?? 0;
      if (s >= targetThreshold) {
        optimal.push({ name: m, sets: s });
      } else if (s > 0) {
        low.push({ name: m, sets: s });
      } else {
        untrained.push(m);
      }
    }

    const untrainedOrder = ["Glutes", "Hamstrings", "Upper back", "Lower back"];
    untrained.sort((a, b) => {
      const ia = untrainedOrder.indexOf(a);
      const ib = untrainedOrder.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    optimal.sort((a, b) => b.sets - a.sets);
    low.sort((a, b) => b.sets - a.sets);

    return {
      optimalList: optimal,
      lowList: low,
      notTrainedList: untrained,
    };
  }, [setsByMuscle, targetThreshold]);

  const getPathFill = (pathItem: BodySvgPathItem, side: "front" | "back"): string => {
    // Keep pure white cut-out highlight paths intact
    if (pathItem.defaultFill.toLowerCase() === "#ffffff") {
      return "#FFFFFF";
    }

    const muscle = pathItem.muscle;
    if (!muscle) {
      return pathItem.defaultFill;
    }

    const sets = setsByMuscle.get(muscle) ?? 0;
    const isHighlighted = activeMuscle === muscle;

    if (sets >= targetThreshold) {
      if (isHighlighted) return "#1D28CC";
      return side === "back" ? "#3245FC" : "#3348FB";
    }
    if (sets > 0) {
      if (isHighlighted) return "#E65A15";
      return side === "back" ? "#FE7D3E" : "#FE7D3C";
    }

    // Not trained (0 sets)
    if (isHighlighted) {
      return "#9BA3B5";
    }
    return side === "back" ? "#C9CED8" : "#DADDE3";
  };

  const getPathOpacity = (pathItem: BodySvgPathItem): number => {
    if (!activeMuscle) return 1;
    if (pathItem.defaultFill.toLowerCase() === "#ffffff") return 1;
    if (!pathItem.muscle) return 0.45;
    return pathItem.muscle === activeMuscle ? 1 : 0.4;
  };

  const activeMuscleSets = activeMuscle ? setsByMuscle.get(activeMuscle) ?? 0 : null;
  const activeMuscleStatus =
    activeMuscleSets === null
      ? null
      : activeMuscleSets >= targetThreshold
      ? "optimal"
      : activeMuscleSets > 0
      ? "low"
      : "untrained";

  const notTrainedText = useMemo(() => {
    if (notTrainedList.length === 0) {
      return t.allMusclesTrained;
    }
    const labels = notTrainedList.map(
      (m) => SHORT_NOT_TRAINED_NAMES[m]?.[locale] || translateMuscle(m, locale).toLowerCase()
    );
    return `${t.notTrainedPrefix} — ${labels.join(", ")}`;
  }, [notTrainedList, locale, t]);

  return (
    <div className="flex w-full flex-col gap-[14px]">
      {/* Active muscle floating pill when hovering/tapping */}
      <div className="relative flex flex-col gap-[8px]">
        {activeMuscle && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setInternalSelected(null);
              setHoveredMuscle(null);
              onSelectMuscle?.(null);
            }}
            className="absolute top-0 left-1/2 z-10 flex -translate-x-1/2 items-center gap-[8px] whitespace-nowrap rounded-full bg-[#0B0D17] px-[12px] py-[5px] text-[12px] font-medium text-white shadow-sm transition"
          >
            <span
              className={`h-[8px] w-[8px] rounded-full ${
                activeMuscleStatus === "optimal"
                  ? "bg-[#2E3BFF]"
                  : activeMuscleStatus === "low"
                  ? "bg-[#FF7A33]"
                  : "bg-[#C9CED8]"
              }`}
            />
            <span className="font-semibold">
              {translateMuscle(activeMuscle, locale)}
            </span>
            <span className="text-[#A9ADC2]">·</span>
            <span>{t.setsCount(activeMuscleSets ?? 0)}</span>
          </div>
        )}

        {/* Body Map Container (Node ID: U2QAmH) */}
        <div className="flex h-[280px] w-full items-center justify-around">
          {/* Front Figure (Pe70F) */}
          <svg
            width="130"
            height="270"
            viewBox="0 0 130 270"
            className="h-[270px] w-[130px] shrink-0 overflow-visible select-none"
            aria-label={t.frontLabel}
          >
            {FRONT_BODY_PATHS.map((p) => {
              const fill = getPathFill(p, "front");
              const opacity = getPathOpacity(p);
              const isInteractive = Boolean(p.muscle);
              const isSelected = activeMuscle && p.muscle === activeMuscle;

              return (
                <path
                  key={p.id}
                  transform={`translate(${p.x} ${p.y})`}
                  d={p.d}
                  fill={fill}
                  opacity={opacity}
                  stroke={isSelected ? "#0B0D17" : "none"}
                  strokeWidth={isSelected ? 0.9 : 0}
                  className={
                    isInteractive
                      ? "cursor-pointer transition-all duration-200"
                      : "pointer-events-none transition-opacity duration-200"
                  }
                  onMouseEnter={() => p.muscle && setHoveredMuscle(p.muscle)}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  onClick={(e) => p.muscle && handleToggleMuscle(p.muscle, e)}
                />
              );
            })}
          </svg>

          {/* Back Figure (RuBkB) */}
          <svg
            width="130"
            height="270"
            viewBox="0 0 130 270"
            className="h-[270px] w-[130px] shrink-0 overflow-visible select-none"
            aria-label={t.backLabel}
          >
            {BACK_BODY_PATHS.map((p) => {
              const fill = getPathFill(p, "back");
              const opacity = getPathOpacity(p);
              const isInteractive = Boolean(p.muscle);
              const isSelected = activeMuscle && p.muscle === activeMuscle;

              return (
                <path
                  key={p.id}
                  transform={`translate(${p.x} ${p.y})`}
                  d={p.d}
                  fill={fill}
                  opacity={opacity}
                  stroke={isSelected ? "#0B0D17" : "none"}
                  strokeWidth={isSelected ? 0.9 : 0}
                  className={
                    isInteractive
                      ? "cursor-pointer transition-all duration-200"
                      : "pointer-events-none transition-opacity duration-200"
                  }
                  onMouseEnter={() => p.muscle && setHoveredMuscle(p.muscle)}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  onClick={(e) => p.muscle && handleToggleMuscle(p.muscle, e)}
                />
              );
            })}
          </svg>
        </div>

        {/* View Labels (Node ID: QCEVH) */}
        <div className="flex w-full items-center">
          <span className="flex-1 text-center text-[10px] font-bold tracking-[1.2px] text-[#5E6275]">
            {t.frontLabel}
          </span>
          <span className="flex-1 text-center text-[10px] font-bold tracking-[1.2px] text-[#5E6275]">
            {t.backLabel}
          </span>
        </div>
      </div>

      {showColumns && (
        <>
          {/* Divider (Node ID: aNOTI) */}
          <div className="h-[1px] w-full bg-[#ECEEF3]" />

          {/* Status Columns (Node ID: aAMKW) */}
          <div className="grid grid-cols-2 gap-[20px]">
            {/* Optimal Column (QYKX5) */}
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center gap-[6px] pb-[2px]">
                <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#2E3BFF]" />
                <span className="text-[10px] font-bold tracking-[1px] text-[#0E6A37]">
                  {t.optimalBadge}
                </span>
              </div>

              {optimalList.map((item) => {
                const isActive = activeMuscle === item.name;
                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => setHoveredMuscle(item.name)}
                    onMouseLeave={() => setHoveredMuscle(null)}
                    onClick={(e) => handleToggleMuscle(item.name, e)}
                    className={`flex cursor-pointer items-center justify-between gap-[6px] rounded-[8px] -mx-[4px] px-[4px] transition ${
                      isActive ? "bg-[#ECEEF3]" : "hover:bg-[#F5F6F9]"
                    }`}
                  >
                    <span className="min-w-0 truncate text-[14px] font-medium text-[#0B0D17]">
                      {translateMuscle(item.name, locale)}
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold text-[#0B0D17]">
                      {item.sets}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Low Column (C6R0dv) */}
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center gap-[6px] pb-[2px]">
                <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#FF7A33]" />
                <span className="text-[10px] font-bold tracking-[1px] text-[#B2430A]">
                  {t.lowBadge}
                </span>
              </div>

              {lowList.map((item) => {
                const isActive = activeMuscle === item.name;
                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => setHoveredMuscle(item.name)}
                    onMouseLeave={() => setHoveredMuscle(null)}
                    onClick={(e) => handleToggleMuscle(item.name, e)}
                    className={`flex cursor-pointer items-center justify-between gap-[6px] rounded-[8px] -mx-[4px] px-[4px] transition ${
                      isActive ? "bg-[#FFE3D2]/60" : "hover:bg-[#F5F6F9]"
                    }`}
                  >
                    <span className="min-w-0 truncate text-[14px] font-medium text-[#0B0D17]">
                      {translateMuscle(item.name, locale)}
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold text-[#0B0D17]">
                      {item.sets}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Not Trained Banner (Node ID: SKl2Y) */}
      {showNotTrainedBanner && (
        <div className="flex w-full items-center gap-[6px] rounded-[12px] bg-[#F5F6F9] px-[12px] py-[10px]">
          <span className="h-[8px] w-[8px] shrink-0 rounded-full bg-[#D5D9E2]" />
          <span className="flex-1 text-[12px] font-normal leading-snug text-[#5E6275]">
            {notTrainedText}
          </span>
        </div>
      )}
    </div>
  );
}
