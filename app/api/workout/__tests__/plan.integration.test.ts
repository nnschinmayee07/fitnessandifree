/**
 * Integration tests for POST /api/workout/plan
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.10, 9.11, 2.1, 2.2, 2.4, 2.5
 *
 * Strategy: mock @supabase/supabase-js to exercise the real route handler
 * logic without actual database I/O.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Supabase mock setup ──────────────────────────────────────────────────────
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'workout_plans') {
        return {
          insert: vi.fn((data: unknown) => ({
            select: vi.fn(() => ({
              single: mockSingle,
            })),
          })),
          delete: vi.fn(() => ({
            eq: mockEq,
          })),
        };
      } else if (table === 'plan_exercises') {
        return {
          insert: vi.fn((data: unknown) => ({
            select: mockInsert,
          })),
        };
      }
      return {};
    }),
  })),
}));

// Import the route AFTER mocking
import { POST } from '@/app/api/workout/plan/route';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const VALID_PLAN_INPUT = {
  user_id: 'user-123',
  name: 'Upper Body Strength',
  description: 'Focus on chest, back, and shoulders',
  exercises: [
    {
      exercise_id: 'exercise-1',
      target_sets: 3,
      target_reps: 10,
      rest_seconds: 90,
      order_index: 0,
    },
    {
      exercise_id: 'exercise-2',
      target_sets: 4,
      target_reps: 8,
      rest_seconds: 120,
      order_index: 1,
    },
  ],
};

const CREATED_PLAN_ROW = {
  id: 'plan-uuid-1234',
  user_id: 'user-123',
  name: 'Upper Body Strength',
  description: 'Focus on chest, back, and shoulders',
  is_template: false,
  created_at: '2024-01-15T12:00:00.000Z',
  updated_at: '2024-01-15T12:00:00.000Z',
};

const CREATED_EXERCISES = [
  {
    id: 'plan-exercise-1',
    plan_id: 'plan-uuid-1234',
    exercise_id: 'exercise-1',
    target_sets: 3,
    target_reps: 10,
    rest_seconds: 90,
    order_index: 0,
  },
  {
    id: 'plan-exercise-2',
    plan_id: 'plan-uuid-1234',
    exercise_id: 'exercise-2',
    target_sets: 4,
    target_reps: 8,
    rest_seconds: 120,
    order_index: 1,
  },
];

// ── Helper: build Request ─────────────────────────────────────────────────────

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/workout/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('Integration: POST /api/workout/plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_KEY = 'service-key-test';
  });

  // ── Test 1: Happy path ─────────────────────────────────────────────────────
  it('returns 200 with created plan and exercises on success', async () => {
    // Mock plan insert success
    mockSingle.mockResolvedValueOnce({
      data: CREATED_PLAN_ROW,
      error: null,
    });

    // Mock exercises insert success
    mockInsert.mockResolvedValueOnce({
      data: CREATED_EXERCISES,
      error: null,
    });

    const response = await POST(buildRequest(VALID_PLAN_INPUT));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      ...CREATED_PLAN_ROW,
      exercises: CREATED_EXERCISES,
    });
  });

  // ── Test 2: Missing user_id → 400 ────────────────────────────────────────
  it('returns 400 when user_id is missing', async () => {
    const invalidInput = { ...VALID_PLAN_INPUT };
    delete (invalidInput as any).user_id;

    const response = await POST(buildRequest(invalidInput));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('user_id');
  });

  // ── Test 3: Invalid name length → 400 ────────────────────────────────────
  it('returns 400 when name exceeds 200 characters', async () => {
    const invalidInput = {
      ...VALID_PLAN_INPUT,
      name: 'a'.repeat(201),
    };

    const response = await POST(buildRequest(invalidInput));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('name');
  });

  // ── Test 4: Empty exercises array → 400 ───────────────────────────────────
  it('returns 400 when exercises array is empty', async () => {
    const invalidInput = {
      ...VALID_PLAN_INPUT,
      exercises: [],
    };

    const response = await POST(buildRequest(invalidInput));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('at least one exercise');
  });

  // ── Test 5: Invalid target_sets → 400 ─────────────────────────────────────
  it('returns 400 when target_sets is out of bounds', async () => {
    const invalidInput = {
      ...VALID_PLAN_INPUT,
      exercises: [
        {
          exercise_id: 'exercise-1',
          target_sets: 11, // Invalid: max is 10
          target_reps: 10,
          rest_seconds: 90,
          order_index: 0,
        },
      ],
    };

    const response = await POST(buildRequest(invalidInput));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('target_sets');
  });

  // ── Test 6: Database error on plan insert → 500 ───────────────────────────
  it('returns 500 when plan insert fails', async () => {
    // Mock plan insert failure
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const response = await POST(buildRequest(VALID_PLAN_INPUT));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('DATABASE_ERROR');
  });

  // ── Test 7: Database error on exercises insert → 500 + rollback ───────────
  it('returns 500 and deletes plan when exercises insert fails', async () => {
    // Mock plan insert success
    mockSingle.mockResolvedValueOnce({
      data: CREATED_PLAN_ROW,
      error: null,
    });

    // Mock exercises insert failure
    mockInsert.mockResolvedValueOnce({
      data: null,
      error: { message: 'Foreign key constraint violation' },
    });

    // Mock delete for rollback
    mockEq.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const response = await POST(buildRequest(VALID_PLAN_INPUT));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('DATABASE_ERROR');
    expect(body.error).toContain('exercises');
  });

  // ── Test 8: Invalid JSON body → 400 ───────────────────────────────────────
  it('returns 400 when request body is not valid JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/workout/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('INVALID_JSON');
  });

  // ── Test 9: Missing required exercise fields → 400 ────────────────────────
  it('returns 400 when exercise missing required fields', async () => {
    const invalidInput = {
      ...VALID_PLAN_INPUT,
      exercises: [
        {
          exercise_id: 'exercise-1',
          // Missing target_sets
          target_reps: 10,
          rest_seconds: 90,
          order_index: 0,
        },
      ],
    };

    const response = await POST(buildRequest(invalidInput));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('target_sets');
  });
});
