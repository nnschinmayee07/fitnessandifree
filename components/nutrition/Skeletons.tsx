"use client";

// ---------------------------------------------------------------------------
// MealLogsSkeleton — 3 rows matching meal log entries
// ---------------------------------------------------------------------------
export function MealLogsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading meal logs">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center justify-between gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4"
        >
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-3.5 w-2/3 rounded-full bg-[var(--color-surface-3)]" />
            <div className="h-2.5 w-1/3 rounded-full bg-[var(--color-surface-3)]" />
          </div>
          <div className="h-8 w-8 rounded-full bg-[var(--color-surface-3)]" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WaterSkeleton — progress bar + 3 button placeholders
// ---------------------------------------------------------------------------
export function WaterSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4" aria-busy="true" aria-label="Loading water tracker">
      {/* Progress bar */}
      <div className="h-4 w-full rounded-full bg-[var(--color-surface-3)]" />
      {/* Three quick-add buttons */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-10 flex-1 rounded-[10px] bg-[var(--color-surface-3)]"
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfileSkeleton — form-shaped boxes (6 field placeholders)
// ---------------------------------------------------------------------------
export function ProfileSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4" aria-busy="true" aria-label="Loading profile form">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="h-3 w-1/4 rounded-full bg-[var(--color-surface-3)]" />
          <div className="h-10 w-full rounded-[10px] bg-[var(--color-surface-3)]" />
        </div>
      ))}
      <div className="h-12 w-full rounded-[10px] bg-[var(--color-surface-3)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MealPlanSkeleton — 1 full-width card placeholder
// ---------------------------------------------------------------------------
export function MealPlanSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-3" aria-busy="true" aria-label="Loading meal plan">
      <div className="h-40 w-full rounded-[14px] bg-[var(--color-surface-3)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DailySummarySkeleton — calorie row + protein row + insight text line
// ---------------------------------------------------------------------------
export function DailySummarySkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-3" aria-busy="true" aria-label="Loading daily summary">
      {/* Calorie row */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-4 w-1/3 rounded-full bg-[var(--color-surface-3)]" />
        <div className="h-6 w-1/4 rounded-full bg-[var(--color-surface-3)]" />
      </div>
      {/* Protein row */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-4 w-1/4 rounded-full bg-[var(--color-surface-3)]" />
        <div className="h-4 w-1/5 rounded-full bg-[var(--color-surface-3)]" />
      </div>
      {/* Insight text */}
      <div className="h-3.5 w-3/4 rounded-full bg-[var(--color-surface-3)]" />
    </div>
  );
}
