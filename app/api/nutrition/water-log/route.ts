import { createServerClient } from '@/lib/supabase/server';
import type { WaterLogRow } from '@/lib/types/water-log';

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { userId, amount_ml, date } = body;

  if (!userId || typeof userId !== 'string') {
    return new Response('userId is required', { status: 400 });
  }

  if (
    typeof amount_ml !== 'number' ||
    !Number.isInteger(amount_ml) ||
    amount_ml <= 0
  ) {
    return new Response('amount_ml must be a positive integer', { status: 400 });
  }

  const logDate =
    typeof date === 'string' && date.length > 0
      ? date
      : new Date().toISOString().split('T')[0];

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('water_logs')
    .insert({ user_id: userId, amount_ml, date: logDate })
    .select()
    .single();

  if (error || !data) {
    return new Response('Database insert failed', { status: 500 });
  }

  return Response.json(data as WaterLogRow, { status: 201 });
}
