// ============================================================================
// Weekly Workout Planner Types
// ============================================================================
// TypeScript interfaces matching database schema for weekly workout planner
// Requirements: 1.1, 1.2, 1.3, 2.1-2.10, 3.1-3.10, 4.1-4.10, 5.1-5.10, 6.1-6.10
// ============================================================================

// ============================================================================
// String Literal Types
// ============================================================================

/**
 * Valid adherence status values for plan days
 * Maps to weekly_plan_days.adherence_status CHECK constraint
 */
export type AdherenceStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'skipped';

// ============================================================================
// Database Row Types
// ============================================================================

/**
 * Weekly workout plan record (7-day plan spanning Monday-Sunday)
 * Maps to weekly_workout_plans table
 */
export interface WeeklyPlanRow {
  id: string;
  user_id: string;
  week_start_date: string;    // DATE in YYYY-MM-DD format (always Monday)
  created_at: string;          // ISO-8601 timestamp
  updated_at: string;          // ISO-8601 timestamp
}

/**
 * Individual day within a weekly plan (day_index 0-6 for Monday-Sunday)
 * Maps to weekly_plan_days table
 */
export interface PlanDayRow {
  id: string;
  weekly_plan_id: string;
  day_index: number;                    // 0-6 (Monday-Sunday)
  workout_type: string;
  estimated_duration_minutes: number;
  focus_muscle_groups: string[];        // TEXT[] array
  adherence_status: AdherenceStatus;
  completed_at: string | null;          // ISO-8601 timestamp
  created_at: string;                   // ISO-8601 timestamp
}

/**
 * Exercise within a plan day with target parameters
 * Maps to weekly_plan_exercises table
 */
export interface PlanExerciseRow {
  id: string;
  plan_day_id: string;
  exercise_id: string;
  target_sets: number;             // 1-10
  target_reps: number;             // 1-999
  suggested_weight_kg: number;     // DECIMAL(6,2), 0-9999.99
  rest_seconds: number;            // 0-600
  order_index: number;             // >= 0
  rationale: string | null;
}

// ============================================================================
// Composite Types
// ============================================================================

/**
 * Exercise data with details from exercises table
 * Used when returning plan days with joined exercise information
 */
export interface PlanExerciseWithDetails extends PlanExerciseRow {
  exercise_name: string;
  muscle_group: string;
  equipment: string;
}

/**
 * Plan day with its associated exercises
 * Used when returning a single day's workout details
 */
export interface PlanDayWithExercises extends PlanDayRow {
  exercises: PlanExerciseWithDetails[];
}

/**
 * Complete weekly plan with all days and exercises
 * Used in GET /api/workout/weekly-plan response
 */
export interface WeeklyPlanWithDays extends WeeklyPlanRow {
  plan_days: PlanDayWithExercises[];
  plan_metadata: {
    total_weekly_duration_minutes: number;
  };
}

/**
 * Day-of-week adherence statistics
 * Used in adherence history breakdown
 */
export interface DayOfWeekStats {
  day_of_week: string;          // "Monday", "Tuesday", etc.
  total_planned: number;
  completed: number;
  completion_rate_percentage: number;
}

/**
 * Adherence statistics for a specific week
 * Used in adherence history response
 */
export interface WeeklyAdherenceStats {
  week_start_date: string;                // YYYY-MM-DD format
  total_planned_days: number;
  completed_days: number;
  skipped_days: number;
  completion_rate_percentage: number;
  average_workout_duration_minutes: number;
}

/**
 * Complete adherence history with aggregated statistics
 * Used in GET /api/workout/weekly-plan/adherence-history response
 */
export interface AdherenceStats {
  weekly_stats: WeeklyAdherenceStats[];
  day_of_week_breakdown: DayOfWeekStats[];
  most_completed_muscle_groups: string[];  // Top 3
  overall_completion_rate_percentage: number;
}

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Request to create a new 7-day weekly workout plan
 * Used in POST /api/workout/weekly-plan
 */
