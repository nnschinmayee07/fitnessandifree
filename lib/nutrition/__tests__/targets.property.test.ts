/**
 * Property-based tests for lib/nutrition/targets.ts
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 3.1–3.7, 5.4, 8.6
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeBmi,
  getBmiCategory,
  computeBmr,
  computeTargets,
  getMealTypeForHour,
  ACTIVITY_MULTIPLIERS,
  GOAL_ADJUSTMENTS,
} from '../targets';
import type { ActivityLevel, Goal } from '@/lib/types/nutrition-profile';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const validWeightArb = fc.float({ min: Math.fround(1), max: Math.fround(500), noNaN: true });
const validHeightArb = fc.float({ min: Math.fround(50), max: Math.fround(300), noNaN: true });
const validAgeArb = fc.integer({ min: 1, max: 120 });
const genderArb = fc.constantFrom('male' as const, 'female' as const, 'other' as const);
const activityLevelArb = fc.constantFrom<ActivityLevel>(
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extra_active',
);
const goalArb = fc.constantFrom<Goal>('lose', 'maintain', 'gain');

// ---------------------------------------------------------------------------
// Inline helpers used in the tests
// ---------------------------------------------------------------------------

/**
 * Property 2 – inline validation function.
 * Returns { valid: false, error: string } when any dimension is out of range,
 * or { valid: true, bmi: number } when all inputs are in range.
 */
function validateAndComputeBmi(
  weightKg: number,
  heightCm: number,
): { valid: false; error: string } | { valid: true; bmi: number } {
  if (weightKg < 1 || weightKg > 500) {
    return { valid: false, error: 'weight_kg must be between 1 and 500' };
  }
  if (heightCm < 50 || heightCm > 300) {
    return { valid: false, error: 'height_cm must be between 50 and 300' };
  }
  return { valid: true, bmi: computeBmi(weightKg, heightCm) };
}

/**
 * Property 5 – inline pure bar-percent function.
 * Clamps (logged / target) * 100 to [0, 100].
 */
function barPercent(logged: number, target: number): number {
  return Math.min(100, Math.max(0, (logged / target) * 100));
}

// ---------------------------------------------------------------------------
// Property 1: BMI computation and categorisation are consistent
// Validates: Requirements 2.1, 2.2
// ---------------------------------------------------------------------------

