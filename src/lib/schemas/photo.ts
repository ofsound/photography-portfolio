import { z } from 'zod';

const photoUpsertSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.'),
  slug: z.string().trim().default(''),
  capture_date: z.string().trim().default(''),
  description: z.string().trim().default(''),
  dimensions: z.string().trim().default(''),
  license_text: z.string().trim().default(''),
  seo_title: z.string().trim().default(''),
  seo_description: z.string().trim().default(''),
  og_title: z.string().trim().default(''),
  og_description: z.string().trim().default(''),
  og_image_path: z.string().trim().default(''),
});

export const photoCreateSchema = photoUpsertSchema.extend({
  gallery_id: z.string().trim().min(1, 'Missing gallery scope.'),
});

export const photoUpdateSchema = photoUpsertSchema.extend({
  id: z.string().min(1, 'Missing photo id.'),
  gallery_id: z.string().default(''),
  redirect_to_gallery: z.string().default(''),
});

export const photoStatusSchema = z.object({
  id: z.string().min(1, 'Missing photo id.'),
  gallery_id: z.string().default(''),
});

export const bulkPhotoIdsSchema = z.object({
  selected_photo_ids: z.string().min(1, 'Select at least one photo.'),
  gallery_id: z.string().default(''),
});

export const bulkDeletePhotosSchema = bulkPhotoIdsSchema.extend({
  showArchived: z.string().default(''),
});

export const reorderPhotosSchema = z.object({
  ordered_photo_ids: z.string().min(1, 'No photo IDs provided.'),
  gallery_id: z.string().min(1, 'Reorder requires a gallery scope.'),
});

export const bulkMovePhotosSchema = z.object({
  selected_photo_ids: z.string().min(1, 'Select at least one photo.'),
  destination_gallery_id: z.string().min(1, 'Choose a destination gallery.'),
});

export const bulkAssignTaxonomySchema = z.object({
  selected_photo_ids: z.string().default(''),
  gallery_id: z.string().default(''),
  category_ids: z.union([z.string(), z.array(z.string())]).default(''),
  tag_ids: z.union([z.string(), z.array(z.string())]).default(''),
});

export const saveRelationsSchema = z.object({
  photo_id: z.string().min(1, 'Missing photo id.'),
  gallery_id: z.string().default(''),
  category_ids: z.union([z.string(), z.array(z.string())]).default(''),
  tag_ids: z.union([z.string(), z.array(z.string())]).default(''),
});

export const reorderAdditionalImagesSchema = z.object({
  photo_id: z.string().min(1, 'Missing photo id.'),
  gallery_id: z.string().default(''),
  ordered_image_ids: z.string().default(''),
});

export const setLeadSchema = z.object({
  photo_id: z.string().min(1, 'Missing image or photo id.'),
  image_id: z.string().min(1, 'Missing image or photo id.'),
  gallery_id: z.string().default(''),
});

export const removeImageSchema = z.object({
  image_id: z.string().min(1, 'Missing image id.'),
  gallery_id: z.string().default(''),
});

export const saveThumbCropSchema = z.object({
  photo_id: z.string().min(1, 'Missing photo or image id.'),
  image_id: z.string().min(1, 'Missing photo or image id.'),
  gallery_id: z.string().default(''),
  thumb_crop_x: z.string().default(''),
  thumb_crop_y: z.string().default(''),
  thumb_crop_zoom: z.string().default(''),
});

export const clearThumbCropSchema = z.object({
  photo_id: z.string().min(1, 'Missing photo or image id.'),
  image_id: z.string().min(1, 'Missing photo or image id.'),
  gallery_id: z.string().default(''),
});
