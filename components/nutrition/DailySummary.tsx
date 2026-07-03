"use client";

import { DailySummarySkeleton } from "@/components/nutrition/Skeletons";
import type { NutritionProfileRow } from "@/lib/types/nutrition-profile";

interface MacroTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface DailySummaryProps {
  totals: MacroTotals;
  profile: NutritionProfileRow | null;
  date: string;
  isLoading?: boolean;
  targetCalories?: number;
  targetProtein?: number;
}

export default function DailySummary({ totals, profile, date: _date, isLoading, targetCalories: targetCaloriesProp, targetProtein: targetProteinProp }: DailySummaryProps) {
  if (isLoading) return <DailySummarySkeleton />;

  const targetCalories = targetCaloriesProp ?? profile?.target_calories ?? 2000;
  const targetProtein  = targetProteinProp  ?? profile?.target_protein_g ?? 150;

  const remainingCalories = Math.max(0, targetCalories - totals.calories);
  const remainingProtein = Math.max(0, targetProtein - totals.protein_g);

  const andiInsight = `You still have ${Math.round(remainingCalories)} kcal and ${Math.round(remainingProtein)}g protein left for today`;

  return (
    <div className="flex flex-col gap-3">
      {/* Calorie summary */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-[13px] text-[var(--color-text-2)]">
          Calories eaten
        </span>
        <span className="font-metric text-[1.25rem] text-[var(--color-text-1)]">
          {Math.round(totals.calories)} kcal
        </span>
      </div>

      {/* Remaining calories */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-[13px] text-[var(--color-text-2)]">
          Remaining
        </span>
        <span
          className="font-metric text-[1.25rem]"
          style={{ color: remainingCalories > 0 ? "#4ADE80" : "#F87171" }}
        >
          {Math.round(remainingCalories)} kcal
        </span>
      </div>

      {/* Protein summary */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-[13px] text-[var(--color-text-2)]">
          Protein
        </span>
        <span className="font-body text-[13px] text-[var(--color-text-1)]">
          {Math.round(totals.protein_g)}g / {targetProtein}g
        </span>
      </div>

      {/* Andi insight */}
      <p className="font-body text-[13px] italic text-[var(--color-text-3)] pt-1">
        {andiInsight}
      </p>
    </div>
  );
}
