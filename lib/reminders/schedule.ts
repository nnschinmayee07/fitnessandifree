import type { ReminderType } from '@/lib/types/reminder';

// V1: fixed daily times for every user (no per-user scheduling UI yet).
// Hour is in the server's local time zone.
export const REMINDER_SCHEDULE: Array<{ type: ReminderType; hour: number; minute: number }> = [
  { type: 'breakfast', hour: 8, minute: 0 },
  { type: 'lunch', hour: 13, minute: 0 },
  { type: 'water', hour: 11, minute: 0 },
  { type: 'water', hour: 15, minute: 0 },
  { type: 'water', hour: 18, minute: 0 },
  { type: 'dinner', hour: 20, minute: 0 },
  { type: 'daily_summary', hour: 21, minute: 0 },
  { type: 'next_day_meal_plan', hour: 21, minute: 15 },
];

export function scheduledForToday(hour: number, minute: number, now: Date): Date {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  return d;
}