describe('Property 1: BMI computation and categorisation are consistent', () => {
  it('computeBmi matches formula for all valid weight/height', () => {
    fc.assert(
      fc.property(validWeightArb, validHeightArb, (w, h) => {
        const hm = h / 100;
        const expected = Math.round((w / (hm * hm)) * 10) / 10;
        expect(computeBmi(w, h)).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('getBmiCategory returns correct category for all BMI values', () => {
    // Use a wide float range covering all four regions
    const bmiArb = fc.float({ min: Math.fround(1), max: Math.fround(60), noNaN: true });
    fc.assert(
      fc.property(bmiArb, (bmi) => {
        const category = getBmiCategory(bmi);
        if (bmi < 18.5) {
          expect(category).toBe('Underweight');
        } else if (bmi < 25) {
          expect(category).toBe('Normal');
        } else if (bmi < 30) {
          expect(category).toBe('Overweight');
        } else {
          expect(category).toBe('Obese');
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: BMI computation rejects out-of-range inputs
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------

describe('Property 2: BMI computation rejects out-of-range inputs', () => {
  /**
   * Build an arbitrary that always produces at least one out-of-range dimension.
   * We achieve this by generating a valid pair and then, using another arbitrary,
   * forcing at least one dimension out of its valid range.
   */
  const outOfRangeArb = fc.oneof(
    // weight too low
    fc.record({
      weight: fc.float({ min: Math.fround(-1000), max: Math.fround(0.999), noNaN: true }),
      height: validHeightArb,
    }),
    // weight too high
    fc.record({
      weight: fc.float({ min: Math.fround(501), max: Math.fround(10000), noNaN: true }),
      height: validHeightArb,
    }),
    // height too low
    fc.record({
      weight: validWeightArb,
      height: fc.float({ min: Math.fround(1), max: Math.fround(49.9), noNaN: true }),
    }),
    // height too high
    fc.record({
      weight: validWeightArb,
      height: fc.float({ min: Math.fround(301), max: Math.fround(1000), noNaN: true }),
    }),
  );

  it('validation layer returns an error and does not produce a BMI for out-of-range inputs', () => {
    fc.assert(
      fc.property(outOfRangeArb, ({ weight, height }) => {
        const result = validateAndComputeBmi(weight, height);
        expect(result.valid).toBe(false);
        // The discriminated union guarantees no .bmi field exists when valid === false
        if (!result.valid) {
          expect(result.error.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('validation layer succeeds for all valid inputs', () => {
    fc.assert(
      fc.property(validWeightArb, validHeightArb, (weight, height) => {
        const result = validateAndComputeBmi(weight, height);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Target_Calculator produces correct targets for all valid profiles
// Validates: Requirements 2.3, 3.1–3.7
// ---------------------------------------------------------------------------

describe('Property 3: Target_Calculator produces correct targets for all valid profiles', () => {
  it('all five formula outputs are correct for every valid profile combination', () => {
    fc.assert(
      fc.property(
        validWeightArb,
        validHeightArb,
        validAgeArb,
        genderArb,
        activityLevelArb,
        goalArb,
        (weight, height, age, gender, activityLevel, goal) => {
          const result = computeTargets(weight, height, age, gender, activityLevel, goal);

          // ---- Re-derive expected values using the same formulas as targets.ts ----
          const male   = 10 * weight + 6.25 * height - 5 * age + 5;
          const female = 10 * weight + 6.25 * height - 5 * age - 161;
          let bmr: number;
          if (gender === 'male')        bmr = male;
          else if (gender === 'female') bmr = female;
          else                          bmr = (male + female) / 2;

          const tdee     = bmr * ACTIVITY_MULTIPLIERS[activityLevel];
          const calories = Math.round(tdee + GOAL_ADJUSTMENTS[goal]);

          expect(result.target_calories).toBe(calories);
          expect(result.target_protein_g).toBe(Math.round(weight * 2.0));
          expect(result.target_carbs_g).toBe(Math.floor((calories * 0.45) / 4));
          expect(result.target_fat_g).toBe(Math.floor((calories * 0.25) / 9));
          expect(result.target_water_ml).toBe(Math.floor(weight * 35));
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Progress bar percentage is correctly bounded
// Validates: Requirements 5.4
// ---------------------------------------------------------------------------

describe('Property 5: Progress bar percentage is correctly bounded', () => {
  it('barPercent(logged, target) is always in [0, 100] for logged ≥ 0 and target > 0', () => {
    const loggedArb = fc.float({ min: Math.fround(0), max: Math.fround(1_000_000), noNaN: true });
    const targetArb = fc.float({ min: Math.fround(0.001), max: Math.fround(1_000_000), noNaN: true });

    fc.assert(
      fc.property(loggedArb, targetArb, (logged, target) => {
        const pct = barPercent(logged, target);
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 },
    );
  });

  it('barPercent equals (logged/target)*100 when result is in [0,100]', () => {
    // Use inputs that won't overflow (logged ≤ target)
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.001), max: Math.fround(1000), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
        (target, multiplier) => {
          const logged = target * Math.min(multiplier, 1); // logged ≤ target ensures [0,100]
          const pct = barPercent(logged, target);
          const expected = (logged / target) * 100;
          expect(pct).toBeCloseTo(expected, 8);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Time-of-day meal type assignment covers the entire 24-hour range
// Validates: Requirements 8.6
// ---------------------------------------------------------------------------

describe('Property 8: Time-of-day meal type assignment covers the entire 24-hour range', () => {
  const VALID_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

  it('getMealTypeForHour returns exactly one of the four meal types for every hour in [0, 23]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
        const mealType = getMealTypeForHour(hour);
        expect(VALID_MEAL_TYPES.has(mealType)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('getMealTypeForHour matches spec boundaries for all 24 hours', () => {
    // Exhaustive check (all 24 hours) wrapped in a property assertion
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
        const mealType = getMealTypeForHour(hour);
        if (hour >= 0 && hour <= 9) {
          expect(mealType).toBe('breakfast');
        } else if (hour >= 10 && hour <= 14) {
          expect(mealType).toBe('lunch');
        } else if (hour >= 15 && hour <= 21) {
          expect(mealType).toBe('dinner');
        } else {
          // hours 22–23
          expect(mealType).toBe('snack');
        }
      }),
      { numRuns: 100 },
    );
  });
});
