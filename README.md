# Photography Portfolio (SvelteKit + Supabase)

v1 scaffold implementing the agreed architecture for:
- Public portfolio experience (home slideshow, gallery, fullscreen photo view)
- Admin CMS route group placeholders
- Supabase-backed data/auth/storage integration points
- Edge Function skeleton for source image conversion workflow

## Stack
- SvelteKit 2 + Svelte 5
- Vercel adapter
- Tailwind CSS
- Supabase Postgres/Auth/Storage + RLS

## Run
```bash
npm i
cp .env.example .env
npm run dev
```

Required env vars:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred) or `PUBLIC_SUPABASE_ANON_KEY` (legacy)
- `SUPABASE_SECRET_KEY` (preferred) or `SUPABASE_SERVICE_ROLE_KEY` (legacy; used by Edge Function)
- `PUBLIC_SITE_URL`

## Database
Apply migration:
- [`supabase/migrations/20260224_portfolio_v1.sql`](/Users/ben/Dev/SVELTE/photography-portfolio/supabase/migrations/20260224_portfolio_v1.sql)

## Edge Function
Function path:
- [`supabase/functions/image-convert-on-upload/index.ts`](/Users/ben/Dev/SVELTE/photography-portfolio/supabase/functions/image-convert-on-upload/index.ts)

Deploy and attach as storage webhook for:
- bucket `photos`
- inserted objects under `source/`

## Routes Scaffolded
Public:
- `/`
- `/gallery`
- `/photo/[photoSlug]`
- `/photo/[photoSlug]/[imageId]`
- `/about`
- `/contact` (static non-functional form)
- `/search`
- `/[staticPageSlug]`
- `/auth`

Admin (guarded by role):
- `/admin`
- `/admin/photos`
- `/admin/categories`
- `/admin/tags`
- `/admin/pages`
- `/admin/homepage`
- `/admin/settings`
- `/admin/audit`

## Current Status
Frontend/application phase is implemented for v1 scope:
1. Admin CRUD flows for photos/categories/tags/pages/settings/homepage curation.
2. Upload UI + source/delivery row lifecycle management in admin.
3. Directional View Transition choreography (grid/detail, detail/detail prev-next) with presets.
4. Gallery infinite scroll with runtime controls (density, uniform/masonry, full/constrained).
5. Fullscreen cinematic viewer with keyboard, swipe, immersive chrome hide, and return-state restoration.

Next step is Supabase environment hookup (project keys, migration apply, storage bucket/webhook, first admin seed).
