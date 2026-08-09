"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import GlowCard from "@/components/ui/GlowCard";
import Chip from "@/components/ui/Chip";
import { RECENT_WORKOUTS, RecentWorkout } from "@/lib/data/workout-analytics";

const TYPE_COLORS: Record<RecentWorkout["type"], { color: string; rgb: string }> = {
  strength:  { color: "#2563EB", rgb: "37,99,235"  },
  cardio:    { color: "#22C55E", rgb: "34,197,94"  },
  hiit:      { color: "#EF4444", rgb: "239,68,68"  },
  mobility:  { color: "#A78BFA", rgb: "167,139,250"},
  recovery:  { color: "#F59E0B", rgb: "245,158,11" },
};

const TYPE_ICONS: Record<RecentWorkout["type"], () => React.ReactNode> = {
  strength: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="2.5" cy="7" r="1.75" stroke="currentColor" strokeWidth="1.25"/>
      <circle cx="11.5" cy="7" r="1.75" stroke="currentColor" strokeWidth="1.25"/>
      <rect x="4.25" y="5.5" width="5.5" height="3" rx="1.5" fill="currentColor"/>
      <rect x="6.5" y="3.5" width="1" height="7" rx=".5" fill="currentColor" opacity=".5"/>
    </svg>
  ),
  hiit: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 8.5l2.5-5 2.5 4 2-5.5 2 4.5 1.5-3.5 1 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cardio: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 11.5C5 10 1.5 7.5 1.5 5A2.75 2.75 0 017 3.5 2.75 2.75 0 0112.5 5c0 2.5-3.5 5-5.5 6.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  ),
  mobility: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M7 5v5M4.5 7l-2.5 3.5M9.5 7l2.5 3.5M4 12.5h6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  recovery: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2C5 4.5 3 6 3 8.5A4 4 0 007 13a4 4 0 004-4.5C11 6 9 4.5 7 2z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  ),
};

function WorkoutCard({ w, index }: { w: RecentWorkout; index: number }) {
  const tc = TYPE_COLORS[w.type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ x: 3 }}
      className="flex items-start gap-3 p-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-all duration-200"
    >
      {/* Type icon */}
      <div
        className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0"
        style={{ background: `rgba(${tc.rgb},.12)`, color: tc.color }}
      >
        {TYPE_ICONS[w.type]()}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide truncate">{w.name}</p>
          <span className="font-caption text-[9px] font-light text-[var(--color-text-3)] whitespace-nowrap flex-shrink-0">{w.date}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5.5" r="3.5" stroke="var(--color-text-3)" strokeWidth="1"/>
              <path d="M5 3.5V5.5l1.5 1" stroke="var(--color-text-3)" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">{w.duration} min</span>
          </div>
          {w.calories > 0 && (
            <div className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1C4 2.5 2.5 3.5 2.5 5A2.5 2.5 0 005 7.5 2.5 2.5 0 007.5 5C7.5 3.5 6 2.5 5 1z" stroke="var(--color-text-3)" strokeWidth="1" strokeLinejoin="round"/>
              </svg>
              <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">{w.calories} kcal</span>
            </div>
          )}
          {w.volume > 0 && (
            <div className="flex items-center gap-1">
              <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">{(w.volume / 1000).toFixed(1)}k kg</span>
            </div>
          )}
        </div>

        {/* Muscle chips */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {w.muscles.map(m => (
            <span
              key={m}
              className="font-caption text-[8px] font-light px-2 py-0.5 rounded-full border"
              style={{
                color: tc.color,
                background: `rgba(${tc.rgb},.08)`,
                borderColor: `rgba(${tc.rgb},.2)`,
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Completion indicator */}
      <div className="flex-shrink-0 mt-0.5">
        {w.completed ? (
          <div className="w-5 h-5 rounded-full bg-[rgba(34,197,94,.12)] flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5.5l2 2 4-4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border border-[var(--color-border)]" />
        )}
      </div>
    </motion.div>
  );
}

export default function RecentWorkouts() {
  return (
    <GlowCard glowColor="37,99,235">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">RECENT WORKOUTS</p>
          <Link
            href="/workouts/programs"
            className="font-caption text-[9px] font-light text-[var(--color-primary)] uppercase tracking-wider"
          >
            See all
          </Link>
        </div>

        {/* Summary chips */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <Chip variant="success" className="text-[9px] flex-shrink-0">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {RECENT_WORKOUTS.filter(w => w.completed).length} Completed
          </Chip>
          <Chip variant="primary" className="text-[9px] flex-shrink-0">
            {RECENT_WORKOUTS.reduce((s, w) => s + w.duration, 0)} min total
          </Chip>
          <Chip variant="neutral" className="text-[9px] flex-shrink-0">
            {(RECENT_WORKOUTS.reduce((s, w) => s + w.calories, 0) / 1000).toFixed(1)}k kcal
          </Chip>
        </div>

        {/* Workout cards */}
        <div className="flex flex-col gap-2">
          {RECENT_WORKOUTS.map((w, i) => (
            <WorkoutCard key={w.name + w.date} w={w} index={i} />
          ))}
        </div>

        {/* Start new workout CTA */}
        <Link
          href="/workouts/session"
          className="mt-4 flex items-center justify-center gap-2 h-11 w-full rounded-[12px] font-body font-bold text-[13px] text-white transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
            boxShadow: "0 4px 20px rgba(37,99,235,.3)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M3 1l9 5.5L3 12V1z" fill="white"/>
          </svg>
          Start New Workout
        </Link>
      </div>
    </GlowCard>
  );
}
