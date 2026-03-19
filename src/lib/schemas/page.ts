import { z } from 'zod';

const pageSaveSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.'),
  slug: z.string().trim().default(''),
  visibility_status: z.enum(['draft', 'public', 'unlisted']).default('draft'),
  seo_title: z.string().trim().default(''),
  seo_description: z.string().trim().default(''),
  og_title: z.string().trim().default(''),
  og_description: z.string().trim().default(''),
  og_image_path: z.string().trim().default(''),
  bg_image_id: z.string().trim().default(''),
  bg_image_fixed: z
    .enum(['on', 'true', 'fixed', 'false', 'scroll', ''])
    .default(''),
  max_width_override_px: z.string().trim().default(''),
  editor_mode: z.enum(['code', 'svedit']).default('code'),
  html_content: z.string().default(''),
  css_module: z.string().default(''),
  svedit_doc: z.string().default(''),
});

export const pageCreateSchema = pageSaveSchema.pick({
  title: true,
  slug: true,
  editor_mode: true,
});

export const pageUpdateSchema = pageSaveSchema.extend({
  id: z.string().min(1, 'Missing page id.'),
  original_identifier: z.string().trim().default(''),
});

export const pageDeleteSchema = z.object({
  id: z.string().min(1, 'Missing page id.'),
});

export const pageRollbackSchema = z.object({
  id: z.string().min(1, 'Missing page id.'),
  revision_id: z.string().min(1, 'Invalid revision id.'),
});

export const pageReorderSchema = z.object({
  ordered_page_ids: z.string().min(1, 'Missing reorder payload.'),
});
