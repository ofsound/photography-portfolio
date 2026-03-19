import { z } from 'zod';

export const homepageSlideshowSaveSchema = z.object({
	ordered_image_ids: z.string().default(''),
	slide_duration_ms: z.string().default(''),
	transition_duration_ms: z.string().default(''),
	zoom_strength_pct: z.string().default(''),
	pan_strength_pct: z.string().default(''),
});

export const homepageHeroRollbackSchema = z.object({
	id: z.string().trim().min(1, 'Missing home page id.'),
	revision_id: z.string().min(1, 'Invalid revision id.'),
});
