-- ============================================================================
-- Weekly Workout Planner Migration
-- ============================================================================
-- Creates tables: weekly_workout_plans, weekly_plan_days, weekly_plan_exercises
-- Includes: constraints, indexes, RLS policies
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10
-- ============================================================================

-- ============================================================================
-- 1. WEEKLY_WORKOUT_PLANS TABLE
-- ============================================================================
-- Stores 7-day workout plans spanning Monday through Sunday
-- Users can only access their own plans (RLS enforced)
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Composite index for efficient weekly plan retrieval
CREATE INDEX IF NOT EXISTS idx_weekly_workout_plans_user_week ON weekly_workout_plans(user_id, week_start_date);

-- Enable RLS on weekly_workout_plans
ALTER TABLE weekly_workout_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_workout_plans
-- Users can SELECT only their own weekly plans
CREATE POLICY weekly_workout_plans_select ON weekly_workout_plans 
  FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Users can INSERT only their own weekly plans
CREATE POLICY weekly_workout_plans_insert ON weekly_workout_plans 
  FOR INSERT 
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Users can UPDATE only their own weekly plans
CREATE POLICY weekly_workout_plans_update ON weekly_workout_plans 
  FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Users can DELETE only their own weekly plans
CREATE POLICY weekly_workout_plans_delete ON weekly_workout_plans 
  FOR DELETE 
  TO authenticated
  USING (user_id = auth.uid()::text);

-- ============================================================================
-- 2. WEEKLY_PLAN_DAYS TABLE
-- ============================================================================
-- Individual days within a weekly plan (day_index 0-6 for Monday-Sunday)
-- RLS inherited from weekly_workout_plans through weekly_plan_id foreign key
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id UUID NOT NULL REFERENCES weekly_workout_plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  workout_type VARCHAR(50) NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL,
  focus_muscle_groups TEXT[] NOT NULL,
  adherence_status VARCHAR(20) NOT NULL DEFAULT 'not_started' 
    CHECK (adherence_status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(weekly_plan_id, day_index)
);

-- Indexes for weekly_plan_days table
CREATE INDEX IF NOT EXISTS idx_weekly_plan_days_weekly_plan_id ON weekly_plan_days(weekly_plan_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plan_days_adherence_status ON weekly_plan_days(adherence_status);

-- Enable RLS on weekly_plan_days
ALTER TABLE weekly_plan_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_plan_days
-- Users can SELECT plan_days if they own the parent weekly_workout_plan
CREATE POLICY weekly_plan_days_select ON weekly_plan_days 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_workout_plans 
      WHERE weekly_workout_plans.id = weekly_plan_days.weekly_plan_id 
        AND weekly_workout_plans.user_id = auth.uid()::text
    )
  );

-- Users can INSERT plan_days if they own the parent weekly_workout_plan
CREATE POLICY weekly_plan_days_insert ON weekly_plan_days 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_workout_plans 
      WHERE weekly_workout_plans.id = weekly_plan_days.weekly_plan_id 
        AND weekly_workout_plans.user_id = auth.uid()::text
    )
  );

-- Users can UPDATE plan_days if they own the parent weekly_workout_plan
CREATE POLICY weekly_plan_days_update ON weekly_plan_days 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_workout_plans 
      WHERE weekly_workout_plans.id = weekly_plan_days.weekly_plan_id 
        AND weekly_workout_plans.user_id = auth.uid()::text
    )
  );

-- Users can DELETE plan_days if they own the parent weekly_workout_plan
CREATE POLICY weekly_plan_days_delete ON weekly_plan_days 
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_workout_plans 
      WHERE weekly_workout_plans.id = weekly_plan_days.weekly_plan_id 
        AND weekly_workout_plans.user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- 3. WEEKLY_PLAN_EXERCISES TABLE
-- ============================================================================
-- Exercises assigned to specific plan days with target parameters
-- RLS inherited from weekly_plan_days through plan_day_id foreign key
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id UUID NOT NULL REFERENCES weekly_plan_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  target_sets INTEGER NOT NULL CHECK (target_sets BETWEEN 1 AND 10),
  target_reps INTEGER NOT NULL CHECK (target_reps BETWEEN 1 AND 999),
  suggested_weight_kg DECIMAL(6, 2) NOT NULL CHECK (suggested_weight_kg >= 0 AND suggested_weight_kg <= 9999.99),
  rest_seconds INTEGER NOT NULL CHECK (rest_seconds BETWEEN 0 AND 600),
  order_index INTEGER NOT NULL CHECK (order_index >= 0),
  rationale TEXT
);

-- Indexes for weekly_plan_exercises table
CREATE INDEX IF NOT EXISTS idx_weekly_plan_exercises_plan_day_id ON weekly_plan_exercises(plan_day_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plan_exercises_exercise_id ON weekly_plan_exercises(exercise_id);

-- Enable RLS on weekly_plan_exercises
ALTER TABLE weekly_plan_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_plan_exercises
-- Users can SELECT plan_exercises if they own the parent weekly_workout_plan
CREATE POLICY weekly_plan_exercises_select ON weekly_plan_exercises 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plan_days 
      JOIN weekly_workout_plans ON weekly_workout_plans.id = weekly_plan_days.weekly_plan_id
      WHERE weekly_plan_days.id = weekly_plan_exercises.plan_day_id 
        AND weekly_workout_plans.user_id = auth.uid()::text
    )
  );

-- Users can INSERT plan_exercises if they own the parent weekly_workout_plan
CREATE POLICY weekly_plan_exercises_insert ON weekly_plan_exercises 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_plan_days 
      JOIN weekly_workout_plans ON weekly_workout_plans.id = weekly_plan_days.weekly_plan_id
      WHERE weekly_plan_days.id = weekly_plan_exercises.plan_day_id 
        AND weekly_workout_plans.user_id = auth.uid()::text
    )
  );

-- Users can UPDATE plan_exercises if they own the parent weekly_workout_plan
CREATE POLICY weekly_plan_exercises_update ON weekly_plan_exercises 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plan_days 
      JOIN weekly_workout_plans ON weekly_workout_plans.id = weekly_plan_days.weekly_plan_id
      WHERE weekly_plan_days.id = weekly_plan_exercises.plan_day_id 
        AND weekly_workout_plans.user_id = auth.uid()::text
    )
  );

-- Users can DELETE plan_exercises if they own the parent weekly_workout_plan
CREATE POLICY weekly_plan_exercises_delete ON weekly_plan_exercises 
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_plan_days 
      JOIN weekly_workout_plans ON weekly_workout_plans.id = weekly_plan_days.weekly_plan_id
      WHERE weekly_plan_days.id = weekly_plan_exercises.plan_day_id 
        AND weekly_workout_plans.user_id = auth.uid()::text
    )
  );

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Trigger for weekly_workout_plans updated_at
DROP TRIGGER IF EXISTS update_weekly_workout_plans_updated_at ON weekly_workout_plans;
CREATE TRIGGER update_weekly_workout_plans_updated_at
  BEFORE UPDATE ON weekly_workout_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, execute the following SQL commands in order:
--
-- DROP TRIGGER IF EXISTS update_weekly_workout_plans_updated_at ON weekly_workout_plans;
-- DROP TABLE IF EXISTS weekly_plan_exercises CASCADE;
-- DROP TABLE IF EXISTS weekly_plan_days CASCADE;
-- DROP TABLE IF EXISTS weekly_workout_plans CASCADE;
--
-- Note: CASCADE will automatically drop dependent objects (foreign keys, policies, etc.)
-- This will permanently delete all weekly workout planner data.
-- ============================================================================
