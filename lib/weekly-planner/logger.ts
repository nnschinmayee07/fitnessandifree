// ============================================================================
// Weekly Workout Planner - Structured Logging Utilities
// ============================================================================
// Centralized logging for monitoring, debugging, and auditing
// Requirements: 9.10, 10.4
// ============================================================================

/**
 * Log severity levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Base log entry structure
 */
interface BaseLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * API request log entry
 */
interface APIRequestLog extends BaseLogEntry {
  type: 'api_request';
  endpoint: string;
  method: string;
  user_id?: string;
  duration_ms?: number;
  status_code?: number;
}

/**
 * Database operation log entry
 */
interface DatabaseLog extends BaseLogEntry {
  type: 'database';
  operation: string;
  duration_ms?: number;
  table?: string;
}

/**
 * ML Engine log entry
 */
interface MLEngineLog extends BaseLogEntry {
  type: 'ml_engine';
  operation: 'request' | 'response' | 'error';
  user_id?: string;
  date?: string;
  duration_ms?: number;
  status_code?: number;
}

/**
 * Transaction log entry
 */
interface TransactionLog extends BaseLogEntry {
  type: 'transaction';
  action: 'commit' | 'rollback';
  operation: string;
  user_id?: string;
}

/**
 * Error log entry
 */
interface ErrorLog extends BaseLogEntry {
  type: 'error';
  error_code?: string;
  error_details?: unknown;
  stack?: string;
}

type LogEntry = APIRequestLog | DatabaseLog | MLEngineLog | TransactionLog | ErrorLog;

// ============================================================================
// Core Logging Functions
// ============================================================================

/**
 * Formats and outputs a log entry
 * 
 * In production, this could be extended to send logs to external services
 * (CloudWatch, Datadog, etc.)
 */
function writeLog(entry: LogEntry): void {
  const logString = JSON.stringify(entry);
  
  switch (entry.level) {
    case LogLevel.ERROR:
      console.error(logString);
      break;
    case LogLevel.WARN:
      console.warn(logString);
      break;
    case LogLevel.DEBUG:
    case LogLevel.INFO:
    default:
      console.log(logString);
      break;
  }
}

/**
 * Creates a base log entry with timestamp
 */
function createBaseLog(level: LogLevel, message: string, context?: Record<string, unknown>): BaseLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };
}

// ============================================================================
// API Request Logging
// ============================================================================

/**
 * Logs API request with performance metrics
 * 
 * **Validates: Requirements 9.10, 10.4**
 * 
 * @example
 * logAPIRequest({
 *   endpoint: '/api/workout/weekly-plan',
 *   method: 'POST',
 *   user_id: 'user-123',
 *   duration_ms: 1250,
 *   status_code: 201,
 *   message: 'Created weekly plan successfully'
 * });
 */
export function logAPIRequest(params: {
  endpoint: string;
  method: string;
  user_id?: string;
  duration_ms?: number;
  status_code?: number;
  message: string;
  context?: Record<string, unknown>;
}): void {
  const entry: APIRequestLog = {
    ...createBaseLog(LogLevel.INFO, params.message, params.context),
    type: 'api_request',
    endpoint: params.endpoint,
    method: params.method,
    user_id: params.user_id,
    duration_ms: params.duration_ms,
    status_code: params.status_code,
  };

  writeLog(entry);
}

// ============================================================================
// Database Operation Logging
// ============================================================================

/**
 * Logs database operation with performance metrics
 * 
 * **Validates: Requirements 10.4**
 * 
 * @example
 * logDatabaseOperation({
 *   operation: 'createWeeklyPlan',
 *   table: 'weekly_workout_plans',
 *   duration_ms: 125,
 *   message: 'Inserted weekly plan record',
 *   context: { plan_id: 'abc-123' }
 * });
 */
export function logDatabaseOperation(params: {
  operation: string;
  table?: string;
  duration_ms?: number;
  message: string;
  context?: Record<string, unknown>;
}): void {
  const entry: DatabaseLog = {
    ...createBaseLog(LogLevel.DEBUG, params.message, params.context),
    type: 'database',
    operation: params.operation,
    table: params.table,
    duration_ms: params.duration_ms,
  };

  writeLog(entry);
}

// ============================================================================
// ML Engine Logging
// ============================================================================

/**
 * Logs ML Engine request
 * 
 * **Validates: Requirement 9.10**
 * 
 * @example
 * logMLEngineRequest({
 *   user_id: 'user-123',
 *   date: '2025-01-27',
 *   message: 'Requesting workout recommendation'
 * });
 */
export function logMLEngineRequest(params: {
  user_id: string;
  date: string;
  message: string;
  context?: Record<string, unknown>;
}): void {
  const entry: MLEngineLog = {
    ...createBaseLog(LogLevel.DEBUG, params.message, params.context),
    type: 'ml_engine',
    operation: 'request',
    user_id: params.user_id,
    date: params.date,
  };

  writeLog(entry);
}

