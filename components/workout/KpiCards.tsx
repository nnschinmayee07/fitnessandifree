"use client";
import { motion } from "framer-motion";
import CountUp from "@/components/ui/CountUp";
import { KpiStat } from "@/lib/data/workout-analytics";

const ICONS: Record<string, (color: string) => React.ReactNode> = {
  "Total Workouts": (c) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="8" width="3" height="7" rx="1" fill={c} opacity=".9"/>
      <rect x="7.5" y="5" width="3" height="10" rx="1" fill={c}/>
      <rect x="13" y="2" width="3" height="13" rx="1" fill={c} opacity=".7"/>
    </svg>
  ),
  "Volume Lifted": (c) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="3.5" cy="9" r="2" stroke={c} strokeWidth="1.5"/>
      <circle cx="14.5" cy="9" r="2" stroke={c} strokeWidth="1.5"/>
      <rect x="5.5" y="7.5" width="7" height="3" rx="1.5" fill={c}/>
      <rect x="8.5" y="4" width="1" height="10" rx=".5" fill={c} opacity=".6"/>
    </svg>
  ),
  "Total Duration": (c) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="10" r="6" stroke={c} strokeWidth="1.5"/>
      <path d="M9 7v3.5l2.5 1.5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 2h4" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  "Current Streak": (c) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2C7 5 5 6.5 5 9.5A4 4 0 009 14a4 4 0 004-4.5C13 7 11 5.5 9 2z" fill={c} opacity=".25"/>
      <path d="M9 2C7 5 5 6.5 5 9.5A4 4 0 009 14a4 4 0 004-4.5C13 7 11 5.5 9 2z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7.5 11c.5-1 1.5-1.5 2.5-1" stroke={c} strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  ),
};

interface Props {
  stats: KpiStat[];
}

export default function KpiCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, i) => {
        const numericVal = parseFloat(stat.value.replace(/[^\d.]/g, ""));
        const hasNum = !isNaN(numericVal) && stat.value === String(Math.round(numericVal));
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 group"
            style={{ boxShadow: `0 2px 16px rgba(${stat.rgb},.06)` }}
            whileHover={{ y: -2, boxShadow: `0 8px 28px rgba(${stat.rgb},.14)` }}
          >
            {/* Background accent */}
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.07] translate-x-6 -translate-y-6 pointer-events-none"
              style={{ background: stat.color }}
            />

            {/* Icon */}
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center mb-3"
              style={{ background: `rgba(${stat.rgb},.12)` }}
            >
              {ICONS[stat.label]?.(stat.color)}
            </div>

            {/* Value */}
            <p className="font-metric text-[1.625rem] leading-none" style={{ color: stat.color }}>
              {hasNum ? <CountUp to={numericVal} duration={1.2} /> : stat.value}
            </p>

            {/* Label */}
            <p className="font-caption text-[9px] font-light text-[var(--color-text-3)] uppercase tracking-wider mt-1">
              {stat.label}
            </p>

            {/* Sub */}
            <p className="font-body text-[10px] text-[var(--color-text-3)] mt-0.5">{stat.sub}</p>

            {/* Delta */}
            <div className="mt-2 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d={stat.deltaPositive ? "M5 8V2M2 5l3-3 3 3" : "M5 2v6M2 5l3 3 3-3"}
                  stroke={stat.deltaPositive ? "#22C55E" : "#EF4444"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                className="font-caption text-[9px] font-light"
                style={{ color: stat.deltaPositive ? "#22C55E" : "#EF4444" }}
              >
                {stat.delta}
              </span>
            </div>

            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 h-[2px] w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)` }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
