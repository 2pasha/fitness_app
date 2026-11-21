"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "en" | "uk";

const STORAGE_KEY = "spotter_locale";

export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getDateLocale(locale: Locale): string {
  return locale === "uk" ? "uk-UA" : "en-US";
}

export const MUSCLE_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    Quads: "Quads",
    Shoulders: "Shoulders",
    Chest: "Chest",
    Lats: "Lats",
    "Upper back": "Upper back",
    Hamstrings: "Hamstrings",
    Calves: "Calves",
    Triceps: "Triceps",
    Biceps: "Biceps",
    Abs: "Abs",
    Glutes: "Glutes",
    Accessory: "Accessory",
  },
  uk: {
    Quads: "Квадрицепси",
    Shoulders: "Плечі",
    Chest: "Груди",
    Lats: "Найширші",
    "Upper back": "Верх спини",
    Hamstrings: "Задня стегна",
    Calves: "Литки",
    Triceps: "Трицепс",
    Biceps: "Біцепс",
    Abs: "Прес",
    Glutes: "Сідниці",
    Accessory: "Додаткові",
  },
};

export function translateMuscle(name: string, locale: Locale): string {
  return MUSCLE_LABELS[locale][name] || name;
}

export const MOVEMENT_PATTERN_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    "Knee-dominant": "Knee-dominant",
    "Hip-hinge": "Hip-hinge",
    "Horizontal push": "Horizontal push",
    "Vertical push": "Vertical push",
    "Horizontal pull": "Horizontal pull",
    "Vertical pull": "Vertical pull",
  },
  uk: {
    "Knee-dominant": "Домінанта коліна",
    "Hip-hinge": "Тазовий шарнір",
    "Horizontal push": "Горизонт. жим",
    "Vertical push": "Вертикал. жим",
    "Horizontal pull": "Горизонт. тяга",
    "Vertical pull": "Вертикал. тяга",
  },
};

export const EQUIPMENT_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    Barbell: "Barbell",
    Dumbbell: "Dumbbell",
    Cable: "Cable",
    Machine: "Machine",
    "Bar grip": "Bar grip",
  },
  uk: {
    Barbell: "Штанга",
    Dumbbell: "Гантелі",
    Cable: "Блок",
    Machine: "Тренажер",
    "Bar grip": "Гриф",
  },
};

export function translateEquipment(label: string, locale: Locale): string {
  return EQUIPMENT_LABELS[locale][label] || label;
}

export function translateTargetBadge(label: string, locale: Locale): string {
  if (locale === "en") return label;
  if (label === "Hold") return "Утримати";
  if (label === "Reset") return "Скинути";
  if (label === "Catch-up") return "Добрати";
  if (label === "+1 rep") return "+1 повт.";
  if (label === "+2.5 kg") return "+2.5 кг";
  return label;
}

export const WEEKDAY_LETTERS: Record<Locale, string[]> = {
  en: ["S", "M", "T", "W", "T", "F", "S"],
  uk: ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
};

