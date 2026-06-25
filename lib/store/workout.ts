import { create } from "zustand";

interface WorkoutState {
  streak: number;
  completedToday: boolean;
  activeSession: string | null;
  startSession: (name: string) => void;
  endSession: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  streak: 14,
  completedToday: false,
  activeSession: null,
  startSession: (name) => set({ activeSession: name }),
  endSession: () => set({ activeSession: null, completedToday: true }),
}));
