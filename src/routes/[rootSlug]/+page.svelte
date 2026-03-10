<script lang="ts">
  import { page } from '$app/state';

  import CmsPageView from '$lib/components/CmsPageView.svelte';
  import { resolveSeoOgMeta } from '$lib/utils/seo-meta';
  import { photoPublicUrl } from '$lib/utils/storage-url';

  const { data, form } = $props();
  const DEFAULT_PAGE_MAX_WIDTH_PX = 1280;

  const toPositiveInteger = (value: unknown) => {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  };

  const isSveditPage = $derived(data.customPage?.editor_mode === 'svedit');
  const canEditPublicly = $derived(Boolean(data.canEditPublicPages));
  const defaultPageMaxWidthPx = $derived(
    toPositiveInteger(data.siteSettings?.default_page_max_width_px) ??
      DEFAULT_PAGE_MAX_WIDTH_PX,
  );
  const customPageMaxWidthPx = $derived(
    toPositiveInteger(data.customPage?.max_width_override_px) ??
      defaultPageMaxWidthPx,
  );
  const customPageContainerStyle = $derived(
    `max-width: min(100%, ${customPageMaxWidthPx}px);`,
  );
  const galleryMeta = $derived.by(() => {
    if (
      data.viewerMode !== 'gallery' ||
      !data.galleryScope ||
      data.galleryScope.kind !== 'gallery'
    ) {
      return null;
    }

    const firstLeadImagePath =
      data.photos.find(
        (photo: {
          leadImage?: { delivery_storage_path?: string | null } | null;
        }) => Boolean(photo.leadImage?.delivery_storage_path),
      )?.leadImage?.delivery_storage_path ?? null;

    return resolveSeoOgMeta({
      entityTitle: data.galleryScope.name,
      entityDescription: data.galleryScope.description,
      seoTitle: data.galleryScope.seoTitle,
      seoDescription: data.galleryScope.seoDescription,
      ogTitle: data.galleryScope.ogTitle,
      ogDescription: data.galleryScope.ogDescription,
      ogImagePath: data.galleryScope.ogImagePath,
      fallbackOgImagePath: firstLeadImagePath
        ? photoPublicUrl(firstLeadImagePath, 1600)
        : null,
    });
  });
  const customPageMeta = $derived.by(() => {
    if (data.viewerMode !== 'page' || !data.customPage) return null;

    return resolveSeoOgMeta({
      entityTitle: data.customPage.title,
      seoTitle: data.customPage.seo_title,
      seoDescription: data.customPage.seo_description,
      ogTitle: data.customPage.og_title,
      ogDescription: data.customPage.og_description,
      ogImagePath: data.customPage.og_image_path,
      fallbackOgImagePath: data.customPage.bg_image_url,
    });
  });
  const isEditMode = $derived(
    canEditPublicly &&
      isSveditPage &&
      (Boolean(data.initialPublicEditMode) ||
        page.url.searchParams.get('edit') === '1'),
  );
</script>

<svelte:head>
  {#if galleryMeta}
    <title>{galleryMeta.title}</title>
    <meta property="og:title" content={galleryMeta.ogTitle} />
    {#if galleryMeta.description}
      <meta name="description" content={galleryMeta.description} />
    {/if}
    {#if galleryMeta.ogDescription}
      <meta property="og:description" content={galleryMeta.ogDescription} />
    {/if}
    {#if galleryMeta.ogImage}
      <meta property="og:image" content={galleryMeta.ogImage} />
    {/if}
  {:else if customPageMeta}
    <title>{customPageMeta.title}</title>
    <meta property="og:title" content={customPageMeta.ogTitle} />
    {#if customPageMeta.description}
      <meta name="description" content={customPageMeta.description} />
    {/if}
    {#if customPageMeta.ogDescription}
      <meta property="og:description" content={customPageMeta.ogDescription} />
    {/if}
    {#if customPageMeta.ogImage}
      <meta property="og:image" content={customPageMeta.ogImage} />
    {/if}
  {/if}
</svelte:head>

{#if form?.message}
  <p
    class="mx-auto mt-4 w-full px-5 text-sm text-red-600"
    style={customPageContainerStyle}
  >
    {form.message}
  </p>
{/if}

{#if data.viewerMode === 'page' && data.customPage}
  {#if data.customPage.bg_image_url}
    <div class="relative min-h-screen">
      <img
        src={data.customPage.bg_image_url}
        alt=""
        aria-hidden="true"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <div class="relative z-10">
        <CmsPageView
          page={data.customPage}
          editable={isEditMode}
          maxWidthPx={customPageMaxWidthPx}
        />
      </div>
    </div>
  {:else}
    <CmsPageView
      page={data.customPage}
      editable={isEditMode}
      maxWidthPx={customPageMaxWidthPx}
    />
  {/if}
{/if}
