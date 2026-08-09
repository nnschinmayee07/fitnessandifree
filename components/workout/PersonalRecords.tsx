"use client";
import { motion } from "framer-motion";
import GlowCard from "@/components/ui/GlowCard";
import { PERSONAL_RECORDS } from "@/lib/data/workout-analytics";

export default function PersonalRecords() {
  return (
    <GlowCard glowColor="245,158,11">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[9px] flex items-center justify-center bg-[rgba(245,158,11,.12)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1l1.5 3.5H13L9.5 7l1.5 3.5L7 8.5 3 10.5l1.5-3.5L1 4.5h4.5L7 1z"
                  fill="#F59E0B" stroke="#F59E0B" strokeWidth=".5" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">PERSONAL RECORDS</p>
          </div>
          <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">{PERSONAL_RECORDS.length} tracked</span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center mb-2 px-1">
          {["Exercise", "Record", "Date", "+Gain"].map(h => (
            <p key={h} className="font-caption text-[8px] font-light text-[var(--color-text-3)] uppercase tracking-wider">{h}</p>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          {PERSONAL_RECORDS.map((pr, i) => (
            <motion.div
              key={pr.exercise}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center p-2.5 rounded-[12px] border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-all duration-200"
            >
              {/* Exercise */}
              <div className="flex items-center gap-2 min-w-0">
                {pr.isNew && (
                  <span className="flex-shrink-0 font-caption text-[7px] font-light px-1.5 py-0.5 rounded-full bg-[rgba(245,158,11,.1)] text-[#F59E0B] border border-[rgba(245,158,11,.2)]">
                    NEW
                  </span>
                )}
                <p className="font-body text-[11px] text-[var(--color-text-1)] truncate">{pr.exercise}</p>
              </div>

              {/* Record */}
              <p className="font-metric text-[.875rem] text-[var(--color-text-1)] text-right">{pr.record}</p>

              {/* Date */}
              <p className="font-caption text-[9px] font-light text-[var(--color-text-3)] text-right whitespace-nowrap">{pr.date}</p>

              {/* Improvement */}
              <div
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full justify-end"
                style={{ background: "rgba(34,197,94,.1)" }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M4 7V1M1 4l3-3 3 3" stroke="#22C55E" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-caption text-[8px] font-light text-[#22C55E] whitespace-nowrap">{pr.improvement}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </GlowCard>
  );
}
