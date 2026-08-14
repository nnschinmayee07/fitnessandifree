# Goal-Based Workout Planner

## Overview

New AI-powered workout recommendation system that generates **7-day structured workout plans** based on comprehensive user profile analysis.

## What Changed

### 1. **New Engine: `GoalBasedPlanner`**
- Location: `/ml/engines/goal_based_planner.py`
- Replaces basic progressive overload heuristic with goal-oriented planning
- Uses exercise science principles (ACSM guidelines)

### 2. **Input Factors**
The planner now considers:
- ✅ **Goal**: lose_weight, gain_muscle, gain_strength, maintain, endurance
- ✅ **Activity Level**: sedentary, lightly_active, moderately_active, very_active
- ✅ **BMI & Body Composition**: weight_kg, height_cm
- ✅ **Demographics**: age, gender
- ✅ **Nutrition Targets**: target_calories, TDEE

### 3. **Output Structure**
- **7-day workout split** (automatically selected based on goal + activity level)
- Each day shows:
  - Workout type (e.g., "Upper Body Push", "Legs", "Rest")
  - 5-8 exercises with sets/reps/rest
  - Estimated duration
  - Focus muscle groups

## Training Split Logic

| Goal | Activity Level | Split | Training Days |
|------|----------------|-------|---------------|
| Weight Loss | Sedentary/Light | Full Body + Cardio | 5 days |
| Weight Loss | Moderate/Active | Upper/Lower | 4-5 days |
| Muscle Gain | Any | Push/Pull/Legs | 5-6 days |
| Strength | Any | Upper/Lower | 5 days |
| Maintain | Any | Full Body | 3 days |
| Endurance | Any | Circuit + Cardio | 5 days |

## Volume Prescriptions by Goal

| Goal | Sets | Reps | Rest | Intensity |
|------|------|------|------|-----------|
| Weight Loss | 3 | 12-15 | 45s | Moderate |
| Muscle Gain | 4 | 8-12 | 90s | High |
| Strength | 5 | 3-6 | 180s | Very High |
| Maintain | 3 | 8-12 | 60s | Moderate |
| Endurance | 3 | 15-20 | 30s | Low |

## Exercise Selection

1. **Compound movements prioritized** (Squats, Deadlifts, Bench Press, Rows)
2. **Isolation exercises** for volume balance
3. **Muscle group balancing** across the week
4. **Equipment-agnostic** (uses full 210-exercise curated dataset)

## How to Use

### 1. **Database Migration**
Run the new migration to create the `users` table:
```bash
# In Supabase dashboard, run:
supabase/migrations/create_users_table.sql
```

### 2. **Update User Profiles**
Ensure users have:
- Age and gender in `users` table
- Goal and activity_level in `nutrition_profiles` table

### 3. **Start ML Service**
```bash
# Default now uses goal_based planner
npm run ml

# Or explicitly set:
MODEL_TYPE=goal_based ./start-ml.sh
```

### 4. **View Recommendations**
- Navigate to `/workouts` page
- "Log Workout" tab now shows "TODAY'S RECOMMENDED WORKOUT"
- Recommendations update daily based on the 7-day plan

## Switching Engines

Set `MODEL_TYPE` environment variable:
- `goal_based` → New goal-oriented planner (DEFAULT)
- `heuristic` → Old progressive overload engine
- `lightgbm` → Future ML model (not yet trained)

## Example API Response

```json
{
  "recommended_exercises": [
    {
      "exercise_id": "uuid-123",
      "exercise_name": "Barbell Bench Press",
      "muscle_group": "chest",
      "target_sets": 4,
      "target_reps": 10,
      "suggested_weight_kg": 40.0,
      "rest_seconds": 90,
      "rationale": "Gain Muscle - High intensity"
    },
    {
      "exercise_id": "uuid-456",
      "exercise_name": "Incline Dumbbell Press",
      "muscle_group": "chest",
      "target_sets": 4,
      "target_reps": 10,
      "suggested_weight_kg": 15.0,
      "rest_seconds": 90,
      "rationale": "Gain Muscle - High intensity"
    }
  ],
  "plan_metadata": {
    "total_exercises": 7,
    "estimated_duration_minutes": 65,
    "focus_areas": ["chest", "shoulders", "arms"]
  }
}
```

## Future Enhancements

1. **ML Training Phase**
   - Log user adherence (did they follow the plan?)
   - Log user outcomes (strength gains, weight changes)
   - Train LightGBM model to personalize further

2. **Additional Features**
   - Equipment preferences
   - Injury history/exercise exclusions
   - Time constraints (30min vs 60min workouts)
   - Exercise variety preferences

3. **Progressive Overload Integration**
   - Track user's historical performance per exercise
   - Auto-adjust weights based on previous sessions
   - Combine goal-based planning with progression tracking

## Files Modified

- `/ml/engines/goal_based_planner.py` (new)
- `/ml/engines/base.py` (updated factory)
- `/ml/workout_recommender.py` (default engine changed)
- `/supabase/migrations/create_users_table.sql` (new)
- `/app/workouts/page.tsx` (added recommendation section back)
- `/components/workout/WorkoutRecommendation.tsx` (existing, now uses new engine)

## Testing

1. **Check ML service starts**:
   ```bash
   npm run ml
   # Should see: "Recommendation engine initialised: model_type=goal_based"
   ```

2. **Test API directly**:
   ```bash
   curl -X POST http://localhost:8001/workout/recommend \
     -H "Content-Type: application/json" \
     -d '{"user_id": "your-user-id", "date": "2025-01-15"}'
   ```

3. **View in UI**:
   - Navigate to `/workouts`
   - Should see "TODAY'S RECOMMENDED WORKOUT" card
   - Exercises should match your goal profile

## Troubleshooting

**No recommendations shown?**
- Check user has age/gender in `users` table
- Check user has goal/activity_level in `nutrition_profiles`
- Check ML service is running (`npm run ml`)

**Wrong exercises recommended?**
- Verify user profile goal is correct
- Check activity_level mapping
- Review logs: `journalctl -u ml-service -f` (or check terminal)

**Rest day shown?**
- This is correct! Goal-based planner includes rest days in the 7-day split
- Move to next day or manually log exercises
