import { z } from 'zod';

export const tagCreateSchema = z.object({
	name: z.string().trim().min(1, 'Title/name is required.'),
	slug: z.string().trim().default(''),
	description: z.string().trim().default(''),
	is_active: z
		.enum(['on', 'true', '1', 'false', '0', ''])
		.default('true')
		.transform((v) => v === 'on' || v === 'true' || v === '1'),
});

export const tagUpdateSchema = tagCreateSchema.extend({
	id: z.string().min(1, 'Missing tag id.'),
});

export const tagRemoveSchema = z.object({
	id: z.string().min(1, 'Missing tag id.'),
});
