// Feature: food-recognition-ml, Property 4: API route returns 400 for any invalid input combination
// Validates: Requirements 4.1

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock @supabase/supabase-js to avoid real env var requirements at module load time
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        createSignedUrl: vi.fn(),
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}));

import { POST } from '@/app/api/nutrition/analyze/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a multipart Request with the given overrides.
 * - `image: undefined`  → field omitted entirely
 * - `image: null`       → field omitted entirely (same semantic)
 * - `image: File`       → field appended
 *
 * Same pattern for `userId`.
 */
function makeFormDataRequest(overrides: {
  image?: File | null;
  userId?: string | null;
}) {
  const fd = new FormData();
  if (overrides.image !== undefined && overrides.image !== null) {
    fd.append('image', overrides.image);
  }
  if (overrides.userId !== undefined && overrides.userId !== null) {
    fd.append('userId', overrides.userId);
  }
  return new Request('http://localhost/api/nutrition/analyze', {
    method: 'POST',
    body: fd,
  });
}

/** Creates a small valid-sized file with the given MIME type. */
function makeFile(mimeType: string, sizeBytes = 1024): File {
  const buf = new Uint8Array(sizeBytes);
  return new File([buf], 'test.bin', { type: mimeType });
}

/** Creates a File whose size exceeds 10 MB. */
function makeOversizedFile(mimeType = 'image/jpeg'): File {
  const tenMBplusOne = 10 * 1024 * 1024 + 1;
  const buf = new Uint8Array(tenMBplusOne);
  return new File([buf], 'big.jpg', { type: mimeType });
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** MIME types that are explicitly NOT allowed by the route. */
const invalidMimeArb = fc.oneof(
  fc.constant('text/plain'),
  fc.constant('application/pdf'),
  fc.constant('image/gif'),
  fc.constant('image/bmp'),
  fc.constant('image/tiff'),
  fc.constant('application/octet-stream'),
  fc.constant('video/mp4'),
);

/**
 * An arbitrary that produces one of many "invalid input" scenarios.
 * Each scenario is a function that returns a Request with at least one
 * validation failure, so the route must respond with HTTP 400.
 */
const invalidRequestArb: fc.Arbitrary<Request> = fc.oneof(
  // Scenario 1: no image field at all
  fc.record({ userId: fc.string({ minLength: 1 }) }).map(({ userId }) =>
    makeFormDataRequest({ userId }),
  ),

  // Scenario 2: no userId field at all (valid image present)
  fc.constant(null).map(() =>
    makeFormDataRequest({ image: makeFile('image/jpeg') }),
  ),

  // Scenario 3: userId is an empty string (valid image present)
  fc.constant(null).map(() =>
    makeFormDataRequest({ image: makeFile('image/jpeg'), userId: '' }),
  ),

  // Scenario 4: image with unsupported MIME type (valid userId present)
  fc
    .record({ userId: fc.string({ minLength: 1 }), mimeType: invalidMimeArb })
    .map(({ userId, mimeType }) =>
      makeFormDataRequest({
        image: makeFile(mimeType),
        userId,
      }),
    ),

  // Scenario 5: image larger than 10 MB (valid MIME type, valid userId)
  fc
    .record({
      userId: fc.string({ minLength: 1 }),
      mimeType: fc.oneof(
        fc.constant('image/jpeg'),
        fc.constant('image/png'),
        fc.constant('image/webp'),
      ),
    })
    .map(({ userId, mimeType }) =>
      makeFormDataRequest({
        image: makeOversizedFile(mimeType),
        userId,
      }),
    ),

  // Scenario 6: both image and userId missing
  fc.constant(null).map(() => makeFormDataRequest({})),

  // Scenario 7: whitespace-only userId (valid image present)
  fc
    .stringMatching(/^\s+$/)
    .filter((s) => s.trim() === '' && s.length > 0)
    .map((ws) =>
      makeFormDataRequest({ image: makeFile('image/jpeg'), userId: ws }),
    ),
);

// ---------------------------------------------------------------------------
// Property test
// ---------------------------------------------------------------------------

describe('Property 4: API route returns 400 for any invalid input combination', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://test';
    process.env.SUPABASE_SERVICE_KEY = 'test-key';
    process.env.ML_MODEL_URL = 'http://localhost:8000';
  });

  it(
    'returns HTTP 400 with a descriptive body for every invalid input combination',
    async () => {
      await fc.assert(
        fc.asyncProperty(invalidRequestArb, async (request) => {
          const response = await POST(request);

          // Must be 400
          expect(response.status).toBe(400);

          // Body must be a non-empty descriptive string
          const body = await response.text();
          expect(body.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    },
    // Allow up to 30 s for 100 runs; oversized file construction can be slow
    30_000,
  );
});

// ---------------------------------------------------------------------------
// Example-based sanity checks (cover each scenario individually)
// ---------------------------------------------------------------------------

describe('Property 4 — example-based sanity checks', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://test';
    process.env.SUPABASE_SERVICE_KEY = 'test-key';
    process.env.ML_MODEL_URL = 'http://localhost:8000';
  });

  it('returns 400 when image is absent', async () => {
    const req = makeFormDataRequest({ userId: 'user-123' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/image/i);
  });

  it('returns 400 when userId is absent', async () => {
    const req = makeFormDataRequest({ image: makeFile('image/jpeg') });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/userId/i);
  });

  it('returns 400 when userId is an empty string', async () => {
    const req = makeFormDataRequest({ image: makeFile('image/jpeg'), userId: '' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when MIME type is text/plain', async () => {
    const req = makeFormDataRequest({
      image: makeFile('text/plain'),
      userId: 'user-123',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/unsupported image type/i);
  });

  it('returns 400 when MIME type is application/pdf', async () => {
    const req = makeFormDataRequest({
      image: makeFile('application/pdf'),
      userId: 'user-123',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when MIME type is image/gif', async () => {
    const req = makeFormDataRequest({
      image: makeFile('image/gif'),
      userId: 'user-123',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when image exceeds 10 MB', async () => {
    const req = makeFormDataRequest({
      image: makeOversizedFile('image/jpeg'),
      userId: 'user-123',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/10 MB/i);
  });

  it('returns 400 when both image and userId are absent', async () => {
    const req = makeFormDataRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
