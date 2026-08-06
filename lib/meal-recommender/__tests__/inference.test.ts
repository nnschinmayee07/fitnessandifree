/**
 * Unit tests for model loading, initialization, and ranking
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { 
  getModelState, 
  getFeatureSchema, 
  isModelReady,
  rankMeals,
  selectTop5,
  fallbackHeuristicRanking
} from '../inference';

describe('Model Loading', () => {
  let modelState: ReturnType<typeof getModelState>;
  let schema: ReturnType<typeof getFeatureSchema>;

  beforeAll(() => {
    // Give module initialization time to complete
    modelState = getModelState();
    schema = getFeatureSchema();
  });

  it('should load the feature schema', () => {
    expect(schema).not.toBeNull();
    expect(schema?.version).toBeDefined();
    expect(schema?.feature_count).toBe(7);
  });

  it('should have correct feature names in order', () => {
    expect(schema).not.toBeNull();
    
    const expectedFeatures = [
      'macro_delta_calories',
      'macro_delta_protein',
      'macro_delta_carbs',
      'macro_delta_fat',
      'cuisine_match',
      'meal_slot_match',
      'days_since_last_eaten'
    ];

    schema?.features.forEach((feature, index) => {
      expect(feature.name).toBe(expectedFeatures[index]);
    });
  });

  it('should have valid feature types', () => {
    expect(schema).not.toBeNull();
    
    schema?.features.forEach((feature) => {
      expect(['float', 'int']).toContain(feature.type);
      expect(feature.min).toBeGreaterThanOrEqual(0);
      expect(feature.max).toBeGreaterThan(feature.min);
    });
  });

  it('should load the model file', () => {
    expect(modelState.model).not.toBeNull();
    expect(modelState.isLoaded).toBe(true);
  });

  it('should not have load errors', () => {
    expect(modelState.loadError).toBeNull();
  });

  it('should not use fallback if model loaded successfully', () => {
    if (modelState.isLoaded) {
      expect(modelState.useFallback).toBe(false);
    }
  });

  it('should indicate model is ready', () => {
    expect(isModelReady()).toBe(true);
  });

  it('should have loaded a valid LightGBM model format', () => {
    expect(modelState.model).not.toBeNull();
    expect(modelState.model).toContain('tree');
    expect(modelState.model).toContain('num_class');
  });
});

describe('Feature Schema Validation', () => {
  it('should validate feature count', () => {
    const schema = getFeatureSchema();
    expect(schema?.feature_count).toBe(7);
    expect(schema?.features.length).toBe(7);
  });

  it('should have cuisine_match as binary feature', () => {
    const schema = getFeatureSchema();
    const cuisineMatch = schema?.features.find(f => f.name === 'cuisine_match');
    
    expect(cuisineMatch).toBeDefined();
    expect(cuisineMatch?.type).toBe('int');
    expect(cuisineMatch?.min).toBe(0);
    expect(cuisineMatch?.max).toBe(1);
  });

  it('should have meal_slot_match as binary feature', () => {
    const schema = getFeatureSchema();
    const mealSlotMatch = schema?.features.find(f => f.name === 'meal_slot_match');
    
    expect(mealSlotMatch).toBeDefined();
    expect(mealSlotMatch?.type).toBe('int');
    expect(mealSlotMatch?.min).toBe(0);
    expect(mealSlotMatch?.max).toBe(1);
  });

  it('should have days_since_last_eaten with max value of 999', () => {
    const schema = getFeatureSchema();
    const daysFeature = schema?.features.find(f => f.name === 'days_since_last_eaten');
    
    expect(daysFeature).toBeDefined();
    expect(daysFeature?.type).toBe('int');
    expect(daysFeature?.min).toBe(0);
    expect(daysFeature?.max).toBe(999);
  });

  it('should have macro delta features as floats', () => {
    const schema = getFeatureSchema();
    const macroFeatures = [
      'macro_delta_calories',
      'macro_delta_protein',
      'macro_delta_carbs',
      'macro_delta_fat'
    ];

    macroFeatures.forEach(featureName => {
      const feature = schema?.features.find(f => f.name === featureName);
      expect(feature).toBeDefined();
      expect(feature?.type).toBe('float');
      expect(feature?.min).toBe(0);
      expect(feature?.max).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Ranking and Selection Tests (Task 11)
// =============================================================================

describe('Ranking Functions', () => {
  // Mock meal data for testing
  const mockMeals = [
    {
      id: 'meal1',
      name: 'Greek Yogurt Bowl',
      cuisine_type: 'greek',
      meal_slot: 'breakfast',
      calories: 350,
      protein_g: 25,
      carbs_g: 40,
      fat_g: 8
    },
    {
      id: 'meal2',
      name: 'Chicken Burrito',
      cuisine_type: 'mexican',
      meal_slot: 'lunch',
      calories: 650,
      protein_g: 45,
      carbs_g: 70,
      fat_g: 20
    },
    {
      id: 'meal3',
      name: 'Salmon Salad',
      cuisine_type: 'american',
      meal_slot: 'lunch',
      calories: 450,
      protein_g: 35,
      carbs_g: 30,
      fat_g: 18
    },
    {
      id: 'meal4',
      name: 'Protein Smoothie',
      cuisine_type: 'american',
      meal_slot: 'snack',
      calories: 280,
      protein_g: 30,
      carbs_g: 25,
      fat_g: 6
    },
    {
      id: 'meal5',
      name: 'Beef Stir Fry',
      cuisine_type: 'chinese',
      meal_slot: 'dinner',
      calories: 550,
      protein_g: 40,
      carbs_g: 50,
      fat_g: 18
    },
    {
      id: 'meal6',
      name: 'Oatmeal with Berries',
      cuisine_type: 'american',
      meal_slot: 'breakfast',
      calories: 320,
      protein_g: 12,
      carbs_g: 55,
      fat_g: 7
    },
    {
      id: 'meal7',
      name: 'Tuna Sandwich',
      cuisine_type: 'american',
      meal_slot: 'lunch',
      calories: 400,
      protein_g: 30,
      carbs_g: 45,
      fat_g: 10
    }
  ];

  describe('rankMeals', () => {
    it('should sort meals by score in descending order', () => {
      const meals = mockMeals.slice(0, 4);
      const scores = [0.5, 0.9, 0.2, 0.7];
      
      const ranked = rankMeals(meals, scores);
      
      expect(ranked.length).toBe(4);
      expect(ranked[0].id).toBe('meal2'); // score 0.9
      expect(ranked[1].id).toBe('meal4'); // score 0.7
      expect(ranked[2].id).toBe('meal1'); // score 0.5
      expect(ranked[3].id).toBe('meal3'); // score 0.2
    });

    it('should handle negative scores correctly', () => {
      const meals = mockMeals.slice(0, 3);
      const scores = [-100, -50, -200];
      
      const ranked = rankMeals(meals, scores);
      
      expect(ranked[0].id).toBe('meal2'); // -50 (highest)
      expect(ranked[1].id).toBe('meal1'); // -100
      expect(ranked[2].id).toBe('meal3'); // -200 (lowest)
    });

    it('should handle equal scores', () => {
      const meals = mockMeals.slice(0, 3);
      const scores = [0.5, 0.5, 0.5];
      
      const ranked = rankMeals(meals, scores);
      
      expect(ranked.length).toBe(3);
      // Order should be stable (maintain original order for equal scores)
    });

    it('should throw error if array lengths mismatch', () => {
      const meals = mockMeals.slice(0, 3);
      const scores = [0.5, 0.7]; // Wrong length
      
      expect(() => rankMeals(meals, scores)).toThrow(/length mismatch/i);
    });

    it('should handle single meal', () => {
      const meals = [mockMeals[0]];
      const scores = [0.8];
      
      const ranked = rankMeals(meals, scores);
      
      expect(ranked.length).toBe(1);
      expect(ranked[0].id).toBe('meal1');
    });

    it('should handle empty arrays', () => {
      const ranked = rankMeals([], []);
      expect(ranked.length).toBe(0);
    });
  });

  describe('selectTop5', () => {
    it('should return first 5 meals from ranked list', () => {
      const ranked = mockMeals;
      const top5 = selectTop5(ranked);
      
      expect(top5.length).toBe(5);
      expect(top5[0].id).toBe('meal1');
      expect(top5[1].id).toBe('meal2');
      expect(top5[2].id).toBe('meal3');
      expect(top5[3].id).toBe('meal4');
      expect(top5[4].id).toBe('meal5');
    });

    it('should return all meals if fewer than 5', () => {
      const ranked = mockMeals.slice(0, 3);
      const top5 = selectTop5(ranked);
      
      expect(top5.length).toBe(3);
      expect(top5[0].id).toBe('meal1');
      expect(top5[1].id).toBe('meal2');
      expect(top5[2].id).toBe('meal3');
    });

    it('should return exactly 5 when more than 5 available', () => {
      const ranked = mockMeals; // 7 meals
      const top5 = selectTop5(ranked);
      
      expect(top5.length).toBe(5);
      // Should not include last 2 meals
      expect(top5.find(m => m.id === 'meal6')).toBeUndefined();
      expect(top5.find(m => m.id === 'meal7')).toBeUndefined();
    });

    it('should handle empty array', () => {
      const top5 = selectTop5([]);
      expect(top5.length).toBe(0);
    });

    it('should not mutate original array', () => {
      const ranked = [...mockMeals];
      const originalLength = ranked.length;
      
      selectTop5(ranked);
      
      expect(ranked.length).toBe(originalLength);
    });
  });

  describe('fallbackHeuristicRanking', () => {
    const mockRemaining = {
      calories: 500,
      protein_g: 35,
      carbs_g: 50,
      fat_g: 15
    };

    it('should compute negative Euclidean distance as score', () => {
      const meals = mockMeals.slice(0, 2);
      const scores = fallbackHeuristicRanking(meals, mockRemaining);
      
      expect(scores.length).toBe(2);
      // All scores should be negative (negative sqrt)
      scores.forEach(score => {
        expect(score).toBeLessThanOrEqual(0);
      });
    });

    it('should give higher score to better fitting meal', () => {
      // Meal that closely matches remaining macros
      const closeMatch = {
        id: 'close',
        name: 'Close Match',
        cuisine_type: 'test',
        meal_slot: 'lunch',
        calories: 490,  // delta: 10
        protein_g: 33,  // delta: 2
        carbs_g: 48,    // delta: 2
        fat_g: 14       // delta: 1
      };
      
      // Meal that poorly matches remaining macros
      const poorMatch = {
        id: 'poor',
        name: 'Poor Match',
        cuisine_type: 'test',
        meal_slot: 'lunch',
        calories: 800,  // delta: 300
        protein_g: 60,  // delta: 25
        carbs_g: 90,    // delta: 40
        fat_g: 30       // delta: 15
      };
      
      const meals = [closeMatch, poorMatch];
      const scores = fallbackHeuristicRanking(meals, mockRemaining);
      
      // Close match should have higher (less negative) score
      expect(scores[0]).toBeGreaterThan(scores[1]);
      
      // Close match score should be close to 0
      expect(scores[0]).toBeGreaterThan(-20);
      
      // Poor match score should be very negative
      expect(scores[1]).toBeLessThan(-300);
    });

    it('should return array of same length as input', () => {
      const meals = mockMeals;
      const scores = fallbackHeuristicRanking(meals, mockRemaining);
      
      expect(scores.length).toBe(meals.length);
    });

    it('should handle perfect match', () => {
      const perfectMatch = {
        id: 'perfect',
        name: 'Perfect Match',
        cuisine_type: 'test',
        meal_slot: 'lunch',
        calories: 500,
        protein_g: 35,
        carbs_g: 50,
        fat_g: 15
      };
      
      const scores = fallbackHeuristicRanking([perfectMatch], mockRemaining);
      
      // Perfect match should have score of 0 (no delta)
      // Note: -Math.sqrt(0) returns -0 in JavaScript, which is functionally equivalent to 0
      expect(Math.abs(scores[0])).toBe(0);
    });

    it('should handle meals with zero macros', () => {
      const zeroMeal = {
        id: 'zero',
        name: 'Zero Meal',
        cuisine_type: 'test',
        meal_slot: 'snack',
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0
      };
      
      const scores = fallbackHeuristicRanking([zeroMeal], mockRemaining);
      
      expect(scores.length).toBe(1);
      expect(scores[0]).toBeLessThan(0);
      expect(isFinite(scores[0])).toBe(true);
    });

    it('should produce consistent scores for same inputs', () => {
      const meals = mockMeals.slice(0, 3);
      
      const scores1 = fallbackHeuristicRanking(meals, mockRemaining);
      const scores2 = fallbackHeuristicRanking(meals, mockRemaining);
      
      expect(scores1).toEqual(scores2);
    });
  });
});

describe('Integration: Ranking Pipeline', () => {
  it('should rank and select top 5 from unordered meals', () => {
    const meals = [
      {
        id: 'meal1',
        name: 'Meal 1',
        cuisine_type: 'test',
        meal_slot: 'lunch',
        calories: 300,
        protein_g: 20,
        carbs_g: 30,
        fat_g: 10
      },
      {
        id: 'meal2',
        name: 'Meal 2',
        cuisine_type: 'test',
        meal_slot: 'lunch',
        calories: 400,
        protein_g: 25,
        carbs_g: 40,
        fat_g: 12
      },
      {
        id: 'meal3',
        name: 'Meal 3',
        cuisine_type: 'test',
        meal_slot: 'lunch',
        calories: 500,
        protein_g: 30,
        carbs_g: 50,
        fat_g: 15
      }
    ];
    
    const remaining = {
      calories: 450,
      protein_g: 30,
      carbs_g: 45,
      fat_g: 13
    };
    
    // Use fallback heuristic to compute scores
    const scores = fallbackHeuristicRanking(meals, remaining);
    
    // Rank meals
    const ranked = rankMeals(meals, scores);
    
    // Select top 5 (should return all 3)
    const top5 = selectTop5(ranked);
    
    expect(top5.length).toBe(3);
    // First meal should be the one closest to remaining macros (meal2 or meal3)
    expect(['meal2', 'meal3']).toContain(top5[0].id);
  });
});
