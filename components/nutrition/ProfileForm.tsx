"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import { ProfileSkeleton } from "@/components/nutrition/Skeletons";
import { computeBmi, getBmiCategory, computeTargets } from "@/lib/nutrition/targets";
import { useUserStore } from "@/lib/store/user";
import type { ActivityLevel, Goal, NutritionProfileRow, CuisineType } from "@/lib/types/nutrition-profile";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileFormFields {
  age: string;
  gender: "male" | "female" | "other" | "";
  height_cm: string;
  weight_kg: string;
  activity_level: ActivityLevel | "";
  goal: Goal | "";
  cuisine_preference: CuisineType | "";
}

interface FieldErrors {
  age?: string;
  gender?: string;
  height_cm?: string;
  weight_kg?: string;
  activity_level?: string;
  goal?: string;
  cuisine_preference?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BMI_COLOURS: Record<string, string> = {
  Underweight: "#60A5FA",
  Normal: "#4ADE80",
  Overweight: "#FCD34D",
  Obese: "#F87171",
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little/no exercise)",
  lightly_active: "Lightly Active (1–3 days/week)",
  moderately_active: "Moderately Active (3–5 days/week)",
  very_active: "Very Active (6–7 days/week)",
  extra_active: "Extra Active (2× per day / physical job)",
};

const GOAL_LABELS: Record<Goal, string> = {
  lose: "Lose Weight",
  maintain: "Maintain Weight",
  gain: "Gain Weight",
};

