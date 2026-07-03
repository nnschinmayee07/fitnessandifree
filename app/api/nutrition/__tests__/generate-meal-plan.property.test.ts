/**
 * Property-based tests for POST /api/nutrition/generate-meal-plan
 *
 * **Validates: Requirements 7.2, 7.4, 7.5, 10.4**
 *
 * Property 10 — Claude prompt completeness:
 *   For any valid NutritionProfileRow and any remaining macros, the prompt
 *   string SHALL contain all 14 required fields.
 *
 * Property 11 — isValidMealSuggestions validator:
 *   Correct shape → true; wrong shape, wrong length, missing field → false.
 *
 * Property 12 (partial) — ANTHROPIC_API_KEY guard:
 *   Absent key + any valid userId → route SHALL return 500 with
 *   "ANTHROPIC_API_KEY not configured".
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { NutritionProfileRow } from '@/lib/types/nutrition-profile';
import type { MealSuggestion } from '@/lib/types/claude';

// ---------------------------------------------------------------------------
// Supabase mock — must be hoisted before the route import
// ---------------------------------------------------------------------------
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  })),
}));

import { POST } from '@/app/api/nutrition/generate-meal-plan/route';

// ---------------------------------------------------------------------------
// Local copies of the helpers under test
// (mirrors the route logic so we can test them in isolation)
// ---------------------------------------------------------------------------

/**
 * Mirrors the exact prompt template in route.ts.
 * Validates: Requirement 7.2 — all 14 profile + remaining-macro fields present.
 */
function buildMealPlanPrompt(
  profile: Pick<
    NutritionProfileRow,
    | 'age'
    | 'gender'
    | 'bmi'
    | 'bmi_category'
    | 'activity_level'
    | 'goal'
    | 'target_calories'
    | 'target_protein_g'
    | 'target_carbs_g'
    | 'target_fat_g'
  >,
  remaining: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  },
  mealTypeStr?: string,
): string {
  return `You are a personal nutrition assistant. Generate ${mealTypeStr ? '1' : '3 to 5'} meal suggestion${mealTypeStr ? '' : 's'} for a user with the following profile.

User profile:
- Age: ${profile.age}, Gender: ${profile.gender}
- BMI: ${profile.bmi} (${profile.bmi_category})
- Activity level: ${profile.activity_level}
- Goal: ${profile.goal}
- Daily targets: ${profile.target_calories} kcal, ${profile.target_protein_g}g protein, ${profile.target_carbs_g}g carbs, ${profile.target_fat_g}g fat

Today's remaining macros:
- Calories remaining: ${remaining.calories} kcal
- Protein remaining: ${remaining.protein_g}g
- Carbs remaining: ${remaining.carbs_g}g
- Fat remaining: ${remaining.fat_g}g
${mealTypeStr ? `\nGenerate a single ${mealTypeStr} suggestion that fits the remaining macros.` : ''}

Return only a JSON array. No markdown, no explanation, no code fences.
Each item must have exactly: meal_type (string), meal_name (string), description (string), items (string array), calories (number), protein_g (number), carbs_g (number), fat_g (number).
Suggest practical, realistic meals. All numeric values must be non-negative integers.`;
}

/**
 * Mirrors isValidMealSuggestions from route.ts.
 * Validates: Requirements 7.4, 7.5
 */
function isValidMealSuggestions(data: unknown): data is MealSuggestion[] {
  if (!Array.isArray(data) || data.length < 1 || data.length > 10) return false;
  return data.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const d = item as Record<string, unknown>;
    return (
      typeof d.meal_type === 'string' &&
      typeof d.meal_name === 'string' &&
      typeof d.description === 'string' &&
      Array.isArray(d.items) &&
      typeof d.calories === 'number' &&
      typeof d.protein_g === 'number' &&
      typeof d.carbs_g === 'number' &&
      typeof d.fat_g === 'number'
    );
  });
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonNegativeIntArb = fc.integer({ min: 0, max: 9999 });
const positiveIntArb = fc.integer({ min: 1, max: 9999 });

