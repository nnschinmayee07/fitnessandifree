import { createServerClient } from '@/lib/supabase/server';

// Minimal endpoint for saving fields not yet persisted to Supabase from the
// client-side profile flow (which currently only writes to Zustand/localStorage).
// Scoped narrowly to phone_number for WhatsApp alert opt-in.
export async function PATCH(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { userId, phoneNumber } = body;

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return new Response('userId is required', { status: 400 });
  }

  // Accept any country code (+1, +44, +91, etc.) and tolerate spaces/dashes as typed.
  const normalizedPhone = typeof phoneNumber === 'string' ? phoneNumber.trim().replace(/[\s-]/g, '') : '';

  if (!normalizedPhone || !/^\+?[1-9]\d{7,14}$/.test(normalizedPhone)) {
    return new Response('phoneNumber must be a valid phone number in international format (e.g. +14155551234)', {
      status: 400,
    });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('nutrition_profiles')
    .upsert({ user_id: userId, phone_number: normalizedPhone }, { onConflict: 'user_id' })
    .select('user_id, phone_number')
    .single();

  if (error || !data) {
    return new Response('Database update failed', { status: 500 });
  }

  return Response.json(data, { status: 200 });
}
