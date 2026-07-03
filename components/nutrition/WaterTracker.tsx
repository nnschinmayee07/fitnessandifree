"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { WaterSkeleton } from "@/components/nutrition/Skeletons";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import type { WaterLogRow } from "@/lib/types/water-log";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WaterTrackerProps {
  userId: string;
  date: string;         // YYYY-MM-DD
  targetWaterMl: number;
}

interface DailySummaryResponse {
  waterLogs: WaterLogRow[];
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchWaterLogs(userId: string, date: string): Promise<WaterLogRow[]> {
  const params = new URLSearchParams({ userId, date });
  const res = await fetch(`/api/nutrition/daily-summary?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch water logs");
  const json = (await res.json()) as DailySummaryResponse;
  return json.waterLogs ?? [];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WaterTracker({ userId, date, targetWaterMl }: WaterTrackerProps) {
  const queryClient = useQueryClient();

  const [customAmount, setCustomAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Query ────────────────────────────────────────────────────────────────
  const { data: waterLogs, isLoading, isError, refetch } = useQuery<WaterLogRow[]>({
    queryKey: ["water-logs", userId, date],
    queryFn: () => fetchWaterLogs(userId, date),
  });

  // ── Derived totals ───────────────────────────────────────────────────────
  const totalMl = (waterLogs ?? []).reduce((sum, row) => sum + row.amount_ml, 0);
  const progressPct = targetWaterMl > 0
    ? Math.min(100, Math.max(0, (totalMl / targetWaterMl) * 100))
    : 0;

  // ── Mutation ─────────────────────────────────────────────────────────────
  const mutation = useMutation<WaterLogRow, Error, number>({
    mutationFn: async (amount_ml: number) => {
      const res = await fetch("/api/nutrition/water-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount_ml, date }),
      });
      if (!res.ok) throw new Error("Failed to log water");
      return res.json() as Promise<WaterLogRow>;
    },
    onMutate: async (amount_ml: number) => {
      // Cancel any in-flight queries so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: ["water-logs", userId, date] });

      // Snapshot the previous value
      const previous = queryClient.getQueryData<WaterLogRow[]>(["water-logs", userId, date]);

      // Optimistically add the new entry
      queryClient.setQueryData<WaterLogRow[]>(
        ["water-logs", userId, date],
        (old) => [
          ...(old ?? []),
          {
            id: "optimistic",
            user_id: userId,
            amount_ml,
            date,
            logged_at: new Date().toISOString(),
          },
        ]
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Revert to the pre-mutation snapshot
      const ctx = context as { previous?: WaterLogRow[] } | undefined;
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData<WaterLogRow[]>(["water-logs", userId, date], ctx.previous);
      }
      setErrorMsg("Failed to log water");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["water-logs", userId, date] });
    },
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isPending = mutation.isPending;

  const handleQuickAdd = (ml: number) => {
    setErrorMsg(null);
    mutation.mutate(ml);
  };

  const parsedCustom = parseInt(customAmount, 10);
  const isCustomValid = Number.isInteger(parsedCustom) && parsedCustom > 0 && String(parsedCustom) === customAmount.trim();

  const handleCustomConfirm = () => {
    if (!isCustomValid) return;
    setErrorMsg(null);
    setCustomAmount("");
    mutation.mutate(parsedCustom);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoading) return <WaterSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          ⚠ Failed to load water data.{" "}
          <button
            className="underline text-[#2563EB]"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Progress info ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-sm font-bold text-[var(--color-text)]">
          {totalMl} ml
        </span>
        <span className="font-caption text-xs text-[var(--color-text-muted)]">
          / {targetWaterMl} ml
        </span>
      </div>

      <ProgressBar
        value={progressPct}
        color="#2563EB"
        height={8}
      />

      {/* ── Quick-add buttons ─────────────────────────────────────────── */}
      <div className="flex gap-2">
        {([250, 500, 750] as const).map((ml) => (
          <Button
            key={ml}
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => handleQuickAdd(ml)}
            className="flex-1"
          >
            +{ml} ml
          </Button>
        ))}
      </div>

      {/* ── Custom amount input ───────────────────────────────────────── */}
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          step={1}
          value={customAmount}
          onChange={(e) => {
            setErrorMsg(null);
            setCustomAmount(e.target.value);
          }}
          placeholder="Custom ml"
          className="flex-1 h-10 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-body text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          disabled={isPending}
        />
        <Button
          variant="primary"
          size="sm"
          disabled={!isCustomValid || isPending}
          onClick={handleCustomConfirm}
        >
          Add
        </Button>
      </div>

      {/* ── Inline error message ──────────────────────────────────────── */}
      {errorMsg && (
        <p role="alert" className="text-sm text-[#EF4444]">
          ⚠ {errorMsg}
        </p>
      )}
    </div>
  );
}
