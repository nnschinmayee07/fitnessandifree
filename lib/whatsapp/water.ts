import { createServerClient } from '@/lib/supabase/server';

const DEFAULT_AMOUNT_ML = 250; // matches the app's own quick-add default (WaterTracker.tsx)

// Parses messages like "water", "water 250ml", "drank 500ml water" into an amount.
// Falls back to DEFAULT_AMOUNT_ML if no number is present.
function parseAmountMl(text: string): number {
  const match = text.match(/(\d+)\s*ml/i) ?? text.match(/(\d+)/);
  if (!match) return DEFAULT_AMOUNT_ML;
  const amount = parseInt(match[1], 10);
  return Number.isFinite(amount) && amount > 0 ? amount : DEFAULT_AMOUNT_ML;
}

export function isWaterMessage(text: string): boolean {
  return /\bwater\b|\bdrank\b/i.test(text);
}

export async function handleWaterMessage(userId: string, text: string): Promise<string> {
  const amount_ml = parseAmountMl(text);
  const date = new Date().toISOString().split('T')[0];

  const supabase = createServerClient();
  const { error: insertError } = await supabase
    .from('water_logs')
    .insert({ user_id: userId, amount_ml, date });

  if (insertError) {
    return "Sorry, I couldn't log that water intake right now. Please try again shortly.";
  }

  const { data } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', userId)
    .eq('date', date);

  const totalMl = ((data as { amount_ml: number }[]) ?? []).reduce(
    (sum, row) => sum + row.amount_ml,
    0
  );

  return (
    `Logged ${amount_ml}ml of water.\n` +
    `Today's total: ${totalMl}ml.\n\n` +
    `Time to drink some water if you haven't already.`
  );
}
