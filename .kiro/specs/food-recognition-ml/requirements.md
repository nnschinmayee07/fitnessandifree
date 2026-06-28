# Requirements Document

## Introduction

This feature adds a fully-owned, on-premises machine-learning pipeline to the fitnessandifree Next.js app that replaces the existing mock photo-analysis flow with real food recognition. A fine-tuned EfficientNetV2-S model classifies food images into 101 Food-101 categories, looks up per-100 g macronutrients from a bundled USDA-sourced JSON database, and returns structured macro estimates to the app. A FastAPI inference server bridges the Python model and the Next.js API route. Meal results are persisted to Supabase and surfaced through a revised `MealLogger` component that supports camera capture, image preview, confidence-based fallback selection, and Zustand state integration.

---

## Glossary

- **Classifier**: The fine-tuned EfficientNetV2-S PyTorch model that predicts food categories from images.
- **Nutrition_DB**: The `nutrition_db.json` file containing per-100 g macro values for all 101 Food-101 categories, built once from the USDA FoodData Central API.
- **Inference_Server**: The FastAPI application (`server.py`) that loads the Classifier and Nutrition_DB and exposes a `/analyze` HTTP endpoint.
- **API_Route**: The Next.js Route Handler at `app/api/nutrition/analyze/route.ts` that proxies image uploads to the Inference_Server and persists results to Supabase.
- **MealLogger**: The React component at `components/nutrition/MealLogger.tsx` that handles image capture, calls the API_Route, and renders macro results.
- **Meal_Log**: A single persisted row in the Supabase `meal_logs` table representing one analysed meal.
- **Top3**: The three highest-confidence food category predictions returned by the Classifier for any given image.
- **Low_Confidence**: A prediction whose top-1 confidence score is below 50 %.
- **Serving_Size**: A fixed, documented gram weight per food category stored in Nutrition_DB; macros are scaled from per-100 g values to this serving size for display.
- **Food-101**: The publicly available dataset of 101 food categories with 101,000 images used for fine-tuning.
- **Two_Phase_Training**: The training strategy that first trains only the classification head with a frozen backbone, then unfreezes the full network for fine-tuning at a lower learning rate.
- **USDA_API**: The USDA FoodData Central REST API used once, offline, to populate Nutrition_DB.

---

## Requirements

### Requirement 1: ML Model Training

**User Story:** As a developer, I want to fine-tune EfficientNetV2-S on the Food-101 dataset, so that the app has a fully owned food classifier with no third-party AI API dependency.

#### Acceptance Criteria

1. THE Classifier SHALL use EfficientNetV2-S pretrained on ImageNet as its backbone architecture.
2. WHEN Two_Phase_Training is executed, THE Classifier SHALL freeze all backbone parameters and train only the classification head for 5 epochs in phase 1, then unfreeze all parameters and fine-tune the full network for 10 epochs in phase 2.
3. WHEN phase 2 training runs, THE Classifier SHALL use cosine annealing as the learning rate schedule with an initial learning rate that is at most 1/10th of the phase 1 learning rate.
4. THE Classifier SHALL use Cross-Entropy Loss as the training objective.
5. THE Classifier SHALL use the Adam optimiser with weight decay for all training phases.
6. WHEN training completes, THE Classifier SHALL achieve at least 85 % top-1 accuracy on the Food-101 test set as measured by `evaluate.py`; IF accuracy remains below 85 % after the scheduled epochs, THEN THE Classifier SHALL continue training in increments of 5 additional epochs, up to a maximum of 50 additional epochs, until the threshold is reached; IF the threshold is not reached after 50 additional epochs, THEN THE training script SHALL report failure and exit with a non-zero exit code.
7. WHEN training completes successfully, THE Classifier SHALL be saved as `ml/food_classifier.pth`; IF the file save operation fails, THEN THE training script SHALL report training as failed and exit with a non-zero exit code.
8. THE `train.py` script SHALL contain inline comments explaining each algorithm step (backbone freeze, head initialisation, phase transition, cosine annealing, loss computation).

### Requirement 2: Nutrition Database Construction

**User Story:** As a developer, I want a pre-built JSON nutrition database covering all 101 Food-101 categories, so that macro lookups happen entirely offline at inference time with no runtime API calls.

#### Acceptance Criteria

