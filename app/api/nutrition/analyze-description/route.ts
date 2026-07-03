import type { DescriptionAnalysisResult } from '@/lib/types/claude';

const VALID_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

function stripJsonFences(content: string): string {
  return content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function isValidDescriptionResult(data: unknown): data is DescriptionAnalysisResult {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.meal_name === 'string' &&
    typeof d.calories === 'number' && d.calories >= 0 &&
    typeof d.protein_g === 'number' && d.protein_g >= 0 &&
    typeof d.carbs_g === 'number' && d.carbs_g >= 0 &&
    typeof d.fat_g === 'number' && d.fat_g >= 0 &&
    typeof d.fiber_g === 'number' && d.fiber_g >= 0 &&
    Array.isArray(d.items) &&
    typeof d.confidence === 'number' &&
    typeof d.assumptions === 'string'
  );
}

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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response('GROQ_API_KEY not configured', { status: 500 });
  }

  // ── Step 4: Build prompt ──────────────────────────────────────────────────
  const prompt = `Analyze this meal description and return nutritional information as JSON only — no markdown, no explanation, no code fences.

Meal description: "${description}"

Return exactly this JSON structure:
{
  "meal_name": "Short descriptive meal name",
  "calories": <number>,
  "protein_g": <number>,
  "carbs_g": <number>,
  "fat_g": <number>,
  "fiber_g": <number>,
  "items": ["item1", "item2"],
  "confidence": <number 0-100>,
  "assumptions": "Brief note on any portion size assumptions made"
}

Use standard nutritional values. If quantities are unclear, assume typical serving sizes for the region/cuisine implied by the description. All numeric values must be non-negative integers.`;

  // ── Step 5: Call OpenAI API ───────────────────────────────────────────────
  try {
    const openAIResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 1024,
        messages: [{ role: 'system', content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!openAIResponse.ok) {
      return new Response('Description analysis failed', { status: 502 });
    }

    // ── Step 6: Parse response ─────────────────────────────────────────
    const data = (await openAIResponse.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const rawContent = data.choices?.[0]?.message?.content ?? '';
    const sanitized = stripJsonFences(rawContent);

    let parsed: unknown;
    try {
      parsed = JSON.parse(sanitized);
    } catch {
      return new Response('Description analysis failed', { status: 502 });
    }

    // ── Step 7: Validate result ────────────────────────────────────────────
    if (!isValidDescriptionResult(parsed)) {
      return new Response('Description analysis failed', { status: 502 });
    }

    return Response.json(parsed, { status: 200 });
  } catch {
    return new Response('Description analysis failed', { status: 502 });
  }
}
