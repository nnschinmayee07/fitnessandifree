import { createServerClient } from '@/lib/supabase/server';

// Looks up the app user (email/user_id) linked to a WhatsApp phone number via
// nutrition_profiles.phone_number. Returns null if no profile is linked yet.
export async function resolveUserIdFromPhone(phoneNumber: string): Promise<string | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('nutrition_profiles')
    .select('user_id')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  return (data as { user_id: string } | null)?.user_id ?? null;
}
