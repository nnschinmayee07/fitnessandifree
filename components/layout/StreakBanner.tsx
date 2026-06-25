"use client";
import { motion } from "framer-motion";
import CountUp from "@/components/ui/CountUp";
import { useUserStore } from "@/lib/store/user";

export default function StreakBanner() {
  const { workoutStreak, nutritionStreak, waterStreak } = useUserStore();

  const streaks = [
    {
      label: "Workout",
      value: workoutStreak,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M1 6h4M11 6h4M1 10h4M11 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <rect x="1" y="4.5" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <rect x="11" y="4.5" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
      ),
    },
    {
      label: "Nutrition",
      value: nutritionStreak,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5.5 8a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Water",
      value: waterStreak,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2C8 2 4 7 4 10a4 4 0 008 0C12 7 8 2 8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full bg-[#0A1628] px-4 py-2"
    >
      <div className="flex items-center justify-between max-w-lg mx-auto lg:max-w-none">
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1l1 3h3L7.5 6l1 3L6 7.5 3.5 9l1-3L2 4h3L6 1z" fill="#F59E0B"/>
          </svg>
          <span className="font-caption text-[9px] font-light text-white/50 uppercase tracking-widest">Daily Streaks</span>
        </div>
        <div className="flex items-center gap-4">
          {streaks.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="text-white/40">{s.icon}</span>
              <div className="flex items-baseline gap-0.5">
                <CountUp
                  to={s.value}
                  duration={1.2}
                  className="font-metric text-[14px] text-white leading-none"
                />
                <span className="font-caption text-[8px] font-light text-white/40 uppercase tracking-wider">d</span>
              </div>
              <span className="font-caption text-[9px] font-light text-white/30 hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
