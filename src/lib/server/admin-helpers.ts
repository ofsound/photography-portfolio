const slugify = (input: string) =>
  input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const toSlug = (source: string, fallback = 'item') => {
  const value = slugify(source);
  return value || fallback;
};

export const asOptionalDate = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const asOptionalNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
};

export const asBoolean = (value: FormDataEntryValue | null) => value === 'on' || value === 'true' || value === '1';

export const asString = (value: FormDataEntryValue | null, fallback = '') => (typeof value === 'string' ? value : fallback);

export const parseUuidList = (raw: string) =>
  raw
    .split(/[\n,\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item));

export const assertTitle = (title: string) => (!title.trim() ? 'Title/name is required.' : null);

export const storageSourcePath = (photoId: string, filename: string) => {
  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');
  return `source/${photoId}/${Date.now()}-${safeName}`;
};

export const mimeToExtension = (mimeType: string) => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType === 'image/heif') return 'heif';
  return 'jpg';
};

export const allowedUploadMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export const getCmsRole = async (locals: App.Locals): Promise<'admin' | 'editor' | null> => {
  const { user } = await locals.safeGetSession();
  if (!user) return null;

  const { data } = await locals.supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (!data) return null;
  return data.role;
};
