"use client";

import { useState, useEffect, useCallback } from "react";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import PhotoTab from "@/components/nutrition/tabs/PhotoTab";
import DescribeTab from "@/components/nutrition/tabs/DescribeTab";
import VoiceTab from "@/components/nutrition/tabs/VoiceTab";
import type { MealType } from "@/lib/types/meal-log";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = "photo" | "describe" | "voice";

interface MealLoggingModalProps {
  isOpen: boolean;
  mealType: MealType;
  userId: string;
  date: string; // YYYY-MM-DD
  onClose: () => void;
  onSuccess: (mealType: MealType) => void;
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: Array<{ key: TabKey; label: string; Icon: () => React.ReactElement }> = [
  { key: "photo", label: "Photo", Icon: CameraIcon },
  { key: "describe", label: "Describe", Icon: PencilIcon },
  { key: "voice", label: "Voice", Icon: MicIcon },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MealLoggingModal({
  isOpen,
  mealType,
  userId,
  date,
  onClose,
  onSuccess,
}: MealLoggingModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("photo");
  const [resetKey, setResetKey] = useState(0);
  const scrollContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // Force scroll styles directly on the DOM element
      node.style.setProperty('overflow-y', 'scroll', 'important');
      node.style.setProperty('overflow-x', 'hidden', 'important');
      node.style.setProperty('-webkit-overflow-scrolling', 'touch');
    }
  }, []);

  // Reset active tab and increment resetKey whenever the modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("photo");
      setResetKey((k) => k + 1);
    }
  }, [isOpen]);

  // Called by any tab after a successful meal log.
  // Does NOT close the modal — the parent handles closing via onSuccess.
  const handleTabSuccess = useCallback(() => {
    onSuccess(mealType);
  }, [onSuccess, mealType]);

  const mealLabel =
    mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <AnimatePresence>
      {isOpen && (
        /* ── Overlay ── */
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Log ${mealLabel}`}
        >
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="relative z-10 h-[90vh] sm:max-h-[90vh] w-full sm:max-w-lg rounded-t-[24px] sm:rounded-[20px] bg-[var(--color-surface-1)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <h2 className="font-heading text-[18px] font-bold text-[var(--color-text-1)]">
                Log {mealLabel}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-2)] hover:bg-[var(--color-surface-3)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1"
              >
                <XIcon />
              </button>
            </div>

            {/* ── Tab bar ── */}
            <div
              className="flex gap-1 px-5 pb-4 shrink-0"
              role="tablist"
              aria-label="Input method"
            >
              {TABS.map(({ key, label, Icon }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`tab-panel-${key}`}
                    onClick={() => setActiveTab(key)}
                    className={[
                      "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[12px] transition-all duration-150 font-body text-[13px] font-bold",
                      isActive
                        ? "bg-[#2563EB] text-white shadow-[0_2px_12px_rgba(37,99,235,.30)]"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-2)] hover:bg-[var(--color-surface-3)]",
                    ].join(" ")}
                  >
                    <Icon />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── Tab panels — scrollable area ── */}
            <div
              ref={scrollContainerRef}
              className="flex-1 px-5 pb-6 force-scroll"
              style={{ 
                minHeight: 0,
                overscrollBehavior: "contain"
              }}
            >
              {/* Photo tab */}
              <div
                id="tab-panel-photo"
                role="tabpanel"
                aria-labelledby="tab-photo"
                style={{ display: activeTab === "photo" ? "block" : "none" }}
              >
                <PhotoTab
                  userId={userId}
                  mealType={mealType}
                  date={date}
                  isActive={activeTab === "photo"}
                  onSuccess={handleTabSuccess}
                  resetKey={resetKey}
                />
              </div>

              {/* Describe tab */}
              <div
                id="tab-panel-describe"
                role="tabpanel"
                aria-labelledby="tab-describe"
                style={{ display: activeTab === "describe" ? "block" : "none" }}
              >
                <DescribeTab
                  userId={userId}
                  mealType={mealType}
                  date={date}
                  isActive={activeTab === "describe"}
                  onSuccess={handleTabSuccess}
                  resetKey={resetKey}
                />
              </div>

              {/* Voice tab */}
              <div
                id="tab-panel-voice"
                role="tabpanel"
                aria-labelledby="tab-voice"
                style={{ display: activeTab === "voice" ? "block" : "none" }}
              >
                <VoiceTab
                  userId={userId}
                  mealType={mealType}
                  date={date}
                  isActive={activeTab === "voice"}
                  onSuccess={handleTabSuccess}
                  resetKey={resetKey}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg
      width="16"
      height="16"
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
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 5l2-3h4l2 3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="9"
        y="2"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.75"
      />
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

function XIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
