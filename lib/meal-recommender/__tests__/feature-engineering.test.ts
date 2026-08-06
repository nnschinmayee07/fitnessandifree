/**
 * Unit tests for feature engineering functions
 * 
 * These tests verify that feature engineering produces correct outputs for known inputs
 * and matches the expected schema defined in the design document.
 */

import {
  computeMacroDelta,
  computeCuisineMatch,
  computeMealSlotMatch,
  validateFeatureVector,
  getFeatureSchema
} from '../inference';

describe('Feature Engineering for Inference', () => {
  describe('computeMacroDelta', () => {
    it('should compute absolute differences for all macros', () => {
      const meal = {
        id: 'meal1',
        name: 'Test Meal',
        cuisine_type: 'italian',
        meal_slot: 'breakfast',
        calories: 500,
        protein_g: 30,
        carbs_g: 50,
        fat_g: 15
      };

      const remaining = {
        calories: 400,
        protein_g: 25,
        carbs_g: 45,
        fat_g: 20
      };

      const result = computeMacroDelta(meal, remaining);

      expect(result).toEqual([
        100, // |500 - 400| = 100 calories
        5,   // |30 - 25| = 5 protein
        5,   // |50 - 45| = 5 carbs
        5    // |15 - 20| = 5 fat
      ]);
    });

    it('should handle negative deltas (meal < remaining)', () => {
      const meal = {
        id: 'meal2',
        name: 'Light Snack',
        cuisine_type: 'american',
        meal_slot: 'snack',
        calories: 200,
        protein_g: 10,
        carbs_g: 20,
        fat_g: 5
      };

      const remaining = {
        calories: 600,
        protein_g: 40,
        carbs_g: 60,
        fat_g: 25
      };

      const result = computeMacroDelta(meal, remaining);

      // Should be absolute values
      expect(result).toEqual([
        400, // |200 - 600| = 400
        30,  // |10 - 40| = 30
        40,  // |20 - 60| = 40
        20   // |5 - 25| = 20
      ]);
    });

    it('should handle zero deltas (perfect match)', () => {
      const meal = {
        id: 'meal3',
        name: 'Perfect Meal',
        cuisine_type: 'italian',
        meal_slot: 'lunch',
        calories: 500,
        protein_g: 30,
        carbs_g: 50,
        fat_g: 15
      };

      const remaining = {
        calories: 500,
        protein_g: 30,
        carbs_g: 50,
        fat_g: 15
      };

      const result = computeMacroDelta(meal, remaining);

      expect(result).toEqual([0, 0, 0, 0]);
    });
  });

  describe('computeCuisineMatch', () => {
    const meal = {
      id: 'meal1',
      name: 'Pasta Carbonara',
      cuisine_type: 'italian',
      meal_slot: 'dinner',
      calories: 600,
      protein_g: 25,
      carbs_g: 70,
      fat_g: 20
    };

    it('should return 1 when cuisines match', () => {
      const result = computeCuisineMatch(meal, 'italian');
      expect(result).toBe(1);
    });

    it('should return 0 when cuisines do not match', () => {
      const result = computeCuisineMatch(meal, 'mexican');
      expect(result).toBe(0);
    });

    it('should return 0 when user has no preference (null)', () => {
      const result = computeCuisineMatch(meal, null);
      expect(result).toBe(0);
    });

    it('should return 0 when user has no preference (undefined)', () => {
      const result = computeCuisineMatch(meal, undefined);
      expect(result).toBe(0);
    });

    it('should be case-insensitive', () => {
      expect(computeCuisineMatch(meal, 'ITALIAN')).toBe(1);
      expect(computeCuisineMatch(meal, 'Italian')).toBe(1);
      expect(computeCuisineMatch(meal, 'iTaLiAn')).toBe(1);
    });
  });

  describe('computeMealSlotMatch', () => {
    const breakfastMeal = {
      id: 'meal1',
      name: 'Oatmeal',
      cuisine_type: 'american',
      meal_slot: 'breakfast',
      calories: 300,
      protein_g: 10,
      carbs_g: 50,
      fat_g: 8
    };

    it('should return 1 when meal slots match', () => {
      const result = computeMealSlotMatch(breakfastMeal, 'breakfast');
      expect(result).toBe(1);
    });

    it('should return 0 when meal slots do not match', () => {
      const result = computeMealSlotMatch(breakfastMeal, 'dinner');
      expect(result).toBe(0);
    });

    it('should be case-insensitive', () => {
      expect(computeMealSlotMatch(breakfastMeal, 'BREAKFAST')).toBe(1);
      expect(computeMealSlotMatch(breakfastMeal, 'Breakfast')).toBe(1);
      expect(computeMealSlotMatch(breakfastMeal, 'bReAkFaSt')).toBe(1);
    });

    it('should handle all meal slot types', () => {
      const slots = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      slots.forEach(slot => {
        const meal = {
          id: 'test',
          name: 'Test',
          cuisine_type: 'test',
          meal_slot: slot,
          calories: 400,
          protein_g: 20,
          carbs_g: 40,
          fat_g: 10
        };
        
        expect(computeMealSlotMatch(meal, slot)).toBe(1);
        expect(computeMealSlotMatch(meal, 'other')).toBe(0);
      });
    });
  });

  describe('validateFeatureVector', () => {
    const validSchema = {
      version: '1.0',
      feature_count: 7,
      features: [
        { name: 'macro_delta_calories', type: 'float', min: 0, max: 3000 },
        { name: 'macro_delta_protein', type: 'float', min: 0, max: 200 },
        { name: 'macro_delta_carbs', type: 'float', min: 0, max: 300 },
        { name: 'macro_delta_fat', type: 'float', min: 0, max: 150 },
        { name: 'cuisine_match', type: 'binary', min: 0, max: 1 },
        { name: 'meal_slot_match', type: 'binary', min: 0, max: 1 },
        { name: 'days_since_last_eaten', type: 'float', min: 0, max: 999 }
      ]
    };

    it('should return true for valid feature vector', () => {
      const features = [100, 10, 15, 5, 1, 1, 30];
      const result = validateFeatureVector(features, validSchema);
      expect(result).toBe(true);
    });

    it('should return false when schema is null', () => {
      const features = [100, 10, 15, 5, 1, 1, 30];
      const result = validateFeatureVector(features, null);
      expect(result).toBe(false);
    });

    it('should return false when feature count is wrong', () => {
      const features = [100, 10, 15, 5, 1]; // Only 5 features instead of 7
      const result = validateFeatureVector(features, validSchema);
      expect(result).toBe(false);
    });

    it('should return false when feature contains NaN', () => {
      const features = [100, NaN, 15, 5, 1, 1, 30];
      const result = validateFeatureVector(features, validSchema);
      expect(result).toBe(false);
    });

    it('should return false when feature contains Infinity', () => {
      const features = [100, Infinity, 15, 5, 1, 1, 30];
      const result = validateFeatureVector(features, validSchema);
      expect(result).toBe(false);
    });

    it('should return false when feature is not a number', () => {
      const features = [100, '10' as any, 15, 5, 1, 1, 30];
      const result = validateFeatureVector(features, validSchema);
      expect(result).toBe(false);
    });

    it('should return true even when values are out of expected range (soft check)', () => {
      // Values outside expected range should log warning but not fail validation
      const features = [5000, 300, 500, 200, 1, 0, 1200]; // All out of range
      const result = validateFeatureVector(features, validSchema);
      // Should still pass - range checking is a soft warning
      expect(result).toBe(true);
    });
  });
});
