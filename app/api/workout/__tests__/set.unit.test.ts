// ============================================================================
// Workout Set API Route Unit Tests
// ============================================================================
// Unit tests for POST /api/workout/set
// Requirements: 9.8, 9.9, 9.10, 9.11, 3.3, 3.4, 3.5, 3.6
//
// Task: 7.2 Write unit tests for set logging endpoint
//
// Test Coverage:
// - Success cases: valid set logging with all fields
// - Validation failures: missing fields, out-of-bounds values, invalid types
// - Authentication failures: missing user_id
// - Invalid references: non-existent workout_id, exercise_id (404)
// - Boundary values: weight_kg (0.0-9999.0), reps (1-999), rpe (1.0-10.0)
// - Database errors: insert failures
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../set/route';
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
const VALID_WORKOUT_ID = 'workout-xyz789';
const VALID_EXERCISE_ID = 'exercise-def456';

const VALID_SET_REQUEST = {
  workout_id: VALID_WORKOUT_ID,
  exercise_id: VALID_EXERCISE_ID,
  set_number: 1,
  weight_kg: 50.5,
  reps: 10,
  rpe: 7.5,
};

const MOCK_WORKOUT_DATA = {
  id: VALID_WORKOUT_ID,
  user_id: VALID_USER_ID,
};

const MOCK_EXERCISE_DATA = {
  id: VALID_EXERCISE_ID,
};

const MOCK_CREATED_SET = {
  id: 'set-generated-uuid',
  workout_log_id: VALID_WORKOUT_ID,
  exercise_id: VALID_EXERCISE_ID,
  set_number: 1,
  weight_kg: 50.5,
  reps: 10,
  rpe: 7.5,
  logged_at: '2024-01-15T10:30:00.000Z',
};

