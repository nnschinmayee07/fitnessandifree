# Changelog

All notable changes to this project are documented in this file.
Format: [Semantic Versioning](https://semver.org/)

## [0.2.0] - 2025-01-XX

### Added — Workout Tracking System

#### Database
- Migration: 5-table workout schema (exercises, workout_plans, plan_exercises, workout_logs, logged_sets)
- RLS policies for user data isolation
- Exercise library seed script (free-exercise-db dataset)

#### TypeScript
- `lib/types/workout.ts` — WorkoutPlanRow, WorkoutLogRow, LoggedSetRow, ExerciseRow interfaces
- `lib/workout/calculations.ts` — Epley 1RM formula, volume calculation, progressive overload
- `lib/workout/realtime.ts` — Supabase real-time subscription helper with exponential backoff
- `lib/workout/offline-queue.ts` — localStorage-backed offline mutation queue with background sync

#### API Routes
- `POST /api/workout/plan` — create workout plan with exercises
- `POST /api/workout/session` — start workout session
- `PATCH /api/workout/session/:id` — update session status
- `POST /api/workout/set` — log set with validation
- `GET /api/workout/history` — fetch workout history with volume aggregation

#### Frontend Components
- `SessionLogger` — real-time set logging with optimistic updates, rest timer, keyboard nav
- `ProgressHistory` — workout history with SVG volume chart and 1RM estimates
- `WorkoutRecommendation` — AI recommendation display with exercise cards
- `WorkoutDashboard` — unified page at /workouts

#### FastAPI Service
- `ml/workout_recommender.py` — FastAPI service on port 8001
- `ml/engines/heuristic.py` — progressive overload heuristic algorithm
- `ml/engines/lightgbm_engine.py` — LightGBM stub for future ML model

#### Testing
- Property-based tests: Epley monotonicity, volume commutativity, weight cap, RPE bounds
- Unit tests: all API routes, type guards, calculations, offline queue
- Integration tests: heuristic engine scenarios, dashboard workflow
- Component tests: SessionLogger (19 tests), ProgressHistory (15 tests), WorkoutRecommendation (9 tests)
