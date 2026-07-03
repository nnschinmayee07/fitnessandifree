"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import type { LogSource, MealType } from "@/lib/types/meal-log";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ManualFallbackFormProps {
  /** 'photo' | 'description' — written to meal_logs.source */
  source: LogSource;
  mealType: MealType;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  onSuccess: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns an error string if the value is not a non-negative integer string,
 * or null if valid.
 */
function validateNonNegativeInt(value: string): string | null {
  if (value === "") return "Required";
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return "Must be a non-negative whole number";
  return null;
}

/**
 * Returns an error string for the optional fiber field (empty = ok),
 * or null if valid.
 */
function validateOptionalNonNegativeInt(value: string): string | null {
  if (value === "") return null; // optional — blank is fine
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return "Must be a non-negative whole number";
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ManualFallbackForm({
  source,
  mealType,
  userId,
  date,
  onSuccess,
}: ManualFallbackFormProps) {
  // Field values
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [fiberG, setFiberG] = useState("");

  // Field-level errors — only shown after the field has been touched
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Mutation error message
  const [mutationError, setMutationError] = useState<string | null>(null);

  // ── Derived validation ──────────────────────────────────────────────────────

  const mealNameError =
    mealName.trim() === ""
      ? "Required"
      : mealName.length > 100
        ? "Max 100 characters"
        : null;

  const caloriesError = validateNonNegativeInt(calories);
  const proteinError = validateNonNegativeInt(proteinG);
  const carbsError = validateNonNegativeInt(carbsG);
  const fatError = validateNonNegativeInt(fatG);
  const fiberError = validateOptionalNonNegativeInt(fiberG);

  const hasValidationError =
    mealNameError !== null ||
    caloriesError !== null ||
    proteinError !== null ||
    carbsError !== null ||
    fatError !== null ||
    fiberError !== null;

  // ── Mutation ────────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: async () => {
      setMutationError(null);

      const body: Record<string, unknown> = {
        userId,
        date,
        meal_type: mealType,
        source,
        food_name: mealName.trim(),
        calories: Number(calories),
        protein_g: Number(proteinG),
        carbs_g: Number(carbsG),
        fat_g: Number(fatG),
      };

      if (fiberG !== "") {
        body.fiber_g = Number(fiberG);
      }

      const res = await fetch("/api/nutrition/meal-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to save meal");
      }

      return res.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: () => {
      setMutationError("Failed to save meal — try again");
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Mark all fields as touched to surface any hidden errors
      setTouched({
        mealName: true,
        calories: true,
        proteinG: true,
        carbsG: true,
        fatG: true,
        fiberG: true,
      });

      if (hasValidationError) return;

      mutation.mutate();
    },
    [hasValidationError, mutation],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 w-full"
      aria-label="Manual meal entry form"
    >
      {/* ── Meal name ── */}
      <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
        <label
          htmlFor="manual-meal-name"
          className="font-body text-[13px] font-bold text-[var(--color-text-2)]"
        >
          Meal name <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="manual-meal-name"
          type="text"
          value={mealName}
          maxLength={100}
          required
          autoComplete="off"
          placeholder="e.g. Dal Rice with Sabzi"
          onChange={(e) => setMealName(e.target.value)}
          onBlur={() => markTouched("mealName")}
          aria-invalid={touched.mealName && mealNameError !== null}
          aria-describedby={
            touched.mealName && mealNameError ? "meal-name-error" : undefined
          }
          className={[
            "w-full h-12 px-4 rounded-[12px] border bg-[var(--color-surface-2)] text-[var(--color-text-1)]",
            "font-body text-[14px] placeholder:text-[var(--color-text-3)]",
            "focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-colors",
            touched.mealName && mealNameError
              ? "border-red-500"
              : "border-[var(--color-border)]",
          ].join(" ")}
        />
        {touched.mealName && mealNameError && (
          <p
            id="meal-name-error"
            role="alert"
            className="font-caption text-[12px] text-red-500"
          >
            {mealNameError}
          </p>
        )}
      </fieldset>

      {/* ── Numeric macro grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Calories */}
        <NumericField
          id="manual-calories"
          label="Calories (kcal)"
          required
          value={calories}
          error={touched.calories ? caloriesError : null}
          errorId="calories-error"
          onChange={setCalories}
          onBlur={() => markTouched("calories")}
        />

        {/* Protein */}
        <NumericField
          id="manual-protein"
          label="Protein (g)"
          required
          value={proteinG}
          error={touched.proteinG ? proteinError : null}
          errorId="protein-error"
          onChange={setProteinG}
          onBlur={() => markTouched("proteinG")}
        />

        {/* Carbs */}
        <NumericField
          id="manual-carbs"
          label="Carbs (g)"
          required
          value={carbsG}
          error={touched.carbsG ? carbsError : null}
          errorId="carbs-error"
          onChange={setCarbsG}
          onBlur={() => markTouched("carbsG")}
        />

        {/* Fat */}
        <NumericField
          id="manual-fat"
          label="Fat (g)"
          required
          value={fatG}
          error={touched.fatG ? fatError : null}
          errorId="fat-error"
          onChange={setFatG}
          onBlur={() => markTouched("fatG")}
        />

        {/* Fiber — optional, spans full width */}
        <div className="col-span-2">
          <NumericField
            id="manual-fiber"
            label="Fiber (g)"
            required={false}
            value={fiberG}
            error={touched.fiberG ? fiberError : null}
            errorId="fiber-error"
            onChange={setFiberG}
            onBlur={() => markTouched("fiberG")}
          />
        </div>
      </div>

      {/* ── Mutation error ── */}
      {mutationError && (
        <p
          role="alert"
          className="font-body text-[13px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-[10px] px-4 py-3"
        >
          {mutationError}
        </p>
      )}

      {/* ── Submit ── */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        disabled={hasValidationError || mutation.isPending}
        loading={mutation.isPending}
      >
        Log This Meal
      </Button>
    </form>
  );
}

// ─── Internal helper: numeric input field ─────────────────────────────────────

interface NumericFieldProps {
  id: string;
  label: string;
  required: boolean;
  value: string;
  error: string | null;
  errorId: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}

function NumericField({
  id,
  label,
  required,
  value,
  error,
  errorId,
  onChange,
  onBlur,
}: NumericFieldProps) {
  return (
    <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
      <label
        htmlFor={id}
        className="font-body text-[13px] font-bold text-[var(--color-text-2)]"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-500 ml-0.5">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value}
        required={required}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        className={[
          "w-full h-12 px-4 rounded-[12px] border bg-[var(--color-surface-2)] text-[var(--color-text-1)]",
          "font-body text-[14px] placeholder:text-[var(--color-text-3)]",
          "focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-colors",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          error ? "border-red-500" : "border-[var(--color-border)]",
        ].join(" ")}
      />
      {error && (
        <p
          id={errorId}
          role="alert"
          className="font-caption text-[12px] text-red-500"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
