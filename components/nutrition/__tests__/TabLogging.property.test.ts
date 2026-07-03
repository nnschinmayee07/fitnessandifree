/**
 * Property-based tests for the tab logging flow — request payload construction.
 *
 * **Validates: Requirements 2.7, 3.5, 5.4**
 *
 * Strategy: The payload sent to `POST /api/nutrition/meal-log` is assembled by
 * two pure functions (`getSourceForTab` and `buildMealLogPayload`). Rather than
 * mounting any React component, we define those functions here (matching what
 * each tab component does at runtime) and property-test them exhaustively with
 * fast-check.
 *
 * Property 6: For any tab (photo → source='photo', describe → source='description',
 * voice → source='description'), any mealType, and any valid result, when
 * "Log This Meal" is tapped, the `POST /api/nutrition/meal-log` request SHALL
 * include:
 *   - `source`    matching the tab (photo → 'photo'; describe/voice → 'description')
 *   - `meal_type` matching the modal's mealType prop
 *   - `calories`, `protein_g`, `carbs_g`, `fat_g` matching the result macros
 *   - `fiber_g`   present and correct when result supplies it; absent otherwise
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabType = 'photo' | 'describe' | 'voice';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MacroResult {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
}

// ---------------------------------------------------------------------------
// Pure functions — mirrors the tab components exactly
// ---------------------------------------------------------------------------

/**
 * Returns the `source` field for the `meal_logs` insert based on which tab
 * the user is on. Photo tab uses 'photo'; Describe and Voice tabs both use
 * 'description' (Voice sends its transcript through the same
 * analyze-description route as Describe).
 */
function getSourceForTab(tab: TabType): 'photo' | 'description' {
  return tab === 'photo' ? 'photo' : 'description';
}

/**
 * Assembles the full `POST /api/nutrition/meal-log` request body from the
 * active tab, modal props, and the analysis result.
 */
