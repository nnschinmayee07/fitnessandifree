"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import ManualFallbackForm from "@/components/nutrition/ManualFallbackForm";
import type { MealType } from "@/lib/types/meal-log";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TabProps {
  userId: string;
  mealType: MealType;
  date: string; // YYYY-MM-DD
  isActive: boolean;
  onSuccess: () => void;
  resetKey: number; // increment triggers full state reset
}

// ─── Analysis Result ──────────────────────────────────────────────────────────

interface AnalysisResult {
  food: string;
  confidence: string; // percentage string e.g. "87.43"
  top3: Array<{ name: string; confidence: string }>;
  macros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  image_url: string; // signed Supabase Storage URL
  low_confidence?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PhotoTab({
  userId,
  mealType,
  date,
  isActive,
  onSuccess,
  resetKey,
}: TabProps) {
  // ── State ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(
    null
  );
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  const queryClient = useQueryClient();

  // ── Reset all state when resetKey changes ──
  useEffect(() => {
    // Cleanup previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setSelectedAlternative(null);
    setIsLogging(false);
    setLogError(null);
    setShowFallback(false);
  }, [resetKey]);

  // ── Cleanup preview URL on unmount ──
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ── File selection handler ──
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (!file) return;

      // Revoke previous URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));

      // Reset analysis state
      setAnalysisResult(null);
      setSelectedAlternative(null);
      setLogError(null);
      setShowFallback(false);

