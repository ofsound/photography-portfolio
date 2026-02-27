export type PhotoImage = {
  id: string;
  kind: 'lead' | 'additional';
  delivery_storage_path: string;
  dimensions: string | null;
  position: number;
  alt_text: string | null;
};

export type PhotoWithImages = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  capture_date: string | null;
  dimensions: string | null;
  photo_images: PhotoImage[];
};

// Admin types (match server load return shapes)
export type AdminPhotoImage = {
  id: string;
  photo_id: string;
  kind: 'lead' | 'additional';
  position: number;
  source_storage_path: string;
  delivery_storage_path: string | null;
  source_mime_type: string;
  source_bytes: number;
  alt_text: string | null;
  dimensions: string | null;
  thumb_crop_x: number | null;
  thumb_crop_y: number | null;
  thumb_crop_zoom: number | null;
  created_at: string;
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export type AdminTag = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export type AdminPhoto = {
  id: string;
  slug: string;
  title: string;
  capture_date: string | null;
  description: string | null;
  dimensions: string | null;
  license_text: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_path: string | null;
  status: string;
  is_searchable: boolean;
  deleted_at: string | null;
  updated_at: string;
};

export type HomepageSlide = {
  id: string;
  photo_image_id: string;
  position: number;
  is_active: boolean;
  kind: 'lead' | 'additional';
  delivery_storage_path: string | null;
  photo_title: string;
  photo_slug: string | null;
};

export type HomepageImage = {
  id: string;
  kind: 'lead' | 'additional';
  position: number;
  delivery_storage_path: string | null;
  photo_title: string;
  photo_slug: string | null;
};

export type ContentRevision = {
  id: number;
  entity_type: string;
  entity_pk: string;
  version_no: number;
  changed_at: string;
  changed_by: string | null;
  snapshot: Record<string, unknown>;
};

export type GalleryPhoto = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  capture_date: string | null;
  thumb: string | null;
  thumbAlt: string;
  leadImage: {
    id: string;
    kind: 'lead' | 'additional';
    position: number;
    delivery_storage_path: string;
    alt_text: string | null;
    dimensions: string | null;
    thumb_crop_x: number | null;
    thumb_crop_y: number | null;
    thumb_crop_zoom: number | null;
  } | null;
  additionalImages: Array<{
    id: string;
    kind: 'lead' | 'additional';
    position: number;
    delivery_storage_path: string;
    alt_text: string | null;
    dimensions: string | null;
    thumb_crop_x: number | null;
    thumb_crop_y: number | null;
    thumb_crop_zoom: number | null;
  }>;
};
