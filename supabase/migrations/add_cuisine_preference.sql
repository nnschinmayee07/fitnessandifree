-- Add cuisine_preference column to nutrition_profiles table
-- This allows users to specify their preferred cuisine type for meal recommendations

ALTER TABLE nutrition_profiles 
ADD COLUMN IF NOT EXISTS cuisine_preference TEXT;

-- Add check constraint to ensure valid cuisine types (matching meals table)
-- Valid values: 'American', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'South Indian', 'North Indian'
-- NULL is allowed (represents no preference)
ALTER TABLE nutrition_profiles
ADD CONSTRAINT check_cuisine_preference 
CHECK (cuisine_preference IS NULL OR cuisine_preference IN ('American', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'South Indian', 'North Indian'));

-- Add comment to document the column
COMMENT ON COLUMN nutrition_profiles.cuisine_preference IS 'User preferred cuisine type for meal recommendations. NULL indicates no preference.';
