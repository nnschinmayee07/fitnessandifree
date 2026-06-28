-- =============================================================================
-- meal-images Storage Bucket Configuration
-- =============================================================================
-- Bucket name  : meal-images
-- Public access: false  (objects are NOT accessible via unauthenticated URLs)
-- Signed URLs  : required for all object access; validity window 1–3600 seconds
--
-- PREREQUISITE: The bucket MUST be created manually via the Supabase dashboard
-- or CLI before running the API route at app/api/nutrition/analyze/route.ts.
-- See supabase/README.md for step-by-step creation instructions.
--
-- NOTE: Supabase Storage buckets cannot be created through SQL migrations.
-- This comment block serves as documentation only.  The storage.sql file at
-- supabase/storage.sql mirrors this configuration for reference.
-- =============================================================================

CREATE TABLE IF NOT EXISTS meal_logs (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT         NOT NULL,
  logged_at   TIMESTAMPTZ  DEFAULT now(),
  meal_name   TEXT,
  confidence  NUMERIC(4,2) CHECK (confidence >= 0.00 AND confidence <= 1.00),
  calories    NUMERIC(10,2),
  protein_g   NUMERIC(10,2),
  carbs_g     NUMERIC(10,2),
  fat_g       NUMERIC(10,2),
  fiber_g     NUMERIC(10,2),
  image_url   TEXT
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_time
  ON meal_logs (user_id ASC, logged_at DESC);
