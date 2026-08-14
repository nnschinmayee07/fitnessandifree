# Goal-Based Workout Planner - Demo Output

## Sample User Profile

**User:** John Doe (28, Male)
- **Goal:** Muscle Gain (Hypertrophy)
- **Activity Level:** Moderately Active
- **Stats:** 75kg, 175cm (BMI: 24.5)
- **Nutrition:** 2800 kcal/day, 150g protein

---

## Selected Training Split: Push/Pull/Legs (6 days/week)

Based on goal (Muscle Gain) + activity level (Moderately Active), the system selects a **Push/Pull/Legs** split:

| Day | Workout Type | Focus |
|-----|--------------|-------|
| Monday | **Push** | Chest, Shoulders, Triceps |
| Tuesday | **Pull** | Back, Biceps |
| Wednesday | **Legs** | Quads, Hamstrings, Glutes, Calves |
| Thursday | **Push** | Chest, Shoulders, Triceps |
| Friday | **Pull** | Back, Biceps |
| Saturday | **Legs** | Quads, Hamstrings, Glutes, Calves |
| Sunday | **Rest** | Active Recovery |

---

## Today's Workout: Push Day (Chest, Shoulders, Triceps)

### Volume Prescription for Muscle Gain:
- **Sets per Exercise:** 4
- **Rep Range:** 8-12 reps
- **Rest Time:** 90 seconds
- **Intensity:** High
- **Total Duration:** ~65 minutes

### Recommended Exercises:

#### 1. **Barbell Bench Press** ⭐ Compound
- **Muscle:** Chest
- **Volume:** 4 sets × 10 reps
- **Weight:** 40.0 kg
- **Rest:** 90s
- **Rationale:** Gain Muscle - High intensity

#### 2. **Incline Dumbbell Press** ⭐ Compound
- **Muscle:** Chest
- **Volume:** 4 sets × 10 reps
- **Weight:** 15.0 kg (per dumbbell)
- **Rest:** 90s
- **Rationale:** Gain Muscle - High intensity

#### 3. **Dumbbell Flyes**
- **Muscle:** Chest
- **Volume:** 4 sets × 10 reps
- **Weight:** 15.0 kg
- **Rest:** 90s
- **Rationale:** Gain Muscle - High intensity

#### 4. **Overhead Press** ⭐ Compound
- **Muscle:** Shoulders
- **Volume:** 4 sets × 10 reps
- **Weight:** 40.0 kg
- **Rest:** 90s
- **Rationale:** Gain Muscle - High intensity

#### 5. **Lateral Raises**
- **Muscle:** Shoulders
- **Volume:** 4 sets × 10 reps
- **Weight:** 15.0 kg
- **Rest:** 90s
- **Rationale:** Gain Muscle - High intensity

#### 6. **Skull Crushers**
- **Muscle:** Arms (Triceps)
- **Volume:** 4 sets × 10 reps
- **Weight:** 40.0 kg
- **Rest:** 90s
- **Rationale:** Gain Muscle - High intensity

#### 7. **Tricep Pushdown**
- **Muscle:** Arms (Triceps)
- **Volume:** 4 sets × 10 reps
- **Weight:** 20.0 kg
- **Rest:** 90s
- **Rationale:** Gain Muscle - High intensity

---

## Weekly Volume Distribution

| Muscle Group | Sets/Week | Exercises |
|--------------|-----------|-----------|
| Chest | 16 sets | Bench Press, Incline Press, Flyes, Dips |
| Shoulders | 16 sets | OHP, Lateral Raises, Front Raises, Rear Delts |
| Triceps | 12 sets | Pushdowns, Skull Crushers, Dips |
| Back | 18 sets | Deadlifts, Rows, Pull-ups, Lat Pulldowns |
| Biceps | 12 sets | Curls, Hammer Curls, Cable Curls |
| Legs | 20 sets | Squats, RDLs, Leg Press, Leg Curls, Calf Raises |

**Total Weekly Volume:** ~94 sets (optimal for hypertrophy)

---

## Comparison with Other Goals

### If Goal = "Weight Loss" (Sedentary Activity):
- **Split:** Full Body + Cardio (5 days/week)
- **Volume:** 3 sets × 12-15 reps
- **Rest:** 45 seconds
- **Intensity:** Moderate
- **Example Day:**
  - Full Body Circuit: Squats, Push-ups, Rows, Lunges, Planks
  - 6 exercises × 3 sets = 18 total sets
  - 40 minute workout
  - High calorie burn emphasis

### If Goal = "Gain Strength":
- **Split:** Upper/Lower (5 days/week)
- **Volume:** 5 sets × 3-6 reps
- **Rest:** 180 seconds (3 minutes)
- **Intensity:** Very High
- **Example Day:**
  - Heavy Compounds: Squat, Deadlift, Bench Press, Overhead Press
  - 5 exercises × 5 sets = 25 total sets
  - 75 minute workout
  - Maximal strength focus

### If Goal = "Maintain":
- **Split:** Full Body (3 days/week)
- **Volume:** 3 sets × 8-12 reps
- **Rest:** 60 seconds
- **Intensity:** Moderate
- **Example Day:**
  - Balanced workout: Squat, Bench, Row, OHP, Curls, Planks
  - 6 exercises × 3 sets = 18 total sets
  - 45 minute workout
  - Time-efficient maintenance

---

## Progressive Overload Integration (Future)

Once the user starts logging workouts, the system will:

1. **Track Performance:** Record actual weights, reps, RPE per exercise
2. **Adjust Weights:** Increase/decrease based on performance
3. **Adapt Volume:** Add/reduce sets based on recovery
4. **Personalize Selection:** Learn user preferences (equipment, exercise variety)

### Example Progression:
**Week 1:** Bench Press 40kg × 4×10
**Week 2:** Bench Press 42.5kg × 4×10 _(+2.5kg increase)_
**Week 3:** Bench Press 45kg × 4×10 _(+2.5kg increase)_
**Week 4:** Deload - Bench Press 40kg × 3×8 _(recovery week)_

---

## API Response Format

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
    }
    // ... 6 more exercises
  ],
  "plan_metadata": {
    "total_exercises": 7,
    "estimated_duration_minutes": 65,
    "focus_areas": ["chest", "shoulders", "arms"]
  }
}
```

---

## Frontend Display

The `/workouts` page now shows:

```
┌─────────────────────────────────────────────┐
│  TODAY'S RECOMMENDED WORKOUT                │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Push Day · 7 exercises · 65 minutes    │
│  🎯 Focus: Chest, Shoulders, Arms          │
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  💪 1. Barbell Bench Press                 │
│     Chest · 4 × 10 · 40kg · Rest 90s      │
│     ▸ Gain Muscle - High intensity         │
│                                             │
│  💪 2. Incline Dumbbell Press              │
│     Chest · 4 × 10 · 15kg · Rest 90s      │
│     ▸ Gain Muscle - High intensity         │
│                                             │
│  ... (5 more exercises)                     │
│                                             │
└─────────────────────────────────────────────┘
```

Users can:
- ✅ View their personalized daily workout
- ✅ See recommended weights based on their profile
- ✅ Navigate through the week to see upcoming workouts
- ✅ Manually log sets as they complete them

---

**Status:** ✅ Fully Functional & Ready for Production
