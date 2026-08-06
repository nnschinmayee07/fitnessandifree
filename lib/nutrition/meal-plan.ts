import { createServerClient } from '@/lib/supabase/server';
import type { MealSuggestion } from '@/lib/types/claude';
import { rankMeals } from '@/lib/meal-recommender/inference';

const VALID_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

export interface ProfileContext {
  age: number;
  gender: string;
  bmi: number;
  bmi_category: string;
  activity_level: string;
  goal: string;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  cuisine_preference?: string | null;
}

export interface RemainingMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface GenerateMealPlanOptions {
  mealType?: string;
  profileData?: ProfileContext;
  remainingMacros?: RemainingMacros;
  foodPreferences?: string[];
  allergies?: string[];
}

// Shared by app/api/nutrition/generate-meal-plan and the next-day meal plan reminder.
export async function generateMealPlanForUser(
  userId: string,
  options: GenerateMealPlanOptions = {}
): Promise<MealSuggestion[]> {
  const mealTypeStr = options.mealType && VALID_MEAL_TYPES.has(options.mealType) ? options.mealType : undefined;

  const supabase = createServerClient();

  let profile: ProfileContext | null = options.profileData ?? null;
  if (!profile) {
    const { data } = await supabase.from('nutrition_profiles').select('*').eq('user_id', userId).single();
    if (data) {
      console.log('[generateMealPlanForUser] Fetched profile from DB:', data);
      profile = data as ProfileContext;
    }
  }

  if (!profile) {
    throw new Error('User profile not found');
  }

  const today = new Date().toISOString().split('T')[0];
  const { data: mealLogs } = await supabase
    .from('meal_logs')
    .select('meal_type, calories, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .eq('date', today);

  const consumed = (mealLogs ?? []).reduce(
    (acc, row) => ({
      calories: acc.calories + (row.calories ?? 0),
      protein_g: acc.protein_g + (row.protein_g ?? 0),
      carbs_g: acc.carbs_g + (row.carbs_g ?? 0),
      fat_g: acc.fat_g + (row.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const remaining: RemainingMacros = options.remainingMacros ?? {
    calories: Math.max(0, (profile.target_calories ?? 2000) - consumed.calories),
    protein_g: Math.max(0, (profile.target_protein_g ?? 150) - consumed.protein_g),
    carbs_g: Math.max(0, (profile.target_carbs_g ?? 225) - consumed.carbs_g),
    fat_g: Math.max(0, (profile.target_fat_g ?? 55) - consumed.fat_g),
  };

  // Determine which meal types have already been logged today
  const loggedMealTypes = new Set(
    (mealLogs ?? [])
      .map(log => log.meal_type?.toLowerCase())
      .filter(Boolean)
  );

  console.log('[generateMealPlanForUser] Logged meal types today:', Array.from(loggedMealTypes));

  // If a specific meal type is requested, use that
  // Otherwise, recommend meals for all unlogged slots
  let mealTypesToRecommend: string[];
  
  if (mealTypeStr) {
    // Specific meal type requested (e.g., from regenerate button)
    mealTypesToRecommend = [mealTypeStr];
  } else {
    // Recommend for all unlogged meal slots
    const allMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    mealTypesToRecommend = allMealTypes.filter(type => !loggedMealTypes.has(type));
    
    console.log('[generateMealPlanForUser] Meal types to recommend:', mealTypesToRecommend);
  }

  // Generate recommendations for each unlogged meal type
  const allRecommendations: MealSuggestion[] = [];
  
  for (const mealType of mealTypesToRecommend) {
    const recommendations = await rankMeals(userId, mealType, profile, remaining);
    // Take a random meal from the top recommendations for variety
    if (recommendations.length > 0) {
      // Randomly select from top 3 (or all if less than 3)
      const poolSize = Math.min(3, recommendations.length);
      const randomIndex = Math.floor(Math.random() * poolSize);
      allRecommendations.push(recommendations[randomIndex]);
    }
  }
  
  return allRecommendations;
}
