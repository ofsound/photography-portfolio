import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { getCmsRole } from '$lib/server/admin-helpers';
import { uploadImageWithForm } from '$lib/server/admin/photos/photo-images';

export const POST: RequestHandler = async ({ locals, request }) => {
  const role = await getCmsRole(locals);
  if (role !== 'admin' && role !== 'editor') {
    return json(
      { success: false, message: 'CMS access denied.' },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const result = await uploadImageWithForm(locals, form);

  if ('success' in result && result.success) {
    return json({ success: true, message: result.message });
  }

  const failure = result as { status?: number; data?: { message?: string } };
  const status = typeof failure.status === 'number' ? failure.status : 400;
  const message = failure.data?.message ?? 'Failed to upload image.';
  return json({ success: false, message }, { status });
};
