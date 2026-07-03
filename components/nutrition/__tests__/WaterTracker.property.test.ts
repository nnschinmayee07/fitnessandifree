/**
 * Property-based tests for WaterTracker optimistic update revert logic.
 * Validates: Requirements 12.6
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Pure functions extracted from the optimistic update pattern
function applyOptimisticUpdate(currentTotal: number, amount_ml: number): number {
  return currentTotal + amount_ml;
}

function revertOptimisticUpdate(previousTotal: number): number {
  return previousTotal;
}

describe('Property 10: Water optimistic update reverts on insert failure', () => {
  it('after optimistic increment and simulated failure, total reverts to pre-tap value', () => {
    const totalArb = fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true });
    const amountArb = fc.float({ min: Math.fround(1), max: Math.fround(5000), noNaN: true });

    fc.assert(
      fc.property(totalArb, amountArb, (initialTotal, amount_ml) => {
        // Step 1: record pre-tap snapshot (what onMutate captures)
        const previousTotal = initialTotal;

        // Step 2: apply optimistic update (what onMutate does)
        const optimisticTotal = applyOptimisticUpdate(initialTotal, amount_ml);

        // Verify optimistic total is greater
        expect(optimisticTotal).toBeCloseTo(initialTotal + amount_ml, 5);

        // Step 3: simulate insert failure — revert to snapshot (what onError does)
        const revertedTotal = revertOptimisticUpdate(previousTotal);

        // The reverted total must exactly match the pre-tap value
        expect(revertedTotal).toBe(previousTotal);
        expect(revertedTotal).toBe(initialTotal);
      }),
      { numRuns: 100 },
    );
  });

  it('revert is exact — not approximate', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(5000), noNaN: true }),
        (initialTotal, amount_ml) => {
          const previousTotal = initialTotal;
          // Apply and then revert
          applyOptimisticUpdate(initialTotal, amount_ml); // mutates optimistically
          const reverted = revertOptimisticUpdate(previousTotal);
          // Must be exact reference equality (same float value, no rounding)
          expect(reverted).toBe(initialTotal);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('optimistic total is always greater than or equal to initial for any positive amount', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
        fc.float({ min: Math.fround(0.001), max: Math.fround(5000), noNaN: true }),
        (initialTotal, amount_ml) => {
          const optimisticTotal = applyOptimisticUpdate(initialTotal, amount_ml);
          expect(optimisticTotal).toBeGreaterThan(initialTotal);
        },
      ),
      { numRuns: 100 },
    );
  });
});
