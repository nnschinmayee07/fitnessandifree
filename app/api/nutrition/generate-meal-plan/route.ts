import { generateMealPlanForUser, type ProfileContext, type RemainingMacros } from '@/lib/nutrition/meal-plan';

const VALID_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return new Response('Invalid JSON body', { status: 400 }); }

  const { userId, mealType, profileData, remainingMacros, foodPreferences, allergies } = body;

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return new Response('userId is required', { status: 400 });
  }
  const mealTypeStr = typeof mealType === 'string' && VALID_MEAL_TYPES.has(mealType) ? mealType : undefined;

  if (!process.env.GROQ_API_KEY) {
    return new Response('GROQ_API_KEY not configured', { status: 500 });
  }

  try {
    const suggestions = await generateMealPlanForUser(userId, {
      mealType: mealTypeStr,
      profileData: profileData && typeof profileData === 'object' ? (profileData as ProfileContext) : undefined,
      remainingMacros: remainingMacros && typeof remainingMacros === 'object' ? (remainingMacros as RemainingMacros) : undefined,
      foodPreferences: Array.isArray(foodPreferences) ? (foodPreferences as string[]) : undefined,
      allergies: Array.isArray(allergies) ? (allergies as string[]) : undefined,
    });

    return Response.json({ suggestions }, { status: 200 });
  } catch {
    return new Response('Meal plan generation failed', { status: 502 });
  }
}
