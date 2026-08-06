/**
 * Unit tests for feature engineering functions
 * 
 * Tests verify that feature engineering produces correct outputs for known inputs,
 * ensuring consistency between training and inference.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeMacroDelta,
  computeCuisineMatch,
  computeMealSlotMatch,
  computeDaysSinceLastEaten,
  computeFeatures,
  validateFeatureVector,
  getFeatureSchema
} from '../inference';

describe('Feature Engineering - computeMacroDelta', () => {
  it('should compute absolute differences for all macros', () => {
    const meal = {
      id: 'meal_1',
      name: 'Oatmeal',
      cuisine_type: 'american',
      meal_slot: 'breakfast',
      calories: 400,
      protein_g: 15,
      carbs_g: 60,
      fat_g: 10
    };
    
    const remaining = {
      calories: 500,
      protein_g: 20,
      carbs_g: 70,
      fat_g: 15
    };
    
    const result = computeMacroDelta(meal, remaining);
    
    expect(result).toHaveLength(4);
    expect(result[0]).toBe(100); // |400 - 500|
    expect(result[1]).toBe(5);   // |15 - 20|
    expect(result[2]).toBe(10);  // |60 - 70|
    expect(result[3]).toBe(5);   // |10 - 15|
  });
  
  it('should handle meals exceeding remaining macros', () => {
    const meal = {
      id: 'meal_2',
      name: 'Large Steak',
      cuisine_type: 'american',
      meal_slot: 'dinner',
      calories: 800,
      protein_g: 60,
      carbs_g: 20,
      fat_g: 40
    };
    
    const remaining = {
      calories: 400,
      protein_g: 30,
      carbs_g: 40,
      fat_g: 15
    };
    
    const result = computeMacroDelta(meal, remaining);
    
    expect(result[0]).toBe(400); // |800 - 400| - overshooting
    expect(result[1]).toBe(30);  // |60 - 30| - overshooting
    expect(result[2]).toBe(20);  // |20 - 40| - undershooting
    expect(result[3]).toBe(25);  // |40 - 15| - overshooting
  });
  
  it('should handle zero remaining macros', () => {
    const meal = {
      id: 'meal_3',
      name: 'Snack',
      cuisine_type: 'american',
      meal_slot: 'snack',
      calories: 200,
      protein_g: 5,
      carbs_g: 30,
      fat_g: 8
    };
    
    const remaining = {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0
    };
    
    const result = computeMacroDelta(meal, remaining);
    
    expect(result[0]).toBe(200);
    expect(result[1]).toBe(5);
    expect(result[2]).toBe(30);
    expect(result[3]).toBe(8);
  });
});

describe('Feature Engineering - computeCuisineMatch', () => {
  const italianMeal = {
    id: 'meal_1',
    name: 'Pasta Carbonara',
    cuisine_type: 'italian',
    meal_slot: 'dinner',
    calories: 600,
    protein_g: 25,
    carbs_g: 70,
    fat_g: 20
  };
  
  it('should return 1 for matching cuisine (exact case)', () => {
    expect(computeCuisineMatch(italianMeal, 'italian')).toBe(1);
  });
  
  it('should return 1 for matching cuisine (case insensitive)', () => {
    expect(computeCuisineMatch(italianMeal, 'ITALIAN')).toBe(1);
    expect(computeCuisineMatch(italianMeal, 'Italian')).toBe(1);
  });
  
  it('should return 0 for non-matching cuisine', () => {
    expect(computeCuisineMatch(italianMeal, 'mexican')).toBe(0);
    expect(computeCuisineMatch(italianMeal, 'chinese')).toBe(0);
  });
  
  it('should return 0 when user has no preference (null)', () => {
    expect(computeCuisineMatch(italianMeal, null)).toBe(0);
  });
  
  it('should return 0 when user has no preference (undefined)', () => {
    expect(computeCuisineMatch(italianMeal, undefined)).toBe(0);
  });
  
  it('should return 0 when user has no preference (empty string)', () => {
    expect(computeCuisineMatch(italianMeal, '')).toBe(0);
  });
});

describe('Feature Engineering - computeMealSlotMatch', () => {
  const breakfastMeal = {
    id: 'meal_1',
    name: 'Pancakes',
    cuisine_type: 'american',
    meal_slot: 'breakfast',
    calories: 400,
    protein_g: 12,
    carbs_g: 60,
    fat_g: 10
  };
  
  it('should return 1 for matching meal slot (exact case)', () => {
    expect(computeMealSlotMatch(breakfastMeal, 'breakfast')).toBe(1);
  });
  
  it('should return 1 for matching meal slot (case insensitive)', () => {
    expect(computeMealSlotMatch(breakfastMeal, 'BREAKFAST')).toBe(1);
    expect(computeMealSlotMatch(breakfastMeal, 'Breakfast')).toBe(1);
  });
  
  it('should return 0 for non-matching meal slot', () => {
    expect(computeMealSlotMatch(breakfastMeal, 'lunch')).toBe(0);
    expect(computeMealSlotMatch(breakfastMeal, 'dinner')).toBe(0);
    expect(computeMealSlotMatch(breakfastMeal, 'snack')).toBe(0);
  });
});

describe('Feature Engineering - computeDaysSinceLastEaten', () => {
  it('should return 999 for never-eaten meals', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null })
    };
    
    const result = await computeDaysSinceLastEaten('Pizza', 'user_123', mockSupabase);
    
    expect(result).toBe(999);
    expect(mockSupabase.from).toHaveBeenCalledWith('meal_logs');
  });
  
  it('should calculate days since last eaten correctly', async () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ logged_at: fiveDaysAgo.toISOString() }],
        error: null
      })
    };
    
    const result = await computeDaysSinceLastEaten('Burger', 'user_123', mockSupabase);
    
    expect(result).toBe(5);
  });
  
  it('should return 0 for meals eaten today', async () => {
    const today = new Date();
    
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ logged_at: today.toISOString() }],
        error: null
      })
    };
    
    const result = await computeDaysSinceLastEaten('Salad', 'user_123', mockSupabase);
    
    expect(result).toBe(0);
  });
  
  it('should return 999 on database error', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })
    };
    
    const result = await computeDaysSinceLastEaten('Taco', 'user_123', mockSupabase);
    
    expect(result).toBe(999);
  });
});

describe('Feature Engineering - computeFeatures', () => {
  it('should return 7-element feature vector', async () => {
    const profile = {
      cuisine_preference: 'italian'
    };
    
    const meal = {
      id: 'meal_1',
      name: 'Pasta',
      cuisine_type: 'italian',
      meal_slot: 'lunch',
      calories: 500,
      protein_g: 20,
      carbs_g: 70,
      fat_g: 15
    };
    
    const remaining = {
      calories: 600,
      protein_g: 25,
      carbs_g: 80,
      fat_g: 20
    };
    
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null })
    };
    
    const result = await computeFeatures(
      profile,
      meal,
      remaining,
      'user_123',
      'lunch',
      mockSupabase
    );
    
    expect(result).toHaveLength(7);
    expect(result[0]).toBe(100);  // |500 - 600| calories delta
    expect(result[1]).toBe(5);    // |20 - 25| protein delta
    expect(result[2]).toBe(10);   // |70 - 80| carbs delta
    expect(result[3]).toBe(5);    // |15 - 20| fat delta
    expect(result[4]).toBe(1);    // cuisine match (italian = italian)
    expect(result[5]).toBe(1);    // meal slot match (lunch = lunch)
    expect(result[6]).toBe(999);  // never eaten
  });
  
  it('should handle meal with no matches', async () => {
    const profile = {
      cuisine_preference: 'italian'
    };
    
    const meal = {
      id: 'meal_2',
      name: 'Tacos',
      cuisine_type: 'mexican',
      meal_slot: 'dinner',
      calories: 700,
      protein_g: 35,
      carbs_g: 60,
      fat_g: 25
    };
    
    const remaining = {
      calories: 400,
      protein_g: 20,
      carbs_g: 50,
      fat_g: 15
    };
    
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null })
    };
    
    const result = await computeFeatures(
      profile,
      meal,
      remaining,
      'user_123',
      'breakfast',  // Requesting breakfast, meal is dinner
      mockSupabase
    );
    
    expect(result).toHaveLength(7);
    expect(result[0]).toBe(300);  // |700 - 400| calories delta (poor fit)
    expect(result[1]).toBe(15);   // |35 - 20| protein delta
    expect(result[2]).toBe(10);   // |60 - 50| carbs delta
    expect(result[3]).toBe(10);   // |25 - 15| fat delta
    expect(result[4]).toBe(0);    // cuisine mismatch (mexican ≠ italian)
    expect(result[5]).toBe(0);    // meal slot mismatch (dinner ≠ breakfast)
    expect(result[6]).toBe(999);  // never eaten
  });
  
  it('should integrate recency data correctly', async () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    const profile = {
      cuisine_preference: 'chinese'
    };
    
    const meal = {
      id: 'meal_3',
      name: 'Fried Rice',
      cuisine_type: 'chinese',
      meal_slot: 'dinner',
      calories: 550,
      protein_g: 22,
      carbs_g: 75,
      fat_g: 18
    };
    
    const remaining = {
      calories: 600,
      protein_g: 25,
      carbs_g: 80,
      fat_g: 20
    };
    
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ logged_at: tenDaysAgo.toISOString() }],
        error: null
      })
    };
    
    const result = await computeFeatures(
      profile,
      meal,
      remaining,
      'user_123',
      'dinner',
      mockSupabase
    );
    
    expect(result).toHaveLength(7);
    expect(result[6]).toBe(10);  // eaten 10 days ago (moderate variety)
  });
});

describe('Feature Engineering - validateFeatureVector', () => {
  const mockSchema = {
    version: '1.0',
    feature_count: 7,
    features: [
      { name: 'macro_delta_calories', type: 'float', min: 0, max: 2000 },
      { name: 'macro_delta_protein', type: 'float', min: 0, max: 200 },
      { name: 'macro_delta_carbs', type: 'float', min: 0, max: 300 },
      { name: 'macro_delta_fat', type: 'float', min: 0, max: 100 },
      { name: 'cuisine_match', type: 'int', min: 0, max: 1 },
      { name: 'meal_slot_match', type: 'int', min: 0, max: 1 },
      { name: 'days_since_last_eaten', type: 'int', min: 0, max: 999 }
    ]
  };
  
  it('should validate correct 7-element vector', () => {
    const features = [100, 10, 20, 5, 1, 1, 15];
    const result = validateFeatureVector(features, mockSchema);
    expect(result).toBe(true);
  });
  
  it('should reject vector with wrong length', () => {
    const features = [100, 10, 20, 5, 1, 1]; // Only 6 elements
    const result = validateFeatureVector(features, mockSchema);
    expect(result).toBe(false);
  });
  
  it('should reject vector with NaN values', () => {
    const features = [100, NaN, 20, 5, 1, 1, 15];
    const result = validateFeatureVector(features, mockSchema);
    expect(result).toBe(false);
  });
  
  it('should reject vector with Infinity values', () => {
    const features = [100, 10, Infinity, 5, 1, 1, 15];
    const result = validateFeatureVector(features, mockSchema);
    expect(result).toBe(false);
  });
  
  it('should reject vector with non-numeric values', () => {
    const features = [100, 10, 20, 5, 1, 1, '15' as any];
    const result = validateFeatureVector(features, mockSchema);
    expect(result).toBe(false);
  });
  
  it('should reject when schema is null', () => {
    const features = [100, 10, 20, 5, 1, 1, 15];
    const result = validateFeatureVector(features, null);
    expect(result).toBe(false);
  });
  
  it('should validate but warn for out-of-range values', () => {
    // This should pass validation but log a warning
    const features = [2500, 10, 20, 5, 1, 1, 15]; // calories delta > max
    const result = validateFeatureVector(features, mockSchema);
    expect(result).toBe(true); // Still valid, just outside expected range
  });
  
  it('should handle edge case values', () => {
    const features = [0, 0, 0, 0, 0, 0, 999]; // All at boundaries
    const result = validateFeatureVector(features, mockSchema);
    expect(result).toBe(true);
  });
});