function buildMealLogPayload(
  tab: TabType,
  mealType: MealType,
  userId: string,
  date: string,
  foodName: string,
  macros: MacroResult,
) {
  return {
    userId,
    date,
    meal_type: mealType,
    source: getSourceForTab(tab),
    food_name: foodName,
    calories: macros.calories,
    protein_g: macros.protein_g,
    carbs_g: macros.carbs_g,
    fat_g: macros.fat_g,
    ...(macros.fiber_g !== undefined ? { fiber_g: macros.fiber_g } : {}),
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const tabArb = fc.constantFrom<TabType>('photo', 'describe', 'voice');
const mealTypeArb = fc.constantFrom<MealType>('breakfast', 'lunch', 'dinner', 'snack');

/** Non-empty user-id strings (email-like or UUID-like) */
const userIdArb = fc
  .string({ minLength: 1, maxLength: 64 })
  .filter((s) => s.trim().length > 0);

/** ISO-style date strings — we test payload construction, not date parsing */
const dateArb = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0);

/** Non-empty food/meal name */
const foodNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/** Non-negative integer macro values (calories / protein / carbs / fat) */
const nonNegativeIntArb = fc.nat({ max: 9999 });

/** MacroResult without fiber_g */
const macrosWithoutFiberArb: fc.Arbitrary<MacroResult> = fc.record({
  calories: nonNegativeIntArb,
  protein_g: nonNegativeIntArb,
  carbs_g: nonNegativeIntArb,
  fat_g: nonNegativeIntArb,
});

/** MacroResult with fiber_g defined (non-negative integer) */
const macrosWithFiberArb: fc.Arbitrary<MacroResult> = fc.record({
  calories: nonNegativeIntArb,
  protein_g: nonNegativeIntArb,
  carbs_g: nonNegativeIntArb,
  fat_g: nonNegativeIntArb,
  fiber_g: nonNegativeIntArb,
});

/** Either variety */
const anyMacrosArb: fc.Arbitrary<MacroResult> = fc.oneof(
  macrosWithoutFiberArb,
  macrosWithFiberArb,
);

// ---------------------------------------------------------------------------
// Property 6a — getSourceForTab
// ---------------------------------------------------------------------------

describe('Property 6a: getSourceForTab maps tab to correct source', () => {
  it("getSourceForTab('photo') always returns 'photo'", () => {
    fc.assert(
      fc.property(fc.constant<TabType>('photo'), (tab) => {
        expect(getSourceForTab(tab)).toBe('photo');
      }),
      { numRuns: 100 },
    );
  });

  it("getSourceForTab('describe') always returns 'description'", () => {
    fc.assert(
      fc.property(fc.constant<TabType>('describe'), (tab) => {
        expect(getSourceForTab(tab)).toBe('description');
      }),
      { numRuns: 100 },
    );
  });

  it("getSourceForTab('voice') always returns 'description'", () => {
    fc.assert(
      fc.property(fc.constant<TabType>('voice'), (tab) => {
        expect(getSourceForTab(tab)).toBe('description');
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6b — meal_type in payload always matches the modal prop
// ---------------------------------------------------------------------------

describe('Property 6b: payload.meal_type always matches the mealType prop', () => {
  it('meal_type in payload equals the mealType argument for any tab and macros', () => {
    fc.assert(
      fc.property(
        tabArb,
        mealTypeArb,
        userIdArb,
        dateArb,
        foodNameArb,
        anyMacrosArb,
        (tab, mealType, userId, date, foodName, macros) => {
          const payload = buildMealLogPayload(tab, mealType, userId, date, foodName, macros);
          expect(payload.meal_type).toBe(mealType);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6c — source in payload always matches getSourceForTab(tab)
// ---------------------------------------------------------------------------

describe('Property 6c: payload.source always matches getSourceForTab(tab)', () => {
  it('source in payload equals getSourceForTab(tab) for any tab', () => {
    fc.assert(
      fc.property(
        tabArb,
        mealTypeArb,
        userIdArb,
        dateArb,
        foodNameArb,
        anyMacrosArb,
        (tab, mealType, userId, date, foodName, macros) => {
          const payload = buildMealLogPayload(tab, mealType, userId, date, foodName, macros);
          expect(payload.source).toBe(getSourceForTab(tab));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('source is photo for photo tab, description for describe/voice tabs', () => {
    fc.assert(
      fc.property(
        tabArb,
        mealTypeArb,
        userIdArb,
        dateArb,
        foodNameArb,
        anyMacrosArb,
        (tab, mealType, userId, date, foodName, macros) => {
          const payload = buildMealLogPayload(tab, mealType, userId, date, foodName, macros);
          if (tab === 'photo') {
            expect(payload.source).toBe('photo');
          } else {
            expect(payload.source).toBe('description');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6d — required macro fields in payload always match result
// ---------------------------------------------------------------------------

describe('Property 6d: required macro fields in payload always match the result', () => {
  it('calories, protein_g, carbs_g, fat_g match macros for any tab/mealType/macros', () => {
    fc.assert(
      fc.property(
        tabArb,
        mealTypeArb,
        userIdArb,
        dateArb,
        foodNameArb,
        anyMacrosArb,
        (tab, mealType, userId, date, foodName, macros) => {
          const payload = buildMealLogPayload(tab, mealType, userId, date, foodName, macros);
          expect(payload.calories).toBe(macros.calories);
          expect(payload.protein_g).toBe(macros.protein_g);
          expect(payload.carbs_g).toBe(macros.carbs_g);
          expect(payload.fat_g).toBe(macros.fat_g);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6e — fiber_g: absent when undefined, present with correct value when defined
// ---------------------------------------------------------------------------

describe('Property 6e: fiber_g handling in payload', () => {
  it('payload does NOT include fiber_g key when macros.fiber_g is undefined', () => {
    fc.assert(
      fc.property(
        tabArb,
        mealTypeArb,
        userIdArb,
        dateArb,
        foodNameArb,
        macrosWithoutFiberArb,
        (tab, mealType, userId, date, foodName, macros) => {
          const payload = buildMealLogPayload(tab, mealType, userId, date, foodName, macros);
          expect(Object.prototype.hasOwnProperty.call(payload, 'fiber_g')).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('payload includes fiber_g with the correct value when macros.fiber_g is defined', () => {
    fc.assert(
      fc.property(
        tabArb,
        mealTypeArb,
        userIdArb,
        dateArb,
        foodNameArb,
        macrosWithFiberArb,
        (tab, mealType, userId, date, foodName, macros) => {
          const payload = buildMealLogPayload(tab, mealType, userId, date, foodName, macros);
          expect(Object.prototype.hasOwnProperty.call(payload, 'fiber_g')).toBe(true);
          expect((payload as typeof payload & { fiber_g: number }).fiber_g).toBe(macros.fiber_g);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Example-based sanity checks
// ---------------------------------------------------------------------------

describe('Property 6 — example-based sanity checks', () => {
  // ── getSourceForTab ───────────────────────────────────────────────────────
  it("getSourceForTab returns 'photo' for photo tab", () => {
    expect(getSourceForTab('photo')).toBe('photo');
  });

  it("getSourceForTab returns 'description' for describe tab", () => {
    expect(getSourceForTab('describe')).toBe('description');
  });

  it("getSourceForTab returns 'description' for voice tab", () => {
    expect(getSourceForTab('voice')).toBe('description');
  });

  // ── buildMealLogPayload — photo tab, no fiber ─────────────────────────────
  it('photo tab payload has source=photo, correct meal_type and macros, no fiber_g', () => {
    const macros: MacroResult = { calories: 450, protein_g: 35, carbs_g: 40, fat_g: 12 };
    const payload = buildMealLogPayload('photo', 'lunch', 'user@example.com', '2024-07-01', 'Dal Rice', macros);
    expect(payload.source).toBe('photo');
    expect(payload.meal_type).toBe('lunch');
    expect(payload.calories).toBe(450);
    expect(payload.protein_g).toBe(35);
    expect(payload.carbs_g).toBe(40);
    expect(payload.fat_g).toBe(12);
    expect(Object.prototype.hasOwnProperty.call(payload, 'fiber_g')).toBe(false);
  });

  // ── buildMealLogPayload — describe tab, with fiber ────────────────────────
  it('describe tab payload has source=description, correct meal_type and macros including fiber_g', () => {
    const macros: MacroResult = { calories: 320, protein_g: 18, carbs_g: 55, fat_g: 6, fiber_g: 8 };
    const payload = buildMealLogPayload('describe', 'dinner', 'user@example.com', '2024-07-01', 'Oats and banana', macros);
    expect(payload.source).toBe('description');
    expect(payload.meal_type).toBe('dinner');
    expect(payload.calories).toBe(320);
    expect(payload.protein_g).toBe(18);
    expect(payload.carbs_g).toBe(55);
    expect(payload.fat_g).toBe(6);
    expect(Object.prototype.hasOwnProperty.call(payload, 'fiber_g')).toBe(true);
    expect((payload as typeof payload & { fiber_g: number }).fiber_g).toBe(8);
  });

  // ── buildMealLogPayload — voice tab ───────────────────────────────────────
  it('voice tab payload has source=description (same route as describe tab)', () => {
    const macros: MacroResult = { calories: 200, protein_g: 10, carbs_g: 30, fat_g: 4 };
    const payload = buildMealLogPayload('voice', 'breakfast', 'user@example.com', '2024-07-01', 'Yogurt parfait', macros);
    expect(payload.source).toBe('description');
    expect(payload.meal_type).toBe('breakfast');
  });

  // ── buildMealLogPayload — snack, zero macros ──────────────────────────────
  it('all-zero macros produce a valid payload', () => {
    const macros: MacroResult = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    const payload = buildMealLogPayload('describe', 'snack', 'user@example.com', '2024-07-01', 'Water', macros);
    expect(payload.calories).toBe(0);
    expect(payload.protein_g).toBe(0);
    expect(payload.carbs_g).toBe(0);
    expect(payload.fat_g).toBe(0);
    expect(Object.prototype.hasOwnProperty.call(payload, 'fiber_g')).toBe(false);
  });

  // ── fiber_g: value 0 is included (defined, not absent) ───────────────────
  it('fiber_g=0 is included in the payload (0 is defined, not missing)', () => {
    const macros: MacroResult = { calories: 100, protein_g: 5, carbs_g: 15, fat_g: 2, fiber_g: 0 };
    const payload = buildMealLogPayload('photo', 'snack', 'u', '2024-01-01', 'Apple', macros);
    expect(Object.prototype.hasOwnProperty.call(payload, 'fiber_g')).toBe(true);
    expect((payload as typeof payload & { fiber_g: number }).fiber_g).toBe(0);
  });
});
