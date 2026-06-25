"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import DonutRing from "@/components/ui/DonutRing";
import ProgressBar from "@/components/ui/ProgressBar";
import PageHeader from "@/components/layout/PageHeader";
import GlowCard from "@/components/ui/GlowCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CountUp from "@/components/ui/CountUp";
import ClickSpark from "@/components/ui/ClickSpark";
import { useUserStore } from "@/lib/store/user";

/* ── Types ── */
type MealName = "Breakfast" | "Lunch" | "Dinner" | "Snacks";
type LogMode  = "search" | "describe" | "photo" | "previous" | null;

interface MealEntry {
  items: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
}

interface Prediction {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  warnings?: string[];
}

/* ── Quiz types for describe mode ── */
interface DescribeQuiz {
  source: "home" | "restaurant" | "packaged" | null;
  portions: string;
  oilLevel: "none" | "less" | "moderate" | "heavy" | null;
  cookMethod: "raw" | "boiled" | "fried" | "grilled" | "baked" | null;
}

const QUIZ_DEFAULTS: DescribeQuiz = {
  source: null,
  portions: "1",
  oilLevel: null,
  cookMethod: null,
};

/* ── Previous meals bank ── */
const PREVIOUS_MEALS = [
  { name: "Oats + Banana + Milk",    kcal: 380, protein: 18, carbs: 62, fat: 6,  tags: ["Breakfast"] },
  { name: "Chicken Rice Bowl",       kcal: 560, protein: 42, carbs: 58, fat: 14, tags: ["Lunch"] },
  { name: "Dal + 2 Roti",            kcal: 420, protein: 22, carbs: 64, fat: 10, tags: ["Lunch", "Dinner"] },
  { name: "Paneer Sabzi + Rice",     kcal: 490, protein: 26, carbs: 56, fat: 18, tags: ["Lunch", "Dinner"] },
  { name: "Greek Yogurt Parfait",    kcal: 310, protein: 28, carbs: 36, fat: 8,  tags: ["Breakfast", "Snacks"] },
  { name: "Egg White Omelette",      kcal: 220, protein: 30, carbs: 4,  fat: 9,  tags: ["Breakfast"] },
  { name: "Protein Shake + Banana",  kcal: 340, protein: 34, carbs: 42, fat: 4,  tags: ["Snacks"] },
  { name: "Sprout Salad",            kcal: 180, protein: 12, carbs: 28, fat: 3,  tags: ["Snacks", "Breakfast"] },
];

/* ── Build AI predictions based on profile ── */
function buildPrediction(text: string, quiz: DescribeQuiz, allergies: string[], medicalConditions: string[], bmiCategory: string): Prediction {
  const lowerText = text.toLowerCase();

  // Simple heuristic matching
  let base = { name: "Mixed Meal", kcal: 400, protein: 20, carbs: 50, fat: 12 };

  if (lowerText.includes("biryani")) base = { name: "Chicken Biryani", kcal: 520, protein: 36, carbs: 58, fat: 14 };
  else if (lowerText.includes("roti") || lowerText.includes("chapati")) base = { name: "Roti + Sabzi", kcal: 380, protein: 14, carbs: 62, fat: 10 };
  else if (lowerText.includes("rice") && lowerText.includes("dal")) base = { name: "Dal Rice", kcal: 430, protein: 16, carbs: 72, fat: 8 };
  else if (lowerText.includes("oats")) base = { name: "Oatmeal Bowl", kcal: 310, protein: 12, carbs: 56, fat: 6 };
  else if (lowerText.includes("chicken")) base = { name: "Chicken Dish", kcal: 480, protein: 42, carbs: 18, fat: 16 };
  else if (lowerText.includes("salad")) base = { name: "Salad Bowl", kcal: 180, protein: 8, carbs: 24, fat: 7 };
  else if (lowerText.includes("egg")) base = { name: "Egg Dish", kcal: 280, protein: 26, carbs: 4, fat: 16 };
  else if (lowerText.includes("pasta")) base = { name: "Pasta", kcal: 550, protein: 18, carbs: 82, fat: 14 };

  // Oil level modifier
  const oilMod = quiz.oilLevel === "heavy" ? 1.25 : quiz.oilLevel === "moderate" ? 1.1 : quiz.oilLevel === "less" ? 0.9 : 1;
  // Portions modifier
  const portMod = parseFloat(quiz.portions) || 1;
  // Cook method modifier
  const cookMod = quiz.cookMethod === "fried" ? 1.3 : quiz.cookMethod === "boiled" ? 0.85 : quiz.cookMethod === "raw" ? 0.9 : 1;
  // Source modifier (restaurant meals are typically higher calorie)
  const srcMod = quiz.source === "restaurant" ? 1.2 : quiz.source === "packaged" ? 1.05 : 1;

  const totalMod = oilMod * portMod * cookMod * srcMod;

  const warnings: string[] = [];

  // Allergy check
  const lowerName = base.name.toLowerCase();
  if (allergies.includes("Dairy") && (lowerText.includes("milk") || lowerText.includes("paneer") || lowerText.includes("cheese") || lowerText.includes("yogurt"))) {
    warnings.push("Contains dairy — flagged against your allergy profile");
  }
  if (allergies.includes("Gluten") && (lowerText.includes("roti") || lowerText.includes("bread") || lowerText.includes("pasta") || lowerText.includes("wheat"))) {
    warnings.push("Contains gluten — flagged against your allergy profile");
  }
  if (allergies.includes("Nuts") && (lowerText.includes("nut") || lowerText.includes("almond") || lowerText.includes("cashew"))) {
    warnings.push("May contain nuts — flagged against your allergy profile");
  }

  // Medical condition check
  if (medicalConditions.includes("Diabetes (Type 2)") && base.carbs * totalMod > 60) {
    warnings.push("High carbs — consider reducing portion for diabetes management");
  }
  if (medicalConditions.includes("Hypertension") && quiz.source === "restaurant") {
    warnings.push("Restaurant meals are typically high in sodium — watch intake");
  }

  // BMI-based check
  if (bmiCategory === "Obese" && base.kcal * totalMod > 600) {
    warnings.push("High calorie meal — Andi recommends limiting to 500 kcal per meal");
  }

  return {
    name: base.name,
    kcal: Math.round(base.kcal * totalMod),
    protein: Math.round(base.protein * portMod),
    carbs: Math.round(base.carbs * totalMod * 0.9),
    fat: Math.round(base.fat * oilMod * portMod),
    confidence: quiz.source && quiz.oilLevel && quiz.cookMethod ? 91 : 74,
    warnings,
  };
}

