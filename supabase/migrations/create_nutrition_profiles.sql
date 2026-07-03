CREATE TABLE IF NOT EXISTS nutrition_profiles (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT         NOT NULL UNIQUE,
  age              INTEGER,
  gender           TEXT,
  height_cm        NUMERIC(6,2),
  weight_kg        NUMERIC(6,2),
  activity_level   TEXT,
  goal             TEXT,
  bmi              NUMERIC(5,2),
  bmi_category     TEXT,
  target_calories  INTEGER,
  target_protein_g INTEGER,
  target_carbs_g   INTEGER,
  target_fat_g     INTEGER,
  target_water_ml  INTEGER,
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_user
  ON nutrition_profiles (user_id);

ALTER TABLE nutrition_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_profile" ON nutrition_profiles
  FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "user_insert_own_profile" ON nutrition_profiles
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "user_update_own_profile" ON nutrition_profiles
  FOR UPDATE USING (user_id = current_setting('app.current_user_id', true));
