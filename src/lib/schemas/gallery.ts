import { z } from 'zod';

export const galleryCreateSchema = z.object({
	name: z.string().trim().min(1, 'Name is required.'),
	slug: z.string().trim().default(''),
	visibility_status: z.string().trim().default('draft'),
});

export const galleryReorderSchema = z.object({
	ordered_gallery_ids: z.string().min(1, 'Missing reorder payload.'),
});

export const galleryDetailsSaveSchema = z.object({
	name: z.string().trim().default(''),
	slug: z.string().trim().default(''),
	visibility_status: z.string().trim().default('draft'),
	description: z.string().trim().default(''),
	seo_title: z.string().trim().default(''),
	seo_description: z.string().trim().default(''),
	og_title: z.string().trim().default(''),
	og_description: z.string().trim().default(''),
	og_image_path: z.string().trim().default(''),
});
