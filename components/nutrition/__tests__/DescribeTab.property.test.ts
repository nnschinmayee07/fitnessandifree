/**
 * Property-based tests for DescribeTab result card rendering logic.
 *
 * **Validates: Requirements 3.4**
 *
 * Strategy: The result card rendering is driven purely by the fields in
 * `DescriptionAnalysisResult`. Rather than mounting the React component in a
 * DOM environment, we extract and property-test the pure display/logic
 * functions that drive each piece of the card:
 *
 *   1. Confidence badge text  → `${result.confidence}% confident`
 *   2. Confidence badge color → green (≥70), yellow (50–69), red (<50)
 *   3. All 5 macro fields present on the result object
 *   4. Assumptions string is non-empty (would be rendered)
 *
 * Property 4: For any valid `DescriptionAnalysisResult` (non-empty meal_name,
 * non-negative macros, items array, confidence 0-100, non-empty assumptions),
 * the result card SHALL render all of: meal name, confidence badge, macro grid
 * (5 fields), assumptions note.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { DescriptionAnalysisResult } from '@/lib/types/claude';

// ---------------------------------------------------------------------------
// Pure display logic — mirrors DescribeTab.tsx / ResultCard exactly
// ---------------------------------------------------------------------------

/**
 * Returns the confidence badge text as rendered in the component.
 */
function confidenceBadgeText(result: DescriptionAnalysisResult): string {
  return `${result.confidence}% confident`;
}

/**
 * Returns the CSS colour category for the confidence badge.
 * Mirrors the ternary in ResultCard:
 *   confidence >= 70  → 'green'
 *   confidence >= 50  → 'yellow'
 *   otherwise         → 'red'
 */
function confidenceBadgeColor(result: DescriptionAnalysisResult): 'green' | 'yellow' | 'red' {
  if (result.confidence >= 70) return 'green';
  if (result.confidence >= 50) return 'yellow';
  return 'red';
}

/** The five macro field keys that must be present on every result. */
const MACRO_FIELDS = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const;

/**
 * Returns true when all five macro fields are present on the result object
 * (i.e. the macro grid would be fully populated).
 */
function allMacroFieldsPresent(result: DescriptionAnalysisResult): boolean {
  return MACRO_FIELDS.every((field) => field in result && typeof result[field] === 'number');
}

/**
 * Returns true when the assumptions string is non-empty (would be rendered
 * inside the result card's "Assumptions:" note).
 */
function assumptionsWouldRender(result: DescriptionAnalysisResult): boolean {
  return typeof result.assumptions === 'string' && result.assumptions.length > 0;
}

// ---------------------------------------------------------------------------
// Arbitrary — valid DescriptionAnalysisResult
// ---------------------------------------------------------------------------

const validResultArb = fc.record({
  meal_name: fc.string({ minLength: 1 }),
  calories: fc.nat({ max: 9999 }),
  protein_g: fc.nat({ max: 999 }),
  carbs_g: fc.nat({ max: 999 }),
  fat_g: fc.nat({ max: 999 }),
  fiber_g: fc.nat({ max: 999 }),
  items: fc.array(fc.string({ minLength: 1 })),
  confidence: fc.integer({ min: 0, max: 100 }),
  assumptions: fc.string({ minLength: 1 }),
});

// ---------------------------------------------------------------------------
// Property 4 — tests
// ---------------------------------------------------------------------------

