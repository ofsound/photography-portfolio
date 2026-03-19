<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  import CmsPageView from '$lib/components/CmsPageView.svelte';

  type CustomPageData = {
    title: string;
    slug: string;
    bg_image_url: string | null;
    bg_image_fixed: boolean;
    max_width_override_px?: number | null;
    html_content: string;
    css_module: string;
    tailwind_css?: string;
    editor_mode?: 'code' | 'svedit';
    svedit_doc?: unknown;
  };

  const {
    page,
    editable = false,
    maxWidthPx = 1280,
  } = $props<{
    page: CustomPageData;
    editable?: boolean;
    maxWidthPx?: number;
  }>();

  let bgLoaded = $state(false);

  onMount(() => {
    if (!page.bg_image_url) return;

    const timeout = setTimeout(() => {
      bgLoaded = true;
    }, 5000);

    return () => clearTimeout(timeout);
  });

  function markBgLoaded() {
    bgLoaded = true;
  }
</script>

{#if page.bg_image_url}
  {#if page.bg_image_fixed}
    <div class="relative">
      <img
        src={page.bg_image_url}
        alt=""
        aria-hidden="true"
        class="fixed inset-0 z-0 h-full w-full object-cover"
        onload={markBgLoaded}
        onerror={markBgLoaded}
      />
      {#if bgLoaded}
        <div class="relative z-10 min-h-screen" in:fade={{ duration: 400 }}>
          <CmsPageView {page} {editable} {maxWidthPx} />
        </div>
      {/if}
    </div>
  {:else}
    <div class="relative min-h-screen">
      <img
        src={page.bg_image_url}
        alt=""
        aria-hidden="true"
        class="absolute inset-0 h-full w-full object-cover"
        onload={markBgLoaded}
        onerror={markBgLoaded}
      />
      {#if bgLoaded}
        <div class="relative z-10" in:fade={{ duration: 400 }}>
          <CmsPageView {page} {editable} {maxWidthPx} />
        </div>
      {/if}
    </div>
  {/if}
{:else}
  <CmsPageView {page} {editable} {maxWidthPx} />
{/if}
