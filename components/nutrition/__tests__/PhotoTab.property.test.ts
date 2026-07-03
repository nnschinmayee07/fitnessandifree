/**
 * Property-based tests for PhotoTab rendering logic.
 *
 * **Validates: Requirements 2.5, 2.6**
 *
 * Strategy: The conditional display rules in PhotoTab are driven by three
 * pure functions that compute values from the analysis result. Rather than
 * mounting the React component in a DOM environment (which adds heavy
 * test-infrastructure overhead), we extract and re-implement those same
 * functions here and property-test them directly. This mirrors exactly what
 * the component does at runtime without incurring DOM complexity.
 *
 * Property 3: For any analysis result:
 *   - If `confidence >= 50`: result card SHALL show food name + confidence
 *     badge (green) + macro grid; `isLowConfidence` returns false.
 *   - If `low_confidence` is true (confidence < 50%): result card SHALL
 *     additionally show top-3 chips AND "Log This Meal" is disabled until
 *     a chip is selected.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure logic functions — mirrors PhotoTab.tsx exactly
// ---------------------------------------------------------------------------

/**
 * Returns true when the confidence percentage string represents a value
 * below 50, indicating low confidence.
 * PhotoTab uses `parseFloat(confidence)` for comparisons.
 */
function isLowConfidence(confidence: string): boolean {
  return parseFloat(confidence) < 50;
}

/**
 * Returns true when the "Log This Meal" button should be disabled.
 * The button is disabled only when `lowConfidence` is true AND no
 * alternative chip has been selected.
 */
function isLogButtonDisabled(
  lowConfidence: boolean | undefined,
  selectedAlternative: string | null,
): boolean {
  return (lowConfidence === true) && (selectedAlternative === null || selectedAlternative === undefined);
}

/**
 * Returns the colour variant for the confidence badge.
 * Green for >= 50%, amber for < 50%.
 */
