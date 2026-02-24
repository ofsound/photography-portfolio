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

## Required Secrets
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Current Behavior
- HEIC/HEIF -> WebP
- JPG -> JPG
- PNG -> PNG
- WebP -> WebP
