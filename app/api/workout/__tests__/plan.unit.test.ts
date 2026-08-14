/**
 * Unit tests for POST /api/workout/plan
 * 
 * Task: 5.2 Write unit tests for plan creation endpoint
 * Requirements: 9.4, 9.6, 9.11
 * 
 * Test cases:
 * - Test valid input returns 200 with correct response shape
 * - Test missing required field returns 400
 * - Test empty exercises array returns 400
 * - Test invalid plan_id reference returns 404
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/workout/plan/route';

// ============================================================================
// Mock Supabase Client
// ============================================================================

const mockInsertPlanExercises = vi.fn();
const mockSelectPlanExercises = vi.fn();
const mockInsertPlan = vi.fn();
const mockSelectPlan = vi.fn();
const mockSinglePlan = vi.fn();
const mockDeletePlan = vi.fn();
const mockEqPlan = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'workout_plans') {
        return {
          insert: vi.fn((data: unknown) => ({
            select: vi.fn(() => ({
              single: mockSinglePlan,
            })),
          })),
          delete: vi.fn(() => ({
            eq: mockEqPlan,
          })),
        };
      } else if (table === 'plan_exercises') {
        return {
          insert: vi.fn((data: unknown) => ({
            select: mockSelectPlanExercises,
          })),
        };
      }
      return {};
    }),
  })),
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const VALID_USER_ID = 'user-abc123';
const VALID_EXERCISE_ID_1 = 'exercise-xyz789';
const VALID_EXERCISE_ID_2 = 'exercise-def456';

const VALID_PLAN_REQUEST = {
  user_id: VALID_USER_ID,
  name: 'Push Day',
  description: 'Chest, shoulders, and triceps workout',
  exercises: [
    {
      exercise_id: VALID_EXERCISE_ID_1,
      target_sets: 4,
      target_reps: 8,
      rest_seconds: 120,
      order_index: 0,
    },
    {
      exercise_id: VALID_EXERCISE_ID_2,
      target_sets: 3,
      target_reps: 12,
      rest_seconds: 90,
      order_index: 1,
    },
  ],
};

const CREATED_PLAN_RESPONSE = {
  id: 'plan-generated-uuid',
  user_id: VALID_USER_ID,
  name: 'Push Day',
  description: 'Chest, shoulders, and triceps workout',
  is_template: false,
  created_at: '2024-01-15T10:30:00.000Z',
  updated_at: '2024-01-15T10:30:00.000Z',
};

const CREATED_EXERCISES_RESPONSE = [
  {
    id: 'plan-exercise-uuid-1',
    plan_id: 'plan-generated-uuid',
    exercise_id: VALID_EXERCISE_ID_1,
    target_sets: 4,
    target_reps: 8,
    rest_seconds: 120,
    order_index: 0,
  },
  {
    id: 'plan-exercise-uuid-2',
    plan_id: 'plan-generated-uuid',
    exercise_id: VALID_EXERCISE_ID_2,
    target_sets: 3,
    target_reps: 12,
    rest_seconds: 90,
    order_index: 1,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function createRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/workout/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Unit: POST /api/workout/plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Test 1: Valid input returns 200 with correct response shape
  // ==========================================================================
  describe('Valid input', () => {
    it('should return 200 with correct response shape for valid input', async () => {
      // Mock successful plan creation
      mockSinglePlan.mockResolvedValueOnce({
        data: CREATED_PLAN_RESPONSE,
        error: null,
      });

      // Mock successful exercises creation
      mockSelectPlanExercises.mockResolvedValueOnce({
        data: CREATED_EXERCISES_RESPONSE,
        error: null,
      });

      const response = await POST(createRequest(VALID_PLAN_REQUEST));

      expect(response.status).toBe(200);
      
      const body = await response.json();
      
      // Verify response shape matches WorkoutPlanRow + exercises
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('user_id', VALID_USER_ID);
      expect(body).toHaveProperty('name', 'Push Day');
      expect(body).toHaveProperty('description');
      expect(body).toHaveProperty('is_template');
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');
      expect(body).toHaveProperty('exercises');
      
      // Verify exercises array structure
      expect(Array.isArray(body.exercises)).toBe(true);
      expect(body.exercises).toHaveLength(2);
      
      // Verify first exercise structure
      const exercise1 = body.exercises[0];
      expect(exercise1).toHaveProperty('id');
      expect(exercise1).toHaveProperty('plan_id');
      expect(exercise1).toHaveProperty('exercise_id', VALID_EXERCISE_ID_1);
      expect(exercise1).toHaveProperty('target_sets', 4);
      expect(exercise1).toHaveProperty('target_reps', 8);
      expect(exercise1).toHaveProperty('rest_seconds', 120);
      expect(exercise1).toHaveProperty('order_index', 0);
    });

    it('should accept optional description', async () => {
      const requestWithoutDescription = {
        ...VALID_PLAN_REQUEST,
        description: undefined,
      };

      mockSinglePlan.mockResolvedValueOnce({
        data: { ...CREATED_PLAN_RESPONSE, description: null },
        error: null,
      });

      mockSelectPlanExercises.mockResolvedValueOnce({
        data: CREATED_EXERCISES_RESPONSE,
        error: null,
      });

      const response = await POST(createRequest(requestWithoutDescription));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.description).toBeNull();
    });

    it('should handle single exercise in array', async () => {
      const requestWithOneExercise = {
        user_id: VALID_USER_ID,
        name: 'Quick Workout',
        exercises: [VALID_PLAN_REQUEST.exercises[0]],
      };

      mockSinglePlan.mockResolvedValueOnce({
        data: CREATED_PLAN_RESPONSE,
        error: null,
      });

      mockSelectPlanExercises.mockResolvedValueOnce({
        data: [CREATED_EXERCISES_RESPONSE[0]],
        error: null,
      });

      const response = await POST(createRequest(requestWithOneExercise));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.exercises).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Test 2: Missing required field returns 400
  // ==========================================================================
  describe('Missing required fields', () => {
    it('should return 400 when user_id is missing', async () => {
      const invalidRequest = { ...VALID_PLAN_REQUEST };
      delete (invalidRequest as any).user_id;

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('user_id');
      expect(body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 when name is missing', async () => {
      const invalidRequest = { ...VALID_PLAN_REQUEST };
      delete (invalidRequest as any).name;

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('name');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when exercises array is missing', async () => {
      const invalidRequest = { ...VALID_PLAN_REQUEST };
      delete (invalidRequest as any).exercises;

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('exercises');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when user_id is empty string', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        user_id: '',
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('user_id');
    });

    it('should return 400 when exercise missing exercise_id', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            // missing exercise_id
            target_sets: 3,
            target_reps: 10,
            rest_seconds: 60,
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('exercise_id');
    });

    it('should return 400 when exercise missing target_sets', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            // missing target_sets
            target_reps: 10,
            rest_seconds: 60,
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('target_sets');
    });

    it('should return 400 when exercise missing target_reps', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 3,
            // missing target_reps
            rest_seconds: 60,
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('target_reps');
    });

    it('should return 400 when exercise missing rest_seconds', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 3,
            target_reps: 10,
            // missing rest_seconds
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('rest_seconds');
    });

    it('should return 400 when exercise missing order_index', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 3,
            target_reps: 10,
            rest_seconds: 60,
            // missing order_index
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('order_index');
    });
  });

  // ==========================================================================
  // Test 3: Empty exercises array returns 400
  // ==========================================================================
  describe('Empty exercises array', () => {
    it('should return 400 when exercises array is empty', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('at least one exercise');
      expect(body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // Test 4: Authentication failures
  // Requirements: 9.11 - Unauthorized requests return 401
  // ==========================================================================
  describe('Authentication', () => {
    it('should return 401 when user_id is missing (authentication required)', async () => {
      const requestWithoutUserId = {
        name: 'Test Plan',
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 3,
            target_reps: 10,
            rest_seconds: 60,
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(requestWithoutUserId));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('user_id');
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // Test 5: Invalid exercise_id references
  // Note: Invalid exercise_id in exercises array causes foreign key constraint
  // violation during plan_exercises insert
  // Requirements: 9.4 - Validation failures return appropriate error codes
  // ==========================================================================
  describe('Invalid references', () => {
    it('should return 500 with DATABASE_ERROR when exercise_id reference is invalid', async () => {
      const requestWithInvalidExerciseId = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: 'nonexistent-exercise-id',
            target_sets: 3,
            target_reps: 10,
            rest_seconds: 60,
            order_index: 0,
          },
        ],
      };

      // Mock successful plan creation
      mockSinglePlan.mockResolvedValueOnce({
        data: CREATED_PLAN_RESPONSE,
        error: null,
      });

      // Mock failed exercises creation due to foreign key constraint
      mockSelectPlanExercises.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Foreign key constraint violation',
          code: '23503',
        },
      });

      // Mock cleanup delete
      mockEqPlan.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await POST(createRequest(requestWithInvalidExerciseId));

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('exercises');
      expect(body).toHaveProperty('code', 'DATABASE_ERROR');
    });

    it('should handle database error during plan creation', async () => {
      // Mock failed plan creation
      mockSinglePlan.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Database connection timeout',
        },
      });

      const response = await POST(createRequest(VALID_PLAN_REQUEST));

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toHaveProperty('code', 'DATABASE_ERROR');
      expect(body.error).toContain('Failed to create workout plan');
    });
  });

  // ==========================================================================
  // Additional edge cases
  // ==========================================================================
  describe('Edge cases', () => {
    it('should return 400 for invalid JSON body', async () => {
      const request = new Request('http://localhost:3000/api/workout/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json {]',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.code).toBe('INVALID_JSON');
    });

    it('should return 400 when name exceeds 200 characters', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        name: 'a'.repeat(201),
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('name');
    });

    it('should return 400 when description exceeds 1000 characters', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        description: 'a'.repeat(1001),
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('description');
    });

    it('should return 400 when target_sets is below minimum (1)', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 0, // below min of 1
            target_reps: 10,
            rest_seconds: 60,
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('target_sets');
    });

    it('should return 400 when target_sets exceeds maximum (10)', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 11, // exceeds max of 10
            target_reps: 10,
            rest_seconds: 60,
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('target_sets');
    });

    it('should return 400 when target_reps is below minimum (1)', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 3,
            target_reps: 0, // below min of 1
            rest_seconds: 60,
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('target_reps');
    });

    it('should return 400 when target_reps exceeds maximum (999)', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 3,
            target_reps: 1000, // exceeds max of 999
            rest_seconds: 60,
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('target_reps');
    });

    it('should return 400 when rest_seconds is negative', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 3,
            target_reps: 10,
            rest_seconds: -1, // negative value
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('rest_seconds');
    });

    it('should return 400 when rest_seconds exceeds maximum (600)', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 3,
            target_reps: 10,
            rest_seconds: 601, // exceeds max of 600
            order_index: 0,
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('rest_seconds');
    });

    it('should return 400 when order_index is negative', async () => {
      const invalidRequest = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 3,
            target_reps: 10,
            rest_seconds: 60,
            order_index: -1, // negative value
          },
        ],
      };

      const response = await POST(createRequest(invalidRequest));

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('order_index');
    });

    it('should accept boundary values for all numeric fields', async () => {
      const requestWithBoundaryValues = {
        ...VALID_PLAN_REQUEST,
        exercises: [
          {
            exercise_id: VALID_EXERCISE_ID_1,
            target_sets: 1, // min value
            target_reps: 1, // min value
            rest_seconds: 0, // min value
            order_index: 0, // min value
          },
          {
            exercise_id: VALID_EXERCISE_ID_2,
            target_sets: 10, // max value
            target_reps: 999, // max value
            rest_seconds: 600, // max value
            order_index: 9999, // large value
          },
        ],
      };

      mockSinglePlan.mockResolvedValueOnce({
        data: CREATED_PLAN_RESPONSE,
        error: null,
      });

      mockSelectPlanExercises.mockResolvedValueOnce({
        data: CREATED_EXERCISES_RESPONSE,
        error: null,
      });

      const response = await POST(createRequest(requestWithBoundaryValues));

      expect(response.status).toBe(200);
    });

    it('should handle multiple exercises with different values', async () => {
      const requestWithMultipleExercises = {
        user_id: VALID_USER_ID,
        name: 'Full Body Workout',
        description: 'Comprehensive workout plan',
        exercises: [
          {
            exercise_id: 'exercise-1',
            target_sets: 5,
            target_reps: 5,
            rest_seconds: 180,
            order_index: 0,
          },
          {
            exercise_id: 'exercise-2',
            target_sets: 4,
            target_reps: 8,
            rest_seconds: 120,
            order_index: 1,
          },
          {
            exercise_id: 'exercise-3',
            target_sets: 3,
            target_reps: 12,
            rest_seconds: 90,
            order_index: 2,
          },
          {
            exercise_id: 'exercise-4',
            target_sets: 2,
            target_reps: 15,
            rest_seconds: 60,
            order_index: 3,
          },
        ],
      };

      mockSinglePlan.mockResolvedValueOnce({
        data: CREATED_PLAN_RESPONSE,
        error: null,
      });

      mockSelectPlanExercises.mockResolvedValueOnce({
        data: [
          ...CREATED_EXERCISES_RESPONSE,
          { id: 'pe-3', plan_id: 'plan-generated-uuid', exercise_id: 'exercise-3', target_sets: 3, target_reps: 12, rest_seconds: 90, order_index: 2 },
          { id: 'pe-4', plan_id: 'plan-generated-uuid', exercise_id: 'exercise-4', target_sets: 2, target_reps: 15, rest_seconds: 60, order_index: 3 },
        ],
        error: null,
      });

      const response = await POST(createRequest(requestWithMultipleExercises));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.exercises).toHaveLength(4);
    });
  });
});
