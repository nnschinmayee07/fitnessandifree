"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import GlowCard from "@/components/ui/GlowCard";
import { TRAINING_DIST } from "@/lib/data/workout-analytics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-xl">
      <p className="font-heading text-[.8rem] tracking-wide" style={{ color: d.color }}>{d.label}</p>
      <p className="font-caption text-[9px] font-light text-[var(--color-text-3)]">
        {d.pct}% · {d.sessions} session{d.sessions !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

const TYPE_ICONS: Record<string, (c: string) => React.ReactNode> = {
  Strength: (c) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="2.5" cy="7" r="1.5" stroke={c} strokeWidth="1.25"/>
      <circle cx="11.5" cy="7" r="1.5" stroke={c} strokeWidth="1.25"/>
      <rect x="4" y="5.5" width="6" height="3" rx="1.5" fill={c}/>
    </svg>
  ),
  HIIT: (c) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 10l2.5-6 3 5 2.5-7 2.5 8" stroke={c} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Cardio: (c) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4" cy="10" r="2.5" stroke={c} strokeWidth="1.25"/>
      <circle cx="10" cy="10" r="2.5" stroke={c} strokeWidth="1.25"/>
      <path d="M4 10l2.5-4 2.5 1 2-3" stroke={c} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Mobility: (c) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="3.5" r="1.5" stroke={c} strokeWidth="1.25"/>
      <path d="M7 5v5M4.5 7l-2 3M9.5 7l2 3M4.5 12h5" stroke={c} strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
  Recovery: (c) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2C5.5 4 3.5 5 3.5 7.5A3.5 3.5 0 007 11a3.5 3.5 0 003.5-3.5C10.5 5 8.5 4 7 2z" stroke={c} strokeWidth="1.25" strokeLinejoin="round"/>
    </svg>
  ),
};

export default function TrainingDistribution() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex !== null ? TRAINING_DIST[activeIndex] : null;

  return (
    <GlowCard glowColor="37,99,235">
      <div className="p-4">
        <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-4">TRAINING DISTRIBUTION</p>

        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={TRAINING_DIST}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={64}
                  paddingAngle={3}
                  dataKey="pct"
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  strokeWidth={0}
                >
                  {TRAINING_DIST.map((d, i) => (
                    <Cell
                      key={d.label}
                      fill={d.color}
                      opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
                      style={{ cursor: "pointer", transition: "opacity .2s" }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <AnimatePresence mode="wait">
                {active ? (
                  <motion.div
                    key={active.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="text-center"
                  >
                    <p className="font-metric text-[1.25rem]" style={{ color: active.color }}>{active.pct}%</p>
                    <p className="font-caption text-[8px] font-light text-[var(--color-text-3)] leading-tight max-w-[56px] text-center">{active.label}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="total"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <p className="font-metric text-[1.25rem] text-[var(--color-text-1)]">
                      {TRAINING_DIST.reduce((s, d) => s + d.sessions, 0)}
                    </p>
                    <p className="font-caption text-[8px] font-light text-[var(--color-text-3)]">sessions</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 flex flex-col gap-2">
            {TRAINING_DIST.map((d, i) => (
              <motion.div
                key={d.label}
                className="flex items-center gap-2 cursor-pointer"
                onHoverStart={() => setActiveIndex(i)}
                onHoverEnd={() => setActiveIndex(null)}
                animate={{ opacity: activeIndex === null || activeIndex === i ? 1 : 0.4 }}
                transition={{ duration: 0.15 }}
              >
                <div
                  className="w-6 h-6 rounded-[7px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `rgba(${hexToRgb(d.color)},.15)` }}
                >
                  {TYPE_ICONS[d.label]?.(d.color)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-body text-[11px] text-[var(--color-text-1)]">{d.label}</span>
                    <span className="font-metric text-[11px]" style={{ color: d.color }}>{d.pct}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: d.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${d.pct}%` }}
                      transition={{ delay: i * 0.1 + 0.3, duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </GlowCard>
  );
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
