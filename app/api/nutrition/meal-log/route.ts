import { insertMealLog } from '@/lib/nutrition/meal-log';
import { createServerClient } from '@/lib/supabase/server';
import type { MealType, LogSource } from '@/lib/types/meal-log';

const VALID_MEAL_TYPES = new Set<string>(['breakfast', 'lunch', 'dinner', 'snack']);
const VALID_SOURCES = new Set<string>(['photo', 'description', 'manual', 'plan']);

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { userId, date, meal_type, source, food_name, calories, protein_g, carbs_g, fat_g, fiber_g } = body;

  if (!userId || typeof userId !== 'string') {
    return new Response('userId is required', { status: 400 });
  }
  if (!date || typeof date !== 'string') {
    return new Response('date is required', { status: 400 });
  }
  if (!meal_type || !VALID_MEAL_TYPES.has(meal_type as string)) {
    return new Response('meal_type must be one of: breakfast, lunch, dinner, snack', { status: 400 });
  }
  if (!source || !VALID_SOURCES.has(source as string)) {
    return new Response('source must be one of: photo, description, manual, plan', { status: 400 });
  }
  if (!food_name || typeof food_name !== 'string') {
    return new Response('food_name is required', { status: 400 });
  }
  if (typeof calories !== 'number') {
    return new Response('calories is required and must be a number', { status: 400 });
  }
  if (typeof protein_g !== 'number') {
    return new Response('protein_g is required and must be a number', { status: 400 });
  }
  if (typeof carbs_g !== 'number') {
    return new Response('carbs_g is required and must be a number', { status: 400 });
  }
  if (typeof fat_g !== 'number') {
    return new Response('fat_g is required and must be a number', { status: 400 });
  }

  try {
    const row = await insertMealLog({
      user_id: userId,
      date,
      meal_type: meal_type as MealType,
      source: source as LogSource,
      food_name,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      ...(typeof fiber_g === 'number' ? { fiber_g } : {}),
    });
    
    // Update recommendation outcome (fire-and-forget, non-blocking)
    // This tracks whether the user accepted a recommendation or logged something else
    // We need to check if this meal matches any recent recommendations
    (async () => {
      try {
        const supabase = createServerClient();
        
        // Fetch the most recent recommendation event for this user
        const { data: recentEvent } = await supabase
          .from('meal_recommendation_events')
          .select('recommended_meal_ids')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();
        
        if (recentEvent && recentEvent.recommended_meal_ids) {
          // Check if the logged meal matches any recommended meals
          // We need to check by meal name since that's what we have in the log
          const { data: meals } = await supabase
            .from('meals')
            .select('id, name')
            .in('id', recentEvent.recommended_meal_ids);
          
          if (meals) {
            const recommendedMealNames = meals.map(m => m.name.toLowerCase());
            const loggedMealName = (food_name as string).toLowerCase();
            
            // Check if logged meal matches any recommendation
            const matchedMeal = meals.find(m => m.name.toLowerCase() === loggedMealName);
            
            const { updateOutcome } = await import('@/lib/meal-recommender/logger');
            
            if (matchedMeal) {
              // User accepted a recommendation
              updateOutcome(userId, matchedMeal.id, 'accepted');
            } else {
              // User logged something else (rejected recommendations)
              updateOutcome(userId, food_name as string, 'rejected_logged_other');
            }
          }
        }
      } catch (error) {
        // Silently fail - this is fire-and-forget
        console.error('[Meal Log] Error updating recommendation outcome:', error);
      }
    })();
    
    return Response.json(row, { status: 201 });
  } catch {
    return new Response('Database insert failed', { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { id, userId } = body;

  if (!id || typeof id !== 'string' || !userId || typeof userId !== 'string') {
    return new Response('id and userId are required', { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('meal_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return new Response('Database delete failed', { status: 500 });
  }

  return new Response(null, { status: 204 });
}
