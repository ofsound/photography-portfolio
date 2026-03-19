import { z } from 'zod';

export const homepageSlideshowSaveSchema = z.object({
  ordered_image_ids: z.string().default(''),
  slide_duration_ms: z.string().default(''),
  transition_duration_ms: z.string().default(''),
  zoom_strength_pct: z.string().default(''),
  pan_strength_pct: z.string().default(''),
});

export const homepageHeroSaveSchema = z.object({
  id: z.string().trim().default(''),
  slug: z.string().trim().default('home'),
  title: z.string().trim().min(1, 'Title is required.'),
  visibility_status: z.enum(['draft', 'public']).default('draft'),
  editor_mode: z.enum(['code', 'svedit']).default('code'),
  html_content: z.string().default(''),
  css_module: z.string().default(''),
  svedit_doc: z.string().default(''),
  seo_title: z.string().trim().default(''),
  seo_description: z.string().trim().default(''),
  og_title: z.string().trim().default(''),
  og_description: z.string().trim().default(''),
  og_image_path: z.string().trim().default(''),
  hero_vertical_alignment_pct: z.string().trim().default(''),
});

export const homepageHeroRollbackSchema = z.object({
  id: z.string().trim().min(1, 'Missing home page id.'),
  revision_id: z.string().min(1, 'Invalid revision id.'),
});