// ============================================================================
// Helper Functions
// ============================================================================

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/workout/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setupSuccessfulMocks(mockSupabase: any) {
  // Mock workout lookup - workout exists
  const mockWorkoutSelect = vi.fn().mockReturnThis();
  const mockWorkoutEq = vi.fn().mockReturnThis();
  const mockWorkoutSingle = vi.fn().mockResolvedValue({
    data: MOCK_WORKOUT_DATA,
    error: null,
  });

  // Mock exercise lookup - exercise exists
  const mockExerciseSelect = vi.fn().mockReturnThis();
  const mockExerciseEq = vi.fn().mockReturnThis();
  const mockExerciseSingle = vi.fn().mockResolvedValue({
    data: MOCK_EXERCISE_DATA,
    error: null,
  });

  // Mock set insert
  const mockInsert = vi.fn().mockReturnThis();
  const mockSetSelect = vi.fn().mockReturnThis();
  const mockSetSingle = vi.fn().mockResolvedValue({
    data: MOCK_CREATED_SET,
    error: null,
  });

  let callCount = 0;
  mockSupabase.from.mockImplementation((table: string) => {
    callCount++;
    if (callCount === 1) {
      // First call: workout_logs lookup
      return { select: mockWorkoutSelect };
    } else if (callCount === 2) {
      // Second call: exercises lookup
      return { select: mockExerciseSelect };
    } else {
      // Third call: logged_sets insert
      return { insert: mockInsert };
    }
  });

  mockWorkoutSelect.mockReturnValue({ eq: mockWorkoutEq });
  mockWorkoutEq.mockReturnValue({ single: mockWorkoutSingle });

  mockExerciseSelect.mockReturnValue({ eq: mockExerciseEq });
  mockExerciseEq.mockReturnValue({ single: mockExerciseSingle });

  mockInsert.mockReturnValue({ select: mockSetSelect });
  mockSetSelect.mockReturnValue({ single: mockSetSingle });

  return {
    mockWorkoutSingle,
    mockExerciseSingle,
    mockInsert,
    mockSetSingle,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Unit: POST /api/workout/set', () => {
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
    it('should return 200 and create set with all fields including optional RPE', async () => {
      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(VALID_SET_REQUEST));

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('workout_log_id', VALID_WORKOUT_ID);
      expect(body).toHaveProperty('exercise_id', VALID_EXERCISE_ID);
      expect(body).toHaveProperty('set_number', 1);
      expect(body).toHaveProperty('weight_kg', 50.5);
      expect(body).toHaveProperty('reps', 10);
      expect(body).toHaveProperty('rpe', 7.5);
      expect(body).toHaveProperty('logged_at');
    });

    it('should create set without optional RPE field', async () => {
      const requestWithoutRPE = { ...VALID_SET_REQUEST };
      delete (requestWithoutRPE as any).rpe;

      const mockCreatedSet = { ...MOCK_CREATED_SET, rpe: null };

      const mocks = setupSuccessfulMocks(mockSupabase);
      mocks.mockSetSingle.mockResolvedValue({
        data: mockCreatedSet,
        error: null,
      });

      const response = await POST(createRequest(requestWithoutRPE));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.rpe).toBeNull();
    });

    it('should accept set_number as any positive integer', async () => {
      const requestWithHighSetNumber = {
        ...VALID_SET_REQUEST,
        set_number: 100,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(requestWithHighSetNumber));

      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Validation Failures - Missing Required Fields
  // ==========================================================================
  describe('Validation failures - missing required fields', () => {
    it('should return 400 when workout_id is missing', async () => {
      const invalidRequest = { ...VALID_SET_REQUEST };
      delete (invalidRequest as any).workout_id;

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('workout_log_id');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when exercise_id is missing', async () => {
      const invalidRequest = { ...VALID_SET_REQUEST };
      delete (invalidRequest as any).exercise_id;

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('exercise_id');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when set_number is missing', async () => {
      const invalidRequest = { ...VALID_SET_REQUEST };
      delete (invalidRequest as any).set_number;

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('set_number');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when weight_kg is missing', async () => {
      const invalidRequest = { ...VALID_SET_REQUEST };
      delete (invalidRequest as any).weight_kg;

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('weight_kg');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when reps is missing', async () => {
      const invalidRequest = { ...VALID_SET_REQUEST };
      delete (invalidRequest as any).reps;

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('reps');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when workout_id is empty string', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        workout_id: '',
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('workout_log_id');
    });

    it('should return 400 when exercise_id is empty string', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        exercise_id: '',
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('exercise_id');
    });
  });

  // ==========================================================================
  // Validation Failures - Out of Bounds Values
  // ==========================================================================
  describe('Validation failures - boundary violations for weight_kg (0.0-9999.0)', () => {
    it('should return 400 when weight_kg is negative', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        weight_kg: -0.1,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('weight_kg');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when weight_kg exceeds maximum (9999.0)', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        weight_kg: 9999.1,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('weight_kg');
    });

    it('should return 400 when weight_kg has more than 2 decimal places', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        weight_kg: 50.123,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('weight_kg');
      expect(body.error).toContain('2 decimal places');
    });

    it('should accept weight_kg at minimum boundary (0.0)', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        weight_kg: 0.0,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });

    it('should accept weight_kg at maximum boundary (9999.0)', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        weight_kg: 9999.0,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });

    it('should accept weight_kg with exactly 2 decimal places', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        weight_kg: 123.45,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });

    it('should accept weight_kg with 1 decimal place', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        weight_kg: 75.5,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });

    it('should accept weight_kg as integer (0 decimal places)', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        weight_kg: 100,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });
  });

  describe('Validation failures - boundary violations for reps (1-999)', () => {
    it('should return 400 when reps is 0', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        reps: 0,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('reps');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when reps is negative', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        reps: -1,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('reps');
    });

    it('should return 400 when reps exceeds maximum (999)', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        reps: 1000,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('reps');
    });

    it('should return 400 when reps is not an integer', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        reps: 10.5,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('reps');
    });

    it('should accept reps at minimum boundary (1)', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        reps: 1,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });

    it('should accept reps at maximum boundary (999)', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        reps: 999,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });
  });

  describe('Validation failures - boundary violations for rpe (1.0-10.0)', () => {
    it('should return 400 when rpe is below minimum (< 1.0)', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        rpe: 0.9,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('rpe');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when rpe exceeds maximum (> 10.0)', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        rpe: 10.1,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('rpe');
    });

    it('should return 400 when rpe has more than 1 decimal place', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        rpe: 7.55,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('rpe');
      expect(body.error).toContain('1 decimal place');
    });

    it('should accept rpe at minimum boundary (1.0)', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        rpe: 1.0,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });

    it('should accept rpe at maximum boundary (10.0)', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        rpe: 10.0,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });

    it('should accept rpe with exactly 1 decimal place', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        rpe: 8.5,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });

    it('should accept rpe as integer (no decimal places)', async () => {
      const validRequest = {
        ...VALID_SET_REQUEST,
        rpe: 7,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(validRequest));

      expect(response.status).toBe(200);
    });
  });

  describe('Validation failures - set_number validation', () => {
    it('should return 400 when set_number is 0', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        set_number: 0,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('set_number');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when set_number is negative', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        set_number: -1,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('set_number');
    });

    it('should return 400 when set_number is not an integer', async () => {
      const invalidRequest = {
        ...VALID_SET_REQUEST,
        set_number: 1.5,
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('set_number');
    });
  });

  // ==========================================================================
  // Invalid References (404 Errors)
  // ==========================================================================
  describe('Invalid references', () => {
    it('should return 404 when workout_id does not exist', async () => {
      // Mock workout lookup - workout not found
      const mockWorkoutSelect = vi.fn().mockReturnThis();
      const mockWorkoutEq = vi.fn().mockReturnThis();
      const mockWorkoutSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Workout not found' },
      });

      mockSupabase.from.mockReturnValue({ select: mockWorkoutSelect });
      mockWorkoutSelect.mockReturnValue({ eq: mockWorkoutEq });
      mockWorkoutEq.mockReturnValue({ single: mockWorkoutSingle });

      const response = await POST(createRequest(VALID_SET_REQUEST));

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Workout not found');
      expect(body.code).toBe('WORKOUT_NOT_FOUND');
    });

    it('should return 404 when exercise_id does not exist', async () => {
      // Mock workout lookup - workout exists
      const mockWorkoutSelect = vi.fn().mockReturnThis();
      const mockWorkoutEq = vi.fn().mockReturnThis();
      const mockWorkoutSingle = vi.fn().mockResolvedValue({
        data: MOCK_WORKOUT_DATA,
        error: null,
      });

      // Mock exercise lookup - exercise not found
      const mockExerciseSelect = vi.fn().mockReturnThis();
      const mockExerciseEq = vi.fn().mockReturnThis();
      const mockExerciseSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Exercise not found' },
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockWorkoutSelect };
        } else {
          return { select: mockExerciseSelect };
        }
      });

      mockWorkoutSelect.mockReturnValue({ eq: mockWorkoutEq });
      mockWorkoutEq.mockReturnValue({ single: mockWorkoutSingle });

      mockExerciseSelect.mockReturnValue({ eq: mockExerciseEq });
      mockExerciseEq.mockReturnValue({ single: mockExerciseSingle });

      const response = await POST(createRequest(VALID_SET_REQUEST));

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Exercise not found');
      expect(body.code).toBe('EXERCISE_NOT_FOUND');
    });
  });

  // ==========================================================================
  // Authentication Failures
  // ==========================================================================
  describe('Authentication failures', () => {
    it('should return 401 when workout has no user_id (authentication required)', async () => {
      // Mock workout lookup - workout exists but no user_id
      const mockWorkoutSelect = vi.fn().mockReturnThis();
      const mockWorkoutEq = vi.fn().mockReturnThis();
      const mockWorkoutSingle = vi.fn().mockResolvedValue({
        data: { id: VALID_WORKOUT_ID, user_id: null },
        error: null,
      });

      mockSupabase.from.mockReturnValue({ select: mockWorkoutSelect });
      mockWorkoutSelect.mockReturnValue({ eq: mockWorkoutEq });
      mockWorkoutEq.mockReturnValue({ single: mockWorkoutSingle });

      const response = await POST(createRequest(VALID_SET_REQUEST));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Authentication required');
      expect(body.code).toBe('UNAUTHORIZED');
    });
  });

  // ==========================================================================
  // Database Errors
  // ==========================================================================
  describe('Database errors', () => {
    it('should return 500 when database insert fails', async () => {
      // Mock workout lookup - workout exists
      const mockWorkoutSelect = vi.fn().mockReturnThis();
      const mockWorkoutEq = vi.fn().mockReturnThis();
      const mockWorkoutSingle = vi.fn().mockResolvedValue({
        data: MOCK_WORKOUT_DATA,
        error: null,
      });

      // Mock exercise lookup - exercise exists
      const mockExerciseSelect = vi.fn().mockReturnThis();
      const mockExerciseEq = vi.fn().mockReturnThis();
      const mockExerciseSingle = vi.fn().mockResolvedValue({
        data: MOCK_EXERCISE_DATA,
        error: null,
      });

      // Mock set insert - fails
      const mockInsert = vi.fn().mockReturnThis();
      const mockSetSelect = vi.fn().mockReturnThis();
      const mockSetSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' },
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return { select: mockWorkoutSelect };
        } else if (callCount === 2) {
          return { select: mockExerciseSelect };
        } else {
          return { insert: mockInsert };
        }
      });

      mockWorkoutSelect.mockReturnValue({ eq: mockWorkoutEq });
      mockWorkoutEq.mockReturnValue({ single: mockWorkoutSingle });

      mockExerciseSelect.mockReturnValue({ eq: mockExerciseEq });
      mockExerciseEq.mockReturnValue({ single: mockExerciseSingle });

      mockInsert.mockReturnValue({ select: mockSetSelect });
      mockSetSelect.mockReturnValue({ single: mockSetSingle });

      const response = await POST(createRequest(VALID_SET_REQUEST));

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('Failed to log workout set');
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge cases', () => {
    it('should return 400 for invalid JSON body', async () => {
      const request = new Request('http://localhost:3000/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json {]',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid JSON');
      expect(body.code).toBe('INVALID_JSON');
    });

    it('should return 400 when body is null', async () => {
      const request = new Request('http://localhost:3000/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'null',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('non-null object');
      expect(body.code).toBe('INVALID_BODY');
    });

    it('should return 400 when body is not an object', async () => {
      const request = new Request('http://localhost:3000/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '"string value"',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('non-null object');
      expect(body.code).toBe('INVALID_BODY');
    });

    it('should handle all boundary values together', async () => {
      const requestWithAllBoundaries = {
        workout_id: VALID_WORKOUT_ID,
        exercise_id: VALID_EXERCISE_ID,
        set_number: 1,
        weight_kg: 0.0,
        reps: 1,
        rpe: 1.0,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(requestWithAllBoundaries));

      expect(response.status).toBe(200);
    });

    it('should handle maximum boundary values together', async () => {
      const requestWithMaxBoundaries = {
        workout_id: VALID_WORKOUT_ID,
        exercise_id: VALID_EXERCISE_ID,
        set_number: 999,
        weight_kg: 9999.0,
        reps: 999,
        rpe: 10.0,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(requestWithMaxBoundaries));

      expect(response.status).toBe(200);
    });

    it('should handle typical mid-range values', async () => {
      const requestWithMidRangeValues = {
        workout_id: VALID_WORKOUT_ID,
        exercise_id: VALID_EXERCISE_ID,
        set_number: 3,
        weight_kg: 100.75,
        reps: 12,
        rpe: 7.5,
      };

      setupSuccessfulMocks(mockSupabase);

      const response = await POST(createRequest(requestWithMidRangeValues));

      expect(response.status).toBe(200);
    });
  });
});
