ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS meal_type TEXT;
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS source    TEXT DEFAULT 'manual';
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS date      DATE DEFAULT CURRENT_DATE;
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS food_name TEXT;

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date
  ON meal_logs (user_id ASC, date DESC);

ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_meal_logs" ON meal_logs
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "user_insert_own_meal_logs" ON meal_logs
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "user_delete_own_meal_logs" ON meal_logs
  FOR DELETE USING (user_id = current_setting('app.current_user_id', true));
