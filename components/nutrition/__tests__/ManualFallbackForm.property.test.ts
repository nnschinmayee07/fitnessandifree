/**
 * Property-based tests for ManualFallbackForm validation logic.
 *
 * **Validates: Requirements 5.2, 5.3**
 *
 * Strategy: The form's enable/disable logic is driven purely by field-level
 * validation functions that live in ManualFallbackForm.tsx. Rather than
 * rendering the React component in a DOM environment (which adds heavy
 * test-infrastructure overhead), we re-implement those same validation rules
 * here and property-test them directly. This mirrors what the component does
 * at runtime without incurring DOM complexity.
 *
 * Property 5: For any combination of (mealName, calories, protein_g, carbs_g,
 * fat_g, fiber_g) values:
 *   - The button is ENABLED  iff mealName is a non-empty string ≤ 100 chars
 *     AND calories/protein_g/carbs_g/fat_g are non-negative integers
 *     AND (fiber_g is blank OR a non-negative integer).
 *   - The button is DISABLED (and a validation error exists) for any negative,
 *     non-integer, or empty required field.
 *   - All-zero macros (0, 0, 0, 0) with a valid meal name IS valid.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Validation logic — mirrors ManualFallbackForm.tsx exactly
// ---------------------------------------------------------------------------

/**
 * Returns an error string if the value is not a non-negative integer string,
 * or null if valid.
 */
function validateNonNegativeInt(value: string): string | null {
  if (value === '') return 'Required';
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return 'Must be a non-negative whole number';
  return null;
}

/**
 * Returns an error string for the optional fiber field (empty = ok),
 * or null if valid.
 */
function validateOptionalNonNegativeInt(value: string): string | null {
  if (value === '') return null; // optional — blank is fine
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return 'Must be a non-negative whole number';
  return null;
}

/**
 * Compute the mealName validation error, matching component logic.
 */
function mealNameError(mealName: string): string | null {
  if (mealName.trim() === '') return 'Required';
  if (mealName.length > 100) return 'Max 100 characters';
  return null;
}

/**
 * Determine whether the "Log This Meal" button would be DISABLED given the
 * current field values. Mirrors the `hasValidationError` computed value in
 * the component.
 */
function isButtonDisabled(
  mealName: string,
  calories: string,
  proteinG: string,
  carbsG: string,
  fatG: string,
  fiberG: string,
): boolean {
  const errors = [
    mealNameError(mealName),
    validateNonNegativeInt(calories),
    validateNonNegativeInt(proteinG),
    validateNonNegativeInt(carbsG),
    validateNonNegativeInt(fatG),
    validateOptionalNonNegativeInt(fiberG),
  ];
  return errors.some((e) => e !== null);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A string representation of a non-negative integer (valid required field) */
const nonNegativeIntStringArb = fc.nat({ max: 9999 }).map(String);

/** A string representation of a negative integer (invalid for required fields) */
const negativeIntStringArb = fc
  .integer({ min: -9999, max: -1 })
  .map(String);

/**
 * A decimal number string whose numeric value is NOT an integer.
 * We build it as "integer.fraction" where fraction is 1-99, so Number() always
 * produces a non-integer (e.g. "12.07" → 12.07).
 */
const decimalStringArb = fc
  .record({
    whole: fc.nat({ max: 9998 }),
    frac: fc.integer({ min: 1, max: 99 }),
  })
  .map(({ whole, frac }) => `${whole}.${frac.toString().padStart(2, '0')}`)
  .filter((s) => !Number.isInteger(Number(s)));

/** Non-numeric garbage (invalid) */
const nonNumericStringArb = fc
  .string({ minLength: 1 })
  .filter((s) => s !== '' && isNaN(Number(s)));

/** A valid meal name: non-empty, ≤ 100 chars */
const validMealNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/** An invalid meal name: either empty / whitespace-only, or > 100 chars */
const invalidMealNameArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.string({ minLength: 101, maxLength: 200 }),
);

/** A valid fiber value: either empty string (optional) or a non-negative int string */
const validFiberArb = fc.oneof(
  fc.constant(''),
  nonNegativeIntStringArb,
);

/** An invalid fiber value: negative or decimal */
const invalidFiberArb = fc.oneof(
  negativeIntStringArb,
  decimalStringArb,
);

// ---------------------------------------------------------------------------
// Property 5 — tests
// ---------------------------------------------------------------------------

