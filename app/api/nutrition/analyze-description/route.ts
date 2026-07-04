import { estimateMacrosFromDescription } from '@/lib/nutrition/describe-meal';

const VALID_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

export async function POST(request: Request): Promise<Response> {
  // ── Step 1: Parse body ────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  // ── Step 2: Validate inputs ───────────────────────────────────────────────
  const { description, userId, mealType } = body;

  if (
    typeof description !== 'string' ||
    description.length < 1 ||
    description.length > 500
  ) {
    return new Response('description is required (1–500 characters)', { status: 400 });
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return new Response('userId is required', { status: 400 });
  }

  if (typeof mealType !== 'string' || !VALID_MEAL_TYPES.has(mealType)) {
    return new Response('Invalid mealType', { status: 400 });
  }

  // ── Step 3: Check API key ─────────────────────────────────────────────────
  if (!process.env.GROQ_API_KEY) {
    return new Response('GROQ_API_KEY not configured', { status: 500 });
  }

  // ── Step 4: Estimate macros via Groq ──────────────────────────────────────
  try {
    const result = await estimateMacrosFromDescription(description);
    return Response.json(result, { status: 200 });
  } catch {
    return new Response('Description analysis failed', { status: 502 });
  }
}
