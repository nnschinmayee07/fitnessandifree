// ── Workout Analytics Mock Data & TypeScript Interfaces ──────────────────────

export interface KpiStat {
  label: string;
  value: string;
  sub: string;
  delta: string;
  deltaPositive: boolean;
  color: string;
  rgb: string;
}

export interface TrendPoint {
  date: string;       // "2026-07-01"
  volume: number;     // kg
  weight: number;     // max weight moved kg
  reps: number;
  duration: number;   // minutes
}

export interface WeeklyConsistency {
  week: string;       // "W1", "W2" …
  workouts: number;
  target: number;
}

export interface TrainingCategory {
  label: string;
  pct: number;
  color: string;
  sessions: number;
}

export interface ExerciseProgress {
  name: string;
  currentBest: number;    // kg
  previousBest: number;
  unit: string;
  sparkline: number[];
  color: string;
}

export interface PersonalRecord {
  exercise: string;
  record: string;
  date: string;
  improvement: string;
  isNew: boolean;
}

export interface AiInsight {
  title: string;
  body: string;
  recommendation: string;
  confidence: number;   // 0–100
  category: "recovery" | "volume" | "frequency" | "technique" | "nutrition";
}

export interface RecentWorkout {
  name: string;
  date: string;
  duration: number;   // minutes
  calories: number;
  muscles: string[];
  sets: number;
  volume: number;     // kg
  completed: boolean;
  type: "strength" | "cardio" | "hiit" | "mobility" | "recovery";
}

// ── KPI Stats ─────────────────────────────────────────────────────────────────
export const KPI_STATS: KpiStat[] = [
  {
    label: "Total Workouts",
    value: "12",
    sub: "this month",
    delta: "+3 vs last month",
    deltaPositive: true,
    color: "#2563EB",
    rgb: "37,99,235",
  },
  {
    label: "Volume Lifted",
    value: "24.8K",
    sub: "kg this month",
    delta: "+14% vs last",
    deltaPositive: true,
    color: "#22C55E",
    rgb: "34,197,94",
  },
  {
    label: "Total Duration",
    value: "8h 42m",
    sub: "this month",
    delta: "+22 min avg",
    deltaPositive: true,
    color: "#A78BFA",
    rgb: "167,139,250",
  },
  {
    label: "Current Streak",
    value: "7",
    sub: "day streak 🔥",
    delta: "Best: 14 days",
    deltaPositive: true,
    color: "#F59E0B",
    rgb: "245,158,11",
  },
];

// ── Performance Trend (last 30 days) ──────────────────────────────────────────
export const TREND_30D: TrendPoint[] = [
  { date: "Jul 10", volume: 3200, weight: 75, reps: 88, duration: 42 },
  { date: "Jul 12", volume: 3450, weight: 75, reps: 92, duration: 45 },
  { date: "Jul 14", volume: 2900, weight: 72, reps: 80, duration: 38 },
  { date: "Jul 16", volume: 3800, weight: 78, reps: 96, duration: 48 },
  { date: "Jul 18", volume: 4100, weight: 80, reps: 100, duration: 52 },
  { date: "Jul 20", volume: 3600, weight: 78, reps: 90, duration: 44 },
  { date: "Jul 22", volume: 4300, weight: 82, reps: 108, duration: 55 },
  { date: "Jul 24", volume: 4500, weight: 82, reps: 110, duration: 58 },
  { date: "Jul 26", volume: 3900, weight: 80, reps: 98, duration: 50 },
  { date: "Jul 28", volume: 4800, weight: 85, reps: 115, duration: 60 },
  { date: "Jul 30", volume: 4600, weight: 83, reps: 112, duration: 57 },
  { date: "Aug 01", volume: 5100, weight: 85, reps: 120, duration: 62 },
  { date: "Aug 03", volume: 4900, weight: 84, reps: 116, duration: 59 },
  { date: "Aug 05", volume: 5300, weight: 87, reps: 124, duration: 65 },
  { date: "Aug 07", volume: 5500, weight: 88, reps: 128, duration: 68 },
];

export const TREND_7D: TrendPoint[] = TREND_30D.slice(-7);
export const TREND_3M: TrendPoint[] = [
  { date: "May 10", volume: 2200, weight: 65, reps: 72, duration: 35 },
  { date: "May 20", volume: 2600, weight: 68, reps: 78, duration: 38 },
  { date: "May 31", volume: 2900, weight: 70, reps: 82, duration: 40 },
  { date: "Jun 10", volume: 3100, weight: 72, reps: 85, duration: 42 },
  { date: "Jun 20", volume: 3400, weight: 75, reps: 90, duration: 45 },
  { date: "Jun 30", volume: 3700, weight: 77, reps: 94, duration: 48 },
  { date: "Jul 10", volume: 3900, weight: 79, reps: 98, duration: 50 },
  { date: "Jul 20", volume: 4300, weight: 82, reps: 106, duration: 54 },
  { date: "Jul 31", volume: 4700, weight: 84, reps: 114, duration: 58 },
  { date: "Aug 07", volume: 5500, weight: 88, reps: 128, duration: 68 },
];

export const TREND_DATA: Record<string, TrendPoint[]> = {
  "7D": TREND_7D,
  "30D": TREND_30D,
  "3M": TREND_3M,
};

