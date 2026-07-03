// Feature: nutrition-meal-logging-v2, Property 13: analyze-description route rejects invalid request bodies
// Validates: Requirements 8.4, 8.6, 10.4

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { POST } from '@/app/api/nutrition/analyze-description/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a JSON Request with the given body.
 */
function makeJSONRequest(body: unknown): Request {
  return new Request('http://localhost/api/nutrition/analyze-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid meal types */
const validMealTypeArb = fc.oneof(
  fc.constant('breakfast'),
  fc.constant('lunch'),
  fc.constant('dinner'),
  fc.constant('snack'),
);

/**
 * Arbitrary for INVALID request bodies that must return 400.
 * Scenarios:
 * 1. Missing description field
 * 2. Empty description (length 0)
 * 3. Description > 500 chars
 * 4. Missing userId field
 * 5. Empty userId string
 * 6. Invalid mealType
 */
const invalidRequestBodyArb: fc.Arbitrary<unknown> = fc.oneof(
  // Scenario 1: description missing entirely
  fc
    .record({
      userId: fc.string({ minLength: 1 }),
      mealType: validMealTypeArb,
    })
    .map((obj) => obj),

  // Scenario 2: description is empty string
  fc
    .record({
      description: fc.constant(''),
      userId: fc.string({ minLength: 1 }),
      mealType: validMealTypeArb,
    })
    .map((obj) => obj),

  // Scenario 3: description > 500 chars
  fc
    .record({
      description: fc.string({ minLength: 501, maxLength: 1000 }),
      userId: fc.string({ minLength: 1 }),
      mealType: validMealTypeArb,
    })
    .map((obj) => obj),

  // Scenario 4: userId missing entirely
  fc
    .record({
      description: fc.string({ minLength: 1, maxLength: 500 }),
      mealType: validMealTypeArb,
    })
    .map((obj) => obj),

  // Scenario 5: userId is empty string
  fc
    .record({
      description: fc.string({ minLength: 1, maxLength: 500 }),
      userId: fc.constant(''),
      mealType: validMealTypeArb,
    })
    .map((obj) => obj),

  // Scenario 6: userId is only whitespace
  fc
    .record({
      description: fc.string({ minLength: 1, maxLength: 500 }),
      userId: fc.stringMatching(/^\s+$/).filter((s) => s.trim() === ''),
      mealType: validMealTypeArb,
    })
    .map((obj) => obj),

  // Scenario 7: invalid mealType
  fc
    .record({
      description: fc.string({ minLength: 1, maxLength: 500 }),
      userId: fc.string({ minLength: 1 }),
      mealType: fc.oneof(
        fc.constant('invalid'),
        fc.constant(''),
        fc.constant('BREAKFAST'),
        fc.constant('Lunch'),
      ),
    })
    .map((obj) => obj),
);

/**
 * Arbitrary for VALID request bodies that should NOT return 400.
 * (May return 500 for missing API key, or 502 for other failures, but not 400)
 */
const validRequestBodyArb = fc.record({
  description: fc.string({ minLength: 1, maxLength: 500 }),
  userId: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
  mealType: validMealTypeArb,
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 13: analyze-description route input validation', () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    // Save original env var
    originalApiKey = process.env.ANTHROPIC_API_KEY;
    // Set API key so we don't hit 500 from missing key
    process.env.ANTHROPIC_API_KEY = 'test-key-for-validation';
  });

  afterEach(() => {
    // Restore original env var
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });

  it(
    'returns HTTP 400 with descriptive error for any invalid input combination',
    async () => {
      await fc.assert(
        fc.asyncProperty(invalidRequestBodyArb, async (body) => {
          const request = makeJSONRequest(body);
          const response = await POST(request);

          // Must be 400
          expect(response.status).toBe(400);

          // Body must be a non-empty descriptive string
          const responseText = await response.text();
          expect(responseText.length).toBeGreaterThan(0);
        }),
        { numRuns: 50 },
      );
    },
  );

  it(
    'does NOT return HTTP 400 for any valid input (1-500 char description, non-empty userId, valid mealType)',
    async () => {
      // Mock fetch to prevent real Claude API calls
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: JSON.stringify({
                meal_name: 'Test Meal',
                calories: 500,
                protein_g: 30,
                carbs_g: 50,
                fat_g: 20,
                fiber_g: 5,
                items: ['item1', 'item2'],
                confidence: 85,
                assumptions: 'Standard portions',
              }),
            },
          ],
        }),
      });

      global.fetch = mockFetch;

      await fc.assert(
        fc.asyncProperty(validRequestBodyArb, async (body) => {
          const request = makeJSONRequest(body);
          const response = await POST(request);

          // Must NOT be 400 (could be 200 with mocked response, or 502 if mock fails)
          expect(response.status).not.toBe(400);
        }),
        { numRuns: 50 },
      );

      vi.restoreAllMocks();
    },
  );
});

describe('Property 12 (partial): ANTHROPIC_API_KEY environment variable guard', () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });

  it(
    'returns HTTP 500 with "ANTHROPIC_API_KEY not configured" when env var is absent',
    async () => {
      await fc.assert(
        fc.asyncProperty(validRequestBodyArb, async (body) => {
          // Remove API key
          delete process.env.ANTHROPIC_API_KEY;

          const request = makeJSONRequest(body);
          const response = await POST(request);

          // Must be 500
          expect(response.status).toBe(500);

          // Body must contain the expected error message
          const responseText = await response.text();
          expect(responseText).toBe('ANTHROPIC_API_KEY not configured');
        }),
        { numRuns: 20 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Example-based sanity checks
// ---------------------------------------------------------------------------

describe('Property 13 — example-based sanity checks', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('returns 400 when description is missing', async () => {
    const req = makeJSONRequest({
      userId: 'user-123',
      mealType: 'breakfast',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toMatch(/description/i);
  });

  it('returns 400 when description is empty string', async () => {
    const req = makeJSONRequest({
      description: '',
      userId: 'user-123',
      mealType: 'breakfast',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/description/i);
  });

  it('returns 400 when description exceeds 500 characters', async () => {
    const longDescription = 'a'.repeat(501);
    const req = makeJSONRequest({
      description: longDescription,
      userId: 'user-123',
      mealType: 'breakfast',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when userId is missing', async () => {
    const req = makeJSONRequest({
      description: 'I had two rotis with dal',
      mealType: 'breakfast',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toMatch(/userId/i);
  });

  it('returns 400 when userId is empty string', async () => {
    const req = makeJSONRequest({
      description: 'I had two rotis with dal',
      userId: '',
      mealType: 'breakfast',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when mealType is invalid', async () => {
    const req = makeJSONRequest({
      description: 'I had two rotis with dal',
      userId: 'user-123',
      mealType: 'invalid-meal-type',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('Property 12 — example-based sanity check', () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });

  it('returns 500 with correct message when ANTHROPIC_API_KEY is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const req = makeJSONRequest({
      description: 'I had two rotis with dal',
      userId: 'user-123',
      mealType: 'breakfast',
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toBe('ANTHROPIC_API_KEY not configured');
  });
});