/**
 * Logs ML Engine response
 * 
 * **Validates: Requirement 9.10**
 * 
 * @example
 * logMLEngineResponse({
 *   user_id: 'user-123',
 *   date: '2025-01-27',
 *   duration_ms: 850,
 *   status_code: 200,
 *   message: 'Received workout recommendation',
 *   context: { exercise_count: 6 }
 * });
 */
export function logMLEngineResponse(params: {
  user_id: string;
  date: string;
  duration_ms: number;
  status_code: number;
  message: string;
  context?: Record<string, unknown>;
}): void {
  const entry: MLEngineLog = {
    ...createBaseLog(LogLevel.INFO, params.message, params.context),
    type: 'ml_engine',
    operation: 'response',
    user_id: params.user_id,
    date: params.date,
    duration_ms: params.duration_ms,
    status_code: params.status_code,
  };

  writeLog(entry);
}

/**
 * Logs ML Engine error
 * 
 * **Validates: Requirement 9.10**
 * 
 * @example
 * logMLEngineError({
 *   user_id: 'user-123',
 *   date: '2025-01-27',
 *   status_code: 500,
 *   message: 'ML Engine request failed',
 *   context: { error: 'Connection timeout' }
 * });
 */
export function logMLEngineError(params: {
  user_id: string;
  date: string;
  status_code?: number;
  message: string;
  context?: Record<string, unknown>;
}): void {
  const entry: MLEngineLog = {
    ...createBaseLog(LogLevel.ERROR, params.message, params.context),
    type: 'ml_engine',
    operation: 'error',
    user_id: params.user_id,
    date: params.date,
    status_code: params.status_code,
  };

  writeLog(entry);
}

// ============================================================================
// Transaction Logging
// ============================================================================

/**
 * Logs transaction commit
 * 
 * **Validates: Requirement 9.10**
 * 
 * @example
 * logTransactionCommit({
 *   operation: 'createWeeklyPlan',
 *   user_id: 'user-123',
 *   message: 'Successfully committed weekly plan creation',
 *   context: { plan_id: 'abc-123', days_inserted: 7 }
 * });
 */
export function logTransactionCommit(params: {
  operation: string;
  user_id?: string;
  message: string;
  context?: Record<string, unknown>;
}): void {
  const entry: TransactionLog = {
    ...createBaseLog(LogLevel.INFO, params.message, params.context),
    type: 'transaction',
    action: 'commit',
    operation: params.operation,
    user_id: params.user_id,
  };

  writeLog(entry);
}

/**
 * Logs transaction rollback
 * 
 * **Validates: Requirement 9.10**
 * 
 * @example
 * logTransactionRollback({
 *   operation: 'createWeeklyPlan',
 *   user_id: 'user-123',
 *   message: 'Rolled back weekly plan creation due to ML Engine error',
 *   context: { reason: 'ML_ENGINE_ERROR', plan_id: 'abc-123' }
 * });
 */
export function logTransactionRollback(params: {
  operation: string;
  user_id?: string;
  message: string;
  context?: Record<string, unknown>;
}): void {
  const entry: TransactionLog = {
    ...createBaseLog(LogLevel.WARN, params.message, params.context),
    type: 'transaction',
    action: 'rollback',
    operation: params.operation,
    user_id: params.user_id,
  };

  writeLog(entry);
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Logs error with full details
 * 
 * **Validates: Requirement 9.10**
 * 
 * @example
 * logError({
 *   message: 'Database constraint violation',
 *   error_code: 'DATABASE_ERROR',
 *   error_details: error,
 *   context: { user_id: 'user-123', operation: 'createWeeklyPlan' }
 * });
 */
export function logError(params: {
  message: string;
  error_code?: string;
  error_details?: unknown;
  context?: Record<string, unknown>;
}): void {
  const stack = params.error_details instanceof Error ? params.error_details.stack : undefined;

  const entry: ErrorLog = {
    ...createBaseLog(LogLevel.ERROR, params.message, params.context),
    type: 'error',
    error_code: params.error_code,
    error_details: params.error_details instanceof Error 
      ? { name: params.error_details.name, message: params.error_details.message }
      : params.error_details,
    stack,
  };

  writeLog(entry);
}

// ============================================================================
// Performance Measurement Utilities
// ============================================================================

/**
 * Creates a performance timer
 * 
 * @example
 * const timer = createTimer();
 * // ... perform operation
 * const duration = timer.elapsed();
 */
export function createTimer(): { elapsed: () => number } {
  const start = performance.now();
  
  return {
    elapsed: () => Math.round(performance.now() - start),
  };
}
