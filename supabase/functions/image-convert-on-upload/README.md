# image-convert-on-upload

Supabase Edge Function webhook for `storage.objects` INSERT events.

## Purpose
- Watch new uploads in the `photos` bucket under `source/`.
- Generate browser-delivery variants via Supabase Storage transform endpoint.
- Write converted assets to `delivery/`.
- Update `public.photo_images` delivery columns by matching `source_storage_path`.

## Path Convention
- Source upload path: `source/<photo-id>/<filename>.<ext>`
- Converted delivery path: `delivery/<photo-id>/<filename>.<converted-ext>`

This avoids webhook recursion because delivery uploads do not match `source/` prefix.

## Deploy
```bash
supabase functions deploy image-convert-on-upload
```

## Wire Storage Webhook
Create a database webhook on `storage.objects` insert that calls this function URL.

Suggested filter:
- `bucket_id = 'photos'`
- `name LIKE 'source/%'`

Set a static request header on the webhook:
- `x-webhook-secret: <your-random-secret>`

## Required Secrets
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IMAGE_CONVERT_WEBHOOK_SECRET` (must match webhook header `x-webhook-secret`)

Optional hardening:
- `IMAGE_CONVERT_WEBHOOK_SIGNATURE_SECRET`
  - If set, requests must also include `x-webhook-signature`.
  - Signature format: `sha256=<hex-hmac-of-raw-request-body>`.
  - Use this only if your webhook sender can compute dynamic HMAC signatures.

## Quick Setup
1. Generate a random secret value.
2. Set function secret:
   - `supabase secrets set IMAGE_CONVERT_WEBHOOK_SECRET=...`
3. In Supabase dashboard webhook config for this endpoint, add header:
   - `x-webhook-secret: ...`
4. Redeploy function:
   - `supabase functions deploy image-convert-on-upload`

## Current Behavior
- HEIC/HEIF -> WebP
- JPG -> JPG
- PNG -> PNG
- WebP -> WebP
