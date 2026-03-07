import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getCmsRole } from '$lib/server/admin-helpers';
import { resolveGalleryForAdmin } from '$lib/server/admin/galleries';
import { createMinimalDraftPhoto } from '$lib/server/admin/photos/photo-core';
import { uploadImageWithForm } from '$lib/server/admin/photos/photo-images';

const deriveSeedFromFilename = (filename: string) => {
  const withoutExtension = filename.replace(/\.[^.]+$/, '');
  const normalized = withoutExtension
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || 'New Photo';
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const role = await getCmsRole(locals);
  if (role !== 'admin' && role !== 'editor') {
    return json(
      { success: false, message: 'CMS access denied.' },
      { status: 403 },
    );
  }

  const resolved = await resolveGalleryForAdmin(locals, params.gallerySlug);
  if (resolved.kind !== 'gallery') {
    return json(
      { success: false, message: 'Gallery not found.' },
      { status: 404 },
    );
  }
  const gallery = resolved.gallery;

  const form = await request.formData();
  const imageFile = form.get('image_file');

  if (!(imageFile instanceof File) || !imageFile.size) {
    return json(
      { success: false, message: 'Select an image file.' },
      { status: 400 },
    );
  }

  const seed = deriveSeedFromFilename(imageFile.name);

  let photoId: string;
  try {
    const created = await createMinimalDraftPhoto(locals, {
      title: seed,
      slug: seed,
      galleryId: gallery.id,
    });
    photoId = created.id;
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Failed to create draft photo.';
    return json({ success: false, message }, { status: 400 });
  }

  const uploadForm = new FormData();
  uploadForm.set('photo_id', photoId);
  uploadForm.set('gallery_id', gallery.id);
  uploadForm.set('image_file', imageFile);
  uploadForm.set('kind', 'lead');
  uploadForm.set('alt_text', '');

  const result = await uploadImageWithForm(locals, uploadForm);
  if ('success' in result && result.success) {
    return json({ success: true, photoId, message: result.message });
  }

  const failure = result as { status?: number; data?: { message?: string } };
  const status = typeof failure.status === 'number' ? failure.status : 400;
  const message = failure.data?.message ?? 'Failed to upload image.';
  return json({ success: false, message }, { status });
};
