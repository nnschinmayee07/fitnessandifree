"use client";

import { useQuery } from "@tanstack/react-query";
import ProgressBar from "@/components/ui/ProgressBar";
import { MealLogsSkeleton } from "@/components/nutrition/Skeletons";
import type { MealLogRow } from "@/lib/types/meal-log";
import type { WaterLogRow } from "@/lib/types/water-log";
import type { NutritionProfileRow } from "@/lib/types/nutrition-profile";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailySummaryResponse {
  profile: NutritionProfileRow | null;
  mealLogs: MealLogRow[];
  waterLogs: WaterLogRow[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
}

export interface MacroTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// ---------------------------------------------------------------------------
// Pure helper: exported for property tests
// ---------------------------------------------------------------------------

/**
 * Sums macro fields across all MealLogRow entries.
 * Null/undefined numeric fields are treated as 0.
 * Returns all-zero totals for an empty array.
 */
export function computeTotals(rows: MealLogRow[]): MacroTotals {
  return rows.reduce<MacroTotals>(
    (acc, row) => ({
      calories: acc.calories + (row.calories ?? 0),
      protein_g: acc.protein_g + (row.protein_g ?? 0),
      carbs_g: acc.carbs_g + (row.carbs_g ?? 0),
      fat_g: acc.fat_g + (row.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

/** Clamps (logged / target) × 100 to [0, 100]. Returns 0 when target is 0. */
function barPercent(logged: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (logged / target) * 100));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MacroBarProps {
  label: string;
  logged: number;
  target: number;
  unit: string;
  color?: string;
}

function MacroBar({ label, logged, target, unit, color }: MacroBarProps) {
  const percent = barPercent(logged, target);
  const loggedDisplay = unit === "kcal" ? Math.round(logged) : Math.round(logged);
  const targetDisplay = unit === "kcal" ? Math.round(target) : Math.round(target);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-caption text-[var(--color-text-secondary)] text-xs capitalize">
          {label}
        </span>
        <span className="font-caption text-[var(--color-text-primary)] text-xs">
          {loggedDisplay}{unit === "kcal" ? " " : "g / "}
          {unit === "kcal" ? `/ ${targetDisplay} kcal` : `${targetDisplay}g ${label}`}
        </span>
      </div>
      <ProgressBar value={percent} color={color} height={6} />
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#F87171]/30 bg-[#F87171]/10 px-4 py-3">
      <span className="font-body text-sm text-[#F87171]">⚠ {message}</span>
      <button
        onClick={onRetry}
        className="font-body text-sm text-[#2563EB] underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        Retry →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DailyProgressProps {
  userId: string;
  date: string;
  profile: NutritionProfileRow | null;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  targetWater?: number;
}

export default function DailyProgress({ userId, date, profile, targetCalories: targetCaloriesProp, targetProtein: targetProteinProp, targetCarbs: targetCarbsProp, targetFat: targetFatProp, targetWater: targetWaterProp }: DailyProgressProps) {
  const { data, isLoading, isError, error, refetch } = useQuery<DailySummaryResponse, Error>({
    queryKey: ["meal-logs", userId, date],
    queryFn: () =>
      fetch(`/api/nutrition/daily-summary?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(date)}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch daily summary: ${r.status}`);
          return r.json() as Promise<DailySummaryResponse>;
        }),
    enabled: Boolean(userId),
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <MealLogsSkeleton />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <ErrorBanner
        message={error?.message ?? "Failed to load progress data"}
        onRetry={() => refetch()}
      />
    );
  }

  const mealLogs = data?.mealLogs ?? [];
  const waterLogs = data?.waterLogs ?? [];
  const isEmpty = mealLogs.length === 0;

  // Totals from meal logs
  const totals = computeTotals(mealLogs);
  const waterTotal = waterLogs.reduce((sum, row) => sum + row.amount_ml, 0);

  // Targets — prefer explicitly passed props, then Supabase profile, then fallback defaults
  const resolvedProfile = profile ?? data?.profile ?? null;
  const targetCalories = targetCaloriesProp ?? resolvedProfile?.target_calories ?? 2000;
  const targetProtein  = targetProteinProp  ?? resolvedProfile?.target_protein_g ?? 150;
  const targetCarbs    = targetCarbsProp    ?? resolvedProfile?.target_carbs_g   ?? 225;
  const targetFat      = targetFatProp      ?? resolvedProfile?.target_fat_g     ?? 55;
  const targetWater    = targetWaterProp    ?? resolvedProfile?.target_water_ml  ?? 2500;

  return (
    <div className="flex flex-col gap-4">
      {/* Empty state hint */}
      {isEmpty && (
        <p className="font-body text-sm text-[var(--color-text-secondary)] text-center py-1">
          Nothing logged yet
        </p>
      )}

      {/* Macro progress bars */}
      <MacroBar
        label="calories"
        logged={totals.calories}
        target={targetCalories}
        unit="kcal"
        color="#2563EB"
      />
      <MacroBar
        label="protein"
        logged={totals.protein_g}
        target={targetProtein}
        unit="g"
        color="#4ADE80"
      />
      <MacroBar
        label="carbs"
        logged={totals.carbs_g}
        target={targetCarbs}
        unit="g"
        color="#FCD34D"
      />
      <MacroBar
        label="fat"
        logged={totals.fat_g}
        target={targetFat}
        unit="g"
        color="#F87171"
      />

      {/* Water progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-caption text-[var(--color-text-secondary)] text-xs">
            water
          </span>
          <span className="font-caption text-[var(--color-text-primary)] text-xs">
            {waterTotal} ml / {targetWater} ml water
          </span>
        </div>
        <ProgressBar
          value={barPercent(waterTotal, targetWater)}
          color="#60A5FA"
          height={6}
        />
      </div>
    </div>
  );
}
