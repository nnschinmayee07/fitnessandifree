import { createServerClient } from '@/lib/supabase/server';
import { REMINDER_SCHEDULE, scheduledForToday } from '@/lib/reminders/schedule';
import { buildReminderContent } from '@/lib/reminders/content';
import { sendEmail } from '@/lib/email/send';
import type { ReminderRow } from '@/lib/types/reminder';

// Triggered by Vercel Cron (see vercel.json). Protected by CRON_SECRET so it
// can't be invoked by anyone who finds the URL.
export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createServerClient();
  const now = new Date();

  const { data: profiles } = await supabase.from('nutrition_profiles').select('user_id');
  const userIds = ((profiles as { user_id: string }[]) ?? []).map((p) => p.user_id);

  let seeded = 0;
  for (const userId of userIds) {
    for (const slot of REMINDER_SCHEDULE) {
      const scheduledFor = scheduledForToday(slot.hour, slot.minute, now);
      if (scheduledFor > now) continue; // not due yet today

      const dayStart = new Date(scheduledFor);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { data: existing } = await supabase
        .from('reminders')
        .select('id')
        .eq('user_id', userId)
        .eq('type', slot.type)
        .gte('scheduled_for', dayStart.toISOString())
        .lt('scheduled_for', dayEnd.toISOString())
        .maybeSingle();

      if (existing) continue;

      const { error } = await supabase.from('reminders').insert({
        user_id: userId,
        type: slot.type,
        channel: 'email',
        scheduled_for: scheduledFor.toISOString(),
      });
      if (!error) seeded++;
    }
  }

  const { data: pending } = await supabase
    .from('reminders')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now.toISOString())
    .limit(100);

  let sent = 0;
  let failed = 0;

  for (const reminder of (pending as ReminderRow[]) ?? []) {
    try {
      const content = await buildReminderContent(reminder.type, reminder.user_id);

      if (!content) {
        await supabase.from('reminders').update({ status: 'skipped' }).eq('id', reminder.id);
        continue;
      }

      const ok = await sendEmail(reminder.user_id, content.subject, content.body);

      if (ok) {
        await supabase
          .from('reminders')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', reminder.id);
        sent++;
      } else {
        await supabase
          .from('reminders')
          .update({ status: 'failed', error: 'sendEmail returned false' })
          .eq('id', reminder.id);
        failed++;
      }
    } catch (err) {
      console.error('Reminder failed', reminder.id, err);
      await supabase
        .from('reminders')
        .update({ status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' })
        .eq('id', reminder.id);
      failed++;
    }
  }

  return Response.json({ seeded, sent, failed }, { status: 200 });
}
