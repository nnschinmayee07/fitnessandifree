import { createServerClient } from '@/lib/supabase/server';
import type { NutritionProfileRow } from '@/lib/types/nutrition-profile';
import type { MealLogRow } from '@/lib/types/meal-log';
import type { WaterLogRow } from '@/lib/types/water-log';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];

  if (!userId) {
    return new Response('userId is required', { status: 400 });
  }

  const supabase = createServerClient();

  const [profileResult, mealLogsResult, waterLogsResult] = await Promise.all([
    supabase.from('nutrition_profiles').select('*').eq('user_id', userId).single(),
    supabase.from('meal_logs').select('*').eq('user_id', userId).eq('date', date),
    supabase.from('water_logs').select('*').eq('user_id', userId).eq('date', date),
  ]);

  const profile = (profileResult.data as NutritionProfileRow | null) ?? null;
  const mealLogs = (mealLogsResult.data as MealLogRow[]) ?? [];
  const waterLogs = (waterLogsResult.data as WaterLogRow[]) ?? [];

  const totals = {
    calories: mealLogs.reduce((sum, row) => sum + (row.calories ?? 0), 0),
    protein_g: mealLogs.reduce((sum, row) => sum + (row.protein_g ?? 0), 0),
    carbs_g: mealLogs.reduce((sum, row) => sum + (row.carbs_g ?? 0), 0),
    fat_g: mealLogs.reduce((sum, row) => sum + (row.fat_g ?? 0), 0),
    water_ml: waterLogs.reduce((sum, row) => sum + row.amount_ml, 0),
  };

  return Response.json({ profile, mealLogs, waterLogs, totals }, { status: 200 });
}