/* ── Build personalised recommendations ── */
function buildRecommendations(allergies: string[], foodPrefs: string[], medicalConditions: string[], bmiCategory: string) {
  type Rec = { name: string; kcal: number; protein: number; reason: string; tags: string[] };
  const ALL_RECS: Rec[] = [
    { name: "Grilled Chicken + Brown Rice",  kcal: 480, protein: 42, reason: "High protein, supports muscle",   tags: ["non-veg", "keto-friendly"] },
    { name: "Greek Yogurt Parfait",           kcal: 310, protein: 28, reason: "Quick, protein-dense breakfast",  tags: ["vegetarian", "dairy"] },
    { name: "Paneer Tikka + Roti",            kcal: 520, protein: 34, reason: "Vegetarian, macro-balanced",      tags: ["vegetarian", "dairy", "gluten"] },
    { name: "Egg White Omelette",             kcal: 220, protein: 30, reason: "Low calorie, high protein",       tags: ["vegetarian-egg"] },
    { name: "Sprout Salad + Lemon Dressing",  kcal: 160, protein: 10, reason: "Low cal, fibre-rich, diabetic-safe", tags: ["vegan", "diabetic-safe"] },
    { name: "Moong Dal + Quinoa Bowl",        kcal: 390, protein: 24, reason: "Plant protein, heart-healthy",    tags: ["vegan", "gluten-free", "hypertension-safe"] },
    { name: "Salmon + Steamed Vegetables",   kcal: 420, protein: 38, reason: "Omega-3, heart-healthy, weight loss", tags: ["non-veg", "keto-friendly", "gluten-free"] },
    { name: "Avocado Toast + Boiled Eggs",   kcal: 380, protein: 22, reason: "Healthy fats, sustained energy",   tags: ["vegetarian-egg", "gluten"] },
    { name: "Tofu Stir-Fry + Brown Rice",    kcal: 440, protein: 28, reason: "Vegan protein, balanced macros",   tags: ["vegan", "gluten-free"] },
    { name: "Banana + Peanut Butter Smoothie", kcal: 340, protein: 18, reason: "Quick energy, pre-workout",     tags: ["vegan", "nuts"] },
  ];

  return ALL_RECS.filter(r => {
    // Filter out allergens
    if (allergies.includes("Dairy") && r.tags.includes("dairy")) return false;
    if (allergies.includes("Gluten") && r.tags.includes("gluten")) return false;
    if (allergies.includes("Nuts") && r.tags.includes("nuts")) return false;

    // Filter by food preference
    const isVegan = foodPrefs.includes("Vegan");
    const isVeg = foodPrefs.includes("Vegetarian");
    if (isVegan && !r.tags.includes("vegan")) return false;
    if (isVeg && r.tags.includes("non-veg")) return false;

    // BMI-based filter
    if (bmiCategory === "Obese" && r.kcal > 500) return false;

    // Diabetic
    if (medicalConditions.some(c => c.includes("Diabetes")) && !r.tags.includes("diabetic-safe") && r.kcal > 450) return false;

    return true;
  }).slice(0, 4);
}

