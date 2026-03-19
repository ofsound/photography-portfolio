import { z } from 'zod';

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
