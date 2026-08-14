// ============================================================================
// Weekly Workout Planner - Error Handling Utilities
// ============================================================================
// Centralized error classes and response formatters for consistent error handling
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.10
// ============================================================================

// ============================================================================
// Error Response Type
// ============================================================================

/**
 * Standard error response structure for all API endpoints
 * **Validates: Requirement 9.8**
 */
export interface ErrorResponse {
  error: string;        // Human-readable message
  code: string;         // Machine-readable error code
  details?: unknown;    // Optional additional context
}

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base class for all weekly planner errors
 */
export class WeeklyPlannerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when ML Engine request fails or returns error response
 * **Validates: Requirement 9.5**
 */
export class MLEngineError extends WeeklyPlannerError {
  constructor(
    message: string,
    statusCode?: number,
    public originalError?: unknown
  ) {
    super(
      message,
      'ML_ENGINE_ERROR',
      statusCode || 500,
      originalError ? { originalError: originalError instanceof Error ? originalError.message : String(originalError) } : undefined
    );
  }
}

/**
 * Error thrown when ML Engine response is missing required fields
 * **Validates: Requirement 9.6**
 */
export class InvalidMLResponseError extends WeeklyPlannerError {
  constructor(
    message: string,
    public missingFields?: string[]
  ) {
    super(
      message,
      'INVALID_ML_RESPONSE',
      502,
      missingFields ? { missingFields } : undefined
    );
  }
}

/**
 * Error thrown when input validation fails
 * **Validates: Requirement 9.2**
 */
export class ValidationError extends WeeklyPlannerError {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      { errors }
    );
  }
}

/**
 * Error thrown when database operations fail
 * **Validates: Requirement 9.4**
 */
export class DatabaseError extends WeeklyPlannerError {
  constructor(
    message: string,
    public operation: string,
    public originalError?: unknown
  ) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      originalError ? { operation, originalError: originalError instanceof Error ? originalError.message : String(originalError) } : { operation }
    );
  }
}

// ============================================================================
// Error Code Constants
// ============================================================================

/**
 * Standard error codes for all API endpoints
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7**
 */
export const ErrorCodes = {
  // 400 - Bad Request
  INVALID_JSON: 'INVALID_JSON',                     // Req 9.1
  VALIDATION_ERROR: 'VALIDATION_ERROR',             // Req 9.2
  INVALID_DAY_INDEX: 'INVALID_DAY_INDEX',           // Day index not in [0, 6]

  // 403 - Forbidden
  FORBIDDEN: 'FORBIDDEN',                           // Req 9.3

  // 404 - Not Found
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',                 // Weekly plan doesn't exist
  PLAN_DAY_NOT_FOUND: 'PLAN_DAY_NOT_FOUND',         // Plan day doesn't exist
  NO_PLAN_FOUND: 'NO_PLAN_FOUND',                   // No plans matching criteria

  // 409 - Conflict
  PLAN_ALREADY_EXISTS: 'PLAN_ALREADY_EXISTS',       // Duplicate (user_id, week_start_date)

  // 500 - Internal Server Error
  ML_ENGINE_ERROR: 'ML_ENGINE_ERROR',               // Req 9.4 - ML service error
  DATABASE_ERROR: 'DATABASE_ERROR',                 // Req 9.4 - Database query failed
  INTERNAL_ERROR: 'INTERNAL_ERROR',                 // Unexpected server error

  // 502 - Bad Gateway
  INVALID_ML_RESPONSE: 'INVALID_ML_RESPONSE',       // Req 9.6 - ML response missing fields

  // 503 - Service Unavailable
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',       // Req 9.5 - ML Engine unreachable
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================================
// Error Response Formatters
// ============================================================================

/**
 * Formats an error response with standard structure
 * 
 * @param error - Human-readable error message
 * @param code - Machine-readable error code
 * @param details - Optional additional context
 * @returns Formatted error response object
 * 
 * **Validates: Requirement 9.8**
 */
export function formatErrorResponse(
  error: string,
  code: ErrorCode,
  details?: unknown
): ErrorResponse {
  const response: ErrorResponse = {
    error,
    code,
  };

  if (details !== undefined) {
    response.details = details;
  }

  return response;
}

/**
 * Creates a Response object with error payload and appropriate headers
 * 
 * @param error - Human-readable error message
 * @param code - Machine-readable error code
 * @param statusCode - HTTP status code
 * @param details - Optional additional context
 * @returns Response object with JSON payload and Content-Type header
 * 
 * **Validates: Requirements 9.7, 9.8**
 */
export function createErrorResponse(
  error: string,
  code: ErrorCode,
  statusCode: number,
  details?: unknown
): Response {
  const errorResponse = formatErrorResponse(error, code, details);
  
  return new Response(
    JSON.stringify(errorResponse),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },  // Req 9.7
    }
  );
}

