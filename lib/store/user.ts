import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  goal: string;
  level: string;
  weightKg: number;
  heightCm: number;
  age: number;
  gender: string;
  isLoggedIn: boolean;
  workoutStreak: number;
  nutritionStreak: number;
  waterStreak: number;
  // new health fields
  stepsToday: number;
  stepsGoal: number;
  heartRate: number;
  sleepHours: number;
  waterLiters: number;
  waterGoal: number;
  bmi: number;
  bmiCategory: string;
  // onboarding extras
  activityLevel: string;
  medicalConditions: string[];
  foodPreferences: string[];
  allergies: string[];
  constraints: string[];
  cuisinePreference: string | null;
  // WhatsApp alerts opt-in
  phoneNumber: string;
  whatsappOptIn: boolean;
  hasSeenWhatsappPrompt: boolean;
  // theme
  isDark: boolean;
  setUser: (data: Partial<Omit<UserState, "setUser" | "login" | "logout" | "toggleDark" | "computeBmi">>) => void;
  login: (firstName: string, lastName: string, email: string) => void;
  logout: () => void;
  toggleDark: () => void;
  computeBmi: () => void;
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function calcBmi(weightKg: number, heightCm: number): { bmi: number; bmiCategory: string } {
  if (!weightKg || !heightCm) return { bmi: 0, bmiCategory: "" };
  const hm = heightCm / 100;
  const b = Math.round((weightKg / (hm * hm)) * 10) / 10;
  const cat = b < 18.5 ? "Underweight" : b < 25 ? "Normal" : b < 30 ? "Overweight" : "Obese";
  return { bmi: b, bmiCategory: cat };
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      name: "",
      firstName: "",
      lastName: "",
      email: "",
      avatar: "",
      goal: "Weight Loss",
      level: "Intermediate",
      weightKg: 0,
      heightCm: 0,
      age: 0,
      gender: "Male",
      isLoggedIn: false,
      workoutStreak: 14,
      nutritionStreak: 9,
      waterStreak: 6,
      stepsToday: 6843,
      stepsGoal: 10000,
      heartRate: 72,
      sleepHours: 7.2,
      waterLiters: 2.1,
      waterGoal: 3.0,
      bmi: 0,
      bmiCategory: "",
      activityLevel: "moderately_active",
      medicalConditions: [],
      foodPreferences: [],
      allergies: [],
      constraints: [],
      cuisinePreference: null,
      phoneNumber: "",
      whatsappOptIn: false,
      hasSeenWhatsappPrompt: false,
      isDark: false,
      setUser: (data) => set((s) => ({ ...s, ...data })),
      login: (firstName, lastName, email) =>
        set({
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          email,
          avatar: initials(firstName, lastName),
          isLoggedIn: true,
        }),
      logout: () =>
        set({
          name: "",
          firstName: "",
          lastName: "",
          email: "",
          avatar: "",
          isLoggedIn: false,
        }),
      toggleDark: () => set((s) => ({ isDark: !s.isDark })),
      computeBmi: () => {
        const { weightKg, heightCm } = get();
        set(calcBmi(weightKg, heightCm));
      },
    }),
    { name: "fitnessandi-user" }
  )
);
