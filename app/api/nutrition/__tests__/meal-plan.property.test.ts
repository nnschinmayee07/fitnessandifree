/**
 * Property-based tests for meal-plan response validator.
 * Validates: Requirements 8.4
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateMealSuggestions } from '@/app/api/nutrition/meal-plan/route';

const floatArb = fc.float({ min: Math.fround(0), max: Math.fround(5000), noNaN: true });

const validItemArb = fc.record({
  name: fc.string({ minLength: 1 }),
  calories: floatArb,
  protein_g: floatArb,
  carbs_g: floatArb,
  fat_g: floatArb,
  description: fc.string({ minLength: 1 }),
});

describe('Property 9: OpenAI response validator accepts valid and rejects invalid meal plan shapes', () => {
  it('returns true for any valid array of 1–10 meal suggestions', () => {
    fc.assert(
      fc.property(fc.array(validItemArb, { minLength: 1, maxLength: 10 }), (suggestions) => {
        expect(validateMealSuggestions(suggestions)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('returns false for empty array', () => {
    expect(validateMealSuggestions([])).toBe(false);
  });

  it('returns false for array with more than 10 items', () => {
    fc.assert(
      fc.property(fc.array(validItemArb, { minLength: 11, maxLength: 20 }), (suggestions) => {
        expect(validateMealSuggestions(suggestions)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });

  it('returns false when any item is missing a required field', () => {
    const requiredFields = ['name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'description'] as const;
    fc.assert(
      fc.property(
        validItemArb,
        fc.constantFrom(...requiredFields),
        fc.array(validItemArb, { maxLength: 4 }),
        (badItem, fieldToRemove, otherItems) => {
          const itemWithMissingField = { ...badItem };
          delete (itemWithMissingField as Record<string, unknown>)[fieldToRemove];
          const suggestions = [...otherItems, itemWithMissingField];
          expect(validateMealSuggestions(suggestions)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when a numeric field has wrong type (string)', () => {
    const numericFields = ['calories', 'protein_g', 'carbs_g', 'fat_g'] as const;
    fc.assert(
      fc.property(
        validItemArb,
        fc.constantFrom(...numericFields),
        fc.string({ minLength: 1 }),
        fc.array(validItemArb, { maxLength: 4 }),
        (baseItem, field, wrongValue, otherItems) => {
          const corrupted = { ...baseItem, [field]: wrongValue };
          expect(validateMealSuggestions([...otherItems, corrupted])).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when name or description has wrong type (number)', () => {
    const stringFields = ['name', 'description'] as const;
    fc.assert(
      fc.property(
        validItemArb,
        fc.constantFrom(...stringFields),
        floatArb,
        fc.array(validItemArb, { maxLength: 4 }),
        (baseItem, field, wrongValue, otherItems) => {
          const corrupted = { ...baseItem, [field]: wrongValue };
          expect(validateMealSuggestions([...otherItems, corrupted])).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false for non-array values', () => {
    const nonArrayArb = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.record({ name: fc.string() }),
    );
    fc.assert(
      fc.property(nonArrayArb, (nonArray) => {
        expect(validateMealSuggestions(nonArray)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
