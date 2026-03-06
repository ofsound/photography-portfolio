import type { RequestHandler } from './$types';

import { getCmsRole } from '$lib/server/admin-helpers';

export const GET: RequestHandler = async ({ locals, params }) => {
  const role = await getCmsRole(locals);
  if (role !== 'admin' && role !== 'editor') {
    return new Response('Forbidden', { status: 403 });
  }

  const imageId = params.imageId;
  if (!imageId) {
    return new Response('Not Found', { status: 404 });
  }

  const { data: row, error } = await locals.supabase
    .from('photo_images')
    .select('source_storage_path, source_mime_type')
    .eq('id', imageId)
    .single();

  if (error || !row?.source_storage_path) {
    return new Response('Not Found', { status: 404 });
  }

  const { data: blob, error: downloadError } = await locals.supabase.storage
    .from('photos')
    .download(row.source_storage_path);

  if (downloadError || !blob) {
    return new Response('Failed to download file', { status: 500 });
  }

  const filename = row.source_storage_path.split('/').pop() ?? 'original';
  const contentType = row.source_mime_type || 'application/octet-stream';

  return new Response(blob, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
};
