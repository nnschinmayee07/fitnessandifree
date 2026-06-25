"use client";
import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";

const RESULTS = [
  { name: "Chicken Breast (100g)", brand: "Generic", kcal: 165, protein: 31 },
  { name: "Chicken Biryani (1 serving)", brand: "Homemade", kcal: 520, protein: 38 },
  { name: "Grilled Chicken Thigh", brand: "Generic", kcal: 209, protein: 26 },
];

export default function LogMealPage() {
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState("Lunch");
  const meals = ["Breakfast", "Lunch", "Dinner", "Snacks"];

  return (
    <div className="flex flex-col">
      <PageHeader title="LOG MEAL" back />
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Meal selector */}
        <div className="flex gap-2">
          {meals.map(m => (
            <button key={m} onClick={() => setMeal(m)}
              className={`flex-1 h-9 rounded-[9px] font-body font-bold text-[11px] border transition-all ${meal === m ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-transparent text-[var(--color-text-2)] border-[var(--color-border)]"}`}>
              {m}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="#94A3B8" strokeWidth="1.5"/>
            <path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search 500,000+ foods..."
            className="w-full h-12 pl-9 pr-4 rounded-[10px] border border-[var(--color-border)] bg-white font-body text-[14px] text-[#0F172A] placeholder:text-[var(--color-text-3)] focus:border-[#2563EB] focus:outline-none"/>
        </div>

        {/* Quick log methods */}
        <div className="flex gap-2">
          {[
            { label: "Scan barcode", href: "#" },
            { label: "AI photo",     href: "#" },
            { label: "Saved meals",  href: "#" },
          ].map(({ label }) => (
            <Chip key={label} variant="primary" className="cursor-pointer">{label}</Chip>
          ))}
        </div>

        {/* Results */}
        <div className="flex flex-col gap-2">
          {RESULTS.map(r => (
            <div key={r.name} className="flex items-center gap-3 p-3 rounded-[10px] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
              <div className="w-9 h-9 rounded-[9px] bg-[#EEF4FF] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="#2563EB" strokeWidth="1.5"/><path d="M5 8a3 3 0 006 0" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div className="flex-1">
                <p className="font-body font-bold text-[13px] text-[#0F172A]">{r.name}</p>
                <p className="font-caption text-[10px] font-light text-[var(--color-text-3)]">{r.brand} · {r.protein}g protein</p>
              </div>
              <div className="text-right">
                <p className="font-metric text-[13px] text-[#0F172A]">{r.kcal}</p>
                <p className="font-caption text-[9px] text-[var(--color-text-3)]">kcal</p>
              </div>
            </div>
          ))}
        </div>

        <Button variant="primary" fullWidth>Add to {meal}</Button>
      </div>
    </div>
  );
}

