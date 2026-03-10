<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import CmsPageView from '$lib/components/CmsPageView.svelte';
  import HomeSlideshow from '$lib/components/HomeSlideshow.svelte';
  import { resolveSeoOgMeta } from '$lib/utils/seo-meta';

  const { data, form } = $props();

  const heroPage = $derived(data.heroPage);
  const canEditPublicly = $derived(Boolean(data.canEditPublicPages));
  const showHero = $derived(Boolean(heroPage));
  const heroVerticalAlignmentPct = $derived.by(() => {
    const value = Number(heroPage?.hero_vertical_alignment_pct ?? 50);
    if (!Number.isFinite(value)) return 50;
    return Math.min(100, Math.max(0, Math.round(value)));
  });
  const isSveditHero = $derived(heroPage?.editor_mode === 'svedit');
  const heroMeta = $derived.by(() => {
    if (!showHero || !heroPage) return null;

    return resolveSeoOgMeta({
      entityTitle: heroPage.title,
      seoTitle: heroPage.seo_title,
      seoDescription: heroPage.seo_description,
      ogTitle: heroPage.og_title,
      ogDescription: heroPage.og_description,
      ogImagePath: heroPage.og_image_path,
      fallbackOgImagePath: heroPage.bg_image_url,
    });
  });
  const isEditMode = $derived(
    showHero &&
      canEditPublicly &&
      isSveditHero &&
      (Boolean(data.initialPublicEditMode) ||
        page.url.searchParams.get('edit') === '1'),
  );

  const setEditMode = (next: boolean) => {
    if (!canEditPublicly || !showHero || !isSveditHero) return;

    const nextUrl = new URL(page.url);
    if (next) {
      nextUrl.searchParams.set('edit', '1');
    } else {
      nextUrl.searchParams.delete('edit');
    }

    const search = nextUrl.search;
    const target = `${nextUrl.pathname}${search}`;
    goto(resolve(target as `/${string}`), { replaceState: true });
  };

  const onKeydown = (event: KeyboardEvent) => {
    const isShortcut = event.metaKey || event.ctrlKey;
    if (!isShortcut || !canEditPublicly || !showHero || !isSveditHero) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.isContentEditable) return;

    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'e') {
      event.preventDefault();
      setEditMode(!isEditMode);
      return;
    }

    if (key === 's' && isEditMode) {
      const formElement = document.getElementById(
        'public-svedit-form',
      ) as HTMLFormElement | null;
      if (!formElement) return;
      event.preventDefault();
      formElement.requestSubmit();
    }
  };
</script>

<svelte:head>
  {#if heroMeta}
    <title>{heroMeta.title}</title>
    <meta property="og:title" content={heroMeta.ogTitle} />
    {#if heroMeta.description}
      <meta name="description" content={heroMeta.description} />
    {/if}
    {#if heroMeta.ogDescription}
      <meta property="og:description" content={heroMeta.ogDescription} />
    {/if}
    {#if heroMeta.ogImage}
      <meta property="og:image" content={heroMeta.ogImage} />
    {/if}
  {:else}
    <title>Home</title>
  {/if}
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<div class="relative">
  <HomeSlideshow
    slides={data.slides}
    slideDurationMs={data.slideDurationMs}
    transitionDurationMs={data.transitionDurationMs}
  />

  {#if showHero && heroPage}
    <div class="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div class="relative h-full px-5">
        <div
          class="pointer-events-auto absolute top-0 left-1/2 w-full max-w-6xl -translate-x-1/2 -translate-y-1/2"
          style={`top: ${heroVerticalAlignmentPct}%`}
        >
          <div class="w-full">
            {#if form?.message}
              <p class="mb-4 text-sm text-red-600">{form.message}</p>
            {/if}

            {#if isSveditHero && canEditPublicly}
              <div class="mb-4">
                {#if isEditMode}
                  <button
                    type="button"
                    class="rounded border border-border-strong bg-surface/95 px-3 py-2 text-xs tracking-widest uppercase backdrop-blur"
                    onclick={() => setEditMode(false)}
                  >
                    Exit edit mode
                  </button>
                {:else}
                  <button
                    type="button"
                    class="rounded border border-border-strong bg-surface/95 px-3 py-2 text-xs tracking-widest uppercase backdrop-blur"
                    onclick={() => setEditMode(true)}
                  >
                    Edit page
                  </button>
                {/if}
              </div>
            {/if}

            <CmsPageView
              page={heroPage}
              editable={isEditMode}
              layout="homepage-overlay"
            />
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