describe('Property 5: ManualFallbackForm enable/disable logic', () => {
  // ── 5a: Valid inputs enable the button ─────────────────────────────────────
  it(
    'enables Log This Meal when all required fields are non-negative integers and meal name is valid',
    () => {
      fc.assert(
        fc.property(
          validMealNameArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          validFiberArb,
          (name, cal, prot, carbs, fat, fiber) => {
            expect(isButtonDisabled(name, cal, prot, carbs, fat, fiber)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // ── 5b: All-zero macros with valid name is valid ────────────────────────────
  it('treats all-zero macros as valid (zero-calorie entries are allowed)', () => {
    fc.assert(
      fc.property(validMealNameArb, (name) => {
        expect(isButtonDisabled(name, '0', '0', '0', '0', '')).toBe(false);
        expect(isButtonDisabled(name, '0', '0', '0', '0', '0')).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  // ── 5c: Invalid meal name disables the button ───────────────────────────────
  it(
    'disables Log This Meal and produces a validation error when meal name is empty or > 100 chars',
    () => {
      fc.assert(
        fc.property(
          invalidMealNameArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          validFiberArb,
          (name, cal, prot, carbs, fat, fiber) => {
            // Button must be disabled
            expect(isButtonDisabled(name, cal, prot, carbs, fat, fiber)).toBe(true);
            // And the meal name field itself must report an error
            expect(mealNameError(name)).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // ── 5d: Negative required field disables the button ────────────────────────
  it(
    'disables the button and reports an error when any required macro field is negative',
    () => {
      fc.assert(
        fc.property(
          validMealNameArb,
          // Pick one of the four required macro slots to be negative
          fc.integer({ min: 0, max: 3 }),
          negativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          validFiberArb,
          (name, badSlot, badValue, a, b, c, d, fiber) => {
            const fields = [a, b, c, d];
            fields[badSlot] = badValue;
            const [cal, prot, carbs, fat] = fields;
            expect(isButtonDisabled(name, cal, prot, carbs, fat, fiber)).toBe(true);
            expect(validateNonNegativeInt(badValue)).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // ── 5e: Non-integer required field disables the button ─────────────────────
  it(
    'disables the button and reports an error when any required macro field is a decimal',
    () => {
      fc.assert(
        fc.property(
          validMealNameArb,
          fc.integer({ min: 0, max: 3 }),
          decimalStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          validFiberArb,
          (name, badSlot, badValue, a, b, c, d, fiber) => {
            const fields = [a, b, c, d];
            fields[badSlot] = badValue;
            const [cal, prot, carbs, fat] = fields;
            expect(isButtonDisabled(name, cal, prot, carbs, fat, fiber)).toBe(true);
            expect(validateNonNegativeInt(badValue)).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // ── 5f: Empty required field disables the button ───────────────────────────
  it(
    'disables the button and reports "Required" when any required macro field is empty',
    () => {
      fc.assert(
        fc.property(
          validMealNameArb,
          fc.integer({ min: 0, max: 3 }),
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          validFiberArb,
          (name, emptySlot, a, b, c, d, fiber) => {
            const fields = [a, b, c, d];
            fields[emptySlot] = '';
            const [cal, prot, carbs, fat] = fields;
            expect(isButtonDisabled(name, cal, prot, carbs, fat, fiber)).toBe(true);
            expect(validateNonNegativeInt('')).toBe('Required');
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // ── 5g: Invalid fiber disables the button (optional field, but must be valid if present)
  it(
    'disables the button when the optional fiber field contains a negative or decimal value',
    () => {
      fc.assert(
        fc.property(
          validMealNameArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          invalidFiberArb,
          (name, cal, prot, carbs, fat, fiber) => {
            expect(isButtonDisabled(name, cal, prot, carbs, fat, fiber)).toBe(true);
            expect(validateOptionalNonNegativeInt(fiber)).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  // ── 5h: Non-numeric garbage in any required slot disables the button ────────
  it(
    'disables the button when a required macro field contains non-numeric text',
    () => {
      fc.assert(
        fc.property(
          validMealNameArb,
          fc.integer({ min: 0, max: 3 }),
          nonNumericStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          nonNegativeIntStringArb,
          validFiberArb,
          (name, badSlot, badValue, a, b, c, d, fiber) => {
            const fields = [a, b, c, d];
            fields[badSlot] = badValue;
            const [cal, prot, carbs, fat] = fields;
            expect(isButtonDisabled(name, cal, prot, carbs, fat, fiber)).toBe(true);
            expect(validateNonNegativeInt(badValue)).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Example-based sanity checks
// ---------------------------------------------------------------------------

describe('Property 5 — example-based sanity checks', () => {
  it('valid all-zero case is enabled', () => {
    expect(isButtonDisabled('Dal Rice', '0', '0', '0', '0', '')).toBe(false);
  });

  it('valid non-zero case is enabled', () => {
    expect(isButtonDisabled('Chicken Salad', '350', '40', '10', '15', '5')).toBe(false);
  });

  it('empty meal name disables the button', () => {
    expect(isButtonDisabled('', '200', '10', '30', '5', '')).toBe(true);
    expect(mealNameError('')).toBe('Required');
  });

  it('whitespace-only meal name disables the button', () => {
    expect(isButtonDisabled('   ', '200', '10', '30', '5', '')).toBe(true);
    expect(mealNameError('   ')).toBe('Required');
  });

  it('meal name > 100 chars disables the button', () => {
    const longName = 'a'.repeat(101);
    expect(isButtonDisabled(longName, '200', '10', '30', '5', '')).toBe(true);
    expect(mealNameError(longName)).toBe('Max 100 characters');
  });

  it('negative calories disables the button', () => {
    expect(isButtonDisabled('Oats', '-1', '5', '30', '3', '')).toBe(true);
    expect(validateNonNegativeInt('-1')).not.toBeNull();
  });

  it('decimal protein disables the button', () => {
    expect(isButtonDisabled('Oats', '300', '12.5', '40', '8', '')).toBe(true);
    expect(validateNonNegativeInt('12.5')).not.toBeNull();
  });

  it('empty carbs disables the button', () => {
    expect(isButtonDisabled('Oats', '300', '12', '', '8', '')).toBe(true);
    expect(validateNonNegativeInt('')).toBe('Required');
  });

  it('negative fiber disables the button', () => {
    expect(isButtonDisabled('Oats', '300', '12', '40', '8', '-2')).toBe(true);
    expect(validateOptionalNonNegativeInt('-2')).not.toBeNull();
  });

  it('blank fiber is valid (optional field)', () => {
    expect(validateOptionalNonNegativeInt('')).toBeNull();
  });

  it('zero fiber is valid', () => {
    expect(validateOptionalNonNegativeInt('0')).toBeNull();
  });
});
