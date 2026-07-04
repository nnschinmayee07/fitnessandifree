import { createServerClient } from '@/lib/supabase/server';
import type { MealSuggestion } from '@/lib/types/claude';

const VALID_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

function stripJsonFences(content: string): string {
  return content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function isValidMealSuggestions(data: unknown): data is MealSuggestion[] {
  if (!Array.isArray(data) || data.length < 1 || data.length > 10) return false;
  return data.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const d = item as Record<string, unknown>;
    return (
      typeof d.meal_type === 'string' &&
      typeof d.meal_name === 'string' &&
      typeof d.description === 'string' &&
      Array.isArray(d.items) &&
      typeof d.calories === 'number' &&
      typeof d.protein_g === 'number' &&
      typeof d.carbs_g === 'number' &&
      typeof d.fat_g === 'number'
    );
  });
}

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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const mealTypeStr = options.mealType && VALID_MEAL_TYPES.has(options.mealType) ? options.mealType : undefined;

  const supabase = createServerClient();

  let profile: ProfileContext | null = options.profileData ?? null;
  if (!profile) {
    const { data } = await supabase.from('nutrition_profiles').select('*').eq('user_id', userId).single();
    if (data) profile = data as ProfileContext;
  }

  if (!profile) return [];

  const today = new Date().toISOString().split('T')[0];
  const { data: mealLogs } = await supabase
    .from('meal_logs')
    .select('calories, protein_g, carbs_g, fat_g')
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

  const prefStr = options.foodPreferences?.length ? `Food preferences: ${options.foodPreferences.join(', ')}.` : '';
  const allergyStr = options.allergies?.length ? `Allergies to avoid: ${options.allergies.join(', ')}.` : '';

  const prompt = `You are a personal nutrition assistant. Generate ${mealTypeStr ? '1' : '3 to 5'} meal suggestion${mealTypeStr ? '' : 's'} for a user with the following profile.

User profile:
- Age: ${profile.age}, Gender: ${profile.gender}
- BMI: ${profile.bmi} (${profile.bmi_category})
- Activity level: ${profile.activity_level}
- Goal: ${profile.goal}
- Daily targets: ${profile.target_calories} kcal, ${profile.target_protein_g}g protein, ${profile.target_carbs_g}g carbs, ${profile.target_fat_g}g fat

Today's remaining macros:
- Calories remaining: ${remaining.calories} kcal
- Protein remaining: ${remaining.protein_g}g
- Carbs remaining: ${remaining.carbs_g}g
- Fat remaining: ${remaining.fat_g}g
${prefStr}
${allergyStr}
${mealTypeStr ? `\nGenerate a single ${mealTypeStr} suggestion that fits the remaining macros.` : ''}

Return only a JSON array. No markdown, no explanation, no code fences.
Each item must have exactly: meal_type (string), meal_name (string), description (string), items (string array), calories (number), protein_g (number), carbs_g (number), fat_g (number).
Suggest practical, realistic meals. All numeric values must be non-negative integers.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1200,
      messages: [{ role: 'system', content: prompt }],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error('Meal plan generation failed');

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  const rawContent = data.choices?.[0]?.message?.content ?? '';
  const sanitized = stripJsonFences(rawContent);

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    throw new Error('Meal plan generation failed');
  }

  if (!isValidMealSuggestions(parsed)) throw new Error('Meal plan generation failed');

  return parsed;
}
