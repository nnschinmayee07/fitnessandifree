/**
 * Integration test for generateMealPlanForUser with LightGBM ranker
 * 
 * This test verifies that the LLM call has been successfully replaced with
 * the LightGBM ranking model and the function maintains its contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMealPlanForUser } from '@/lib/nutrition/meal-plan';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: null,
            error: null,
          })),
          single: vi.fn(() => ({
            data: {
              user_id: 'test-user',
              age: 30,
              gender: 'male',
              bmi: 25,
              bmi_category: 'normal',
              activity_level: 'moderate',
              goal: 'maintenance',
              target_calories: 2000,
              target_protein_g: 150,
              target_carbs_g: 225,
              target_fat_g: 55,
              cuisine_preference: 'italian',
            },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/meal-recommender/inference', () => ({
  rankMeals: vi.fn(async () => [
    {
      meal_type: 'breakfast',
      meal_name: 'Oatmeal with Berries',
      description: 'Healthy breakfast with oats and fresh berries',
      items: ['oats', 'blueberries', 'strawberries', 'honey'],
      calories: 350,
      protein_g: 12,
      carbs_g: 55,
      fat_g: 8,
    },
    {
      meal_type: 'breakfast',
      meal_name: 'Greek Yogurt Parfait',
      description: 'Protein-rich yogurt with granola',
      items: ['greek yogurt', 'granola', 'banana'],
      calories: 300,
      protein_g: 20,
      carbs_g: 40,
      fat_g: 6,
    },
  ]),
}));

describe('generateMealPlanForUser - LightGBM Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully call rankMeals and return meal suggestions', async () => {
    const result = await generateMealPlanForUser('test-user', {
      mealType: 'breakfast',
      profileData: {
        age: 30,
        gender: 'male',
        bmi: 25,
        bmi_category: 'normal',
        activity_level: 'moderate',
        goal: 'maintenance',
        target_calories: 2000,
        target_protein_g: 150,
        target_carbs_g: 225,
        target_fat_g: 55,
      },
      remainingMacros: {
        calories: 1500,
        protein_g: 100,
        carbs_g: 150,
        fat_g: 40,
      },
    });

    // Verify rankMeals was called (no LLM API calls)
    const { rankMeals } = await import('@/lib/meal-recommender/inference');
    expect(rankMeals).toHaveBeenCalledTimes(1);
    expect(rankMeals).toHaveBeenCalledWith(
      'test-user',
      'breakfast',
      expect.objectContaining({
        age: 30,
        target_calories: 2000,
      }),
      expect.objectContaining({
        calories: 1500,
        protein_g: 100,
      })
    );

    // Verify result format matches MealSuggestion[]
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    
    result.forEach((suggestion) => {
      expect(suggestion).toHaveProperty('meal_type');
      expect(suggestion).toHaveProperty('meal_name');
      expect(suggestion).toHaveProperty('description');
      expect(suggestion).toHaveProperty('items');
      expect(suggestion).toHaveProperty('calories');
      expect(suggestion).toHaveProperty('protein_g');
      expect(suggestion).toHaveProperty('carbs_g');
      expect(suggestion).toHaveProperty('fat_g');
      
      // Verify types
      expect(typeof suggestion.meal_type).toBe('string');
      expect(typeof suggestion.meal_name).toBe('string');
      expect(typeof suggestion.description).toBe('string');
      expect(Array.isArray(suggestion.items)).toBe(true);
      expect(typeof suggestion.calories).toBe('number');
      expect(typeof suggestion.protein_g).toBe('number');
      expect(typeof suggestion.carbs_g).toBe('number');
      expect(typeof suggestion.fat_g).toBe('number');
    });
  });

  it('should throw error when profile is not found', async () => {
    // Mock supabase to return null profile for this test
    const { createServerClient } = await import('@/lib/supabase/server');
    vi.mocked(createServerClient).mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
    } as any);

    // Test the error handling requirement
    await expect(
      generateMealPlanForUser('nonexistent-user', {})
    ).rejects.toThrow('User profile not found');
  });

  it('should accept same parameters as before (backward compatibility)', async () => {
    // Verify the function signature hasn't changed
    const result = await generateMealPlanForUser('test-user', {
      mealType: 'lunch',
      foodPreferences: ['vegetarian'],
      allergies: ['nuts'],
    });

    expect(result).toBeInstanceOf(Array);
  });
});
