export type PhotoImage = {
  id: string;
  kind: 'lead' | 'additional';
  delivery_storage_path: string;
  width_px: number | null;
  height_px: number | null;
  focal_x: number;
  focal_y: number;
  position: number;
  alt_text: string | null;
};

export type PhotoWithImages = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  capture_date: string | null;
  width_px: number | null;
  height_px: number | null;
  photo_images: PhotoImage[];
};