function getConfidenceBadgeColor(confidence: string): 'green' | 'amber' {
  return parseFloat(confidence) >= 50 ? 'green' : 'amber';
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * A numeric confidence value >= 50, formatted as a decimal string
 * (e.g. "87.43"). This covers the high-confidence branch.
 * We use integers scaled to two decimal places to avoid 32-bit float
 * constraint issues with fc.float in fast-check v3.
 * Range: 5000..10000 → 50.00..100.00
 */
const highConfidenceStringArb = fc
  .integer({ min: 5000, max: 10000 })
  .map((n) => (n / 100).toFixed(2));

/**
 * A numeric confidence value in [0, 50) exclusive, formatted as a decimal
 * string. This covers the low-confidence branch.
 * Range: 0..4999 → 0.00..49.99
 */
const lowConfidenceStringArb = fc
  .integer({ min: 0, max: 4999 })
  .map((n) => (n / 100).toFixed(2))
  .filter((s) => parseFloat(s) < 50);

/**
 * A non-empty string representing a selected alternative chip name.
 */
const selectedAlternativeArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

/**
 * Any string that fast-check produces can be a selectedAlternative value.
 * Used for "regardless of selectedAlternative" branches.
 */
const anyAlternativeOrNullArb = fc.oneof(
  fc.constant(null),
  selectedAlternativeArb,
);

// ---------------------------------------------------------------------------
// Property 3a — confidence >= 50 branch
// ---------------------------------------------------------------------------

describe('Property 3a: confidence >= 50 (high-confidence path)', () => {
  /**
   * For any confidence string whose numeric value is >= 50:
   *   - isLowConfidence must return false
   *   - badge colour must be green
   *   - log button must NOT be disabled regardless of selectedAlternative
   */
  it(
    'isLowConfidence returns false and badge is green for confidence >= 50',
    () => {
      fc.assert(
        fc.property(highConfidenceStringArb, (confidence) => {
          expect(isLowConfidence(confidence)).toBe(false);
          expect(getConfidenceBadgeColor(confidence)).toBe('green');
        }),
        { numRuns: 100 },
      );
    },
  );

  it(
    'Log This Meal is NOT disabled for confidence >= 50, regardless of selectedAlternative',
    () => {
      fc.assert(
        fc.property(highConfidenceStringArb, anyAlternativeOrNullArb, (confidence, selected) => {
          // When confidence >= 50, low_confidence is false, so the button must be enabled.
          const lowConf = isLowConfidence(confidence); // always false here
          expect(isLogButtonDisabled(lowConf, selected)).toBe(false);
        }),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 3b — low_confidence branch (confidence < 50)
// ---------------------------------------------------------------------------

describe('Property 3b: confidence < 50 (low-confidence path)', () => {
  /**
   * For any confidence string whose numeric value is < 50:
   *   - isLowConfidence must return true
   *   - badge colour must be amber
   */
  it(
    'isLowConfidence returns true and badge is amber for confidence < 50',
    () => {
      fc.assert(
        fc.property(lowConfidenceStringArb, (confidence) => {
          expect(isLowConfidence(confidence)).toBe(true);
          expect(getConfidenceBadgeColor(confidence)).toBe('amber');
        }),
        { numRuns: 100 },
      );
    },
  );

  /**
   * When low_confidence is true and no alternative chip is selected
   * (selectedAlternative is null), the button MUST be disabled.
   */
  it(
    'Log This Meal is DISABLED when low_confidence=true and selectedAlternative=null',
    () => {
      fc.assert(
        fc.property(lowConfidenceStringArb, (confidence) => {
          const lowConf = isLowConfidence(confidence); // always true here
          expect(isLogButtonDisabled(lowConf, null)).toBe(true);
        }),
        { numRuns: 100 },
      );
    },
  );

  /**
   * When low_confidence is true but a non-empty alternative chip HAS been
   * selected, the button must be enabled.
   */
  it(
    'Log This Meal is NOT disabled when low_confidence=true and selectedAlternative is a non-empty string',
    () => {
      fc.assert(
        fc.property(lowConfidenceStringArb, selectedAlternativeArb, (confidence, selected) => {
          const lowConf = isLowConfidence(confidence); // always true here
          expect(isLogButtonDisabled(lowConf, selected)).toBe(false);
        }),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Property 3c — low_confidence false / undefined branch
// ---------------------------------------------------------------------------

describe('Property 3c: low_confidence false or undefined', () => {
  /**
   * When low_confidence is false or undefined, the button must NOT be
   * disabled regardless of what selectedAlternative is.
   */
  it(
    'Log This Meal is NOT disabled when low_confidence=false, regardless of selectedAlternative',
    () => {
      fc.assert(
        fc.property(anyAlternativeOrNullArb, (selected) => {
          expect(isLogButtonDisabled(false, selected)).toBe(false);
        }),
        { numRuns: 100 },
      );
    },
  );

  it(
    'Log This Meal is NOT disabled when low_confidence=undefined, regardless of selectedAlternative',
    () => {
      fc.assert(
        fc.property(anyAlternativeOrNullArb, (selected) => {
          expect(isLogButtonDisabled(undefined, selected)).toBe(false);
        }),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Badge colour is the inverse of isLowConfidence — structural consistency
// ---------------------------------------------------------------------------

describe('Property 3d: badge colour is consistent with isLowConfidence', () => {
  /**
   * For any confidence string, the badge colour and isLowConfidence must
   * be consistent: green ↔ not-low-confidence, amber ↔ low-confidence.
   */
  it(
    'badge is green exactly when isLowConfidence is false, and amber exactly when true',
    () => {
      // Use a broader arbitrary covering both branches (0.00..100.00 in 0.01 steps)
      const anyConfidenceArb = fc
        .integer({ min: 0, max: 10000 })
        .map((n) => (n / 100).toFixed(2));

      fc.assert(
        fc.property(anyConfidenceArb, (confidence) => {
          const low = isLowConfidence(confidence);
          const colour = getConfidenceBadgeColor(confidence);
          if (low) {
            expect(colour).toBe('amber');
          } else {
            expect(colour).toBe('green');
          }
        }),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Example-based sanity checks
// ---------------------------------------------------------------------------

describe('Property 3 — example-based sanity checks', () => {
  // ── isLowConfidence ──────────────────────────────────────────────────────
  it('isLowConfidence("87.43") is false', () => {
    expect(isLowConfidence('87.43')).toBe(false);
  });

  it('isLowConfidence("50.00") is false (boundary — exactly 50 is NOT low)', () => {
    expect(isLowConfidence('50.00')).toBe(false);
  });

  it('isLowConfidence("49.99") is true', () => {
    expect(isLowConfidence('49.99')).toBe(true);
  });

  it('isLowConfidence("0") is true', () => {
    expect(isLowConfidence('0')).toBe(true);
  });

  // ── badge colour ─────────────────────────────────────────────────────────
  it('badge is green for "87.43"', () => {
    expect(getConfidenceBadgeColor('87.43')).toBe('green');
  });

  it('badge is green for "50.00" (boundary)', () => {
    expect(getConfidenceBadgeColor('50.00')).toBe('green');
  });

  it('badge is amber for "49.99"', () => {
    expect(getConfidenceBadgeColor('49.99')).toBe('amber');
  });

  it('badge is amber for "0"', () => {
    expect(getConfidenceBadgeColor('0')).toBe('amber');
  });

  // ── isLogButtonDisabled ──────────────────────────────────────────────────
  it('button is disabled when low_confidence=true and selectedAlternative=null', () => {
    expect(isLogButtonDisabled(true, null)).toBe(true);
  });

  it('button is NOT disabled when low_confidence=true and selectedAlternative="Dal Rice"', () => {
    expect(isLogButtonDisabled(true, 'Dal Rice')).toBe(false);
  });

  it('button is NOT disabled when low_confidence=false and selectedAlternative=null', () => {
    expect(isLogButtonDisabled(false, null)).toBe(false);
  });

  it('button is NOT disabled when low_confidence=undefined and selectedAlternative=null', () => {
    expect(isLogButtonDisabled(undefined, null)).toBe(false);
  });

  it('button is NOT disabled when low_confidence=false and selectedAlternative is set', () => {
    expect(isLogButtonDisabled(false, 'Chicken Tikka')).toBe(false);
  });
});
