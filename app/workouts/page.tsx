"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import ScrollReveal from "@/components/ui/ScrollReveal";

import KpiCards from "@/components/workout/KpiCards";
import PerformanceTrends from "@/components/workout/PerformanceTrends";
import WorkoutConsistency from "@/components/workout/WorkoutConsistency";
import TrainingDistribution from "@/components/workout/TrainingDistribution";
import ExerciseProgress from "@/components/workout/ExerciseProgress";
import PersonalRecords from "@/components/workout/PersonalRecords";
import AiInsights from "@/components/workout/AiInsights";
import RecentWorkouts from "@/components/workout/RecentWorkouts";

import { KPI_STATS } from "@/lib/data/workout-analytics";

export default function WorkoutsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="ANALYTICS"
        subtitle="Workout Intelligence"
        action={
          <Link
            href="/workouts/programs"
            className="font-caption text-[10px] font-light text-[var(--color-primary)] uppercase tracking-wider"
          >
            Programs
          </Link>
        }
      />

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* ── Section 1: KPI Cards ────────────────────────────────────────── */}
        <ScrollReveal direction="up">
          <KpiCards stats={KPI_STATS} />
        </ScrollReveal>

        {/* ── Section 2: Performance Trends ──────────────────────────────── */}
        <ScrollReveal direction="up" delay={0.04}>
          <PerformanceTrends />
        </ScrollReveal>

        {/* ── Section 3 + 4: Consistency + Distribution (side by side on large screens) */}
        <div className="flex flex-col gap-4">
          <ScrollReveal direction="up" delay={0.05}>
            <WorkoutConsistency />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.06}>
            <TrainingDistribution />
          </ScrollReveal>
        </div>

        {/* ── Section 5: Exercise Progress ───────────────────────────────── */}
        <ScrollReveal direction="up" delay={0.07}>
          <ExerciseProgress />
        </ScrollReveal>

        {/* ── Section 6: Personal Records ────────────────────────────────── */}
        <ScrollReveal direction="up" delay={0.08}>
          <PersonalRecords />
        </ScrollReveal>

        {/* ── Section 7: AI Insights ─────────────────────────────────────── */}
        <ScrollReveal direction="up" delay={0.09}>
          <AiInsights />
        </ScrollReveal>

        {/* ── Section 8: Recent Workouts ─────────────────────────────────── */}
        <ScrollReveal direction="up" delay={0.1}>
          <RecentWorkouts />
        </ScrollReveal>

        {/* ── Bottom spacer for mobile nav ─────────────────────────────── */}
        <div className="h-4" />

      </div>
    </div>
  );
}
