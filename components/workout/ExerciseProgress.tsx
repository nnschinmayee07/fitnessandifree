"use client";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import GlowCard from "@/components/ui/GlowCard";
import { EXERCISE_PROGRESS, ExerciseProgress as EP } from "@/lib/data/workout-analytics";

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ v }));
  return (
    <ResponsiveContainer width="100%" height={44}>
      <LineChart data={pts} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[9px] font-metric" style={{ color }}>
                {payload[0].value}
              </div>
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ExerciseCard({ ex, index }: { ex: EP; index: number }) {
  const improvement = (((ex.currentBest - ex.previousBest) / ex.previousBest) * 100).toFixed(0);
  const rgb = hexToRgb(ex.color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 group"
      whileHover={{ y: -2, boxShadow: `0 8px 24px rgba(${rgb},.12)` }}
    >
      {/* Glow accent */}
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.06] translate-x-4 -translate-y-4 pointer-events-none"
        style={{ background: ex.color }}
      />

      {/* Exercise name */}
      <p className="font-heading text-[.8rem] text-[var(--color-text-1)] tracking-wide">{ex.name}</p>

      {/* Best value */}
      <div className="flex items-end gap-2 mt-1.5 mb-2">
        <p className="font-metric text-[1.5rem] leading-none" style={{ color: ex.color }}>
          {ex.currentBest}
          <span className="text-[.875rem] ml-0.5">{ex.unit}</span>
        </p>
        <div className="flex items-center gap-1 mb-0.5">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 8V2M2 5l3-3 3 3" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-caption text-[9px] font-light text-[#22C55E]">+{improvement}%</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="-mx-1">
        <Sparkline data={ex.sparkline} color={ex.color} />
      </div>

      {/* Previous best */}
      <div className="mt-1 flex items-center justify-between">
        <span className="font-caption text-[8px] font-light text-[var(--color-text-3)]">
          Prev best: {ex.previousBest}{ex.unit}
        </span>
        <span
          className="font-caption text-[8px] font-light px-1.5 py-0.5 rounded-full"
          style={{ color: ex.color, background: `rgba(${rgb},.1)` }}
        >
          +{ex.currentBest - ex.previousBest}{ex.unit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: ex.color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (ex.currentBest / (ex.currentBest * 1.15)) * 100)}%` }}
          transition={{ delay: index * 0.08 + 0.4, duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

export default function ExerciseProgress() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">EXERCISE PROGRESS</p>
        <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">Personal bests</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {EXERCISE_PROGRESS.map((ex, i) => (
          <ExerciseCard key={ex.name} ex={ex} index={i} />
        ))}
      </div>
    </div>
  );
}
