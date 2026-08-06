-- Create meals table for LightGBM meal ranker
-- This table stores candidate meals with their nutritional information

CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cuisine_type TEXT,
  meal_slot TEXT CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories INTEGER NOT NULL CHECK (calories >= 0),
  protein_g NUMERIC(6,2) NOT NULL CHECK (protein_g >= 0),
  carbs_g NUMERIC(6,2) NOT NULL CHECK (carbs_g >= 0),
  fat_g NUMERIC(6,2) NOT NULL CHECK (fat_g >= 0),
  ingredients TEXT[]
);

-- Index on meal_slot for efficient filtering by time of day
CREATE INDEX IF NOT EXISTS idx_meals_slot ON meals(meal_slot);

-- Index on cuisine_type for efficient filtering by cuisine preference
CREATE INDEX IF NOT EXISTS idx_meals_cuisine ON meals(cuisine_type);

-- No RLS needed - meals table is read-only reference data accessible to all users