/** Generates a valid NutritionProfileRow-like profile (fields used in prompt) */
const profileArb = fc.record({
  age: fc.integer({ min: 10, max: 100 }),
  gender: fc.constantFrom('male', 'female', 'other') as fc.Arbitrary<
    'male' | 'female' | 'other'
  >,
  bmi: fc.float({ min: 10, max: 50, noNaN: true }),
  bmi_category: fc.constantFrom(
    'Underweight',
    'Normal',
    'Overweight',
    'Obese',
  ) as fc.Arbitrary<'Underweight' | 'Normal' | 'Overweight' | 'Obese'>,
  activity_level: fc.constantFrom(
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active',
  ) as fc.Arbitrary<
    | 'sedentary'
    | 'lightly_active'
    | 'moderately_active'
    | 'very_active'
    | 'extra_active'
  >,
  goal: fc.constantFrom('lose', 'maintain', 'gain') as fc.Arbitrary<
    'lose' | 'maintain' | 'gain'
  >,
  target_calories: positiveIntArb,
  target_protein_g: nonNegativeIntArb,
  target_carbs_g: nonNegativeIntArb,
  target_fat_g: nonNegativeIntArb,
});

/** Generates remaining macros (all clamped to >= 0) */
const remainingArb = fc.record({
  calories: nonNegativeIntArb,
  protein_g: nonNegativeIntArb,
  carbs_g: nonNegativeIntArb,
  fat_g: nonNegativeIntArb,
});

/** A valid MealSuggestion object */
const validSuggestionArb = fc.record({
  meal_type: fc.constantFrom('breakfast', 'lunch', 'dinner', 'snack'),
  meal_name: fc.string({ minLength: 1 }),
  description: fc.string({ minLength: 1 }),
  items: fc.array(fc.string({ minLength: 1 })),
  calories: nonNegativeIntArb,
  protein_g: nonNegativeIntArb,
  carbs_g: nonNegativeIntArb,
  fat_g: nonNegativeIntArb,
});

/** Generates a valid userId (non-empty, non-whitespace-only string) */
const validUserIdArb = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

// ---------------------------------------------------------------------------
// Property 10 — Claude prompt completeness
// Validates: Requirement 7.2
// ---------------------------------------------------------------------------

