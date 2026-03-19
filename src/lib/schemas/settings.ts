import { z } from 'zod';

export const siteSettingsSchema = z.object({
	site_theme_default: z.string().trim().default('system'),
	transition_preset: z.string().trim().default('cinematic'),
	public_font_import_url: z.string().trim().default(''),
	public_font_family: z.string().trim().default(''),
	admin_font_import_url: z.string().trim().default(''),
	admin_font_family: z.string().trim().default(''),
	show_search_link_in_nav: z
		.enum(['on', 'true', '1', 'false', '0', ''])
		.default('')
		.transform((v) => v === 'on' || v === 'true' || v === '1'),
	default_page_max_width_px: z.string().trim().default(''),
	brand_light_hex: z.string().trim().default(''),
	brand_dark_hex: z.string().trim().default(''),
	brand_contrast_light_hex: z.string().trim().default(''),
	brand_contrast_dark_hex: z.string().trim().default(''),
});
