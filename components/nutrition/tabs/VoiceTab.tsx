"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import ManualFallbackForm from "@/components/nutrition/ManualFallbackForm";
import type { MealType } from "@/lib/types/meal-log";
import type { DescriptionAnalysisResult } from "@/lib/types/claude";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabProps {
  userId: string;
  mealType: MealType;
  date: string;
  isActive: boolean;
  onSuccess: () => void;
  resetKey: number;
}

type VoiceState = "idle" | "recording" | "processing" | "result" | "error";

// ─── Browser detection ────────────────────────────────────────────────────────

function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceTab({
  userId,
  mealType,
  date,
  onSuccess,
  resetKey,
}: TabProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [analysisResult, setAnalysisResult] =
    useState<DescriptionAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();

  // ── Check browser support once ─────────────────────────────────────────────
  const isSpeechSupported = getSpeechRecognition() !== null;

  // ── Reset on resetKey change (modal close) ─────────────────────────────────
  useEffect(() => {
    // Stop any in-flight recognition
    if (speechEndTimerRef.current) {
      clearTimeout(speechEndTimerRef.current);
      speechEndTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore errors during cleanup
      }
      recognitionRef.current = null;
    }
    setVoiceState("idle");
    setTranscript("");
    setInterimTranscript("");
    setAnalysisResult(null);
    setErrorMsg(null);
    setIsLogging(false);
    setLogError(null);
    setShowFallback(false);
  }, [resetKey]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (speechEndTimerRef.current) {
        clearTimeout(speechEndTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // ── Submit transcript to analyze-description ──────────────────────────────
  const submitTranscript = useCallback(
    async (text: string) => {
      setVoiceState("processing");
      try {
        const res = await fetch("/api/nutrition/analyze-description", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: text, userId, mealType }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const data: DescriptionAnalysisResult = await res.json();
        setAnalysisResult(data);
        setVoiceState("result");
        setShowFallback(false);
      } catch {
        setVoiceState("error");
        setShowFallback(true);
      }
    },
    [userId, mealType],
  );

  // ── stopRecording (idempotent) ─────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (speechEndTimerRef.current) {
      clearTimeout(speechEndTimerRef.current);
      speechEndTimerRef.current = null;
    }
    if (!recognitionRef.current) return; // idempotent — ignore duplicate stops

    recognitionRef.current.stop();
    recognitionRef.current = null;

    // We read transcript from state — need the latest value via functional form
    setTranscript((currentTranscript) => {
      if (currentTranscript.trim()) {
        submitTranscript(currentTranscript.trim());
      } else {
        setVoiceState("idle");
      }
      return currentTranscript;
    });
  }, [submitTranscript]);

  // ── startRecording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) return;

    // Reset transient state for a fresh recording
    setTranscript("");
    setInterimTranscript("");
    setErrorMsg(null);

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      // Use index-based loop since SpeechRecognitionResultList isn't iterable
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim);
      if (final) {
        setTranscript((prev) => prev + final);
      }
    };

    recognition.onspeechend = () => {
      // 3-second silence timeout before auto-stop
      speechEndTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 3000);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      recognitionRef.current = null;
      setVoiceState("error");

      if (event.error === "not-allowed") {
        setErrorMsg(
          "Microphone permission denied. Please allow microphone access and try again.",
        );
      } else if (event.error === "no-speech") {
        setErrorMsg("No speech detected. Please try again.");
      } else {
        setErrorMsg("Voice recognition failed. Please try again.");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setVoiceState("recording");
  }, [stopRecording]);

  // ── Mic button click handler ───────────────────────────────────────────────
  const handleMicClick = useCallback(() => {
    if (voiceState === "idle") {
      startRecording();
    } else if (voiceState === "recording") {
      stopRecording();
    } else {
      // result or error — reset and start fresh
      setVoiceState("idle");
      setTranscript("");
      setInterimTranscript("");
      setAnalysisResult(null);
      setErrorMsg(null);
      setShowFallback(false);
      startRecording();
    }
  }, [voiceState, startRecording, stopRecording]);

  // ── Log This Meal ──────────────────────────────────────────────────────────
  const handleLogMeal = useCallback(async () => {
    if (!analysisResult) return;
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
          confidence: analysisResult.confidence / 100,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      await queryClient.invalidateQueries({
        queryKey: ["meal-logs", userId, date],
      });
      onSuccess();
    } catch {
      setLogError("Failed to log meal — please try again.");
    } finally {
      setIsLogging(false);
    }
  }, [analysisResult, userId, date, mealType, queryClient, onSuccess]);

  // ── Unsupported browser fallback ───────────────────────────────────────────
  if (!isSpeechSupported) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center">
          <MicOffIcon />
        </div>
        <p className="font-body text-[14px] text-[var(--color-text-2)]">
          Voice input is not supported in this browser. Please use the Describe
          tab instead.
        </p>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* ── Mic button ── */}
      <div className="flex flex-col items-center gap-3 w-full">
        {voiceState === "recording" ? (
          <motion.button
            type="button"
            aria-label="Stop recording"
            onClick={handleMicClick}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <MicIcon />
          </motion.button>
        ) : voiceState === "processing" ? (
          <button
            type="button"
            disabled
            aria-label="Processing…"
            className="w-20 h-20 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg opacity-80 cursor-not-allowed"
          >
            <SpinnerIcon />
          </button>
        ) : (
          <button
            type="button"
            aria-label={
              voiceState === "idle" ? "Start recording" : "Record again"
            }
            onClick={handleMicClick}
            className="w-20 h-20 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg hover:bg-[#1D4ED8] active:bg-[#1E40AF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            <MicIcon />
          </button>
        )}

        {/* State label */}
        <p className="font-body text-[13px] text-[var(--color-text-3)]">
          {voiceState === "idle" && "Tap to speak"}
          {voiceState === "recording" && "Listening… tap to stop"}
          {voiceState === "processing" && "Analysing…"}
          {voiceState === "result" && "Tap mic to record again"}
          {voiceState === "error" && "Tap mic to try again"}
        </p>
      </div>

      {/* ── Live transcript ── */}
      {(transcript || interimTranscript) && (
        <div className="w-full rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 min-h-[56px]">
          <p className="font-body text-[14px] text-[var(--color-text-1)]">
            {transcript}
            {interimTranscript && (
              <span className="text-[var(--color-text-3)]">
                {interimTranscript}
              </span>
            )}
          </p>
        </div>
      )}

      {/* ── Speech error message ── */}
      {errorMsg && (
        <p
          role="alert"
          className="w-full font-body text-[13px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-[10px] px-4 py-3"
        >
          {errorMsg}
        </p>
      )}

      {/* ── Result card — same layout as DescribeTab ── */}
      {voiceState === "result" && analysisResult && (
        <div className="flex flex-col gap-4 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 w-full">
          {/* Header: meal name + confidence badge */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading text-[16px] font-bold text-[var(--color-text-1)] leading-snug flex-1">
              {analysisResult.meal_name}
            </h3>
            <span
              className={[
                "shrink-0 px-2.5 py-0.5 rounded-full text-[12px] font-body font-bold",
                analysisResult.confidence >= 70
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                  : analysisResult.confidence >= 50
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
              ].join(" ")}
              aria-label={`Confidence: ${analysisResult.confidence}%`}
            >
              {analysisResult.confidence}% confident
            </span>
          </div>

          {/* Macro grid */}
          <div className="grid grid-cols-5 gap-2">
            <MacroCell label="Calories" value={analysisResult.calories} unit="kcal" />
            <MacroCell label="Protein" value={analysisResult.protein_g} unit="g" />
            <MacroCell label="Carbs" value={analysisResult.carbs_g} unit="g" />
            <MacroCell label="Fat" value={analysisResult.fat_g} unit="g" />
            <MacroCell label="Fiber" value={analysisResult.fiber_g} unit="g" />
          </div>

          {/* Assumptions note */}
          {analysisResult.assumptions && (
            <p className="font-caption text-[12px] text-[var(--color-text-3)] leading-relaxed">
              <span className="font-bold text-[var(--color-text-2)]">Assumptions: </span>
              {analysisResult.assumptions}
            </p>
          )}

          {/* Items chips */}
          {analysisResult.items.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Identified items">
              {analysisResult.items.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 rounded-full bg-[var(--color-surface-1)] border border-[var(--color-border)] font-caption text-[11px] text-[var(--color-text-2)]"
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          {/* Log error */}
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
            variant="primary"
            size="lg"
            fullWidth
            disabled={isLogging}
            loading={isLogging}
            onClick={handleLogMeal}
          >
            {!isLogging && "Log This Meal"}
          </Button>
        </div>
      )}

      {/* ── Manual fallback ── */}
      {showFallback && (
        <div className="w-full">
          <p className="font-body text-[13px] text-[var(--color-text-2)] mb-3">
            Analysis failed — enter macros manually:
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

// ─── Small helper components ──────────────────────────────────────────────────

function MacroCell({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-caption text-[10px] text-[var(--color-text-3)] uppercase tracking-wide">
        {label}
      </span>
      <span className="font-body font-bold text-[13px] text-[var(--color-text-1)]">
        {value}
        <span className="font-caption text-[10px] text-[var(--color-text-3)] ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5 10a7 7 0 0014 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="17"
        x2="12"
        y2="22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="22"
        x2="16"
        y2="22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.75" strokeOpacity=".4" />
      <path
        d="M5 10a7 7 0 0014 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity=".4"
      />
      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3" />
      <path
        d="M12 2a10 10 0 0110 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