/**
 * Handles malformed JSON request bodies
 * 
 * @returns 400 Response with INVALID_JSON error code
 * 
 * **Validates: Requirement 9.1**
 */
export function handleInvalidJSON(): Response {
  return createErrorResponse(
    'Invalid JSON body',
    ErrorCodes.INVALID_JSON,
    400
  );
}

/**
 * Handles missing or invalid required fields
 * 
 * @param errors - Array of validation error messages
 * @returns 400 Response with VALIDATION_ERROR code and error list
 * 
 * **Validates: Requirement 9.2**
 */
export function handleValidationError(errors: string[]): Response {
  return createErrorResponse(
    'Validation failed',
    ErrorCodes.VALIDATION_ERROR,
    400,
    { errors }
  );
}

/**
 * Handles unauthorized access attempts
 * 
 * @param message - Optional custom message
 * @returns 403 Response with FORBIDDEN error code
 * 
 * **Validates: Requirement 9.3**
 */
export function handleForbidden(message?: string): Response {
  return createErrorResponse(
    message || 'Access denied',
    ErrorCodes.FORBIDDEN,
    403
  );
}

/**
 * Handles database operation failures
 * 
 * Logs full error details server-side for debugging.
 * Returns sanitized error response to client.
 * 
 * @param operation - Operation that failed (for logging)
 * @param error - Error object or message
 * @param context - Optional context for logging (e.g., user_id, plan_id)
 * @returns 500 Response with DATABASE_ERROR code
 * 
 * **Validates: Requirements 9.4, 9.10**
 */
export function handleDatabaseError(
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): Response {
  // Server-side logging with full details (Req 9.10)
  console.error('[Database Error]', {
    timestamp: new Date().toISOString(),
    operation,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  });

  // Client response with sanitized message
  return createErrorResponse(
    'Database operation failed',
    ErrorCodes.DATABASE_ERROR,
    500,
    { message: error instanceof Error ? error.message : 'Unknown database error' }
  );
}

/**
 * Handles ML Engine unavailability (network errors, timeouts)
 * 
 * @param error - Error object or message
 * @param context - Optional context for logging
 * @returns 503 Response with SERVICE_UNAVAILABLE code
 * 
 * **Validates: Requirements 9.5, 9.10**
 */
export function handleServiceUnavailable(
  error: unknown,
  context?: Record<string, unknown>
): Response {
  // Server-side logging (Req 9.10)
  console.error('[Service Unavailable]', {
    timestamp: new Date().toISOString(),
    service: 'ML Engine',
    error: error instanceof Error ? error.message : String(error),
    context,
  });

  return createErrorResponse(
    'ML recommendation service is unavailable',
    ErrorCodes.SERVICE_UNAVAILABLE,
    503,
    { message: error instanceof Error ? error.message : 'Service unavailable' }
  );
}

/**
 * Handles invalid ML Engine response format
 * 
 * @param message - Description of what's invalid
 * @param missingFields - Array of missing field names
 * @returns 502 Response with INVALID_ML_RESPONSE code
 * 
 * **Validates: Requirements 9.6, 9.10**
 */
export function handleInvalidMLResponse(
  message: string,
  missingFields?: string[]
): Response {
  // Server-side logging (Req 9.10)
  console.error('[Invalid ML Response]', {
    timestamp: new Date().toISOString(),
    message,
    missingFields,
  });

  return createErrorResponse(
    'ML Engine returned invalid response format',
    ErrorCodes.INVALID_ML_RESPONSE,
    502,
    {
      message,
      missingFields,
    }
  );
}

