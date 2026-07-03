import type { ActivityLevel, Goal, BmiCategory } from '@/lib/types/nutrition-profile';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:          1.2,
  lightly_active:     1.375,
  moderately_active:  1.55,
  very_active:        1.725,
  extra_active:       1.9,
};

export const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  lose:     -500,
  maintain:    0,
  gain:      300,
};

export function computeBmi(weightKg: number, heightCm: number): number {
  const hm = heightCm / 100;
  return Math.round((weightKg / (hm * hm)) * 10) / 10;
}

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Overweight';
  return 'Obese';
}

export function computeBmr(
  weightKg: number, heightCm: number, age: number,
  gender: 'male' | 'female' | 'other'
): number {
  const male   = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const female = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  if (gender === 'male')   return male;
  if (gender === 'female') return female;
  return (male + female) / 2;
}

export interface DailyTargets {
  target_calories:  number;
  target_protein_g: number;
  target_carbs_g:   number;
  target_fat_g:     number;
  target_water_ml:  number;
}

export function computeTargets(
  weightKg: number, heightCm: number, age: number,
  gender: 'male' | 'female' | 'other',
  activityLevel: ActivityLevel, goal: Goal
): DailyTargets {
  const bmr = computeBmr(weightKg, heightCm, age, gender);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];
  const calories = Math.round(tdee + GOAL_ADJUSTMENTS[goal]);
  return {
    target_calories:  calories,
    target_protein_g: Math.round(weightKg * 2.0),
    target_carbs_g:   Math.floor((calories * 0.45) / 4),
    target_fat_g:     Math.floor((calories * 0.25) / 9),
    target_water_ml:  Math.floor(weightKg * 35),
  };
}

export function getMealTypeForHour(hour: number): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  if (hour < 10)                return 'breakfast';
  if (hour >= 10 && hour < 15)  return 'lunch';
  if (hour >= 15 && hour <= 21) return 'dinner';
  return 'snack';
}
