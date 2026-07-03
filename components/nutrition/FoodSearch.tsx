"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import type { USDAFood } from "@/app/api/nutrition/usda-search/route";
import type { MealType } from "@/lib/types/meal-log";

interface FoodSearchProps {
  userId: string;
  date: string;
  onLogged: () => void;
}

interface SearchResult {
  foods: USDAFood[];
}

interface PortionState {
  food: USDAFood;
  portionG: number;
  mealType: MealType;
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

async function searchFoods(q: string): Promise<SearchResult> {
  const res = await fetch(`/api/nutrition/usda-search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Food search unavailable — try again");
  return res.json() as Promise<SearchResult>;
}

export default function FoodSearch({ userId, date, onLogged }: FoodSearchProps) {
  const queryClient = useQueryClient();

  // Raw input value (unthrottled)
  const [inputValue, setInputValue] = useState("");
  // Debounced query — only updated 400 ms after the user stops typing
  const [query, setQuery] = useState("");
  // Selected food pending portion/meal-type confirmation
  const [portionState, setPortionState] = useState<PortionState | null>(null);
  // Submission error message
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 400 ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      setQuery(trimmed.length >= 2 ? trimmed : "");
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // USDA search query — only active when query is ≥ 2 characters
  const {
    data,
    isFetching,
    isError,
  } = useQuery<SearchResult, Error>({
    queryKey: ["usda-search", query],
    queryFn: () => searchFoods(query),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });

  // POST /api/nutrition/meal-log mutation
  const { mutate: logFood, isPending: isLogging } = useMutation({
    mutationFn: async (state: PortionState) => {
      const factor = state.portionG / 100;
      const round2 = (v: number) => Math.round(v * factor * 100) / 100;

      const body = {
        userId,
        date,
        meal_type: state.mealType,
        source: "manual" as const,
        food_name: state.food.description,
        calories: round2(state.food.calories),
        protein_g: round2(state.food.protein_g),
        carbs_g: round2(state.food.carbs_g),
        fat_g: round2(state.food.fat_g),
        fiber_g: round2(state.food.fiber_g),
      };

      const res = await fetch("/api/nutrition/meal-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to log food");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs", userId, date] });
      setPortionState(null);
      setInputValue("");
      setQuery("");
      setSubmitError(null);
      onLogged();
    },
    onError: (err: Error) => {
      setSubmitError(err.message);
    },
  });

  const handleSelectFood = useCallback((food: USDAFood) => {
    setPortionState({
      food,
      portionG: food.servingSize ?? 100,
      mealType: "snack",
    });
    setSubmitError(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!portionState || isLogging) return;
    logFood(portionState);
  }, [portionState, isLogging, logFood]);

  const handleCancel = useCallback(() => {
    setPortionState(null);
    setSubmitError(null);
  }, []);

  const foods = data?.foods ?? [];
  const showResults = query.length >= 2 && !portionState;
  const showEmpty = showResults && !isFetching && !isError && foods.length === 0;

  // ── Portion / meal-type confirmation panel ──────────────────────────────────
  if (portionState) {
    const { food, portionG, mealType } = portionState;
    const factor = portionG / 100;
    const round2 = (v: number) => Math.round(v * factor * 100) / 100;

    return (
      <div className="flex flex-col gap-4">
        {/* Food name */}
        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
          <p className="font-body font-bold text-[14px] text-[var(--color-text-1)]">
            {food.description}
          </p>
          {food.brandOwner && (
            <p className="font-caption text-[11px] text-[var(--color-text-3)] mt-0.5">
              {food.brandOwner}
            </p>
          )}
        </div>

        {/* Portion size */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="portion-input"
            className="font-body font-bold text-[12px] text-[#475569]"
          >
            Portion size (g)
          </label>
          <input
            id="portion-input"
            type="number"
            min={1}
            step={1}
            value={portionG}
            onChange={(e) =>
              setPortionState((prev) =>
                prev ? { ...prev, portionG: Math.max(1, Number(e.target.value)) } : prev
              )
            }
            className="h-12 w-full rounded-[10px] border border-[#E2E8F0] px-3.5 font-body text-[14px] text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          />
        </div>

        {/* Meal type */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="meal-type-select"
            className="font-body font-bold text-[12px] text-[#475569]"
          >
            Meal type
          </label>
          <select
            id="meal-type-select"
            value={mealType}
            onChange={(e) =>
              setPortionState((prev) =>
                prev ? { ...prev, mealType: e.target.value as MealType } : prev
              )
            }
            className="h-12 w-full rounded-[10px] border border-[#E2E8F0] px-3.5 font-body text-[14px] text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          >
            {MEAL_TYPES.map((mt) => (
              <option key={mt.value} value={mt.value}>
                {mt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Scaled macro preview */}
        <div className="grid grid-cols-5 gap-2 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-center">
          {(
            [
              { label: "Kcal", value: round2(food.calories) },
              { label: "Protein", value: `${round2(food.protein_g)}g` },
              { label: "Carbs", value: `${round2(food.carbs_g)}g` },
              { label: "Fat", value: `${round2(food.fat_g)}g` },
              { label: "Fiber", value: `${round2(food.fiber_g)}g` },
            ] as { label: string; value: string | number }[]
          ).map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="font-caption text-[10px] text-[var(--color-text-3)] uppercase tracking-wide">
                {label}
              </span>
              <span className="font-body font-bold text-[13px] text-[var(--color-text-1)]">
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Submit error */}
        {submitError && (
          <p
            role="alert"
            className="text-[13px] font-body text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-4 py-3"
          >
            {submitError}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="md"
            className="flex-1"
            onClick={handleCancel}
            disabled={isLogging}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={handleConfirm}
            loading={isLogging}
          >
            Log Food
          </Button>
        </div>
      </div>
    );
  }

  // ── Search input + results ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Search input with loading spinner */}
      <div className="relative">
        <input
          type="search"
          placeholder="Search foods (e.g. chicken breast)…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="h-12 w-full rounded-[10px] border border-[#E2E8F0] px-3.5 pr-10 font-body text-[14px] text-[#0F172A] bg-white placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
          aria-label="Search foods"
        />
        {/* Loading spinner inside input */}
        {isFetching && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
          >
            <svg
              className="animate-spin w-4 h-4 text-[#2563EB]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeOpacity=".3"
              />
              <path
                d="M12 2a10 10 0 0110 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Error state */}
      {showResults && isError && (
        <p
          role="alert"
          className="text-[13px] font-body text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-4 py-3"
        >
          Food search unavailable — try again
        </p>
      )}

      {/* Empty state */}
      {showEmpty && (
        <p className="font-body text-[14px] text-[var(--color-text-3)] text-center py-6">
          No foods found
        </p>
      )}

      {/* Results list */}
      {showResults && !isError && foods.length > 0 && (
        <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto rounded-[12px] border border-[var(--color-border)]">
          {foods.map((food) => (
            <li key={food.fdcId}>
              <button
                type="button"
                onClick={() => handleSelectFood(food)}
                className="w-full text-left px-4 py-3 hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-3)] transition-colors border-b border-[var(--color-border)] last:border-b-0"
              >
                <p className="font-body font-bold text-[13px] text-[var(--color-text-1)] leading-snug">
                  {food.description}
                </p>
                {food.brandOwner && (
                  <p className="font-caption text-[11px] text-[var(--color-text-3)] mt-0.5">
                    {food.brandOwner}
                  </p>
                )}
                <p className="font-caption text-[11px] text-[var(--color-text-2)] mt-1">
                  {food.calories} kcal · {food.protein_g}g protein · {food.carbs_g}g carbs · {food.fat_g}g fat
                  {food.servingSize ? ` (serving: ${food.servingSize}${food.servingSizeUnit ?? "g"})` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
