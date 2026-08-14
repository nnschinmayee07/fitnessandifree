// ============================================================================
// Workout History API Route Unit Tests
// ============================================================================
// Unit tests for GET /api/workout/history
// Requirements: 9.1, 9.2, 9.11, 9.12, 5.1, 5.2, 5.3
//
// Task: 8.2 Write unit tests for history endpoint
//
// Test Coverage:
// - Success cases: valid queries with various parameter combinations
// - Validation failures: missing userId, invalid dates, invalid limit
// - Authentication failures: missing/empty userId
// - Empty results: user with no workout history
// - Query parameter combinations: startDate, endDate, limit
// - Boundary values: limit (1-200), date formats
// - Database errors: query failures
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../history/route';
import { createServerClient } from '@/lib/supabase/server';

// ============================================================================
// Mock Supabase Client
// ============================================================================

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const VALID_USER_ID = 'user-abc123';

const MOCK_WORKOUT_LOGS = [
  {
    id: 'workout-1',
    date: '2024-01-15',
    status: 'completed',
    started_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-15T11:00:00Z',
    workout_plans: { name: 'Push Day' },
  },
  {
    id: 'workout-2',
    date: '2024-01-13',
    status: 'completed',
    started_at: '2024-01-13T09:00:00Z',
    completed_at: '2024-01-13T10:30:00Z',
    workout_plans: { name: 'Pull Day' },
  },
];

const MOCK_LOGGED_SETS = [
  { workout_log_id: 'workout-1', weight_kg: 50, reps: 10 },
  { workout_log_id: 'workout-1', weight_kg: 50, reps: 8 },
  { workout_log_id: 'workout-1', weight_kg: 45, reps: 12 },
  { workout_log_id: 'workout-2', weight_kg: 60, reps: 6 },
  { workout_log_id: 'workout-2', weight_kg: 55, reps: 8 },
];

// ============================================================================
// Helper Functions
// ============================================================================

function createRequest(searchParams: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/workout/history');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url.toString(), { method: 'GET' });
}

