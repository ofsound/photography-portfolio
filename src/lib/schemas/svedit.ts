import { z } from 'zod';

export const sveditSaveSchema = z.object({
	svedit_doc: z.string().trim().default(''),
});
