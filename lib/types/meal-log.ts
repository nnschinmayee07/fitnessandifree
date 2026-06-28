/**
 * MealLogRow — mirrors a row in the Supabase `meal_logs` table.
 *
 * Required environment variables (read by the API route, never hardcoded):
 *   - ML_MODEL_URL        FastAPI inference server base URL
 *   - SUPABASE_URL        Supabase project URL
 *   - SUPABASE_SERVICE_KEY  Supabase service-role key
 */
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
}