1. THE `build_nutrition_db.py` script SHALL query the USDA_API for each of the 101 Food-101 class labels; IF the USDA_API returns an error or no results for a given label, THEN the script SHALL retry up to 3 times before logging a warning and recording a null entry for that label.
2. THE Nutrition_DB SHALL store the retrieved per-100 g values for calories, protein_g, carbs_g, fat_g, and fiber_g for every Food-101 category; IF a specific nutrient value is unavailable from the USDA_API, THEN the script SHALL record `null` for that field rather than omitting the key.
3. THE Nutrition_DB SHALL store a fixed Serving_Size in grams for every Food-101 category, where the serving size value SHALL be a positive integer between 1 and 2000 inclusive.
4. THE Nutrition_DB SHALL be saved as `ml/nutrition_db.json` and ship alongside the model weights.
5. WHEN the Inference_Server starts, THE Inference_Server SHALL load Nutrition_DB entirely into memory from `ml/nutrition_db.json` without any runtime calls to the USDA_API.
6. WHEN the Inference_Server starts and `ml/nutrition_db.json` is missing or cannot be parsed as valid JSON, THE Inference_Server SHALL exit with a non-zero exit code and log an error indicating the file path and the nature of the failure.
7. WHEN `build_nutrition_db.py` completes, IF any of the 101 Food-101 categories have all macro fields set to `null`, THEN the script SHALL exit with a non-zero exit code and log the names of the incomplete categories so the operator can intervene before the database is shipped.

### Requirement 3: FastAPI Inference Server

**User Story:** As a backend developer, I want a FastAPI server that loads the model once and serves predictions over HTTP, so that the Next.js app can call a single endpoint and receive structured macro data.

#### Acceptance Criteria