/* ── Describe Quiz ── */
function DescribeQuizPanel({ quiz, onChange }: { quiz: DescribeQuiz; onChange: (q: DescribeQuiz) => void }) {
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="flex flex-col gap-4 overflow-hidden">

      {/* Source */}
      <div>
        <p className="font-body font-bold text-[11px] text-[var(--color-text-2)] mb-2">Was this meal…</p>
        <div className="grid grid-cols-3 gap-2">
          {([["home", "Home-cooked", <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8L8 3l6 5v6H11v-4H7v4H2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>],
            ["restaurant", "From restaurant", <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 14V6M4 6a2 2 0 000-4M4 2v4M12 2v3a3 3 0 01-3 3v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>],
            ["packaged", "Packaged", <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 4V3a1 1 0 012 0v1M9 4V3a1 1 0 012 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>],
          ] as const).map(([val, label, icon]) => (
            <button key={val} onClick={() => onChange({ ...quiz, source: val })}
              className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-[10px] border-2 text-center transition-all ${quiz.source === val ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]" : "border-[var(--color-border)] text-[var(--color-text-3)]"}`}>
              {icon}
              <span className="font-caption text-[8px] font-light leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cook method */}
      <div>
        <p className="font-body font-bold text-[11px] text-[var(--color-text-2)] mb-2">How was it cooked?</p>
        <div className="flex gap-2 flex-wrap">
          {(["raw", "boiled", "fried", "grilled", "baked"] as const).map(m => (
            <button key={m} onClick={() => onChange({ ...quiz, cookMethod: m })}
              className={`px-3 py-1.5 rounded-[8px] border font-caption text-[10px] font-light capitalize transition-all ${quiz.cookMethod === m ? "border-[#2563EB] bg-[#2563EB]/10 text-[#2563EB]" : "border-[var(--color-border)] text-[var(--color-text-3)]"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Oil level */}
      <div>
        <p className="font-body font-bold text-[11px] text-[var(--color-text-2)] mb-2">Oil / fat used?</p>
        <div className="grid grid-cols-4 gap-2">
          {([["none", "None"], ["less", "Light"], ["moderate", "Moderate"], ["heavy", "Heavy"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => onChange({ ...quiz, oilLevel: val })}
              className={`py-2 rounded-[8px] border font-caption text-[9px] font-light transition-all ${quiz.oilLevel === val ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[var(--color-border)] text-[var(--color-text-3)]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Portions */}
      <div>
        <p className="font-body font-bold text-[11px] text-[var(--color-text-2)] mb-2">Portions / servings</p>
        <div className="flex items-center gap-3">
          <button onClick={() => onChange({ ...quiz, portions: String(Math.max(0.5, parseFloat(quiz.portions) - 0.5)) })}
            className="w-8 h-8 rounded-[8px] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-1)]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <span className="font-metric text-[1.125rem] text-[var(--color-text-1)] w-8 text-center">{quiz.portions}</span>
          <button onClick={() => onChange({ ...quiz, portions: String(parseFloat(quiz.portions) + 0.5) })}
            className="w-8 h-8 rounded-[8px] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-1)]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <span className="font-caption text-[10px] font-light text-[var(--color-text-3)]">serving(s)</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Warning badges ── */
function WarningBadges({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 rounded-[10px] bg-[#FFF7ED] border border-[#FED7AA]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
            <path d="M7 1.5L13 12.5H1L7 1.5z" stroke="#F59E0B" strokeWidth="1.25" strokeLinejoin="round"/>
            <path d="M7 5.5v3M7 10v.5" stroke="#F59E0B" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
          <p className="font-caption text-[9px] font-light text-[#92400E] leading-relaxed">{w}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Prediction Result Card ── */
function PredictionCard({ pred, onConfirm, onRedo, meal }: {
  pred: Prediction;
  onConfirm: () => void;
  onRedo: () => void;
  meal: MealName;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
      <div className="rounded-[14px] border border-[#BBF7D0] p-4" style={{ background: "var(--color-success-light)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-body font-bold text-[13px] text-[var(--color-text-1)]">{pred.name}</p>
          <span className="font-caption text-[10px] text-[#22C55E] bg-[#DCFCE7] border border-[#BBF7D0] px-2 py-0.5 rounded-full">{pred.confidence}% match</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {([["Kcal", pred.kcal, "#2563EB"], ["Protein", `${pred.protein}g`, "#22C55E"], ["Carbs", `${pred.carbs}g`, "#F59E0B"], ["Fat", `${pred.fat}g`, "#EF4444"]] as const).map(([l, v, c]) => (
            <div key={l as string} className="rounded-[8px] bg-[var(--color-surface)] border border-[var(--color-border)] p-2 text-center">
              <p className="font-metric text-[1rem]" style={{ color: c as string }}>{v}</p>
              <p className="font-caption text-[8px] font-light text-[var(--color-text-3)]">{l}</p>
            </div>
          ))}
        </div>
        <WarningBadges warnings={pred.warnings || []} />
      </div>
      <div className="flex gap-2">
        <button onClick={onRedo}
          className="flex-1 h-11 rounded-[12px] border border-[var(--color-border)] text-[var(--color-text-2)] font-body font-bold text-[13px] hover:bg-[var(--color-surface-2)] transition-colors">
          Re-estimate
        </button>
        <ClickSpark color="#22C55E" className="flex-1">
          <button onClick={onConfirm}
            className="w-full h-11 rounded-[12px] bg-[#22C55E] text-white font-body font-bold text-[13px] hover:bg-[#16A34A] transition-colors active:scale-[.98]">
            Add to {meal}
          </button>
        </ClickSpark>
      </div>
    </motion.div>
  );
}

/* ── Meal Log Modal ── */
function MealLogModal({
  meal, onClose, onLog, allergies, medicalConditions, bmiCategory,
}: {
  meal: MealName;
  onClose: () => void;
  onLog: (entry: MealEntry) => void;
  allergies: string[];
  medicalConditions: string[];
  bmiCategory: string;
}) {
  const [mode, setMode]             = useState<LogMode>(null);
  const [describe, setDescribe]     = useState("");
  const [quiz, setQuiz]             = useState<DescribeQuiz>(QUIZ_DEFAULTS);
  const [showQuiz, setShowQuiz]     = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [prevSearch, setPrevSearch] = useState("");

  const runDescribePredict = async () => {
    setPredicting(true);
    await new Promise(r => setTimeout(r, 1400));
    setPrediction(buildPrediction(describe, quiz, allergies, medicalConditions, bmiCategory));
    setPredicting(false);
  };

  const runPhotoPredict = async () => {
    setPredicting(true);
    await new Promise(r => setTimeout(r, 1800));
    setPrediction({
      name: "Chicken Biryani",
      kcal: 520,
      protein: 36,
      carbs: 58,
      fat: 14,
      confidence: 89,
      warnings: allergies.includes("Dairy") ? ["Contains ghee (dairy)" ] : [],
    });
    setPredicting(false);
  };

  const confirmLog = (pred: Prediction) => {
    onLog({
      items: [pred.name],
      kcal: pred.kcal,
      protein: pred.protein,
      carbs: pred.carbs,
      fat: pred.fat,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    });
    onClose();
  };

  const confirmPrevious = (item: typeof PREVIOUS_MEALS[0]) => {
    onLog({
      items: [item.name],
      kcal: item.kcal,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    });
    onClose();
  };

  const filteredPrev = PREVIOUS_MEALS.filter(m =>
    m.name.toLowerCase().includes(prevSearch.toLowerCase())
  );

  const back = () => { setMode(null); setPrediction(null); setDescribe(""); setQuiz(QUIZ_DEFAULTS); setShowQuiz(false); };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="w-full max-w-md bg-[var(--color-surface)] rounded-[20px] overflow-hidden shadow-[0_24px_80px_rgba(15,23,42,.25)] max-h-[88vh] flex flex-col"
        style={{ border: "1px solid var(--color-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div>
            <p className="font-heading text-[1rem] text-[var(--color-text-1)] tracking-wide">LOG {meal.toUpperCase()}</p>
            <p className="font-caption text-[10px] font-light text-[var(--color-text-3)]">
              {mode ? "← " : ""}Choose how to log your meal
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="var(--color-text-2)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Mode Selector ── */}
          {!mode && (
            <div className="p-5 flex flex-col gap-3">
              {[
                { id: "photo"    as LogMode, label: "AI Photo Analysis",    sub: "Snap or upload a photo of your meal",    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="5" width="18" height="14" rx="3" stroke="#2563EB" strokeWidth="1.75"/><circle cx="11" cy="12" r="3.5" stroke="#2563EB" strokeWidth="1.75"/><path d="M7 5l1.5-3h5L15 5" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>, color: "#2563EB", rgb: "37,99,235" },
                { id: "describe" as LogMode, label: "Describe Your Meal",    sub: "Tell Andi what you ate + cooking details", icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 7h14M4 11h10M4 15h7" stroke="#22C55E" strokeWidth="1.75" strokeLinecap="round"/></svg>, color: "#22C55E", rgb: "34,197,94" },
                { id: "previous" as LogMode, label: "Recent / Previous Meals", sub: "Quickly re-log meals you've had before",  icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#8B5CF6" strokeWidth="1.75"/><path d="M11 7v4l3 2" stroke="#8B5CF6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>, color: "#8B5CF6", rgb: "139,92,246" },
                { id: "search"   as LogMode, label: "Search Food Database",   sub: "500,000+ foods with exact macros",        icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="10" cy="10" r="6" stroke="#F59E0B" strokeWidth="1.75"/><path d="M16 16l3 3" stroke="#F59E0B" strokeWidth="1.75" strokeLinecap="round"/></svg>, color: "#F59E0B", rgb: "245,158,11" },
              ].map(opt => (
                <button key={opt.id} onClick={() => setMode(opt.id)}
                  className="flex items-center gap-4 p-4 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-left hover:border-[#2563EB]/30 transition-all active:scale-[.98]">
                  <div className="w-11 h-11 rounded-[11px] flex items-center justify-center flex-shrink-0" style={{ background: `rgba(${opt.rgb},.1)` }}>
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-bold text-[13px] text-[var(--color-text-1)]">{opt.label}</p>
                    <p className="font-caption text-[10px] font-light text-[var(--color-text-3)]">{opt.sub}</p>
                  </div>
                  <svg className="flex-shrink-0" width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1l4 4-4 4" stroke="var(--color-text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              ))}
            </div>
          )}

          {/* ── Describe mode ── */}
          {mode === "describe" && (
            <div className="p-5 flex flex-col gap-4">
              <button onClick={back} className="flex items-center gap-2 text-[var(--color-text-3)] hover:text-[var(--color-text-2)] transition-colors self-start">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="font-caption text-[11px] font-light">Back</span>
              </button>

              {!prediction ? (
                <>
                  <div>
                    <p className="font-body font-bold text-[13px] text-[var(--color-text-1)] mb-2">What did you eat?</p>
                    <textarea
                      value={describe}
                      onChange={e => setDescribe(e.target.value)}
                      placeholder="e.g. 2 rotis with dal and a glass of buttermilk…"
                      rows={3}
                      className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 font-body text-[13px] text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] focus:border-[#2563EB] focus:outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Quiz toggle */}
                  <button onClick={() => setShowQuiz(v => !v)}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] transition-colors hover:border-[#2563EB]/40">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#2563EB" strokeWidth="1.25"/><path d="M8 5v3.5M8 10.5v.5" stroke="#2563EB" strokeWidth="1.25" strokeLinecap="round"/></svg>
                      <span className="font-body font-bold text-[12px] text-[var(--color-text-1)]">Add cooking details</span>
                      <span className="font-caption text-[9px] font-light text-[#22C55E] bg-[#F0FDF4] border border-[#BBF7D0] px-1.5 py-0.5 rounded-full">+accuracy</span>
                    </div>
                    <motion.span animate={{ rotate: showQuiz ? 180 : 0 }} transition={{ duration: 0.25 }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="var(--color-text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {showQuiz && <DescribeQuizPanel quiz={quiz} onChange={setQuiz}/>}
                  </AnimatePresence>

                  <button onClick={runDescribePredict} disabled={!describe.trim() || predicting}
                    className="h-11 w-full rounded-[12px] bg-[#2563EB] text-white font-body font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#1D4ED8] transition-all active:scale-[.98]">
                    {predicting ? (
                      <>
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.75" strokeDasharray="22" strokeDashoffset="8"/></svg>
                        Analysing with Andi…
                      </>
                    ) : "Predict with AI"}
                  </button>
                </>
              ) : (
                <PredictionCard pred={prediction} onConfirm={() => confirmLog(prediction)} onRedo={() => setPrediction(null)} meal={meal}/>
              )}
            </div>
          )}

          {/* ── Photo mode ── */}
          {mode === "photo" && (
            <div className="p-5 flex flex-col gap-4">
              <button onClick={back} className="flex items-center gap-2 text-[var(--color-text-3)] hover:text-[var(--color-text-2)] transition-colors self-start">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="font-caption text-[11px] font-light">Back</span>
              </button>

              {!prediction ? (
                <div className="flex flex-col gap-3">
                  <div onClick={runPhotoPredict}
                    className="h-44 rounded-[14px] border-2 border-dashed border-[#BFDBFE] bg-[var(--color-primary-light)] flex flex-col items-center justify-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="16" rx="3" stroke="#2563EB" strokeWidth="1.75"/><circle cx="12" cy="13" r="4" stroke="#2563EB" strokeWidth="1.75"/><path d="M8 5l2-3h4l2 3" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div className="text-center">
                      <p className="font-body font-bold text-[13px] text-[var(--color-primary)]">Upload or capture photo</p>
                      <p className="font-caption text-[10px] font-light text-[var(--color-text-3)]">Tap to simulate AI analysis</p>
                    </div>
                  </div>
                  <button onClick={runPhotoPredict} disabled={predicting}
                    className="h-11 w-full rounded-[12px] bg-[#2563EB] text-white font-body font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition-colors">
                    {predicting ? (
                      <><svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.75" strokeDasharray="22" strokeDashoffset="8"/></svg>Analysing photo…</>
                    ) : "Analyse Food"}
                  </button>
                </div>
              ) : (
                <PredictionCard pred={prediction} onConfirm={() => confirmLog(prediction)} onRedo={() => setPrediction(null)} meal={meal}/>
              )}
            </div>
          )}

          {/* ── Previous meals ── */}
          {mode === "previous" && (
            <div className="p-5 flex flex-col gap-3">
              <button onClick={back} className="flex items-center gap-2 text-[var(--color-text-3)] hover:text-[var(--color-text-2)] transition-colors self-start">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="font-caption text-[11px] font-light">Back</span>
              </button>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="var(--color-text-3)" strokeWidth="1.25"/><path d="M10 10l2 2" stroke="var(--color-text-3)" strokeWidth="1.25" strokeLinecap="round"/></svg>
                <input value={prevSearch} onChange={e => setPrevSearch(e.target.value)}
                  placeholder="Search previous meals…"
                  className="h-10 w-full pl-8 pr-4 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] font-body text-[12px] text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] focus:border-[#2563EB] focus:outline-none transition-colors"/>
              </div>
              <div className="flex flex-col gap-2">
                {filteredPrev.map((item, i) => (
                  <motion.button key={i} whileTap={{ scale: 0.98 }} onClick={() => confirmPrevious(item)}
                    className="flex items-center justify-between p-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] text-left hover:border-[#8B5CF6]/40 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-bold text-[12px] text-[var(--color-text-1)] truncate">{item.name}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.tags.map(t => (
                          <span key={t} className="font-caption text-[8px] font-light px-1.5 py-0.5 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-metric text-[13px] text-[var(--color-text-1)]">{item.kcal} kcal</p>
                      <p className="font-caption text-[9px] font-light text-[var(--color-text-3)]">{item.protein}g protein</p>
                    </div>
                  </motion.button>
                ))}
                {filteredPrev.length === 0 && (
                  <p className="font-caption text-[11px] font-light text-[var(--color-text-3)] text-center py-4">No matches found</p>
                )}
              </div>
            </div>
          )}

          {/* ── Search mode ── */}
          {mode === "search" && (
            <div className="p-5 flex flex-col gap-3">
              <button onClick={back} className="flex items-center gap-2 text-[var(--color-text-3)] hover:text-[var(--color-text-2)] transition-colors self-start">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="font-caption text-[11px] font-light">Back</span>
              </button>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="var(--color-text-3)" strokeWidth="1.5"/><path d="M11 11l2.5 2.5" stroke="var(--color-text-3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <input placeholder="Search 500,000+ foods…"
                  className="h-11 w-full pl-9 pr-4 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] font-body text-[13px] text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] focus:border-[#2563EB] focus:outline-none transition-colors"/>
              </div>
              <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] text-center py-2">Start typing to search foods</p>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Page ── */
export default function NutritionPage() {
  const { allergies, foodPreferences, medicalConditions, bmiCategory } = useUserStore();

  const [logMeal, setLogMeal] = useState<MealName | null>(null);
  const [waterCount, setWaterCount] = useState(7);
  const [meals, setMeals] = useState([
    { name: "Breakfast" as MealName, time: "8:14 AM", items: ["Oats + Banana", "Milk"], kcal: 380, protein: 18, carbs: 62, fat: 6,  logged: true },
    { name: "Lunch"     as MealName, time: "1:30 PM", items: ["Chicken Rice Bowl"],     kcal: 560, protein: 42, carbs: 58, fat: 14, logged: true },
    { name: "Dinner"    as MealName, time: "",        items: [],                         kcal: 0,   protein: 0,  carbs: 0,  fat: 0,  logged: false },
    { name: "Snacks"    as MealName, time: "",        items: [],                         kcal: 0,   protein: 0,  carbs: 0,  fat: 0,  logged: false },
  ]);

  const handleLog = (mealName: MealName, entry: MealEntry) => {
    setMeals(ms => ms.map(m =>
      m.name === mealName
        ? { ...m, logged: true, time: entry.time, items: [...m.items, ...entry.items], kcal: m.kcal + entry.kcal, protein: m.protein + entry.protein, carbs: m.carbs + entry.carbs, fat: m.fat + entry.fat }
        : m
    ));
  };

  const totalKcal = meals.reduce((s, m) => s + m.kcal, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs, 0);
  const totalFat = meals.reduce((s, m) => s + m.fat, 0);
  const macros = [
    { label: "Protein", val: totalProtein, goal: 130, color: "#2563EB" },
    { label: "Carbs",   val: totalCarbs,   goal: 185, color: "#F59E0B" },
    { label: "Fat",     val: totalFat,     goal: 55,  color: "#EF4444" },
  ];

  const recommendations = buildRecommendations(allergies, foodPreferences, medicalConditions, bmiCategory);

  // Unlogged meals that need attention
  const unloggedMeals = meals.filter(m => !m.logged);
  const nextUnlogged = unloggedMeals[0];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="NUTRITION"
        subtitle={new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        action={
          <button onClick={() => setLogMeal(nextUnlogged?.name ?? "Snacks")}
            className="w-8 h-8 rounded-[8px] bg-[var(--color-primary)] flex items-center justify-center hover:opacity-90 transition-opacity">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.75" strokeLinecap="round"/></svg>
          </button>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-4">

        {/* Nudge card — if a meal is unlogged */}
        {nextUnlogged && (
          <ScrollReveal direction="down">
            <motion.button
              onClick={() => setLogMeal(nextUnlogged.name)}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-[14px] border border-dashed border-[#2563EB]/50 bg-[var(--color-primary-light)] text-left"
            >
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v5.5M8 10.5v.5" stroke="white" strokeWidth="1.75" strokeLinecap="round"/><circle cx="8" cy="8" r="6.5" stroke="white" strokeWidth="1.25"/></svg>
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="font-body font-bold text-[13px] text-[var(--color-primary)]">{nextUnlogged.name} not logged yet</p>
                <p className="font-caption text-[10px] font-light text-[var(--color-text-3)]">Tap to log your {nextUnlogged.name.toLowerCase()} now</p>
              </div>
              <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1l4 4-4 4" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.button>
          </ScrollReveal>
        )}

        {/* Calorie ring */}
        <ScrollReveal direction="up">
          <GlowCard glowColor="37,99,235">
            <div className="p-4 flex items-center gap-5">
              <DonutRing value={(totalKcal / 1850) * 100} size={96} stroke={10} color="#2563EB">
                <CountUp to={totalKcal} duration={1.4} className="font-metric text-[1.375rem] text-[var(--color-text-1)]"/>
                <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">kcal eaten</span>
              </DonutRing>
              <div className="flex-1">
                {[["GOAL", "1,850", "var(--color-text-1)"], ["REMAINING", String(Math.max(0, 1850 - totalKcal)), "#22C55E"], ["BURNED", "312", "#F59E0B"]].map(([l, v, c]) => (
                  <div key={l} className="flex justify-between mb-1.5">
                    <span className="font-caption text-[10px] font-light text-[var(--color-text-3)]">{l}</span>
                    <span className="font-metric text-[13px]" style={{ color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* Macros */}
        <ScrollReveal delay={0.05}>
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">MACROS</p>
              <div className="flex flex-col gap-3">
                {macros.map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between mb-1">
                      <span className="font-body font-bold text-[12px] text-[var(--color-text-2)]">{m.label}</span>
                      <span className="font-metric text-[12px] text-[var(--color-text-1)]">
                        {m.val}g <span className="font-caption text-[10px] text-[var(--color-text-3)]">/ {m.goal}g</span>
                      </span>
                    </div>
                    <ProgressBar value={Math.min((m.val / m.goal) * 100, 100)} color={m.color} height={5}/>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* Meal cards */}
        <ScrollReveal delay={0.07}>
          <GlowCard glowColor="34,197,94">
            <div className="p-4">
              <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">MEALS</p>
              <div className="flex flex-col gap-2">
                {meals.map(m => (
                  <motion.div key={m.name} layout whileHover={{ x: 2 }} transition={{ duration: 0.15 }}
                    className={`rounded-[12px] p-3 border transition-colors ${m.logged ? "bg-[var(--color-success-light)] border-[var(--color-success-mid)]" : "bg-[var(--color-surface-2)] border-dashed border-[var(--color-border)]"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-body font-bold text-[13px] text-[var(--color-text-1)]">{m.name}</p>
                          {!m.logged && (
                            <span className="font-caption text-[8px] font-light px-1.5 py-0.5 rounded-full bg-[#FFF7ED] border border-[#FED7AA] text-[#F59E0B]">Not logged</span>
                          )}
                        </div>
                        {m.logged
                          ? <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] truncate">{m.items.join(", ")} · {m.time}</p>
                          : <p className="font-caption text-[10px] font-light text-[var(--color-text-3)]">Tap to log your {m.name.toLowerCase()}</p>
                        }
                      </div>
                      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                        {m.logged && (
                          <div className="text-right">
                            <p className="font-metric text-[13px] text-[var(--color-success)]">{m.kcal}</p>
                            <p className="font-caption text-[9px] text-[var(--color-text-3)]">kcal</p>
                          </div>
                        )}
                        <button onClick={() => setLogMeal(m.name)}
                          className={`h-8 px-3 rounded-[8px] font-caption text-[10px] font-light transition-all active:scale-[.95] ${m.logged ? "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]" : "bg-[var(--color-primary)] text-white hover:opacity-90"}`}>
                          {m.logged ? "+ Add" : "Log now"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* Personalised AI Recommendations */}
        <ScrollReveal delay={0.09}>
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">ANDI RECOMMENDS</p>
                <span className="font-caption text-[9px] font-light text-[var(--color-primary)] bg-[var(--color-primary-light)] border border-[var(--color-primary-mid)] px-2 py-0.5 rounded-full">AI-matched</span>
              </div>

              {/* Profile tag row */}
              <div className="flex gap-1.5 flex-wrap mb-3 mt-1">
                {foodPreferences.filter(p => p !== "No preference").slice(0, 2).map(p => (
                  <span key={p} className="font-caption text-[8px] font-light px-1.5 py-0.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#22C55E]">{p}</span>
                ))}
                {allergies.filter(a => a !== "None").slice(0, 2).map(a => (
                  <span key={a} className="font-caption text-[8px] font-light px-1.5 py-0.5 rounded-full bg-[#FFF7ED] border border-[#FED7AA] text-[#F59E0B]">No {a}</span>
                ))}
                {bmiCategory && bmiCategory !== "Normal" && (
                  <span className="font-caption text-[8px] font-light px-1.5 py-0.5 rounded-full bg-[#EEF4FF] border border-[#BFDBFE] text-[#2563EB]">BMI {bmiCategory}</span>
                )}
              </div>

              {recommendations.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {recommendations.map((r, i) => (
                    <ScrollReveal key={r.name} delay={0.04 * i} direction="left">
                      <motion.button whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}
                        onClick={() => setLogMeal("Dinner")}
                        className="flex items-center gap-3 p-3 rounded-[12px] bg-[var(--color-surface-2)] border border-[var(--color-border)] w-full text-left hover:border-[var(--color-primary-mid)] transition-all">
                        <div className="w-9 h-9 rounded-[9px] bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="var(--color-primary)" strokeWidth="1.25"/><path d="M5.5 8a2.5 2.5 0 005 0" stroke="var(--color-primary)" strokeWidth="1.25" strokeLinecap="round"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body font-bold text-[12px] text-[var(--color-text-1)] truncate">{r.name}</p>
                          <p className="font-caption text-[9px] font-light text-[var(--color-text-3)]">{r.reason}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-metric text-[12px] text-[var(--color-text-1)]">{r.kcal}</p>
                          <p className="font-caption text-[9px] text-[var(--color-text-3)]">{r.protein}g P</p>
                        </div>
                      </motion.button>
                    </ScrollReveal>
                  ))}
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center gap-2">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="var(--color-border)" strokeWidth="1.5"/><path d="M16 10v6M16 19v1" stroke="var(--color-text-3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <p className="font-caption text-[11px] font-light text-[var(--color-text-3)] text-center">Complete your profile for personalised meal recommendations</p>
                  <Link href="/onboarding" className="font-caption text-[10px] font-light text-[var(--color-primary)]">Update preferences →</Link>
                </div>
              )}
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* Water */}
        <ScrollReveal delay={0.1}>
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">WATER</p>
                <span className="font-metric text-[12px] text-[var(--color-primary)]">
                  {(waterCount * 0.3).toFixed(1)} / 3.0 L
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <ClickSpark key={i} color="#2563EB">
                    <motion.div
                      whileTap={{ scale: 0.82 }}
                      transition={{ duration: 0.12 }}
                      onClick={() => setWaterCount(c => c === i + 1 ? i : i + 1)}
                      className={`w-7 h-9 rounded-[6px] border cursor-pointer transition-all ${i < waterCount ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "bg-[var(--color-surface-2)] border-[var(--color-border)]"}`}
                    />
                  </ClickSpark>
                ))}
              </div>
              <ProgressBar value={(waterCount / 10) * 100} color="#2563EB" height={4}/>
              <p className="font-caption text-[9px] font-light text-[var(--color-text-3)] mt-1.5">Each glass = 300 ml · Tap to track</p>
            </div>
          </GlowCard>
        </ScrollReveal>
      </div>

      {/* Meal log modal */}
      <AnimatePresence>
        {logMeal && (
          <MealLogModal
            meal={logMeal}
            onClose={() => setLogMeal(null)}
            onLog={(entry) => handleLog(logMeal, entry)}
            allergies={allergies}
            medicalConditions={medicalConditions}
            bmiCategory={bmiCategory}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
