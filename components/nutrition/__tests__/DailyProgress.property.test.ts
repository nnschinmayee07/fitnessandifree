/**
 * Property-based tests for DailyProgress macro totals computation.
 * Validates: Requirements 5.3, 10.6
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeTotals } from '@/components/nutrition/DailyProgress';
import type { MealLogRow } from '@/lib/types/meal-log';

const macroValueArb = fc.oneof(
  fc.float({ min: Math.fround(0), max: Math.fround(5000), noNaN: true }),
  fc.constant(null),
);

const mealLogRowArb: fc.Arbitrary<MealLogRow> = fc.record({
  id: fc.uuid(),
  user_id: fc.string({ minLength: 1 }),
  logged_at: fc.string({ minLength: 1 }),
  meal_name: fc.option(fc.string(), { nil: null }),
  confidence: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }), { nil: null }),
  calories: macroValueArb,
  protein_g: macroValueArb,
  carbs_g: macroValueArb,
  fat_g: macroValueArb,
  fiber_g: macroValueArb,
  image_url: fc.option(fc.string(), { nil: null }),
  meal_type: fc.option(fc.constantFrom('breakfast' as const, 'lunch' as const, 'dinner' as const, 'snack' as const), { nil: null }),
  source: fc.option(fc.constantFrom('photo' as const, 'manual' as const, 'plan' as const), { nil: null }),
  date: fc.option(fc.string(), { nil: null }),
  food_name: fc.option(fc.string(), { nil: null }),
});

describe('Property 4: Macro totals computation is correct for any collection of meal log rows', () => {
  it('computeTotals equals arithmetic sum of each field across all rows', () => {
    fc.assert(
      fc.property(fc.array(mealLogRowArb, { minLength: 1, maxLength: 20 }), (rows) => {
        const result = computeTotals(rows);
        const expectedCalories = rows.reduce((sum, r) => sum + (r.calories ?? 0), 0);
        const expectedProtein  = rows.reduce((sum, r) => sum + (r.protein_g ?? 0), 0);
        const expectedCarbs    = rows.reduce((sum, r) => sum + (r.carbs_g ?? 0), 0);
        const expectedFat      = rows.reduce((sum, r) => sum + (r.fat_g ?? 0), 0);
        expect(result.calories).toBeCloseTo(expectedCalories, 5);
        expect(result.protein_g).toBeCloseTo(expectedProtein, 5);
        expect(result.carbs_g).toBeCloseTo(expectedCarbs, 5);
        expect(result.fat_g).toBeCloseTo(expectedFat, 5);
      }),
      { numRuns: 100 },
    );
  });

  it('computeTotals returns all-zero totals for an empty array', () => {
    const result = computeTotals([]);
    expect(result.calories).toBe(0);
    expect(result.protein_g).toBe(0);
    expect(result.carbs_g).toBe(0);
    expect(result.fat_g).toBe(0);
  });

  it('computeTotals treats null macro values as 0', () => {
    fc.assert(
      fc.property(fc.array(mealLogRowArb, { minLength: 1, maxLength: 10 }), (rows) => {
        const rowsWithNulls = rows.map((r) => ({ ...r, calories: null, protein_g: null, carbs_g: null, fat_g: null }));
        const result = computeTotals(rowsWithNulls);
        expect(result.calories).toBe(0);
        expect(result.protein_g).toBe(0);
        expect(result.carbs_g).toBe(0);
        expect(result.fat_g).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});
