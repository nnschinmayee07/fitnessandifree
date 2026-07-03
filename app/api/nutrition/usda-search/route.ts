export interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

interface USDANutrient {
  nutrientNumber: string;
  value: number;
}

interface USDAFoodRaw {
  fdcId: number;
  description: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: USDANutrient[];
}

interface USDASearchResponse {
  foods: USDAFoodRaw[];
}

export function mapUSDAFood(food: USDAFoodRaw): USDAFood {
  const nutrientMap: Record<string, number> = {};
  for (const n of food.foodNutrients) {
    nutrientMap[n.nutrientNumber] = n.value;
  }
  return {
    fdcId: food.fdcId,
    description: food.description,
    brandOwner: food.brandOwner,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    calories: nutrientMap['208'] ?? 0,
    protein_g: nutrientMap['203'] ?? 0,
    fat_g: nutrientMap['204'] ?? 0,
    carbs_g: nutrientMap['205'] ?? 0,
    fiber_g: nutrientMap['291'] ?? 0,
  };
}

export function scaleMacros(food: USDAFood, portion_g: number): USDAFood {
  const factor = portion_g / 100;
  return {
    ...food,
    calories: Math.round(food.calories * factor * 100) / 100,
    protein_g: Math.round(food.protein_g * factor * 100) / 100,
    fat_g: Math.round(food.fat_g * factor * 100) / 100,
    carbs_g: Math.round(food.carbs_g * factor * 100) / 100,
    fiber_g: Math.round(food.fiber_g * factor * 100) / 100,
  };
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const pageSize = Number(searchParams.get('pageSize') ?? '20');

  if (!q || q.length < 2) {
    return new Response('q must be at least 2 characters', { status: 400 });
  }

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return new Response('USDA_API_KEY not configured', { status: 500 });
  }

  let response: globalThis.Response;
  try {
    response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=${pageSize}&api_key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) },
    );
  } catch {
    return new Response('Food search unavailable — try again', { status: 502 });
  }

  if (!response.ok) {
    return new Response('Food search unavailable — try again', { status: 502 });
  }

  let data: USDASearchResponse;
  try {
    data = (await response.json()) as USDASearchResponse;
  } catch {
    return new Response('Food search unavailable — try again', { status: 502 });
  }

  const foods = (data.foods ?? []).map(mapUSDAFood);
  return Response.json({ foods }, { status: 200 });
}
