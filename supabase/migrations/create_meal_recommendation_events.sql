-- Create meal_recommendation_events table for logging recommendation events
-- This table stores recommendation history for future model retraining

CREATE TABLE IF NOT EXISTS meal_recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recommended_meal_ids TEXT[] NOT NULL,
  requested_meal_slot TEXT,
  user_profile_snapshot JSONB,
  remaining_macros_snapshot JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  outcome TEXT CHECK (outcome IN ('accepted', 'rejected_logged_other', NULL)),
  accepted_meal_id TEXT
);

-- Add foreign key constraint on user_id referencing auth.users
-- Note: Supabase uses auth.users for user authentication
ALTER TABLE meal_recommendation_events
ADD CONSTRAINT fk_meal_recommendation_events_user
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index on user_id for efficient querying by user
CREATE INDEX IF NOT EXISTS idx_meal_recommendation_events_user 
ON meal_recommendation_events(user_id);

-- Index on timestamp for efficient time-range queries
CREATE INDEX IF NOT EXISTS idx_meal_recommendation_events_timestamp 
ON meal_recommendation_events(timestamp);

-- Enable Row Level Security
ALTER TABLE meal_recommendation_events ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only read their own events
CREATE POLICY "user_select_own_recommendation_events" 
ON meal_recommendation_events
FOR SELECT 
USING (user_id = auth.uid());

-- RLS policy: Users can insert their own events
CREATE POLICY "user_insert_own_recommendation_events" 
ON meal_recommendation_events
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- RLS policy: Users can update their own events (for outcome updates)
CREATE POLICY "user_update_own_recommendation_events" 
ON meal_recommendation_events
FOR UPDATE 
USING (user_id = auth.uid());

-- Add comments to document the table and columns
COMMENT ON TABLE meal_recommendation_events IS 'Logs meal recommendation events for model retraining and analytics';
COMMENT ON COLUMN meal_recommendation_events.user_id IS 'User who received the recommendation';
COMMENT ON COLUMN meal_recommendation_events.recommended_meal_ids IS 'Array of meal IDs shown to the user (top 5)';
COMMENT ON COLUMN meal_recommendation_events.requested_meal_slot IS 'Meal slot requested (breakfast/lunch/dinner/snack)';
COMMENT ON COLUMN meal_recommendation_events.user_profile_snapshot IS 'Snapshot of user profile at recommendation time';
COMMENT ON COLUMN meal_recommendation_events.remaining_macros_snapshot IS 'Snapshot of remaining macros at recommendation time';
COMMENT ON COLUMN meal_recommendation_events.outcome IS 'User response: accepted, rejected_logged_other, or NULL (no action)';
COMMENT ON COLUMN meal_recommendation_events.accepted_meal_id IS 'Meal ID that was logged if outcome is accepted';
