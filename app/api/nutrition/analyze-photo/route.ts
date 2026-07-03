import { createServerClient } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const VALID_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

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
  const userIdField = formData.get('userId');
  const mealTypeField = formData.get('mealType');

  if (!imageField || !(imageField instanceof File)) {
    return new Response('image is required', { status: 400 });
  }
  const image = imageField as File;

  if (!userIdField || typeof userIdField !== 'string' || userIdField.trim() === '') {
    return new Response('userId is required', { status: 400 });
  }
  const userId = userIdField;

  if (!mealTypeField || typeof mealTypeField !== 'string' || !VALID_MEAL_TYPES.has(mealTypeField)) {
    return new Response('Invalid mealType', { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(image.type)) {
    return new Response('Unsupported image type. Accepted: jpeg, png, webp', { status: 400 });
  }

  if (image.size > MAX_FILE_SIZE) {
    return new Response('Image exceeds 10 MB limit', { status: 400 });
  }

  // ── Step 2: Check ML URL ──────────────────────────────────────────────────
  const mlModelUrl = process.env.ML_MODEL_URL;
  if (!mlModelUrl) {
    return new Response('ML_MODEL_URL not configured', { status: 500 });
  }

  // ── Step 3: Forward image to ML inference server ──────────────────────────
  // ML server expects field name "file" (not "image")
  const imageBuffer = await image.arrayBuffer();
  const fileName = image.name || 'meal.jpg';

  let mlResult: MLResult;
  try {
    const mlFormData = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: image.type });
    mlFormData.append('file', imageBlob, fileName);

    const mlResponse = await fetch(`${mlModelUrl}/analyze`, {
      method: 'POST',
      body: mlFormData,
      signal: AbortSignal.timeout(15000),
    });

    if (!mlResponse.ok) {
      const errorText = await mlResponse.text().catch(() => '');
      console.error('ML server error:', mlResponse.status, errorText);
      return new Response('ML inference service unavailable', { status: 502 });
    }

    mlResult = (await mlResponse.json()) as MLResult;
  } catch (err) {
    console.error('ML server request failed:', err);
    return new Response('ML inference service unavailable', { status: 502 });
  }

  // ── Step 4: Optionally upload to Supabase Storage (non-blocking) ──────────
  let imageUrl = '';
  try {
    const supabase = createServerClient();
    const uniquePath = `${userId}/${Date.now()}_${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('meal-images')
      .upload(uniquePath, imageBuffer, { contentType: image.type });

    if (!uploadError) {
      const { data: signedUrlData } = await supabase.storage
        .from('meal-images')
        .createSignedUrl(uniquePath, 3600);
      imageUrl = signedUrlData?.signedUrl ?? '';
    }
  } catch {
    // Storage failure is non-fatal — continue without image_url
  }

  // ── Step 5: Return result ─────────────────────────────────────────────────
  const confidence = parseFloat(mlResult.confidence);
  const lowConfidence = confidence < 50;

  // Normalize macros — ML server may return nulls for unrecognized foods
  const macros = {
    calories:  mlResult.macros?.calories  ?? 0,
    protein_g: mlResult.macros?.protein_g ?? 0,
    carbs_g:   mlResult.macros?.carbs_g   ?? 0,
    fat_g:     mlResult.macros?.fat_g     ?? 0,
    fiber_g:   mlResult.macros?.fiber_g   ?? 0,
  };

  return Response.json(
    {
      food: mlResult.food,
      confidence: mlResult.confidence,
      top3: mlResult.top3,
      macros,
      image_url: imageUrl,
      ...(lowConfidence ? { low_confidence: true } : {}),
    },
    { status: 200 },
  );
}
