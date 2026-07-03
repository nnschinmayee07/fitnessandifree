import { createServerClient } from '@/lib/supabase/server';
import type { MealLogInsert, MealLogRow } from '@/lib/types/meal-log';

export async function insertMealLog(payload: MealLogInsert): Promise<MealLogRow> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('meal_logs')
    .insert({
      user_id:   payload.user_id,
      logged_at: new Date().toISOString(),
      meal_name: payload.food_name,
      food_name: payload.food_name,
      meal_type: payload.meal_type,
      source:    payload.source,
      date:      payload.date,
      calories:  payload.calories,
      protein_g: payload.protein_g,
      carbs_g:   payload.carbs_g,
      fat_g:     payload.fat_g,
      fiber_g:   payload.fiber_g ?? null,
      confidence: payload.confidence ?? null,
      image_url:  payload.image_url ?? null,
    })
    .select()
    .single();

  if (error || !data) throw new Error('Database insert failed');
  return data as MealLogRow;
}
