import type { AdminPhoto } from '$lib/types/content';

export const toggleSelectedPhotoIds = (selectedPhotoIds: string[], photoId: string, checked: boolean) => {
  if (checked) {
    if (selectedPhotoIds.includes(photoId)) return selectedPhotoIds;
    return [...selectedPhotoIds, photoId];
  }
  return selectedPhotoIds.filter((id) => id !== photoId);
};

export const selectAllPhotoIds = (photos: AdminPhoto[]) => photos.map((photo) => photo.id);

export const addTaxonomyDraftId = (draftIds: string[], id: string) => {
  if (draftIds.includes(id)) return draftIds;
  return [...draftIds, id];
};

export const removeTaxonomyDraftId = (draftIds: string[], id: string) => {
  if (!draftIds.includes(id)) return draftIds;
  return draftIds.filter((item) => item !== id);
};

export const clearTaxonomyDraftIds = (categories: string[], tags: string[]) => {
  const changed = categories.length > 0 || tags.length > 0;
  return {
    changed,
    categories: changed ? [] : categories,
    tags: changed ? [] : tags
  };
};
