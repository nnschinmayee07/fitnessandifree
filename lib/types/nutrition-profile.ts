export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type Goal = 'lose' | 'maintain' | 'gain';

export type BmiCategory = 'Underweight' | 'Normal' | 'Overweight' | 'Obese';

export type CuisineType = 'American' | 'Italian' | 'Mexican' | 'Asian' | 'Mediterranean' | 'South Indian' | 'North Indian';

export interface NutritionProfileRow {
  id: string;                         // UUID
  user_id: string;                    // email from useUserStore
  age: number;
  gender: 'male' | 'female' | 'other';
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
  bmi: number;                        // rounded to 1dp
  bmi_category: BmiCategory;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_water_ml: number;
  cuisine_preference?: CuisineType | null;  // Optional: user's preferred cuisine type
  created_at: string;
  updated_at: string;
}

export type NutritionProfileInsert = Omit<NutritionProfileRow, 'id' | 'created_at' | 'updated_at'>;
