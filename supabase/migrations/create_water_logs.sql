CREATE TABLE IF NOT EXISTS water_logs (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT    NOT NULL,
  amount_ml  INTEGER NOT NULL CHECK (amount_ml > 0),
  date       DATE    NOT NULL DEFAULT CURRENT_DATE,
  logged_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date
  ON water_logs (user_id ASC, date DESC);

ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_water_logs" ON water_logs
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "user_insert_own_water_logs" ON water_logs
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));
