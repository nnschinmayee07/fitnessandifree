// Feature: nutrition-meal-logging-v2
// Property 12 (partial): analyze-photo returns HTTP 500 when ML_MODEL_URL is absent
// Property 13 (partial): analyze-photo returns HTTP 400 for missing image or missing/empty userId
// Validates: Requirements 8.1, 8.2, 10.4

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// ── Mock Supabase to avoid real env var requirements at module load time ──────
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/signed-url' },
          error: null,
        }),
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn() })),
      })),
    })),
  })),
}));

import { POST } from '@/app/api/nutrition/analyze-photo/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a small valid image File of the given MIME type. */
function makeImageFile(mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'): File {
  return new File([new Uint8Array(512)], 'meal.jpg', { type: mimeType });
}

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

/** Builds a Request with a fully valid body (passes all validation). */
function makeValidRequest(): Request {
  const fd = new FormData();
  fd.append('image', makeImageFile());
  fd.append('userId', 'user-abc-123');
  fd.append('mealType', 'lunch');
  return new Request('http://localhost/api/nutrition/analyze-photo', {
    method: 'POST',
    body: fd,
  });
}

/** Builds a Request omitting the image field, with a valid userId + mealType. */
function makeRequestWithoutImage(userId: string, mealType: string): Request {
  const fd = new FormData();
  fd.append('userId', userId);
  fd.append('mealType', mealType);
  return new Request('http://localhost/api/nutrition/analyze-photo', {
    method: 'POST',
    body: fd,
  });
}

/** Builds a Request with a valid image, no userId / empty userId, and a valid mealType. */
function makeRequestWithEmptyUserId(userId: string, mealType: string): Request {
  const fd = new FormData();
  fd.append('image', makeImageFile());
  fd.append('userId', userId);
  fd.append('mealType', mealType);
  return new Request('http://localhost/api/nutrition/analyze-photo', {
    method: 'POST',
    body: fd,
  });
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** Arbitrary over valid meal types. */
const mealTypeArb = fc.constantFrom(...VALID_MEAL_TYPES);

/**
 * Arbitrary over userId values that should fail validation:
 *   - empty string
 *   - whitespace-only strings
 */
const invalidUserIdArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(''),
  fc.stringMatching(/^\s+$/).filter((s) => s.length > 0),
);

// ── Property 12 (partial): absent ML_MODEL_URL → HTTP 500 ────────────────────

describe('Property 12 (partial) — absent ML_MODEL_URL returns HTTP 500', () => {
  const savedMlUrl = process.env.ML_MODEL_URL;

  beforeEach(() => {
    // Ensure Supabase env vars are set so validation of those doesn't fire first
    process.env.SUPABASE_URL = 'http://supabase-test';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  });

  afterEach(() => {
    // Restore original value
    process.env.ML_MODEL_URL = savedMlUrl;
  });

  it(
    'returns HTTP 500 with "ML_MODEL_URL not configured" for any absent ML_MODEL_URL value',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate absent values: undefined (delete) and empty string
          fc.oneof(
            fc.constant(undefined as undefined),
            fc.constant(''),
          ),
          async (absentValue) => {
            if (absentValue === undefined) {
              delete process.env.ML_MODEL_URL;
            } else {
              process.env.ML_MODEL_URL = absentValue;
            }

            const response = await POST(makeValidRequest());
            const body = await response.text();

            expect(response.status).toBe(500);
            expect(body).toBe('ML_MODEL_URL not configured');
          },
        ),
        { numRuns: 20 },
      );
    },
    15_000,
  );
});

// ── Property 13 (partial): missing image → HTTP 400 ──────────────────────────

describe('Property 13 (partial) — missing image field returns HTTP 400', () => {
  beforeEach(() => {
    // Keep ML_MODEL_URL set so the env-var check does NOT fire before the image check
    process.env.ML_MODEL_URL = 'http://ml-test:8000';
    process.env.SUPABASE_URL = 'http://supabase-test';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  });

  it(
    'returns HTTP 400 with "image is required" for any valid userId + mealType when image is absent',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          mealTypeArb,
          async (userId, mealType) => {
            const request = makeRequestWithoutImage(userId, mealType);
            const response = await POST(request);
            const body = await response.text();

            expect(response.status).toBe(400);
            expect(body).toBe('image is required');
          },
        ),
        { numRuns: 50 },
      );
    },
    30_000,
  );
});

// ── Property 13 (partial): empty/whitespace userId → HTTP 400 ────────────────

describe('Property 13 (partial) — empty or whitespace userId returns HTTP 400', () => {
  beforeEach(() => {
    process.env.ML_MODEL_URL = 'http://ml-test:8000';
    process.env.SUPABASE_URL = 'http://supabase-test';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  });

  it(
    'returns HTTP 400 with "userId is required" for any empty or whitespace-only userId',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidUserIdArb,
          mealTypeArb,
          async (userId, mealType) => {
            const request = makeRequestWithEmptyUserId(userId, mealType);
            const response = await POST(request);
            const body = await response.text();

            expect(response.status).toBe(400);
            expect(body).toBe('userId is required');
          },
        ),
        { numRuns: 50 },
      );
    },
    30_000,
  );
});

// ── Example-based sanity checks ───────────────────────────────────────────────

describe('Property 12 & 13 — example-based sanity checks', () => {
  beforeEach(() => {
    process.env.ML_MODEL_URL = 'http://ml-test:8000';
    process.env.SUPABASE_URL = 'http://supabase-test';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
  });

  it('returns 500 when ML_MODEL_URL is undefined', async () => {
    delete process.env.ML_MODEL_URL;
    const res = await POST(makeValidRequest());
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('ML_MODEL_URL not configured');
    process.env.ML_MODEL_URL = 'http://ml-test:8000';
  });

  it('returns 500 when ML_MODEL_URL is an empty string', async () => {
    process.env.ML_MODEL_URL = '';
    const res = await POST(makeValidRequest());
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('ML_MODEL_URL not configured');
  });

  it('returns 400 when image is absent', async () => {
    const res = await POST(makeRequestWithoutImage('user-123', 'breakfast'));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('image is required');
  });

  it('returns 400 when userId is an empty string', async () => {
    const res = await POST(makeRequestWithEmptyUserId('', 'breakfast'));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('userId is required');
  });

  it('returns 400 when userId is whitespace only', async () => {
    const res = await POST(makeRequestWithEmptyUserId('   ', 'dinner'));
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('userId is required');
  });
});