      // Reset input value so same file can be selected again
      e.target.value = "";
    },
    [previewUrl]
  );

  // ── Analyse Meal ──
  const handleAnalyse = useCallback(async () => {
    if (!selectedFile || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setSelectedAlternative(null);
    setLogError(null);
    setShowFallback(false);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("userId", userId);
      formData.append("mealType", mealType);

      const res = await fetch("/api/nutrition/analyze-photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // Show fallback form on error
        setShowFallback(true);
        return;
      }

      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);
      setShowFallback(false);
    } catch {
      setShowFallback(true);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFile, isAnalyzing, userId, mealType]);

  // ── Log This Meal ──
  const handleLogMeal = useCallback(async () => {
    if (!analysisResult || isLogging) return;

    // Prevent logging if low confidence and no alternative selected
    if (analysisResult.low_confidence && !selectedAlternative) return;

    setIsLogging(true);
    setLogError(null);

    try {
      const body = {
        userId,
        date,
        meal_type: mealType,
        source: "photo",
        food_name: selectedAlternative ?? analysisResult.food,
        calories: analysisResult.macros.calories,
        protein_g: analysisResult.macros.protein_g,
        carbs_g: analysisResult.macros.carbs_g,
        fat_g: analysisResult.macros.fat_g,
        fiber_g: analysisResult.macros.fiber_g,
        image_url: analysisResult.image_url,
      };

      const res = await fetch("/api/nutrition/meal-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setLogError("Failed to save meal — try again");
        return;
      }

      // Invalidate queries and call success callback
      await queryClient.invalidateQueries({
        queryKey: ["meal-logs", userId, date],
      });
      onSuccess();
    } catch {
      setLogError("Failed to save meal — try again");
    } finally {
      setIsLogging(false);
    }
  }, [
    analysisResult,
    selectedAlternative,
    isLogging,
    userId,
    date,
    mealType,
    queryClient,
    onSuccess,
  ]);

  // ── Render ──

  // Show ManualFallbackForm if analysis failed
  if (showFallback) {
    return (
      <div className="flex flex-col gap-4 w-full">
        <p className="font-body text-[13px] text-[var(--color-text-2)]">
          Analysis failed. Please enter meal details manually:
        </p>
        <ManualFallbackForm
          source="photo"
          mealType={mealType}
          userId={userId}
          date={date}
          onSuccess={onSuccess}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── File input zone ── */}
      <label className="flex flex-col items-center justify-center gap-3 h-44 rounded-[14px] border-2 border-dashed border-[#BFDBFE] bg-[rgba(37,99,235,0.05)] cursor-pointer hover:opacity-90 transition-opacity active:scale-[.99]">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={handleFileChange}
        />
        <div className="w-12 h-12 rounded-full bg-[#2563EB]/10 flex items-center justify-center pointer-events-none">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="2"
              y="5"
              width="20"
              height="16"
              rx="3"
              stroke="#2563EB"
              strokeWidth="1.75"
            />
            <circle cx="12" cy="13" r="4" stroke="#2563EB" strokeWidth="1.75" />
            <path
              d="M8 5l2-3h4l2 3"
              stroke="#2563EB"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-center pointer-events-none">
          <p className="font-body font-bold text-[13px] text-[#2563EB]">
            Take a photo or choose from gallery
          </p>
          <p className="font-caption text-[10px] font-light text-[var(--color-text-3)]">
            JPEG, PNG, or WebP (max 10MB)
          </p>
        </div>
      </label>

      {/* ── Image preview ── */}
      {previewUrl && (
        <div className="rounded-[14px] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected meal preview"
            className="w-full h-56 object-cover"
          />
        </div>
      )}

      {/* ── Analyse Meal button ── */}
      {!analysisResult && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selectedFile || isAnalyzing}
          loading={isAnalyzing}
          onClick={handleAnalyse}
        >
          Analyse Meal
        </Button>
      )}

      {/* ── Result card ── */}
      {analysisResult && (
        <div className="flex flex-col gap-3">
          {/* Food name + confidence badge */}
          <div className="flex items-center justify-between gap-2">
            <p className="font-body font-bold text-[15px] text-[var(--color-text-1)] capitalize">
              {analysisResult.food.replace(/_/g, " ")}
            </p>
            <span
              className={[
                "inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-bold",
                parseFloat(analysisResult.confidence) >= 50
                  ? "bg-[#22C55E]/10 text-[#22C55E]"
                  : "bg-[#F59E0B]/10 text-[#F59E0B]",
              ].join(" ")}
            >
              {Math.round(parseFloat(analysisResult.confidence))}% match
            </span>
          </div>

          {/* Macro grid (5 columns) */}
          <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 grid grid-cols-5 gap-2 text-center">
            <div className="flex flex-col gap-0.5">
              <span className="font-caption text-[10px] text-[var(--color-text-3)] uppercase tracking-wide">
                Kcal
              </span>
              <span className="font-body font-bold text-[13px] text-[var(--color-text-1)]">
                {analysisResult.macros.calories}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-caption text-[10px] text-[var(--color-text-3)] uppercase tracking-wide">
                Protein
              </span>
              <span className="font-body font-bold text-[13px] text-[var(--color-text-1)]">
                {analysisResult.macros.protein_g}g
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-caption text-[10px] text-[var(--color-text-3)] uppercase tracking-wide">
                Carbs
              </span>
              <span className="font-body font-bold text-[13px] text-[var(--color-text-1)]">
                {analysisResult.macros.carbs_g}g
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-caption text-[10px] text-[var(--color-text-3)] uppercase tracking-wide">
                Fat
              </span>
              <span className="font-body font-bold text-[13px] text-[var(--color-text-1)]">
                {analysisResult.macros.fat_g}g
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-caption text-[10px] text-[var(--color-text-3)] uppercase tracking-wide">
                Fiber
              </span>
              <span className="font-body font-bold text-[13px] text-[var(--color-text-1)]">
                {analysisResult.macros.fiber_g}g
              </span>
            </div>
          </div>

          {/* Top 3 alternative chips (shown when low_confidence) */}
          {analysisResult.low_confidence && (
            <div className="flex flex-col gap-2">
              <p className="font-body text-[13px] text-[var(--color-text-2)]">
                Low confidence — pick the correct option:
              </p>
              <div className="flex flex-col gap-2">
                {analysisResult.top3.map((item) => {
                  const isSelected = selectedAlternative === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setSelectedAlternative(item.name)}
                      className={[
                        "flex items-center justify-between w-full px-4 py-3 rounded-[12px] border text-left transition-colors",
                        isSelected
                          ? "border-[#2563EB] bg-[#2563EB]/10"
                          : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)]",
                      ].join(" ")}
                    >
                      <span className="font-body font-bold text-[13px] text-[var(--color-text-1)] capitalize">
                        {item.name.replace(/_/g, " ")}
                      </span>
                      <span
                        className={[
                          "text-[12px] font-bold",
                          isSelected
                            ? "text-[#2563EB]"
                            : "text-[var(--color-text-3)]",
                        ].join(" ")}
                      >
                        {Math.round(parseFloat(item.confidence))}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Log error message */}
          {logError && (
            <p
              role="alert"
              className="font-body text-[13px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-[10px] px-4 py-3"
            >
              {logError}
            </p>
          )}

          {/* Log This Meal button */}
          <Button
            variant="success"
            size="lg"
            fullWidth
            disabled={
              (analysisResult.low_confidence && !selectedAlternative) ||
              isLogging
            }
            loading={isLogging}
            onClick={handleLogMeal}
          >
            Log This Meal
          </Button>
        </div>
      )}
    </div>
  );
}
