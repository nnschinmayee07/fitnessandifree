import { create } from "zustand";

interface MacroEntry {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionState {
  goals: MacroEntry & { water: number };
  logged: MacroEntry & { water: number };
  addFood: (entry: MacroEntry) => void;
  addWater: (cups?: number) => void;
}

export const useNutritionStore = create<NutritionState>((set) => ({
  goals: { calories: 1850, protein: 130, carbs: 185, fat: 55, water: 12 },
  logged: { calories: 1240, protein: 76, carbs: 142, fat: 38, water: 7 },
  addFood: (entry) =>
    set((state) => ({
      logged: {
        ...state.logged,
        calories: state.logged.calories + entry.calories,
        protein: state.logged.protein + entry.protein,
        carbs: state.logged.carbs + entry.carbs,
        fat: state.logged.fat + entry.fat,
      },
    })),
  addWater: (cups = 1) =>
    set((state) => ({
      logged: { ...state.logged, water: Math.min(state.logged.water + cups, state.goals.water) },
    })),
}));
