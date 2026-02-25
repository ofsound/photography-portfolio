const slugSanitizePattern = /[^a-z0-9_-]+/g;

export const createCmsScopeKey = (slug?: string | null) => {
  const normalized = (slug ?? '')
    .toLowerCase()
    .trim()
    .replace(slugSanitizePattern, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'cms-page';
};

