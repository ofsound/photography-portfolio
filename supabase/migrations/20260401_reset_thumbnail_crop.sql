update public.photo_images
set
  thumb_crop_x = null,
  thumb_crop_y = null,
  thumb_crop_zoom = null
where
  thumb_crop_x is not null
  or thumb_crop_y is not null
  or thumb_crop_zoom is not null;
