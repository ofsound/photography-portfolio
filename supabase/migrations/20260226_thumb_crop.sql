-- Add thumbnail crop columns for lead images (arbitrary square crop for grid view)
alter table public.photo_images
  add column thumb_crop_x numeric(4, 3) check (thumb_crop_x is null or (thumb_crop_x >= 0 and thumb_crop_x <= 1)),
  add column thumb_crop_y numeric(4, 3) check (thumb_crop_y is null or (thumb_crop_y >= 0 and thumb_crop_y <= 1)),
  add column thumb_crop_zoom numeric(5, 3) check (thumb_crop_zoom is null or thumb_crop_zoom >= 1);
