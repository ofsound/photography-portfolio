<script lang="ts">
  import { resolve } from '$app/paths';
  import { fade } from 'svelte/transition';

  import { photoPublicUrl } from '$lib/utils/storage-url';

  import type { GalleryPhoto } from '$lib/types/content';
  import type { FloatingPanelPosition } from './gallery-scene.types';

  type PortalAction = (node: HTMLElement) => { destroy: () => void };

  const {
    activePhoto,
    position,
    titleText,
    descriptionText,
    captureDateText,
    dimensionsText,
    licenseText,
    showTitle,
    showDescription,
    showCaptureDate,
    showDimensions,
    showLicense,
    showAdditionalStrip,
    overlayChromeHidden,
    closingChromeMs,
    withCurrentSearch,
    photoPath,
    onAdditionalImageClick,
    portal,
  } = $props<{
    activePhoto: GalleryPhoto;
    position: FloatingPanelPosition;
    titleText: string;
    descriptionText: string;
    captureDateText: string;
    dimensionsText: string;
    licenseText: string;
    showTitle: boolean;
    showDescription: boolean;
    showCaptureDate: boolean;
    showDimensions: boolean;
    showLicense: boolean;
    showAdditionalStrip: boolean;
    overlayChromeHidden: boolean;
    closingChromeMs: number;
    withCurrentSearch: (href: string) => string;
    photoPath: (photoSlug: string, imageId?: string | null) => string;
    onAdditionalImageClick: (event: MouseEvent, imageId: string) => void;
    portal: PortalAction;
  }>();

  const showAnyText = $derived(
    showTitle ||
      showDescription ||
      showCaptureDate ||
      showDimensions ||
      showLicense,
  );

  const positionClasses = $derived.by(() => {
    switch (position) {
      case 'top_right':
        return 'top-4 right-4 sm:top-6 sm:right-6';
      case 'bottom_right':
        return 'bottom-4 right-4 sm:bottom-6 sm:right-6';
      default:
        return 'bottom-4 left-4 sm:bottom-6 sm:left-6';
    }
  });
</script>

<aside
  use:portal
  class="chrome-panel fixed z-[80] grid w-[min(92vw,40rem)] rounded-xl border border-border-strong px-4 py-4 shadow-xl transition-opacity ease-out {positionClasses}"
  class:opacity-0={overlayChromeHidden}
  style="transition-duration: {closingChromeMs}ms"
>
  {#key activePhoto.slug}
    <div
      class="[grid-area:1/1]"
      in:fade={{ duration: 180, delay: 340 }}
      out:fade={{ duration: 200 }}
    >
      {#if showAnyText}
        <div class="grid gap-2">
          {#if showTitle}
            <h1 class="text-sm font-semibold tracking-widest uppercase">
              {titleText}
            </h1>
          {/if}
          {#if showDescription}
            <p class="text-base leading-relaxed text-text/85">
              {descriptionText}
            </p>
          {/if}
          {#if showCaptureDate}
            <p class="text-sm text-text/90">
              <span class="mr-2 text-xs tracking-wide text-text/65 uppercase"
                >Date</span
              >
              {captureDateText}
            </p>
          {/if}
          {#if showDimensions}
            <p class="text-sm text-text/90">
              <span class="mr-2 text-xs tracking-wide text-text/65 uppercase"
                >Dimensions</span
              >
              {dimensionsText}
            </p>
          {/if}
          {#if showLicense}
            <p class="text-sm text-text/90">
              <span class="mr-2 text-xs tracking-wide text-text/65 uppercase"
                >License</span
              >
              {licenseText}
            </p>
          {/if}
        </div>
      {/if}

      {#if showAdditionalStrip}
        <div class="mt-3 flex gap-2 overflow-x-auto pb-1" data-swipe-ignore>
          {#each activePhoto.additionalImages as image (image.id)}
            <a
              href={resolve(
                withCurrentSearch(
                  photoPath(activePhoto.slug, image.id),
                ) as `/${string}`,
              )}
              onclick={(event: MouseEvent) =>
                onAdditionalImageClick(event, image.id)}
              class="block shrink-0 overflow-hidden rounded border border-border-strong"
            >
              <img
                src={photoPublicUrl(image.delivery_storage_path, 180)}
                alt={image.alt_text ?? activePhoto.title}
                class="h-14 w-20 object-cover"
                loading="lazy"
              />
            </a>
          {/each}
        </div>
      {/if}
    </div>
  {/key}
</aside>
