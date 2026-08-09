"use client";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import GlowCard from "@/components/ui/GlowCard";
import { WEEKLY_CONSISTENCY } from "@/lib/data/workout-analytics";

const STAT_ITEMS = [
  { label: "Active Days",      value: "22", color: "#22C55E" },
  { label: "Rest Days",        value: "8",  color: "#F59E0B" },
  { label: "Weekly Freq.",     value: "3.7x", color: "#2563EB" },
  { label: "Best Streak",      value: "7d", color: "#A78BFA" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const target = WEEKLY_CONSISTENCY.find(w => w.week === label)?.target ?? 4;
  const hit = val >= target;
  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-xl">
      <p className="font-caption text-[9px] font-light text-[var(--color-text-3)]">{label}</p>
      <p className="font-metric text-[.9rem]" style={{ color: hit ? "#22C55E" : "#F59E0B" }}>
        {val}/{target} sessions
      </p>
    </div>
  );
}

export default function WorkoutConsistency() {
  const totalSessions = WEEKLY_CONSISTENCY.reduce((s, w) => s + w.workouts, 0);
  const totalTarget  = WEEKLY_CONSISTENCY.reduce((s, w) => s + w.target, 0);
  const adherence    = Math.round((totalSessions / totalTarget) * 100);

  return (
    <GlowCard glowColor="34,197,94">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">WORKOUT CONSISTENCY</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">{adherence}% adherence</span>
          </div>
        </div>

        {/* Mini stats row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {STAT_ITEMS.map(s => (
            <div key={s.label} className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5 text-center">
              <p className="font-metric text-[1rem]" style={{ color: s.color }}>{s.value}</p>
              <p className="font-caption text-[8px] font-light text-[var(--color-text-3)] mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={WEEKLY_CONSISTENCY} barCategoryGap="28%" margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 8, fill: "var(--color-text-3)", fontFamily: "ModernSans" }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-30}
                dy={6}
              />
              <YAxis hide domain={[0, 6]} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,.03)" }} />
              <ReferenceLine y={4} stroke="#22C55E" strokeDasharray="3 3" strokeOpacity={0.4} />
              <Bar dataKey="workouts" radius={[5, 5, 0, 0]}>
                {WEEKLY_CONSISTENCY.map((w, i) => (
                  <Cell
                    key={i}
                    fill={w.workouts >= w.target ? "#22C55E" : w.workouts >= w.target - 1 ? "#F59E0B" : "#EF4444"}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          {[
            { color: "#22C55E", label: "Target met" },
            { color: "#F59E0B", label: "1 short" },
            { color: "#EF4444", label: "Missed" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
              <span className="font-caption text-[8px] font-light text-[var(--color-text-3)]">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <svg width="16" height="6" viewBox="0 0 16 6" fill="none">
              <line x1="0" y1="3" x2="16" y2="3" stroke="#22C55E" strokeWidth="1.5" strokeDasharray="3 2" opacity=".5"/>
            </svg>
            <span className="font-caption text-[8px] font-light text-[var(--color-text-3)]">Goal</span>
          </div>
        </div>

        {/* Streak heatmap row (last 30 days) */}
        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
          <p className="font-caption text-[9px] font-light text-[var(--color-text-3)] uppercase tracking-wider mb-2">Last 30 Days</p>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 30 }).map((_, i) => {
              const states = [1,1,0,1,1,1,0,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1,1,1,1,0,1,1];
              const active = states[i];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.015, duration: 0.2 }}
                  className="w-[calc((100%-116px)/30)] min-w-[6px] h-[14px] rounded-[3px]"
                  style={{
                    background: active
                      ? i >= 23 ? "#22C55E" : "rgba(34,197,94,.4)"
                      : "var(--color-surface-2)",
                    border: "1px solid var(--color-border)",
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </GlowCard>
  );
}