1. WHEN the Inference_Server starts, THE Inference_Server SHALL load the Classifier from `ml/food_classifier.pth` exactly once into memory; IF the file is missing or cannot be loaded, THE Inference_Server SHALL exit with a non-zero exit code and log an error indicating which resource failed to load.
2. WHEN the Inference_Server starts, THE Inference_Server SHALL load Nutrition_DB exactly once into memory; IF the file is missing or cannot be parsed, THE Inference_Server SHALL exit with a non-zero exit code and log an error indicating which resource failed to load.
3. THE Inference_Server SHALL expose a `POST /analyze` endpoint that accepts a multipart form upload containing a food image; the endpoint SHALL reject files larger than 10 MB and SHALL accept only MIME types `image/jpeg`, `image/png`, and `image/webp`.
4. WHEN a valid image is received, THE Inference_Server SHALL return a JSON response containing: `food` (top-1 predicted category name), `confidence` (top-1 score as a percentage rounded to two decimal places), `top3` (array of three objects each with `name` and `confidence`), and `macros` (object with `calories`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g` scaled to the Serving_Size defined as the gram weight of one standard serving as recorded in Nutrition_DB).
5. WHEN the top-1 confidence score is below 50 %, THE Inference_Server SHALL include a `low_confidence: true` flag in the response.
6. IF the uploaded file exceeds 10 MB or has an unsupported MIME type, THEN THE Inference_Server SHALL return HTTP 422 with an error message that explicitly identifies whether the rejection reason is file size or file type.
7. IF the top-1 predicted category is absent from Nutrition_DB, THEN THE Inference_Server SHALL return HTTP 422 with an error message indicating the unrecognized category name.
8. THE Inference_Server SHALL enable CORS for all origins to allow requests from the Next.js development server.
9. THE `ml/requirements.txt` SHALL list all Python dependencies with pinned versions.

### Requirement 4: Next.js API Route

**User Story:** As a frontend developer, I want a Next.js API route that proxies image uploads to the ML server and persists results, so that the frontend has a single typed endpoint to call.

#### Acceptance Criteria

1. THE API_Route SHALL accept `POST` requests containing multipart form data with an `image` file field (MIME type `image/jpeg`, `image/png`, or `image/webp`, maximum 10 MB) and a `userId` text field (non-empty string); IF either field is missing or invalid, THEN THE API_Route SHALL return HTTP 400 with a descriptive error message.
2. WHEN a valid request is received, THE API_Route SHALL upload the image to the Supabase Storage bucket named `meal-images` and obtain the public storage URL; this upload SHALL occur before the Inference_Server is called and is a mandatory step in the request pipeline.
3. WHEN the Inference_Server returns a successful result, THE API_Route SHALL insert a new row into the `meal_logs` Supabase table with the fields: `user_id`, `logged_at` (server-side timestamp at insert time), `meal_name`, `confidence`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `image_url` (the public storage URL from step 2).
4. WHEN the insert succeeds, THE API_Route SHALL return HTTP 200 with the saved Meal_Log row as JSON.
5. IF the Inference_Server is unreachable or returns a non-2xx response, THEN THE API_Route SHALL return HTTP 503 with a descriptive error message.
6. IF the Supabase Storage upload fails, THEN THE API_Route SHALL return HTTP 502 with a descriptive error message.
7. IF the Supabase `meal_logs` insert fails, THEN THE API_Route SHALL return HTTP 500 with a descriptive error message.
8. THE API_Route SHALL read the Inference_Server URL from the `ML_MODEL_URL` environment variable.
9. THE API_Route SHALL use `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` environment variables to authenticate with Supabase.

### Requirement 5: Supabase Schema and Storage

**User Story:** As a developer, I want a Supabase migration and storage bucket that persist meal analysis results and images, so that users' meal history is durable and queryable.

#### Acceptance Criteria

1. THE `supabase/migrations/create_meal_logs.sql` file SHALL create a `meal_logs` table with the following columns: `id` (UUID primary key, default `gen_random_uuid()`), `user_id` (text, not null), `logged_at` (timestamptz, default `now()`), `meal_name` (text), `confidence` (numeric(4,2), constrained to values between 0.00 and 1.00 inclusive), `calories` (numeric(10,2)), `protein_g` (numeric(10,2)), `carbs_g` (numeric(10,2)), `fat_g` (numeric(10,2)), `fiber_g` (numeric(10,2)), `image_url` (text).
2. THE migration SHALL create a composite index on `meal_logs(user_id ASC, logged_at DESC)` to support per-user chronological history queries; the index creation statement SHALL appear after the table creation statement in the migration file.
3. THE migration file SHALL be idempotent using `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
4. THE Supabase Storage bucket named `meal-images` SHALL be created with public access set to false, such that objects in the bucket are not accessible via unauthenticated public URLs.
5. WHEN a client requests access to an object in the `meal-images` bucket, THE system SHALL require a signed URL with a validity window between 1 second and 3600 seconds inclusive; requests without a valid signed URL SHALL be rejected with an access-denied response.

### Requirement 6: MealLogger Frontend Component

**User Story:** As a user, I want to photograph my food and immediately see its macro breakdown with confidence feedback, so that I can log accurate nutrition data without manual input.

#### Acceptance Criteria

1. THE MealLogger SHALL render a camera capture input with `accept="image/*"` and `capture="environment"` for native camera access on mobile.
2. IF the browser does not support the `capture` attribute, THEN THE MealLogger SHALL render a file upload input that accepts `image/*` files as a fallback.
3. WHEN an image is selected, THE MealLogger SHALL display a preview of the selected image before the user submits.
4. THE MealLogger SHALL render an "Analyse Meal" button; the button SHALL be disabled when no image is selected and enabled when an image is selected.
5. WHEN the "Analyse Meal" button is clicked, THE MealLogger SHALL disable the button and display a visible spinner while the API_Route request is pending.
6. WHEN the API_Route returns a successful result, THE MealLogger SHALL display the predicted food name, a confidence percentage badge (whole number between 0 and 100), and a macro breakdown showing calories, protein_g, carbs_g, fat_g, and fiber_g from the API response.
7. WHEN the API_Route returns a successful result with `low_confidence: true`, THE MealLogger SHALL display the Top3 alternatives as selectable options so the user can choose the correct food before confirming.
8. WHEN a result is displayed (or a Top3 alternative is selected), THE MealLogger SHALL render a "Log Meal" button that the user must click to confirm the log action.
9. WHEN the user clicks "Log Meal", THE MealLogger SHALL call the Zustand `addFood` action from `useNutritionStore` with the confirmed meal's `{ calories, protein, carbs, fat }` values mapped from the API response.
10. WHEN the user clicks "Log Meal", THE MealLogger SHALL invalidate the React Query cache key `["meal-logs"]` so that any meal history views refresh.
11. WHEN a meal is successfully logged, THE MealLogger SHALL reset to its initial state (no image selected, no result displayed).
12. IF the API_Route returns an error, THEN THE MealLogger SHALL display a human-readable error message, retain the selected image, and re-enable the "Analyse Meal" button so the user can retry.

### Requirement 7: Algorithm Documentation

**User Story:** As a developer joining the team, I want a concise technical reference for the ML pipeline, so that I can understand design decisions and extend the system without reverse-engineering the code.

#### Acceptance Criteria

1. THE `ml/ALGORITHMS.md` file SHALL exist at the path `ml/ALGORITHMS.md` and SHALL document why EfficientNetV2-S was chosen over each of the following alternative architectures: EfficientNetV2-M, ResNet-50, and ViT-B/16, with at least one verifiable, architecture-specific reason stated for each alternative.
2. THE `ml/ALGORITHMS.md` SHALL describe the Two_Phase_Training strategy including: the rationale for freezing the backbone in phase 1, the concrete learning rate value used in phase 1, and the concrete learning rate value used in phase 2.
3. THE `ml/ALGORITHMS.md` SHALL explain Cross-Entropy Loss and the Adam optimiser with weight decay by identifying what each component optimises, the numeric weight-decay value used in training, and the role of the Food-101 dataset in the training objective.
4. THE `ml/ALGORITHMS.md` SHALL describe the macro estimation pipeline by naming the following three steps in order: (1) Classifier output mapped to a category label, (2) category label used as a key to look up per-100 g values in Nutrition_DB, (3) per-100 g values scaled by Serving_Size to produce the displayed macros.
5. THE `ml/ALGORITHMS.md` SHALL list the following known limitations of the current approach: fixed serving sizes, 101-category scope, and confidence threshold heuristic.
6. THE `ml/ALGORITHMS.md` SHALL describe how future user corrections can be used as retraining data by specifying: the data items captured per correction (original image, corrected label, confidence score), the minimum number of corrections that should trigger a retraining run, and the output format of the assembled retraining dataset.
