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
