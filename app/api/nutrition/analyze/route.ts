import { createClient } from '@supabase/supabase-js';
import type { MealLogRow } from '@/lib/types/meal-log';
import { insertMealLog } from '@/lib/nutrition/meal-log';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** ML inference server response shape */
interface MLResult {
  food: string;
  confidence: string; // percentage string e.g. "87.43"
  top3: Array<{ name: string; confidence: string }>;
  macros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  low_confidence?: boolean;
}

export async function POST(request: Request): Promise<Response> {
  // ── Step 1: Parse & validate multipart body ──────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response('Invalid multipart body', { status: 400 });
  }

  const imageField = formData.get('image');
  const userId = formData.get('userId');

  const mealTypeField = formData.get('mealType');
  const mealType = (typeof mealTypeField === 'string' && ['breakfast','lunch','dinner','snack'].includes(mealTypeField))
    ? mealTypeField as 'breakfast' | 'lunch' | 'dinner' | 'snack'
    : 'snack';

  // Validate userId
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return new Response('Invalid request: userId is required and must be a non-empty string', {
      status: 400,
    });
  }

  // Validate image presence
  if (!imageField || !(imageField instanceof File)) {
    return new Response('Invalid request: image file is required', { status: 400 });
  }

  const image = imageField as File;

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(image.type)) {
    return new Response(
      `Invalid request: unsupported image type "${image.type}". Allowed types: image/jpeg, image/png, image/webp`,
      { status: 400 },
    );
  }

  // Validate file size
  if (image.size > MAX_BYTES) {
    return new Response(
      `Invalid request: image exceeds maximum allowed size of 10 MB (received ${image.size} bytes)`,
      { status: 400 },
    );
  }

  // ── Step 2: Upload image to Supabase Storage ──────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response('Server misconfiguration: missing Supabase environment variables', {
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const imageBuffer = await image.arrayBuffer();
  const uniquePath = `${userId}/${Date.now()}-${image.name || 'meal.jpg'}`;

  const { error: uploadError } = await supabase.storage
    .from('meal-images')
    .upload(uniquePath, imageBuffer, { contentType: image.type });

  if (uploadError) {
    return new Response('Storage upload failed', { status: 502 });
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('meal-images')
    .createSignedUrl(uniquePath, 3600);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return new Response('Storage upload failed', { status: 502 });
  }

  const imageUrl = signedUrlData.signedUrl;

  // ── Step 3: Forward image to ML inference server ──────────────────────────
  const mlModelUrl = process.env.ML_MODEL_URL;

  if (!mlModelUrl) {
    return new Response('Server misconfiguration: missing ML_MODEL_URL environment variable', {
      status: 500,
    });
  }

  let mlResult: MLResult;
  try {
    const mlFormData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: image.type });
    mlFormData.append('file', imageBlob, image.name || 'meal.jpg');

    const mlResponse = await fetch(`${mlModelUrl}/analyze`, {
      method: 'POST',
      body: mlFormData,
    });

    if (!mlResponse.ok) {
      return new Response('ML inference service unavailable', { status: 503 });
    }

    mlResult = (await mlResponse.json()) as MLResult;
  } catch {
    return new Response('ML inference service unavailable', { status: 503 });
  }

  // ── Step 4: Insert row into meal_logs ─────────────────────────────────────
  let savedRow: MealLogRow;
  try {
    savedRow = await insertMealLog({
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      meal_type: mealType,
      source: 'photo',
      food_name: mlResult.food,
      calories: mlResult.macros.calories,
      protein_g: mlResult.macros.protein_g,
      carbs_g: mlResult.macros.carbs_g,
      fat_g: mlResult.macros.fat_g,
      fiber_g: mlResult.macros.fiber_g,
      confidence: parseFloat(mlResult.confidence) / 100,
      image_url: imageUrl,
    });
  } catch {
    return new Response('Database insert failed', { status: 500 });
  }

  // ── Step 5: Return saved row ──────────────────────────────────────────────
  // Merge the saved DB row with the ML result fields that MealLogger needs
  // (food, confidence as percentage string, top3, macros, low_confidence).
  return Response.json(
    {
      ...savedRow,
      food: mlResult.food,
      confidence: mlResult.confidence,
      top3: mlResult.top3,
      macros: mlResult.macros,
      ...(mlResult.low_confidence ? { low_confidence: true } : {}),
    } as MealLogRow & MLResult,
    { status: 200 },
  );
}
