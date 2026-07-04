"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import GlowCard from "@/components/ui/GlowCard";
import ScrollReveal from "@/components/ui/ScrollReveal";
import CountUp from "@/components/ui/CountUp";
import { useUserStore } from "@/lib/store/user";
import { computeTargets } from "@/lib/nutrition/targets";
import WhatsAppOptInModal from "@/components/WhatsAppOptInModal";

/* ── Inline edit modal ── */
function EditModal({ onClose }: { onClose: () => void }) {
  const { firstName, lastName, email, weightKg, heightCm, age, gender, activityLevel, setUser } = useUserStore();
  const [form, setForm] = useState({
    firstName, lastName, email,
    weight: String(weightKg || ""),
    height: String(heightCm || ""),
    age: String(age || ""),
    gender,
    activityLevel: activityLevel || "moderately_active",
  });

  const save = () => {
    setUser({
      firstName: form.firstName,
      lastName: form.lastName,
      name: `${form.firstName} ${form.lastName}`,
      email: form.email,
      weightKg: parseFloat(form.weight) || weightKg,
      heightCm: parseFloat(form.height) || heightCm,
      age: parseInt(form.age) || age,
      gender: form.gender,
      activityLevel: form.activityLevel,
    });
    onClose();
  };

  const inp = "w-full h-11 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 font-body text-[13px] text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] focus:border-[#2563EB] focus:outline-none transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-md bg-[var(--color-surface)] rounded-[20px] overflow-hidden max-h-[88vh] flex flex-col"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <p className="font-heading text-[1rem] text-[var(--color-text-1)] tracking-wide">EDIT PROFILE</p>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="var(--color-text-2)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-body font-bold text-[11px] text-[var(--color-text-3)] block mb-1.5">First Name</label>
              <input className={inp} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name"/>
            </div>
            <div>
              <label className="font-body font-bold text-[11px] text-[var(--color-text-3)] block mb-1.5">Last Name</label>
              <input className={inp} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name"/>
            </div>
          </div>
          <div>
            <label className="font-body font-bold text-[11px] text-[var(--color-text-3)] block mb-1.5">Email</label>
            <input className={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com"/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-body font-bold text-[11px] text-[var(--color-text-3)] block mb-1.5">Weight (kg)</label>
              <input className={inp} type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}/>
            </div>
            <div>
              <label className="font-body font-bold text-[11px] text-[var(--color-text-3)] block mb-1.5">Height (cm)</label>
              <input className={inp} type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))}/>
            </div>
            <div>
              <label className="font-body font-bold text-[11px] text-[var(--color-text-3)] block mb-1.5">Age</label>
              <input className={inp} type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))}/>
            </div>
          </div>
          <div>
            <label className="font-body font-bold text-[11px] text-[var(--color-text-3)] block mb-1.5">Gender</label>
            <div className="grid grid-cols-2 gap-2">
              {["Male", "Female", "Non-binary", "Prefer not to say"].map(g => (
                <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))}
                  className={`h-10 rounded-[10px] border-2 font-body text-[12px] transition-all ${form.gender === g ? "border-[#2563EB] bg-[var(--color-primary-light)] text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-2)]"}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-body font-bold text-[11px] text-[var(--color-text-3)] block mb-1.5">Activity Level</label>
            <div className="flex flex-col gap-2">
              {[
                { value: "sedentary",          label: "Sedentary",           sub: "Desk job, little exercise" },
                { value: "lightly_active",     label: "Lightly Active",      sub: "1–3 days/week" },
                { value: "moderately_active",  label: "Moderately Active",   sub: "3–5 days/week" },
                { value: "very_active",        label: "Very Active",         sub: "6–7 days/week" },
                { value: "extra_active",       label: "Extra Active",        sub: "Twice daily / physical job" },
              ].map(({ value, label, sub }) => (
                <button key={value} onClick={() => setForm(f => ({ ...f, activityLevel: value }))}
                  className={`flex items-center justify-between h-12 px-3 rounded-[10px] border-2 font-body text-[12px] transition-all text-left ${form.activityLevel === value ? "border-[#2563EB] bg-[var(--color-primary-light)] text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-text-2)]"}`}>
                  <span className="font-bold">{label}</span>
                  <span className={`font-caption text-[10px] ${form.activityLevel === value ? "text-[#2563EB]/70" : "text-[var(--color-text-3)]"}`}>{sub}</span>
                </button>
              ))}
            </div>
          </div>        </div>
        <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-[12px] border border-[var(--color-border)] text-[var(--color-text-2)] font-body font-bold text-[13px]">Cancel</button>
          <button onClick={save} className="flex-1 h-11 rounded-[12px] bg-[#2563EB] text-white font-body font-bold text-[13px] hover:bg-[#1D4ED8] transition-colors">Save Changes</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Multi-select chip toggle ── */
const FOOD_PREFS   = ["Vegetarian","Vegan","Pescatarian","Keto","Paleo","Mediterranean","Gluten-free","Dairy-free","Low-carb","High-protein","Intermittent fasting","No preference"];
const ALLERGIES    = ["Peanuts","Tree nuts","Shellfish","Fish","Eggs","Milk/Dairy","Soy","Wheat/Gluten","Sesame","None"];
const MEDICAL      = ["Diabetes (Type 2)","Pre-diabetes","Hypertension","High cholesterol","Hypothyroidism","PCOS","Heart disease","Asthma","IBS / Gut issues","None of the above"];
const CONSTRAINTS  = ["Lower-back pain","Knee injury","Shoulder injury","No equipment","Limited time","Pregnant / Postpartum","Wheelchair user","No constraints"];
const GOAL_OPTIONS = ["fat-loss","muscle","endurance","health"];
const GOAL_LABELS: Record<string,string> = { "fat-loss":"Lose Fat","muscle":"Build Muscle","endurance":"Improve Endurance","health":"Stay Healthy" };
const LEVEL_OPTIONS = ["Beginner","Intermediate","Advanced","Athlete"];

function MultiChip({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.93 }} onClick={onClick}
      className="px-3 py-1.5 rounded-full border font-caption text-[10px] font-light transition-all select-none"
      style={{
        background:   active ? color + "18" : "var(--color-surface-2)",
        borderColor:  active ? color        : "var(--color-border)",
        color:        active ? color        : "var(--color-text-3)",
      }}>
      {label}
    </motion.button>
  );
}

function toggle(arr: string[], val: string, noneValue: string): string[] {
  if (val === noneValue) return [noneValue];
  const without = arr.filter(v => v !== noneValue);
  return without.includes(val) ? without.filter(v => v !== val) : [...without, val];
}

/* ── Preferences modal ── */
function PreferencesModal({ onClose }: { onClose: () => void }) {
  const store = useUserStore();
  const [tab, setTab] = useState<"diet"|"health"|"goal">("diet");
  const [foodPrefs, setFoodPrefs]       = useState<string[]>(store.foodPreferences   || []);
  const [allergies, setAllergies]       = useState<string[]>(store.allergies         || []);
  const [medical, setMedical]           = useState<string[]>(store.medicalConditions || []);
  const [constraints, setConstraints]   = useState<string[]>(store.constraints       || []);
  const [goal, setGoal]                 = useState(store.goal  || "");
  const [level, setLevel]               = useState(store.level || "");

  const save = () => {
    store.setUser({
      foodPreferences:   foodPrefs,
      allergies,
      medicalConditions: medical,
      constraints,
      goal,
      level,
    });
    onClose();
  };

  const tabs = [
    { id: "diet" as const,   label: "Diet" },
    { id: "health" as const, label: "Health" },
    { id: "goal" as const,   label: "Goal" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-md bg-[var(--color-surface)] rounded-[20px] overflow-hidden max-h-[90vh] flex flex-col"
        style={{ border: "1px solid var(--color-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <p className="font-heading text-[1rem] text-[var(--color-text-1)] tracking-wide">PREFERENCES</p>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="var(--color-text-2)" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-2 flex-shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 h-8 rounded-[8px] font-caption text-[11px] font-light transition-all"
              style={{
                background:  tab === t.id ? "var(--color-primary)" : "var(--color-surface-2)",
                color:       tab === t.id ? "white"                : "var(--color-text-2)",
                border:      tab === t.id ? "none"                 : "1px solid var(--color-border)",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-5">
          <AnimatePresence mode="wait">
            {tab === "diet" && (
              <motion.div key="diet" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }} className="flex flex-col gap-5">
                <div>
                  <p className="font-heading text-[.75rem] text-[var(--color-text-1)] tracking-wide mb-2">FOOD PREFERENCES</p>
                  <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mb-3">Choose all that apply. These filter your meal suggestions.</p>
                  <div className="flex flex-wrap gap-2">
                    {FOOD_PREFS.map(p => (
                      <MultiChip key={p} label={p} color="#22C55E"
                        active={foodPrefs.includes(p)}
                        onClick={() => setFoodPrefs(prev => toggle(prev, p, "No preference"))}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-heading text-[.75rem] text-[var(--color-text-1)] tracking-wide mb-2">ALLERGIES</p>
                  <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mb-3">Meals containing these ingredients will be flagged.</p>
                  <div className="flex flex-wrap gap-2">
                    {ALLERGIES.map(a => (
                      <MultiChip key={a} label={a} color="#F59E0B"
                        active={allergies.includes(a)}
                        onClick={() => setAllergies(prev => toggle(prev, a, "None"))}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {tab === "health" && (
              <motion.div key="health" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }} className="flex flex-col gap-5">
                <div>
                  <p className="font-heading text-[.75rem] text-[var(--color-text-1)] tracking-wide mb-2">MEDICAL CONDITIONS</p>
                  <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mb-3">Andi uses this to tailor meal and workout suggestions.</p>
                  <div className="flex flex-wrap gap-2">
                    {MEDICAL.map(m => (
                      <MultiChip key={m} label={m} color="#F87171"
                        active={medical.includes(m)}
                        onClick={() => setMedical(prev => toggle(prev, m, "None of the above"))}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-heading text-[.75rem] text-[var(--color-text-1)] tracking-wide mb-2">WORKOUT CONSTRAINTS</p>
                  <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mb-3">Workouts will be adapted to avoid aggravating these.</p>
                  <div className="flex flex-wrap gap-2">
                    {CONSTRAINTS.map(c => (
                      <MultiChip key={c} label={c} color="#A78BFA"
                        active={constraints.includes(c)}
                        onClick={() => setConstraints(prev => toggle(prev, c, "No constraints"))}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {tab === "goal" && (
              <motion.div key="goal" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }} className="flex flex-col gap-5">
                <div>
                  <p className="font-heading text-[.75rem] text-[var(--color-text-1)] tracking-wide mb-2">PRIMARY GOAL</p>
                  <div className="grid grid-cols-2 gap-2">
                    {GOAL_OPTIONS.map(g => (
                      <button key={g} onClick={() => setGoal(g)}
                        className="h-14 rounded-[12px] border-2 font-body text-[12px] font-bold transition-all flex flex-col items-center justify-center gap-0.5"
                        style={{
                          borderColor: goal === g ? "#2563EB" : "var(--color-border)",
                          background:  goal === g ? "var(--color-primary-light)" : "var(--color-surface-2)",
                          color:       goal === g ? "var(--color-primary)" : "var(--color-text-2)",
                        }}>
                        {GOAL_LABELS[g]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-heading text-[.75rem] text-[var(--color-text-1)] tracking-wide mb-2">FITNESS LEVEL</p>
                  <div className="grid grid-cols-2 gap-2">
                    {LEVEL_OPTIONS.map(l => (
                      <button key={l} onClick={() => setLevel(l)}
                        className="h-12 rounded-[12px] border-2 font-body text-[12px] font-bold transition-all"
                        style={{
                          borderColor: level === l ? "#2563EB" : "var(--color-border)",
                          background:  level === l ? "var(--color-primary-light)" : "var(--color-surface-2)",
                          color:       level === l ? "var(--color-primary)" : "var(--color-text-2)",
                        }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-[12px] border border-[var(--color-border)] text-[var(--color-text-2)] font-body font-bold text-[13px]">Cancel</button>
          <button onClick={save} className="flex-1 h-11 rounded-[12px] bg-[#2563EB] text-white font-body font-bold text-[13px] hover:bg-[#1D4ED8] transition-colors">Save Changes</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── BMI color helper ── */
function bmiColor(cat: string) {
  if (cat === "Underweight") return "#60A5FA";
  if (cat === "Normal")      return "#4ADE80";
  if (cat === "Overweight")  return "#FCD34D";
  if (cat === "Obese")       return "#F87171";
  return "var(--color-text-3)";
}

/* ── Stat tile ── */
function StatTile({ val, label, color = "var(--color-text-1)" }: { val: string | number; label: string; color?: string }) {
  return (
    <div className="bg-[var(--color-surface-2)] rounded-[14px] py-3.5 px-2 flex flex-col items-center border border-[var(--color-border)]">
      <span className="font-metric text-[1.375rem] leading-none" style={{ color }}>{val}</span>
      <span className="font-caption text-[8px] font-light text-[var(--color-text-3)] uppercase tracking-wide mt-1 text-center">{label}</span>
    </div>
  );
}

/* ── Row item (settings-style) ── */
function RowItem({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value?: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)] last:border-0">
      <div className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className={`font-body text-[13px] flex-1 ${accent ? "text-[var(--color-primary)]" : "text-[var(--color-text-1)]"}`}>{label}</span>
      {value && <span className="font-caption text-[11px] font-light text-[var(--color-text-3)]">{value}</span>}
      <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1l4 4-4 4" stroke="var(--color-text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}

/* ── Tag list ── */
function TagList({ items, color }: { items: string[]; color: string }) {
  const filtered = items.filter(i => !["None", "None of the above", "No preference", "No constraints"].includes(i));
  if (!filtered.length) return <span className="font-caption text-[10px] font-light text-[var(--color-text-3)]">Not set</span>;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {filtered.map(t => (
        <span key={t} className="font-caption text-[9px] font-light px-2 py-1 rounded-full border" style={{ color, borderColor: color + "40", background: color + "12" }}>{t}</span>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const store = useUserStore();
  const {
    name, firstName, lastName, email, avatar,
    goal, level, weightKg, heightCm, age, gender, activityLevel,
    isLoggedIn: _isLoggedIn,
    workoutStreak, nutritionStreak, waterStreak,
    bmi, bmiCategory,
    medicalConditions, foodPreferences, allergies, constraints,
    whatsappOptIn,
    isDark, toggleDark,
    logout,
  } = store;

  const [editOpen, setEditOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Computed
  const bmiVal = bmi || (() => {
    if (!weightKg || !heightCm) return 0;
    const h = heightCm / 100;
    return Math.round((weightKg / (h * h)) * 10) / 10;
  })();
  const bmiCat = bmiCategory || (bmiVal < 18.5 ? "Underweight" : bmiVal < 25 ? "Normal" : bmiVal < 30 ? "Overweight" : bmiVal > 0 ? "Obese" : "");
  const totalStreak = workoutStreak + nutritionStreak + waterStreak;

  const goalLabel: Record<string, string> = {
    "fat-loss": "Lose Fat", "muscle": "Build Muscle", "endurance": "Improve Endurance", "health": "Stay Healthy",
  };

  return (
    <div className="flex flex-col">
      <PageHeader title="PROFILE"
        action={
          <button onClick={() => setEditOpen(true)}
            className="w-8 h-8 rounded-[8px] bg-[var(--color-primary)] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-4">

        {/* ── Hero card ── */}
        <ScrollReveal direction="up">
          <GlowCard glowColor="37,99,235" className="border-0 overflow-hidden">
            <div className="relative">
              {/* Cover gradient */}
              <div className="h-24 bg-gradient-to-br from-[#0A1628] via-[#1E3A5F] to-[#0A2440]"/>
              {/* Avatar */}
              <div className="px-5 pb-4">
                <div className="flex items-end justify-between -mt-8 mb-3">
                  <motion.div whileHover={{ scale: 1.05 }} onClick={() => setEditOpen(true)}
                    className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] border-4 border-[var(--color-surface)] flex items-center justify-center cursor-pointer shadow-lg">
                    <span className="font-heading text-[1.375rem] text-[var(--color-primary)]">{avatar || "U"}</span>
                  </motion.div>
                  <button onClick={() => setEditOpen(true)}
                    className="h-8 px-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] font-caption text-[10px] font-light text-[var(--color-primary)]">
                    Edit Profile
                  </button>
                </div>
                <h2 className="font-heading text-[1.25rem] text-[var(--color-text-1)] tracking-wide leading-tight">
                  {(name || "—").toUpperCase()}
                </h2>
                <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mt-0.5">{email || "—"}</p>
                <div className="flex items-center gap-2 mt-2">
                  {goal && (
                    <span className="font-caption text-[9px] font-light px-2 py-1 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-primary-mid)] text-[var(--color-primary)]">
                      {goalLabel[goal] || goal}
                    </span>
                  )}
                  {level && (
                    <span className="font-caption text-[9px] font-light px-2 py-1 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-2)]">
                      {level}
                    </span>
                  )}
                  <span className="font-caption text-[9px] font-light text-[var(--color-text-3)]">Member since Jan 2026</span>
                </div>
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── Stats row ── */}
        <ScrollReveal delay={0.04}>
          <div className="grid grid-cols-4 gap-2">
            <StatTile val={`${workoutStreak}d`} label="Workout streak" color="#3B82F6"/>
            <StatTile val="48" label="Total workouts" color="var(--color-text-1)"/>
            <StatTile val="2.8kg" label="Weight lost" color="#4ADE80"/>
            <StatTile val={`${totalStreak}d`} label="All streaks" color="#F59E0B"/>
          </div>
        </ScrollReveal>

        {/* ── Body metrics ── */}
        <ScrollReveal delay={0.05}>
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">BODY METRICS</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="col-span-1 flex flex-col items-center justify-center bg-[var(--color-surface-2)] rounded-[12px] py-3 border border-[var(--color-border)]">
                  <span className="font-metric text-[1.25rem] leading-none" style={{ color: bmiColor(bmiCat) }}>
                    {bmiVal || "—"}
                  </span>
                  <span className="font-caption text-[7px] font-light text-[var(--color-text-3)] mt-0.5">BMI</span>
                  {bmiCat && <span className="font-caption text-[7px] font-light mt-1 text-center leading-tight" style={{ color: bmiColor(bmiCat) }}>{bmiCat}</span>}
                </div>
                {[
                  { label: "Weight", val: weightKg ? `${weightKg} kg` : "—" },
                  { label: "Height", val: heightCm ? `${heightCm} cm` : "—" },
                  { label: "Age",    val: age ? `${age} yr` : "—" },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center justify-center bg-[var(--color-surface-2)] rounded-[12px] py-3 border border-[var(--color-border)]">
                    <span className="font-metric text-[1.125rem] text-[var(--color-text-1)] leading-none">{s.val}</span>
                    <span className="font-caption text-[7px] font-light text-[var(--color-text-3)] mt-0.5">{s.label}</span>
                  </div>
                ))}
              </div>
              {/* Gender */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-[10px] bg-[var(--color-surface-2)] border border-[var(--color-border)]">
                <span className="font-body text-[12px] text-[var(--color-text-2)]">Gender</span>
                <span className="font-body font-bold text-[12px] text-[var(--color-text-1)]">{gender || "Not set"}</span>
              </div>
              {/* Activity Level */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-[10px] bg-[var(--color-surface-2)] border border-[var(--color-border)] mt-2">
                <span className="font-body text-[12px] text-[var(--color-text-2)]">Activity Level</span>
                <span className="font-body font-bold text-[12px] text-[var(--color-text-1)]">
                  {({
                    sedentary: "Sedentary",
                    lightly_active: "Lightly Active",
                    moderately_active: "Moderately Active",
                    very_active: "Very Active",
                    extra_active: "Extra Active",
                  } as Record<string, string>)[activityLevel] || "Not set"}
                </span>
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── Calorie Targets ── */}
        {weightKg && heightCm && age ? (() => {
          const gM: 'male'|'female'|'other' = gender.toLowerCase() === 'male' ? 'male' : gender.toLowerCase() === 'female' ? 'female' : 'other';
          const aM = (['sedentary','lightly_active','moderately_active','very_active','extra_active'].includes(activityLevel) ? activityLevel : 'moderately_active') as 'sedentary'|'lightly_active'|'moderately_active'|'very_active'|'extra_active';
          const maintain = computeTargets(weightKg, heightCm, age, gM, aM, 'maintain');
          const lose     = computeTargets(weightKg, heightCm, age, gM, aM, 'lose');
          const gain     = computeTargets(weightKg, heightCm, age, gM, aM, 'gain');
          const currentGoalKey = goal.toLowerCase().includes('loss') || goal.toLowerCase().includes('lose') ? 'lose' : goal.toLowerCase().includes('gain') || goal.toLowerCase().includes('muscle') ? 'gain' : 'maintain';
          const scenarios = [
            { key: 'lose',     label: 'Lose Weight',     kcal: lose.target_calories,     color: '#F87171', desc: '500 kcal deficit' },
            { key: 'maintain', label: 'Maintain Weight', kcal: maintain.target_calories, color: '#4ADE80', desc: 'TDEE' },
            { key: 'gain',     label: 'Gain / Bulk',     kcal: gain.target_calories,     color: '#60A5FA', desc: '300 kcal surplus' },
          ];
          return (
            <ScrollReveal delay={0.055}>
              <GlowCard glowColor="37,99,235">
                <div className="p-4">
                  <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">DAILY CALORIE TARGETS</p>
                  <div className="flex flex-col gap-2">
                    {scenarios.map(({ key, label, kcal, color, desc }) => {
                      const isActive = key === currentGoalKey;
                      return (
                        <div key={key} className="flex items-center justify-between px-3 py-3 rounded-[12px] border-2 transition-all"
                          style={{ borderColor: isActive ? color : 'var(--color-border)', background: isActive ? color + '12' : 'var(--color-surface-2)' }}>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-body font-bold text-[13px]" style={{ color: isActive ? color : 'var(--color-text-1)' }}>{label}</span>
                            <span className="font-caption text-[10px] font-light text-[var(--color-text-3)]">{desc}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-metric text-[1.25rem]" style={{ color }}>{kcal}</span>
                            <span className="font-caption text-[10px] font-light text-[var(--color-text-3)]">kcal</span>
                            {isActive && <span className="font-caption text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: color + '20', color }}>YOUR GOAL</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="font-caption text-[9px] font-light text-[var(--color-text-3)] mt-3 text-center">
                    Based on your body metrics · Update goal in Edit Profile
                  </p>
                </div>
              </GlowCard>
            </ScrollReveal>
          );
        })() : null}

        {/* ── Streaks detail ── */}
        <ScrollReveal delay={0.06}>
          <GlowCard glowColor="245,158,11">
            <div className="p-4">
              <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide mb-3">STREAKS</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Workout",   days: workoutStreak,   color: "#3B82F6",  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M1 5h3M10 5h3M1 9h3M10 9h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><rect x="1" y="3.5" width="3" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="10" y="3.5" width="3" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg> },
                  { label: "Nutrition", days: nutritionStreak, color: "#4ADE80",  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4.5 7a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
                  { label: "Water",     days: waterStreak,     color: "#38BDF8",  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5C7 1.5 3 6 3 9a4 4 0 008 0C11 6 7 1.5 7 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                ].map(s => (
                  <motion.div key={s.label} whileHover={{ y: -2 }} transition={{ duration: 0.18 }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)]"
                    style={{ color: s.color }}>
                    {s.icon}
                    <CountUp to={s.days} duration={1.4} className="font-metric text-[1.375rem] leading-none"/>
                    <span className="font-caption text-[8px] font-light text-[var(--color-text-3)] uppercase tracking-wide">{s.label}</span>
                    {/* Mini week bar */}
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="w-2 h-1 rounded-full" style={{ background: i < Math.min(s.days, 7) ? s.color : "var(--color-border)" }}/>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── Health profile ── */}
        <ScrollReveal delay={0.07}>
          <GlowCard glowColor="34,197,94">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">HEALTH PROFILE</p>
                <button onClick={() => setPrefsOpen(true)}
                  className="h-7 px-3 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center gap-1.5 hover:border-[#22C55E] transition-colors">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M7.5 1.5l2 2L2 11H0V9L7.5 1.5z" stroke="#22C55E" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="font-caption text-[9px] font-light text-[#22C55E]">Edit</span>
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-body font-bold text-[11px] text-[var(--color-text-3)] uppercase tracking-wider mb-1">Food Preferences</p>
                  <TagList items={foodPreferences} color="#22C55E"/>
                </div>
                <div className="border-t border-[var(--color-border)] pt-3">
                  <p className="font-body font-bold text-[11px] text-[var(--color-text-3)] uppercase tracking-wider mb-1">Allergies</p>
                  <TagList items={allergies} color="#F59E0B"/>
                </div>
                <div className="border-t border-[var(--color-border)] pt-3">
                  <p className="font-body font-bold text-[11px] text-[var(--color-text-3)] uppercase tracking-wider mb-1">Medical Conditions</p>
                  <TagList items={medicalConditions} color="#F87171"/>
                </div>
                <div className="border-t border-[var(--color-border)] pt-3">
                  <p className="font-body font-bold text-[11px] text-[var(--color-text-3)] uppercase tracking-wider mb-1">Workout Constraints</p>
                  <TagList items={constraints} color="#A78BFA"/>
                </div>
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── Goal & Training ── */}
        <ScrollReveal delay={0.08}>
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">GOAL & TRAINING</p>
                <button onClick={() => setPrefsOpen(true)}
                  className="h-7 px-3 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center gap-1.5 hover:border-[var(--color-primary)] transition-colors">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M7.5 1.5l2 2L2 11H0V9L7.5 1.5z" stroke="var(--color-primary)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="font-caption text-[9px] font-light text-[var(--color-primary)]">Edit</span>
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Primary goal",  val: goalLabel[goal] || goal || "Not set" },
                  { label: "Fitness level", val: level || "Not set" },
                  { label: "Goal weight",   val: "75.0 kg" },
                  { label: "Weekly target", val: "4–5 workouts" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
                    <span className="font-body text-[12px] text-[var(--color-text-2)]">{row.label}</span>
                    <span className="font-body font-bold text-[12px] text-[var(--color-text-1)]">{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── Weekly progress chart ── */}
        <ScrollReveal delay={0.09}>
          <GlowCard glowColor="37,99,235">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-heading text-[.875rem] text-[var(--color-text-1)] tracking-wide">THIS WEEK</p>
                <span className="font-metric text-[11px] text-[var(--color-primary)]">4/7 days active</span>
              </div>
              <div className="flex gap-1 items-end h-16">
                {[65, 80, 0, 90, 72, 0, 0].map((v, i) => (
                  <motion.div key={i}
                    initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                    style={{ originY: 1 }}
                    className="flex-1 rounded-t-[4px]"
                    title={["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}
                  >
                    <div className="w-full rounded-t-[4px]"
                      style={{
                        height: v ? `${v}%` : "12%",
                        background: v ? "var(--color-primary)" : "var(--color-border)",
                        opacity: v ? 1 : 0.4,
                        maxHeight: "100%",
                      }}
                    />
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-1 mt-1">
                {["M","T","W","T","F","S","S"].map((d, i) => (
                  <span key={i} className="flex-1 text-center font-caption text-[8px] font-light text-[var(--color-text-3)]">{d}</span>
                ))}
              </div>
            </div>
          </GlowCard>
        </ScrollReveal>

        {/* ── App settings ── */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-col gap-3">
            {/* Appearance */}
            <p className="font-heading text-[.75rem] text-[var(--color-text-3)] tracking-widest uppercase">APPEARANCE</p>
            <GlowCard glowColor="37,99,235">
              <button onClick={toggleDark}
                className="flex items-center gap-3 w-full px-4 py-3.5">
                <div className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                  {isDark ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="#FCD34D" strokeWidth="1.25"/><path d="M7 1.5v1M7 11.5v1M1.5 7h1M11.5 7h1M3.4 3.4l.7.7M9.9 9.9l.7.7M3.4 10.6l.7-.7M9.9 4.1l.7-.7" stroke="#FCD34D" strokeWidth="1.25" strokeLinecap="round"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 7.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" stroke="var(--color-text-2)" strokeWidth="1.25" strokeLinecap="round"/></svg>
                  )}
                </div>
                <span className="font-body text-[13px] text-[var(--color-text-1)] flex-1 text-left">{isDark ? "Light Mode" : "Dark Mode"}</span>
                <div className="w-10 h-5.5 rounded-full flex items-center px-0.5 transition-all" style={{ background: isDark ? "#2563EB" : "var(--color-border)" }}>
                  <motion.div animate={{ x: isDark ? 18 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="w-4 h-4 rounded-full bg-white shadow-sm"/>
                </div>
              </button>
            </GlowCard>

            {/* Account */}
            <p className="font-heading text-[.75rem] text-[var(--color-text-3)] tracking-widest uppercase mt-1">ACCOUNT</p>
            <GlowCard glowColor="37,99,235">
              <div className="overflow-hidden rounded-[18px]">
                {[
                  { label: "Preferences",    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="var(--color-text-2)" strokeWidth="1.25"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M3.05 3.05l1.06 1.06M9.89 9.89l1.06 1.06M3.05 10.95l1.06-1.06M9.89 4.11l1.06-1.06" stroke="var(--color-text-2)" strokeWidth="1.25" strokeLinecap="round"/></svg>, val: "Diet, Health & Goal", action: () => setPrefsOpen(true) },
                  { label: "WhatsApp Alerts", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5a3.5 3.5 0 013.5 3.5v2.5l1 1.5H2.5l1-1.5V5A3.5 3.5 0 017 1.5z" stroke="var(--color-text-2)" strokeWidth="1.25"/><path d="M5.5 11a1.5 1.5 0 003 0" stroke="var(--color-text-2)" strokeWidth="1.25" strokeLinecap="round"/></svg>, val: whatsappOptIn ? "On" : "Off", action: () => setWhatsappOpen(true) },
                  { label: "Units",          icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2v10M2 4.5h2.5M2 8h4M2 11.5h2" stroke="var(--color-text-2)" strokeWidth="1.25" strokeLinecap="round"/></svg>, val: "Metric" },
                  { label: "Connected Apps", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="4" width="4.5" height="4.5" rx="1.25" stroke="var(--color-text-2)" strokeWidth="1.25"/><rect x="8" y="4" width="4.5" height="4.5" rx="1.25" stroke="var(--color-text-2)" strokeWidth="1.25"/><path d="M6 6.5h2" stroke="var(--color-text-2)" strokeWidth="1.25" strokeLinecap="round"/></svg>, val: "0 linked" },
                  { label: "Data & Privacy", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5L12 3.5V7c0 2.5-2 4.5-5 5.5C4 12.5 2 10.5 2 7V3.5L7 1.5z" stroke="var(--color-text-2)" strokeWidth="1.25" strokeLinejoin="round"/></svg>, val: "" },
                ].map((item, i) => (
                  <button key={item.label} onClick={(item as any).action}
                    className={`flex items-center gap-3 w-full px-4 py-3.5 text-left ${i > 0 ? "border-t border-[var(--color-border)]" : ""}`}>
                    <div className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="font-body text-[13px] text-[var(--color-text-1)] flex-1">{item.label}</span>
                    {item.val && <span className="font-caption text-[10px] font-light text-[var(--color-text-3)]">{item.val}</span>}
                    <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1l4 4-4 4" stroke="var(--color-text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                ))}
              </div>
            </GlowCard>

            {/* Support */}
            <p className="font-heading text-[.75rem] text-[var(--color-text-3)] tracking-widest uppercase mt-1">SUPPORT</p>
            <GlowCard glowColor="37,99,235">
              <div className="overflow-hidden rounded-[18px]">
                {[
                  { label: "Help Center",  icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="var(--color-text-2)" strokeWidth="1.25"/><path d="M5.5 5.5a1.75 1.75 0 013.4.6C9 7.5 7 8 7 9M7 10.5v.5" stroke="var(--color-text-2)" strokeWidth="1.25" strokeLinecap="round"/></svg> },
                  { label: "Rate FitnessAndi", icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.5l1.3 3.5H12L9 7.2l1.1 3.6L7 9l-3.1 1.8L5 7.2 2 5h3.7L7 1.5z" stroke="var(--color-text-2)" strokeWidth="1.25" strokeLinejoin="round"/></svg> },
                ].map((item, i) => (
                  <div key={item.label} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-[var(--color-border)]" : ""}`}>
                    <div className="w-8 h-8 rounded-[8px] bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="font-body text-[13px] text-[var(--color-text-1)] flex-1">{item.label}</span>
                    <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1l4 4-4 4" stroke="var(--color-text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ))}
              </div>
            </GlowCard>
          </div>
        </ScrollReveal>

        {/* ── Sign out ── */}
        <ScrollReveal delay={0.11}>
          {!logoutConfirm ? (
            <button onClick={() => setLogoutConfirm(true)}
              className="h-12 w-full rounded-[14px] border border-[#FECACA] text-[#EF4444] font-body font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[var(--color-danger-light)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10.5 11.5L14 8l-3.5-3.5M14 8H6" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Sign Out
            </button>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-[14px] border border-[#FECACA] bg-[var(--color-danger-light)] p-4">
              <p className="font-body font-bold text-[13px] text-[#EF4444] mb-1">Sign out of FitnessAndi?</p>
              <p className="font-caption text-[10px] font-light text-[var(--color-text-3)] mb-3">Your data is saved and will be here when you return.</p>
              <div className="flex gap-2">
                <button onClick={() => setLogoutConfirm(false)}
                  className="flex-1 h-10 rounded-[10px] border border-[var(--color-border)] text-[var(--color-text-2)] font-body font-bold text-[12px]">
                  Cancel
                </button>
                <button onClick={handleLogout}
                  className="flex-1 h-10 rounded-[10px] bg-[#EF4444] text-white font-body font-bold text-[12px] hover:bg-[#DC2626] transition-colors">
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </ScrollReveal>

        <div className="h-4"/>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editOpen && <EditModal onClose={() => setEditOpen(false)}/>}
        {prefsOpen && <PreferencesModal onClose={() => setPrefsOpen(false)}/>}
        {whatsappOpen && <WhatsAppOptInModal onClose={() => setWhatsappOpen(false)}/>}
      </AnimatePresence>
    </div>
  );
}
