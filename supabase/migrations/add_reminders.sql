CREATE TABLE IF NOT EXISTS reminders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL,
  type          TEXT        NOT NULL CHECK (type IN ('breakfast', 'lunch', 'dinner', 'water', 'daily_summary', 'next_day_meal_plan')),
  channel       TEXT        NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at       TIMESTAMPTZ,
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_status_scheduled
  ON reminders (status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_reminders_user_type_date
  ON reminders (user_id, type, scheduled_for);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_reminders" ON reminders
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "user_insert_own_reminders" ON reminders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_update_own_reminders" ON reminders
  FOR UPDATE USING (true);
