# Final v1 Data Schema + RLS Matrix

Migration file: [`supabase/migrations/20260224_portfolio_v1.sql`](/Users/ben/Dev/SVELTE/photography-portfolio/supabase/migrations/20260224_portfolio_v1.sql)

## Core Tables
- `profiles`: maps `auth.users` to app role (`admin`, `editor`).
- `site_settings`: singleton site-wide config (theme mode, grid defaults/max, layout mode, thumb ratio, transition preset, theme token map).
- `categories`: flat taxonomy set, editable.
- `tags`: editable mixed taxonomy.
- `photos`: primary photograph records (metadata, SEO fields, soft archive, search vectors).
- `photo_images`: lead/additional image assets for each photo (ordered, EXIF, source asset + browser-delivery asset paths).
- `photo_categories`: many-to-many photo/category links.
- `photo_tags`: many-to-many photo/tag links.
- `homepage_slides`: ordered homepage slideshow source from existing `photo_images`.
- `pages`: Home/About/Contact/custom static pages with constrained HTML/CSS fields.
- `content_revisions`: immutable revision snapshots for rollback (`pages`, `site_settings`).
- `audit_log`: immutable change audit stream.

## Key Data Rules
- A photo must have at most one lead image (`photo_images_single_lead_per_photo` partial unique index).
- Additional images are manually ordered with `position`.
- Categories are flat (no parent/child relation).
- Photos are soft-archived via `deleted_at` and `status = 'archived'`.
- Search index (`photos.search_tsv`) is refreshed from title + description + linked tags/categories via triggers.
- Upload limit is enforced at DB/storage policy level to 20MB per object.
- HEIC/HEIF uploads are represented as source assets and paired with converted delivery assets (JPEG/WebP).
- Delivery fields can be null immediately after upload until the conversion function completes.
- Homepage curation is explicit and ordered.

## Storage
- Bucket: `photos` (public read).
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`.
- CMS write access to bucket restricted to `admin`/`editor`.

## RLS Policy Matrix

| Resource | Public (anon) | Authenticated (non-editor) | Editor | Admin |
|---|---|---|---|---|
| `profiles` | No | Own row only | Own row only | Full read/write |
| `site_settings` | Read | Read | Read/write | Read/write |
| `categories` | Read active | Read active | Full read/write | Full read/write |
| `tags` | Read active | Read active | Full read/write | Full read/write |
| `photos` | Read published + not deleted | Read published + not deleted | Full read/write | Full read/write |
| `photo_images` | Read active linked to published photos | Same as public | Full read/write | Full read/write |
| `photo_categories` | Read links for published photos | Same as public | Full read/write | Full read/write |
| `photo_tags` | Read links for published photos | Same as public | Full read/write | Full read/write |
| `homepage_slides` | Read active slides linked to published photos | Same as public | Full read/write | Full read/write |
| `pages` | Read published + not deleted | Same as public | Full read/write | Full read/write |
| `content_revisions` | No | No | Read + trigger-driven insert | Read + trigger-driven insert |
| `audit_log` | No | No | Read + trigger-driven insert | Read + trigger-driven insert |
| `storage.objects` in `photos` bucket | Read | Read | Full read/write | Full read/write |

`site_settings` note: although editors can update general layout fields, `transition_preset` and `tailwind_palette` are blocked at trigger level for non-admin users.

## Bootstrap Requirement
The first `admin` profile must be seeded with the Supabase service role (or SQL editor as owner), because no user is admin before initial bootstrap.

## Notes for v1 App Implementation
- Keep CMS mutations server-side only (`+page.server.ts`/`+server.ts`) to avoid accidental direct client writes.
- Sanitize `pages.html_content` before write and namespace/sanitize `pages.css_module`.
- Route-level logic should treat `photos.deleted_at is not null` as non-public.
- Admin search should default to excluding archived photos; include an explicit "Show archived" toggle.
- Additional-image deep links should use path routing: `/photo/[photoSlug]/[imageId]`.
- Use strict page HTML sanitization that excludes `iframe` in v1.
