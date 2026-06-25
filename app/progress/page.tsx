"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import Chip from "@/components/ui/Chip";
import PageHeader from "@/components/layout/PageHeader";
import GlowCard from "@/components/ui/GlowCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CountUp from "@/components/ui/CountUp";

const weightData = [82.4, 82.1, 81.8, 81.6, 81.3, 81.0, 80.8, 80.5, 80.2, 80.0, 79.8, 79.6];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function MiniLineChart({ data, color = "#2563EB" }: { data: number[]; color?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 280;
  const h = 60;
  const pad = 4;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const path = `M ${pts.join(" L ")}`;
  const areaClose = `L ${pts[pts.length - 1].split(",")[0]},${h} L ${pad},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 60 }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${path} ${areaClose}`} fill="url(#lg)"/>
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r="3.5" fill={color}/>
    </svg>
  );
}

const stats = [
  { label: "Starting", val: "82.4 kg", sub: "Jan 2026" },
  { label: "Current",  val: "79.6 kg", sub: "Jun 2026" },
  { label: "Change",   val: "-2.8 kg", sub: "6 months", positive: true },
  { label: "Goal",     val: "75.0 kg", sub: "Dec 2026" },
];

const measurements = [
  { label: "Chest",     val: "98 cm",  change: "-2 cm" },
  { label: "Waist",     val: "82 cm",  change: "-4 cm" },
  { label: "Hips",      val: "96 cm",  change: "-1 cm" },
  { label: "Bicep",     val: "36 cm",  change: "+1 cm" },
  { label: "Thigh",     val: "56 cm",  change: "-2 cm" },
];

const prs = [
  { name: "Bench Press",   val: "80 kg",  date: "Jun 12" },
  { name: "Squat",         val: "100 kg", date: "Jun 8"  },
  { name: "Deadlift",      val: "120 kg", date: "May 28" },
  { name: "Overhead Press", val: "55 kg", date: "Jun 18" },
];

export default function ProgressPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="PROGRESS"
        action={
          <Link href="/progress/weight"
            className="w-8 h-8 rounded-[8px] bg-[#2563EB] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.75" strokeLinecap="round"/></svg>
          </Link>
        }
      />
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Weight chart */}
        <ScrollReveal direction="up">
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">WEIGHT</p>
                <Link href="/progress/weight" className="font-caption text-[10px] font-light text-[var(--color-primary)]">Log weight</Link>
              </div>
              <MiniLineChart data={weightData}/>
              <div className="flex justify-between mt-1 mb-3">
                <span className="font-caption text-[9px] font-light text-[#94A3B8]">Jan</span>
                <span className="font-caption text-[9px] font-light text-[#94A3B8]">Jun</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {stats.map((s, i) => (
                  <ScrollReveal key={s.label} delay={0.04 * i} direction="up">
                    <div className="bg-[var(--color-surface-2)] rounded-[9px] p-2 text-center border border-[var(--color-border)]">
                      <p className={`font-metric text-[.875rem] ${s.positive ? "text-[#22C55E]" : "text-[var(--color-text-1)]"}`}>{s.val}</p>
                      <p className="font-caption text-[8px] font-light text-[var(--color-text-3)] leading-tight">{s.label}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* Measurements */}
        <ScrollReveal delay={0.05}>
          <GlowCard glowColor="34,197,94">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">MEASUREMENTS</p>
                <Link href="/progress/measurements" className="font-caption text-[10px] font-light text-[var(--color-primary)]">Update</Link>
              </div>
              <div className="flex flex-col gap-2">
                {measurements.map(m => (
                  <motion.div key={m.label} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}
                    className="flex items-center justify-between">
                    <span className="font-body text-[13px] text-[var(--color-text-2)]">{m.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-caption text-[10px] font-light ${m.change.startsWith("-") ? "text-[#22C55E]" : "text-[#F59E0B]"}`}>{m.change}</span>
                      <span className="font-metric text-[13px] text-[var(--color-text-1)]">{m.val}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* PRs */}
        <ScrollReveal delay={0.06}>
          <GlowCard glowColor="245,158,11">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">PERSONAL RECORDS</p>
                <Chip variant="primary" className="text-[10px]">All-time</Chip>
              </div>
              <div className="flex flex-col gap-2">
                {prs.map((p, i) => (
                  <ScrollReveal key={p.name} delay={0.04 * i} direction="left">
                    <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.15 }}
                      className="flex items-center justify-between p-3 bg-[var(--color-surface-2)] rounded-[10px] border border-[var(--color-border)]">
                      <div>
                        <p className="font-body font-bold text-[13px] text-[var(--color-text-1)]">{p.name}</p>
                        <p className="font-caption text-[10px] font-light text-[var(--color-text-3)]">{p.date}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.4 4H13l-3.8 2.8 1.4 4.4L7 9.3l-3.6 2.9 1.4-4.4L1 5h4.6L7 1z" fill="#F59E0B"/></svg>
                        <span className="font-metric text-[14px] text-[var(--color-text-1)]">{p.val}</span>
                      </div>
                    </motion.div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* Progress photos */}
        <ScrollReveal delay={0.07}>
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">PROGRESS PHOTOS</p>
                <Link href="/progress/photos" className="font-caption text-[10px] font-light text-[var(--color-primary)]">View all</Link>
              </div>
              <div className="flex gap-2">
                {["Jan 2026", "Mar 2026", "Jun 2026"].map((label) => (
                  <motion.div key={label} whileHover={{ y: -3, boxShadow: "0 6px 20px rgba(37,99,235,.15)" }} transition={{ duration: 0.18 }}
                    className="flex-1 aspect-[3/4] rounded-[10px] bg-[var(--color-surface-2)] border border-[var(--color-border)] flex flex-col items-center justify-end pb-2 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="10" r="5" stroke="var(--color-text-4)" strokeWidth="1.5"/><path d="M4 24c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="var(--color-text-4)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <span className="font-caption text-[8px] font-light text-[var(--color-text-3)] relative z-10">{label}</span>
                  </motion.div>
                ))}
                <Link href="/progress/photos"
                  className="flex-1 aspect-[3/4] rounded-[10px] border border-dashed border-[var(--color-primary)] flex flex-col items-center justify-center gap-1 hover:bg-[var(--color-primary-light)] transition-colors">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 5v10M5 10h10" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span className="font-caption text-[8px] font-light text-[var(--color-primary)]">Add</span>
                </Link>
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>
      </div>
    </div>
  );
}
