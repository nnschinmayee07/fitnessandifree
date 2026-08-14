// ============================================================================
// Weekly Workout Planner - Input Validation Utilities
// ============================================================================
// Validates API request inputs for weekly planner endpoints
// Requirements: 2.8, 3.7, 3.8, 4.4, 9.1, 9.2
// ============================================================================

import type {
  CreateWeeklyPlanRequest,
  RegenerateDayRequest,
  UpdateAdherenceRequest,
  AdherenceStatus,
  ValidationResult,
} from '@/lib/types/weekly-planner';

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid adherence status values
 * Maps to weekly_plan_days.adherence_status CHECK constraint
 */
const VALID_ADHERENCE_STATUSES: ReadonlySet<AdherenceStatus> = new Set([
  'not_started',
  'in_progress',
  'completed',
  'skipped',
]);

/**
 * Date format regex: YYYY-MM-DD
 */
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates input for creating a new weekly workout plan
 * 
 * Checks:
 * - user_id is non-empty string
 * - week_start_date matches YYYY-MM-DD format
 * - week_start_date is a valid calendar date
 * 
 * @param body - Request body to validate (unknown type for safety)
 * @returns ValidationResult indicating success or failure with error messages
 * 
 * **Validates: Requirements 2.8**
 */
export function validateWeeklyPlanInput(
  body: unknown
): ValidationResult {
  const errors: string[] = [];

  // Type guard: ensure body is an object
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      errors: ['Request body must be a valid object'],
    };
  }

  const input = body as Partial<CreateWeeklyPlanRequest>;

  // Validate user_id
  if (!input.user_id || typeof input.user_id !== 'string') {
    errors.push('user_id is required and must be a string');
  } else if (input.user_id.trim().length === 0) {
    errors.push('user_id must not be empty');
  }

  // Validate week_start_date format
  if (!input.week_start_date || typeof input.week_start_date !== 'string') {
    errors.push('week_start_date is required and must be a string');
  } else if (!DATE_FORMAT_REGEX.test(input.week_start_date)) {
    errors.push('week_start_date must be in YYYY-MM-DD format');
  } else {
    // Validate it's a real date
    const date = new Date(input.week_start_date);
    if (isNaN(date.getTime())) {
      errors.push('week_start_date must be a valid date');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validates input for regenerating a specific day in a weekly plan
 * 
 * Checks:
 * - weekly_plan_id exists and is non-empty string
 * - day_index is a number in range [0, 6] (Monday-Sunday)
 * 
 * @param body - Request body to validate (unknown type for safety)
 * @returns ValidationResult indicating success or failure with error messages
 * 
 * **Validates: Requirements 3.7, 3.8**
 */
export function validateRegenerationInput(
  body: unknown
): ValidationResult {
  const errors: string[] = [];

  // Type guard: ensure body is an object
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      errors: ['Request body must be a valid object'],
    };
  }

  const input = body as Partial<RegenerateDayRequest>;

  // Validate weekly_plan_id
  if (!input.weekly_plan_id || typeof input.weekly_plan_id !== 'string') {
    errors.push('weekly_plan_id is required and must be a string');
  } else if (input.weekly_plan_id.trim().length === 0) {
    errors.push('weekly_plan_id must not be empty');
  }

  // Validate day_index
  if (input.day_index === undefined || input.day_index === null) {
    errors.push('day_index is required');
  } else if (typeof input.day_index !== 'number') {
    errors.push('day_index must be a number');
  } else if (!Number.isInteger(input.day_index)) {
    errors.push('day_index must be an integer');
  } else if (input.day_index < 0 || input.day_index > 6) {
    errors.push('day_index must be between 0 and 6 (Monday-Sunday)');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validates input for updating adherence status of a plan day
 * 
 * Checks:
 * - plan_day_id exists and is non-empty string
 * - adherence_status is in valid enum values
 * 
 * @param body - Request body to validate (unknown type for safety)
 * @returns ValidationResult indicating success or failure with error messages
 * 
 * **Validates: Requirements 4.4, 9.2**
 */
export function validateAdherenceInput(
  body: unknown
): ValidationResult {
  const errors: string[] = [];

  // Type guard: ensure body is an object
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      errors: ['Request body must be a valid object'],
    };
  }

  const input = body as Partial<UpdateAdherenceRequest>;

  // Validate plan_day_id
  if (!input.plan_day_id || typeof input.plan_day_id !== 'string') {
    errors.push('plan_day_id is required and must be a string');
  } else if (typeof input.plan_day_id === 'string' && input.plan_day_id.trim().length === 0) {
    errors.push('plan_day_id must not be empty');
  }

  // Validate adherence_status
  if (!input.adherence_status || typeof input.adherence_status !== 'string') {
    errors.push('adherence_status is required and must be a string');
  } else if (!validateAdherenceStatus(input.adherence_status)) {
    errors.push(
      `adherence_status must be one of: ${Array.from(VALID_ADHERENCE_STATUSES).join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Checks if a string is a valid adherence status enum value
 * 
 * @param status - String to validate
 * @returns true if status is in valid enum, false otherwise
 * 
 * **Validates: Requirements 4.4**
 */
export function validateAdherenceStatus(status: string): boolean {
  return VALID_ADHERENCE_STATUSES.has(status as AdherenceStatus);
}

/**
 * Normalizes any date to the preceding Monday
 * 
 * If the input date is already Monday, returns it unchanged.
 * Otherwise, calculates the preceding Monday's date.
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date string in YYYY-MM-DD format adjusted to preceding Monday
 * @throws Error if dateString is not a valid date
 * 
 * **Validates: Requirements 2.7**
 * 
 * @example
 * normalizeToMonday('2025-01-29') // Wednesday -> '2025-01-27' (Monday)
 * normalizeToMonday('2025-01-27') // Monday -> '2025-01-27' (unchanged)
 * normalizeToMonday('2025-02-02') // Sunday -> '2025-01-27' (previous Monday)
 */
export function normalizeToMonday(dateString: string): string {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }

  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = date.getUTCDay();
  
  // Calculate days to subtract to reach Monday
  // If Sunday (0), subtract 6 days; if Monday (1), subtract 0; if Tuesday (2), subtract 1, etc.
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Adjust date to Monday
  date.setUTCDate(date.getUTCDate() - daysToSubtract);
  
  // Format as YYYY-MM-DD
  return date.toISOString().split('T')[0];
}