// ── Weekly Consistency ────────────────────────────────────────────────────────
export const WEEKLY_CONSISTENCY: WeeklyConsistency[] = [
  { week: "W1 Jun", workouts: 3, target: 4 },
  { week: "W2 Jun", workouts: 4, target: 4 },
  { week: "W3 Jun", workouts: 2, target: 4 },
  { week: "W4 Jun", workouts: 4, target: 4 },
  { week: "W1 Jul", workouts: 3, target: 4 },
  { week: "W2 Jul", workouts: 5, target: 4 },
  { week: "W3 Jul", workouts: 4, target: 4 },
  { week: "W4 Jul", workouts: 4, target: 4 },
  { week: "W1 Aug", workouts: 3, target: 4 },
];

// ── Training Distribution ─────────────────────────────────────────────────────
export const TRAINING_DIST: TrainingCategory[] = [
  { label: "Strength",  pct: 52, color: "#2563EB", sessions: 6 },
  { label: "HIIT",      pct: 17, color: "#EF4444", sessions: 2 },
  { label: "Cardio",    pct: 17, color: "#22C55E", sessions: 2 },
  { label: "Mobility",  pct: 9,  color: "#A78BFA", sessions: 1 },
  { label: "Recovery",  pct: 5,  color: "#F59E0B", sessions: 1 },
];

// ── Exercise Progress ─────────────────────────────────────────────────────────
export const EXERCISE_PROGRESS: ExerciseProgress[] = [
  {
    name: "Bench Press",
    currentBest: 85,
    previousBest: 76,
    unit: "kg",
    sparkline: [68, 70, 72, 75, 75, 78, 80, 80, 82, 85],
    color: "#2563EB",
  },
  {
    name: "Squat",
    currentBest: 110,
    previousBest: 100,
    unit: "kg",
    sparkline: [88, 90, 94, 96, 100, 100, 104, 106, 108, 110],
    color: "#22C55E",
  },
  {
    name: "Deadlift",
    currentBest: 130,
    previousBest: 120,
    unit: "kg",
    sparkline: [105, 108, 112, 115, 118, 120, 122, 125, 128, 130],
    color: "#A78BFA",
  },
  {
    name: "Pull-ups",
    currentBest: 14,
    previousBest: 10,
    unit: "reps",
    sparkline: [8, 9, 9, 10, 10, 11, 12, 12, 13, 14],
    color: "#F59E0B",
  },
];

// ── Personal Records ──────────────────────────────────────────────────────────
export const PERSONAL_RECORDS: PersonalRecord[] = [
  { exercise: "Bench Press", record: "85 kg",  date: "Aug 05", improvement: "+9 kg",  isNew: true  },
  { exercise: "Squat",       record: "110 kg", date: "Aug 02", improvement: "+10 kg", isNew: true  },
  { exercise: "Deadlift",    record: "130 kg", date: "Jul 28", improvement: "+10 kg", isNew: false },
  { exercise: "Pull-ups",    record: "14 reps",date: "Jul 22", improvement: "+4 reps",isNew: false },
  { exercise: "OHP",         record: "62 kg",  date: "Jul 15", improvement: "+4 kg",  isNew: false },
];

// ── AI Insights ───────────────────────────────────────────────────────────────
export const AI_INSIGHTS: AiInsight[] = [
  {
    title: "Upper Body Volume Surge",
    body: "Your upper body volume increased by 14% over the last 30 days, reaching new personal records in bench press and OHP. Recovery time between push sessions appears shorter than optimal at 1.8 days average.",
    recommendation: "Add one additional rest day between push-focused sessions and increase sleep to at least 7.5 hours to maximize muscle protein synthesis.",
    confidence: 87,
    category: "recovery",
  },
  {
    title: "Consistency Building",
    body: "You've completed workouts on 71% of your scheduled days this month — up from 58% last month. Your longest streak this month is 7 days.",
    recommendation: "Keep your current schedule. Consider adding a light mobility session on Sundays to maintain momentum without overloading recovery.",
    confidence: 92,
    category: "frequency",
  },
];

// ── Recent Workouts ────────────────────────────────────────────────────────────
export const RECENT_WORKOUTS: RecentWorkout[] = [
  {
    name: "Push Day",
    date: "Today",
    duration: 52,
    calories: 380,
    muscles: ["Chest", "Shoulders", "Triceps"],
    sets: 18,
    volume: 4800,
    completed: true,
    type: "strength",
  },
  {
    name: "Lower Body Power",
    date: "Yesterday",
    duration: 65,
    calories: 490,
    muscles: ["Quads", "Hamstrings", "Glutes"],
    sets: 20,
    volume: 6200,
    completed: true,
    type: "strength",
  },
  {
    name: "HIIT Cardio Blast",
    date: "Aug 05",
    duration: 28,
    calories: 310,
    muscles: ["Full Body"],
    sets: 0,
    volume: 0,
    completed: true,
    type: "hiit",
  },
  {
    name: "Pull Day",
    date: "Aug 04",
    duration: 58,
    calories: 420,
    muscles: ["Back", "Biceps", "Rear Delts"],
    sets: 19,
    volume: 5100,
    completed: true,
    type: "strength",
  },
  {
    name: "Mobility & Stretch",
    date: "Aug 03",
    duration: 30,
    calories: 110,
    muscles: ["Full Body"],
    sets: 0,
    volume: 0,
    completed: true,
    type: "mobility",
  },
];
