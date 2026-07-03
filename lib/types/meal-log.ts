/**
 * MealLogRow — mirrors a row in the Supabase `meal_logs` table.
 *
 * Required environment variables (read by the API route, never hardcoded):
 *   - ML_MODEL_URL        FastAPI inference server base URL
 *   - SUPABASE_URL        Supabase project URL
 *   - SUPABASE_SERVICE_KEY  Supabase service-role key
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type LogSource = 'photo' | 'description' | 'manual' | 'plan';

export interface MealLogRow {
  id: string;
  user_id: string;
  /** ISO-8601 timestamptz string */
  logged_at: string;
  meal_name: string | null;
  /** Raw confidence score in the range 0.00 – 1.00 */
  confidence: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  image_url: string | null;
  // new additive columns
  meal_type: MealType | null;
  source: LogSource | null;
  date: string | null;                // YYYY-MM-DD
  food_name: string | null;
}

export interface MealLogInsert {
  user_id: string;
  date: string;                       // YYYY-MM-DD
  meal_type: MealType;
  source: LogSource;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  confidence?: number;
  image_url?: string;
}
