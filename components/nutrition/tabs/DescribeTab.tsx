"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import ManualFallbackForm from "@/components/nutrition/ManualFallbackForm";
import type { MealType } from "@/lib/types/meal-log";
import type { DescriptionAnalysisResult } from "@/lib/types/claude";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TabProps {
  userId: string;
  mealType: MealType;
  date: string;
  isActive: boolean;
  onSuccess: () => void;
  resetKey: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DescribeTab({
  userId,
  mealType,
  date,
  isActive: _isActive,
  onSuccess,
  resetKey,
}: TabProps) {
  // ── Query client ────────────────────────────────────────────────────────────

  const queryClient = useQueryClient();

  // ── Internal state ──────────────────────────────────────────────────────────

  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<DescriptionAnalysisResult | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Reset all state when resetKey changes (modal close/reopen)
  useEffect(() => {
    setDescription("");
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setIsLogging(false);
    setLogError(null);
    setShowFallback(false);
  }, [resetKey]);

  // ── Analyse handler ─────────────────────────────────────────────────────────

  const handleAnalyse = useCallback(async () => {
    if (!description.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setShowFallback(false);
    setLogError(null);

    try {
      const res = await fetch("/api/nutrition/analyze-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, userId, mealType }),
      });

      if (!res.ok) {
        setShowFallback(true);
        return;
      }

      const data: DescriptionAnalysisResult = await res.json();
      setAnalysisResult(data);
      setShowFallback(false);
    } catch {
      setShowFallback(true);
    } finally {
      setIsAnalyzing(false);
    }
  }, [description, userId, mealType, isAnalyzing]);

  // ── Log handler ─────────────────────────────────────────────────────────────

  const handleLog = useCallback(async () => {
    if (!analysisResult || isLogging) return;

    setIsLogging(true);
    setLogError(null);

    try {
      const res = await fetch("/api/nutrition/meal-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          date,
          meal_type: mealType,
          source: "description",
          food_name: analysisResult.meal_name,
          calories: analysisResult.calories,
          protein_g: analysisResult.protein_g,
          carbs_g: analysisResult.carbs_g,
          fat_g: analysisResult.fat_g,
          fiber_g: analysisResult.fiber_g,
        }),
      });

      if (!res.ok) {
        setLogError("Failed to save meal — try again");
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ["meal-logs", userId, date],
      });
      onSuccess();
    } catch {
      setLogError("Failed to save meal — try again");
    } finally {
      setIsLogging(false);
    }
  }, [analysisResult, userId, date, mealType, isLogging, onSuccess, queryClient]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Textarea ── */}
      <div className="flex flex-col gap-1.5">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. I had 2 rotis with dal and a small bowl of rice"
          maxLength={500}
          disabled={isAnalyzing}
          rows={4}
          aria-label="Meal description"
          className={[
            "w-full px-4 py-3 rounded-[14px] border bg-[var(--color-surface-2)]",
            "text-[var(--color-text-1)] font-body text-[14px] leading-relaxed",
            "placeholder:text-[var(--color-text-3)] resize-none",
            "focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent",
            "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            "border-[var(--color-border)]",
          ].join(" ")}
        />
        {/* Character count */}
        <p className="font-caption text-[12px] text-[var(--color-text-3)] text-right pr-1">
          {description.length}/500
        </p>
      </div>

      {/* ── Analyse button ── */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!description.trim() || isAnalyzing}
        loading={isAnalyzing}
        onClick={handleAnalyse}
      >
        {!isAnalyzing && "Analyse"}
      </Button>

      {/* ── Result card ── */}
      {analysisResult && !showFallback && (
        <ResultCard
          result={analysisResult}
          isLogging={isLogging}
          logError={logError}
          onLog={handleLog}
        />
      )}

      {/* ── Manual fallback ── */}
      {showFallback && (
        <div className="flex flex-col gap-3">
          <p className="font-body text-[13px] text-[var(--color-text-2)] bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-[12px] px-4 py-3">
            Analysis failed — enter your macros manually below.
          </p>
          <ManualFallbackForm
            source="description"
            mealType={mealType}
            userId={userId}
            date={date}
            onSuccess={onSuccess}
          />
        </div>
      )}
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

interface ResultCardProps {
  result: DescriptionAnalysisResult;
  isLogging: boolean;
  logError: string | null;
  onLog: () => void;
}

function ResultCard({ result, isLogging, logError, onLog }: ResultCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      {/* ── Header: meal name + confidence badge ── */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-[16px] font-bold text-[var(--color-text-1)] leading-snug flex-1">
          {result.meal_name}
        </h3>
        <span
          className={[
            "shrink-0 px-2.5 py-0.5 rounded-full text-[12px] font-body font-bold",
            result.confidence >= 70
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              : result.confidence >= 50
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
          ].join(" ")}
          aria-label={`Confidence: ${result.confidence}%`}
        >
          {result.confidence}% confident
        </span>
      </div>

      {/* ── Macro grid ── */}
      <div className="grid grid-cols-5 gap-2">
        <MacroCell label="Calories" value={result.calories} unit="kcal" />
        <MacroCell label="Protein" value={result.protein_g} unit="g" />
        <MacroCell label="Carbs" value={result.carbs_g} unit="g" />
        <MacroCell label="Fat" value={result.fat_g} unit="g" />
        <MacroCell label="Fiber" value={result.fiber_g} unit="g" />
      </div>

      {/* ── Assumptions note ── */}
      {result.assumptions && (
        <p className="font-caption text-[12px] text-[var(--color-text-3)] leading-relaxed">
          <span className="font-bold text-[var(--color-text-2)]">Assumptions: </span>
          {result.assumptions}
        </p>
      )}

      {/* ── Items chips ── */}
      {result.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Identified items">
          {result.items.map((item) => (
            <span
              key={item}
              className="px-2.5 py-1 rounded-full bg-[var(--color-surface-1)] border border-[var(--color-border)] font-caption text-[11px] text-[var(--color-text-2)]"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {/* ── Log error ── */}
      {logError && (
        <p
          role="alert"
          className="font-body text-[13px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-[10px] px-4 py-3"
        >
          {logError}
        </p>
      )}

      {/* ── Log This Meal button ── */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={isLogging}
        loading={isLogging}
        onClick={onLog}
      >
        {!isLogging && "Log This Meal"}
      </Button>
    </div>
  );
}

// ─── Macro cell ───────────────────────────────────────────────────────────────

interface MacroCellProps {
  label: string;
  value: number;
  unit: string;
}

function MacroCell({ label, value, unit }: MacroCellProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-[var(--color-surface-1)] rounded-[10px] py-2 px-1">
      <span className="font-metric text-[15px] font-bold text-[var(--color-text-1)] tabular-nums">
        {value}
      </span>
      <span className="font-caption text-[10px] text-[var(--color-text-3)] text-center leading-tight">
        {label}
        <br />
        {unit}
      </span>
    </div>
  );
}