describe('Property 10 — Claude prompt completeness', () => {
  it('prompt contains all 14 required profile and remaining-macro fields for any valid profile + remaining macros', () => {
    fc.assert(
      fc.property(profileArb, remainingArb, (profile, remaining) => {
        const prompt = buildMealPlanPrompt(profile, remaining);

        // 10 profile fields
        expect(prompt).toContain(String(profile.age));
        expect(prompt).toContain(profile.gender);
        expect(prompt).toContain(String(profile.bmi));
        expect(prompt).toContain(profile.bmi_category);
        expect(prompt).toContain(profile.activity_level);
        expect(prompt).toContain(profile.goal);
        expect(prompt).toContain(String(profile.target_calories));
        expect(prompt).toContain(String(profile.target_protein_g));
        expect(prompt).toContain(String(profile.target_carbs_g));
        expect(prompt).toContain(String(profile.target_fat_g));

        // 4 remaining-macro fields
        expect(prompt).toContain(String(remaining.calories));
        expect(prompt).toContain(String(remaining.protein_g));
        expect(prompt).toContain(String(remaining.carbs_g));
        expect(prompt).toContain(String(remaining.fat_g));
      }),
      { numRuns: 100 },
    );
  });

  it('prompt contains all 14 fields when mealType is specified (single-suggestion mode)', () => {
    fc.assert(
      fc.property(
        profileArb,
        remainingArb,
        fc.constantFrom('breakfast', 'lunch', 'dinner', 'snack'),
        (profile, remaining, mealType) => {
          const prompt = buildMealPlanPrompt(profile, remaining, mealType);

          // Profile fields
          expect(prompt).toContain(String(profile.age));
          expect(prompt).toContain(profile.gender);
          expect(prompt).toContain(String(profile.bmi));
          expect(prompt).toContain(profile.bmi_category);
          expect(prompt).toContain(profile.activity_level);
          expect(prompt).toContain(profile.goal);
          expect(prompt).toContain(String(profile.target_calories));
          expect(prompt).toContain(String(profile.target_protein_g));
          expect(prompt).toContain(String(profile.target_carbs_g));
          expect(prompt).toContain(String(profile.target_fat_g));

          // Remaining-macro fields
          expect(prompt).toContain(String(remaining.calories));
          expect(prompt).toContain(String(remaining.protein_g));
          expect(prompt).toContain(String(remaining.carbs_g));
          expect(prompt).toContain(String(remaining.fat_g));

          // Single-suggestion phrasing present
          expect(prompt).toContain(mealType);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11 — isValidMealSuggestions validator
// Validates: Requirements 7.4, 7.5
// ---------------------------------------------------------------------------

describe('Property 11 — isValidMealSuggestions validator', () => {
  it('returns true for any valid array of 1–10 suggestions with all 8 required fields', () => {
    fc.assert(
      fc.property(
        fc.array(validSuggestionArb, { minLength: 1, maxLength: 10 }),
        (suggestions) => {
          expect(isValidMealSuggestions(suggestions)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false for an empty array (length 0)', () => {
    expect(isValidMealSuggestions([])).toBe(false);
  });

  it('returns false for any array with more than 10 items', () => {
    fc.assert(
      fc.property(
        fc.array(validSuggestionArb, { minLength: 11, maxLength: 25 }),
        (suggestions) => {
          expect(isValidMealSuggestions(suggestions)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when any item is missing a required field', () => {
    const requiredFields = [
      'meal_type',
      'meal_name',
      'description',
      'items',
      'calories',
      'protein_g',
      'carbs_g',
      'fat_g',
    ] as const;

    fc.assert(
      fc.property(
        validSuggestionArb,
        fc.constantFrom(...requiredFields),
        fc.array(validSuggestionArb, { maxLength: 4 }),
        (badItem, fieldToRemove, otherItems) => {
          const itemWithMissingField = { ...badItem } as Record<string, unknown>;
          delete itemWithMissingField[fieldToRemove];
          const suggestions = [...otherItems, itemWithMissingField];
          expect(isValidMealSuggestions(suggestions)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when a numeric field has wrong type (string)', () => {
    const numericFields = ['calories', 'protein_g', 'carbs_g', 'fat_g'] as const;
    fc.assert(
      fc.property(
        validSuggestionArb,
        fc.constantFrom(...numericFields),
        fc.string({ minLength: 1 }),
        fc.array(validSuggestionArb, { maxLength: 4 }),
        (baseItem, field, wrongValue, otherItems) => {
          const corrupted = { ...baseItem, [field]: wrongValue };
          expect(isValidMealSuggestions([...otherItems, corrupted])).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when a string field has wrong type (number)', () => {
    const stringFields = ['meal_type', 'meal_name', 'description'] as const;
    fc.assert(
      fc.property(
        validSuggestionArb,
        fc.constantFrom(...stringFields),
        nonNegativeIntArb,
        fc.array(validSuggestionArb, { maxLength: 4 }),
        (baseItem, field, wrongValue, otherItems) => {
          const corrupted = { ...baseItem, [field]: wrongValue };
          expect(isValidMealSuggestions([...otherItems, corrupted])).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when items field is not an array', () => {
    fc.assert(
      fc.property(
        validSuggestionArb,
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
        fc.array(validSuggestionArb, { maxLength: 4 }),
        (baseItem, wrongItems, otherItems) => {
          const corrupted = { ...baseItem, items: wrongItems };
          expect(isValidMealSuggestions([...otherItems, corrupted])).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false for non-array values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.record({ meal_type: fc.string() }),
        ),
        (nonArray) => {
          expect(isValidMealSuggestions(nonArray)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12 (partial) — ANTHROPIC_API_KEY guard
// Validates: Requirement 10.4
// ---------------------------------------------------------------------------

describe('Property 12 (partial) — ANTHROPIC_API_KEY guard', () => {
  const savedKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    // Ensure key is absent for all tests in this suite
    delete process.env.ANTHROPIC_API_KEY;
    process.env.SUPABASE_URL = 'http://test';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  });

  afterEach(() => {
    // Restore original key (may be undefined)
    if (savedKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = savedKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it('returns 500 with "ANTHROPIC_API_KEY not configured" for any valid userId when key is absent', async () => {
    await fc.assert(
      fc.asyncProperty(validUserIdArb, async (userId) => {
        const request = new Request(
          'http://localhost/api/nutrition/generate-meal-plan',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          },
        );

        const response = await POST(request);

        expect(response.status).toBe(500);
        const body = await response.text();
        expect(body).toBe('ANTHROPIC_API_KEY not configured');
      }),
      { numRuns: 100 },
    );
  });
});
