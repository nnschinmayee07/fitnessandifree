// Response shape from POST /api/nutrition/analyze-description
export interface DescriptionAnalysisResult {
  meal_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  items: string[];       // list of individual food items identified
  confidence: number;    // 0 – 100
  assumptions: string;   // e.g. "Assumed standard roti size (30g), dal serving of 150g"
}

// Updated MealSuggestion for Claude-powered plan
export interface MealSuggestion {
  meal_type: string;     // "breakfast" | "lunch" | "dinner" | "snack" | "any"
  meal_name: string;
  description: string;
  items: string[];       // individual ingredients / components
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
