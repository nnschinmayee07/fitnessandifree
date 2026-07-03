/**
 * Property-based tests for USDA food mapper and macro scaling.
 * Validates: Requirements 6.3, 6.6
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { mapUSDAFood, scaleMacros } from '@/app/api/nutrition/usda-search/route';

const NUTRITION_NUMBERS = ['208', '203', '204', '205', '291'];

const nonNutritionNumberArb = fc
  .stringMatching(/^[0-9]{1,3}$/)
  .filter((n) => !NUTRITION_NUMBERS.includes(n));

const nutrientValueArb = fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true });
const macroArb = fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true });
const portionArb = fc.float({ min: Math.fround(0.01), max: Math.fround(2000), noNaN: true });

describe('Property 6: USDA food mapper extracts correct nutrients for any API response shape', () => {
  it('extracts 208/203/204/205/291 regardless of order and extra entries', () => {
    const targetValuesArb = fc.record({
      '208': nutrientValueArb,
      '203': nutrientValueArb,
      '204': nutrientValueArb,
      '205': nutrientValueArb,
      '291': nutrientValueArb,
    });

    fc.assert(
      fc.property(
        targetValuesArb,
        fc.array(fc.record({ nutrientNumber: nonNutritionNumberArb, value: nutrientValueArb }), { maxLength: 10 }),
        (targets, extras) => {
          const targetEntries = Object.entries(targets).map(([num, val]) => ({
            nutrientNumber: num,
            value: val as number,
          }));
          // Combine and shuffle
          const all = [...targetEntries, ...extras];
          for (let i = all.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [all[i], all[j]] = [all[j], all[i]];
          }

          const food = mapUSDAFood({ fdcId: 1, description: 'Test', foodNutrients: all });
          expect(food.calories).toBeCloseTo(targets['208'] as number, 5);
          expect(food.protein_g).toBeCloseTo(targets['203'] as number, 5);
          expect(food.fat_g).toBeCloseTo(targets['204'] as number, 5);
          expect(food.carbs_g).toBeCloseTo(targets['205'] as number, 5);
          expect(food.fiber_g).toBeCloseTo(targets['291'] as number, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('defaults missing nutrients to 0', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ nutrientNumber: nonNutritionNumberArb, value: nutrientValueArb }), { maxLength: 10 }),
        (foodNutrients) => {
          const food = mapUSDAFood({ fdcId: 2, description: 'No Nutrition', foodNutrients });
          expect(food.calories).toBe(0);
          expect(food.protein_g).toBe(0);
          expect(food.fat_g).toBe(0);
          expect(food.carbs_g).toBe(0);
          expect(food.fiber_g).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 7: Macro scaling is proportional to portion size', () => {
  const foodArb = fc.record({
    fdcId: fc.integer({ min: 1, max: 999999 }),
    description: fc.string({ minLength: 1 }),
    calories: macroArb,
    protein_g: macroArb,
    fat_g: macroArb,
    carbs_g: macroArb,
    fiber_g: macroArb,
  });

  it('scales all macros by (portion_g / 100) rounded to 2dp', () => {
    fc.assert(
      fc.property(foodArb, portionArb, (food, portion_g) => {
        const scaled = scaleMacros(food, portion_g);
        const factor = portion_g / 100;
        const round2 = (v: number) => Math.round(v * 100) / 100;
        expect(scaled.calories).toBeCloseTo(round2(food.calories * factor), 5);
        expect(scaled.protein_g).toBeCloseTo(round2(food.protein_g * factor), 5);
        expect(scaled.fat_g).toBeCloseTo(round2(food.fat_g * factor), 5);
        expect(scaled.carbs_g).toBeCloseTo(round2(food.carbs_g * factor), 5);
        expect(scaled.fiber_g).toBeCloseTo(round2(food.fiber_g * factor), 5);
      }),
      { numRuns: 100 },
    );
  });

  it('scaleMacros(food, 100) reproduces original values', () => {
    fc.assert(
      fc.property(foodArb, (food) => {
        const scaled = scaleMacros(food, 100);
        // scaleMacros always rounds to 2dp, so we compare against round2(original)
        const round2 = (v: number) => Math.round(v * 100) / 100;
        expect(scaled.calories).toBeCloseTo(round2(food.calories), 5);
        expect(scaled.protein_g).toBeCloseTo(round2(food.protein_g), 5);
        expect(scaled.fat_g).toBeCloseTo(round2(food.fat_g), 5);
        expect(scaled.carbs_g).toBeCloseTo(round2(food.carbs_g), 5);
        expect(scaled.fiber_g).toBeCloseTo(round2(food.fiber_g), 5);
      }),
      { numRuns: 100 },
    );
  });
});
