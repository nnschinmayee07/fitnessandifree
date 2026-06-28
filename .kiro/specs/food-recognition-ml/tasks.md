# Implementation Plan: food-recognition-ml

## Overview

This plan implements the full food-recognition ML pipeline in four layers, each building on the previous: (1) Python ML layer — model training, nutrition DB, and FastAPI inference server; (2) Supabase schema and storage; (3) Next.js 16 API route; (4) frontend MealLogger component wired into the existing nutrition pages.

Tasks are ordered so each step's outputs are available before the next step needs them. Testing sub-tasks are placed immediately after the code they cover to catch errors early.

---

## Tasks

- [x] 1. Set up Python ML project structure and pinned dependencies
  - Create `ml/` directory with `requirements.txt` listing pinned versions for: `torch`, `torchvision`, `fastapi`, `uvicorn[standard]`, `python-multipart`, `Pillow`, `requests`, `hypothesis`, `pytest`, `pytest-cov`, `httpx`
  - Create `ml/tests/` directory with an empty `__init__.py` so pytest discovers tests
  - Verify all pins are exact versions (no `>=`, `~=`, or `^`)
  - _Requirements: 3.9_


- [x] 2. Write `ml/ALGORITHMS.md` documentation
  - Document why EfficientNetV2-S was chosen over EfficientNetV2-M, ResNet-50, and ViT-B/16 with one architecture-specific, verifiable reason for each alternative
  - Describe Two_Phase_Training: rationale for backbone freeze in phase 1, concrete LR values (1e-3 phase 1, 1e-4 phase 2)
  - Explain Cross-Entropy Loss and Adam with weight decay: what each optimises, weight-decay value (1e-4), role of Food-101 dataset
  - Describe the three-step macro estimation pipeline: (1) classifier output → category label, (2) label → Nutrition_DB lookup, (3) per-100 g values × (serving_size / 100) → displayed macros
  - List known limitations: fixed serving sizes, 101-category scope, confidence threshold heuristic
  - Describe future correction-based retraining: data items per correction (original image, corrected label, confidence score), minimum 50 corrections to trigger retraining, output format (labelled image directory + CSV manifest)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 3. Implement `ml/build_nutrition_db.py` — USDA API querying and JSON output
  - [x] 3.1 Implement core query logic with retry and null handling
    - Query USDA FoodData Central API for each of the 101 Food-101 class labels
    - Implement retry loop: up to 3 attempts per label; on exhaustion, log a warning and record `null` for that label
    - Map USDA nutrient IDs to fields: Energy (kcal) → `calories`, Protein → `protein_g`, Carbohydrate by difference → `carbs_g`, Total lipid → `fat_g`, Fiber total dietary → `fiber_g`
    - Always emit all five macro keys even when value is `null`; never omit a key
    - Assign a fixed `serving_size` (positive integer, 1–2000 g) for every category
    - Write output to `ml/nutrition_db.json`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 Write property test for Nutrition DB key presence (Property 11)
    - **Property 11: Nutrition DB entries always contain all macro keys**
    - Use Hypothesis to generate random nutrition entry dicts; assert all five keys (`calories`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`) are present for any entry produced by the builder
    - Tag: `# Feature: food-recognition-ml, Property 11: Nutrition DB entries always contain all macro keys`
    - **Validates: Requirements 2.2**

  - [x] 3.3 Write unit tests for retry logic and exit code
    - `test_retry_logic`: mock USDA API to fail 0, 1, 2, 3 times; assert correct call count each time
    - `test_nutrition_db_all_null_exit`: assert script exits non-zero when all five macro fields are `null` for any entry
    - _Requirements: 2.1, 2.7_


- [x] 4. Implement `ml/train.py` — two-phase EfficientNetV2-S fine-tuning
  - [x] 4.1 Implement phase 1: frozen backbone, head training
    - Load EfficientNetV2-S pretrained on ImageNet via `torchvision.models`
    - Replace the classifier head with a new Linear layer (output size = 101)
    - Freeze all backbone parameters (`requires_grad = False`); leave head unfrozen
    - Train for 5 epochs using CrossEntropyLoss, Adam (lr=1e-3, weight_decay=1e-4)
    - Add inline comments at each step: backbone freeze, head initialisation, loss computation
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.8_

  - [x] 4.2 Write unit tests for phase 1 parameter states
    - `test_freeze_phase`: assert all backbone parameters have `requires_grad == False` after freeze; assert head parameters have `requires_grad == True`
    - _Requirements: 1.2_

  - [x] 4.3 Implement phase 2: full unfreeze, cosine annealing fine-tuning
    - Unfreeze all parameters (`requires_grad = True`)
    - Switch optimiser LR to 1e-4 (exactly 1/10 of phase 1 LR)
    - Attach `CosineAnnealingLR` scheduler
    - Train for 10 epochs with inline comments at phase transition and cosine annealing setup
    - After scheduled epochs, check accuracy; if < 85 % continue in 5-epoch increments up to 50 additional epochs; exit with non-zero code if threshold not met after 50 extra epochs
    - Save model to `ml/food_classifier.pth`; exit non-zero if save fails
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 4.4 Write unit tests for phase 2 parameter and scheduler states
    - `test_unfreeze_phase`: assert all parameters `requires_grad == True` after unfreeze
    - `test_lr_relationship`: assert phase 2 LR ≤ phase 1 LR / 10
    - `test_scheduler_type`: assert scheduler is instance of `CosineAnnealingLR`
    - _Requirements: 1.2, 1.3_

  - [x] 4.5 Write property test for training accuracy retry loop (Property 12)
    - **Property 12: Training accuracy retry loop terminates correctly**
    - Use Hypothesis to generate random accuracy sequences; assert loop continues in 5-epoch increments and exits non-zero iff threshold not met after 50 additional epochs
    - Tag: `# Feature: food-recognition-ml, Property 12: Training accuracy retry loop terminates correctly`
    - **Validates: Requirements 1.6**

- [x] 5. Implement `ml/evaluate.py` — top-1 accuracy measurement
  - Load model from `ml/food_classifier.pth` and Food-101 test split
  - Compute top-1 accuracy and print result; exit non-zero if accuracy < 85 %
  - _Requirements: 1.6_


- [x] 6. Implement `ml/server.py` — FastAPI inference server
  - [x] 6.1 Implement startup resource loading
    - At application startup (lifespan handler), load `ml/food_classifier.pth` exactly once into memory; exit non-zero with path-specific log message if missing or unloadable
    - Load `ml/nutrition_db.json` exactly once into memory; exit non-zero with path and failure type if missing or unparseable
    - _Requirements: 3.1, 3.2, 2.5, 2.6_

  - [x] 6.2 Implement `POST /analyze` endpoint with validation and inference
    - Accept multipart form upload; reject files > 10 MB (HTTP 422, body identifying size rejection) and MIME types other than `image/jpeg`, `image/png`, `image/webp` (HTTP 422, body identifying type rejection)
    - Run classifier inference; return JSON with `food`, `confidence` (percentage string, two decimal places), `top3` (array of 3 `{name, confidence}` objects), `macros` scaled by `serving_size / 100` rounded to two decimal places
    - Include `low_confidence: true` in response when top-1 score < 0.50; omit field entirely when score ≥ 0.50
    - Return HTTP 422 with unrecognized category name if top-1 label absent from Nutrition_DB
    - Return HTTP 500 with logged stack trace for unexpected exceptions
    - Enable CORS for all origins via `fastapi.middleware.cors.CORSMiddleware`
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 6.3 Write property test for macro scaling (Property 1)
    - **Property 1: Macro scaling is proportional to serving size**
    - Use Hypothesis to generate `(per_100g_values, serving_size)` tuples; assert response macros equal per-100 g values × (serving_size / 100), rounded to two decimal places
    - Tag: `# Feature: food-recognition-ml, Property 1: Macro scaling is proportional to serving size`
    - **Validates: Requirements 3.4, 2.3**

  - [x] 6.4 Write property test for low-confidence flag (Property 2)
    - **Property 2: Low-confidence flag is set iff top-1 score is below 50 %**
    - Use Hypothesis to generate confidence floats in [0, 1]; assert `low_confidence: true` present iff score < 0.50, absent otherwise
    - Tag: `# Feature: food-recognition-ml, Property 2: Low-confidence flag is set iff top-1 score is below 50%`
    - **Validates: Requirements 3.5**

  - [x] 6.5 Write property test for file rejection (Property 3)
    - **Property 3: Invalid uploads are rejected with HTTP 422**
    - Use Hypothesis to generate files with random MIME types and sizes; assert HTTP 422 returned for any unsupported MIME type or size > 10 MB, with body explicitly identifying rejection reason
    - Tag: `# Feature: food-recognition-ml, Property 3: Invalid uploads are rejected with HTTP 422`
    - **Validates: Requirements 3.3, 3.6**

  - [x] 6.6 Write integration tests for the inference server
    - Start server with valid model and DB; assert `POST /analyze` succeeds end-to-end
    - Start server with missing model file; assert non-zero exit
    - Start server with malformed `nutrition_db.json`; assert non-zero exit
    - Assert CORS header `Access-Control-Allow-Origin: *` present on all responses
    - _Requirements: 3.1, 3.2, 3.8_

- [x] 7. Checkpoint — Python ML layer complete
  - Ensure all pytest tests pass (`pytest ml/tests/`), ask the user if questions arise.


- [x] 8. Set up Supabase schema and storage bucket
  - [x] 8.1 Create idempotent `supabase/migrations/create_meal_logs.sql`
    - Write `CREATE TABLE IF NOT EXISTS meal_logs` with columns: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id TEXT NOT NULL`, `logged_at TIMESTAMPTZ DEFAULT now()`, `meal_name TEXT`, `confidence NUMERIC(4,2) CHECK (confidence >= 0.00 AND confidence <= 1.00)`, `calories NUMERIC(10,2)`, `protein_g NUMERIC(10,2)`, `carbs_g NUMERIC(10,2)`, `fat_g NUMERIC(10,2)`, `fiber_g NUMERIC(10,2)`, `image_url TEXT`
    - Add `CREATE INDEX IF NOT EXISTS idx_meal_logs_user_time ON meal_logs (user_id ASC, logged_at DESC)` after the table statement
    - Both statements must be idempotent (`IF NOT EXISTS`)
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 8.2 Document `meal-images` storage bucket configuration
    - Add a comment block at the top of the migration file (or a companion `supabase/storage.sql`) specifying: bucket name `meal-images`, `public = false`, signed URL validity window 1–3600 s
    - Bucket must be created via Supabase dashboard or CLI before the API route is used; document this prerequisite in a `supabase/README.md`
    - _Requirements: 5.4, 5.5_

- [x] 9. Implement `app/api/nutrition/analyze/route.ts` — Next.js 16 API route
  - [x] 9.1 Define `MealLogRow` TypeScript type and environment config
    - Create `lib/types/meal-log.ts` exporting the `MealLogRow` interface: `id: string`, `user_id: string`, `logged_at: string`, `meal_name: string | null`, `confidence: number | null`, `calories: number | null`, `protein_g: number | null`, `carbs_g: number | null`, `fat_g: number | null`, `fiber_g: number | null`, `image_url: string | null`
    - Read `ML_MODEL_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` from `process.env`; these must never be hardcoded
    - _Requirements: 4.8, 4.9_

  - [x] 9.2 Implement the POST handler with full pipeline
    - Use `export async function POST(request: Request)` (Next.js 16 App Router — no `bodyParser`, no `config` export needed)
    - Read multipart body via `await request.formData()` (standard Web API, no `next/server` import required for this)
    - Step 1: validate `image` (present, MIME in `{image/jpeg, image/png, image/webp}`, ≤ 10 MB) and `userId` (non-empty string); return `Response` with status 400 and descriptive body on failure
    - Step 2: upload image buffer to Supabase Storage bucket `meal-images` using `@supabase/supabase-js` `createClient` with `SUPABASE_SERVICE_KEY`; return status 502 with `"Storage upload failed"` body on failure
    - Step 3: forward image bytes to `ML_MODEL_URL/analyze` as multipart POST; return status 503 with `"ML inference service unavailable"` on unreachable or non-2xx response
    - Step 4: insert row into `meal_logs` (`user_id`, server-side `logged_at`, `meal_name`, `confidence` as float 0–1 divided from percentage, `calories`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `image_url`); return status 500 with `"Database insert failed"` on failure
    - Step 5: return `Response.json(savedRow, { status: 200 })`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [x] 9.3 Write property test for API route input validation (Property 4)
    - **Property 4: API route returns 400 for any invalid input combination**
    - Use fast-check to generate arbitrary combinations of missing/invalid `image` and `userId` fields; assert HTTP 400 with descriptive body for every invalid combination
    - Tag: `# Feature: food-recognition-ml, Property 4: API route returns 400 for any invalid input combination`
    - **Validates: Requirements 4.1**

  - [x] 9.4 Write integration tests for the API route (mock Supabase and ML server)
    - Happy path: valid image + userId → 200 with `MealLogRow`
    - Supabase Storage failure → 502
    - ML server unreachable → 503
    - DB insert failure → 500
    - _Requirements: 4.4, 4.5, 4.6, 4.7_


- [x] 10. Checkpoint — Backend complete
  - Ensure Vitest API route tests pass (`vitest --run`), ask the user if questions arise.

- [x] 11. Implement `components/nutrition/MealLogger.tsx` — frontend component
  - [x] 11.1 Implement image capture, preview, and button state
    - Create `components/nutrition/MealLogger.tsx` as a `"use client"` component
    - Accept props: `userId: string`, `onSuccess?: (row: MealLogRow) => void`
    - Render a camera input: `<input type="file" accept="image/*" capture="environment" />`; provide a plain `<input type="file" accept="image/*" />` sibling hidden when `capture` is natively supported (fallback for browsers that ignore the attribute)
    - On file selection render a `<img>` preview of the selected file using an object URL
    - Render "Analyse Meal" button: `disabled` when no image is selected, enabled when an image is selected
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 11.2 Write property test for button/preview state (Property 5)
    - **Property 5: MealLogger button state tracks image selection**
    - Use fast-check + React Testing Library to assert: button `disabled` iff no image selected; preview rendered iff image selected
    - Tag: `# Feature: food-recognition-ml, Property 5: MealLogger button state tracks image selection`
    - **Validates: Requirements 6.3, 6.4**

  - [x] 11.3 Implement analyse, result display, and low-confidence Top3 flow
    - On button click: disable button, show spinner, POST multipart `{image, userId}` to `/api/nutrition/analyze` (use TanStack Query `useMutation` or plain `fetch`)
    - On success: display food name, confidence percentage badge (rounded to whole number), macro breakdown showing calories, protein_g, carbs_g, fat_g, fiber_g
    - When response includes `low_confidence: true`: render all three `top3` alternatives as individually selectable options before showing "Log Meal" button
    - Show "Log Meal" button only after result is displayed or a Top3 alternative is selected
    - _Requirements: 6.5, 6.6, 6.7, 6.8_

  - [x] 11.4 Write property test for complete macro breakdown rendering (Property 6)
    - **Property 6: MealLogger renders complete macro breakdown for any valid API response**
    - Use fast-check to generate valid API response objects; assert rendered output contains food name, confidence badge in [0, 100], and all five macro values
    - Tag: `# Feature: food-recognition-ml, Property 6: MealLogger renders complete macro breakdown for any valid API response`
    - **Validates: Requirements 6.6**

  - [x] 11.5 Write property test for Top3 rendering (Property 7)
    - **Property 7: Low-confidence responses always render Top3 selectable alternatives**
    - Use fast-check to generate responses with `low_confidence: true`; assert all three `top3` alternatives rendered as selectable options
    - Tag: `# Feature: food-recognition-ml, Property 7: Low-confidence responses always render Top3 selectable alternatives`
    - **Validates: Requirements 6.7**

  - [x] 11.6 Implement "Log Meal" confirm action — Zustand + React Query integration
    - On "Log Meal" click: call `useNutritionStore().addFood({ calories: result.macros.calories, protein: result.macros.protein_g, carbs: result.macros.carbs_g, fat: result.macros.fat_g })`
    - Call `useQueryClient().invalidateQueries({ queryKey: ["meal-logs"] })` (TanStack Query v5 object-argument API)
    - Reset component to initial state: no image, no preview, no result, no error
    - Call `onSuccess(savedRow)` if prop provided
    - _Requirements: 6.9, 6.10, 6.11_

  - [x] 11.7 Write property test for store field mapping (Property 8)
    - **Property 8: Store update maps API response fields correctly**
    - Use fast-check to generate arbitrary ML response macro objects; assert `addFood` is called with `{ calories, protein: protein_g, carbs: carbs_g, fat: fat_g }`
    - Tag: `# Feature: food-recognition-ml, Property 8: Store update maps API response fields correctly`
    - **Validates: Requirements 6.9**

  - [x] 11.8 Write property test for successful log reset (Property 9)
    - **Property 9: Successful log resets MealLogger to initial state**
    - Use fast-check to simulate arbitrary image-selected → analysed → confirmed sequences; assert component state is identical to initial state after success
    - Tag: `# Feature: food-recognition-ml, Property 9: Successful log resets MealLogger to initial state`
    - **Validates: Requirements 6.11**

  - [x] 11.9 Implement API error state handling
    - On API error (4xx or 5xx): retain selected image and preview, re-enable "Analyse Meal" button, display human-readable error message from response body or generic fallback
    - _Requirements: 6.12_

  - [x] 11.10 Write property test for error state preservation (Property 10)
    - **Property 10: API errors preserve image and re-enable button**
    - Use fast-check to generate arbitrary 4xx/5xx responses; assert image preview retained, button re-enabled, non-empty error message rendered
    - Tag: `# Feature: food-recognition-ml, Property 10: API errors preserve image and re-enable button`
    - **Validates: Requirements 6.12**

  - [x] 11.11 Write example-based unit tests for MealLogger
    - Camera input renders with `capture="environment"`
    - Spinner shown during pending request state
    - "Log Meal" button absent before result shown, present after
    - `queryClient.invalidateQueries({ queryKey: ["meal-logs"] })` called on confirm
    - _Requirements: 6.1, 6.5, 6.8, 6.10_


- [x] 12. Integrate MealLogger into existing nutrition pages
  - [x] 12.1 Wire MealLogger into `app/nutrition/page.tsx`
    - Import `MealLogger` and render it inside the existing "AI Photo Analysis" branch of the `MealLogModal` photo mode section, replacing the `runPhotoPredict` mock with the real component
    - Pass `userId` from `useUserStore()` (already imported in `app/nutrition/page.tsx`); pass `onSuccess` callback that calls the existing `onLog(entry)` handler mapping `MealLogRow` fields to `MealEntry`
    - Remove the mock `runPhotoPredict` function and its hard-coded `Chicken Biryani` response
    - _Requirements: 6.1 – 6.12_

  - [x] 12.2 Update `app/nutrition/log/page.tsx` to link "AI photo" chip to MealLogger
    - Replace the `href: "#"` placeholder on the "AI photo" `Chip` with an inline render of `MealLogger` (or a modal wrapper) so the chip opens the camera flow
    - Pass `userId` from user context; import `MealLogRow` from `lib/types/meal-log`
    - _Requirements: 6.1 – 6.12_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Run `vitest --run` for TypeScript/component tests and `pytest ml/tests/` for Python tests; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for an initial MVP
- Each task references specific requirements from `requirements.md` and design properties from `design.md`
- `MealLogRow` is defined in `lib/types/meal-log.ts` and imported wherever needed; do not redefine it inline
- The Next.js 16 route handler reads `formData` via `await request.formData()` directly on the Web `Request` object — no `bodyParser` configuration and no `config` export are needed
- `cookies()` and `headers()` from `next/headers` are fully async in Next.js 16 and must be awaited if used; this route does not need either
- Supabase `createClient` in the API route uses `SUPABASE_SERVICE_KEY` (service role); never use the anon key in server-side code
- TanStack Query v5 cache invalidation uses the object argument: `invalidateQueries({ queryKey: ["meal-logs"] })`
- The `meal-images` Supabase bucket must have `public = false`; images are accessed via signed URLs only


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "8.1", "9.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "8.2"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.2", "5.1", "6.1", "9.2"] },
    { "id": 3, "tasks": ["4.3", "6.2", "9.3", "9.4"] },
    { "id": 4, "tasks": ["4.4", "4.5", "6.3", "6.4", "6.5", "6.6", "11.1"] },
    { "id": 5, "tasks": ["11.2", "11.3"] },
    { "id": 6, "tasks": ["11.4", "11.5", "11.6"] },
    { "id": 7, "tasks": ["11.7", "11.8", "11.9"] },
    { "id": 8, "tasks": ["11.10", "11.11"] },
    { "id": 9, "tasks": ["12.1", "12.2"] }
  ]
}
```