export interface CreateWeeklyPlanRequest {
  user_id: string;
  week_start_date: string;     // YYYY-MM-DD format (will be adjusted to Monday)
}

/**
 * Request to regenerate exercises for a specific day
 * Used in POST /api/workout/weekly-plan/regenerate-day
 */
export interface RegenerateDayRequest {
  weekly_plan_id: string;
  day_index: number;           // 0-6 (Monday-Sunday)
}

/**
 * Request to update adherence status for a plan day
 * Used in PATCH /api/workout/weekly-plan/adherence
 */
export interface UpdateAdherenceRequest {
  plan_day_id: string;
  adherence_status: AdherenceStatus;
}

/**
 * Query parameters for retrieving adherence history
 * Used in GET /api/workout/weekly-plan/adherence-history
 */
export interface AdherenceHistoryQuery {
  user_id: string;
  weeks_back?: number;         // Default: 4, Max: 12
}

// ============================================================================
// ML Engine Integration Types
// ============================================================================

/**
 * Single exercise recommendation from ML Engine
 * Part of MLRecommendResponse
 */
export interface MLExerciseRecommendation {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  target_sets: number;
  target_reps: number;
  suggested_weight_kg: number;
  rest_seconds: number;
  rationale: string;
}

/**
 * Metadata for a daily workout recommendation
 * Part of MLRecommendResponse
 */
export interface MLPlanMetadata {
  total_exercises: number;
  estimated_duration_minutes: number;
  focus_areas: string[];
}

/**
 * Single day recommendation from ML Engine
 * Used in ML_Engine responses
 */
export interface MLRecommendResponse {
  date: string;                              // YYYY-MM-DD format
  workout_type: string;                      // e.g., "Push", "Pull", "Legs", "rest"
  recommended_exercises: MLExerciseRecommendation[];
  plan_metadata: MLPlanMetadata;
}

/**
 * Request to ML Engine for single day recommendation
 * Used when calling ML_Engine /workout/recommend endpoint
 */
export interface MLRecommendRequest {
  user_id: string;
  date: string;                              // YYYY-MM-DD format
}

/**
 * Request to ML Engine for weekly (7-day) recommendations
 * Used when calling ML_Engine /workout/recommend-week endpoint
 */
export interface MLWeeklyRecommendRequest {
  user_id: string;
  week_start_date: string;                   // YYYY-MM-DD format (Monday)
}

/**
 * Response from ML Engine for weekly recommendations
 * Array of 7 daily recommendations
 */
export interface MLWeeklyRecommendResponse {
  recommendations: MLRecommendResponse[];    // Array of 7 elements
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Success response for weekly plan creation
 * Returned by POST /api/workout/weekly-plan
 */
export interface CreateWeeklyPlanResponse {
  success: true;
  data: WeeklyPlanWithDays;
}

/**
 * Success response for day regeneration
 * Returned by POST /api/workout/weekly-plan/regenerate-day
 */
export interface RegenerateDayResponse {
  success: true;
  data: PlanDayWithExercises;
}

/**
 * Success response for adherence update
 * Returned by PATCH /api/workout/weekly-plan/adherence
 */
export interface UpdateAdherenceResponse {
  success: true;
  data: PlanDayRow;
}

/**
 * Error response structure for all weekly planner endpoints
 * Used for consistent error handling
 */
export interface WeeklyPlannerErrorResponse {
  error: string;
  code: 
    | 'INVALID_JSON'
    | 'VALIDATION_ERROR'
    | 'FORBIDDEN'
    | 'DATABASE_ERROR'
    | 'SERVICE_UNAVAILABLE'
    | 'INVALID_ML_RESPONSE'
    | 'PLAN_NOT_FOUND'
    | 'PLAN_DAY_NOT_FOUND'
    | 'NO_PLAN_FOUND'
    | 'INVALID_DAY_INDEX'
    | 'PLAN_ALREADY_EXISTS'
    | 'ML_ENGINE_ERROR';
  details?: Record<string, unknown>;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of input validation
 * Used by validation functions
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}
