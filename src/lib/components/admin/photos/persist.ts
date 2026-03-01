const postActionForm = async (pathname: string, action: string, body: FormData) => {
  const res = await fetch(`${pathname}?/${action}`, {
    method: 'POST',
    body
  });
  return res.ok;
};

export const persistAdditionalOrder = async (pathname: string, photoId: string, orderedIds: string[]) => {
  const formData = new FormData();
  formData.append('photo_id', photoId);
  formData.append('ordered_image_ids', orderedIds.join('\n'));
  return postActionForm(pathname, 'reorderAdditionalImages', formData);
};

export const persistTaxonomy = async (
  pathname: string,
  photoId: string,
  categoryIds: string[],
  tagIds: string[]
) => {
  const formData = new FormData();
  formData.append('photo_id', photoId);
  for (const id of categoryIds) formData.append('category_ids', id);
  for (const id of tagIds) formData.append('tag_ids', id);
  return postActionForm(pathname, 'saveRelations', formData);
};

export const persistPhotoOrder = async (pathname: string, orderedIds: string[]) => {
  const formData = new FormData();
  formData.append('ordered_photo_ids', orderedIds.join('\n'));
  return postActionForm(pathname, 'reorderPhotos', formData);
};
