import type { Database } from '$lib/types/database';

export type GalleryVisibilityStatus =
  Database['public']['Enums']['gallery_visibility_status'];

export const GALLERY_VISIBILITY_OPTIONS: Array<{
  value: GalleryVisibilityStatus;
  label: string;
  description: string;
}> = [
  {
    value: 'public',
    label: 'Public',
    description: 'Show in nav, search, /all, feeds, and direct URLs.',
  },
  {
    value: 'unlisted',
    label: 'Unlisted',
    description: 'Available only by direct gallery or photo URL.',
  },
  {
    value: 'archived',
    label: 'Archived',
    description: 'Only available in the gallery editor. Public routes 404.',
  },
];

export const GALLERY_VISIBILITY_LABELS: Record<
  GalleryVisibilityStatus,
  string
> = {
  public: 'Public',
  unlisted: 'Unlisted',
  archived: 'Archived',
};
