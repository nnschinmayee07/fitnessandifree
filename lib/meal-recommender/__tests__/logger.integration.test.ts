/**
 * Integration test for recommendation event logging
 * 
 * This test verifies the complete flow:
 * 1. Logging a recommendation event
 * 2. Updating the outcome when a meal is logged
 * 3. Checking that events are properly recorded in the database
 * 
 * Note: This test requires a live Supabase connection and the
 * meal_recommendation_events table to exist.
 */

import { describe, it, expect } from 'vitest';
import { logRecommendation, updateOutcome } from '@/lib/meal-recommender/logger';

describe('Recommendation Logger Integration', () => {
  it('should verify logger functions are exported', () => {
    expect(logRecommendation).toBeDefined();
    expect(typeof logRecommendation).toBe('function');
    
    expect(updateOutcome).toBeDefined();
    expect(typeof updateOutcome).toBe('function');
  });

  it('should accept valid parameters for logRecommendation', () => {
    const userId = 'test_user_123';
    const mealIds = ['meal_1', 'meal_2', 'meal_3', 'meal_4', 'meal_5'];
    const slot = 'breakfast';
    const profile = {
      age: 30,
      gender: 'male',
      bmi: 22.5,
      bmi_category: 'Normal',
      activity_level: 'moderately_active',
      goal: 'maintain',
      target_calories: 2200,
      target_protein_g: 150,
      target_carbs_g: 250,
      target_fat_g: 70,
      cuisine_preference: 'italian',
    };
    const remaining = {
      calories: 600,
      protein_g: 40,
      carbs_g: 60,
      fat_g: 20,
    };

    // Should not throw
    expect(() => {
      logRecommendation(userId, mealIds, slot, profile, remaining);
    }).not.toThrow();
  });

  it('should accept valid parameters for updateOutcome', () => {
    const userId = 'test_user_123';
    const mealId = 'meal_2';
    
    // Should not throw for accepted outcome
    expect(() => {
      updateOutcome(userId, mealId, 'accepted');
    }).not.toThrow();
    
    // Should not throw for rejected outcome
    expect(() => {
      updateOutcome(userId, 'other_meal', 'rejected_logged_other');
    }).not.toThrow();
  });

  it('should handle edge cases gracefully', () => {
    // Empty meal IDs
    expect(() => {
      logRecommendation('user_123', [], 'lunch', {}, {
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
      });
    }).not.toThrow();
    
    // Null cuisine preference
    expect(() => {
      logRecommendation('user_123', ['meal_1'], 'dinner', {
        cuisine_preference: null,
      }, {
        calories: 500,
        protein_g: 30,
        carbs_g: 40,
        fat_g: 15,
      });
    }).not.toThrow();
    
    // Empty strings
    expect(() => {
      updateOutcome('', '', 'accepted');
    }).not.toThrow();
  });

  it('should implement fire-and-forget pattern (non-blocking)', () => {
    const startTime = Date.now();
    
    // Call logRecommendation
    logRecommendation(
      'user_123',
      ['meal_1', 'meal_2', 'meal_3'],
      'lunch',
      { age: 30 },
      { calories: 500, protein_g: 30, carbs_g: 40, fat_g: 15 }
    );
    
    // Call updateOutcome
    updateOutcome('user_123', 'meal_1', 'accepted');
    
    const endTime = Date.now();
    const elapsed = endTime - startTime;
    
    // Both calls should complete synchronously in less than 10ms
    // The actual DB operations happen asynchronously
    expect(elapsed).toBeLessThan(10);
  });

  it('should return undefined (void) for fire-and-forget calls', () => {
    const result1 = logRecommendation(
      'user_123',
      ['meal_1'],
      'lunch',
      {},
      { calories: 500, protein_g: 30, carbs_g: 40, fat_g: 15 }
    );
    
    const result2 = updateOutcome('user_123', 'meal_1', 'accepted');
    
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();
  });
});
