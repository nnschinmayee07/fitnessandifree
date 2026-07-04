export type ReminderType = 'breakfast' | 'lunch' | 'dinner' | 'water' | 'daily_summary' | 'next_day_meal_plan';
export type ReminderChannel = 'email' | 'whatsapp';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface ReminderRow {
  id: string;
  user_id: string;
  type: ReminderType;
  channel: ReminderChannel;
  status: ReminderStatus;
  scheduled_for: string; // ISO-8601 timestamptz
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

export interface ReminderInsert {
  user_id: string;
  type: ReminderType;
  channel: ReminderChannel;
  scheduled_for: string;
}
