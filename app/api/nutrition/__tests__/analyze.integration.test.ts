/**
 * Integration tests for POST /api/nutrition/analyze
 *
 * Validates: Requirements 4.4, 4.5, 4.6, 4.7
 *
 * Strategy: mock @supabase/supabase-js and global fetch so that we exercise
 * the real route handler logic without network/DB I/O.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Supabase mock setup ──────────────────────────────────────────────────────
// These are module-level mutable references so individual tests can configure
// return values via mockResolvedValueOnce / mockResolvedValue.
const mockUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockInsert = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockInsert,
        })),
      })),
    })),
  })),
}));

// Import the route AFTER mocking so the mock is in place when the module loads.
import { POST } from '@/app/api/nutrition/analyze/route';

// ── Shared ML JSON that the fake inference server returns ────────────────────
const ML_RESPONSE_BODY = {
  food: 'pizza',
  confidence: '87.43',
  top3: [
    { name: 'pizza', confidence: '87.43' },
    { name: 'flatbread', confidence: '7.12' },
    { name: 'focaccia', confidence: '3.21' },
  ],
  macros: {
    calories: 266,
    protein_g: 11,
    carbs_g: 33,
    fat_g: 10,
    fiber_g: 2.3,
  },
};

// The row that Supabase would return after a successful insert.
const SAVED_ROW = {
  id: 'row-uuid-1234',
  user_id: 'user-abc',
  logged_at: '2024-01-15T12:00:00.000Z',
  meal_name: 'pizza',
  confidence: 0.8743,
  calories: 266,
  protein_g: 11,
  carbs_g: 33,
  fat_g: 10,
  fiber_g: 2.3,
  image_url: 'http://test/img',
};

// ── Helper: build a valid multipart Request ───────────────────────────────────
function buildValidRequest(userId = 'user-abc'): Request {
  // A minimal 1 KB JPEG-shaped byte buffer (real JPEG magic bytes + padding)
  const jpegBytes = new Uint8Array(1024);
  // JPEG magic bytes so browsers/parsers recognise the type (not required by
  // our route which trusts the declared MIME type, but good hygiene).
  jpegBytes[0] = 0xff;
  jpegBytes[1] = 0xd8;
  jpegBytes[jpegBytes.length - 2] = 0xff;
  jpegBytes[jpegBytes.length - 1] = 0xd9;

  const file = new File([jpegBytes], 'meal.jpg', { type: 'image/jpeg' });

  const fd = new FormData();
  fd.append('image', file);
  fd.append('userId', userId);

  return new Request('http://localhost/api/nutrition/analyze', {
    method: 'POST',
    body: fd,
  });
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('Integration: POST /api/nutrition/analyze', () => {
  beforeEach(() => {
    // Clear call history and queued return values for the leaf mocks.
    // We use clearAllMocks() (not resetAllMocks) so that the createClient
    // factory implementation is preserved — resetAllMocks would wipe the
    // return value and cause supabase to be undefined inside the route.
    vi.clearAllMocks();

    // Set required environment variables.
    process.env.SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_SERVICE_KEY = 'service-key-test';
    process.env.ML_MODEL_URL = 'http://ml.test';
  });

  // ── Test 1: Happy path ─────────────────────────────────────────────────────
  it('returns 200 with the saved MealLogRow on a fully successful request', async () => {
    // Storage upload succeeds
    mockUpload.mockResolvedValueOnce({ data: {}, error: null });
    // Signed URL creation succeeds
    mockCreateSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: 'http://test/img' },
      error: null,
    });
    // ML server responds successfully
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(ML_RESPONSE_BODY), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    // DB insert succeeds
    mockInsert.mockResolvedValueOnce({ data: SAVED_ROW, error: null });

    const response = await POST(buildValidRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(SAVED_ROW);
  });

  // ── Test 2: Supabase Storage upload failure → 502 ──────────────────────────
  it('returns 502 when Supabase Storage upload fails', async () => {
    // Storage upload fails
    mockUpload.mockResolvedValueOnce({
      data: null,
      error: { message: 'upload failed' },
    });

    // fetch should NOT be called; stub anyway to catch unexpected calls
    vi.stubGlobal('fetch', vi.fn());

    const response = await POST(buildValidRequest());

    expect(response.status).toBe(502);
    // fetch must not have been called — ML server never contacted
    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── Test 3: ML server unreachable → 503 ───────────────────────────────────
  it('returns 503 when the ML server is unreachable (fetch throws)', async () => {
    // Storage upload succeeds
    mockUpload.mockResolvedValueOnce({ data: {}, error: null });
    // Signed URL creation succeeds
    mockCreateSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: 'http://test/img' },
      error: null,
    });
    // ML server is down — fetch throws a network error
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new Error('ECONNREFUSED')),
    );

    const response = await POST(buildValidRequest());

    expect(response.status).toBe(503);
  });

  // ── Test 4: DB insert failure → 500 ───────────────────────────────────────
  it('returns 500 when the Supabase meal_logs insert fails', async () => {
    // Storage upload succeeds
    mockUpload.mockResolvedValueOnce({ data: {}, error: null });
    // Signed URL creation succeeds
    mockCreateSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: 'http://test/img' },
      error: null,
    });
    // ML server responds successfully
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(ML_RESPONSE_BODY), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    // DB insert fails
    mockInsert.mockResolvedValueOnce({
      data: null,
      error: { message: 'insert failed' },
    });

    const response = await POST(buildValidRequest());

    expect(response.status).toBe(500);
  });
});
