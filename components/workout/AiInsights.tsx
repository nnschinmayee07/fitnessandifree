"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AI_INSIGHTS, AiInsight } from "@/lib/data/workout-analytics";

const CATEGORY_META: Record<AiInsight["category"], { label: string; color: string; rgb: string; icon: () => React.ReactNode }> = {
  recovery: {
    label: "Recovery",
    color: "#A78BFA",
    rgb: "167,139,250",
    icon: () => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1C5 3.5 3 5 3 7.5A4 4 0 007 12a4 4 0 004-4.5C11 5 9 3.5 7 1z" stroke="#A78BFA" strokeWidth="1.25" strokeLinejoin="round"/>
        <path d="M5.5 9c.5-.8 1-.8 1.5-.5" stroke="#A78BFA" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  },
  volume: {
    label: "Volume",
    color: "#2563EB",
    rgb: "37,99,235",
    icon: () => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="7" width="2.5" height="5" rx=".75" fill="#2563EB" opacity=".8"/>
        <rect x="5.5" y="4.5" width="2.5" height="7.5" rx=".75" fill="#2563EB"/>
        <rect x="10" y="2" width="2.5" height="10" rx=".75" fill="#2563EB" opacity=".6"/>
      </svg>
    ),
  },
  frequency: {
    label: "Frequency",
    color: "#22C55E",
    rgb: "34,197,94",
    icon: () => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="3" width="11" height="9" rx="1.5" stroke="#22C55E" strokeWidth="1.25"/>
        <path d="M5 1v3M9 1v3M1.5 6.5h11" stroke="#22C55E" strokeWidth="1.25" strokeLinecap="round"/>
        <circle cx="5" cy="9" r="1" fill="#22C55E"/>
        <circle cx="9" cy="9" r="1" fill="#22C55E" opacity=".5"/>
      </svg>
    ),
  },
  technique: {
    label: "Technique",
    color: "#F59E0B",
    rgb: "245,158,11",
    icon: () => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 11L11 3M7 3h4v4" stroke="#F59E0B" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  nutrition: {
    label: "Nutrition",
    color: "#EF4444",
    rgb: "239,68,68",
    icon: () => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2C5 4 4 6 4 8a3 3 0 006 0c0-2-1-4-3-6z" stroke="#EF4444" strokeWidth="1.25" strokeLinejoin="round"/>
        <path d="M7 5v5" stroke="#EF4444" strokeWidth="1" strokeLinecap="round" strokeOpacity=".6"/>
      </svg>
    ),
  },
};

function ConfidenceBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </div>
      <span className="font-metric text-[11px]" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function AiInsights() {
  const [activeIdx, setActiveIdx] = useState(0);
  const insight = AI_INSIGHTS[activeIdx];
  const meta = CATEGORY_META[insight.category];

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-[var(--color-border)]">
      {/* Dark gradient background — premium feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, rgba(${meta.rgb},.08) 0%, rgba(10,22,40,0.95) 50%, rgba(30,58,95,0.9) 100%)`,
        }}
      />
      <div className="absolute inset-0 bg-[var(--color-navy)] opacity-85 pointer-events-none" />

      {/* Animated glowing orb */}
      <motion.div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: meta.color, filter: "blur(56px)", opacity: 0.15 }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative p-4">
        {/* Header with AI badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-[9px] flex items-center justify-center"
              style={{ background: `rgba(${meta.rgb},.2)`, border: `1px solid rgba(${meta.rgb},.3)` }}
            >
              {meta.icon()}
            </div>
            <div>
              <p className="font-heading text-[.8rem] text-white tracking-wide">ANDI INSIGHTS</p>
              <p className="font-caption text-[8px] font-light text-white/40 uppercase tracking-wider">{meta.label} · AI analysis</p>
            </div>
          </div>

          {/* Pulsing AI dot */}
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: meta.color }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="font-caption text-[8px] font-light text-white/40">LIVE</span>
          </div>
        </div>

        {/* Insight tabs */}
        {AI_INSIGHTS.length > 1 && (
          <div className="flex gap-1.5 mb-4">
            {AI_INSIGHTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{
                  background: activeIdx === i ? meta.color : "rgba(255,255,255,.15)",
                }}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {/* Title */}
            <p className="font-heading text-[1rem] tracking-wide mb-2" style={{ color: meta.color }}>
              {insight.title}
            </p>

            {/* Body */}
            <p className="font-body text-[12px] text-white/70 leading-relaxed mb-4">
              {insight.body}
            </p>

            {/* Recommendation box */}
            <div
              className="rounded-[12px] p-3 mb-4"
              style={{
                background: `rgba(${meta.rgb},.1)`,
                border: `1px solid rgba(${meta.rgb},.2)`,
              }}
            >
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: meta.color }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-caption text-[8px] font-light uppercase tracking-wider mb-1" style={{ color: meta.color }}>
                    Recommendation
                  </p>
                  <p className="font-body text-[11px] text-white/80 leading-relaxed">
                    {insight.recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Confidence score */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-caption text-[8px] font-light text-white/40 uppercase tracking-wider">Confidence Score</p>
              </div>
              <ConfidenceBar value={insight.confidence} color={meta.color} />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Next insight button */}
        {AI_INSIGHTS.length > 1 && (
          <button
            onClick={() => setActiveIdx((activeIdx + 1) % AI_INSIGHTS.length)}
            className="mt-4 w-full h-9 rounded-[10px] font-caption text-[10px] font-light uppercase tracking-wider border transition-all"
            style={{
              borderColor: `rgba(${meta.rgb},.3)`,
              color: `rgba(${meta.rgb},.8)`,
              background: `rgba(${meta.rgb},.06)`,
            }}
          >
            Next Insight →
          </button>
        )}
      </div>
    </div>
  );
}
