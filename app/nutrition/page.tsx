"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";

import PageHeader from "@/components/layout/PageHeader";
import GlowCard from "@/components/ui/GlowCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import DonutRing from "@/components/ui/DonutRing";
import CountUp from "@/components/ui/CountUp";
import ClickSpark from "@/components/ui/ClickSpark";

import DailyProgress from "@/components/nutrition/DailyProgress";
import MealHistory from "@/components/nutrition/MealHistory";
import WaterTracker from "@/components/nutrition/WaterTracker";
import MealPlan from "@/components/nutrition/MealPlan";
import DailySummary from "@/components/nutrition/DailySummary";
import MealLoggingModal from "@/components/nutrition/MealLoggingModal";
import {
  MealLogsSkeleton,
  WaterSkeleton,
  MealPlanSkeleton,
  DailySummarySkeleton,
} from "@/components/nutrition/Skeletons";

import { useUserStore } from "@/lib/store/user";
import { computeTargets } from "@/lib/nutrition/targets";
import type { NutritionProfileRow } from "@/lib/types/nutrition-profile";
import type { MealLogRow, MealType } from "@/lib/types/meal-log";
import type { WaterLogRow } from "@/lib/types/water-log";

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

// ---------------------------------------------------------------------------
// Inline helpers
// ---------------------------------------------------------------------------

/** Formats a YYYY-MM-DD string to a human-readable label, e.g. "Mon, Jun 3" */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Returns a YYYY-MM-DD string offset by `days` from `iso`. */
function offsetDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().split("T")[0];
}

