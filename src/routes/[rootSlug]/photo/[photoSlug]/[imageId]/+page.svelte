<script lang="ts">
  import { resolveSeoOgMeta } from '$lib/utils/seo-meta';
  import { photoPublicUrl } from '$lib/utils/storage-url';

  const { data } = $props();

  const photoMeta = $derived.by(() => {
    const activeRoute = data.active;
    const activePhotoSlug =
      typeof activeRoute?.photoSlug === 'string' ? activeRoute.photoSlug : '';
    if (!activePhotoSlug) return null;

    const activePhoto =
      data.photos.find(
        (photo: { slug?: string }) => photo.slug === activePhotoSlug,
      ) ?? null;
    if (!activePhoto) return null;

    const activeImagePath =
      typeof activeRoute?.imageId === 'string' && activeRoute.imageId
        ? (activePhoto.additionalImages.find(
            (image: { id: string; delivery_storage_path: string }) =>
              image.id === activeRoute.imageId,
          )?.delivery_storage_path ?? null)
        : null;
    const fallbackImagePath =
      activeImagePath ?? activePhoto.leadImage?.delivery_storage_path ?? null;

    return resolveSeoOgMeta({
      entityTitle: activePhoto.title,
      entityDescription: activePhoto.description,
      seoTitle: activePhoto.seo_title,
      seoDescription: activePhoto.seo_description,
      ogTitle: activePhoto.og_title,
      ogDescription: activePhoto.og_description,
      ogImagePath: activePhoto.og_image_path,
      fallbackOgImagePath: fallbackImagePath
        ? photoPublicUrl(fallbackImagePath, 1600)
        : null,
    });
  });
</script>

<svelte:head>
  {#if photoMeta}
    <title>{photoMeta.title}</title>
    <meta property="og:title" content={photoMeta.ogTitle} />
    {#if photoMeta.description}
      <meta name="description" content={photoMeta.description} />
    {/if}
    {#if photoMeta.ogDescription}
      <meta property="og:description" content={photoMeta.ogDescription} />
    {/if}
    {#if photoMeta.ogImage}
      <meta property="og:image" content={photoMeta.ogImage} />
    {/if}
  {:else}
    <title>Photo</title>
  {/if}
</svelte:head>
