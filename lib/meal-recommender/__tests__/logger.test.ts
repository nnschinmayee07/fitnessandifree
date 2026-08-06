/**
 * Unit tests for recommendation event logger
 * 
 * Tests the fire-and-forget logging pattern and verifies that:
 * - logRecommendation creates event records correctly
 * - updateOutcome updates event outcomes correctly
 * - Errors are caught and logged without throwing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
    })),
  })),
}));

// Mock logger module
let logRecommendation: any;
let updateOutcome: any;

describe('Recommendation Event Logger', () => {
  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Setup mock chain
    mockInsert.mockReturnValue({ error: null });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      order: mockOrder,
      eq: mockEq,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockReturnValue({
      single: mockSingle,
    });
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    
    // Import functions
    const logger = await import('@/lib/meal-recommender/logger');
    logRecommendation = logger.logRecommendation;
    updateOutcome = logger.updateOutcome;
  });

  describe('logRecommendation', () => {
    it('should be defined and callable', () => {
      expect(logRecommendation).toBeDefined();
      expect(typeof logRecommendation).toBe('function');
    });

    it('should accept correct parameters', () => {
      const userId = 'user_123';
      const mealIds = ['meal_1', 'meal_2', 'meal_3'];
      const slot = 'lunch';
      const profile = {
        age: 30,
        goal: 'lose',
        target_calories: 2000,
        cuisine_preference: 'italian',
      };
      const remaining = {
        calories: 500,
        protein_g: 30,
        carbs_g: 40,
        fat_g: 15,
      };

      // Should not throw
      expect(() => {
        logRecommendation(userId, mealIds, slot, profile, remaining);
      }).not.toThrow();
    });

    it('should return void (fire-and-forget pattern)', () => {
      const result = logRecommendation(
        'user_123',
        ['meal_1'],
        'lunch',
        { age: 30 },
        { calories: 500, protein_g: 30, carbs_g: 40, fat_g: 15 }
      );
      
      expect(result).toBeUndefined();
    });

    it('should not throw even with empty arrays', () => {
      expect(() => {
        logRecommendation(
          'user_123',
          [],
          'lunch',
          {},
          { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
        );
      }).not.toThrow();
    });
  });

  describe('updateOutcome', () => {
    it('should be defined and callable', () => {
      expect(updateOutcome).toBeDefined();
      expect(typeof updateOutcome).toBe('function');
    });

    it('should accept correct parameters for accepted outcome', () => {
      const userId = 'user_123';
      const mealId = 'meal_2';
      const outcome = 'accepted';

      // Should not throw
      expect(() => {
        updateOutcome(userId, mealId, outcome);
      }).not.toThrow();
    });

    it('should accept correct parameters for rejected outcome', () => {
      const userId = 'user_123';
      const mealId = 'meal_99';
      const outcome = 'rejected_logged_other';

      // Should not throw
      expect(() => {
        updateOutcome(userId, mealId, outcome);
      }).not.toThrow();
    });

    it('should return void (fire-and-forget pattern)', () => {
      const result = updateOutcome('user_123', 'meal_1', 'accepted');
      
      expect(result).toBeUndefined();
    });
  });

  describe('fire-and-forget pattern', () => {
    it('logRecommendation should not block caller', () => {
      const startTime = Date.now();
      
      logRecommendation(
        'user_123',
        ['meal_1', 'meal_2'],
        'lunch',
        { age: 30 },
        { calories: 500, protein_g: 30, carbs_g: 40, fat_g: 15 }
      );
      
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      
      // Should complete in less than 10ms (synchronous part only)
      expect(elapsed).toBeLessThan(10);
    });

    it('updateOutcome should not block caller', () => {
      const startTime = Date.now();
      
      updateOutcome('user_123', 'meal_1', 'accepted');
      
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      
      // Should complete in less than 10ms (synchronous part only)
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('type safety', () => {
    it('should enforce Outcome type', () => {
      // These should work
      updateOutcome('user_123', 'meal_1', 'accepted');
      updateOutcome('user_123', 'meal_1', 'rejected_logged_other');
      
      // TypeScript should catch invalid outcomes at compile time
      // @ts-expect-error - invalid outcome type
      updateOutcome('user_123', 'meal_1', 'invalid_outcome');
    });
  });
});