/**
 * Handles ML Engine errors (non-2xx responses)
 * 
 * @param error - Error object or message
 * @param statusCode - ML Engine HTTP status code
 * @param context - Optional context for logging
 * @returns 500 Response with ML_ENGINE_ERROR code
 * 
 * **Validates: Requirements 9.4, 9.10**
 */
export function handleMLEngineError(
  error: unknown,
  statusCode?: number,
  context?: Record<string, unknown>
): Response {
  // Server-side logging (Req 9.10)
  console.error('[ML Engine Error]', {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
    statusCode,
    context,
  });

  return createErrorResponse(
    'Failed to generate workout recommendations',
    ErrorCodes.ML_ENGINE_ERROR,
    500,
    {
      message: error instanceof Error ? error.message : 'ML Engine error',
      statusCode,
    }
  );
}

/**
 * Handles unexpected/internal server errors
 * 
 * Logs full error details server-side.
 * Returns generic error response to client.
 * 
 * @param error - Error object or message
 * @param endpoint - Endpoint where error occurred
 * @param context - Optional context for logging
 * @returns 500 Response with INTERNAL_ERROR code
 * 
 * **Validates: Requirements 9.4, 9.10**
 */
export function handleInternalError(
  error: unknown,
  endpoint: string,
  context?: Record<string, unknown>
): Response {
  // Server-side logging with full details (Req 9.10)
  console.error('[Internal Error]', {
    timestamp: new Date().toISOString(),
    endpoint,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  });

  return createErrorResponse(
    'Internal server error',
    ErrorCodes.INTERNAL_ERROR,
    500,
    { message: error instanceof Error ? error.message : 'Unknown error' }
  );
}

/**
 * Handles resource not found errors (404)
 * 
 * @param resourceType - Type of resource (e.g., "Weekly plan", "Plan day")
 * @param code - Specific error code
 * @param details - Optional details about what was not found
 * @returns 404 Response with appropriate error code
 */
export function handleNotFound(
  resourceType: string,
  code: ErrorCode,
  details?: unknown
): Response {
  return createErrorResponse(
    `${resourceType} not found`,
    code,
    404,
    details
  );
}

/**
 * Handles conflict errors (409)
 * 
 * @param message - Description of the conflict
 * @param details - Optional details about the conflict
 * @returns 409 Response with PLAN_ALREADY_EXISTS code
 * 
 * **Validates: Requirement 9.9**
 */
export function handleConflict(
  message: string,
  details?: unknown
): Response {
  return createErrorResponse(
    message,
    ErrorCodes.PLAN_ALREADY_EXISTS,
    409,
    details
  );
}

// ============================================================================
// Error Detection Utilities
// ============================================================================

/**
 * Checks if an error is a PostgreSQL unique constraint violation
 * 
 * @param error - Error object to check
 * @returns True if error is a unique constraint violation
 */
export function isUniqueConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const pgError = error as any;
  
  // PostgreSQL unique constraint violation code is 23505
  return pgError.code === '23505' || 
         pgError.message?.includes('unique_user_week') ||
         pgError.message?.includes('duplicate key');
}

/**
 * Checks if an error is a PostgreSQL not found error
 * 
 * @param error - Error object to check
 * @returns True if error indicates resource not found
 */
export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const pgError = error as any;
  
  // PostgREST not found error code is PGRST116
  return pgError.code === 'PGRST116' ||
         pgError.message?.includes('no data') ||
         pgError.message?.includes('not found');
}

/**
 * Checks if an error is a network/timeout error indicating service unavailability
 * 
 * @param error - Error object to check
 * @returns True if error indicates service unavailability
 */
export function isServiceUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'TimeoutError' ||
         error.name === 'AbortError' ||
         error.message?.includes('timeout') ||
         error.message?.includes('ECONNREFUSED') ||
         error.message?.includes('ENOTFOUND');
}
