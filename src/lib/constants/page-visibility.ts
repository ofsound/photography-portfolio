import type { Database } from '$lib/types/database';

export type PageVisibilityStatus =
  Database['public']['Enums']['page_visibility_status'];

export const PAGE_VISIBILITY_OPTIONS: Array<{
  value: PageVisibilityStatus;
  label: string;
  description: string;
}> = [
  {
    value: 'public',
    label: 'Public',
    description: 'Show in nav and direct URLs.',
  },
  {
    value: 'unlisted',
    label: 'Unlisted',
    description: 'Available by direct URL only.',
  },
  {
    value: 'draft',
    label: 'Draft',
    description: 'Hidden from public routes. CMS users can still preview/edit.',
  },
];

export const PAGE_VISIBILITY_LABELS: Record<PageVisibilityStatus, string> = {
  public: 'public',
  unlisted: 'unlisted',
  draft: 'draft',
};
