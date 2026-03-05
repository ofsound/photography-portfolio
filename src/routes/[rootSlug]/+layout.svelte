<script lang="ts">
  import type { Snippet } from 'svelte';
  import GalleryScene from '$lib/components/gallery/GalleryScene.svelte';
  import type { LayoutData } from './$types';

  const { data, children } = $props<{ data: LayoutData; children: Snippet }>();
</script>

{#if data.viewerMode === 'gallery'}
  <GalleryScene {data} />

  <!-- Keep child pages mounted for route matching; viewer UI is owned by this layout. -->
  <div class="hidden" aria-hidden="true">{@render children()}</div>
{:else}
  {@render children()}
{/if}
