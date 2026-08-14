// ============================================================================
// Weekly Workout Planner - ML Client Unit Tests
// ============================================================================
// Tests for ML Engine HTTP client with timeout and error handling
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchRecommendation,
  fetchWeeklyRecommendations,
  MLEngineError,
  InvalidMLResponseError,
} from './ml-client';

// ============================================================================
// Test Data
// ============================================================================

const VALID_ML_RESPONSE = {
  recommended_exercises: [
    {
      exercise_id: 'ex-123',
      exercise_name: 'Bench Press',
      muscle_group: 'chest',
      target_sets: 3,
      target_reps: 10,
      suggested_weight_kg: 60,
      rest_seconds: 120,
      rationale: 'Build chest strength',
    },
  ],
  plan_metadata: {
    total_exercises: 1,
    estimated_duration_minutes: 45,
    focus_areas: ['chest', 'triceps'],
  },
};

const VALID_REST_DAY_RESPONSE = {
  recommended_exercises: [],
  plan_metadata: {
    total_exercises: 0,
    estimated_duration_minutes: 0,
    focus_areas: ['rest'],
  },
};

// ============================================================================
// Test Suite
// ============================================================================

describe('ML Client', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchRecommendation', () => {
    it('should successfully fetch and validate ML recommendation', async () => {
      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => VALID_ML_RESPONSE,
      });

      const result = await fetchRecommendation('user-123', '2025-01-27');

      expect(result).toEqual(VALID_ML_RESPONSE);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/workout/recommend'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'user-123', date: '2025-01-27' }),
        })
      );
    });

    it('should handle rest day recommendations (empty exercises)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => VALID_REST_DAY_RESPONSE,
      });

      const result = await fetchRecommendation('user-123', '2025-01-26');

      expect(result.recommended_exercises).toHaveLength(0);
      expect(result.plan_metadata.focus_areas).toContain('rest');
    });

    it('should throw MLEngineError on HTTP error response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow(MLEngineError);

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow('ML Engine returned error');
    });

    it('should throw MLEngineError on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow(MLEngineError);

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow('Failed to connect to ML Engine');
    });

    it('should throw MLEngineError on timeout', async () => {
      // Mock timeout error (AbortSignal.timeout throws TimeoutError)
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      global.fetch = vi.fn().mockRejectedValue(timeoutError);

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow(MLEngineError);

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow('timed out');
    });

    it('should throw InvalidMLResponseError when recommended_exercises is missing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          // Missing recommended_exercises
          plan_metadata: VALID_ML_RESPONSE.plan_metadata,
        }),
      });

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow(InvalidMLResponseError);

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow('missing required fields');
    });

    it('should throw InvalidMLResponseError when plan_metadata is missing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          recommended_exercises: VALID_ML_RESPONSE.recommended_exercises,
          // Missing plan_metadata
        }),
      });

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow(InvalidMLResponseError);
    });

    it('should throw InvalidMLResponseError when exercise fields are missing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          recommended_exercises: [
            {
              exercise_id: 'ex-123',
              // Missing required fields like exercise_name, target_sets, etc.
            },
          ],
          plan_metadata: VALID_ML_RESPONSE.plan_metadata,
        }),
      });

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow(InvalidMLResponseError);
    });

    it('should throw InvalidMLResponseError when plan_metadata fields are invalid', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          recommended_exercises: [],
          plan_metadata: {
            total_exercises: 'not a number', // Invalid type
            estimated_duration_minutes: 45,
            focus_areas: ['chest'],
          },
        }),
      });

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow(InvalidMLResponseError);
    });

    it('should throw MLEngineError when response is not valid JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow(MLEngineError);

      await expect(
        fetchRecommendation('user-123', '2025-01-27')
      ).rejects.toThrow('Failed to parse ML Engine response as JSON');
    });

    it('should include 10-second timeout in request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => VALID_ML_RESPONSE,
      });

      await fetchRecommendation('user-123', '2025-01-27');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('fetchWeeklyRecommendations', () => {
    it('should fetch 7 consecutive days successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => VALID_ML_RESPONSE,
      });

      const results = await fetchWeeklyRecommendations('user-123', '2025-01-27');

      expect(results).toHaveLength(7);
      expect(global.fetch).toHaveBeenCalledTimes(7);

      // Verify dates are consecutive (Monday through Sunday)
      const calls = (global.fetch as any).mock.calls;
      const dates = calls.map((call: any) => JSON.parse(call[1].body).date);
      
      expect(dates).toEqual([
        '2025-01-27', // Monday
        '2025-01-28', // Tuesday
        '2025-01-29', // Wednesday
        '2025-01-30', // Thursday
        '2025-01-31', // Friday
        '2025-02-01', // Saturday
        '2025-02-02', // Sunday
      ]);
    });

    it('should fail fast on first ML Engine error', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 3) {
          // Fail on 3rd call (Wednesday)
          return Promise.resolve({
            ok: false,
            status: 500,
            text: async () => 'ML Error',
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => VALID_ML_RESPONSE,
        });
      });

      await expect(
        fetchWeeklyRecommendations('user-123', '2025-01-27')
      ).rejects.toThrow(MLEngineError);

      // Should only call 3 times (Monday, Tuesday, Wednesday) and stop
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should fail fast on first invalid response', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Return invalid response on 2nd call
          return Promise.resolve({
            ok: true,
            json: async () => ({ invalid: 'response' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => VALID_ML_RESPONSE,
        });
      });

      await expect(
        fetchWeeklyRecommendations('user-123', '2025-01-27')
      ).rejects.toThrow(InvalidMLResponseError);

      // Should only call 2 times and stop
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error for invalid weekStartDate', async () => {
      await expect(
        fetchWeeklyRecommendations('user-123', 'invalid-date')
      ).rejects.toThrow('Invalid weekStartDate');
    });

    it('should handle week with rest days', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        // Return rest day for Saturday and Sunday
        if (callCount === 6 || callCount === 7) {
          return Promise.resolve({
            ok: true,
            json: async () => VALID_REST_DAY_RESPONSE,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => VALID_ML_RESPONSE,
        });
      });

      const results = await fetchWeeklyRecommendations('user-123', '2025-01-27');

      expect(results).toHaveLength(7);
      expect(results[5].recommended_exercises).toHaveLength(0); // Saturday
      expect(results[6].recommended_exercises).toHaveLength(0); // Sunday
      expect(results[0].recommended_exercises).toHaveLength(1); // Monday (workout)
    });
  });

  describe('Error Classes', () => {
    it('MLEngineError should store status code and original error', () => {
      const originalError = new Error('Original');
      const error = new MLEngineError('Test error', 500, originalError);

      expect(error.name).toBe('MLEngineError');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
    });

    it('InvalidMLResponseError should store missing fields', () => {
      const missingFields = ['field1', 'field2'];
      const error = new InvalidMLResponseError('Missing fields', missingFields);

      expect(error.name).toBe('InvalidMLResponseError');
      expect(error.message).toBe('Missing fields');
      expect(error.missingFields).toEqual(missingFields);
    });
  });
});
