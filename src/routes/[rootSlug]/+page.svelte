<script lang="ts">
  import CmsPageView from '$lib/components/CmsPageView.svelte';

  const { data } = $props();
</script>

<svelte:head>
  {#if data.viewerMode === 'gallery'}
    <title>{data.galleryScope?.name ?? 'Gallery'}</title>
  {/if}
</svelte:head>

{#if data.viewerMode === 'page' && data.customPage}
  <CmsPageView page={data.customPage} />
{/if}
