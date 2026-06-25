"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import Grainient from "@/components/ui/Grainient";
import TrueFocus from "@/components/ui/TrueFocus";
import CurvedLoop from "@/components/ui/CurvedLoop";

const loopItems = ["AI Coaching", "Nutrition Tracking", "Workout Plans", "Progress Analytics", "Habit Streaks", "Community"];

export default function SplashPage() {
  return (
    <Grainient
      from="#0A1628"
      to="#0F2540"
      angle={160}
      grainOpacity={0.22}
      className="min-h-screen flex flex-col items-center justify-between"
    >
      {/* Hero area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 w-full max-w-lg mx-auto text-center gap-6">
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          className="w-20 h-20 rounded-[22px] bg-[#2563EB] flex items-center justify-center shadow-[0_16px_48px_rgba(37,99,235,.45)]"
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M8 20h24M6 15h6M28 15h6M6 25h6M28 25h6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <rect x="6" y="12" width="6" height="16" rx="3" fill="none" stroke="white" strokeWidth="2.5"/>
            <rect x="28" y="12" width="6" height="16" rx="3" fill="none" stroke="white" strokeWidth="2.5"/>
          </svg>
        </motion.div>

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
        >
          <h1 className="font-display text-[2.75rem] text-[#2563EB] tracking-wide leading-none">FITNESSANDI</h1>
          <p className="font-caption text-[11px] font-light tracking-[.2em] uppercase text-white/40 mt-3">
            Your AI Fitness Operating System
          </p>
        </motion.div>

        {/* TrueFocus animated tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="font-body text-[14px] text-white/60 leading-relaxed max-w-xs"
        >
          <TrueFocus
            text="Smarter training. Better nutrition. Real results."
            blurAmount={2.5}
            highlightColor="#2563EB"
            pauseTime={2000}
          />
        </motion.div>
      </div>

      {/* Curved loop ticker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="w-full py-3 border-y border-white/8 mb-6"
      >
        <CurvedLoop
          items={loopItems.map(t => (
            <span key={t} className="flex items-center gap-2 px-4">
              <span className="w-1 h-1 rounded-full bg-[#2563EB] flex-shrink-0"/>
              <span className="font-caption text-[11px] font-light text-white/40 uppercase tracking-widest whitespace-nowrap">{t}</span>
            </span>
          ))}
          duration={22}
          gap={0}
        />
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="w-full max-w-lg mx-auto px-6 pb-12 flex flex-col gap-3"
      >
        <Link
          href="/signup"
          className="h-14 w-full rounded-[14px] bg-[#2563EB] text-white font-body font-bold text-[15px] flex items-center justify-center shadow-[0_4px_24px_rgba(37,99,235,.4)] active:bg-[#1D4ED8] transition-all hover:bg-[#1D4ED8] hover:shadow-[0_8px_32px_rgba(37,99,235,.5)]"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="h-14 w-full rounded-[14px] border border-white/15 text-white/80 font-body font-bold text-[15px] flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          I already have an account
        </Link>
      </motion.div>
    </Grainient>
  );
}
