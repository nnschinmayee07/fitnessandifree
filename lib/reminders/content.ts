import { createServerClient } from '@/lib/supabase/server';
import type { ReminderType } from '@/lib/types/reminder';

const DISCLAIMER = 'This is an approximate estimate and not medical advice.';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
};

async function buildMealReminder(type: 'breakfast' | 'lunch' | 'dinner'): Promise<{ subject: string; body: string }> {
  const label = MEAL_LABELS[type];
  return {
    subject: `Time to log your ${label}`,
    body: `Hi! Just a nudge to log your ${label} in FitnessAndi so your daily nutrition summary stays accurate.`,
  };
}

function buildWaterReminder(): { subject: string; body: string } {
  return {
    subject: 'Water reminder',
    body: "Time to drink some water if you haven't already.",
  };
}

async function buildDailySummaryReminder(userId: string): Promise<{ subject: string; body: string }> {
  const today = new Date().toISOString().split('T')[0];
  const supabase = createServerClient();

  const [mealLogsResult, waterLogsResult] = await Promise.all([
    supabase.from('meal_logs').select('calories, protein_g, carbs_g, fat_g').eq('user_id', userId).eq('date', today),
    supabase.from('water_logs').select('amount_ml').eq('user_id', userId).eq('date', today),
  ]);

  const mealLogs = (mealLogsResult.data as { calories: number; protein_g: number; carbs_g: number; fat_g: number }[]) ?? [];
  const waterLogs = (waterLogsResult.data as { amount_ml: number }[]) ?? [];

  const totals = {
    calories: mealLogs.reduce((sum, row) => sum + (row.calories ?? 0), 0),
    protein_g: mealLogs.reduce((sum, row) => sum + (row.protein_g ?? 0), 0),
    carbs_g: mealLogs.reduce((sum, row) => sum + (row.carbs_g ?? 0), 0),
    fat_g: mealLogs.reduce((sum, row) => sum + (row.fat_g ?? 0), 0),
    water_ml: waterLogs.reduce((sum, row) => sum + (row.amount_ml ?? 0), 0),
  };

  return {
    subject: "Today's nutrition summary",
    body:
      `Here's your nutrition summary for today:\n\n` +
      `Calories: ${Math.round(totals.calories)} kcal\n` +
      `Protein: ${Math.round(totals.protein_g)}g\n` +
      `Carbs: ${Math.round(totals.carbs_g)}g\n` +
      `Fat: ${Math.round(totals.fat_g)}g\n` +
      `Water: ${totals.water_ml}ml\n\n` +
      DISCLAIMER,
  };
}

async function buildNextDayMealPlanReminder(userId: string): Promise<{ subject: string; body: string } | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY not configured — skipping next-day meal plan reminder');
    return null;
  }

  const { generateMealPlanForUser } = await import('@/lib/nutrition/meal-plan');
  const suggestions = await generateMealPlanForUser(userId);

  if (!suggestions || suggestions.length === 0) return null;

  const lines = suggestions
    .slice(0, 4)
    .map((s) => `- ${s.meal_type}: ${s.meal_name} (${Math.round(s.calories)} kcal)`);

  return {
    subject: "Tomorrow's meal plan is ready",
    body: `Here's a suggested plan for tomorrow:\n\n${lines.join('\n')}\n\n${DISCLAIMER}`,
  };
}

export async function buildReminderContent(
  type: ReminderType,
  userId: string
): Promise<{ subject: string; body: string } | null> {
  switch (type) {
    case 'breakfast':
    case 'lunch':
    case 'dinner':
      return buildMealReminder(type);
    case 'water':
      return buildWaterReminder();
    case 'daily_summary':
      return buildDailySummaryReminder(userId);
    case 'next_day_meal_plan':
      return buildNextDayMealPlanReminder(userId);
    default:
      return null;
  }
}
