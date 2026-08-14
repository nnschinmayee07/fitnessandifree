"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

import PageHeader from "@/components/layout/PageHeader";
import GlowCard from "@/components/ui/GlowCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import ManualWorkoutLogger from "@/components/workout/ManualWorkoutLogger";
import ProgressHistory from "@/components/workout/ProgressHistory";
import WeeklyWorkoutPlanner from "@/components/workout/WeeklyWorkoutPlanner";

import { useUserStore } from "@/lib/store/user";

// ---------------------------------------------------------------------------
// Inline helpers (mirrors nutrition/page.tsx pattern)
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
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's date as YYYY-MM-DD */
function today(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// DateNavigator — mirrors nutrition page DateNavigator exactly
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
        className="w-9 h-9 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] flex items-center justify-center hover:border-[#2563EB]/40 transition-colors"
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
// Tab configuration
// ---------------------------------------------------------------------------

type TabId = "log" | "history";

const TABS: { id: TabId; label: string }[] = [
  { id: "log", label: "Log Workout" },
  { id: "history", label: "History" },
];

// ---------------------------------------------------------------------------
// WorkoutDashboard — inner component (must be inside QueryClientProvider)
// ---------------------------------------------------------------------------

function WorkoutDashboard() {
  const userId = useUserStore((s) => s.email);
  const queryClient = useQueryClient();

  const [date, setDate] = useState<string>(today());
  const [activeTab, setActiveTab] = useState<TabId>("log");

  // ── Prefetch workout history so it's ready when user switches to History tab (Req 14.4)
  useEffect(() => {
    if (!userId) return;
    queryClient.prefetchQuery({
      queryKey: ["workout-history", userId],
      queryFn: () =>
        fetch(`/api/workout/history?userId=${encodeURIComponent(userId)}`)
          .then((r) => r.json()),
      staleTime: 30_000,
    });
  }, [userId, queryClient]);

  // ── Tab content ───────────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case "log":
        return (
          <div className="flex flex-col gap-4">
            {/* Manual Workout Logger */}
            <ScrollReveal direction="up" delay={0}>
              <ManualWorkoutLogger userId={userId ?? ""} date={date} />
            </ScrollReveal>

            {/* Weekly Workout Planner with Save/Regenerate */}
            <ScrollReveal direction="up" delay={0.1}>
              <GlowCard glowColor="37,99,235">
                <div className="p-4">
                  <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">
                    ANDI WORKOUT PLAN
                  </p>
                  <WeeklyWorkoutPlanner userId={userId ?? ""} />
                </div>
              </GlowCard>
            </ScrollReveal>
          </div>
        );

      case "history":
        return (
          <div className="flex flex-col gap-4">
            <ScrollReveal direction="up" delay={0}>
              <GlowCard glowColor="37,99,235">
                <div className="p-4">
                  <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">
                    WORKOUT HISTORY
                  </p>
                  <ProgressHistory userId={userId ?? ""} />
                </div>
              </GlowCard>
            </ScrollReveal>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col pb-24">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <PageHeader title="WORKOUT" subtitle={formatDate(date)} />

      {/* ── Date navigator ───────────────────────────────────────────────── */}
      <DateNavigator date={date} onDateChange={setDate} />

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "flex-1 py-2 px-3 font-body text-[13px] font-medium rounded-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]",
              activeTab === tab.id
                ? "bg-[#2563EB] text-white"
                : "text-[var(--color-text-2)] hover:bg-[var(--color-surface-2)]",
            ].join(" ")}
            aria-current={activeTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content with Framer Motion transition ─────────────────────── */}
      <div className="flex flex-col gap-4 px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkoutsPage — outer wrapper with stable QueryClient
// ---------------------------------------------------------------------------

export default function WorkoutsPage() {
  // useState ensures the QueryClient is only created once per mount,
  // not recreated on every render — same pattern as NutritionPage.
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
      <WorkoutDashboard />
    </QueryClientProvider>
  );
}