export const WEEKDAY_SHORT_UPPER: Record<Locale, string[]> = {
  en: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
  uk: ["НД", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"],
};

export const MONTH_SHORT: Record<Locale, string[]> = {
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  uk: [
    "січ",
    "лют",
    "бер",
    "кві",
    "тра",
    "чер",
    "лип",
    "сер",
    "вер",
    "жов",
    "лис",
    "гру",
  ],
};

export function pluralizeUk(
  n: number,
  one: string,
  few: string,
  many: string
): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function formatTimeAgoLocalized(
  iso: string | null,
  locale: Locale
): string {
  if (!iso) return locale === "uk" ? "щойно" : "just now";
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (diffSec < 90) return locale === "uk" ? "щойно" : "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) {
    return locale === "uk" ? `${mins} хв тому` : `${mins} min ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return locale === "uk" ? `${hrs} год тому` : `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  return locale === "uk" ? `${days} дн тому` : `${days}d ago`;
}

export const translations = {
  en: {
    // Nav
    navHome: "Home",
    navWorkouts: "Workouts",
    navProgress: "Progress",
    navPlan: "Plan",
    // Units
    kg: "kg",
    t: "t",
    min: "min",
    sessions: "sessions",
    sets: "sets",
    // Header / Sync
    weekPrefix: "Week",
    syncedWithHevy: "Synced with Hevy",
    workoutsCount: (n: number) => `${n} workouts`,
    syncWithHevyAria: "Sync with Hevy",
    accountAria: "Account",
    // Weekly goal card
    weeklyGoal: "Weekly goal",
    goalComplete: "Goal complete!",
    weeklyGoalReached: "Weekly goal reached!",
    sessionsToGo: (n: number) => `${n} session${n === 1 ? "" : "s"} to go`,
    todayClosesWeek: (title: string) => `Today's ${title} closes your week.`,
    todayKeepsPace: (title: string) => `Today's ${title} keeps you on pace.`,
    // Muscular load card
    muscularLoad: "Muscular load",
    setsLast3: "Sets · last 3 sessions",
    optimalBadge: "OPTIMAL",
    lowBadge: "LOW",
    // Today's AI plan card
    todaysAiPlan: "Today's AI plan",
    todaysPlanTitle: "Today's plan",
    exercisesCount: (n: number) => `${n} exercises`,
    setsCount: (n: number) => `${n} sets`,
    moreLifts: (n: number) => `+${n} more lifts`,
    sendToHevy: "Send to Hevy",
    sending: "Sending...",
    editPlan: "Edit plan",
    regenerate: "Regenerate",
    whyThisPlan: "Why this plan",
    defaultWhyPlan:
      "Analyzing your last 3 sessions to calculate progressive overload targets and movement pattern balance.",
    defaultWhyPlanBuilt:
      "Built from your last 3 sessions to balance all 7 movement patterns and push progressive overload.",
    tableExercise: "Exercise",
    tableSetsReps: "Sets × reps",
    tableWeight: "Weight",
    tableTarget: "Target",
    // Last session card
    lastSession: "Last session",
    loadingLastSession: "Loading last session...",
    noSessionsYet: "No sessions synced yet",
    tapRefreshToSync: "Tap refresh above to sync from Hevy",
    movedSuffix: "moved",
    durationLabel: "Duration",
    exercisesLabel: "Exercises",
    setsLabel: "Sets",
    volumeLabel: "Volume",
    workingSetsLabel: "Working sets",
    // Expanded Weekly Goal
    doTodayCta: (title: string) => `Do ${title} today`,
    thisWeek: "This week",
    restDay: "Rest",
    plannedMeta: (mins: number) => `Planned · ~${mins} min`,
    last5Weeks: "Last 5 weeks",
    avgPerWeek: (avg: string) => `Avg ${avg} / week`,
    goalTag: (n: number) => `Goal ${n}`,
    bestWeekInsight: (n: number) =>
      `Hitting ${n} today makes this your best week in over a month.`,
    sessionsPerWeek: "Sessions per week",
    resetsEverySunday: "Resets every Sunday",
    endsTonight: "ends tonight",
    endsTomorrow: "ends tomorrow",
    endsInDays: (d: number) => `ends in ${d} days`,
    // Expanded Muscular Load
    rangeLast3: "Last 3 sessions",
    range7d: "7 days",
    range30d: "30 days",
    musclesInRange: "muscles in range",
    hintLast3:
      "Target is 6+ working sets per muscle across your last 3 sessions.",
    hint7d: "Target is 6+ working sets per muscle across the last 7 days.",
    hint30d: "Target is 18+ working sets per muscle across the last 30 days.",
    infoBanner:
      "Research supports 6+ hard working sets per muscle group across every 3-session microcycle (~10–20 sets/week) to maximize hypertrophy without junk volume.",
    needsWork: "Needs work",
    lowCountBadge: (n: number) => `${n} LOW`,
    allMusclesOptimal:
      "All 10 muscle groups have reached their target working sets.",
    setsLast3And7d: (last3: number, w7: number) =>
      `${last3} sets last 3 · ${w7} in 7 days`,
    inPlan: "In plan",
    addBtn: "Add",
    inRange: "In range",
    optimalCountBadge: (n: number) => `${n} OPTIMAL`,
    d7Prefix: "7d",
    movementPatterns: "Movement patterns",
    // Expanded Today's Plan
    aiPlanEyebrow: (dateStr: string) => `AI plan · ${dateStr}`,
    routineNameInHevy: "Routine name in Hevy",
    setCol: "Set",
    previousCol: "Previous",
    repsCol: "Reps",
    restLabel: (m: number, s: string) => `Rest ${m}:${s}`,
    addSet: "Add set",
    addExercise: "Add exercise",
    addExerciseTitle: "Add exercise to today's plan",
    customExercisePlaceholder: "Custom exercise name...",
    generatingPlanMsg: "Generating today's AI plan...",
    noPlanYetMsg: "No active plan generated yet.",
    backBtn: "Back",
    generatePlanBtn: "Generate Plan",
    sentSuccess: (title: string, ex: number, sets: number) =>
      `Sent "${title}" (${ex} exercises · ${sets} sets) to Hevy!`,
    // Expanded Last Session
    noRecentSession: "No recent session available.",
    liftsGotStronger: (n: number) =>
      `${n} lift${n === 1 ? "" : "s"} got stronger`,
    liftsCompleted: (n: number) => `${n} lifts completed`,
    ledTheWay: (name: string, pct: number) =>
      `${name} led the way at +${pct}% e1RM.`,
    dippedSlightly: (name: string) =>
      ` ${name} dipped slightly, worth watching next session.`,
    consistentOverload:
      " Consistent progressive overload across your working sets.",
    solidBaseline:
      "Solid baseline session logged. Keep pushing reps or load on your primary movements next workout.",
    volumeSuffix: "volume",
    e1rmFlat: "e1RM Flat",
    openInHevy: "Open in Hevy",
  },
  uk: {
    // Nav
    navHome: "Головна",
    navWorkouts: "Тренування",
    navProgress: "Прогрес",
    navPlan: "План",
    // Units
    kg: "кг",
    t: "т",
    min: "хв",
    sessions: "тренувань",
    sets: "підх.",
    // Header / Sync
    weekPrefix: "Тиждень",
    syncedWithHevy: "Синхронізовано з Hevy",
    workoutsCount: (n: number) =>
      `${n} ${pluralizeUk(n, "тренування", "тренування", "тренувань")}`,
    syncWithHevyAria: "Синхронізувати з Hevy",
    accountAria: "Акаунт",
    // Weekly goal card
    weeklyGoal: "Ціль на тиждень",
    goalComplete: "Ціль виконано!",
    weeklyGoalReached: "Тижневу ціль досягнуто!",
    sessionsToGo: (n: number) =>
      `Залишилось ${n} ${pluralizeUk(n, "тренування", "тренування", "тренувань")}`,
    todayClosesWeek: (title: string) =>
      `Сьогоднішнє ${title} закриває твій тиждень.`,
    todayKeepsPace: (title: string) =>
      `Сьогоднішнє ${title} тримає тебе в темпі.`,
    // Muscular load card
    muscularLoad: "Навантаження м'язів",
    setsLast3: "Підходи · останні 3 тренування",
    optimalBadge: "НОРМА",
    lowBadge: "МАЛО",
    // Today's AI plan card
    todaysAiPlan: "AI-план на сьогодні",
    todaysPlanTitle: "План на сьогодні",
    exercisesCount: (n: number) =>
      `${n} ${pluralizeUk(n, "вправа", "вправи", "вправ")}`,
    setsCount: (n: number) =>
      `${n} ${pluralizeUk(n, "підхід", "підходи", "підходів")}`,
    moreLifts: (n: number) =>
      `+${n} ще ${pluralizeUk(n, "вправа", "вправи", "вправ")}`,
    sendToHevy: "Надіслати в Hevy",
    sending: "Надсилаємо...",
    editPlan: "Редагувати",
    regenerate: "Оновити",
    whyThisPlan: "Чому цей план",
    defaultWhyPlan:
      "Аналізуємо останні 3 тренування для розрахунку прогресії навантаження та балансу м'язів.",
    defaultWhyPlanBuilt:
      "Складено на основі останніх 3 тренувань для балансу всіх рухових патернів і прогресивного перевантаження.",
    tableExercise: "Вправа",
    tableSetsReps: "Підх. × повт.",
    tableWeight: "Вага",
    tableTarget: "Ціль",
    // Last session card
    lastSession: "Останнє тренування",
    loadingLastSession: "Завантаження останнього тренування...",
    noSessionsYet: "Тренувань ще немає",
    tapRefreshToSync: "Натисни оновити вгорі для синхронізації з Hevy",
    movedSuffix: "піднято",
    durationLabel: "Тривалість",
    exercisesLabel: "Вправи",
    setsLabel: "Підходи",
    volumeLabel: "Об'єм",
    workingSetsLabel: "Робочі підходи",
    // Expanded Weekly Goal
    doTodayCta: (title: string) => `Виконати ${title} сьогодні`,
    thisWeek: "Цього тижня",
    restDay: "Відпочинок",
    plannedMeta: (mins: number) => `Заплановано · ~${mins} хв`,
    last5Weeks: "Останні 5 тижнів",
    avgPerWeek: (avg: string) => `В серед. ${avg} / тиж.`,
    goalTag: (n: number) => `Ціль ${n}`,
    bestWeekInsight: (n: number) =>
      `Досягнення ${n} сьогодні зробить цей тиждень найкращим за місяць.`,
    sessionsPerWeek: "Тренувань на тиждень",
    resetsEverySunday: "Оновлюється щонеділі",
    endsTonight: "завершується сьогодні",
    endsTomorrow: "завершується завтра",
    endsInDays: (d: number) =>
      `ще ${d} ${pluralizeUk(d, "день", "дні", "днів")}`,
    // Expanded Muscular Load
    rangeLast3: "Останні 3",
    range7d: "7 днів",
    range30d: "30 днів",
    musclesInRange: "м'язів у нормі",
    hintLast3:
      "Ціль — 6+ робочих підходів на м'яз за останні 3 тренування.",
    hint7d: "Ціль — 6+ робочих підходів на м'яз за останні 7 днів.",
    hint30d: "Ціль — 18+ робочих підходів на м'яз за останні 30 днів.",
    infoBanner:
      "Дослідження підтверджують, що 6+ якісних робочих підходів на групу м'язів за кожен 3-тренувальний цикл (~10–20 підходів/тиждень) оптимізують гіпертрофію без зайвого об'єму.",
    needsWork: "Потребують уваги",
    lowCountBadge: (n: number) => `${n} МАЛО`,
    allMusclesOptimal:
      "Усі 10 груп м'язів досягли цільової кількості робочих підходів.",
    setsLast3And7d: (last3: number, w7: number) =>
      `${last3} за ост. 3 · ${w7} за 7 днів`,
    inPlan: "У плані",
    addBtn: "Додати",
    inRange: "У нормі",
    optimalCountBadge: (n: number) => `${n} НОРМА`,
    d7Prefix: "7д",
    movementPatterns: "Рухові патерни",
    // Expanded Today's Plan
    aiPlanEyebrow: (dateStr: string) => `AI-план · ${dateStr}`,
    routineNameInHevy: "Назва програми в Hevy",
    setCol: "Підхід",
    previousCol: "Попередній",
    repsCol: "Повт.",
    restLabel: (m: number, s: string) => `Відпочинок ${m}:${s}`,
    addSet: "Додати підхід",
    addExercise: "Додати вправу",
    addExerciseTitle: "Додати вправу до плану",
    customExercisePlaceholder: "Назва вправи...",
    generatingPlanMsg: "Генеруємо AI-план на сьогодні...",
    noPlanYetMsg: "План ще не згенеровано.",
    backBtn: "Назад",
    generatePlanBtn: "Згенерувати план",
    sentSuccess: (title: string, ex: number, sets: number) =>
      `Надіслано «${title}» (${ex} вправ · ${sets} підходів) у Hevy!`,
    // Expanded Last Session
    noRecentSession: "Немає останнього тренування.",
    liftsGotStronger: (n: number) =>
      `${n} ${pluralizeUk(n, "вправа стала", "вправи стали", "вправ стали")} сильнішими`,
    liftsCompleted: (n: number) => `Виконано ${n} вправ`,
    ledTheWay: (name: string, pct: number) =>
      `${name} показала найкращий ріст: +${pct}% e1RM.`,
    dippedSlightly: (name: string) =>
      ` ${name} трохи просіла — варто звернути увагу наступного разу.`,
    consistentOverload:
      " Стабільна прогресія навантаження у робочих підходах.",
    solidBaseline:
      "Хороше базове тренування. Наступного разу додавай повторення або вагу у ключових вправах.",
    volumeSuffix: "об'єму",
    e1rmFlat: "e1RM без змін",
    openInHevy: "Відкрити в Hevy",
  },
};

export type TranslationDict = (typeof translations)["en"];

interface I18nContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: TranslationDict;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: translations.en,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "uk" || saved === "en") {
        setLocaleState(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    try {
      window.localStorage.setItem(STORAGE_KEY, loc);
      document.documentElement.lang = loc;
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: translations[locale],
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