/** Today's date as YYYY-MM-DD */
function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// ErrorBanner — reusable inline error with Retry
// ---------------------------------------------------------------------------

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-[12px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3"
    >
      <span className="font-body text-[13px] text-[#DC2626]">⚠ {message}</span>
      <button
        onClick={onRetry}
        className="font-body text-[13px] text-[#2563EB] underline underline-offset-2 hover:opacity-80 transition-opacity shrink-0"
      >
        Retry →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DateNavigator — prev / next day inline control
// ---------------------------------------------------------------------------

function DateNavigator({
  date,
  onDateChange,
}: {
  date: string;
  onDateChange: (d: string) => void;
}) {
  const isToday = date === today();

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <button
        onClick={() => onDateChange(offsetDate(date, -1))}
        className="w-9 h-9 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-center hover:border-[#2563EB]/40 transition-colors"
        aria-label="Previous day"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M9 3L5 7l4 4"
            stroke="var(--color-text-2)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="flex flex-col items-center gap-0.5">
        <span className="font-body font-bold text-[13px] text-[var(--color-text-1)]">
          {formatDate(date)}
        </span>
        {isToday && (
          <span className="font-caption text-[9px] font-light text-[#2563EB] bg-[#EEF4FF] border border-[#BFDBFE] px-2 py-0.5 rounded-full">
            Today
          </span>
        )}
      </div>

      <button
        onClick={() => onDateChange(offsetDate(date, +1))}
        disabled={isToday}
        className="w-9 h-9 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-center hover:border-[#2563EB]/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Next day"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M5 3l4 4-4 4"
            stroke="var(--color-text-2)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NutritionDashboard — inner component (must be inside QueryClientProvider)
// ---------------------------------------------------------------------------

function NutritionDashboard() {
  const userId        = useUserStore((s) => s.email);
  const weightKg      = useUserStore((s) => s.weightKg);
  const heightCm      = useUserStore((s) => s.heightCm);
  const userAge       = useUserStore((s) => s.age);
  const userGender    = useUserStore((s) => s.gender);
  const userGoal      = useUserStore((s) => s.goal);
  const activityLevel = useUserStore((s) => s.activityLevel);

  // Compute personalised targets from Zustand profile data
  const computedTargets = (() => {
    if (!weightKg || !heightCm || !userAge) return null;

    const genderMapped: 'male' | 'female' | 'other' =
      userGender.toLowerCase() === 'male' ? 'male' :
      userGender.toLowerCase() === 'female' ? 'female' : 'other';

    const goalMapped: 'lose' | 'maintain' | 'gain' =
      userGoal.toLowerCase().includes('loss') || userGoal.toLowerCase().includes('lose') ? 'lose' :
      userGoal.toLowerCase().includes('gain') || userGoal.toLowerCase().includes('muscle') ? 'gain' :
      'maintain';

    const validActivity = ['sedentary','lightly_active','moderately_active','very_active','extra_active'];
    const activityMapped = validActivity.includes(activityLevel)
      ? activityLevel as 'sedentary'|'lightly_active'|'moderately_active'|'very_active'|'extra_active'
      : 'moderately_active';

    return computeTargets(weightKg, heightCm, userAge, genderMapped, activityMapped, goalMapped);
  })();
  const [date, setDate] = useState<string>(today());
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleLogMeal = (mealType: MealType) => {
    setSelectedMealType(mealType);
    setShowMealModal(true);
  };

  // Real-time Supabase subscriptions for meal_logs and water_logs (Requirements 6.1–6.7)
  useEffect(() => {
    if (!userId || !date) return;

    const supabase = createClient();

    // Meal logs channel — listens for INSERT, UPDATE, DELETE
    const mealChannel = supabase
      .channel(`meal_logs:${userId}:${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meal_logs",
          filter: `user_id=eq.${userId},date=eq.${date}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["meal-logs", userId, date] });
        }
      )
      .subscribe();

    // Water logs channel — listens for INSERT, DELETE
    const waterChannel = supabase
      .channel(`water_logs:${userId}:${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "water_logs",
          filter: `user_id=eq.${userId},date=eq.${date}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["water-logs", userId, date] });
        }
      )
      .subscribe();

    // Cleanup: remove channels on unmount or when userId/date changes
    return () => {
      supabase.removeChannel(mealChannel);
      supabase.removeChannel(waterChannel);
    };
  }, [userId, date, queryClient]);

  // Central daily-summary query — provides profile + totals for the whole page
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DailySummaryResponse, Error>({
    queryKey: ["nutrition-profile", userId, date],
    queryFn: () =>
      fetch(
        `/api/nutrition/daily-summary?userId=${encodeURIComponent(userId ?? "")}&date=${encodeURIComponent(date)}`
      ).then((r) => {
        if (!r.ok) throw new Error(`Failed to load nutrition data: ${r.status}`);
        return r.json() as Promise<DailySummaryResponse>;
      }),
    enabled: Boolean(userId),
  });

  const profile = data?.profile ?? null;
  const totals = data?.totals ?? {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    water_ml: 0,
  };

  const targetCalories = computedTargets?.target_calories ?? profile?.target_calories ?? 2000;
  const targetProtein  = computedTargets?.target_protein_g ?? profile?.target_protein_g ?? 150;
  const targetCarbs    = computedTargets?.target_carbs_g ?? profile?.target_carbs_g ?? 225;
  const targetFat      = computedTargets?.target_fat_g ?? profile?.target_fat_g ?? 55;
  const targetWaterMl  = computedTargets?.target_water_ml ?? profile?.target_water_ml ?? 2500;

  // Remaining macros for MealPlan
  const remainingMacros = {
    calories: Math.max(0, targetCalories - totals.calories),
    protein_g: Math.max(0, targetProtein - totals.protein_g),
    carbs_g: Math.max(0, targetCarbs - totals.carbs_g),
    fat_g: Math.max(0, targetFat - totals.fat_g),
  };

  const caloriePercent = targetCalories > 0
    ? Math.min(100, (totals.calories / targetCalories) * 100)
    : 0;

  return (
    <div className="flex flex-col pb-24">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <PageHeader
        title="NUTRITION"
        subtitle={formatDate(date)}
        action={
          <ClickSpark color="#2563EB">
            <button
              onClick={() => handleLogMeal('snack')}
              className="w-8 h-8 rounded-[8px] bg-[#2563EB] flex items-center justify-center hover:opacity-90 transition-opacity"
              aria-label="Log meal"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="white"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </ClickSpark>
        }
      />

      {/* ── Date navigator ──────────────────────────────────────────────── */}
      <DateNavigator date={date} onDateChange={setDate} />

      <div className="flex flex-col gap-4 px-4 py-4">

        {/* ── Top-level error banner ──────────────────────────────────── */}
        {isError && (
          <ErrorBanner
            message={error?.message ?? "Failed to load nutrition data"}
            onRetry={() => refetch()}
          />
        )}

        {/* ── Calorie ring + overview ─────────────────────────────────── */}
        <ScrollReveal direction="up">
          <GlowCard glowColor="37,99,235">
            <div className="p-4 flex items-center gap-5">
              {isLoading ? (
                <>
                  <div className="w-24 h-24 rounded-full animate-pulse bg-[var(--color-surface-3)]" />
                  <div className="flex-1 flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 rounded-full animate-pulse bg-[var(--color-surface-3)]" />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <DonutRing value={caloriePercent} size={96} stroke={10} color="#2563EB">
                    <CountUp
                      to={Math.round(totals.calories)}
                      duration={1.2}
                      className="font-metric text-[1.25rem] text-[var(--color-text-1)]"
                    />
                    <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">
                      kcal
                    </span>
                  </DonutRing>
                  <div className="flex-1">
                    {(
                      [
                        ["GOAL", `${Math.round(targetCalories)}`, "var(--color-text-1)"],
                        ["REMAINING", `${Math.round(remainingMacros.calories)}`, "#22C55E"],
                        ["DATE", formatDate(date), "var(--color-text-3)"],
                      ] as const
                    ).map(([l, v, c]) => (
                      <div key={l} className="flex justify-between mb-1.5">
                        <span className="font-caption text-[10px] font-light text-[var(--color-text-3)]">
                          {l}
                        </span>
                        <span
                          className="font-metric text-[13px]"
                          style={{ color: c as string }}
                        >
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── Daily Progress ──────────────────────────────────────────── */}
        <ScrollReveal delay={0.04}>
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">
                DAILY PROGRESS
              </p>
              {isLoading ? (
                <MealLogsSkeleton />
              ) : isError ? (
                <ErrorBanner
                  message="Failed to load progress"
                  onRetry={() => refetch()}
                />
              ) : (
                <DailyProgress
                  userId={userId ?? ""}
                  date={date}
                  profile={profile}
                  targetCalories={targetCalories}
                  targetProtein={targetProtein}
                  targetCarbs={targetCarbs}
                  targetFat={targetFat}
                  targetWater={targetWaterMl}
                />
              )}
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── Meal History ────────────────────────────────────────────── */}
        <ScrollReveal delay={0.06}>
          <GlowCard glowColor="34,197,94">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">
                  MEALS
                </p>
              </div>
              {isLoading ? (
                <MealLogsSkeleton />
              ) : isError ? (
                <ErrorBanner
                  message="Failed to load meal history"
                  onRetry={() => refetch()}
                />
              ) : (
                <MealHistory userId={userId ?? ""} date={date} onLogMeal={handleLogMeal} />
              )}
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── Water Tracker ───────────────────────────────────────────── */}
        <ScrollReveal delay={0.1}>
          <GlowCard glowColor="96,165,250">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">
                  WATER
                </p>
                <span className="font-caption text-[10px] font-light text-[#60A5FA] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-full">
                  Target: {targetWaterMl} ml
                </span>
              </div>
              {isLoading ? (
                <WaterSkeleton />
              ) : isError ? (
                <ErrorBanner
                  message="Failed to load water data"
                  onRetry={() => refetch()}
                />
              ) : (
                <WaterTracker
                  userId={userId ?? ""}
                  date={date}
                  targetWaterMl={targetWaterMl}
                />
              )}
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── Meal Plan ───────────────────────────────────────────────── */}
        <ScrollReveal delay={0.12}>
          <GlowCard glowColor="245,158,11">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">
                  ANDI MEAL PLAN
                </p>
                <span className="font-caption text-[9px] font-light text-[#F59E0B] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                  AI-powered
                </span>
              </div>
              {isLoading ? (
                <MealPlanSkeleton />
              ) : (
                <MealPlan
                  userId={userId ?? ""}
                  date={date}
                  remainingMacros={remainingMacros}
                  profile={profile}
                />
              )}
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── Daily Summary ───────────────────────────────────────────── */}
        <ScrollReveal delay={0.14}>
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">
                DAILY SUMMARY
              </p>
              {isLoading ? (
                <DailySummarySkeleton />
              ) : isError ? (
                <ErrorBanner
                  message="Failed to load daily summary"
                  onRetry={() => refetch()}
                />
              ) : (
                <DailySummary
                  totals={{
                    calories: totals.calories,
                    protein_g: totals.protein_g,
                    carbs_g: totals.carbs_g,
                    fat_g: totals.fat_g,
                  }}
                  profile={profile}
                  date={date}
                  targetCalories={targetCalories}
                  targetProtein={targetProtein}
                />
              )}
            </div>
          </GlowCard>
        </ScrollReveal>
      </div>

      {/* ── MealLoggingModal ─────────────────────────────────────── */}
      <MealLoggingModal
        isOpen={showMealModal}
        mealType={selectedMealType ?? 'snack'}
        userId={userId ?? ''}
        date={date}
        onClose={() => setShowMealModal(false)}
        onSuccess={(mealType) => {
          setShowMealModal(false);
          const label = mealType.charAt(0).toUpperCase() + mealType.slice(1);
          setToastMessage(`${label} logged ✓`);
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />

      {/* ── Toast notification ───────────────────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-[14px] bg-[#1E293B] text-white font-body font-bold text-[14px] shadow-[0_8px_32px_rgba(0,0,0,.3)]"
            role="status"
            aria-live="polite"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NutritionPage — outer wrapper that provides a stable QueryClient
// ---------------------------------------------------------------------------

export default function NutritionPage() {
  // useState ensures the QueryClient is only created once per mount,
  // not recreated on every render.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NutritionDashboard />
    </QueryClientProvider>
  );
}
