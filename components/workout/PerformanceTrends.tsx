"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import GlowCard from "@/components/ui/GlowCard";
import { TREND_DATA, TrendPoint } from "@/lib/data/workout-analytics";

type Metric = "volume" | "weight" | "reps" | "duration";
type Range = "7D" | "30D" | "3M";

const METRICS: { key: Metric; label: string; unit: string; color: string; rgb: string }[] = [
  { key: "volume",   label: "Volume",   unit: "kg",  color: "#2563EB", rgb: "37,99,235"  },
  { key: "weight",   label: "Weight",   unit: "kg",  color: "#A78BFA", rgb: "167,139,250"},
  { key: "reps",     label: "Reps",     unit: "",    color: "#22C55E", rgb: "34,197,94"  },
  { key: "duration", label: "Duration", unit: "min", color: "#F59E0B", rgb: "245,158,11" },
];

const RANGES: Range[] = ["7D", "30D", "3M"];

const METRIC_LABELS: Record<Metric, string> = {
  volume: "Total Volume (kg)",
  weight: "Max Weight (kg)",
  reps: "Total Reps",
  duration: "Session Duration (min)",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, metric }: any) {
  if (!active || !payload?.length) return null;
  const m = METRICS.find(m => m.key === metric)!;
  return (
    <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 shadow-xl">
      <p className="font-caption text-[9px] font-light text-[var(--color-text-3)] uppercase tracking-wider mb-1">{label}</p>
      <p className="font-metric text-[1rem]" style={{ color: m.color }}>
        {payload[0].value?.toLocaleString()}{m.unit}
      </p>
    </div>
  );
}

export default function PerformanceTrends() {
  const [metric, setMetric] = useState<Metric>("volume");
  const [range, setRange] = useState<Range>("30D");

  const m = METRICS.find(m => m.key === metric)!;
  const data: TrendPoint[] = TREND_DATA[range] ?? TREND_DATA["30D"];

  // Compute delta
  const first = data[0]?.[metric] ?? 0;
  const last = data[data.length - 1]?.[metric] ?? 0;
  const delta = first > 0 ? (((last - first) / first) * 100).toFixed(1) : "0.0";
  const positive = last >= first;

  return (
    <GlowCard glowColor={m.rgb}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">PERFORMANCE TRENDS</p>
            <p className="font-caption text-[9px] font-light text-[var(--color-text-3)] mt-0.5">{METRIC_LABELS[metric]}</p>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="font-caption text-[10px] font-light px-2 py-0.5 rounded-full"
              style={{
                color: positive ? "#22C55E" : "#EF4444",
                background: positive ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)",
              }}
            >
              {positive ? "+" : ""}{delta}%
            </span>
          </div>
        </div>

        {/* Metric tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {METRICS.map(tab => (
            <motion.button
              key={tab.key}
              onClick={() => setMetric(tab.key)}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 px-3 py-1.5 rounded-full font-caption text-[10px] font-light border transition-all"
              style={{
                borderColor: metric === tab.key ? tab.color : "var(--color-border)",
                background: metric === tab.key ? `rgba(${tab.rgb},.12)` : "var(--color-surface-2)",
                color: metric === tab.key ? tab.color : "var(--color-text-3)",
              }}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Range pills */}
        <div className="flex gap-1.5 mb-4">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded-[8px] font-caption text-[10px] font-light border transition-all"
              style={{
                borderColor: range === r ? m.color : "var(--color-border)",
                background: range === r ? `rgba(${m.rgb},.1)` : "transparent",
                color: range === r ? m.color : "var(--color-text-3)",
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${metric}-${range}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ height: 180 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={m.color} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "var(--color-text-3)", fontFamily: "ModernSans" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "var(--color-text-3)", fontFamily: "ModernSans" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
                <Tooltip content={<CustomTooltip metric={metric} />} cursor={{ stroke: m.color, strokeWidth: 1, strokeOpacity: 0.4 }} />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={m.color}
                  strokeWidth={2}
                  fill={`url(#grad-${metric})`}
                  dot={false}
                  activeDot={{ r: 5, fill: m.color, strokeWidth: 2, stroke: "var(--color-surface)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>

        {/* Footer stats */}
        <div className="mt-3 pt-3 border-t border-[var(--color-border)] grid grid-cols-3 gap-2">
          {[
            { l: "Start", v: `${data[0]?.[metric]?.toLocaleString() ?? "—"}${m.unit}` },
            { l: "Latest", v: `${data[data.length - 1]?.[metric]?.toLocaleString() ?? "—"}${m.unit}` },
            { l: "Trend", v: `${positive ? "+" : ""}${delta}%` },
          ].map(({ l, v }) => (
            <div key={l} className="text-center">
              <p className="font-caption text-[8px] font-light text-[var(--color-text-3)] uppercase tracking-wider">{l}</p>
              <p className="font-metric text-[.875rem] text-[var(--color-text-1)] mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </GlowCard>
  );
}
