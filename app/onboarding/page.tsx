"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { useUserStore } from "@/lib/store/user";

const GOALS = [
  { id: "fat-loss",  label: "Lose Fat",         icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 4C9.58 4 6 7.58 6 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z" stroke="#2563EB" strokeWidth="1.75"/><path d="M10 12a4 4 0 008 0" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round"/></svg> },
  { id: "muscle",    label: "Build Muscle",      icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14h16M4 10h5M19 10h5M4 18h5M19 18h5" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round"/><rect x="4" y="8" width="5" height="12" rx="2.5" fill="none" stroke="#2563EB" strokeWidth="1.75"/><rect x="19" y="8" width="5" height="12" rx="2.5" fill="none" stroke="#2563EB" strokeWidth="1.75"/></svg> },
  { id: "endurance", label: "Endurance",         icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 20L9 13l6 4 9-11" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "health",    label: "Stay Healthy",       icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 22s-8-5-8-11a5 5 0 0110 0 5 5 0 0110 0c0 6-12 11-12 11z" stroke="#2563EB" strokeWidth="1.75" strokeLinejoin="round"/></svg> },
];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const FREQ = ["2–3 times", "4–5 times", "6–7 times"];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

const MEDICAL_OPTIONS = [
  "Diabetes (Type 1)", "Diabetes (Type 2)", "Hypertension", "Heart Condition",
  "Asthma", "Knee Injury", "Back Pain", "Shoulder Injury", "None of the above",
];
const FOOD_PREF_OPTIONS = [
  "Vegetarian", "Vegan", "Non-vegetarian", "Keto", "Mediterranean",
  "Paleo", "Intermittent Fasting", "No preference",
];
const ALLERGY_OPTIONS = [
  "Nuts", "Dairy", "Gluten", "Shellfish", "Eggs", "Soy", "Peanuts", "None",
];
const CONSTRAINT_OPTIONS = [
  "No gym access", "Home workouts only", "Limited time (<30 min)", "Low impact only",
  "No equipment", "Outdoor preferred", "No constraints",
];

const SPORT_MODES = [
  { id: "running",  label: "Running",  icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="6" r="2.5" stroke="#2563EB" strokeWidth="1.75"/><path d="M10 12l4-3 3 2.5 3-4M8 24l4-6 4 3 3-5" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "cycling",  label: "Cycling",  icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="8" cy="19" r="4" stroke="#2563EB" strokeWidth="1.75"/><circle cx="20" cy="19" r="4" stroke="#2563EB" strokeWidth="1.75"/><path d="M8 19l4-8 4 1 4-5M15 7h3" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "swimming", label: "Swimming", icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M4 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0M10 10c0-2 2-3 4-3s3 1 3 3" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round"/></svg> },
  { id: "hiit",     label: "HIIT",     icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 20L10 8l4 8 4-10 4 14" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "yoga",     label: "Yoga",     icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="6" r="2" stroke="#2563EB" strokeWidth="1.75"/><path d="M14 8v8M10 12l-4 6M18 12l4 6M10 24h8" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round"/></svg> },
  { id: "strength", label: "Strength", icon: <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M7 14h14M4 11h4M20 11h4M4 17h4M20 17h4" stroke="#2563EB" strokeWidth="1.75" strokeLinecap="round"/><rect x="4" y="9.5" width="4" height="9" rx="2" stroke="#2563EB" strokeWidth="1.75" fill="none"/><rect x="20" y="9.5" width="4" height="9" rx="2" stroke="#2563EB" strokeWidth="1.75" fill="none"/></svg> },
];

const STEPS = ["Goal", "Level", "Schedule", "Sports", "Medical", "Diet", "Profile"];

function MultiChip({ options, selected, onChange }: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (opt === "None" || opt === "None of the above" || opt === "No preference" || opt === "No constraints") {
      onChange([opt]);
      return;
    }
    const filtered = selected.filter(s => s !== "None" && s !== "None of the above" && s !== "No preference" && s !== "No constraints");
    if (filtered.includes(opt)) {
      onChange(filtered.filter(s => s !== opt));
    } else {
      onChange([...filtered, opt]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <motion.button
          key={opt}
          onClick={() => toggle(opt)}
          whileTap={{ scale: 0.95 }}
          className={`px-3.5 py-2 rounded-[10px] border-2 font-body text-[12px] transition-all ${selected.includes(opt) ? "border-[#2563EB] bg-[#2563EB]/15 text-white" : "border-white/15 bg-white/5 text-white/70"}`}
        >
          {opt}
        </motion.button>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);
  const computeBmi = useUserStore((s) => s.computeBmi);

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("");
  const [freq, setFreq] = useState("");
  const [sportModes, setSportModes] = useState<string[]>([]);
  const [medicalConditions, setMedicalConditions] = useState<string[]>(["None of the above"]);
  const [foodPreferences, setFoodPreferences] = useState<string[]>(["No preference"]);
  const [allergies, setAllergies] = useState<string[]>(["None"]);
  const [constraints, setConstraints] = useState<string[]>(["No constraints"]);
  const [weight, setWeight] = useState("74");
  const [height, setHeight] = useState("175");
  const [gender, setGender] = useState("Male");
  const [age, setAge] = useState("22");

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));
  const progress = ((step + 1) / STEPS.length) * 100;

  const finish = () => {
    setUser({
      goal,
      level,
      weightKg: parseFloat(weight) || 0,
      heightCm: parseFloat(height) || 0,
      gender,
      age: parseInt(age) || 0,
      medicalConditions,
      foodPreferences,
      allergies,
      constraints,
    });
    computeBmi();
    router.push("/dashboard");
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {step > 0 && (
          <button onClick={prev} className="w-8 h-8 rounded-[8px] bg-white/10 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            {STEPS.map((s, i) => (
              <span key={s} className={`font-caption text-[8px] font-light tracking-wider uppercase ${i === step ? "text-white" : i < step ? "text-[#2563EB]" : "text-white/25"}`}>{s}</span>
            ))}
          </div>
          <ProgressBar value={progress} color="#2563EB"/>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 flex flex-col"
        >
          {/* Step 0: Goal */}
          {step === 0 && (
            <>
              <h2 className="font-heading text-[1.875rem] text-white tracking-wide mb-1">WHAT&apos;S YOUR GOAL?</h2>
              <p className="font-caption text-[12px] font-light text-white/40 mb-6">Andi will build your plan around this.</p>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {GOALS.map(g => (
                  <motion.button key={g.id} onClick={() => setGoal(g.id)} whileTap={{ scale: 0.97 }}
                    className={`flex flex-col items-center justify-center gap-3 rounded-[16px] p-5 border-2 transition-all ${goal === g.id ? "border-[#2563EB] bg-[#2563EB]/15 shadow-[0_0_0_4px_rgba(37,99,235,.12)]" : "border-white/10 bg-white/5"}`}>
                    {g.icon}
                    <span className="font-body font-bold text-[13px] text-white text-center">{g.label}</span>
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {/* Step 1: Level */}
          {step === 1 && (
            <>
              <h2 className="font-heading text-[1.875rem] text-white tracking-wide mb-1">YOUR FITNESS LEVEL</h2>
              <p className="font-caption text-[12px] font-light text-white/40 mb-6">Be honest — Andi adjusts the intensity.</p>
              <div className="flex flex-col gap-3 flex-1">
                {LEVELS.map(l => (
                  <motion.button key={l} onClick={() => setLevel(l)} whileTap={{ scale: 0.98 }}
                    className={`h-16 rounded-[14px] border-2 text-left px-5 transition-all flex items-center justify-between ${level === l ? "border-[#2563EB] bg-[#2563EB]/15" : "border-white/10 bg-white/5"}`}>
                    <span className="font-heading text-[1.125rem] text-white tracking-wide">{l.toUpperCase()}</span>
                    {level === l && <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#2563EB"/><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Schedule */}
          {step === 2 && (
            <>
              <h2 className="font-heading text-[1.875rem] text-white tracking-wide mb-1">WEEKLY COMMITMENT</h2>
              <p className="font-caption text-[12px] font-light text-white/40 mb-6">How many workouts per week can you commit to?</p>
              <div className="flex flex-col gap-3 flex-1">
                {FREQ.map(f => (
                  <motion.button key={f} onClick={() => setFreq(f)} whileTap={{ scale: 0.98 }}
                    className={`h-16 rounded-[14px] border-2 px-5 transition-all flex items-center justify-between ${freq === f ? "border-[#2563EB] bg-[#2563EB]/15" : "border-white/10 bg-white/5"}`}>
                    <span className="font-body font-bold text-[14px] text-white">{f} per week</span>
                    {freq === f && <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#2563EB"/><path d="M6 10l3 3 5-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Sport Modes */}
          {step === 3 && (
            <>
              <h2 className="font-heading text-[1.875rem] text-white tracking-wide mb-1">SPORT MODES</h2>
              <p className="font-caption text-[12px] font-light text-white/40 mb-6">Pick the activities you enjoy. Select multiple.</p>
              <div className="grid grid-cols-2 gap-3 flex-1 content-start">
                {SPORT_MODES.map(s => {
                  const sel = sportModes.includes(s.id);
                  return (
                    <motion.button key={s.id}
                      onClick={() => setSportModes(p => sel ? p.filter(x => x !== s.id) : [...p, s.id])}
                      whileTap={{ scale: 0.97 }}
                      className={`flex flex-col items-center gap-2.5 rounded-[16px] py-5 px-3 border-2 transition-all ${sel ? "border-[#2563EB] bg-[#2563EB]/15" : "border-white/10 bg-white/5"}`}>
                      {s.icon}
                      <span className="font-body font-bold text-[12px] text-white">{s.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 4: Medical */}
          {step === 4 && (
            <>
              <h2 className="font-heading text-[1.875rem] text-white tracking-wide mb-1">HEALTH CONDITIONS</h2>
              <p className="font-caption text-[12px] font-light text-white/40 mb-4">Any medical conditions? Andi adapts your plan safely. Select all that apply.</p>
              <div className="flex-1 overflow-y-auto">
                <MultiChip options={MEDICAL_OPTIONS} selected={medicalConditions} onChange={setMedicalConditions}/>
                <div className="mt-6">
                  <p className="font-body font-bold text-[12px] text-white/60 mb-3">ALLERGIES</p>
                  <MultiChip options={ALLERGY_OPTIONS} selected={allergies} onChange={setAllergies}/>
                </div>
              </div>
            </>
          )}

          {/* Step 5: Diet */}
          {step === 5 && (
            <>
              <h2 className="font-heading text-[1.875rem] text-white tracking-wide mb-1">FOOD PREFERENCES</h2>
              <p className="font-caption text-[12px] font-light text-white/40 mb-4">Andi tailors your nutrition plan. Select all that apply.</p>
              <div className="flex-1 overflow-y-auto">
                <MultiChip options={FOOD_PREF_OPTIONS} selected={foodPreferences} onChange={setFoodPreferences}/>
                <div className="mt-6">
                  <p className="font-body font-bold text-[12px] text-white/60 mb-3">WORKOUT CONSTRAINTS</p>
                  <MultiChip options={CONSTRAINT_OPTIONS} selected={constraints} onChange={setConstraints}/>
                </div>
              </div>
            </>
          )}

          {/* Step 6: Profile */}
          {step === 6 && (
            <>
              <h2 className="font-heading text-[1.875rem] text-white tracking-wide mb-1">YOUR BODY</h2>
              <p className="font-caption text-[12px] font-light text-white/40 mb-6">Used to calculate BMI and calories accurately.</p>
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="font-body font-bold text-[12px] text-white/60 block mb-1.5">Weight (kg)</label>
                    <input value={weight} onChange={e => setWeight(e.target.value)} type="number"
                      className="w-full h-12 rounded-[10px] bg-white/10 border border-white/15 px-4 font-metric text-[1.25rem] text-white text-center focus:border-[#2563EB] focus:outline-none"/>
                  </div>
                  <div className="flex-1">
                    <label className="font-body font-bold text-[12px] text-white/60 block mb-1.5">Height (cm)</label>
                    <input value={height} onChange={e => setHeight(e.target.value)} type="number"
                      className="w-full h-12 rounded-[10px] bg-white/10 border border-white/15 px-4 font-metric text-[1.25rem] text-white text-center focus:border-[#2563EB] focus:outline-none"/>
                  </div>
                </div>

                <div>
                  <label className="font-body font-bold text-[12px] text-white/60 block mb-1.5">Gender</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENDERS.map(g => (
                      <motion.button key={g} onClick={() => setGender(g)} whileTap={{ scale: 0.97 }}
                        className={`h-11 rounded-[10px] border-2 font-body text-[12px] transition-all ${gender === g ? "border-[#2563EB] bg-[#2563EB]/15 text-white" : "border-white/15 bg-white/5 text-white/60"}`}>
                        {g}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-body font-bold text-[12px] text-white/60 block mb-1.5">Age</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)}
                    className="w-full h-12 rounded-[10px] bg-white/10 border border-white/15 px-4 font-metric text-[1.25rem] text-white text-center focus:border-[#2563EB] focus:outline-none"/>
                </div>

                {/* BMI preview */}
                {parseFloat(weight) > 0 && parseFloat(height) > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-4 rounded-[14px] bg-[#2563EB]/15 border border-[#2563EB]/30">
                    {(() => {
                      const h = parseFloat(height) / 100;
                      const bmi = Math.round((parseFloat(weight) / (h * h)) * 10) / 10;
                      const cat = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal weight" : bmi < 30 ? "Overweight" : "Obese";
                      const color = bmi < 18.5 ? "#60A5FA" : bmi < 25 ? "#4ADE80" : bmi < 30 ? "#FCD34D" : "#F87171";
                      return (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-caption text-[9px] font-light text-white/40 uppercase tracking-widest mb-0.5">Your BMI</p>
                            <p className="font-metric text-[2rem]" style={{ color }}>{bmi}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-body font-bold text-[13px] text-white" style={{ color }}>{cat}</p>
                            <p className="font-caption text-[9px] font-light text-white/40">Andi will adapt your plan</p>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6">
        {step < STEPS.length - 1 ? (
          <Button variant="primary" size="lg" fullWidth onClick={next}>Continue</Button>
        ) : (
          <Button variant="primary" size="lg" fullWidth onClick={finish}>Build My Plan</Button>
        )}
      </div>
    </div>
  );
}
