/**
 * Integration tests for complete feature engineering pipeline
 * 
 * These tests verify that computeFeatures correctly combines all individual
 * feature engineering functions into a complete 7-element feature vector.
 */

import {
  computeFeatures,
  validateFeatureVector,
  getFeatureSchema
} from '../inference';

// Mock Supabase client
const createMockSupabase = (mealLogs: any[] = []) => ({
  from: (table: string) => ({
    select: (fields: string) => ({
      eq: (field: string, value: any) => ({
        eq: (field2: string, value2: any) => ({
          order: (field: string, options: any) => ({
            limit: (count: number) => ({
              then: (resolve: any) => resolve({ data: mealLogs, error: null })
            })
          }),
          then: (resolve: any) => resolve({ data: mealLogs, error: null })
        })
      })
    })
  })
});

describe('Feature Engineering Integration', () => {
  const mockProfile = {
    cuisine_preference: 'italian'
  };

  const mockMeal = {
    id: 'meal_123',
    name: 'Pasta Carbonara',
    description: 'Creamy Italian pasta dish',
    cuisine_type: 'italian',
    meal_slot: 'dinner',
    calories: 650,
    protein_g: 30,
    carbs_g: 75,
    fat_g: 25,
    ingredients: ['pasta', 'eggs', 'bacon', 'parmesan']
  };

  const mockRemaining = {
    calories: 600,
    protein_g: 35,
    carbs_g: 70,
    fat_g: 20
  };

  it('should compute complete 7-feature vector for a meal never eaten', async () => {
    const mockSupabase = createMockSupabase([]);
    
    const features = await computeFeatures(
      mockProfile,
      mockMeal,
      mockRemaining,
      'user123',
      'dinner',
      mockSupabase
    );

    // Expected feature vector:
    // [0] macro_delta_calories: |650 - 600| = 50
    // [1] macro_delta_protein: |30 - 35| = 5
    // [2] macro_delta_carbs: |75 - 70| = 5
    // [3] macro_delta_fat: |25 - 20| = 5
    // [4] cuisine_match: 'italian' == 'italian' = 1
    // [5] meal_slot_match: 'dinner' == 'dinner' = 1
    // [6] days_since_last_eaten: never eaten = 999
    expect(features).toEqual([50, 5, 5, 5, 1, 1, 999]);
  });

  it('should compute features for recently eaten meal', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const mockSupabase = createMockSupabase([
      { logged_at: threeDaysAgo.toISOString() }
    ]);
    
    const features = await computeFeatures(
      mockProfile,
      mockMeal,
      mockRemaining,
      'user123',
      'dinner',
      mockSupabase
    );

    // Last feature should be ~3 days
    expect(features[0]).toBe(50);  // calories delta
    expect(features[1]).toBe(5);   // protein delta
    expect(features[2]).toBe(5);   // carbs delta
    expect(features[3]).toBe(5);   // fat delta
    expect(features[4]).toBe(1);   // cuisine match
    expect(features[5]).toBe(1);   // meal slot match
    expect(features[6]).toBeGreaterThanOrEqual(2); // days since (at least 2)
    expect(features[6]).toBeLessThanOrEqual(4);    // days since (at most 4)
  });

  it('should compute features when cuisine does not match', async () => {
    const mexicanMeal = {
      ...mockMeal,
      name: 'Tacos',
      cuisine_type: 'mexican'
    };
    
    const mockSupabase = createMockSupabase([]);
    
    const features = await computeFeatures(
      mockProfile,
      mexicanMeal,
      mockRemaining,
      'user123',
      'dinner',
      mockSupabase
    );

    // Cuisine match should be 0
    expect(features[4]).toBe(0);
    // Other features same as before
    expect(features[0]).toBe(50);
    expect(features[5]).toBe(1); // meal slot still matches
  });

  it('should compute features when meal slot does not match', async () => {
    const breakfastMeal = {
      ...mockMeal,
      name: 'Oatmeal',
      meal_slot: 'breakfast',
      calories: 300,
      protein_g: 10,
      carbs_g: 50,
      fat_g: 8
    };
    
    const mockSupabase = createMockSupabase([]);
    
    const features = await computeFeatures(
      mockProfile,
      breakfastMeal,
      mockRemaining,
      'user123',
      'dinner', // Requesting dinner but meal is breakfast
      mockSupabase
    );

    // Expected deltas for breakfast meal
    expect(features[0]).toBe(300); // |300 - 600|
    expect(features[1]).toBe(25);  // |10 - 35|
    expect(features[2]).toBe(20);  // |50 - 70|
    expect(features[3]).toBe(12);  // |8 - 20|
    expect(features[4]).toBe(1);   // cuisine still matches
    expect(features[5]).toBe(0);   // meal slot does NOT match
    expect(features[6]).toBe(999); // never eaten
  });

  it('should compute features when user has no cuisine preference', async () => {
    const profileNoPreference = {
      cuisine_preference: null
    };
    
    const mockSupabase = createMockSupabase([]);
    
    const features = await computeFeatures(
      profileNoPreference,
      mockMeal,
      mockRemaining,
      'user123',
      'dinner',
      mockSupabase
    );

    // Cuisine match should be 0 (no preference)
    expect(features[4]).toBe(0);
    // Other features unchanged
    expect(features[5]).toBe(1); // meal slot still matches
  });

  it('should produce valid feature vectors that pass schema validation', async () => {
    const mockSupabase = createMockSupabase([]);
    
    const features = await computeFeatures(
      mockProfile,
      mockMeal,
      mockRemaining,
      'user123',
      'dinner',
      mockSupabase
    );

    const schema = getFeatureSchema();
    const isValid = validateFeatureVector(features, schema);
    
    expect(isValid).toBe(true);
  });

  it('should handle multiple meal scenarios correctly', async () => {
    const mockSupabase = createMockSupabase([]);
    
    // Test different meal types
    const meals = [
      {
        id: 'm1',
        name: 'Breakfast Burrito',
        cuisine_type: 'mexican',
        meal_slot: 'breakfast',
        calories: 450,
        protein_g: 20,
        carbs_g: 45,
        fat_g: 18
      },
      {
        id: 'm2',
        name: 'Greek Salad',
        cuisine_type: 'greek',
        meal_slot: 'lunch',
        calories: 350,
        protein_g: 15,
        carbs_g: 30,
        fat_g: 15
      },
      {
        id: 'm3',
        name: 'Protein Shake',
        cuisine_type: 'american',
        meal_slot: 'snack',
        calories: 200,
        protein_g: 25,
        carbs_g: 15,
        fat_g: 5
      }
    ];

    for (const meal of meals) {
      const features = await computeFeatures(
        mockProfile,
        meal,
        mockRemaining,
        'user123',
        meal.meal_slot, // Request matching slot
        mockSupabase
      );

      // Verify feature vector structure
      expect(features).toHaveLength(7);
      
      // Verify all features are numbers
      features.forEach(feature => {
        expect(typeof feature).toBe('number');
        expect(isFinite(feature)).toBe(true);
      });

      // Verify meal slot matches (should be 1)
      expect(features[5]).toBe(1);
      
      // Verify cuisine match based on preference
      const expectedCuisineMatch = meal.cuisine_type === 'italian' ? 1 : 0;
      expect(features[4]).toBe(expectedCuisineMatch);
    }
  });

  it('should handle edge case: perfect macro match', async () => {
    const perfectMeal = {
      id: 'perfect',
      name: 'Perfect Meal',
      cuisine_type: 'italian',
      meal_slot: 'dinner',
      calories: mockRemaining.calories,
      protein_g: mockRemaining.protein_g,
      carbs_g: mockRemaining.carbs_g,
      fat_g: mockRemaining.fat_g
    };

    const mockSupabase = createMockSupabase([]);
    
    const features = await computeFeatures(
      mockProfile,
      perfectMeal,
      mockRemaining,
      'user123',
      'dinner',
      mockSupabase
    );

    // All macro deltas should be 0
    expect(features[0]).toBe(0); // calories
    expect(features[1]).toBe(0); // protein
    expect(features[2]).toBe(0); // carbs
    expect(features[3]).toBe(0); // fat
    // Matches should be 1
    expect(features[4]).toBe(1); // cuisine
    expect(features[5]).toBe(1); // meal slot
    // Never eaten
    expect(features[6]).toBe(999);
  });

  it('should handle database errors gracefully', async () => {
    // Mock Supabase that returns an error
    const mockSupabaseWithError = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ 
                  data: null, 
                  error: new Error('Database connection failed') 
                })
              })
            })
          })
        })
      })
    };

    const features = await computeFeatures(
      mockProfile,
      mockMeal,
      mockRemaining,
      'user123',
      'dinner',
      mockSupabaseWithError
    );

    // Should default to 999 for days_since_last_eaten on error
    expect(features[6]).toBe(999);
    // Other features should still be computed correctly
    expect(features[0]).toBe(50);
    expect(features[4]).toBe(1);
    expect(features[5]).toBe(1);
  });
});
