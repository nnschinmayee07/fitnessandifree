"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Chip from "@/components/ui/Chip";
import PageHeader from "@/components/layout/PageHeader";
import GlowCard from "@/components/ui/GlowCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import Grainient from "@/components/ui/Grainient";
import CountUp from "@/components/ui/CountUp";

const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
const weekState = ["done", "done", "rest", "done", "today", "rest", "upcoming"];

const recommended = [
  { id: 1, name: "Upper Body Strength", duration: 45, kcal: 312, level: "Intermediate", muscles: ["Chest", "Shoulders", "Triceps"] },
  { id: 2, name: "Full Body HIIT",       duration: 25, kcal: 280, level: "Intermediate", muscles: ["Full Body"] },
  { id: 3, name: "Mobility & Recovery",  duration: 20, kcal: 80,  level: "Beginner",     muscles: ["Flexibility"] },
];

const SPORT_MODES = [
  {
    id: "running", label: "Running", color: "#22C55E", rgb: "34,197,94",
    stats: { distance: "5.2 km", pace: "5:42 /km", calories: "420 kcal" },
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="5" r="2.5" stroke={active ? "#22C55E" : "var(--color-text-3)"} strokeWidth="1.75"/>
        <path d="M9 10.5l3-2.5 3 2 2.5-3.5M7 21l3.5-5.5 3.5 2.5 3-5" stroke={active ? "#22C55E" : "var(--color-text-3)"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "cycling", label: "Cycling", color: "#F59E0B", rgb: "245,158,11",
    stats: { distance: "22 km", pace: "28 km/h", calories: "560 kcal" },
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="7" cy="17" r="4" stroke={active ? "#F59E0B" : "var(--color-text-3)"} strokeWidth="1.75"/>
        <circle cx="17" cy="17" r="4" stroke={active ? "#F59E0B" : "var(--color-text-3)"} strokeWidth="1.75"/>
        <path d="M7 17l4-7 4 1 3-4M13 6h3" stroke={active ? "#F59E0B" : "var(--color-text-3)"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "swimming", label: "Swimming", color: "#38BDF8", rgb: "56,189,248",
    stats: { distance: "1.5 km", pace: "2:10 /100m", calories: "380 kcal" },
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0M9 8c0-2 2-3 4-3s3 1 3 3M9 8l3 4" stroke={active ? "#38BDF8" : "var(--color-text-3)"} strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "hiit", label: "HIIT", color: "#EF4444", rgb: "239,68,68",
    stats: { duration: "25 min", rounds: "5 rounds", calories: "320 kcal" },
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M5 18L8 7l4 8 4-10 4 13" stroke={active ? "#EF4444" : "var(--color-text-3)"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "yoga", label: "Yoga", color: "#A78BFA", rgb: "167,139,250",
    stats: { duration: "40 min", poses: "24 poses", calories: "150 kcal" },
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="5" r="2" stroke={active ? "#A78BFA" : "var(--color-text-3)"} strokeWidth="1.75"/>
        <path d="M12 7v8M8 11l-4 6M16 11l4 6M8 21h8" stroke={active ? "#A78BFA" : "var(--color-text-3)"} strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "boxing", label: "Boxing", color: "#F97316", rgb: "249,115,22",
    stats: { duration: "30 min", rounds: "8 rounds", calories: "480 kcal" },
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="10" width="12" height="9" rx="3" stroke={active ? "#F97316" : "var(--color-text-3)"} strokeWidth="1.75"/>
        <path d="M16 13h2a2 2 0 000-4h-2M8 10V7a4 4 0 018 0v3" stroke={active ? "#F97316" : "var(--color-text-3)"} strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const ACTIVITY_FEED = [
  { user: "Rahul M.", action: "completed", activity: "10K Run", time: "2h ago", kudos: 12, avatar: "RM" },
  { user: "Priya S.", action: "set a PR in", activity: "Deadlift 120kg", time: "4h ago", kudos: 8, avatar: "PS" },
  { user: "Ankit K.", action: "finished", activity: "Yoga Flow", time: "5h ago", kudos: 5, avatar: "AK" },
];

export default function WorkoutsPage() {
  const [activeSport, setActiveSport] = useState("running");
  const [kudosGiven, setKudosGiven] = useState<Record<number, boolean>>({});
  const sport = SPORT_MODES.find(s => s.id === activeSport) || SPORT_MODES[0];

  return (
    <div className="flex flex-col">
      <PageHeader title="WORKOUTS"
        action={
          <Link href="/workouts/programs" className="font-caption text-[10px] font-light text-[var(--color-primary)] uppercase tracking-wider">Programs</Link>
        }
      />
      <div className="flex flex-col gap-4 px-4 py-4">

        {/* Sport Mode Selector */}
        <ScrollReveal direction="up">
          <GlowCard glowColor={sport.rgb}>
            <div className="p-4">
              <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">SPORT MODE</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {SPORT_MODES.map(s => (
                  <motion.button
                    key={s.id}
                    onClick={() => setActiveSport(s.id)}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-[12px] border transition-all ${activeSport === s.id ? "border-current" : "border-[var(--color-border)] bg-[var(--color-surface-2)]"}`}
                    style={{
                      borderColor: activeSport === s.id ? s.color : undefined,
                      background: activeSport === s.id ? s.color + "18" : undefined,
                    }}
                  >
                    {s.icon(activeSport === s.id)}
                    <span className="font-caption text-[9px] font-light tracking-wider uppercase" style={{ color: activeSport === s.id ? s.color : "var(--color-text-3)" }}>{s.label}</span>
                  </motion.button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSport}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="mt-3 pt-3 border-t border-[var(--color-border)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-heading text-[1rem] tracking-wide" style={{ color: sport.color }}>{sport.label.toUpperCase()}</p>
                    <Chip variant="primary" className="text-[10px]">AI-matched</Chip>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(sport.stats).map(([k, v]) => (
                      <div key={k} className="bg-[var(--color-surface-2)] rounded-[10px] p-2.5 text-center border border-[var(--color-border)]">
                        <p className="font-metric text-[.9375rem] text-[var(--color-text-1)]">{v}</p>
                        <p className="font-caption text-[8px] font-light text-[var(--color-text-3)] capitalize mt-0.5">{k}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* Weekly rings */}
        <ScrollReveal delay={0.03}>
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">THIS WEEK</p>
              <div className="flex justify-between">
                {weekDays.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                      weekState[i] === "done"     ? "bg-[#22C55E] border-[#22C55E]" :
                      weekState[i] === "today"    ? "bg-[#2563EB] border-[#2563EB]" :
                      weekState[i] === "rest"     ? "bg-[var(--color-surface-2)] border-[var(--color-border)]" :
                                                   "bg-[var(--color-surface)] border-[var(--color-border)]"
                    }`}>
                      {weekState[i] === "done" && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3 3 7-7" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      {weekState[i] === "rest" && <span className="font-metric text-[10px] text-[var(--color-text-3)]">R</span>}
                      {weekState[i] === "today" && <span className="font-metric text-[10px] text-white">{d}</span>}
                    </div>
                    <span className={`font-caption text-[9px] font-light ${weekState[i] === "today" ? "text-[var(--color-primary)]" : "text-[var(--color-text-3)]"}`}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* Today */}
        <ScrollReveal delay={0.04}>
          <GlowCard glowColor="37,99,235" className="border-0 overflow-hidden">
            <Grainient from="#0A1628" to="#1E3A5F" angle={135} className="h-full">
              <div className="p-4">
                <p className="font-caption text-[9px] font-light text-white/40 uppercase tracking-widest mb-1">TODAY</p>
                <p className="font-heading text-[1.125rem] text-white tracking-wide">UPPER BODY STRENGTH</p>
                <div className="flex gap-2 mt-2 mb-3 flex-wrap">
                  <Chip variant="primary" className="bg-white/15 text-white border-0 text-[10px]">45 min</Chip>
                  <Chip variant="neutral" className="bg-white/10 text-white/70 border-0 text-[10px]">Chest · Shoulders</Chip>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Sets", val: 18 },
                    { label: "Reps", val: 120 },
                    { label: "Volume kg", val: 4800 },
                  ].map(s => (
                    <div key={s.label} className="rounded-[10px] bg-white/8 border border-white/10 p-2 text-center">
                      <p className="font-metric text-[1rem] text-white"><CountUp to={s.val} duration={1.2}/></p>
                      <p className="font-caption text-[8px] font-light text-white/40">{s.label}</p>
                    </div>
                  ))}
                </div>
                <Link href="/workouts/session"
                  className="h-11 w-full rounded-[10px] bg-[#2563EB] text-white font-body font-bold text-[13px] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(37,99,235,.4)]">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 1l9 5.5L3 12V1z" fill="white"/></svg>
                  Start Now
                </Link>
              </div>
            </Grainient>
          </GlowCard>
        </ScrollReveal>

        {/* Recommended */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">RECOMMENDED</p>
            <Chip variant="primary" className="text-[10px]">AI-matched</Chip>
          </div>
          <div className="flex flex-col gap-3">
            {recommended.map((w, idx) => (
              <ScrollReveal key={w.id} delay={0.04 * idx} direction="up">
                <GlowCard glowColor="37,99,235">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-heading text-[1rem] text-[var(--color-text-1)] tracking-wide">{w.name}</p>
                        <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mt-0.5">{w.duration} min · {w.kcal} kcal est.</p>
                      </div>
                      <Chip variant={w.level === "Beginner" ? "success" : w.level === "Intermediate" ? "warning" : "danger"} className="text-[10px]">
                        {w.level}
                      </Chip>
                    </div>
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {w.muscles.map(m => <Chip key={m} variant="neutral" className="text-[10px]">{m}</Chip>)}
                    </div>
                    <Link href="/workouts/session"
                      className="h-9 w-full rounded-[9px] bg-[var(--color-primary)] text-white font-body font-bold text-[12px] flex items-center justify-center">
                      Start
                    </Link>
                  </div>
                </GlowCard>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Activity Feed (Strava-style) */}
        <ScrollReveal delay={0.05}>
          <GlowCard glowColor="34,197,94">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">ACTIVITY FEED</p>
                <Link href="/community" className="font-caption text-[10px] font-light text-[var(--color-primary)]">See all</Link>
              </div>
              <div className="flex flex-col gap-3">
                {ACTIVITY_FEED.map((item, i) => (
                  <motion.div key={i} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}
                    className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                      <span className="font-heading text-[10px] text-[var(--color-primary)]">{item.avatar}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-[12px] text-[var(--color-text-1)] truncate">
                        <span className="font-bold">{item.user}</span> {item.action} <span className="text-[var(--color-primary)]">{item.activity}</span>
                      </p>
                      <p className="font-caption text-[9px] font-light text-[var(--color-text-3)]">{item.time}</p>
                    </div>
                    <button
                      onClick={() => setKudosGiven(prev => ({ ...prev, [i]: !prev[i] }))}
                      className="flex items-center gap-1 px-2 py-1 rounded-[8px] border transition-all"
                      style={{
                        borderColor: kudosGiven[i] ? "#F59E0B" : "var(--color-border)",
                        background: kudosGiven[i] ? "rgba(245,158,11,.1)" : "transparent",
                      }}
                    >
                      <motion.span animate={{ scale: kudosGiven[i] ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.3 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 1l1 3h3L7.5 6l1 3L6 7.5 3.5 9l1-3L2 4h3L6 1z" fill={kudosGiven[i] ? "#F59E0B" : "none"} stroke={kudosGiven[i] ? "#F59E0B" : "var(--color-text-3)"} strokeWidth="1"/>
                        </svg>
                      </motion.span>
                      <span className="font-caption text-[9px] font-light" style={{ color: kudosGiven[i] ? "#F59E0B" : "var(--color-text-3)" }}>
                        {item.kudos + (kudosGiven[i] ? 1 : 0)}
                      </span>
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

      </div>
    </div>
  );
}
