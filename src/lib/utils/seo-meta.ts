type NullableText = string | null | undefined;

const normalizeText = (value: NullableText) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length ? trimmed : null;
};

type SeoOgMetaInput = {
  entityTitle: NullableText;
  entityDescription?: NullableText;
  seoTitle?: NullableText;
  seoDescription?: NullableText;
  ogTitle?: NullableText;
  ogDescription?: NullableText;
  ogImagePath?: NullableText;
  fallbackOgImagePath?: NullableText;
};

type ResolvedSeoOgMeta = {
  title: string;
  description: string | null;
  ogTitle: string;
  ogDescription: string | null;
  ogImage: string | null;
};

export const resolveSeoOgMeta = (input: SeoOgMetaInput): ResolvedSeoOgMeta => {
  const entityTitle = normalizeText(input.entityTitle);
  const entityDescription = normalizeText(input.entityDescription);
  const seoTitle = normalizeText(input.seoTitle);
  const seoDescription = normalizeText(input.seoDescription);
  const ogTitle = normalizeText(input.ogTitle);
  const ogDescription = normalizeText(input.ogDescription);
  const ogImagePath = normalizeText(input.ogImagePath);
  const fallbackOgImagePath = normalizeText(input.fallbackOgImagePath);

  const title = seoTitle ?? entityTitle ?? 'Untitled';
  const description = seoDescription ?? entityDescription;

  return {
    title,
    description,
    ogTitle: ogTitle ?? title,
    ogDescription: ogDescription ?? description,
    ogImage: ogImagePath ?? fallbackOgImagePath,
  };
};
