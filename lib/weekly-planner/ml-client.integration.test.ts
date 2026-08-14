// ============================================================================
// Weekly Workout Planner - ML Client Integration Tests
// ============================================================================
// Integration tests for ML Engine HTTP client with real-like scenarios
// ============================================================================

import { describe, it, expect, vi } from 'vitest';
import {
  fetchRecommendation,
  fetchWeeklyRecommendations,
  MLEngineError,
  InvalidMLResponseError,
} from './ml-client';

// ============================================================================
// Test Data - Realistic ML Responses
// ============================================================================

const createMockRecommendation = (dayIndex: number) => ({
  recommended_exercises: dayIndex === 6 ? [] : [ // Sunday is rest day
    {
      exercise_id: `ex-${dayIndex}-1`,
      exercise_name: `Exercise ${dayIndex}A`,
      muscle_group: ['chest', 'back', 'legs', 'shoulders', 'arms'][dayIndex % 5],
      target_sets: 3,
      target_reps: 10,
      suggested_weight_kg: 50 + dayIndex * 5,
      rest_seconds: 90,
      rationale: `Day ${dayIndex} training`,
    },
    {
      exercise_id: `ex-${dayIndex}-2`,
      exercise_name: `Exercise ${dayIndex}B`,
      muscle_group: ['triceps', 'biceps', 'core', 'glutes', 'calves'][dayIndex % 5],
      target_sets: 3,
      target_reps: 12,
      suggested_weight_kg: 40 + dayIndex * 3,
      rest_seconds: 60,
      rationale: `Secondary exercise for day ${dayIndex}`,
    },
  ],
  plan_metadata: {
    total_exercises: dayIndex === 6 ? 0 : 2,
    estimated_duration_minutes: dayIndex === 6 ? 0 : 45 + dayIndex * 5,
    focus_areas: dayIndex === 6 ? ['rest'] : [`focus_${dayIndex}`],
  },
});

// ============================================================================
// Integration Test Suite
// ============================================================================

describe('ML Client Integration', () => {
  describe('Weekly Plan Generation Flow', () => {
    it('should fetch complete week with training and rest days', async () => {
      // Mock ML Engine responses for 7 days
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        const dayIndex = callCount;
        callCount++;
        
        return Promise.resolve({
          ok: true,
          json: async () => createMockRecommendation(dayIndex),
        });
      });

      const weeklyRecs = await fetchWeeklyRecommendations('user-123', '2025-01-27');

      // Verify we got 7 days
      expect(weeklyRecs).toHaveLength(7);

      // Verify Monday through Saturday have workouts
      for (let i = 0; i < 6; i++) {
        expect(weeklyRecs[i].recommended_exercises.length).toBeGreaterThan(0);
        expect(weeklyRecs[i].plan_metadata.total_exercises).toBeGreaterThan(0);
      }

      // Verify Sunday is rest day
      expect(weeklyRecs[6].recommended_exercises).toHaveLength(0);
      expect(weeklyRecs[6].plan_metadata.focus_areas).toContain('rest');
    });

    it('should propagate validation errors from ML response', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        
        // First two days succeed
        if (callCount <= 2) {
          return Promise.resolve({
            ok: true,
            json: async () => createMockRecommendation(callCount - 1),
          });
        }
        
        // Third day returns invalid response (missing plan_metadata)
        return Promise.resolve({
          ok: true,
          json: async () => ({
            recommended_exercises: [],
            // Missing plan_metadata
          }),
        });
      });

      await expect(
        fetchWeeklyRecommendations('user-123', '2025-01-27')
      ).rejects.toThrow(InvalidMLResponseError);

      // Should fail on 3rd day and not continue
      expect(callCount).toBe(3);
    });

    it('should handle ML Engine unavailability gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new Error('ECONNREFUSED')
      );

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow(MLEngineError);

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow('Failed to connect to ML Engine');
    });
  });

  describe('API Route Usage Patterns', () => {
    it('should work with API route error handling pattern', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service temporarily unavailable',
      });

      try {
        await fetchRecommendation('user-123', '2025-01-27');
        expect.fail('Should have thrown MLEngineError');
      } catch (error) {
        expect(error).toBeInstanceOf(MLEngineError);
        
        // This is how API route would handle it
        if (error instanceof MLEngineError) {
          const statusCode = error.statusCode === 503 ? 503 : 500;
          const errorResponse = {
            error: 'ML Engine unavailable',
            code: 'SERVICE_UNAVAILABLE',
          };
          
          expect(statusCode).toBe(503);
          expect(errorResponse.code).toBe('SERVICE_UNAVAILABLE');
        }
      }
    });

    it('should distinguish between ML errors and validation errors', async () => {
      // Test MLEngineError
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal error',
      });

      let mlError;
      try {
        await fetchRecommendation('user-123', '2025-01-27');
      } catch (error) {
        mlError = error;
      }

      expect(mlError).toBeInstanceOf(MLEngineError);
      expect(mlError).not.toBeInstanceOf(InvalidMLResponseError);

      // Test InvalidMLResponseError
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'structure' }),
      });

      let validationError;
      try {
        await fetchRecommendation('user-123', '2025-01-27');
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeInstanceOf(InvalidMLResponseError);
      expect(validationError).not.toBeInstanceOf(MLEngineError);
    });
  });

  describe('Environment Configuration', () => {
    it('should use NEXT_PUBLIC_ML_SERVICE_URL from environment', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createMockRecommendation(0),
      });

      await fetchRecommendation('user-123', '2025-01-27');

      // Verify it calls the configured URL (either env var or default)
      const fetchCall = (global.fetch as any).mock.calls[0];
      const url = fetchCall[0];
      
      expect(url).toMatch(/^http:\/\/(localhost:8001|.*?)\/workout\/recommend$/);
    });
  });

  describe('Transaction Rollback Support', () => {
    it('should fail fast to support database transaction rollback', async () => {
      const callOrder: number[] = [];
      
      global.fetch = vi.fn().mockImplementation(() => {
        const callNum = callOrder.length;
        callOrder.push(callNum);
        
        // Fail on 4th day (Thursday)
        if (callNum === 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: async () => 'ML Engine error',
          });
        }
        
        return Promise.resolve({
          ok: true,
          json: async () => createMockRecommendation(callNum),
        });
      });

      try {
        await fetchWeeklyRecommendations('user-123', '2025-01-27');
        expect.fail('Should have thrown error');
      } catch (error) {
        // Verify it failed fast and didn't continue to Friday, Saturday, Sunday
        expect(callOrder).toEqual([0, 1, 2, 3]);
        expect(callOrder.length).toBe(4);
        
        // This allows the API route to rollback the database transaction
        expect(error).toBeInstanceOf(MLEngineError);
      }
    });
  });
});
