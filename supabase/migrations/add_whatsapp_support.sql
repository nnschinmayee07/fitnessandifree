ALTER TABLE nutrition_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_nutrition_profiles_phone
  ON nutrition_profiles (phone_number)
  WHERE phone_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS message_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT,
  phone_number  TEXT        NOT NULL,
  direction     TEXT        NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_text  TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_logs_phone_time
  ON message_logs (phone_number ASC, created_at DESC);

ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_message_logs" ON message_logs
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "user_insert_own_message_logs" ON message_logs
  FOR INSERT WITH CHECK (true);