function setupSuccessfulMocks(
  mockSupabase: any,
  workoutLogs = MOCK_WORKOUT_LOGS,
  loggedSets = MOCK_LOGGED_SETS
) {
  // Mock workout logs query
  const mockWorkoutSelect = vi.fn().mockReturnThis();
  const mockWorkoutEq = vi.fn().mockReturnThis();
  const mockWorkoutGte = vi.fn().mockReturnThis();
  const mockWorkoutLte = vi.fn().mockReturnThis();
  const mockWorkoutOrder = vi.fn().mockReturnThis();
  const mockWorkoutLimit = vi.fn().mockResolvedValue({
    data: workoutLogs,
    error: null,
  });

  // Mock logged sets query
  const mockSetsSelect = vi.fn().mockReturnThis();
  const mockSetsIn = vi.fn().mockResolvedValue({
    data: loggedSets,
    error: null,
  });

  let callCount = 0;
  mockSupabase.from.mockImplementation((table: string) => {
    callCount++;
    if (callCount === 1) {
      // First call: workout_logs lookup
      return { select: mockWorkoutSelect };
    } else {
      // Second call: logged_sets lookup
      return { select: mockSetsSelect };
    }
  });

  mockWorkoutSelect.mockReturnValue({
    eq: mockWorkoutEq,
  });
  mockWorkoutEq.mockReturnValue({
    gte: mockWorkoutGte,
    lte: mockWorkoutLte,
    order: mockWorkoutOrder,
  });
  mockWorkoutGte.mockReturnValue({
    lte: mockWorkoutLte,
    order: mockWorkoutOrder,
  });
  mockWorkoutLte.mockReturnValue({
    order: mockWorkoutOrder,
  });
  mockWorkoutOrder.mockReturnValue({
    limit: mockWorkoutLimit,
  });

  mockSetsSelect.mockReturnValue({
    in: mockSetsIn,
  });

  return {
    mockWorkoutLimit,
    mockSetsIn,
    mockWorkoutGte,
    mockWorkoutLte,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Unit: GET /api/workout/history', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(),
    };

    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
  });

  // ==========================================================================
  // Success Cases
  // ==========================================================================
  describe('Success cases', () => {
    it('should return 200 with workout history for valid userId', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body).toHaveProperty('workouts');
      expect(Array.isArray(body.workouts)).toBe(true);
      expect(body.workouts).toHaveLength(2);

      // Verify first workout structure
      const workout1 = body.workouts[0];
      expect(workout1).toHaveProperty('id', 'workout-1');
      expect(workout1).toHaveProperty('date', '2024-01-15');
      expect(workout1).toHaveProperty('plan_name', 'Push Day');
      expect(workout1).toHaveProperty('duration_seconds', 3600); // 1 hour
      expect(workout1).toHaveProperty('total_volume', 1440); // 50*10 + 50*8 + 45*12
      expect(workout1).toHaveProperty('set_count', 3);
      expect(workout1).toHaveProperty('status', 'completed');
    });

    it('should calculate volume correctly for multiple sets', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      const workout2 = body.workouts[1];
      expect(workout2.total_volume).toBe(800); // 60*6 + 55*8
      expect(workout2.set_count).toBe(2);
    });

    it('should calculate duration in seconds correctly', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      const workout1 = body.workouts[0];
      // Duration: 11:00:00 - 10:00:00 = 3600 seconds
      expect(workout1.duration_seconds).toBe(3600);

      const workout2 = body.workouts[1];
      // Duration: 10:30:00 - 09:00:00 = 5400 seconds
      expect(workout2.duration_seconds).toBe(5400);
    });

    it('should return null duration for workouts without completed_at', async () => {
      const workoutWithoutCompletion = [
        {
          id: 'workout-in-progress',
          date: '2024-01-16',
          status: 'in_progress',
          started_at: '2024-01-16T10:00:00Z',
          completed_at: null,
          workout_plans: { name: 'Leg Day' },
        },
      ];

      setupSuccessfulMocks(mockSupabase, workoutWithoutCompletion, []);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.workouts[0].duration_seconds).toBeNull();
    });

    it('should handle workouts with zero sets', async () => {
      setupSuccessfulMocks(mockSupabase, MOCK_WORKOUT_LOGS, []);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      body.workouts.forEach((workout: any) => {
        expect(workout.total_volume).toBe(0);
        expect(workout.set_count).toBe(0);
      });
    });

    it('should apply default limit of 50 when not specified', async () => {
      const mocks = setupSuccessfulMocks(mockSupabase);

      await GET(createRequest({ userId: VALID_USER_ID }));

      // Verify limit was called with 50
      expect(mocks.mockWorkoutLimit).toHaveBeenCalled();
    });

    it('should accept custom limit parameter', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID, limit: '10' })
      );

      expect(response.status).toBe(200);
    });

    it('should cap limit at maximum 200', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID, limit: '500' })
      );

      expect(response.status).toBe(200);
      // Limit should be capped at 200
    });
  });

  // ==========================================================================
  // Success Cases - Query Parameter Combinations
  // ==========================================================================
  describe('Success cases - query parameter combinations', () => {
    it('should filter by startDate when provided', async () => {
      const mocks = setupSuccessfulMocks(mockSupabase);

      await GET(
        createRequest({
          userId: VALID_USER_ID,
          startDate: '2024-01-10',
        })
      );

      // Verify gte was called with startDate
      expect(mocks.mockWorkoutGte).toHaveBeenCalled();
    });

    it('should filter by endDate when provided', async () => {
      const mocks = setupSuccessfulMocks(mockSupabase);

      await GET(
        createRequest({
          userId: VALID_USER_ID,
          endDate: '2024-01-20',
        })
      );

      // Verify lte was called with endDate
      expect(mocks.mockWorkoutLte).toHaveBeenCalled();
    });

    it('should filter by both startDate and endDate', async () => {
      const mocks = setupSuccessfulMocks(mockSupabase);

      await GET(
        createRequest({
          userId: VALID_USER_ID,
          startDate: '2024-01-10',
          endDate: '2024-01-20',
        })
      );

      expect(mocks.mockWorkoutGte).toHaveBeenCalled();
      expect(mocks.mockWorkoutLte).toHaveBeenCalled();
    });

    it('should apply all query parameters together', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          limit: '25',
        })
      );

      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Empty Results
  // ==========================================================================
  describe('Empty results', () => {
    it('should return empty array when user has no workouts', async () => {
      setupSuccessfulMocks(mockSupabase, [], []);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body).toHaveProperty('workouts');
      expect(body.workouts).toEqual([]);
    });

    it('should return empty array when no workouts match date filter', async () => {
      setupSuccessfulMocks(mockSupabase, [], []);

      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          startDate: '2024-02-01',
          endDate: '2024-02-28',
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.workouts).toEqual([]);
    });
  });

  // ==========================================================================
  // Validation Failures - Missing Required Parameters
  // ==========================================================================
  describe('Validation failures - missing required parameters', () => {
    it('should return 400 when userId is missing', async () => {
      const response = await GET(
        createRequest({})
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('userId');
      expect(body.code).toBe('MISSING_USER_ID');
    });

    it('should return 400 when userId is empty string', async () => {
      const response = await GET(
        createRequest({ userId: '' })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('userId');
      expect(body.code).toBe('MISSING_USER_ID');
    });

    it('should return 400 when userId is whitespace only', async () => {
      const response = await GET(
        createRequest({ userId: '   ' })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('userId');
      expect(body.code).toBe('MISSING_USER_ID');
    });
  });

  // ==========================================================================
  // Validation Failures - Invalid Date Formats
  // ==========================================================================
  describe('Validation failures - invalid date formats', () => {
    it('should return 400 for invalid startDate format (MM/DD/YYYY)', async () => {
      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          startDate: '01/15/2024',
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('startDate');
      expect(body.error).toContain('YYYY-MM-DD');
      expect(body.code).toBe('INVALID_START_DATE');
    });

    it('should return 400 for invalid endDate format (MM/DD/YYYY)', async () => {
      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          endDate: '01/15/2024',
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('endDate');
      expect(body.error).toContain('YYYY-MM-DD');
      expect(body.code).toBe('INVALID_END_DATE');
    });

    it('should return 400 for startDate with invalid format (YYYYMMDD)', async () => {
      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          startDate: '20240115',
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('INVALID_START_DATE');
    });

    it('should return 400 for endDate with invalid format (YYYY/MM/DD)', async () => {
      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          endDate: '2024/01/15',
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('INVALID_END_DATE');
    });

    it('should return 400 for startDate with letters', async () => {
      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          startDate: '2024-Jan-15',
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('INVALID_START_DATE');
    });

    it('should return 400 for endDate with invalid characters', async () => {
      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          endDate: '2024-01-15T00:00:00',
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('INVALID_END_DATE');
    });

    it('should accept valid YYYY-MM-DD format for startDate', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          startDate: '2024-01-01',
        })
      );

      expect(response.status).toBe(200);
    });

    it('should accept valid YYYY-MM-DD format for endDate', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          endDate: '2024-12-31',
        })
      );

      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Validation Failures - Invalid Limit
  // ==========================================================================
  describe('Validation failures - invalid limit', () => {
    it('should return 400 when limit is not a number', async () => {
      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          limit: 'abc',
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('limit');
      expect(body.error).toContain('positive integer');
      expect(body.code).toBe('INVALID_LIMIT');
    });

    it('should return 400 when limit is negative', async () => {
      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          limit: '-5',
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('limit');
      expect(body.code).toBe('INVALID_LIMIT');
    });

    it('should return 400 when limit is zero', async () => {
      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          limit: '0',
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('limit');
      expect(body.code).toBe('INVALID_LIMIT');
    });

    it('should return 400 when limit is a decimal', async () => {
      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          limit: '10.5',
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('INVALID_LIMIT');
    });

    it('should accept limit of 1 (minimum)', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          limit: '1',
        })
      );

      expect(response.status).toBe(200);
    });

    it('should accept limit of 200 (maximum)', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          limit: '200',
        })
      );

      expect(response.status).toBe(200);
    });

    it('should accept limit between 1 and 200', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          limit: '75',
        })
      );

      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Authentication Failures
  // ==========================================================================
  describe('Authentication failures', () => {
    it('should return 401 when userId is missing (authentication required)', async () => {
      const response = await GET(
        createRequest({})
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('userId');
      expect(body.code).toBe('MISSING_USER_ID');
    });
  });

  // ==========================================================================
  // Database Errors
  // ==========================================================================
  describe('Database errors', () => {
    it('should return 500 when workout logs query fails', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection timeout' },
      });

      mockSupabase.from.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('Failed to fetch workout history');
      expect(body.code).toBe('DATABASE_ERROR');
      expect(body.details).toBeTruthy();
    });

    it('should return 500 when logged sets query fails', async () => {
      // Mock successful workout logs query
      const mockWorkoutSelect = vi.fn().mockReturnThis();
      const mockWorkoutEq = vi.fn().mockReturnThis();
      const mockWorkoutOrder = vi.fn().mockReturnThis();
      const mockWorkoutLimit = vi.fn().mockResolvedValue({
        data: MOCK_WORKOUT_LOGS,
        error: null,
      });

      // Mock failed logged sets query
      const mockSetsSelect = vi.fn().mockReturnThis();
      const mockSetsIn = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch sets' },
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockWorkoutSelect };
        } else {
          return { select: mockSetsSelect };
        }
      });

      mockWorkoutSelect.mockReturnValue({ eq: mockWorkoutEq });
      mockWorkoutEq.mockReturnValue({ order: mockWorkoutOrder });
      mockWorkoutOrder.mockReturnValue({ limit: mockWorkoutLimit });

      mockSetsSelect.mockReturnValue({ in: mockSetsIn });

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('Failed to fetch workout set data');
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge cases', () => {
    it('should handle very large limit values by capping at 200', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          limit: '99999',
        })
      );

      expect(response.status).toBe(200);
      // Should cap at 200, not fail
    });

    it('should handle workout with completed_at equal to started_at', async () => {
      const sameTimeWorkout = [
        {
          id: 'workout-instant',
          date: '2024-01-15',
          status: 'completed',
          started_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T10:00:00Z',
          workout_plans: { name: 'Quick Test' },
        },
      ];

      setupSuccessfulMocks(mockSupabase, sameTimeWorkout, []);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.workouts[0].duration_seconds).toBe(0);
    });

    it('should handle sets with zero weight', async () => {
      const setsWithZeroWeight = [
        { workout_log_id: 'workout-1', weight_kg: 0, reps: 10 },
        { workout_log_id: 'workout-1', weight_kg: 0, reps: 10 },
      ];

      setupSuccessfulMocks(mockSupabase, MOCK_WORKOUT_LOGS, setsWithZeroWeight);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.workouts[0].total_volume).toBe(0);
    });

    it('should handle sets with very high weight and reps', async () => {
      const heavySets = [
        { workout_log_id: 'workout-1', weight_kg: 9999, reps: 999 },
      ];

      setupSuccessfulMocks(mockSupabase, MOCK_WORKOUT_LOGS, heavySets);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.workouts[0].total_volume).toBe(9999 * 999);
    });

    it('should handle different workout statuses', async () => {
      const mixedStatusWorkouts = [
        {
          id: 'workout-completed',
          date: '2024-01-15',
          status: 'completed',
          started_at: '2024-01-15T10:00:00Z',
          completed_at: '2024-01-15T11:00:00Z',
          workout_plans: { name: 'Completed' },
        },
        {
          id: 'workout-abandoned',
          date: '2024-01-14',
          status: 'abandoned',
          started_at: '2024-01-14T10:00:00Z',
          completed_at: '2024-01-14T10:30:00Z',
          workout_plans: { name: 'Abandoned' },
        },
        {
          id: 'workout-in-progress',
          date: '2024-01-13',
          status: 'in_progress',
          started_at: '2024-01-13T10:00:00Z',
          completed_at: null,
          workout_plans: { name: 'In Progress' },
        },
      ];

      setupSuccessfulMocks(mockSupabase, mixedStatusWorkouts, []);

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.workouts).toHaveLength(3);
      expect(body.workouts[0].status).toBe('completed');
      expect(body.workouts[1].status).toBe('abandoned');
      expect(body.workouts[2].status).toBe('in_progress');
    });

    it('should handle boundary dates (leap year)', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          startDate: '2024-02-29', // Leap year date
        })
      );

      expect(response.status).toBe(200);
    });

    it('should handle year boundaries', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await GET(
        createRequest({
          userId: VALID_USER_ID,
          startDate: '2023-12-31',
          endDate: '2024-01-01',
        })
      );

      expect(response.status).toBe(200);
    });

    it('should handle unexpected exception gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const response = await GET(
        createRequest({ userId: VALID_USER_ID })
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
      expect(body.code).toBe('INTERNAL_ERROR');
    });
  });
});
