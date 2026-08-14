# Weekly Workout Planner Migration Guide

This directory contains the SQL migration for the Weekly Workout Planner feature.

## Migration File

**`create_weekly_workout_planner_tables.sql`** - Creates three new tables:
- `weekly_workout_plans` - Stores 7-day workout plans
- `weekly_plan_days` - Individual days within weekly plans (day_index 0-6)
- `weekly_plan_exercises` - Exercises assigned to specific plan days

## Quick Start

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor:**
   - Go to your Supabase project's SQL Editor
   - Click "New Query"

2. **Run the Migration:**
   - Copy the entire contents of `create_weekly_workout_planner_tables.sql`
   - Paste into the SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

3. **Verify the Setup:**
   - Check that all three tables were created successfully
   - Verify that RLS policies are enabled on all tables
   - Confirm that indexes and constraints are in place

### Option 2: Supabase CLI

If you have the Supabase CLI installed and linked:

```bash
# Push this specific migration
supabase db push

# Or run the migration directly
supabase db execute -f supabase/migrations/create_weekly_workout_planner_tables.sql
```

## What Gets Created

### Tables

1. **weekly_workout_plans**
   - `id` (UUID, PRIMARY KEY)
   - `user_id` (VARCHAR(255), NOT NULL)
   - `week_start_date` (DATE, NOT NULL)
   - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now())
   - `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now())
   - UNIQUE constraint on `(user_id, week_start_date)`

2. **weekly_plan_days**
   - `id` (UUID, PRIMARY KEY)
   - `weekly_plan_id` (UUID, NOT NULL, FOREIGN KEY → weekly_workout_plans)
   - `day_index` (INTEGER, NOT NULL, CHECK 0-6)
   - `workout_type` (VARCHAR(50), NOT NULL)
   - `estimated_duration_minutes` (INTEGER, NOT NULL)
   - `focus_muscle_groups` (TEXT[], NOT NULL)
   - `adherence_status` (VARCHAR(20), NOT NULL, DEFAULT 'not_started')
   - `completed_at` (TIMESTAMPTZ)
   - `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now())
   - UNIQUE constraint on `(weekly_plan_id, day_index)`
   - CHECK constraint: `adherence_status IN ('not_started', 'in_progress', 'completed', 'skipped')`

3. **weekly_plan_exercises**
   - `id` (UUID, PRIMARY KEY)
   - `plan_day_id` (UUID, NOT NULL, FOREIGN KEY → weekly_plan_days)
   - `exercise_id` (UUID, NOT NULL, FOREIGN KEY → exercises)
   - `target_sets` (INTEGER, NOT NULL, CHECK 1-10)
   - `target_reps` (INTEGER, NOT NULL, CHECK 1-999)
   - `suggested_weight_kg` (DECIMAL(6,2), NOT NULL, CHECK 0-9999.99)
   - `rest_seconds` (INTEGER, NOT NULL, CHECK 0-600)
   - `order_index` (INTEGER, NOT NULL, CHECK >= 0)
   - `rationale` (TEXT)

### Foreign Key Constraints

All foreign keys use `ON DELETE CASCADE` behavior:
- Deleting a weekly_workout_plan cascades to its weekly_plan_days
- Deleting a weekly_plan_day cascades to its weekly_plan_exercises
- exercise_id references the existing exercises table

### Indexes

- `idx_weekly_workout_plans_user_week` on `(user_id, week_start_date)` - Composite index for efficient retrieval
- `idx_weekly_plan_days_weekly_plan_id` on `weekly_plan_id`
- `idx_weekly_plan_days_adherence_status` on `adherence_status`
- `idx_weekly_plan_exercises_plan_day_id` on `plan_day_id`
- `idx_weekly_plan_exercises_exercise_id` on `exercise_id`

### Row Level Security (RLS)

All three tables have RLS enabled with user isolation policies:
- Users can only SELECT, INSERT, UPDATE, and DELETE their own data
- Policies use `auth.uid()::text` to match against `user_id`
- Child table policies (weekly_plan_days, weekly_plan_exercises) verify ownership through parent table JOINs

### Triggers

- `update_weekly_workout_plans_updated_at` - Automatically updates `updated_at` timestamp on weekly_workout_plans

## Requirements Fulfilled

This migration satisfies **Requirement 1: Weekly Plan Storage** from the spec:
- ✅ 1.1 - weekly_workout_plans table with all required columns
- ✅ 1.2 - weekly_plan_days table with all required columns
- ✅ 1.3 - weekly_plan_exercises table with all required columns
- ✅ 1.4 - Foreign key from weekly_plan_days to weekly_workout_plans with CASCADE
- ✅ 1.5 - Foreign key from weekly_plan_exercises to weekly_plan_days with CASCADE
- ✅ 1.6 - Foreign key from weekly_plan_exercises to exercises
- ✅ 1.7 - CHECK constraint on day_index (0-6)
- ✅ 1.8 - UNIQUE constraint on (weekly_plan_id, day_index)
- ✅ 1.9 - Composite index on (user_id, week_start_date)
- ✅ 1.10 - Row Level Security enabled with user_id isolation

## Rollback

To rollback this migration, run the following SQL:

```sql
DROP TRIGGER IF EXISTS update_weekly_workout_plans_updated_at ON weekly_workout_plans;
DROP TABLE IF EXISTS weekly_plan_exercises CASCADE;
DROP TABLE IF EXISTS weekly_plan_days CASCADE;
DROP TABLE IF EXISTS weekly_workout_plans CASCADE;
```

**Warning:** This will permanently delete all weekly workout planner data.

## Dependencies

This migration assumes:
- The `exercises` table already exists (from `create_workout_tracking_tables.sql`)
- The `update_updated_at_column()` function already exists (from `create_workout_tracking_tables.sql`)
- Supabase auth is configured and `auth.uid()` is available

## Related Files

- `/.kiro/specs/weekly-workout-planner/` - Feature specification
- `/lib/weekly-planner/` - Data access layer (to be implemented)
- `/app/api/workout/weekly-plan/` - API routes (to be implemented)

## Task Completion

This migration completes **Task 1: Set up database schema and migrations** from the weekly-workout-planner spec.
