// ============================================================================
// Weekly Workout Planner - ML Engine Client
// ============================================================================
// HTTP client for ML Engine integration with timeout and error handling
// Requirements: 2.1, 2.4, 9.5, 9.6, 10.7
// ============================================================================

import type {
  MLRecommendRequest,
  MLRecommendResponse,
} from '@/lib/types/weekly-planner';
import {
  logMLEngineRequest,
  logMLEngineResponse,
  logMLEngineError,
  createTimer,
} from './logger';
import { MLEngineError, InvalidMLResponseError } from './errors';

// ============================================================================
// Constants
// ============================================================================

/**
 * Base URL for ML Engine service
 * Defaults to localhost:8001 for local development
 */
const ML_SERVICE_URL =
  process.env.NEXT_PUBLIC_ML_SERVICE_URL ?? 'http://localhost:8001';

/**
 * HTTP request timeout for ML Engine calls (10 seconds)
 * **Validates: Requirement 10.7**
 */
const ML_REQUEST_TIMEOUT_MS = 10_000;

// ============================================================================
// Error Classes (Re-exported from centralized errors module)
// ============================================================================

export { MLEngineError, InvalidMLResponseError };

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates ML Engine response structure
 * 
 * Checks for required fields:
 * - recommended_exercises (array)
 * - plan_metadata (object)
 * - plan_metadata.total_exercises (number)
 * - plan_metadata.estimated_duration_minutes (number)
 * - plan_metadata.focus_areas (array)
 * 
 * Each exercise must have:
 * - exercise_id, exercise_name, muscle_group (strings)
 * - target_sets, target_reps, rest_seconds (numbers)
 * - suggested_weight_kg (number)
 * - rationale (string)
 * 
 * @param response - Response object from ML Engine
 * @throws InvalidMLResponseError if structure is invalid
 * 
 * **Validates: Requirement 9.6**
 */
function validateMLResponse(response: unknown): asserts response is MLRecommendResponse {
  const missingFields: string[] = [];

  // Type guard
  if (!response || typeof response !== 'object') {
    throw new InvalidMLResponseError('ML response must be an object');
  }

  const data = response as Partial<MLRecommendResponse>;

  // Validate top-level fields
  if (!Array.isArray(data.recommended_exercises)) {
    missingFields.push('recommended_exercises (must be array)');
  }

  if (!data.plan_metadata || typeof data.plan_metadata !== 'object') {
    missingFields.push('plan_metadata (must be object)');
  } else {
    // Validate plan_metadata fields
    if (typeof data.plan_metadata.total_exercises !== 'number') {
      missingFields.push('plan_metadata.total_exercises (must be number)');
    }
    if (typeof data.plan_metadata.estimated_duration_minutes !== 'number') {
      missingFields.push('plan_metadata.estimated_duration_minutes (must be number)');
    }
    if (!Array.isArray(data.plan_metadata.focus_areas)) {
      missingFields.push('plan_metadata.focus_areas (must be array)');
    }
  }

  // Validate exercises if array exists
  if (Array.isArray(data.recommended_exercises)) {
    data.recommended_exercises.forEach((exercise, index) => {
      if (!exercise || typeof exercise !== 'object') {
        missingFields.push(`recommended_exercises[${index}] (must be object)`);
        return;
      }

      const requiredStringFields = ['exercise_id', 'exercise_name', 'muscle_group', 'rationale'];
      const requiredNumberFields = ['target_sets', 'target_reps', 'suggested_weight_kg', 'rest_seconds'];

      requiredStringFields.forEach(field => {
        if (typeof (exercise as any)[field] !== 'string') {
          missingFields.push(`recommended_exercises[${index}].${field} (must be string)`);
        }
      });

      requiredNumberFields.forEach(field => {
        if (typeof (exercise as any)[field] !== 'number') {
          missingFields.push(`recommended_exercises[${index}].${field} (must be number)`);
        }
      });
    });
  }

  if (missingFields.length > 0) {
    throw new InvalidMLResponseError(
      'ML response is missing required fields',
      missingFields
    );
  }
}

// ============================================================================
// ML Engine Client Functions
// ============================================================================

/**
 * Fetches single-day workout recommendation from ML Engine
 * 
 * Makes HTTP POST request to /workout/recommend endpoint with:
 * - 10-second timeout
 * - JSON body containing user_id and date
 * 
 * @param userId - User ID for personalized recommendations
 * @param date - Date in YYYY-MM-DD format
 * @returns Promise resolving to validated ML recommendation response
 * @throws MLEngineError if HTTP request fails or returns error status
 * @throws InvalidMLResponseError if response structure is invalid
 * 
 * **Validates: Requirements 2.1, 9.5, 9.6, 10.7**
 * 
 * @example
 * const recommendation = await fetchRecommendation('user-123', '2025-01-27');
 * console.log(recommendation.plan_metadata.estimated_duration_minutes);
 */
