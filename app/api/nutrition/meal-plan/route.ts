export interface MealSuggestion {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  description: string;
}

interface RemainingMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export function validateMealSuggestions(data: unknown): data is MealSuggestion[] {
  if (!Array.isArray(data) || data.length < 1 || data.length > 10) return false;
  return data.every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).name === 'string' &&
      typeof (item as Record<string, unknown>).calories === 'number' &&
      typeof (item as Record<string, unknown>).protein_g === 'number' &&
      typeof (item as Record<string, unknown>).carbs_g === 'number' &&
      typeof (item as Record<string, unknown>).fat_g === 'number' &&
      typeof (item as Record<string, unknown>).description === 'string',
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response('OPENAI_API_KEY not configured', { status: 500 });
  }

  const remainingMacros = (body.remainingMacros as RemainingMacros) ?? {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  };
  const foodPreferences = Array.isArray(body.foodPreferences)
    ? (body.foodPreferences as string[])
    : [];
  const allergies = Array.isArray(body.allergies)
    ? (body.allergies as string[])
    : [];

  const systemPrompt = `You are a nutrition assistant. Respond ONLY with a valid JSON array of 3 to 5 meal suggestions.
Each item must have exactly these fields: name (string), calories (number), protein_g (number),
carbs_g (number), fat_g (number), description (string).
The meals should fit within the remaining macros: ${remainingMacros.calories} kcal,
${remainingMacros.protein_g}g protein, ${remainingMacros.carbs_g}g carbs, ${remainingMacros.fat_g}g fat.
Food preferences: ${foodPreferences.join(', ') || 'none'}.
Allergies to avoid: ${allergies.join(', ') || 'none'}.
Return only the JSON array, no markdown, no explanation.`;

  let openAIResponse: globalThis.Response;
  try {
    openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 600,
        messages: [{ role: 'system', content: systemPrompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return new Response('Meal plan generation failed', { status: 502 });
  }

  if (!openAIResponse.ok) {
    return new Response('Meal plan generation failed', { status: 502 });
  }

  let responseData: { choices: Array<{ message: { content: string } }> };
  try {
    responseData = (await openAIResponse.json()) as typeof responseData;
  } catch {
    return new Response('Meal plan generation failed', { status: 502 });
  }

  const content = responseData.choices?.[0]?.message?.content ?? '';

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return new Response('Meal plan generation failed', { status: 502 });
  }

  if (!validateMealSuggestions(parsed)) {
    return new Response('Meal plan generation failed', { status: 502 });
  }

  return Response.json({ suggestions: parsed }, { status: 200 });
}
