# v1 Build Sequence (Week-by-Week)

## Week 1: Foundation + Infra
- Initialize SvelteKit app structure (public + admin route groups).
- Connect Supabase (Auth, DB client, Storage client).
- Apply base migration:
  - [`supabase/migrations/20260224_portfolio_v1.sql`](/Users/ben/Dev/SVELTE/photography-portfolio/supabase/migrations/20260224_portfolio_v1.sql)
- Seed first admin user profile.
- Implement auth guards for `/admin/**`.
- Deliverable: admin can log in and reach empty CMS shell.

## Week 2: CMS Core (Taxonomy + Photos CRUD)
- Build categories CRUD (flat taxonomy).
- Build tags CRUD (mixed vocabulary support).
- Build photos CRUD:
  - Metadata fields (title/date/description/dimensions/license).
  - Slug management.
  - Soft archive/unarchive.
- Build photo-image manager:
  - Lead image + additional images.
  - Manual ordering.
  - Focal-point editor.
  - EXIF storage.
- Deliverable: complete photo records with ordered related images.

## Week 3: Storage + Image Pipeline + Search
- Implement upload pipeline to Supabase `photos` bucket with 20MB enforcement.
- Add Supabase Edge Function webhook to auto-transcode HEIC/HEIF uploads to JPEG/WebP delivery assets.
- Implement transformed URL presets:
  - Thumb, grid, hero, fullscreen.
- Add responsive image helper for DPR-aware sizing.
- Wire search endpoint/UI query against `photos.search_tsv`.
- In admin search, hide archived photos by default and expose "Show archived" toggle.
- Validate category/tag participation in search results.
- Deliverable: uploaded photos render quickly in transformed variants, and search works.

## Week 4: Public Grid + Filters + State Persistence
- Build gallery/index view with:
  - Full-bleed default.
  - Sticky filter/sort toolbar.
  - Infinite scroll.
  - Hover subtle zoom.
- Add runtime controls:
  - Density slider (desktop + mobile-aware constraints).
  - Max-width toggle/setting.
  - Layout mode switch (uniform/masonry from global config).
- Persist gallery state (URL + snapshot): filters, density, layout, scroll.
- Deliverable: dynamic gallery view with robust return-state behavior.

## Week 5: Fullscreen Detail Experience
- Build `/photo/[photoSlug]` and `/photo/[photoSlug]/[imageId]` cinematic views:
  - Edge-to-edge, no page scrolling.
  - Prev/next arrows that appear on pointer motion.
  - Keyboard arrows + `Esc`.
  - Touch swipe for prev/next.
- Implement additional-image filmstrip only when applicable.
- Build pinned metadata bar with minimize/maximize.
- Ensure deep-link to specific image in a set.
- Deliverable: app-like fullscreen viewer with deterministic navigation.

## Week 6: View Transition System
- Add transition orchestrator with site-wide presets:
  - `cinematic`, `snappy`, `experimental`.
- Implement transitions for:
  - Grid -> detail and detail -> grid.
  - Prev/next directional transitions.
  - Filter/sort/grid-density changes.
  - UI chrome entering/exiting.
- Add fallback logic:
  - Unsupported browsers: instant swap.
  - Reduced motion: minimal fade.
- Deliverable: consistent, high-performance transition language across major flows.

## Week 7: Pages CMS + Homepage Curation + SEO
- Build pages CMS:
  - Home/About/Contact/custom pages.
  - Constrained HTML + isolated CSS fields.
  - Revision history + rollback UI from `content_revisions`.
- Build homepage slideshow curator from existing photo images (order/select).
- Keep slideshow image-only by default (optional text overlays can be deferred).
- Keep contact page as static form UI in MVP (provider integration deferred).
- Implement SEO essentials:
  - Photo canonical routes.
  - OG controls for photos/pages.
  - Auto-generated image sitemap endpoint.
- Deliverable: complete content-managed public site structure.

## Week 8: Hardening + QA + Launch Readiness
- Performance pass:
  - LCP/CLS/INP checks.
  - Fine-tune eager/lazy strategy.
- Accessibility pass toward WCAG 2.1 AA:
  - Keyboard support, focus states, contrast in light/dark/system.
  - Motion accessibility checks.
- Security pass:
  - Verify RLS behavior across all roles.
  - Ensure admin endpoints cannot be hit anonymously.
  - Sanitize page HTML/CSS payloads.
- Release checklist:
  - Backups for DB and storage documented.
  - Production env variables and deploy target chosen.
- Deliverable: production-ready v1.

## Parallel Tracks (run throughout)
- Visual language refinement from your references.
- Transition tuning with real content density.
- Content entry and taxonomy cleanup.
- Internal QA notes for editor/admin workflows.
