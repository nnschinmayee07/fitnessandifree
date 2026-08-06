# Meals Table Migration Guide

This directory contains SQL migrations for the meals table used by the LightGBM Meal Ranker feature.

## Quick Start

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor:**
   - Go to: https://app.supabase.com/project/osnnnvzuywfzhzhbcvha/sql
   - Click "New Query"

2. **Run the Table Creation Migration:**
   - Copy the entire contents of `create_meals_table.sql`
   - Paste into the SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

3. **Run the Seed Data Migration:**
   - Copy the entire contents of `seed_meals_data.sql`
   - Paste into the SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify the Setup:**
   ```bash
   node scripts/verify-meals.mjs
   ```

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your project (first time only)
supabase link --project-ref osnnnvzuywfzhzhbcvha

# Push migrations
supabase db push

# Verify
node scripts/verify-meals.mjs
```

## What Gets Created

### Tables

**meals** table with the following structure:
- `id` (TEXT, PRIMARY KEY) - Unique meal identifier
- `name` (TEXT, NOT NULL) - Meal name
- `description` (TEXT) - Meal description
- `cuisine_type` (TEXT) - Cuisine category
- `meal_slot` (TEXT) - When to eat (breakfast/lunch/dinner/snack)
- `calories` (INTEGER, NOT NULL, >= 0) - Calorie content
- `protein_g` (NUMERIC, NOT NULL, >= 0) - Protein in grams
- `carbs_g` (NUMERIC, NOT NULL, >= 0) - Carbohydrates in grams
- `fat_g` (NUMERIC, NOT NULL, >= 0) - Fat in grams
- `ingredients` (TEXT[]) - Array of ingredient names

### Indexes

- `idx_meals_slot` on `meal_slot` - For efficient filtering by meal time
- `idx_meals_cuisine` on `cuisine_type` - For efficient filtering by cuisine

### Data

105 diverse meals:
- 25 breakfast meals
- 25 lunch meals
- 30 dinner meals
- 25 snack meals

Covering 5 cuisine types:
- American
- Italian
- Mexican
- Asian
- Mediterranean

## Validation

Run the verification script to ensure everything is set up correctly:

```bash
node scripts/verify-meals.mjs
```

Expected output:
```
✅ Meals table exists with 105 meals

📊 Meals by slot:
   breakfast: 25
   lunch: 25
   dinner: 30
   snack: 25

🍽️  Meals by cuisine:
   American: XX
   Italian: XX
   Mexican: XX
   Asian: XX
   Mediterranean: XX

✓ Requirements validation:
   ✅ At least 100 meals (have 105)
   ✅ All meal slots covered
   ✅ At least 5 cuisine types (have 5)

🎉 All requirements met! Task 6 is complete.
```

## Troubleshooting

### Error: "Could not find the table 'public.meals'"

The table hasn't been created yet. Run the `create_meals_table.sql` migration first.

### Error: "duplicate key value violates unique constraint"

The seed data has already been inserted. You can skip the seed migration or delete existing data first:

```sql
TRUNCATE TABLE meals;
```

Then re-run the seed migration.

### Missing Supabase credentials

Ensure your `.env.local` file contains:
```
SUPABASE_URL=https://osnnnvzuywfzhzhbcvha.supabase.co
SUPABASE_SERVICE_KEY=<your-service-key>
```

## Related Files

- `/lib/meal-recommender/` - LightGBM meal ranking implementation
- `/.kiro/specs/lightgbm-meal-ranker/` - Feature specification
- `/scripts/verify-meals.mjs` - Verification script

## Task Completion

This migration fulfills **Task 6** of the LightGBM Meal Ranker spec:
- ✅ SQL migration creates `meals` table with all required columns
- ✅ Indexes on meal_slot and cuisine_type
- ✅ 100+ diverse meals (105 total)
- ✅ All meal slots covered (breakfast/lunch/dinner/snack)
- ✅ 5+ cuisine types represented
- ✅ All macro nutrients validated as non-negative