const CUISINE_LABELS: Record<CuisineType, string> = {
  American: "American",
  Italian: "Italian",
  Mexican: "Mexican",
  Asian: "Asian",
  Mediterranean: "Mediterranean",
  "South Indian": "South Indian",
  "North Indian": "North Indian",
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateFields(fields: ProfileFormFields): FieldErrors {
  const errors: FieldErrors = {};

  const age = Number(fields.age);
  if (!fields.age.trim()) {
    errors.age = "Age is required";
  } else if (isNaN(age) || !Number.isInteger(age)) {
    errors.age = "Age must be a whole number";
  } else if (age < 1 || age > 120) {
    errors.age = "Age must be between 1 and 120";
  }

  if (!fields.gender) {
    errors.gender = "Gender is required";
  }

  const height = Number(fields.height_cm);
  if (!fields.height_cm.trim()) {
    errors.height_cm = "Height is required";
  } else if (isNaN(height)) {
    errors.height_cm = "Height must be a number";
  } else if (height < 50 || height > 300) {
    errors.height_cm = "Height must be between 50 and 300 cm";
  }

  const weight = Number(fields.weight_kg);
  if (!fields.weight_kg.trim()) {
    errors.weight_kg = "Weight is required";
  } else if (isNaN(weight)) {
    errors.weight_kg = "Weight must be a number";
  } else if (weight < 1 || weight > 500) {
    errors.weight_kg = "Weight must be between 1 and 500 kg";
  }

  if (!fields.activity_level) {
    errors.activity_level = "Activity level is required";
  }

  if (!fields.goal) {
    errors.goal = "Goal is required";
  }

  return errors;
}

function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

function allRequiredFilled(fields: ProfileFormFields): boolean {
  return (
    fields.age.trim() !== "" &&
    fields.gender !== "" &&
    fields.height_cm.trim() !== "" &&
    fields.weight_kg.trim() !== "" &&
    fields.activity_level !== "" &&
    fields.goal !== ""
  );
}

// ---------------------------------------------------------------------------
// Live BMI display
// ---------------------------------------------------------------------------

function BmiDisplay({ weight_kg, height_cm }: { weight_kg: string; height_cm: string }) {
  const weight = Number(weight_kg);
  const height = Number(height_cm);

  const isValid =
    weight_kg.trim() !== "" &&
    height_cm.trim() !== "" &&
    !isNaN(weight) &&
    !isNaN(height) &&
    weight >= 1 &&
    weight <= 500 &&
    height >= 50 &&
    height <= 300;

  if (!isValid) return null;

  const bmi = computeBmi(weight, height);
  const category = getBmiCategory(bmi);
  const colour = BMI_COLOURS[category] ?? "#94A3B8";

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-[12px] border p-3"
      style={{ borderColor: colour, background: `${colour}18` }}
      aria-live="polite"
      aria-label={`BMI: ${bmi}, Category: ${category}`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-caption text-[10px] font-light text-[var(--color-text-3)] uppercase tracking-wide">
          BMI
        </span>
        <span className="font-metric text-[1.5rem]" style={{ color: colour }}>
          {bmi}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span
          className="font-body font-bold text-[13px]"
          style={{ color: colour }}
        >
          {category}
        </span>
        <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">
          Body Mass Index
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field error message
// ---------------------------------------------------------------------------

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="font-caption text-[11px] text-[#EF4444] mt-1">
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Input / select shared styles
// ---------------------------------------------------------------------------

const inputClass =
  "h-11 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 font-body text-[13px] text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] focus:border-[#2563EB] focus:outline-none transition-colors disabled:opacity-50";

const labelClass =
  "font-body font-bold text-[12px] text-[var(--color-text-2)] mb-1 block";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ProfileFormProps {
  /** If omitted, reads email from useUserStore */
  userId?: string;
}

export default function ProfileForm({ userId: userIdProp }: ProfileFormProps) {
  const storeEmail = useUserStore((s) => s.email);
  const userId = userIdProp ?? storeEmail;

  const queryClient = useQueryClient();

  // ── Form state ──
  const [fields, setFields] = useState<ProfileFormFields>({
    age: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    activity_level: "",
    goal: "",
    cuisine_preference: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<keyof ProfileFormFields, boolean>>>({});

  // ── Prefill query ──
  const { data: summaryData, isLoading: prefillLoading } = useQuery({
    queryKey: ["nutrition-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`/api/nutrition/daily-summary?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json as { profile: NutritionProfileRow | null };
    },
    enabled: Boolean(userId),
  });

  // Pre-populate fields once profile data is loaded
  useEffect(() => {
    const profile = summaryData?.profile;
    if (!profile) return;

    setFields({
      age: profile.age != null ? String(profile.age) : "",
      gender: profile.gender ?? "",
      height_cm: profile.height_cm != null ? String(profile.height_cm) : "",
      weight_kg: profile.weight_kg != null ? String(profile.weight_kg) : "",
      activity_level: profile.activity_level ?? "",
      goal: profile.goal ?? "",
      cuisine_preference: profile.cuisine_preference ?? "",
    });
  }, [summaryData]);

  // ── Upsert mutation ──
  const mutation = useMutation({
    mutationFn: async (payload: {
      userId: string;
      age: number;
      gender: "male" | "female" | "other";
      height_cm: number;
      weight_kg: number;
      activity_level: ActivityLevel;
      goal: Goal;
      cuisine_preference?: CuisineType | null;
    }) => {
      const res = await fetch("/api/nutrition/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to save profile — please try again");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: ["nutrition-profile", userId] });
    },
    onError: () => {
      setSubmitError("Failed to save profile — please try again");
    },
  });

  // ── Field change handler ──
  const handleChange = useCallback(
    (name: keyof ProfileFormFields, value: string) => {
      setFields((prev) => {
        const next = { ...prev, [name]: value };
        // Validate changed field immediately if it has been touched
        if (touched[name]) {
          const newErrors = validateFields(next);
          setErrors(newErrors);
        }
        return next;
      });
    },
    [touched]
  );

  const handleBlur = useCallback(
    (name: keyof ProfileFormFields) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      setErrors(validateFields({ ...fields, [name]: fields[name] }));
    },
    [fields]
  );

  // ── Submit handler ──
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Mark all fields as touched so errors appear
      const allTouched: Partial<Record<keyof ProfileFormFields, boolean>> = {
        age: true,
        gender: true,
        height_cm: true,
        weight_kg: true,
        activity_level: true,
        goal: true,
        cuisine_preference: true,
      };
      setTouched(allTouched);

      const validationErrors = validateFields(fields);
      setErrors(validationErrors);

      if (hasErrors(validationErrors)) return;
      if (!userId) return;

      const age = Number(fields.age);
      const height_cm = Number(fields.height_cm);
      const weight_kg = Number(fields.weight_kg);
      const gender = fields.gender as "male" | "female" | "other";
      const activity_level = fields.activity_level as ActivityLevel;
      const goal = fields.goal as Goal;
      const cuisine_preference = fields.cuisine_preference || null;

      // Compute targets on client before sending (server will also compute)
      const targets = computeTargets(weight_kg, height_cm, age, gender, activity_level, goal);

      mutation.mutate({
        userId,
        age,
        gender,
        height_cm,
        weight_kg,
        activity_level,
        goal,
        cuisine_preference: cuisine_preference as CuisineType | null,
        ...targets,
      } as Parameters<typeof mutation.mutate>[0]);
    },
    [fields, userId, mutation]
  );

  const isSubmitDisabled =
    mutation.isPending ||
    !allRequiredFilled(fields) ||
    hasErrors(validateFields(fields));

  // ── Loading skeleton while prefilling ──
  if (prefillLoading) {
    return <ProfileSkeleton />;
  }

  // ── Render ──
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* ── Live BMI display ── */}
      <BmiDisplay weight_kg={fields.weight_kg} height_cm={fields.height_cm} />

      {/* ── Age ── */}
      <div>
        <label htmlFor="pf-age" className={labelClass}>
          Age (years)
        </label>
        <input
          id="pf-age"
          type="number"
          min={1}
          max={120}
          inputMode="numeric"
          placeholder="e.g. 28"
          className={inputClass}
          value={fields.age}
          onChange={(e) => handleChange("age", e.target.value)}
          onBlur={() => handleBlur("age")}
          aria-describedby={errors.age ? "pf-age-error" : undefined}
          aria-invalid={Boolean(errors.age)}
        />
        {touched.age && <FieldError message={errors.age} />}
      </div>

      {/* ── Gender ── */}
      <div>
        <label htmlFor="pf-gender" className={labelClass}>
          Gender
        </label>
        <select
          id="pf-gender"
          className={inputClass}
          value={fields.gender}
          onChange={(e) => handleChange("gender", e.target.value)}
          onBlur={() => handleBlur("gender")}
          aria-describedby={errors.gender ? "pf-gender-error" : undefined}
          aria-invalid={Boolean(errors.gender)}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        {touched.gender && <FieldError message={errors.gender} />}
      </div>

      {/* ── Height ── */}
      <div>
        <label htmlFor="pf-height" className={labelClass}>
          Height (cm)
        </label>
        <input
          id="pf-height"
          type="number"
          min={50}
          max={300}
          inputMode="decimal"
          placeholder="e.g. 172"
          className={inputClass}
          value={fields.height_cm}
          onChange={(e) => handleChange("height_cm", e.target.value)}
          onBlur={() => handleBlur("height_cm")}
          aria-describedby={errors.height_cm ? "pf-height-error" : undefined}
          aria-invalid={Boolean(errors.height_cm)}
        />
        {touched.height_cm && <FieldError message={errors.height_cm} />}
      </div>

      {/* ── Weight ── */}
      <div>
        <label htmlFor="pf-weight" className={labelClass}>
          Weight (kg)
        </label>
        <input
          id="pf-weight"
          type="number"
          min={1}
          max={500}
          inputMode="decimal"
          placeholder="e.g. 70"
          className={inputClass}
          value={fields.weight_kg}
          onChange={(e) => handleChange("weight_kg", e.target.value)}
          onBlur={() => handleBlur("weight_kg")}
          aria-describedby={errors.weight_kg ? "pf-weight-error" : undefined}
          aria-invalid={Boolean(errors.weight_kg)}
        />
        {touched.weight_kg && <FieldError message={errors.weight_kg} />}
      </div>

      {/* ── Activity Level ── */}
      <div>
        <label htmlFor="pf-activity" className={labelClass}>
          Activity Level
        </label>
        <select
          id="pf-activity"
          className={inputClass}
          value={fields.activity_level}
          onChange={(e) => handleChange("activity_level", e.target.value)}
          onBlur={() => handleBlur("activity_level")}
          aria-describedby={errors.activity_level ? "pf-activity-error" : undefined}
          aria-invalid={Boolean(errors.activity_level)}
        >
          <option value="">Select activity level</option>
          {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        {touched.activity_level && <FieldError message={errors.activity_level} />}
      </div>

      {/* ── Goal ── */}
      <div>
        <label htmlFor="pf-goal" className={labelClass}>
          Goal
        </label>
        <select
          id="pf-goal"
          className={inputClass}
          value={fields.goal}
          onChange={(e) => handleChange("goal", e.target.value)}
          onBlur={() => handleBlur("goal")}
          aria-describedby={errors.goal ? "pf-goal-error" : undefined}
          aria-invalid={Boolean(errors.goal)}
        >
          <option value="">Select goal</option>
          {(Object.entries(GOAL_LABELS) as [Goal, string][]).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        {touched.goal && <FieldError message={errors.goal} />}
      </div>

      {/* ── Cuisine Preference ── */}
      <div>
        <label htmlFor="pf-cuisine" className={labelClass}>
          Cuisine Preference (Optional)
        </label>
        <select
          id="pf-cuisine"
          className={inputClass}
          value={fields.cuisine_preference}
          onChange={(e) => handleChange("cuisine_preference", e.target.value)}
          onBlur={() => handleBlur("cuisine_preference")}
          aria-describedby={errors.cuisine_preference ? "pf-cuisine-error" : undefined}
          aria-invalid={Boolean(errors.cuisine_preference)}
        >
          <option value="">No preference</option>
          {(Object.entries(CUISINE_LABELS) as [CuisineType, string][]).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        {touched.cuisine_preference && <FieldError message={errors.cuisine_preference} />}
      </div>

      {/* ── Mutation error ── */}
      {submitError && (
        <p
          role="alert"
          className="font-body text-[13px] text-[#EF4444] bg-red-50 border border-red-200 rounded-[10px] px-4 py-3"
        >
          {submitError}
        </p>
      )}

      {/* ── Submit button ── */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={mutation.isPending}
        disabled={isSubmitDisabled}
      >
        Save Profile
      </Button>
    </form>
  );
}
