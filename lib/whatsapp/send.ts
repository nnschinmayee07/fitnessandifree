import { createServerClient } from '@/lib/supabase/server';
import type { MessageLogInsert } from '@/lib/types/message-log';

async function logMessage(entry: MessageLogInsert): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from('message_logs').insert(entry);
  if (error) {
    console.error('Failed to log WhatsApp message', error);
  }
}

export async function sendWhatsAppMessage(
  to: string,
  text: string,
  userId?: string | null
): Promise<boolean> {
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? 'v20.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('WhatsApp credentials are not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      }
    );

    if (!response.ok) {
      console.error('WhatsApp send failed', response.status, await response.text());
      return false;
    }

    await logMessage({ user_id: userId ?? null, phone_number: to, direction: 'outgoing', message_text: text });
    return true;
  } catch (err) {
    console.error('WhatsApp send threw', err);
    return false;
  }
}

export { logMessage as logWhatsAppMessage };
