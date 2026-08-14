// ============================================================================
// Workout Set API Route Tests
// ============================================================================
// Unit tests for POST /api/workout/set
// Requirements: 9.8, 9.9, 3.3, 3.4, 3.5, 3.6
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../set/route';
import { createServerClient } from '@/lib/supabase/server';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

describe('POST /api/workout/set', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock Supabase client
    mockSupabase = {
      from: vi.fn(),
    };
    
    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);
  });

  describe('Validation', () => {
    it('should return 400 for invalid JSON', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid JSON');
      expect(body.code).toBe('INVALID_JSON');
    });

    it('should return 400 when workout_id is missing', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: 'exercise-123',
          set_number: 1,
          weight_kg: 50.5,
          reps: 10,
          rpe: 7.5,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('workout_log_id');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when exercise_id is missing', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: 'workout-123',
          set_number: 1,
          weight_kg: 50.5,
          reps: 10,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('exercise_id');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when weight_kg is negative', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: 'workout-123',
          exercise_id: 'exercise-123',
          set_number: 1,
          weight_kg: -10,
          reps: 10,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('weight_kg');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when weight_kg exceeds 9999', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: 'workout-123',
          exercise_id: 'exercise-123',
          set_number: 1,
          weight_kg: 10000,
          reps: 10,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('weight_kg');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when reps is less than 1', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: 'workout-123',
          exercise_id: 'exercise-123',
          set_number: 1,
          weight_kg: 50,
          reps: 0,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('reps');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when reps exceeds 999', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: 'workout-123',
          exercise_id: 'exercise-123',
          set_number: 1,
          weight_kg: 50,
          reps: 1000,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('reps');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when rpe is less than 1', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: 'workout-123',
          exercise_id: 'exercise-123',
          set_number: 1,
          weight_kg: 50,
          reps: 10,
          rpe: 0.5,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('rpe');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when rpe exceeds 10', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: 'workout-123',
          exercise_id: 'exercise-123',
          set_number: 1,
          weight_kg: 50,
          reps: 10,
          rpe: 10.5,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('rpe');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when weight_kg has more than 2 decimal places', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: 'workout-123',
          exercise_id: 'exercise-123',
          set_number: 1,
          weight_kg: 50.125,
          reps: 10,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('weight_kg');
      expect(body.error).toContain('decimal');
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when rpe has more than 1 decimal place', async () => {
      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: 'workout-123',
          exercise_id: 'exercise-123',
          set_number: 1,
          weight_kg: 50,
          reps: 10,
          rpe: 7.55,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('rpe');
      expect(body.error).toContain('decimal');
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Resource Verification', () => {
    it('should return 404 when workout does not exist', async () => {
      // Mock workout lookup - workout not found
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Workout not found' },
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: 'nonexistent-workout',
          exercise_id: 'exercise-123',
          set_number: 1,
          weight_kg: 50,
          reps: 10,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Workout not found');
      expect(body.code).toBe('WORKOUT_NOT_FOUND');
    });

    it('should return 404 when exercise does not exist', async () => {
      const mockUserId = 'user-123';
      const mockWorkoutId = 'workout-456';

      // Mock workout lookup - workout exists
      const mockWorkoutSelect = vi.fn().mockReturnThis();
      const mockWorkoutEq = vi.fn().mockReturnThis();
      const mockWorkoutSingle = vi.fn().mockResolvedValue({
        data: { id: mockWorkoutId, user_id: mockUserId },
        error: null,
      });

      // Mock exercise lookup - exercise not found
      const mockExerciseSelect = vi.fn().mockReturnThis();
      const mockExerciseEq = vi.fn().mockReturnThis();
      const mockExerciseSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Exercise not found' },
      });

      // Setup mock chaining
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // First call: workout_logs lookup
          return {
            select: mockWorkoutSelect,
          };
        } else {
          // Second call: exercises lookup
          return {
            select: mockExerciseSelect,
          };
        }
      });

      mockWorkoutSelect.mockReturnValue({
        eq: mockWorkoutEq,
      });
      mockWorkoutEq.mockReturnValue({
        single: mockWorkoutSingle,
      });

      mockExerciseSelect.mockReturnValue({
        eq: mockExerciseEq,
      });
      mockExerciseEq.mockReturnValue({
        single: mockExerciseSingle,
      });

      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: mockWorkoutId,
          exercise_id: 'nonexistent-exercise',
          set_number: 1,
          weight_kg: 50,
          reps: 10,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Exercise not found');
      expect(body.code).toBe('EXERCISE_NOT_FOUND');
    });
  });

  describe('Set Logging', () => {
    it('should log set successfully and return 200', async () => {
      const mockUserId = 'user-123';
      const mockWorkoutId = 'workout-456';
      const mockExerciseId = 'exercise-789';
      const mockSetNumber = 1;
      const mockWeightKg = 50.5;
      const mockReps = 10;
      const mockRpe = 7.5;

      // Mock workout lookup - workout exists
      const mockWorkoutSelect = vi.fn().mockReturnThis();
      const mockWorkoutEq = vi.fn().mockReturnThis();
      const mockWorkoutSingle = vi.fn().mockResolvedValue({
        data: { id: mockWorkoutId, user_id: mockUserId },
        error: null,
      });

      // Mock exercise lookup - exercise exists
      const mockExerciseSelect = vi.fn().mockReturnThis();
      const mockExerciseEq = vi.fn().mockReturnThis();
      const mockExerciseSingle = vi.fn().mockResolvedValue({
        data: { id: mockExerciseId },
        error: null,
      });

      // Mock set insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockSetSelect = vi.fn().mockReturnThis();
      const mockSetSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'set-999',
          workout_log_id: mockWorkoutId,
          exercise_id: mockExerciseId,
          set_number: mockSetNumber,
          weight_kg: mockWeightKg,
          reps: mockReps,
          rpe: mockRpe,
          logged_at: '2024-01-15T10:30:00Z',
        },
        error: null,
      });

      // Setup mock chaining
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

      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: mockWorkoutId,
          exercise_id: mockExerciseId,
          set_number: mockSetNumber,
          weight_kg: mockWeightKg,
          reps: mockReps,
          rpe: mockRpe,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      
      expect(body.id).toBe('set-999');
      expect(body.workout_log_id).toBe(mockWorkoutId);
      expect(body.exercise_id).toBe(mockExerciseId);
      expect(body.set_number).toBe(mockSetNumber);
      expect(body.weight_kg).toBe(mockWeightKg);
      expect(body.reps).toBe(mockReps);
      expect(body.rpe).toBe(mockRpe);
      expect(body.logged_at).toBeTruthy();

      // Verify insert was called with correct data
      expect(mockInsert).toHaveBeenCalledWith({
        workout_log_id: mockWorkoutId,
        exercise_id: mockExerciseId,
        set_number: mockSetNumber,
        weight_kg: mockWeightKg,
        reps: mockReps,
        rpe: mockRpe,
        logged_at: expect.any(String),
      });
    });

    it('should log set without rpe when rpe not provided', async () => {
      const mockUserId = 'user-123';
      const mockWorkoutId = 'workout-456';
      const mockExerciseId = 'exercise-789';

      // Mock workout lookup - workout exists
      const mockWorkoutSelect = vi.fn().mockReturnThis();
      const mockWorkoutEq = vi.fn().mockReturnThis();
      const mockWorkoutSingle = vi.fn().mockResolvedValue({
        data: { id: mockWorkoutId, user_id: mockUserId },
        error: null,
      });

      // Mock exercise lookup - exercise exists
      const mockExerciseSelect = vi.fn().mockReturnThis();
      const mockExerciseEq = vi.fn().mockReturnThis();
      const mockExerciseSingle = vi.fn().mockResolvedValue({
        data: { id: mockExerciseId },
        error: null,
      });

      // Mock set insert
      const mockInsert = vi.fn().mockReturnThis();
      const mockSetSelect = vi.fn().mockReturnThis();
      const mockSetSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'set-999',
          workout_log_id: mockWorkoutId,
          exercise_id: mockExerciseId,
          set_number: 1,
          weight_kg: 50,
          reps: 10,
          rpe: null,
          logged_at: '2024-01-15T10:30:00Z',
        },
        error: null,
      });

      // Setup mock chaining
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

      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: mockWorkoutId,
          exercise_id: mockExerciseId,
          set_number: 1,
          weight_kg: 50,
          reps: 10,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.rpe).toBeNull();

      // Verify insert was called with rpe as null
      expect(mockInsert).toHaveBeenCalledWith({
        workout_log_id: mockWorkoutId,
        exercise_id: mockExerciseId,
        set_number: 1,
        weight_kg: 50,
        reps: 10,
        rpe: null,
        logged_at: expect.any(String),
      });
    });

    it('should accept weight_kg at boundary 0', async () => {
      const mockUserId = 'user-123';
      const mockWorkoutId = 'workout-456';
      const mockExerciseId = 'exercise-789';

      // Mock successful lookups and insert
      const mockWorkoutSelect = vi.fn().mockReturnThis();
      const mockWorkoutEq = vi.fn().mockReturnThis();
      const mockWorkoutSingle = vi.fn().mockResolvedValue({
        data: { id: mockWorkoutId, user_id: mockUserId },
        error: null,
      });

      const mockExerciseSelect = vi.fn().mockReturnThis();
      const mockExerciseEq = vi.fn().mockReturnThis();
      const mockExerciseSingle = vi.fn().mockResolvedValue({
        data: { id: mockExerciseId },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSetSelect = vi.fn().mockReturnThis();
      const mockSetSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'set-999',
          workout_log_id: mockWorkoutId,
          exercise_id: mockExerciseId,
          set_number: 1,
          weight_kg: 0,
          reps: 10,
          rpe: null,
          logged_at: '2024-01-15T10:30:00Z',
        },
        error: null,
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

      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: mockWorkoutId,
          exercise_id: mockExerciseId,
          set_number: 1,
          weight_kg: 0,
          reps: 10,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.weight_kg).toBe(0);
    });

    it('should return 500 when database insert fails', async () => {
      const mockUserId = 'user-123';
      const mockWorkoutId = 'workout-456';
      const mockExerciseId = 'exercise-789';

      // Mock workout lookup - workout exists
      const mockWorkoutSelect = vi.fn().mockReturnThis();
      const mockWorkoutEq = vi.fn().mockReturnThis();
      const mockWorkoutSingle = vi.fn().mockResolvedValue({
        data: { id: mockWorkoutId, user_id: mockUserId },
        error: null,
      });

      // Mock exercise lookup - exercise exists
      const mockExerciseSelect = vi.fn().mockReturnThis();
      const mockExerciseEq = vi.fn().mockReturnThis();
      const mockExerciseSingle = vi.fn().mockResolvedValue({
        data: { id: mockExerciseId },
        error: null,
      });

      // Mock set insert - fails
      const mockInsert = vi.fn().mockReturnThis();
      const mockSetSelect = vi.fn().mockReturnThis();
      const mockSetSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' },
      });

      // Setup mock chaining
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

      const request = new Request('http://localhost/api/workout/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_id: mockWorkoutId,
          exercise_id: mockExerciseId,
          set_number: 1,
          weight_kg: 50,
          reps: 10,
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain('Failed to log workout set');
      expect(body.code).toBe('DATABASE_ERROR');
    });
  });
});
