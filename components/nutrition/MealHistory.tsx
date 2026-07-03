"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MealLogsSkeleton } from "@/components/nutrition/Skeletons";
import Button from "@/components/ui/Button";
import type { MealLogRow, MealType } from "@/lib/types/meal-log";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailySummaryResponse {
  mealLogs: MealLogRow[];
}

interface MealHistoryProps {
  userId: string;
  date: string;
  onLogMeal: (mealType: MealType) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEAL_SECTIONS: { key: MealType; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch",     label: "Lunch" },
  { key: "dinner",    label: "Dinner" },
  { key: "snack",     label: "Snack" },
];

// ---------------------------------------------------------------------------
// Data fetcher
// ---------------------------------------------------------------------------

async function fetchDailySummary(userId: string, date: string): Promise<DailySummaryResponse> {
  const params = new URLSearchParams({ userId, date });
  const res = await fetch(`/api/nutrition/daily-summary?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load meal history");
  }
  return res.json() as Promise<DailySummaryResponse>;
}

async function deleteMealLog(id: string, userId: string): Promise<void> {
  const res = await fetch("/api/nutrition/meal-log", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, userId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to delete meal entry");
  }
}

// ---------------------------------------------------------------------------
// Inline ErrorBanner
// ---------------------------------------------------------------------------

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-[12px] border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[#DC2626]"
    >
      <span className="font-body text-[13px]">⚠ {message}</span>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Retry →
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MealEntry row
// ---------------------------------------------------------------------------

function MealEntry({
  entry,
  onDelete,
  isDeleting,
}: {
  entry: MealLogRow;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const foodName = entry.food_name ?? entry.meal_name ?? "Unknown food";
  const calories = entry.calories ?? 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="font-body text-[14px] font-medium text-[var(--color-text-primary)] truncate">
          {foodName}
        </span>
        <span className="font-caption text-[12px] text-[var(--color-text-secondary)]">
          {calories} kcal
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        loading={isDeleting}
        onClick={() => onDelete(entry.id)}
        aria-label={`Delete ${foodName}`}
        className="shrink-0 text-[#EF4444] border-[#FCA5A5] hover:bg-[#FEF2F2]"
      >
        {!isDeleting && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        )}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MealSection
// ---------------------------------------------------------------------------

function MealSection({
  label,
  mealType,
  entries,
  onDelete,
  deletingId,
  onLogMeal,
}: {
  label: string;
  mealType: MealType;
  entries: MealLogRow[];
  onDelete: (id: string) => void;
  deletingId: string | null;
  onLogMeal: (mealType: MealType) => void;
}) {
  return (
    <section aria-labelledby={`meal-section-${label.toLowerCase()}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3
          id={`meal-section-${label.toLowerCase()}`}
          className="font-heading text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
        >
          {label}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLogMeal(mealType)}
          aria-label={`Log ${label}`}
          className="shrink-0"
        >
          + Log Meal
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="font-body text-[13px] text-[var(--color-text-secondary)] italic px-1">
          No meals logged today — tap + to add one
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <MealEntry
              key={entry.id}
              entry={entry}
              onDelete={onDelete}
              isDeleting={deletingId === entry.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// MealHistory
// ---------------------------------------------------------------------------

export default function MealHistory({ userId, date, onLogMeal }: MealHistoryProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["meal-logs", userId, date],
    queryFn: () => fetchDailySummary(userId, date),
    enabled: Boolean(userId) && Boolean(date),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteMealLog(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-logs", userId, date] });
    },
  });

  // Loading state
  if (isLoading) {
    return <MealLogsSkeleton />;
  }

  // Error state
  if (isError) {
    const message =
      error instanceof Error ? error.message : "Failed to load meal history";
    return <ErrorBanner message={message} onRetry={refetch} />;
  }

  const mealLogs = data?.mealLogs ?? [];

  // Group entries by meal_type
  const grouped: Record<MealType, MealLogRow[]> = {
    breakfast: [],
    lunch:     [],
    dinner:    [],
    snack:     [],
  };

  for (const entry of mealLogs) {
    const key = (entry.meal_type ?? "snack") as MealType;
    grouped[key].push(entry);
  }

  const deletingId = deleteMutation.isPending
    ? (deleteMutation.variables as { id: string } | undefined)?.id ?? null
    : null;

  return (
    <div className="flex flex-col gap-5">
      {MEAL_SECTIONS.map(({ key, label }) => (
        <MealSection
          key={key}
          label={label}
          mealType={key}
          entries={grouped[key]}
          onDelete={(id) => deleteMutation.mutate({ id })}
          deletingId={deletingId}
          onLogMeal={onLogMeal}
        />
      ))}
    </div>
  );
}
