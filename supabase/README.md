# Supabase Configuration

This directory contains SQL migrations and storage configuration for the
fitnessandifree app.

---

## Prerequisites — run these steps before starting the API route

The API route at `app/api/nutrition/analyze/route.ts` uploads food images to
Supabase Storage and writes rows to the `meal_logs` table.  **Both the storage
bucket and the database migration must be set up before the route will work.**

---

## 1. Apply the database migration

Run the SQL migration to create the `meal_logs` table and its index:

```bash
# Using the Supabase CLI
supabase db push
# or apply the file directly against your project
supabase db reset   # development only — drops and recreates the database
```

Alternatively, open the Supabase dashboard → SQL Editor and paste the contents
of `migrations/create_meal_logs.sql`.

---

## 2. Create the `meal-images` storage bucket

Supabase Storage buckets are not created via SQL migrations.  You must create
the bucket manually using one of the methods below.

> ⚠️ **This step must be completed before making any requests to the API route.**
> Without the bucket, image uploads will fail with a 502 error.

### Option A — Supabase Dashboard (recommended for first-time setup)

1. Open your project in the [Supabase Dashboard](https://app.supabase.com).
2. Navigate to **Storage** in the left sidebar.
3. Click **New bucket**.
4. Set the bucket name to exactly: `meal-images`
5. Leave **Public bucket** unchecked (the bucket must be **private / non-public**).
6. Click **Create bucket**.

### Option B — Supabase CLI

```bash
supabase storage create meal-images
```

The CLI creates buckets as private by default.  Confirm with:

```bash
supabase storage ls
```

The output should list `meal-images`.

---

## 3. Bucket configuration reference

| Setting | Value |
|---|---|
| Bucket name | `meal-images` |
| Public access | `false` — objects are **not** accessible via unauthenticated public URLs |
| Signed URL validity | 1 second (minimum) – 3600 seconds (maximum) |

All object access requires a **signed URL** generated server-side via:

```typescript
const { data, error } = await supabase.storage
  .from('meal-images')
  .createSignedUrl(path, expiresIn); // expiresIn: 1–3600 seconds
```

Requests without a valid signed URL are rejected with an access-denied
response.  The `expiresIn` value passed by the API route must be within the
1–3600 second window.

> See `supabase/storage.sql` for the full machine-readable configuration
> comment block that is version-controlled alongside the schema.

---

## 4. Environment variables

Ensure these variables are set in `.env.local` (development) and in your
deployment environment before running the app:

```bash
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-secret-key>   # never expose this client-side
ML_MODEL_URL=http://localhost:8000               # or your deployed inference server URL
```

---

## File overview

| File | Purpose |
|---|---|
| `migrations/create_meal_logs.sql` | Creates the `meal_logs` table and composite index (idempotent) |
| `storage.sql` | Documents the `meal-images` bucket configuration (reference only — not executed by Supabase) |
| `README.md` | This file — setup prerequisites and instructions |
