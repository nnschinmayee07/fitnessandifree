"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Link from "next/link";

const exercises = [
  { name: "Bench Press",         sets: 4, reps: 8,  weight: 60 },
  { name: "Incline DB Press",    sets: 4, reps: 10, weight: 22 },
  { name: "Cable Fly",           sets: 3, reps: 12, weight: 16 },
  { name: "Overhead Press",      sets: 3, reps: 10, weight: 40 },
  { name: "Lateral Raises",      sets: 3, reps: 15, weight: 8  },
  { name: "Tricep Pushdown",     sets: 3, reps: 12, weight: 20 },
  { name: "Close-Grip Bench",    sets: 3, reps: 10, weight: 50 },
  { name: "Dips",                sets: 3, reps: 12, weight: 0  },
];

export default function SessionPage() {
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [resting, setResting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [wt, setWt] = useState(exercises[0].weight);
  const [rp, setRp] = useState(exercises[0].reps);

  const ex = exercises[exIdx];
  const progress = ((exIdx * ex.sets + setIdx) / (exercises.length * 4)) * 100;

  const completeSet = () => {
    if (setIdx < ex.sets - 1) {
      setSetIdx(s => s + 1);
      setResting(true);
      setTimeout(() => setResting(false), 2000);
    } else if (exIdx < exercises.length - 1) {
      const next = exercises[exIdx + 1];
      setExIdx(e => e + 1);
      setSetIdx(0);
      setWt(next.weight);
      setRp(next.reps);
    } else {
      setCompleted(true);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-20 h-20 rounded-full bg-[#22C55E] flex items-center justify-center shadow-[0_0_0_16px_rgba(34,197,94,.12)]">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M6 18l8 8 16-16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div className="text-center">
          <h1 className="font-heading text-[2rem] text-white tracking-wide">WORKOUT COMPLETE!</h1>
          <p className="font-caption text-[11px] font-light text-white/40 mt-1">Upper Body Strength · Jun 24</p>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full">
          {[["47:23","Duration"],["312","Calories"],["7,840kg","Volume"],["24","Sets"]].map(([v,l]) => (
            <div key={l} className="bg-white/8 rounded-[12px] p-4 text-center border border-white/10">
              <p className="font-metric text-[1.375rem] text-white">{v}</p>
              <p className="font-caption text-[10px] font-light text-white/40">{l}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 w-full">
          <Link href="/workouts" className="flex-1 h-12 rounded-[12px] border border-white/20 text-white font-body font-bold text-[13px] flex items-center justify-center">Done</Link>
          <Link href="/dashboard" className="flex-2 flex-1 h-12 rounded-[12px] bg-[#2563EB] text-white font-body font-bold text-[13px] flex items-center justify-center">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="font-heading text-[.875rem] text-white tracking-wide">UPPER BODY STRENGTH</p>
          <p className="font-caption text-[10px] font-light text-white/40">Exercise {exIdx + 1} of {exercises.length}</p>
        </div>
        <Link href="/workouts" className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </Link>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 bg-white/10 mx-4"><div className="h-full bg-[#2563EB] transition-all" style={{ width: `${progress}%` }}/></div>

      {/* Exercise name */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <motion.div key={exIdx} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h2 className="font-heading text-[2rem] text-white tracking-wide leading-tight">{ex.name.toUpperCase()}</h2>
          <p className="font-caption text-[11px] font-light text-white/40 mt-2">Set {setIdx + 1} of {ex.sets}</p>
        </motion.div>

        {/* Set dots */}
        <div className="flex gap-2">
          {Array.from({ length: ex.sets }).map((_, i) => (
            <div key={i} className={`h-1.5 w-12 rounded-full transition-all ${i < setIdx ? "bg-[#22C55E]" : i === setIdx ? "bg-[#2563EB]" : "bg-white/20"}`}/>
          ))}
        </div>

        {/* Weight + reps */}
        <div className="flex gap-8">
          {[
            { label: "WEIGHT", unit: "kg",   val: wt, set: setWt },
            { label: "REPS",   unit: "reps", val: rp, set: setRp },
          ].map(({ label, unit, val, set }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <p className="font-caption text-[9px] font-light text-white/40 uppercase tracking-widest">{label}</p>
              <div className="flex items-center gap-3">
                <button onClick={() => set((v: number) => Math.max(0, v - (unit === "kg" ? 2.5 : 1)))}
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="white" strokeWidth="1.75" strokeLinecap="round"/></svg>
                </button>
                <span className="font-metric text-[2.25rem] text-white w-16 text-center">{val}</span>
                <button onClick={() => set((v: number) => v + (unit === "kg" ? 2.5 : 1))}
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="white" strokeWidth="1.75" strokeLinecap="round"/></svg>
                </button>
              </div>
              <p className="font-caption text-[9px] font-light text-white/30">{unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-8">
        {resting ? (
          <div className="h-14 rounded-[14px] bg-white/10 border border-white/15 flex items-center justify-center">
            <p className="font-body font-bold text-white/60 text-[14px]">Resting...</p>
          </div>
        ) : (
          <button onClick={completeSet}
            className="h-14 w-full rounded-[14px] bg-[#22C55E] text-white font-body font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(34,197,94,.3)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Complete Set
          </button>
        )}
      </div>
    </div>
  );
}
