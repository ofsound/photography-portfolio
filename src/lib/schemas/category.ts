import { z } from 'zod';

const activeStateSchema = z.enum(['on', 'true', '1', 'false', '0', '']);

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'Title/name is required.'),
  slug: z.string().trim().default(''),
  description: z.string().trim().default(''),
  is_active: activeStateSchema
    .default('true')
    .transform((v) => v === 'on' || v === 'true' || v === '1'),
});

export const categoryUpdateSchema = z.object({
  id: z.string().min(1, 'Missing category id.'),
  name: z.string().trim().min(1, 'Title/name is required.'),
  slug: z.string().trim().default(''),
  description: z.string().trim().default(''),
  is_active: activeStateSchema
    .default('')
    .transform((v) => v === 'on' || v === 'true' || v === '1'),
});

export const categoryRemoveSchema = z.object({
  id: z.string().min(1, 'Missing category id.'),
});
