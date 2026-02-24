# v1 Architecture Decision: SvelteKit + Supabase Portfolio CMS

## Decision
Use a **Supabase-only backend and CMS** with a **custom SvelteKit admin app** in the same codebase.

This means:
- Frontend: SvelteKit (public portfolio + admin CMS routes).
- Backend: Supabase Postgres + Storage + Auth + RLS.
- Image delivery: Supabase Storage transform URLs for thumbnails/grid/fullscreen.
- CMS model: In-app admin UI (no external SaaS headless CMS for v1).

## Why This Is the Right v1
Your requirements prioritize:
- Full control over interaction design (flash-like transitions, immersive fullscreen UX).
- Self-built, simple, low recurring SaaS complexity.
- Tight coupling between custom motion/grid behavior and content model.
- Supabase-native image pipeline and role model (Admin/Editor only).

Given these constraints, a hybrid CMS (Storyblok/Directus/Sanity/etc.) adds integration overhead without clear v1 upside.

## Option Comparison

### Option A: SvelteKit + Supabase-only CMS (**Chosen**)
Pros:
- Fastest path to custom UX + custom schema.
- One auth model and one permission layer (RLS).
- No external CMS vendor constraints around page models and assets.
- Easier to implement your page-specific fields (HTML/CSS, homepage curated slideshow, transition config).

Cons:
- We build admin UX ourselves (media management, taxonomy CRUD, revisions UI).
- Responsibility for editorial ergonomics and long-term CMS polish.

### Option B: Hybrid Headless CMS + Supabase media
Pros:
- Better out-of-box editorial UI/revisions.
- Some workflows (content editing) ship faster if requirements are standard.

Cons:
- Complex sync between CMS entries and Supabase photo/taxonomy tables.
- Harder to implement custom transition-centric content relationships cleanly.
- Extra cost/vendor dependency for features you mostly don’t need in v1.

## Runtime Architecture
- Public app routes:
  - `/` (curated slideshow homepage)
  - `/gallery` (dynamic filterable grid)
  - `/photo/[photoSlug]` (fullscreen detail default lead image)
  - `/photo/[photoSlug]/[imageId]` (deep-link to a specific additional image)
  - `/about`, `/contact`, `/[staticPageSlug]`
  - `/search`
- Admin routes:
  - `/admin/photos`
  - `/admin/categories`
  - `/admin/tags`
  - `/admin/pages`
  - `/admin/homepage`
  - `/admin/settings`
  - `/admin/audit`

## Frontend Interaction Strategy
- Use route-based navigation (shareable URLs), enhanced with View Transition API where supported.
- Preserve gallery state on return:
  - Persist filters/sort/grid density/scroll with SvelteKit snapshots + URL params.
- Fullscreen detail:
  - No vertical/horizontal page scroll.
  - Prev/next via keyboard, pointer motion controls, and swipe on touch.
  - Additional-image filmstrip only when a photo has additional images.
- Fallback:
  - Unsupported transition browsers use instant swap.
  - `prefers-reduced-motion` uses minimal fades.

## Image Pipeline Strategy
- Originals uploaded once to Supabase Storage.
- Upload flow uses a Supabase Edge Function webhook on `source/` object inserts.
- HEIC/HEIF sources are auto-converted on upload to browser-safe delivery assets (JPEG/WebP).
- On-the-fly transformed delivery for:
  - Thumb
  - Grid
  - Hero/home slideshow
  - Fullscreen
- Focal-point aware crop parameters stored per image.
- Eager loading for above-the-fold images; lazy for offscreen.
- 20MB max upload enforced server-side and UI-side.

## CMS Strategy
- Constrained page model:
  - `html_content` and `css_module` fields per page.
  - Strict sanitization/allowlist for HTML before publish.
  - No `iframe` embeds in v1 allowlist.
  - CSS namespaced per page wrapper to prevent cross-page leakage.
- No draft workflow for v1:
  - Save == publish.
  - Every publish creates immutable revision snapshot.
- Homepage curation:
  - Select and order existing photo images.
  - Image-only slides by default.

## Security & Access
- Roles: `admin`, `editor`.
- Public reads only published/non-archived content.
- Admin/editor write via RLS-protected tables.
- `transition_preset` and theme token updates (`tailwind_palette`) are admin-only.
- Immutable audit log for key mutations.

## Hosting Recommendation (v1)
- Selected target: **Vercel + Supabase (US West)** for fastest SvelteKit deployment loop.
- Keep architecture adapter-compatible so moving to Netlify/Cloudflare later is low risk.

## Out-of-Scope for v1
- Multi-tenant photographer accounts.
- Private client galleries.
- Complex approval workflows.
- CRM integrations.

## Upgrade Path (v2+)
- Add staged environments (separate Supabase projects).
- Add externalized contact delivery provider.
- Optional migration to hybrid CMS only if editorial complexity grows beyond custom admin capacity.
