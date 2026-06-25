"use client";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import PageHeader from "@/components/layout/PageHeader";

const programs = [
  {
    id: 1,
    name: "12-Week Strength Builder",
    weeks: 12,
    sessions: 4,
    level: "Intermediate",
    focus: "Strength",
    description: "Progressive overload program for building raw strength across all major lifts.",
    tags: ["Barbell", "Compound", "PPL"],
    enrolled: true,
    week: 4,
  },
  {
    id: 2,
    name: "HIIT Fat Burn",
    weeks: 8,
    sessions: 5,
    level: "Intermediate",
    focus: "Cardio",
    description: "High intensity intervals designed to maximize fat loss while preserving muscle.",
    tags: ["Bodyweight", "Cardio", "HIIT"],
    enrolled: false,
    week: 0,
  },
  {
    id: 3,
    name: "Beginner Body Recomp",
    weeks: 10,
    sessions: 3,
    level: "Beginner",
    focus: "Recomposition",
    description: "Perfect first program for those new to structured training.",
    tags: ["Dumbbell", "Full Body", "Beginner"],
    enrolled: false,
    week: 0,
  },
  {
    id: 4,
    name: "Advanced Hypertrophy",
    weeks: 16,
    sessions: 5,
    level: "Advanced",
    focus: "Hypertrophy",
    description: "High volume program designed for maximizing muscle size.",
    tags: ["Barbell", "Dumbbell", "Split"],
    enrolled: false,
    week: 0,
  },
];

const levelColor: Record<string, "success" | "warning" | "danger"> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "danger",
};

export default function ProgramsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="PROGRAMS" back />
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Active program */}
        {programs.filter(p => p.enrolled).map(p => (
          <div key={p.id}>
            <p className="font-heading text-[.75rem] text-[#94A3B8] tracking-widest uppercase mb-2">ACTIVE PROGRAM</p>
            <Card className="border-[#2563EB] border-2">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-heading text-[1.0625rem] text-[#0F172A] tracking-wide">{p.name}</p>
                  <p className="font-caption text-[10px] font-light text-[#94A3B8] mt-0.5">Week {p.week} of {p.weeks}</p>
                </div>
                <Chip variant={levelColor[p.level]}>{p.level}</Chip>
              </div>
              <div className="h-1.5 bg-[#E2E8F0] rounded-full mb-3">
                <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${(p.week / p.weeks) * 100}%` }}/>
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                {p.tags.map(t => <Chip key={t} variant="neutral" className="text-[10px]">{t}</Chip>)}
              </div>
              <Link href="/workouts/session"
                className="h-11 w-full rounded-[10px] bg-[#2563EB] text-white font-body font-bold text-[13px] flex items-center justify-center gap-2">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 1l9 5.5L3 12V1z" fill="white"/></svg>
                Continue Program
              </Link>
            </Card>
          </div>
        ))}

        {/* All programs */}
        <div>
          <p className="font-heading text-[.75rem] text-[#94A3B8] tracking-widest uppercase mb-2">ALL PROGRAMS</p>
          <div className="flex flex-col gap-3">
            {programs.filter(p => !p.enrolled).map(p => (
              <Card key={p.id}>
                <div className="flex items-start justify-between mb-1">
                  <p className="font-heading text-[1rem] text-[#0F172A] tracking-wide">{p.name}</p>
                  <Chip variant={levelColor[p.level]} className="text-[10px]">{p.level}</Chip>
                </div>
                <p className="font-body text-[12px] text-[#475569] mb-2">{p.description}</p>
                <div className="flex gap-3 mb-3">
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="2" width="10" height="9" rx="1.5" stroke="#94A3B8" strokeWidth="1.25"/><path d="M1 5h10M4 1v2M8 1v2" stroke="#94A3B8" strokeWidth="1.25" strokeLinecap="round"/></svg>
                    <span className="font-caption text-[10px] font-light text-[#94A3B8]">{p.weeks} weeks</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="#94A3B8" strokeWidth="1.25"/><path d="M6 3v3l2 1.5" stroke="#94A3B8" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="font-caption text-[10px] font-light text-[#94A3B8]">{p.sessions}x/week</span>
                  </div>
                  <Chip variant="neutral" className="text-[10px]">{p.focus}</Chip>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {p.tags.map(t => <Chip key={t} variant="neutral" className="text-[10px]">{t}</Chip>)}
                </div>
                <button className="h-9 w-full rounded-[9px] border border-[#2563EB] text-[#2563EB] font-body font-bold text-[12px]">
                  Start Program
                </button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