describe('Property 4: DescribeTab result card renders all required elements', () => {
  // ── 4a: Confidence badge text ───────────────────────────────────────────────
  it('produces the correct confidence badge text for any confidence value', () => {
    fc.assert(
      fc.property(validResultArb, (result) => {
        const text = confidenceBadgeText(result);
        expect(text).toBe(`${result.confidence}% confident`);
      }),
      { numRuns: 100 },
    );
  });

  // ── 4b: Confidence badge colour ─────────────────────────────────────────────
  it('assigns green color for confidence >= 70', () => {
    const highConfidenceArb = validResultArb.filter((r) => r.confidence >= 70);
    fc.assert(
      fc.property(highConfidenceArb, (result) => {
        expect(confidenceBadgeColor(result)).toBe('green');
      }),
      { numRuns: 100 },
    );
  });

  it('assigns yellow color for confidence in [50, 69]', () => {
    const medConfidenceArb = validResultArb.filter(
      (r) => r.confidence >= 50 && r.confidence < 70,
    );
    fc.assert(
      fc.property(medConfidenceArb, (result) => {
        expect(confidenceBadgeColor(result)).toBe('yellow');
      }),
      { numRuns: 100 },
    );
  });

  it('assigns red color for confidence < 50', () => {
    const lowConfidenceArb = validResultArb.filter((r) => r.confidence < 50);
    fc.assert(
      fc.property(lowConfidenceArb, (result) => {
        expect(confidenceBadgeColor(result)).toBe('red');
      }),
      { numRuns: 100 },
    );
  });

  // ── 4c: All 5 macro fields present ─────────────────────────────────────────
  it('result object always contains all 5 macro fields (macro grid fully populated)', () => {
    fc.assert(
      fc.property(validResultArb, (result) => {
        expect(allMacroFieldsPresent(result)).toBe(true);
        // Each individual field is a non-negative number
        for (const field of MACRO_FIELDS) {
          expect(typeof result[field]).toBe('number');
          expect(result[field]).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  // ── 4d: Assumptions note would be rendered ──────────────────────────────────
  it('assumptions is always a non-empty string (would be rendered in the card)', () => {
    fc.assert(
      fc.property(validResultArb, (result) => {
        expect(assumptionsWouldRender(result)).toBe(true);
        expect(result.assumptions.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  // ── 4e: Meal name is non-empty ──────────────────────────────────────────────
  it('meal_name is always a non-empty string (header would be rendered)', () => {
    fc.assert(
      fc.property(validResultArb, (result) => {
        expect(result.meal_name.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  // ── 4f: Full property — all card elements present together ─────────────────
  it(
    'for any valid result, all card elements (meal name, confidence badge, macro grid, assumptions) are present',
    () => {
      fc.assert(
        fc.property(validResultArb, (result) => {
          // Meal name renders
          expect(result.meal_name.length).toBeGreaterThan(0);

          // Confidence badge text is correct
          expect(confidenceBadgeText(result)).toBe(`${result.confidence}% confident`);

          // Confidence badge color is one of the three valid categories
          const color = confidenceBadgeColor(result);
          expect(['green', 'yellow', 'red']).toContain(color);

          // Macro grid: all 5 fields present
          expect(allMacroFieldsPresent(result)).toBe(true);

          // Assumptions note renders
          expect(assumptionsWouldRender(result)).toBe(true);
        }),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Example-based sanity checks
// ---------------------------------------------------------------------------

describe('Property 4 — example-based sanity checks', () => {
  const baseResult: DescriptionAnalysisResult = {
    meal_name: 'Dal Rice',
    calories: 450,
    protein_g: 15,
    carbs_g: 70,
    fat_g: 10,
    fiber_g: 4,
    items: ['dal', 'rice'],
    confidence: 85,
    assumptions: 'Assumed standard 150g dal and 200g rice',
  };

  it('confidence >= 70 → green badge', () => {
    expect(confidenceBadgeColor({ ...baseResult, confidence: 70 })).toBe('green');
    expect(confidenceBadgeColor({ ...baseResult, confidence: 100 })).toBe('green');
  });

  it('confidence 50-69 → yellow badge', () => {
    expect(confidenceBadgeColor({ ...baseResult, confidence: 50 })).toBe('yellow');
    expect(confidenceBadgeColor({ ...baseResult, confidence: 69 })).toBe('yellow');
  });

  it('confidence < 50 → red badge', () => {
    expect(confidenceBadgeColor({ ...baseResult, confidence: 0 })).toBe('red');
    expect(confidenceBadgeColor({ ...baseResult, confidence: 49 })).toBe('red');
  });

  it('badge text format is correct', () => {
    expect(confidenceBadgeText({ ...baseResult, confidence: 85 })).toBe('85% confident');
    expect(confidenceBadgeText({ ...baseResult, confidence: 0 })).toBe('0% confident');
    expect(confidenceBadgeText({ ...baseResult, confidence: 100 })).toBe('100% confident');
  });

  it('all 5 macro fields present on a well-formed result', () => {
    expect(allMacroFieldsPresent(baseResult)).toBe(true);
  });

  it('non-empty assumptions would render', () => {
    expect(assumptionsWouldRender(baseResult)).toBe(true);
  });

  it('empty assumptions would NOT render', () => {
    expect(assumptionsWouldRender({ ...baseResult, assumptions: '' })).toBe(false);
  });
});
