"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import { MealPlanSkeleton } from "@/components/nutrition/Skeletons";
import { useUserStore } from "@/lib/store/user";
import { computeBmi, getBmiCategory, computeTargets } from "@/lib/nutrition/targets";
import type { MealSuggestion } from "@/lib/types/claude";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MealPlanProps {
  userId: string;
  date: string;
  remainingMacros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  // still accepted for API compatibility but no longer required for gating
  profile?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitaliseMealType(mealType: string): string {
  return mealType.charAt(0).toUpperCase() + mealType.slice(1);
}

function mealTypeBadgeClass(mealType: string): string {
  switch (mealType.toLowerCase()) {
    case "breakfast": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "lunch":     return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    case "dinner":    return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "snack":     return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    default:          return "bg-[var(--color-surface-3)] text-[var(--color-text-2)]";
  }
}

/** Map Zustand goal strings → API goal keys */
function mapGoal(goal: string): "lose" | "maintain" | "gain" {
  const g = goal.toLowerCase();
  if (g.includes("loss") || g.includes("lose")) return "lose";
  if (g.includes("gain") || g.includes("muscle")) return "gain";
  return "maintain";
}

/** Map Zustand gender strings → API gender keys */
function mapGender(gender: string): "male" | "female" | "other" {
  const g = gender.toLowerCase();
  if (g === "male" || g === "man") return "male";
  if (g === "female" || g === "woman") return "female";
  return "other";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MealPlan({ userId, date, remainingMacros }: MealPlanProps) {
  const queryClient = useQueryClient();

  // Read profile data directly from Zustand (same source as /profile page)
  const { weightKg, heightCm, age, gender, goal, activityLevel, foodPreferences, allergies } = useUserStore();

  // Determine if we have enough data to generate a plan
  const hasProfile = Boolean(weightKg && heightCm && age && gender && goal);

  // Compute targets from Zustand data
  const getMealPlanContext = () => {
    if (!hasProfile) return null;
    const mappedGender = mapGender(gender);
    const mappedGoal = mapGoal(goal);

    // Map Zustand activityLevel to the ActivityLevel type
    const validActivityLevels = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'];
    const mappedActivity = validActivityLevels.includes(activityLevel)
      ? activityLevel as 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active'
      : 'moderately_active';

    const bmi = computeBmi(weightKg, heightCm);
    const bmiCategory = getBmiCategory(bmi);
    const targets = computeTargets(weightKg, heightCm, age, mappedGender, mappedActivity, mappedGoal);
    return {
      age,
      gender: mappedGender,
      bmi,
      bmi_category: bmiCategory,
      activity_level: mappedActivity,
      goal: mappedGoal,
      ...targets,
    };
  };

  const [suggestions, setSuggestions] = useState<MealSuggestion[] | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [loggedIndices, setLoggedIndices] = useState<Set<number>>(new Set());
  const [regeneratingIndices, setRegeneratingIndices] = useState<Set<number>>(new Set());

  // ── Generate full plan mutation ────────────────────────────────────────
  const generateMutation = useMutation<MealSuggestion[], Error>({
    mutationFn: async () => {
      const context = getMealPlanContext();
      const res = await fetch("/api/nutrition/generate-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          profileData: context,
          remainingMacros,
          foodPreferences,
          allergies,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate plan");
      const json = (await res.json()) as { suggestions: MealSuggestion[] };
      return json.suggestions;
    },
    onSuccess: (data) => {
      setSuggestions(data);
      setPlanError(null);
      setLoggedIndices(new Set());
      setRegeneratingIndices(new Set());
    },
    onError: () => {
      setPlanError("Couldn't generate suggestions — try again");
    },
  });

  // ── Log meal mutation ──────────────────────────────────────────────────
  const logMutation = useMutation<unknown, Error, { suggestion: MealSuggestion; index: number }>({
    mutationFn: async ({ suggestion }) => {
      const res = await fetch("/api/nutrition/meal-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "meal_plan",
          meal_type: suggestion.meal_type,
          date,
          userId,
          food_name: suggestion.meal_name,
          calories: suggestion.calories,
          protein_g: suggestion.protein_g,
          carbs_g: suggestion.carbs_g,
          fat_g: suggestion.fat_g,
        }),
      });
      if (!res.ok) throw new Error("Failed to log meal");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      setLoggedIndices((prev) => new Set(prev).add(variables.index));
      queryClient.invalidateQueries({ queryKey: ["meal-logs", userId, date] });
    },
  });

  // ── Regenerate single suggestion ───────────────────────────────────────
  async function regenerateSuggestion(index: number, mealType: string) {
    setRegeneratingIndices((prev) => new Set(prev).add(index));
    setPlanError(null);
    try {
      const context = getMealPlanContext();
      const res = await fetch("/api/nutrition/generate-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mealType,
          profileData: context,
          remainingMacros,
          foodPreferences,
          allergies,
        }),
      });
      if (!res.ok) throw new Error("Failed to regenerate");
      const json = (await res.json()) as { suggestions: MealSuggestion[] };
      const newSuggestion = json.suggestions[0];
      if (newSuggestion) {
        setSuggestions((prev) =>
          prev ? prev.map((s, i) => (i === index ? newSuggestion : s)) : prev
        );
        setLoggedIndices((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    } catch {
      setPlanError("Couldn't generate suggestions — try again");
    } finally {
      setRegeneratingIndices((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  const isGenerating = generateMutation.isPending;

  // ── Profile gate — use Zustand data, not Supabase ─────────────────────
  if (!hasProfile) {
    return (
      <div className="flex flex-col gap-3 items-center text-center py-4">
        <p className="font-body text-[14px] text-[var(--color-text-2)]">
          Complete your profile to get a personalised meal plan
        </p>
        <a
          href="/profile"
          className="font-body font-bold text-[13px] text-[#2563EB] underline underline-offset-2"
        >
          Set up your profile →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="primary"
        size="md"
        fullWidth
        disabled={isGenerating}
        loading={isGenerating}
        onClick={() => generateMutation.mutate()}
      >
        Generate Plan
      </Button>

      {isGenerating && <MealPlanSkeleton />}

      {planError !== null && !isGenerating && (
        <p
          role="alert"
          className="text-[13px] font-body text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-[10px] px-4 py-3"
        >
          {planError}
        </p>
      )}

      {!isGenerating && suggestions !== null && suggestions.length > 0 && (
        <div className="flex flex-col gap-3">
          {suggestions.map((suggestion, index) => {
            const isLogged = loggedIndices.has(index);
            const isLogging =
              logMutation.isPending &&
              (logMutation.variables as { index: number } | undefined)?.index === index;
            const isRegenerating = regeneratingIndices.has(index);

            return (
              <div
                key={index}
                className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 font-caption text-[10px] font-semibold uppercase tracking-wide ${mealTypeBadgeClass(suggestion.meal_type)}`}
                  >
                    {capitaliseMealType(suggestion.meal_type)}
                  </span>
                  <p className="font-body font-bold text-[15px] text-[var(--color-text-1)]">
                    {suggestion.meal_name}
                  </p>
                </div>

                <p className="font-body text-[13px] text-[var(--color-text-2)]">
                  {suggestion.description}
                </p>

                {suggestion.items.length > 0 && (
                  <ul className="flex flex-col gap-0.5 pl-3">
                    {suggestion.items.map((item, i) => (
                      <li key={i} className="list-disc font-body text-[12px] text-[var(--color-text-3)]">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Kcal",    val: suggestion.calories },
                    { label: "Protein", val: `${suggestion.protein_g}g` },
                    { label: "Carbs",   val: `${suggestion.carbs_g}g` },
                    { label: "Fat",     val: `${suggestion.fat_g}g` },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="font-caption text-[10px] text-[var(--color-text-3)] uppercase tracking-wide">{label}</span>
                      <span className="font-body font-bold text-[13px] text-[var(--color-text-1)]">{val}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {isLogged ? (
                    <span aria-label="Logged" className="flex items-center gap-1.5 text-[13px] font-bold text-[#22C55E]">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="#22C55E" />
                        <path d="M4.5 8.5L6.5 10.5L11.5 5.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Logged
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={isLogging}
                      disabled={isLogging || isRegenerating}
                      onClick={() => logMutation.mutate({ suggestion, index })}
                    >
                      Log This Meal
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    loading={isRegenerating}
                    disabled={isRegenerating || isLogging || isLogged}
                    onClick={() => regenerateSuggestion(index, suggestion.meal_type)}
                  >
                    {isRegenerating ? "Regenerating…" : "Regenerate"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