export async function fetchRecommendation(
  userId: string,
  date: string
): Promise<MLRecommendResponse> {
  const requestBody: MLRecommendRequest = {
    user_id: userId,
    date,
  };

  // Log ML Engine request
  logMLEngineRequest({
    user_id: userId,
    date,
    message: 'Requesting workout recommendation from ML Engine',
    context: { endpoint: '/workout/recommend' },
  });

  const timer = createTimer();

  try {
    const response = await fetch(`${ML_SERVICE_URL}/workout/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(ML_REQUEST_TIMEOUT_MS),
    });

    const duration = timer.elapsed();

    // Handle non-2xx responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // Log ML Engine error response
      logMLEngineError({
        user_id: userId,
        date,
        status_code: response.status,
        message: 'ML Engine returned error response',
        context: { error: errorText, duration_ms: duration },
      });

      throw new MLEngineError(
        `ML Engine returned error: ${errorText}`,
        response.status
      );
    }

    // Parse JSON response
    const data = await response.json().catch((err) => {
      // Log parse error
      logMLEngineError({
        user_id: userId,
        date,
        status_code: response.status,
        message: 'Failed to parse ML Engine response as JSON',
        context: { error: err instanceof Error ? err.message : 'Unknown error', duration_ms: duration },
      });

      throw new MLEngineError(
        'Failed to parse ML Engine response as JSON',
        response.status,
        err
      );
    });

    // Validate response structure
    validateMLResponse(data);

    // Log successful ML Engine response
    logMLEngineResponse({
      user_id: userId,
      date,
      duration_ms: duration,
      status_code: response.status,
      message: 'Successfully received workout recommendation from ML Engine',
      context: {
        exercise_count: data.recommended_exercises.length,
        workout_type: data.workout_type,
        estimated_duration: data.plan_metadata.estimated_duration_minutes,
      },
    });

    return data;
  } catch (error) {
    const duration = timer.elapsed();

    // Re-throw custom errors as-is (already logged above)
    if (error instanceof MLEngineError || error instanceof InvalidMLResponseError) {
      throw error;
    }

    // Handle timeout errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      logMLEngineError({
        user_id: userId,
        date,
        message: 'ML Engine request timed out',
        context: { timeout_ms: ML_REQUEST_TIMEOUT_MS, duration_ms: duration },
      });

      throw new MLEngineError(
        `ML Engine request timed out after ${ML_REQUEST_TIMEOUT_MS}ms`,
        undefined,
        error
      );
    }

    // Handle network errors
    if (error instanceof Error && error.name === 'AbortError') {
      logMLEngineError({
        user_id: userId,
        date,
        message: 'ML Engine request was aborted',
        context: { duration_ms: duration },
      });

      throw new MLEngineError(
        'ML Engine request was aborted',
        undefined,
        error
      );
    }

    // Handle other fetch errors (network issues, etc.)
    logMLEngineError({
      user_id: userId,
      date,
      message: 'Failed to connect to ML Engine',
      context: {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: duration,
      },
    });

    throw new MLEngineError(
      `Failed to connect to ML Engine: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error
    );
  }
}

/**
 * Fetches 7-day weekly workout recommendations from ML Engine
 * 
 * Makes 7 sequential calls to fetchRecommendation() for consecutive dates
 * starting from weekStartDate (Monday through Sunday).
 * 
 * If any single day fails, the error is propagated immediately and subsequent
 * days are not fetched (fail-fast behavior for transaction rollback).
 * 
 * @param userId - User ID for personalized recommendations
 * @param weekStartDate - Week start date in YYYY-MM-DD format (should be Monday)
 * @returns Promise resolving to array of 7 ML recommendation responses
 * @throws MLEngineError if any day's request fails
 * @throws InvalidMLResponseError if any day's response is invalid
 * 
 * **Validates: Requirements 2.1, 2.10**
 * 
 * @example
 * const weeklyRecs = await fetchWeeklyRecommendations('user-123', '2025-01-27');
 * console.log(`Week has ${weeklyRecs.length} days`); // 7
 */
export async function fetchWeeklyRecommendations(
  userId: string,
  weekStartDate: string
): Promise<MLRecommendResponse[]> {
  const recommendations: MLRecommendResponse[] = [];
  const startDate = new Date(weekStartDate);

  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid weekStartDate: ${weekStartDate}`);
  }

  // Fetch recommendations for 7 consecutive days (Monday through Sunday)
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const targetDate = new Date(startDate);
    targetDate.setUTCDate(startDate.getUTCDate() + dayIndex);
    const dateString = targetDate.toISOString().split('T')[0];

    // Sequential fetch - fails fast on first error for transaction rollback
    const recommendation = await fetchRecommendation(userId, dateString);
    recommendations.push(recommendation);
  }

  return recommendations;
}
